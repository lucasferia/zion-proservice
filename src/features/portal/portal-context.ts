import { createContext, useContext } from 'react'
import type { PortalContextData, PortalUnit } from './types'

export const portalContextKeys = {
  all: ['academy-portal-context'] as const,
  user: (userId: string) => [...portalContextKeys.all, userId] as const,
}

export type PortalContextValue = {
  context: PortalContextData
  selectedUnit: PortalUnit | null
  selectingUnitId: string | null
  selectUnit: (unitId: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export const PortalContext = createContext<PortalContextValue | undefined>(undefined)

export function usePortalContext() {
  const context = useContext(PortalContext)
  if (!context) throw new Error('usePortalContext deve ser usado dentro de PortalContextProvider')
  return context
}
