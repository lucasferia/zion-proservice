import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  removeMaintenancePhoto,
  reorderMaintenancePhotos,
  uploadMaintenancePhoto,
} from './maintenancePhotoApi'
import { useMaintenancePhotos } from './maintenancePhotoQueries'
import {
  MAINTENANCE_PHOTO_KINDS,
  type MaintenancePhoto,
  type MaintenancePhotoKind,
  type MaintenancePhotoSectionProps,
} from './maintenancePhotoTypes'
import { validateMaintenancePhoto } from './maintenancePhotoValidation'
import { isMaintenanceOpen } from './types'

type UploadJob = {
  id: string
  kind: MaintenancePhotoKind
  name: string
  previewUrl: string
  progress: number
  stage: 'preparing' | 'uploading'
}

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function MaintenancePhotoDraftHint() {
  return (
    <section className="maintenance-photos maintenance-photos--draft" aria-labelledby="photo-draft-title">
      <div className="section-heading">
        <div><span className="eyebrow">Evidência visual</span><h2 id="photo-draft-title">Fotos da manutenção</h2></div>
      </div>
      <div className="photo-evidence-grid">
        {MAINTENANCE_PHOTO_KINDS.map((kind) => (
          <article className="photo-evidence-board photo-evidence-board--locked" key={kind.value}>
            <span className="photo-evidence-board__index">{kind.value === 'before' ? '01' : '02'}</span>
            <div><strong>{kind.label}</strong><p>Salve o rascunho para liberar o envio seguro.</p></div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function MaintenancePhotoSection({
  organizationId,
  maintenanceId,
  status,
}: MaintenancePhotoSectionProps) {
  const photosQuery = useMaintenancePhotos(organizationId, maintenanceId)
  const [jobs, setJobs] = useState<UploadJob[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [preview, setPreview] = useState<MaintenancePhoto | null>(null)
  const previewCloseButtonRef = useRef<HTMLButtonElement>(null)
  const open = isMaintenanceOpen(status)
  const grouped = useMemo(() => ({
    before: (photosQuery.data ?? []).filter((photo) => photo.kind === 'before'),
    after: (photosQuery.data ?? []).filter((photo) => photo.kind === 'after'),
  }), [photosQuery.data])

  useEffect(() => {
    if (!preview) return

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreview(null)
        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        previewCloseButtonRef.current?.focus()
      }
    }

    previewCloseButtonRef.current?.focus()
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [preview])

  function updateJob(jobId: string, progress: number) {
    setJobs((current) => current.map((job) => job.id === jobId ? { ...job, progress } : job))
  }

  function updateJobStage(jobId: string, stage: UploadJob['stage']) {
    setJobs((current) => current.map((job) => job.id === jobId ? { ...job, stage } : job))
  }

  async function handleFiles(kind: MaintenancePhotoKind, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return

    const invalid = files.map((file) => ({ file, error: validateMaintenancePhoto(file) })).filter((item) => item.error)
    if (invalid.length) {
      setActionError(`${invalid[0].file.name}: ${invalid[0].error}`)
      if (invalid.length === files.length) return
    } else {
      setActionError(null)
    }

    const validFiles = files.filter((file) => !validateMaintenancePhoto(file))
    let uploaded = 0
    for (const [index, file] of validFiles.entries()) {
      const jobId = crypto.randomUUID()
      const previewUrl = URL.createObjectURL(file)
      const job: UploadJob = { id: jobId, kind, name: file.name, previewUrl, progress: 0, stage: 'preparing' }
      setJobs((current) => [...current, job])
      try {
        await uploadMaintenancePhoto(
          organizationId,
          maintenanceId,
          kind,
          file,
          grouped[kind].length + index,
          (progress) => updateJob(jobId, progress),
          (stage) => updateJobStage(jobId, stage),
        )
        uploaded += 1
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Não foi possível enviar a foto.')
      } finally {
        URL.revokeObjectURL(previewUrl)
        setJobs((current) => current.filter((currentJob) => currentJob.id !== jobId))
      }
    }

    if (uploaded > 0) {
      await photosQuery.refetch()
      setActionSuccess(uploaded === 1 ? 'Foto enviada com segurança.' : `${uploaded} fotos enviadas com segurança.`)
    }
  }

  async function handleRemove(photo: MaintenancePhoto) {
    setBusyPhotoId(photo.id)
    setActionError(null)
    try {
      await removeMaintenancePhoto(photo)
      await photosQuery.refetch()
      setActionSuccess('Foto removida com sucesso.')
      setConfirmRemoveId(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível remover a foto.')
    } finally {
      setBusyPhotoId(null)
    }
  }

  async function movePhoto(kind: MaintenancePhotoKind, index: number, direction: -1 | 1) {
    const ordered = [...grouped[kind]]
    const nextIndex = index + direction
    if (!ordered[nextIndex]) return
    ;[ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]]
    setBusyPhotoId(ordered[nextIndex].id)
    setActionError(null)
    try {
      await reorderMaintenancePhotos(organizationId, maintenanceId, kind, ordered.map((photo) => photo.id))
      await photosQuery.refetch()
      setActionSuccess('Ordem das fotos atualizada.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível reordenar as fotos.')
    } finally {
      setBusyPhotoId(null)
    }
  }

  return (
    <section className="maintenance-photos" aria-labelledby="maintenance-photos-title">
      <div className="section-heading maintenance-photos__heading">
        <div><span className="eyebrow">Evidência visual privada</span><h2 id="maintenance-photos-title">Antes e depois</h2></div>
        <span className="maintenance-photos__privacy">Bucket privado · links temporários</span>
      </div>

      {!open && (
        <div className="photo-readonly-note" role="status">
          Registro encerrado: as fotos permanecem disponíveis apenas para consulta.
        </div>
      )}

      <div className="action-messages" aria-live="polite">
        {actionSuccess && <div className="alert alert--success">{actionSuccess}</div>}
        {actionError && <div className="alert alert--error">{actionError}</div>}
      </div>

      {photosQuery.isLoading ? (
        <div className="photo-evidence-loading" aria-label="Carregando fotos">
          <span /><span />
        </div>
      ) : photosQuery.isError ? (
        <div className="photo-evidence-error" role="alert">
          <div><strong>Fotos indisponíveis</strong><p>{photosQuery.error.message}</p></div>
          <button className="secondary-button" type="button" onClick={() => void photosQuery.refetch()}>Tentar novamente</button>
        </div>
      ) : (
        <div className="photo-evidence-grid">
          {MAINTENANCE_PHOTO_KINDS.map((kindOption) => {
            const kind = kindOption.value
            const photos = grouped[kind]
            const kindJobs = jobs.filter((job) => job.kind === kind)
            return (
              <article className="photo-evidence-board" key={kind} aria-labelledby={`photo-kind-${kind}`}>
                <header>
                  <span className="photo-evidence-board__index">{kind === 'before' ? '01' : '02'}</span>
                  <div><h3 id={`photo-kind-${kind}`}>{kindOption.label}</h3><p>{photos.length} {photos.length === 1 ? 'registro' : 'registros'}</p></div>
                  {open && (
                    <div className="photo-upload-actions" aria-label={`Adicionar fotos ${kindOption.label}`}>
                      <label className="photo-upload-button">
                        <span>Galeria</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          aria-label={`Escolher fotos ${kindOption.label} da galeria`}
                          onChange={(event) => void handleFiles(kind, event)}
                        />
                      </label>
                      <label className="photo-upload-button photo-upload-button--camera">
                        <span>Câmera</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          capture="environment"
                          aria-label={`Tirar foto ${kindOption.label} com a câmera`}
                          onChange={(event) => void handleFiles(kind, event)}
                        />
                      </label>
                    </div>
                  )}
                </header>

                {photos.length === 0 && kindJobs.length === 0 ? (
                  <div className="photo-empty-state">
                    <span aria-hidden="true">▧</span>
                    <strong>Nenhuma foto {kindOption.label.toLowerCase()}</strong>
                    <p>{open ? 'JPEG, PNG ou WebP · origem até 15 MB. Envio otimizado em WebP.' : 'Nenhum registro foi anexado nesta etapa.'}</p>
                  </div>
                ) : (
                  <div className="photo-grid">
                    {photos.map((photo, index) => (
                      <figure className="photo-card" key={photo.id}>
                        <button className="photo-card__preview" type="button" onClick={() => setPreview(photo)} aria-label={`Ampliar foto ${kindOption.label} ${index + 1}`}>
                          <img src={photo.signed_url} alt={`Foto ${kindOption.label.toLowerCase()} ${index + 1} da manutenção`} loading="lazy" />
                          <span>{String(index + 1).padStart(2, '0')}</span>
                        </button>
                        <figcaption>
                          <span>{formatFileSize(photo.file_size)}</span>
                          {open && (
                            <div className="photo-card__actions">
                              <button type="button" disabled={index === 0 || Boolean(busyPhotoId)} onClick={() => void movePhoto(kind, index, -1)} aria-label={`Mover foto ${kindOption.label} ${index + 1} para trás`}>←</button>
                              <button type="button" disabled={index === photos.length - 1 || Boolean(busyPhotoId)} onClick={() => void movePhoto(kind, index, 1)} aria-label={`Mover foto ${kindOption.label} ${index + 1} para frente`}>→</button>
                              <button className="photo-card__remove" type="button" disabled={Boolean(busyPhotoId)} onClick={() => setConfirmRemoveId(photo.id)} aria-label={`Remover foto ${kindOption.label} ${index + 1}`}>Remover</button>
                            </div>
                          )}
                        </figcaption>
                        {confirmRemoveId === photo.id && (
                          <div className="photo-remove-confirm" role="alert">
                            <strong>Remover definitivamente?</strong>
                            <div><button type="button" disabled={busyPhotoId === photo.id} onClick={() => void handleRemove(photo)}>{busyPhotoId === photo.id ? 'Removendo…' : 'Confirmar'}</button><button type="button" onClick={() => setConfirmRemoveId(null)}>Voltar</button></div>
                          </div>
                        )}
                      </figure>
                    ))}
                    {kindJobs.map((job) => (
                      <figure className="photo-card photo-card--uploading" key={job.id}>
                        <img src={job.previewUrl} alt="Prévia da foto em envio" />
                        <figcaption>
                          <span>{job.stage === 'preparing' ? 'Preparando imagem' : 'Enviando imagem'} · {job.name}</span>
                          <strong>{job.progress}%</strong>
                        </figcaption>
                        <div className="photo-upload-progress"><span style={{ width: `${job.progress}%` }} /></div>
                      </figure>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {preview && (
        <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Visualização ampliada da foto" onClick={() => setPreview(null)}>
          <button ref={previewCloseButtonRef} type="button" onClick={() => setPreview(null)} aria-label="Fechar visualização">Fechar ×</button>
          <img src={preview.signed_url} alt={`Foto ${preview.kind === 'before' ? 'antes' : 'depois'} ampliada`} onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </section>
  )
}
