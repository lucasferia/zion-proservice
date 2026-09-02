import type { ClientDetails } from '../clients/types'
import type { EquipmentSummary } from '../equipment/types'
import type { MaintenanceDetails } from '../maintenances/types'
import type { MaintenancePhoto } from '../maintenances/maintenancePhotoTypes'
import type { MaintenancePayment, PaymentSummary } from '../payments/types'
import type { ReturnScheduleStatus } from '../returns/types'

export type ClientPrintRecord = {
  organization_name: string
  client: ClientDetails
  equipment: EquipmentSummary[]
}

export type MaintenancePrintReturn = {
  id: string
  scheduled_date: string
  status: ReturnScheduleStatus
  notes: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
}

export type MaintenancePrintRecord = {
  organization_name: string
  maintenance: MaintenanceDetails
  payments: MaintenancePayment[]
  payment_summary: PaymentSummary
  photos: MaintenancePhoto[]
  scheduled_return: MaintenancePrintReturn | null
}
