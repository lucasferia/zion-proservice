import { describe, expect, it } from 'vitest'
import { getDefaultAccessPath, isPathAllowedForContext } from './access'

describe('roteamento por contexto', () => {
  it.each([
    ['internal_owner', '/app'],
    ['internal_technician', '/app'],
    ['academy_active', '/portal'],
    ['academy_pending', '/portal/aguardando'],
    ['academy_suspended', '/portal/suspenso'],
    ['invalid_account', '/conta-sem-acesso'],
  ] as const)('direciona %s ao ambiente correto', (context, path) => {
    expect(getDefaultAccessPath(context)).toBe(path)
  })

  it('não permite que usuário externo preserve uma rota interna solicitada', () => {
    expect(isPathAllowedForContext('/app/clientes', 'academy_active')).toBe(false)
    expect(isPathAllowedForContext('/portal', 'academy_active')).toBe(true)
  })
})
