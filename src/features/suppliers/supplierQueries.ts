import { useQuery } from '@tanstack/react-query'
import { useDeferredValue } from 'react'
import { useActiveOrganization } from '../clients/clientQueries'
import { getSupplier, searchSuppliers } from './supplierApi'

export const supplierKeys = {
  all: ['suppliers'] as const,
  lists: () => ['suppliers', 'list'] as const,
  list: (organizationId: string, search: string, status: string) => ['suppliers', 'list', organizationId, search, status] as const,
  detail: (organizationId: string, supplierId: string) => ['suppliers', 'detail', organizationId, supplierId] as const,
}

export function useSuppliers(search: string, status: string) {
  const organization = useActiveOrganization()
  const deferredSearch = useDeferredValue(search.trim())
  const suppliers = useQuery({
    queryKey: supplierKeys.list(organization.data ?? '', deferredSearch, status),
    queryFn: () => searchSuppliers(organization.data!, deferredSearch, status),
    enabled: Boolean(organization.data),
  })
  return { organization, suppliers, deferredSearch }
}

export function useSupplier(supplierId: string | undefined) {
  const organization = useActiveOrganization()
  const supplier = useQuery({
    queryKey: supplierKeys.detail(organization.data ?? '', supplierId ?? ''),
    queryFn: () => getSupplier(organization.data!, supplierId!),
    enabled: Boolean(organization.data && supplierId),
  })
  return { organization, supplier }
}
