import { useQuery } from '@tanstack/react-query'
import { useDeferredValue } from 'react'
import { useActiveOrganization } from '../clients/clientQueries'
import {
  getMaintenanceDetails,
  getMaintenanceFormOptions,
  searchMaintenances,
} from './maintenanceApi'
import type { MaintenanceFilters } from './types'

export const maintenanceKeys = {
  all: ['maintenances'] as const,
  lists: () => [...maintenanceKeys.all, 'list'] as const,
  list: (organizationId: string, search: string, filters: MaintenanceFilters) => [
    ...maintenanceKeys.lists(), organizationId, search,
    filters.periodStart, filters.periodEnd, filters.type, filters.status,
  ] as const,
  details: () => [...maintenanceKeys.all, 'detail'] as const,
  detail: (organizationId: string, maintenanceId: string) => [
    ...maintenanceKeys.details(), organizationId, maintenanceId,
  ] as const,
  equipmentHistory: (organizationId: string, equipmentId: string) => [
    ...maintenanceKeys.all, 'equipment-history', organizationId, equipmentId,
  ] as const,
  options: (organizationId: string) => [...maintenanceKeys.all, 'options', organizationId] as const,
}

export function useMaintenances(search: string, filters: MaintenanceFilters) {
  const organization = useActiveOrganization()
  const deferredSearch = useDeferredValue(search.trim())
  const maintenances = useQuery({
    queryKey: maintenanceKeys.list(organization.data ?? '', deferredSearch, filters),
    queryFn: () => searchMaintenances(organization.data!, deferredSearch, filters),
    enabled: Boolean(organization.data),
  })
  return { organization, maintenances, deferredSearch }
}

export function useMaintenanceDetails(maintenanceId: string | undefined) {
  const organization = useActiveOrganization()
  const maintenance = useQuery({
    queryKey: maintenanceKeys.detail(organization.data ?? '', maintenanceId ?? ''),
    queryFn: () => getMaintenanceDetails(organization.data!, maintenanceId!),
    enabled: Boolean(organization.data && maintenanceId),
  })
  return { organization, maintenance }
}

export function useMaintenanceFormOptions() {
  const organization = useActiveOrganization()
  const options = useQuery({
    queryKey: maintenanceKeys.options(organization.data ?? ''),
    queryFn: () => getMaintenanceFormOptions(organization.data!),
    enabled: Boolean(organization.data),
    staleTime: 60_000,
  })
  return { organization, options }
}

export function useEquipmentMaintenanceHistory(equipmentId: string | undefined) {
  const organization = useActiveOrganization()
  const history = useQuery({
    queryKey: maintenanceKeys.equipmentHistory(organization.data ?? '', equipmentId ?? ''),
    queryFn: () => searchMaintenances(
      organization.data!,
      '',
      { periodStart: '', periodEnd: '', type: '', status: '' },
      equipmentId!,
    ),
    enabled: Boolean(organization.data && equipmentId),
  })
  return { organization, history }
}
