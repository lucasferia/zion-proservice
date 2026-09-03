import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PageSkeleton } from '../components/PageState'
import { LoginPage } from '../features/auth/LoginPage'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { AppShell } from './AppShell'

const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)

const ClientListPage = lazy(() =>
  import('../features/clients/ClientListPage').then((module) => ({ default: module.ClientListPage })),
)
const ClientDetailsPage = lazy(() =>
  import('../features/clients/ClientDetailsPage').then((module) => ({ default: module.ClientDetailsPage })),
)
const CreateClientPage = lazy(() =>
  import('../features/clients/ClientFormPage').then((module) => ({ default: module.CreateClientPage })),
)
const EditClientPage = lazy(() =>
  import('../features/clients/ClientFormPage').then((module) => ({ default: module.EditClientPage })),
)
const EquipmentListPage = lazy(() =>
  import('../features/equipment/EquipmentListPage').then((module) => ({ default: module.EquipmentListPage })),
)
const EquipmentDetailsPage = lazy(() =>
  import('../features/equipment/EquipmentDetailsPage').then((module) => ({ default: module.EquipmentDetailsPage })),
)
const CreateEquipmentPage = lazy(() =>
  import('../features/equipment/EquipmentFormPage').then((module) => ({ default: module.CreateEquipmentPage })),
)
const EditEquipmentPage = lazy(() =>
  import('../features/equipment/EquipmentFormPage').then((module) => ({ default: module.EditEquipmentPage })),
)
const InventoryListPage = lazy(() =>
  import('../features/inventory/InventoryListPage').then((module) => ({ default: module.InventoryListPage })),
)
const InventoryDetailsPage = lazy(() =>
  import('../features/inventory/InventoryDetailsPage').then((module) => ({ default: module.InventoryDetailsPage })),
)
const CreateInventoryItemPage = lazy(() =>
  import('../features/inventory/InventoryItemFormPage').then((module) => ({ default: module.CreateInventoryItemPage })),
)
const EditInventoryItemPage = lazy(() =>
  import('../features/inventory/InventoryItemFormPage').then((module) => ({ default: module.EditInventoryItemPage })),
)
const InventoryMovementPage = lazy(() =>
  import('../features/inventory/InventoryMovementPage').then((module) => ({ default: module.InventoryMovementPage })),
)
const SupplierListPage = lazy(() =>
  import('../features/suppliers/SupplierListPage').then((module) => ({ default: module.SupplierListPage })),
)
const SupplierDetailsPage = lazy(() =>
  import('../features/suppliers/SupplierDetailsPage').then((module) => ({ default: module.SupplierDetailsPage })),
)
const CreateSupplierPage = lazy(() =>
  import('../features/suppliers/SupplierFormPage').then((module) => ({ default: module.CreateSupplierPage })),
)
const EditSupplierPage = lazy(() =>
  import('../features/suppliers/SupplierFormPage').then((module) => ({ default: module.EditSupplierPage })),
)
const MaintenanceListPage = lazy(() =>
  import('../features/maintenances/MaintenanceListPage').then((module) => ({ default: module.MaintenanceListPage })),
)
const MaintenanceDetailsPage = lazy(() =>
  import('../features/maintenances/MaintenanceDetailsPage').then((module) => ({ default: module.MaintenanceDetailsPage })),
)
const CreateMaintenancePage = lazy(() =>
  import('../features/maintenances/MaintenanceFormPage').then((module) => ({ default: module.CreateMaintenancePage })),
)
const EditMaintenancePage = lazy(() =>
  import('../features/maintenances/MaintenanceFormPage').then((module) => ({ default: module.EditMaintenancePage })),
)
const FinancialListPage = lazy(() =>
  import('../features/payments/FinancialListPage').then((module) => ({ default: module.FinancialListPage })),
)
const CreatePaymentPage = lazy(() =>
  import('../features/payments/PaymentFormPage').then((module) => ({ default: module.CreatePaymentPage })),
)
const ReturnScheduleListPage = lazy(() =>
  import('../features/returns/ReturnScheduleListPage').then((module) => ({ default: module.ReturnScheduleListPage })),
)
const CreateReturnSchedulePage = lazy(() =>
  import('../features/returns/ReturnScheduleFormPage').then((module) => ({ default: module.CreateReturnSchedulePage })),
)
const ClientPrintPage = lazy(() =>
  import('../features/printables/ClientPrintPage').then((module) => ({ default: module.ClientPrintPage })),
)
const MaintenancePrintPage = lazy(() =>
  import('../features/printables/MaintenancePrintPage').then((module) => ({ default: module.MaintenancePrintPage })),
)

function DeferredRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton rows={4} />}>{children}</Suspense>
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<DeferredRoute><DashboardPage /></DeferredRoute>} />
          <Route path="clientes" element={<DeferredRoute><ClientListPage /></DeferredRoute>} />
          <Route path="clientes/novo" element={<DeferredRoute><CreateClientPage /></DeferredRoute>} />
          <Route path="clientes/:clientId" element={<DeferredRoute><ClientDetailsPage /></DeferredRoute>} />
          <Route path="clientes/:clientId/editar" element={<DeferredRoute><EditClientPage /></DeferredRoute>} />
          <Route path="clientes/:clientId/imprimir" element={<DeferredRoute><ClientPrintPage /></DeferredRoute>} />
          <Route path="equipamentos" element={<DeferredRoute><EquipmentListPage /></DeferredRoute>} />
          <Route path="equipamentos/novo" element={<DeferredRoute><CreateEquipmentPage /></DeferredRoute>} />
          <Route path="equipamentos/:equipmentId" element={<DeferredRoute><EquipmentDetailsPage /></DeferredRoute>} />
          <Route path="equipamentos/:equipmentId/editar" element={<DeferredRoute><EditEquipmentPage /></DeferredRoute>} />
          <Route path="estoque" element={<DeferredRoute><InventoryListPage /></DeferredRoute>} />
          <Route path="estoque/novo" element={<DeferredRoute><CreateInventoryItemPage /></DeferredRoute>} />
          <Route path="estoque/:itemId" element={<DeferredRoute><InventoryDetailsPage /></DeferredRoute>} />
          <Route path="estoque/:itemId/editar" element={<DeferredRoute><EditInventoryItemPage /></DeferredRoute>} />
          <Route path="estoque/:itemId/movimentar" element={<DeferredRoute><InventoryMovementPage /></DeferredRoute>} />
          <Route path="fornecedores" element={<DeferredRoute><SupplierListPage /></DeferredRoute>} />
          <Route path="fornecedores/novo" element={<DeferredRoute><CreateSupplierPage /></DeferredRoute>} />
          <Route path="fornecedores/:supplierId" element={<DeferredRoute><SupplierDetailsPage /></DeferredRoute>} />
          <Route path="fornecedores/:supplierId/editar" element={<DeferredRoute><EditSupplierPage /></DeferredRoute>} />
          <Route path="manutencoes" element={<DeferredRoute><MaintenanceListPage /></DeferredRoute>} />
          <Route path="manutencoes/nova" element={<DeferredRoute><CreateMaintenancePage /></DeferredRoute>} />
          <Route path="manutencoes/:maintenanceId/pagamentos/novo" element={<DeferredRoute><CreatePaymentPage /></DeferredRoute>} />
          <Route path="manutencoes/:maintenanceId" element={<DeferredRoute><MaintenanceDetailsPage /></DeferredRoute>} />
          <Route path="manutencoes/:maintenanceId/editar" element={<DeferredRoute><EditMaintenancePage /></DeferredRoute>} />
          <Route path="manutencoes/:maintenanceId/imprimir" element={<DeferredRoute><MaintenancePrintPage /></DeferredRoute>} />
          <Route path="financeiro" element={<DeferredRoute><FinancialListPage /></DeferredRoute>} />
          <Route path="agenda" element={<DeferredRoute><ReturnScheduleListPage /></DeferredRoute>} />
          <Route path="agenda/novo" element={<DeferredRoute><CreateReturnSchedulePage /></DeferredRoute>} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
