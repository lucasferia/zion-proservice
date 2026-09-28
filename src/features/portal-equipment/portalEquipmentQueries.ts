import { useQuery } from '@tanstack/react-query'
import { useDeferredValue } from 'react'
import { usePortalContext } from '../portal/portal-context'
import { getPortalEquipment, listPortalEquipment } from './portalEquipmentApi'

export const portalEquipmentKeys = {
  all: ['portal-equipment'] as const,
  lists: () => [...portalEquipmentKeys.all, 'list'] as const,
  list: (userId: string, locationId: string, search: string, page: number) =>
    [...portalEquipmentKeys.lists(), userId, locationId, search, page] as const,
  details: () => [...portalEquipmentKeys.all, 'detail'] as const,
  detail: (userId: string, locationId: string, equipmentId: string) =>
    [...portalEquipmentKeys.details(), userId, locationId, equipmentId] as const,
}

export function usePortalEquipmentList(userId: string, search: string, page: number) {
  const { selectedUnit } = usePortalContext()
  const deferredSearch = useDeferredValue(search.trim())
  const query = useQuery({
    queryKey: portalEquipmentKeys.list(userId, selectedUnit?.id ?? '', deferredSearch, page),
    queryFn: () => listPortalEquipment(selectedUnit!.id, deferredSearch, page),
    enabled: Boolean(userId && selectedUnit),
    refetchOnWindowFocus: 'always',
  })
  return { query, selectedUnit, deferredSearch }
}

export function usePortalEquipmentDetails(userId: string, equipmentId: string | undefined) {
  const { selectedUnit } = usePortalContext()
  const query = useQuery({
    queryKey: portalEquipmentKeys.detail(userId, selectedUnit?.id ?? '', equipmentId ?? ''),
    queryFn: () => getPortalEquipment(selectedUnit!.id, equipmentId!),
    enabled: Boolean(userId && selectedUnit && equipmentId),
    refetchOnWindowFocus: 'always',
  })
  return { query, selectedUnit }
}
