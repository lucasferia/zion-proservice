import { useQuery } from '@tanstack/react-query'
import { useDeferredValue } from 'react'
import { useActiveOrganization } from '../clients/clientQueries'
import { getReturnScheduleOptions, getReturnScheduleSummary, searchReturnSchedules } from './returnApi'
import type { ReturnScheduleFilters } from './types'

const emptyFilters: ReturnScheduleFilters = { periodStart: '', periodEnd: '', clientId: '', city: '', status: '' }

export const returnKeys = {
  all: ['return-schedules'] as const,
  list: (organizationId: string, search: string, filters: ReturnScheduleFilters, equipmentId = '') => [
    ...returnKeys.all, 'list', organizationId, search, filters.periodStart, filters.periodEnd,
    filters.clientId, filters.city, filters.status, equipmentId,
  ] as const,
  summary: (organizationId: string) => [...returnKeys.all, 'summary', organizationId] as const,
  options: (organizationId: string) => [...returnKeys.all, 'options', organizationId] as const,
}

export function useReturnSchedules(search: string, filters: ReturnScheduleFilters) {
  const organization = useActiveOrganization()
  const deferredSearch = useDeferredValue(search.trim())
  const enabled = Boolean(organization.data)
  const schedules = useQuery({
    queryKey: returnKeys.list(organization.data ?? '', deferredSearch, filters),
    queryFn: () => searchReturnSchedules(organization.data!, deferredSearch, filters),
    enabled,
  })
  const summary = useQuery({
    queryKey: returnKeys.summary(organization.data ?? ''),
    queryFn: () => getReturnScheduleSummary(organization.data!),
    enabled,
  })
  const options = useQuery({
    queryKey: returnKeys.options(organization.data ?? ''),
    queryFn: () => getReturnScheduleOptions(organization.data!),
    enabled,
    staleTime: 60_000,
  })
  return { organization, schedules, summary, options, deferredSearch }
}

export function useReturnScheduleOptions() {
  const organization = useActiveOrganization()
  const options = useQuery({
    queryKey: returnKeys.options(organization.data ?? ''),
    queryFn: () => getReturnScheduleOptions(organization.data!),
    enabled: Boolean(organization.data),
    staleTime: 60_000,
  })
  return { organization, options }
}

export function useRelevantReturns(clientId?: string, equipmentId?: string) {
  const organization = useActiveOrganization()
  const filters = { ...emptyFilters, clientId: clientId ?? '' }
  const schedules = useQuery({
    queryKey: returnKeys.list(organization.data ?? '', '', filters, equipmentId ?? ''),
    queryFn: () => searchReturnSchedules(organization.data!, '', filters, equipmentId ?? null),
    enabled: Boolean(organization.data && (clientId || equipmentId)),
  })
  return { organization, schedules }
}
