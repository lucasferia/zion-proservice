import { getSupabaseClient } from '../../lib/supabase'
import { getClientDetails } from '../clients/clientApi'
import { searchEquipment } from '../equipment/equipmentApi'
import { getMaintenanceDetails } from '../maintenances/maintenanceApi'
import { getMaintenancePhotos } from '../maintenances/maintenancePhotoApi'
import { getMaintenancePayments } from '../payments/paymentApi'
import type { MaintenancePrintRecord } from './types'

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')
  return client
}

async function getOrganizationName(organizationId: string) {
  const { data, error } = await requireClient()
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()
  if (error || !data) throw new Error('Não foi possível identificar a organização deste documento.')
  return data.name as string
}

export async function getClientPrintRecord(organizationId: string, clientId: string) {
  const [organizationName, client, equipment] = await Promise.all([
    getOrganizationName(organizationId),
    getClientDetails(organizationId, clientId),
    searchEquipment(organizationId, '', {
      clientId,
      locationId: '',
      category: '',
      status: '',
    }),
  ])
  return { organization_name: organizationName, client, equipment }
}

export async function getMaintenancePrintRecord(
  organizationId: string,
  maintenanceId: string,
): Promise<MaintenancePrintRecord> {
  const supabase = requireClient()
  const [organizationName, maintenance, financial, photos, scheduledReturn] = await Promise.all([
    getOrganizationName(organizationId),
    getMaintenanceDetails(organizationId, maintenanceId),
    getMaintenancePayments(organizationId, maintenanceId),
    getMaintenancePhotos(organizationId, maintenanceId),
    supabase
      .from('return_schedules')
      .select('id, scheduled_date, status, notes, completed_at, cancelled_at, cancellation_reason')
      .eq('organization_id', organizationId)
      .eq('origin_maintenance_id', maintenanceId)
      .maybeSingle(),
  ])

  if (scheduledReturn.error) throw new Error('Não foi possível consultar o retorno programado desta OS.')
  if (!financial.summary) throw new Error('Não foi possível calcular o resumo financeiro desta OS.')

  return {
    organization_name: organizationName,
    maintenance,
    payments: financial.payments,
    payment_summary: financial.summary,
    photos,
    scheduled_return: scheduledReturn.data,
  }
}
