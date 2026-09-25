import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { LoadingScreen } from '../../components/LoadingScreen'
import { PageState } from '../../components/PageState'
import { useAuth } from '../auth/auth-context'
import { getPortalContext, PortalAuthorizationError } from './portalApi'
import { PortalContext, portalContextKeys, type PortalContextValue } from './portal-context'
import {
  clearPortalUnitPreference,
  loadPortalUnitPreference,
  savePortalUnitPreference,
} from './portalPreferences'

type SelectionState = {
  userId: string
  unitId: string | null
}

export function PortalContextProvider({ children }: { children: ReactNode }) {
  const { session, retryAccessResolution } = useAuth()
  const queryClient = useQueryClient()
  const userId = session?.user.id ?? ''
  const [selection, setSelection] = useState<SelectionState | null>(null)
  const [selectingUnitId, setSelectingUnitId] = useState<string | null>(null)
  const authorizationRefreshStarted = useRef(false)

  const query = useQuery({
    queryKey: portalContextKeys.user(userId),
    queryFn: getPortalContext,
    enabled: Boolean(userId),
    staleTime: 15_000,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    retry: (failureCount, error) => !(error instanceof PortalAuthorizationError) && failureCount < 1,
  })

  useEffect(() => {
    if (!(query.error instanceof PortalAuthorizationError) || authorizationRefreshStarted.current) return
    authorizationRefreshStarted.current = true
    if (userId) clearPortalUnitPreference(userId)
    queryClient.setQueryData(portalContextKeys.user(userId), undefined)
    void retryAccessResolution()
  }, [query.error, queryClient, retryAccessResolution, userId])

  useEffect(() => {
    if (!query.error) authorizationRefreshStarted.current = false
  }, [query.error])

  const selectUnit = useCallback(async (unitId: string) => {
    if (!userId) return false
    setSelectingUnitId(unitId)
    try {
      const refreshed = await query.refetch()
      const unitIsAuthorized = refreshed.data?.units.some((unit) => unit.id === unitId) ?? false
      if (!unitIsAuthorized) {
        clearPortalUnitPreference(userId)
        setSelection({ userId, unitId: null })
        if (refreshed.error instanceof PortalAuthorizationError) await retryAccessResolution()
        return false
      }
      setSelection({ userId, unitId })
      savePortalUnitPreference(userId, unitId)
      return true
    } finally {
      setSelectingUnitId(null)
    }
  }, [query, retryAccessResolution, userId])

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: portalContextKeys.user(userId) })
  }, [queryClient, userId])

  const selectedUnit = useMemo(() => {
    if (!query.data || !userId) return null
    const manualId = selection?.userId === userId ? selection.unitId : null
    const preferredId = loadPortalUnitPreference(userId)
    const selectedId = manualId && query.data.units.some((unit) => unit.id === manualId)
      ? manualId
      : preferredId && query.data.units.some((unit) => unit.id === preferredId)
        ? preferredId
        : query.data.units.length === 1
          ? query.data.units[0].id
          : null
    return query.data.units.find((unit) => unit.id === selectedId) ?? null
  }, [query.data, selection, userId])

  useEffect(() => {
    if (!userId || !query.data) return
    if (selectedUnit) savePortalUnitPreference(userId, selectedUnit.id)
    else clearPortalUnitPreference(userId)
  }, [query.data, selectedUnit, userId])

  const value = useMemo<PortalContextValue | null>(() => query.data ? ({
    context: query.data,
    selectedUnit,
    selectingUnitId,
    selectUnit,
    refresh,
  }) : null, [query.data, refresh, selectUnit, selectedUnit, selectingUnitId])

  if (query.isPending || query.isFetching) {
    return <LoadingScreen label="Atualizando seu acesso ao Portal" />
  }

  if (query.isError || !value) {
    if (query.error instanceof PortalAuthorizationError) {
      return <LoadingScreen label="Revalidando sua autorização" />
    }
    return (
      <main className="portal-context-state">
        <PageState
          tone="error"
          title="Não foi possível carregar o Portal"
          description="Confira sua conexão e tente novamente. Nenhum dado anterior foi mantido na tela."
          actionLabel="Tentar novamente"
          onAction={() => void query.refetch()}
        />
      </main>
    )
  }

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}
