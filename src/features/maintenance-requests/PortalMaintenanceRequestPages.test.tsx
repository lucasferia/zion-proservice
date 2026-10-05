import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/auth-context'
import { usePortalContext } from '../portal/portal-context'
import { listPortalEquipment } from '../portal-equipment/portalEquipmentApi'
import { createPortalMaintenanceRequest, uploadPortalRequestPhoto } from './maintenanceRequestApi'
import { usePortalRequestDetails, usePortalRequestList } from './maintenanceRequestQueries'
import { CreatePortalMaintenanceRequestPage, PortalMaintenanceRequestDetailsPage, PortalMaintenanceRequestListPage } from './PortalMaintenanceRequestPages'

vi.mock('../auth/auth-context',()=>({useAuth:vi.fn()}))
vi.mock('../portal/portal-context',()=>({usePortalContext:vi.fn()}))
vi.mock('../portal-equipment/portalEquipmentApi',()=>({listPortalEquipment:vi.fn()}))
vi.mock('./maintenanceRequestQueries',()=>({
  requestKeys:{portal:()=>['maintenance-requests','portal']},
  usePortalRequestList:vi.fn(),usePortalRequestDetails:vi.fn(),
}))
vi.mock('./maintenanceRequestApi',()=>({
  createPortalMaintenanceRequest:vi.fn(),uploadPortalRequestPhoto:vi.fn(),
  cancelPortalMaintenanceRequest:vi.fn(),removePortalRequestPhoto:vi.fn(),
}))

const unit={id:'unit-a',name:'Unidade Centro',city:'São Paulo',state:'SP'}
const refresh=vi.fn()
function query<T>(data?:T,error:Error|null=null,isLoading=false){return{data,error,isLoading,isFetching:false,refetch:vi.fn().mockResolvedValue(undefined)} as never}
function wrapper(children:React.ReactNode){const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});return <QueryClientProvider client={qc}><MemoryRouter initialEntries={['/portal/solicitacoes/nova']}>{children}</MemoryRouter></QueryClientProvider>}

describe('solicitações no Portal',()=>{
  beforeEach(()=>{
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({session:{user:{id:'external-a'}}} as never)
    vi.mocked(usePortalContext).mockReturnValue({selectedUnit:unit,context:{} as never,refresh,selectingUnitId:null,selectUnit:vi.fn()} as never)
    vi.mocked(listPortalEquipment).mockResolvedValue({items:[{id:'equipment-a',name:'Esteira 01',category:'Cardio',brand:null,model:null,serial_number:null,asset_tag:null,status:'operational',created_at:'2026-09-28T12:00:00Z',location_name:'Unidade Centro',total_count:1}],total:1,page:1,pageSize:50,pageCount:1})
  })

  it('expõe galeria e câmera mobile sem transformar a solicitação em OS',async()=>{
    render(wrapper(<CreatePortalMaintenanceRequestPage/>))
    expect(await screen.findByRole('option',{name:/Esteira 01/})).toBeInTheDocument()
    expect(screen.getByLabelText('Escolher fotos da galeria')).toHaveAttribute('multiple')
    expect(screen.getByLabelText('Escolher fotos da galeria')).not.toHaveAttribute('capture')
    expect(screen.getByLabelText('Tirar foto com a câmera')).toHaveAttribute('capture','environment')
    expect(screen.getByText(/não é uma ordem de serviço/i)).toBeInTheDocument()
  })

  it('valida, revisa e evita duplo envio enquanto processa',async()=>{
    const user=userEvent.setup(); let finish:((value:string)=>void)|undefined
    vi.mocked(createPortalMaintenanceRequest).mockImplementation(()=>new Promise((resolve)=>{finish=resolve}))
    render(wrapper(<CreatePortalMaintenanceRequestPage/>))
    await screen.findByRole('option',{name:/Esteira 01/})
    await user.selectOptions(screen.getByLabelText(/Equipamento/),'equipment-a')
    await user.type(screen.getByLabelText(/Título/),'Ruído na esteira')
    await user.type(screen.getByLabelText(/Descrição/),'O ruído ocorre durante todo o uso.')
    await user.click(screen.getByRole('button',{name:'Revisar e enviar'}))
    expect(screen.getByRole('dialog',{name:'Enviar esta solicitação?'})).toBeInTheDocument()
    const confirm=screen.getByRole('button',{name:'Confirmar envio'})
    await user.click(confirm)
    expect(confirm).toBeDisabled()
    expect(createPortalMaintenanceRequest).toHaveBeenCalledOnce()
    finish?.('request-a')
    expect(uploadPortalRequestPhoto).not.toHaveBeenCalled()
  })

  it('contém o foco na confirmação, fecha com Escape e devolve ao acionador',async()=>{
    const user=userEvent.setup()
    render(wrapper(<CreatePortalMaintenanceRequestPage/>))
    await screen.findByRole('option',{name:/Esteira 01/})
    await user.selectOptions(screen.getByLabelText(/Equipamento/),'equipment-a')
    await user.type(screen.getByLabelText(/Título/),'Ruído na esteira')
    await user.type(screen.getByLabelText(/Descrição/),'O ruído ocorre durante todo o uso.')
    const trigger=screen.getByRole('button',{name:'Revisar e enviar'})
    await user.click(trigger)
    const back=screen.getByRole('button',{name:'Voltar e revisar'})
    const confirm=screen.getByRole('button',{name:'Confirmar envio'})
    await waitFor(()=>expect(back).toHaveFocus())
    await user.tab({shift:true})
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(back).toHaveFocus()
    await user.keyboard('{Escape}')
    await waitFor(()=>expect(trigger).toHaveFocus())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([
    ['approved','A aprovação confirma a análise técnica. O atendimento ainda não foi agendado e nenhuma OS foi criada.'],
    ['converted','A solicitação originou uma OS, mas isso não significa que o serviço foi concluído. A execução continua no fluxo interno da Zion.'],
  ] as const)('explica o alcance do estado %s no Portal',(status,guidance)=>{
    vi.mocked(usePortalRequestDetails).mockReturnValue(query({request:{id:'request-a',title:'Ruído',description:'Relato',reported_criticality:'high',technical_priority:'high',status,equipment_name:'Esteira',equipment_category:'Cardio',location_name:'Centro',created_at:'2026-09-30T12:00:00Z',cancellation_reason:null,cancelled_at:null,public_response:'Retorno público.',decided_at:'2026-09-30T13:00:00Z',converted_at:status==='converted'?'2026-09-30T14:00:00Z':null,work_order_number:status==='converted'?'OS-001':null},photos:[]}) as never)
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}})
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/portal/solicitacoes/request-a']}><Routes><Route path="/portal/solicitacoes/:requestId" element={<PortalMaintenanceRequestDetailsPage/>}/></Routes></MemoryRouter></QueryClientProvider>)
    expect(screen.getByText(guidance)).toBeInTheDocument()
  })

  it('renderiza lista vazia e detalhe indisponível sem enumerar outro tenant',()=>{
    vi.mocked(usePortalRequestList).mockReturnValue({deferred:'',query:query({items:[],total:0,pageCount:1})} as never)
    const view=render(<MemoryRouter><PortalMaintenanceRequestListPage/></MemoryRouter>)
    expect(screen.getByText('Nenhuma solicitação enviada')).toBeInTheDocument()
    view.unmount()
    vi.mocked(usePortalRequestDetails).mockReturnValue(query({request:undefined,photos:[]}) as never)
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}})
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/portal/solicitacoes/forged']}><Routes><Route path="/portal/solicitacoes/:requestId" element={<PortalMaintenanceRequestDetailsPage/>}/></Routes></MemoryRouter></QueryClientProvider>)
    expect(screen.getByText('Solicitação indisponível')).toBeInTheDocument()
  })
})
