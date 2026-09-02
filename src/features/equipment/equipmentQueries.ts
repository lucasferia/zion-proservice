import { useQuery } from '@tanstack/react-query'
import { useDeferredValue } from 'react'
import { useActiveOrganization } from '../clients/clientQueries'
import { getEquipmentDetails, getEquipmentFormOptions, searchEquipment } from './equipmentApi'
import type { EquipmentFilters } from './types'

export const equipmentKeys = {
  all: ['equipment'] as const,
  lists: () => [...equipmentKeys.all, 'list'] as const,
  list: (organizationId: string, search: string, filters: EquipmentFilters) =>
    [
      ...equipmentKeys.lists(),
      organizationId,
      search,
      filters.clientId,
      filters.locationId,
      filters.category,
      filters.status,
    ] as const,
  details: () => [...equipmentKeys.all, 'detail'] as const,
  detail: (organizationId: string, equipmentId: string) =>
    [...equipmentKeys.details(), organizationId, equipmentId] as const,
  options: (organizationId: string) => [...equipmentKeys.all, 'options', organizationId] as const,
}

export function useEquipment(search: string, filters: EquipmentFilters) {
  const organization = useActiveOrganization()
  const deferredSearch = useDeferredValue(search.trim())

  const equipment = useQuery({
    queryKey: equipmentKeys.list(organization.data ?? '', deferredSearch, filters),
    queryFn: () => searchEquipment(organization.data!, deferredSearch, filters),
    enabled: Boolean(organization.data),
  })

  const options = useQuery({
    queryKey: equipmentKeys.options(organization.data ?? ''),
    queryFn: () => getEquipmentFormOptions(organization.data!),
    enabled: Boolean(organization.data),
    staleTime: 60_000,
  })

  return { organization, equipment, options, deferredSearch }
}

export function useEquipmentDetails(equipmentId: string | undefined) {
  const organization = useActiveOrganization()
  const equipment = useQuery({
    queryKey: equipmentKeys.detail(organization.data ?? '', equipmentId ?? ''),
    queryFn: () => getEquipmentDetails(organization.data!, equipmentId!),
    enabled: Boolean(organization.data && equipmentId),
  })

  return { organization, equipment }
}

export function useEquipmentFormOptions() {
  const organization = useActiveOrganization()
  const options = useQuery({
    queryKey: equipmentKeys.options(organization.data ?? ''),
    queryFn: () => getEquipmentFormOptions(organization.data!),
    enabled: Boolean(organization.data),
    staleTime: 60_000,
  })

  return { organization, options }
}
