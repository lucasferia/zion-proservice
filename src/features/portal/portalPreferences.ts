const STORAGE_PREFIX = 'zion:academy-portal:selected-unit'

export function getPortalUnitPreferenceKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`
}

export function loadPortalUnitPreference(userId: string) {
  try {
    return window.localStorage.getItem(getPortalUnitPreferenceKey(userId))
  } catch {
    return null
  }
}

export function savePortalUnitPreference(userId: string, unitId: string) {
  try {
    window.localStorage.setItem(getPortalUnitPreferenceKey(userId), unitId)
  } catch {
    // A preferência é opcional; a autorização nunca depende do armazenamento local.
  }
}

export function clearPortalUnitPreference(userId: string) {
  try {
    window.localStorage.removeItem(getPortalUnitPreferenceKey(userId))
  } catch {
    // Sem efeito de segurança: o valor sempre é validado contra a RPC.
  }
}
