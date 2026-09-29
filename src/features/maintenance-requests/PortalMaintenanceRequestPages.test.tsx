import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
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
