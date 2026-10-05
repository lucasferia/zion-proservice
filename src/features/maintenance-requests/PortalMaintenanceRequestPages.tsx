import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { createClientId } from '../../lib/clientId'
import { useAuth } from '../auth/auth-context'
import { MAINTENANCE_PHOTO_ACCEPT, validateMaintenancePhoto } from '../maintenances/maintenancePhotoValidation'
import { PortalAuthorizationError } from '../portal/portalApi'
import { usePortalContext } from '../portal/portal-context'
import { listPortalEquipment } from '../portal-equipment/portalEquipmentApi'
import { cancelPortalMaintenanceRequest, createPortalMaintenanceRequest, removePortalRequestPhoto, uploadPortalRequestPhoto } from './maintenanceRequestApi'
import { requestKeys, usePortalRequestDetails, usePortalRequestList } from './maintenanceRequestQueries'
import type { RequestCriticality, RequestFilters, RequestPhoto } from './types'
import { criticalityLabel, MAX_REQUEST_PHOTOS, requestStatusLabel, technicalPriorityLabel, validateMaintenanceRequest } from './maintenanceRequestValidation'

function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value)) }

function RequestBadge({ status, criticality }: { status?: string; criticality?: RequestCriticality }) {
  const value = status ?? criticality ?? ''
  return <span className={`request-badge request-badge--${value}`}>{status ? requestStatusLabel(status) : criticalityLabel(criticality!)}</span>
}

export function PortalMaintenanceRequestListPage() {
  const { session } = useAuth(); const location = useLocation()
  const [search, setSearch] = useState(''); const [filters, setFilters] = useState<RequestFilters>({ status: '', criticality: '' }); const [page, setPage] = useState(1)
  const { query, deferred } = usePortalRequestList(session?.user.id ?? '', search, filters, page)
  const success = (location.state as { success?: string } | null)?.success
  return <div className="portal-page request-page">
    <header className="portal-page-heading portal-equipment-heading"><div><span className="eyebrow">Canal de atendimento</span><h1>Solicitações</h1></div><div className="portal-heading-action"><p>Relate uma necessidade da unidade. A criticidade indicada é sua percepção e será avaliada pela Zion.</p><Link to="/portal/solicitacoes/nova">Nova solicitação <span aria-hidden="true">+</span></Link></div></header>
    {success && <div className="alert alert--success" role="status">{success}</div>}
    <section className="request-toolbar" aria-label="Filtros de solicitações">
      <label><span>Pesquisar</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Título ou equipamento" /></label>
      <label><span>Status</span><select value={filters.status} onChange={(event) => { setFilters({ ...filters, status: event.target.value }); setPage(1) }}><option value="">Todos</option><option value="pending">Pendentes</option><option value="approved">Aprovadas</option><option value="rejected">Rejeitadas</option><option value="converted">Convertidas</option><option value="cancelled">Canceladas</option></select></label>
      <label><span>Criticidade percebida</span><select value={filters.criticality} onChange={(event) => { setFilters({ ...filters, criticality: event.target.value }); setPage(1) }}><option value="">Todas</option><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label>
    </section>
    {(query.isLoading || query.isFetching && !query.data) && <PageSkeleton rows={5} />}
    {query.error && !(query.error instanceof PortalAuthorizationError) && <PageState tone="error" title="Não foi possível carregar as solicitações" description={query.error.message} actionLabel="Tentar novamente" onAction={() => void query.refetch()} />}
    {!query.isLoading && !query.error && query.data?.items.length === 0 && <PageState title={deferred || filters.status || filters.criticality ? 'Nenhuma solicitação encontrada' : 'Nenhuma solicitação enviada'} description={deferred || filters.status || filters.criticality ? 'Revise a busca e os filtros.' : 'Quando a unidade precisar de atendimento, registre aqui sem criar uma ordem de serviço.'} />}
    {Boolean(query.data?.items.length) && <div className="request-grid">{query.data?.items.map((item) => <Link className="request-card" to={`/portal/solicitacoes/${item.id}`} key={item.id}><div className="request-card__meta"><RequestBadge status={item.status} /><RequestBadge criticality={item.reported_criticality} /></div><h2>{item.title}</h2><p>{item.description}</p><footer><div><span>Equipamento</span><strong>{item.equipment_name}</strong></div><time dateTime={item.created_at}>{formatDate(item.created_at)}</time></footer></Link>)}</div>}
    {query.data && query.data.pageCount > 1 && <nav className="portal-pagination" aria-label="Paginação"><button disabled={page===1} onClick={() => setPage(page-1)}>← Anterior</button><span>Página <strong>{page}</strong> de {query.data.pageCount}</span><button disabled={page>=query.data.pageCount} onClick={() => setPage(page+1)}>Próxima →</button></nav>}
  </div>
}

type QueuedPhoto = { id: string; file: File; url: string }

export function CreatePortalMaintenanceRequestPage() {
  const { selectedUnit, refresh } = usePortalContext(); const navigate = useNavigate(); const queryClient = useQueryClient()
  const [input, setInput] = useState({ equipmentId: '', title: '', description: '', criticality: 'medium' as RequestCriticality })
  const [submissionKey] = useState(createClientId)
  const [photos, setPhotos] = useState<QueuedPhoto[]>([]); const photosRef = useRef<QueuedPhoto[]>([])
  const confirmDialogRef = useRef<HTMLDivElement>(null); const confirmTriggerRef = useRef<HTMLButtonElement>(null)
  const [errors, setErrors] = useState<Record<string,string>>({}); const [busy, setBusy] = useState(false); const [stage, setStage] = useState(''); const [confirming, setConfirming] = useState(false)
  const equipment = useQuery({ queryKey: ['portal-equipment','request-options',selectedUnit?.id], queryFn: () => listPortalEquipment(selectedUnit!.id, '', 1, 50), enabled: Boolean(selectedUnit), refetchOnWindowFocus: 'always' })
  useEffect(() => { photosRef.current = photos }, [photos])
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), [])
  useEffect(() => { if (!confirming) return; const dialog=confirmDialogRef.current; const focusable=()=>Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')??[]); requestAnimationFrame(()=>focusable()[0]?.focus()); const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy){setConfirming(false);requestAnimationFrame(()=>confirmTriggerRef.current?.focus());return} if(event.key!=='Tab')return; const controls=focusable(); const first=controls[0]; const last=controls.at(-1); if(!first||!last)return; if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}; document.addEventListener('keydown',onKey); return()=>document.removeEventListener('keydown',onKey)}, [confirming,busy])
  if (!selectedUnit) return null
  const locationId = selectedUnit.id
  function queue(files: FileList | null) {
    if (!files) return
    const next = [...files]; const messages: string[] = []
    const room = MAX_REQUEST_PHOTOS - photos.length
    next.slice(0, room).forEach((file) => { const error = validateMaintenancePhoto(file); if (error) messages.push(`${file.name}: ${error}`); else setPhotos((current) => [...current, { id: createClientId(), file, url: URL.createObjectURL(file) }]) })
    if (next.length > room) messages.push(`São permitidas no máximo ${MAX_REQUEST_PHOTOS} fotos.`)
    setErrors((current) => ({ ...current, photos: messages.join(' ') }))
  }
  function removeQueued(id: string) { setPhotos((current) => { const target=current.find((photo)=>photo.id===id); if(target) URL.revokeObjectURL(target.url); return current.filter((photo)=>photo.id!==id) }) }
  async function submit() {
    if (busy) return
    const found=validateMaintenanceRequest(input); setErrors(found); if(Object.keys(found).length) { setConfirming(false); return }
    setBusy(true); let failed=0
    try {
      setStage('Enviando solicitação…')
      const id=await createPortalMaintenanceRequest(locationId,{...input,submissionKey})
      for(let index=0;index<photos.length;index+=1) { try { await uploadPortalRequestPhoto(locationId,id,photos[index].file,index,(value)=>setStage(value==='preparing'?`Preparando imagem ${index+1} de ${photos.length}…`:`Enviando imagem ${index+1} de ${photos.length}…`)) } catch { failed+=1 } }
      await queryClient.invalidateQueries({queryKey:requestKeys.portal()})
      navigate(`/portal/solicitacoes/${id}`,{replace:true,state:{success:failed?`Solicitação enviada. ${failed} foto(s) não puderam ser anexadas; você pode tentar novamente nos detalhes.`:'Solicitação enviada com sucesso.'}})
    } catch(error) { if(error instanceof PortalAuthorizationError) await refresh(); setErrors({form:error instanceof Error?error.message:'Não foi possível enviar a solicitação.'}); setConfirming(false) } finally { setBusy(false); setStage('') }
  }
  return <div className="portal-page request-create"><Link className="portal-back-link" to="/portal/solicitacoes">← Voltar para solicitações</Link><header className="portal-page-heading"><div><span className="eyebrow">Relato da unidade</span><h1>Nova solicitação</h1></div><p>A solicitação não é uma ordem de serviço. A equipe Zion avaliará o relato antes de qualquer atendimento.</p></header>
    {errors.form&&<div className="alert alert--error" role="alert">{errors.form}</div>}
    <form className="request-form" onSubmit={(event)=>{event.preventDefault(); const found=validateMaintenanceRequest(input); setErrors(found); if(!Object.keys(found).length)setConfirming(true)}} noValidate>
      <div className="portal-form-context"><span>Unidade ativa</span><strong>{selectedUnit.name}</strong><small>Organização, academia, unidade, autoria, origem e status são definidos pelo sistema.</small></div>
      <div className="request-form__grid">
        <label><span>Equipamento *</span><select value={input.equipmentId} onChange={(e)=>setInput({...input,equipmentId:e.target.value})} aria-invalid={Boolean(errors.equipmentId)} disabled={equipment.isLoading||busy}><option value="">{equipment.isLoading?'Carregando equipamentos…':'Selecione'}</option>{equipment.data?.items.map((item)=><option key={item.id} value={item.id}>{item.name} · {item.category}</option>)}</select>{errors.equipmentId&&<small>{errors.equipmentId}</small>}</label>
        <label><span>Criticidade percebida *</span><select value={input.criticality} onChange={(e)=>setInput({...input,criticality:e.target.value as RequestCriticality})} disabled={busy}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="critical">Crítica</option></select><em>Não é uma classificação técnica da Zion.</em></label>
        <label className="request-form__wide"><span>Título *</span><input value={input.title} maxLength={160} onChange={(e)=>setInput({...input,title:e.target.value})} placeholder="Ex.: Esteira com ruído durante o uso" aria-invalid={Boolean(errors.title)} disabled={busy}/>{errors.title&&<small>{errors.title}</small>}</label>
        <label className="request-form__wide"><span>Descrição *</span><textarea value={input.description} maxLength={4000} rows={7} onChange={(e)=>setInput({...input,description:e.target.value})} placeholder="Descreva o comportamento observado e quando começou." aria-invalid={Boolean(errors.description)} disabled={busy}/><em>{input.description.length}/4000</em>{errors.description&&<small>{errors.description}</small>}</label>
      </div>
      <section className="request-photo-queue" aria-labelledby="request-photo-title"><div><span className="eyebrow">Evidências opcionais</span><h2 id="request-photo-title">Fotos do equipamento</h2><p>Até 5 fotos. JPEG, PNG, WebP, HEIC ou HEIF, processadas no aparelho antes do envio.</p></div><div className="request-photo-actions"><label className="secondary-button">Galeria<input className="sr-only" type="file" accept={MAINTENANCE_PHOTO_ACCEPT} multiple onChange={(e)=>{queue(e.target.files);e.target.value=''}} aria-label="Escolher fotos da galeria" disabled={busy||photos.length>=MAX_REQUEST_PHOTOS}/></label><label className="secondary-button">Câmera<input className="sr-only" type="file" accept={MAINTENANCE_PHOTO_ACCEPT} capture="environment" onChange={(e)=>{queue(e.target.files);e.target.value=''}} aria-label="Tirar foto com a câmera" disabled={busy||photos.length>=MAX_REQUEST_PHOTOS}/></label></div>{errors.photos&&<div className="field-error" role="alert">{errors.photos}</div>}<div className="request-photo-previews">{photos.map((photo)=><figure key={photo.id}><img src={photo.url} alt="Prévia da foto selecionada"/><button type="button" onClick={()=>removeQueued(photo.id)} disabled={busy} aria-label="Remover foto selecionada">×</button></figure>)}</div></section>
      <div className="request-submit"><p>Revise antes de enviar. Após o envio, o relato não poderá ser editado.</p><button ref={confirmTriggerRef} className="primary-button primary-button--compact" type="submit" disabled={busy}>{busy?stage:'Revisar e enviar'}</button></div>
    </form>
    {confirming&&<div className="request-confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-request-title" aria-describedby="confirm-request-description"><div ref={confirmDialogRef}><span className="eyebrow">Confirmação</span><h2 id="confirm-request-title">Enviar esta solicitação?</h2><p id="confirm-request-description">Ela ficará pendente para avaliação da Zion e não criará uma OS automaticamente.</p><dl><div><dt>Equipamento</dt><dd>{equipment.data?.items.find((item)=>item.id===input.equipmentId)?.name}</dd></div><div><dt>Criticidade percebida</dt><dd>{criticalityLabel(input.criticality)}</dd></div><div><dt>Fotos</dt><dd>{photos.length}</dd></div></dl><div><button type="button" className="secondary-button" onClick={()=>{setConfirming(false);requestAnimationFrame(()=>confirmTriggerRef.current?.focus())}} disabled={busy}>Voltar e revisar</button><button type="button" className="primary-button primary-button--compact" onClick={()=>void submit()} disabled={busy}>{busy?stage:'Confirmar envio'}</button></div></div></div>}
  </div>
}

function RequestPhotos({ photos, pending, busy, stage, onRemove, onAdd }: { photos: RequestPhoto[]; pending: boolean; busy?: boolean; stage?: string; onRemove?: (photo:RequestPhoto)=>void; onAdd?: (files:FileList|null)=>void }) { return <section className="request-detail-section"><div className="request-section-heading"><div><span className="eyebrow">Storage privado</span><h2>Fotos anexadas</h2></div><span>{photos.length}/{MAX_REQUEST_PHOTOS}</span></div>{pending&&onAdd&&photos.length<MAX_REQUEST_PHOTOS&&<div className="request-photo-actions"><label className="secondary-button">Galeria<input className="sr-only" type="file" accept={MAINTENANCE_PHOTO_ACCEPT} multiple disabled={busy} aria-label="Adicionar fotos da galeria" onChange={(event)=>{onAdd(event.target.files);event.target.value=''}}/></label><label className="secondary-button">Câmera<input className="sr-only" type="file" accept={MAINTENANCE_PHOTO_ACCEPT} capture="environment" disabled={busy} aria-label="Adicionar foto da câmera" onChange={(event)=>{onAdd(event.target.files);event.target.value=''}}/></label>{stage&&<span className="request-upload-stage" role="status">{stage}</span>}</div>}{photos.length===0?<p className="request-empty-copy">Nenhuma foto anexada.</p>:<div className="request-photo-gallery">{photos.map((photo,index)=><figure key={photo.id}><img src={photo.signed_url} alt={`Foto ${index+1} da solicitação`}/>{pending&&onRemove&&<button type="button" onClick={()=>onRemove(photo)} disabled={busy}>Remover</button>}</figure>)}</div>}</section> }

export function PortalMaintenanceRequestDetailsPage() {
  const { requestId }=useParams(); const {session}=useAuth(); const {selectedUnit,refresh}=usePortalContext(); const navigate=useNavigate(); const location=useLocation(); const queryClient=useQueryClient(); const query=usePortalRequestDetails(session?.user.id??'',requestId)
  const [cancel,setCancel]=useState(false); const [reason,setReason]=useState(''); const [busy,setBusy]=useState(false); const [stage,setStage]=useState(''); const [error,setError]=useState(''); const success=(location.state as {success?:string}|null)?.success
  useEffect(()=>{if(query.error instanceof PortalAuthorizationError)void refresh()},[query.error,refresh])
  if(query.isLoading)return <PageSkeleton rows={5}/>
  if(query.error||!query.data?.request)return <PageState tone="error" title="Solicitação indisponível" description={query.error instanceof Error?query.error.message:'Ela não existe ou seu acesso mudou.'} actionLabel="Voltar" onAction={()=>navigate('/portal/solicitacoes')}/>
  const item=query.data.request
  const currentPhotos=query.data.photos
  async function remove(photo:RequestPhoto){if(!selectedUnit||busy)return;setBusy(true);setError('');try{await removePortalRequestPhoto(selectedUnit.id,item.id,photo.id);await query.refetch()}catch(e){setError(e instanceof Error?e.message:'Não foi possível remover a foto.')}finally{setBusy(false)}}
  async function add(files:FileList|null){if(!files||!selectedUnit||busy)return;const available=MAX_REQUEST_PHOTOS-currentPhotos.length;const chosen=[...files].slice(0,available);setBusy(true);setError('');let failures=0;for(let index=0;index<chosen.length;index+=1){const validation=validateMaintenancePhoto(chosen[index]);if(validation){setError(`${chosen[index].name}: ${validation}`);failures+=1;continue}try{await uploadPortalRequestPhoto(selectedUnit.id,item.id,chosen[index],currentPhotos.length+index,(value)=>setStage(value==='preparing'?'Preparando imagem…':'Enviando imagem…'))}catch(e){failures+=1;setError(e instanceof Error?e.message:'Não foi possível anexar uma foto.')}}await query.refetch();setStage('');setBusy(false);if(files.length>available&&!failures)setError(`O limite é de ${MAX_REQUEST_PHOTOS} fotos.`)}
  async function cancelRequest(){if(!selectedUnit||busy)return;if(reason.trim().length<3){setError('Informe um motivo com pelo menos 3 caracteres.');return}setBusy(true);setError('');try{await cancelPortalMaintenanceRequest(selectedUnit.id,item.id,reason);await queryClient.invalidateQueries({queryKey:requestKeys.portal()});setCancel(false);await query.refetch()}catch(e){setError(e instanceof Error?e.message:'Não foi possível cancelar.')}finally{setBusy(false)}}
  return <div className="portal-page request-detail"><Link className="portal-back-link" to="/portal/solicitacoes">← Voltar para solicitações</Link>{success&&<div className="alert alert--success" role="status">{success}</div>}{error&&<div className="alert alert--error" role="alert">{error}</div>}<header><div><span className="eyebrow">{item.location_name}</span><h1>{item.title}</h1><p>Enviada em {formatDate(item.created_at)}</p></div><div><RequestBadge status={item.status}/><RequestBadge criticality={item.reported_criticality}/></div></header><section className="request-detail-section"><span className="eyebrow">Relato da academia</span><p className="request-description">{item.description}</p><dl className="request-facts"><div><dt>Equipamento</dt><dd>{item.equipment_name}</dd></div><div><dt>Categoria</dt><dd>{item.equipment_category}</dd></div><div><dt>Criticidade percebida</dt><dd>{criticalityLabel(item.reported_criticality)}</dd></div></dl></section>{item.decided_at&&<section className="request-portal-decision"><div><span className="eyebrow">Retorno da Zion</span><h2>{requestStatusLabel(item.status)}</h2></div><dl><div><dt>Prioridade técnica</dt><dd>{technicalPriorityLabel(item.technical_priority)}</dd></div><div><dt>Atualizada em</dt><dd>{formatDate(item.converted_at||item.decided_at)}</dd></div>{item.work_order_number&&<div><dt>Ordem de serviço</dt><dd>{item.work_order_number}</dd></div>}</dl>{item.status==='approved'&&<p className="request-status-guidance">A aprovação confirma a análise técnica. O atendimento ainda não foi agendado e nenhuma OS foi criada.</p>}{item.status==='converted'&&<p className="request-status-guidance">A solicitação originou uma OS, mas isso não significa que o serviço foi concluído. A execução continua no fluxo interno da Zion.</p>}{item.public_response&&<p>{item.public_response}</p>}</section>}<RequestPhotos photos={currentPhotos} pending={item.status==='pending'} busy={busy} stage={stage} onAdd={(files)=>void add(files)} onRemove={(photo)=>void remove(photo)}/>{item.status==='cancelled'&&<section className="request-cancelled"><span>Cancelada em {item.cancelled_at?formatDate(item.cancelled_at):'—'}</span><p>{item.cancellation_reason}</p></section>}{item.status==='pending'&&<section className="request-cancel-action"><div><span className="eyebrow">Precisa retirar o pedido?</span><h2>Cancelar solicitação</h2><p>O histórico e as fotos serão preservados.</p></div>{!cancel?<button className="danger-text-button" onClick={()=>setCancel(true)}>Cancelar solicitação</button>:<div className="request-cancel-form"><label><span>Motivo do cancelamento</span><textarea value={reason} onChange={(e)=>setReason(e.target.value)} maxLength={500}/></label><div><button className="secondary-button" onClick={()=>setCancel(false)} disabled={busy}>Voltar</button><button className="danger-button" onClick={()=>void cancelRequest()} disabled={busy}>{busy?'Cancelando…':'Confirmar cancelamento'}</button></div></div>}</section>}</div>
}
