import { useQuery } from '@tanstack/react-query'
import { useActiveOrganization } from '../clients/clientQueries'
import { getOperationalDashboard } from './dashboardApi'
import type { DashboardPeriod } from './types'

export const dashboardKeys = {
  all: ['operational-dashboard'] as const,
  detail: (organizationId: string, period: DashboardPeriod) => [
    ...dashboardKeys.all,
    organizationId,
    period.start,
    period.end,
  ] as const,
}

export function useOperationalDashboard(period: DashboardPeriod) {
  const organization = useActiveOrganization()
  const dashboard = useQuery({
    queryKey: dashboardKeys.detail(organization.data ?? '', period),
    queryFn: () => getOperationalDashboard(organization.data!, period),
    enabled: Boolean(organization.data && period.start && period.end && period.start <= period.end),
  })
  return { organization, dashboard }
}
