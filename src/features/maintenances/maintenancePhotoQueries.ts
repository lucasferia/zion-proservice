import { useQuery } from '@tanstack/react-query'
import { getMaintenancePhotos } from './maintenancePhotoApi'

export const maintenancePhotoKeys = {
  all: ['maintenance-photos'] as const,
  detail: (organizationId: string, maintenanceId: string) => [
    ...maintenancePhotoKeys.all,
    organizationId,
    maintenanceId,
  ] as const,
}

export function useMaintenancePhotos(organizationId: string, maintenanceId: string) {
  return useQuery({
    queryKey: maintenancePhotoKeys.detail(organizationId, maintenanceId),
    queryFn: () => getMaintenancePhotos(organizationId, maintenanceId),
    enabled: Boolean(organizationId && maintenanceId),
    staleTime: 4 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
  })
}
