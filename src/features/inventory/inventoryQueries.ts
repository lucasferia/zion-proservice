import { useQuery } from '@tanstack/react-query'
import { useDeferredValue } from 'react'
import { useActiveOrganization } from '../clients/clientQueries'
import { getInventoryItemDetails, getInventoryOptions, searchInventoryItems } from './inventoryApi'
import type { InventoryFilters } from './types'

export const inventoryKeys = {
  all: ['inventory'] as const,
  lists: () => [...inventoryKeys.all, 'list'] as const,
  list: (organizationId: string, search: string, filters: InventoryFilters) => [
    ...inventoryKeys.lists(),
    organizationId,
    search,
    filters.category,
    filters.situation,
    filters.supplier_id,
  ] as const,
  details: () => [...inventoryKeys.all, 'detail'] as const,
  detail: (organizationId: string, itemId: string) => [
    ...inventoryKeys.details(), organizationId, itemId,
  ] as const,
  options: (organizationId: string) => [...inventoryKeys.all, 'options', organizationId] as const,
}

export function useInventoryItems(search: string, filters: InventoryFilters) {
  const organization = useActiveOrganization()
  const deferredSearch = useDeferredValue(search.trim())
  const items = useQuery({
    queryKey: inventoryKeys.list(organization.data ?? '', deferredSearch, filters),
    queryFn: () => searchInventoryItems(organization.data!, deferredSearch, filters),
    enabled: Boolean(organization.data),
  })
  const options = useQuery({
    queryKey: inventoryKeys.options(organization.data ?? ''),
    queryFn: () => getInventoryOptions(organization.data!),
    enabled: Boolean(organization.data),
    staleTime: 60_000,
  })

  return { organization, items, options, deferredSearch }
}

export function useInventoryItemDetails(itemId: string | undefined) {
  const organization = useActiveOrganization()
  const item = useQuery({
    queryKey: inventoryKeys.detail(organization.data ?? '', itemId ?? ''),
    queryFn: () => getInventoryItemDetails(organization.data!, itemId!),
    enabled: Boolean(organization.data && itemId),
  })

  return { organization, item }
}

export function useInventoryOptions() {
  const organization = useActiveOrganization()
  const options = useQuery({
    queryKey: inventoryKeys.options(organization.data ?? ''),
    queryFn: () => getInventoryOptions(organization.data!),
    enabled: Boolean(organization.data),
    staleTime: 60_000,
  })

  return { organization, options }
}
