import { describe, expect, it, vi } from 'vitest'
import { createClientId } from './clientId'

describe('createClientId', () => {
  it('usa randomUUID quando disponível', () => {
    const randomUUID = vi.fn(() => 'existing-uuid' as `${string}-${string}-${string}-${string}-${string}`)
    expect(createClientId({ randomUUID, getRandomValues: vi.fn() })).toBe('existing-uuid')
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it('gera um identificador compatível quando randomUUID não existe no navegador', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.fill(17)
      return bytes
    }) as Crypto['getRandomValues']

    expect(createClientId({ getRandomValues })).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/)
  })
})
