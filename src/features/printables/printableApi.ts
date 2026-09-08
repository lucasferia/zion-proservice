import { getSupabaseClient } from '../../lib/supabase'
import { getClientDetails } from '../clients/clientApi'
import type { EquipmentSummary } from '../equipment/types'
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
  const supabase = requireClient()
  const [organizationName, client, maintenanceEquipment] = await Promise.all([
    getOrganizationName(organizationId),
    getClientDetails(organizationId, clientId),
    supabase
      .from('maintenances')
      .select('equipment_id')
      .eq('organization_id', organizationId)
      .eq('client_id', clientId),
  ])

  if (maintenanceEquipment.error) {
    throw new Error('Não foi possível consultar os equipamentos atendidos deste cliente.')
  }

  const equipmentIds = [...new Set(
    (maintenanceEquipment.data ?? []).map((item) => item.equipment_id),
  )]
  let equipment: EquipmentSummary[] = []

  if (equipmentIds.length > 0) {
    const result = await supabase
      .from('equipment')
      .select('id, organization_id, name, category, brand, model, serial_number, asset_tag, status, notes, created_at, updated_at')
      .eq('organization_id', organizationId)
      .in('id', equipmentIds)
      .order('name')

    if (result.error) {
      throw new Error('Não foi possível carregar os equipamentos atendidos deste cliente.')
    }

    equipment = (result.data ?? []).map((item) => ({
      ...item,
      client_id: null,
      client_location_id: null,
      client_name: null,
      location_name: null,
      location_city: null,
    })) as EquipmentSummary[]
  }

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
