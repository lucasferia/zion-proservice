import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearPortalUnitPreference,
  getPortalUnitPreferenceKey,
  loadPortalUnitPreference,
  savePortalUnitPreference,
} from './portalPreferences'

describe('preferência local da unidade do Portal', () => {
  beforeEach(() => window.localStorage.clear())

  it('usa uma chave específica por usuário e armazena somente o ID da unidade', () => {
    savePortalUnitPreference('user-a', 'unit-1')
    expect(getPortalUnitPreferenceKey('user-a')).toBe('zion:academy-portal:selected-unit:user-a')
    expect(loadPortalUnitPreference('user-a')).toBe('unit-1')
    expect(loadPortalUnitPreference('user-b')).toBeNull()
  })

  it('remove a preferência no logout', () => {
    savePortalUnitPreference('user-a', 'unit-1')
    clearPortalUnitPreference('user-a')
    expect(loadPortalUnitPreference('user-a')).toBeNull()
  })
})
