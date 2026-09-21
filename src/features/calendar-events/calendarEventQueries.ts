import { useQuery } from '@tanstack/react-query'
import { useDeferredValue } from 'react'
import { useActiveOrganization } from '../clients/clientQueries'
import { getCalendarEvent, getCalendarEventOptions, searchCalendarEvents } from './calendarEventApi'
import type { CalendarEventFilters } from './types'

export const calendarEventKeys = {
  all: ['calendar-events'] as const,
  list: (organizationId: string, search: string, filters: CalendarEventFilters) => [
    'calendar-events', 'list', organizationId, search, filters.periodStart, filters.periodEnd,
    filters.eventType, filters.status, filters.clientId, filters.city,
  ] as const,
  detail: (organizationId: string, eventId: string) => ['calendar-events', 'detail', organizationId, eventId] as const,
  options: (organizationId: string) => ['calendar-events', 'options', organizationId] as const,
}

export function useCalendarEvents(search: string, filters: CalendarEventFilters) {
  const organization = useActiveOrganization()
  const deferredSearch = useDeferredValue(search.trim())
  const events = useQuery({
    queryKey: calendarEventKeys.list(organization.data ?? '', deferredSearch, filters),
    queryFn: () => searchCalendarEvents(organization.data!, deferredSearch, filters),
    enabled: Boolean(organization.data),
  })
  return { organization, events, deferredSearch }
}

export function useCalendarEventOptions() {
  const organization = useActiveOrganization()
  const options = useQuery({
    queryKey: calendarEventKeys.options(organization.data ?? ''),
    queryFn: () => getCalendarEventOptions(organization.data!),
    enabled: Boolean(organization.data), staleTime: 60_000,
  })
  return { organization, options }
}

export function useCalendarEventDetails(eventId?: string) {
  const organization = useActiveOrganization()
  const event = useQuery({
    queryKey: calendarEventKeys.detail(organization.data ?? '', eventId ?? ''),
    queryFn: () => getCalendarEvent(organization.data!, eventId!),
    enabled: Boolean(organization.data && eventId),
  })
  const options = useQuery({
    queryKey: calendarEventKeys.options(organization.data ?? ''),
    queryFn: () => getCalendarEventOptions(organization.data!),
    enabled: Boolean(organization.data), staleTime: 60_000,
  })
  return { organization, event, options }
}
