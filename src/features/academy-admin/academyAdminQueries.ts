import { useDeferredValue } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeAcademyPortalCommercialAccess,
  changeAcademyPortalUserStatus,
  configureAcademyPortalUser,
  getAcademyAdminSummary,
  getAcademyAdminUser,
  listAcademyAdminLocations,
  listAcademyAdminUsers,
  replaceAcademyPortalUserLocations,
} from './academyAdminApi'
import type { AcademyUserListFilters } from './types'

export const academyAdminKeys = {
  all: ['academy-admin'] as const,
  summary: () => [...academyAdminKeys.all, 'summary'] as const,
  options: () => [...academyAdminKeys.all, 'options'] as const,
  list: (filters: AcademyUserListFilters) => [...academyAdminKeys.all, 'list', filters] as const,
  detail: (userId: string) => [...academyAdminKeys.all, 'detail', userId] as const,
}
export function useAcademyAdminList(filters: AcademyUserListFilters) {
  const deferredSearch = useDeferredValue(filters.search.trim())
  const queryFilters = { ...filters, search: deferredSearch }
  const summary = useQuery({ queryKey: academyAdminKeys.summary(), queryFn: getAcademyAdminSummary })
  const options = useQuery({ queryKey: academyAdminKeys.options(), queryFn: listAcademyAdminLocations })
  const users = useQuery({
    queryKey: academyAdminKeys.list(queryFilters),
    queryFn: () => listAcademyAdminUsers(queryFilters),
  })
  return { summary, options, users, deferredSearch }
}

export function useAcademyAdminUser(userId: string | undefined) {
  const details = useQuery({
    queryKey: academyAdminKeys.detail(userId ?? ''),
    queryFn: () => getAcademyAdminUser(userId!),
    enabled: Boolean(userId),
  })
  const options = useQuery({ queryKey: academyAdminKeys.options(), queryFn: listAcademyAdminLocations })
  return { details, options }
}

export function useAcademyAdminMutations(userId: string) {
  const queryClient = useQueryClient()
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: academyAdminKeys.all }),
      queryClient.invalidateQueries({ queryKey: academyAdminKeys.detail(userId) }),
    ])
  }
  return {
    configure: useMutation({ mutationFn: configureAcademyPortalUser, onSuccess: refresh }),
    changeStatus: useMutation({ mutationFn: changeAcademyPortalUserStatus, onSuccess: refresh }),
    replaceLocations: useMutation({ mutationFn: replaceAcademyPortalUserLocations, onSuccess: refresh }),
    changeCommercial: useMutation({ mutationFn: changeAcademyPortalCommercialAccess, onSuccess: refresh }),
  }
}
