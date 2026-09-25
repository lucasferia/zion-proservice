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

  it('separa vínculo incompleto e bloqueio comercial dos demais estados', () => {
    expect(getDefaultAccessPath({ kind: 'academy_pending', blockingReason: 'no_active_location' })).toBe('/portal/acesso-indisponivel')
    expect(getDefaultAccessPath({ kind: 'academy_suspended', blockingReason: 'commercial_access_blocked' })).toBe('/portal/acesso-indisponivel')
    expect(isPathAllowedForContext('/portal/aguardando', { kind: 'academy_pending', blockingReason: 'no_active_location' })).toBe(false)
    expect(isPathAllowedForContext('/portal/acesso-indisponivel', { kind: 'academy_pending', blockingReason: 'no_active_location' })).toBe(true)
  })

  it('restringe o usuário ativo às três rotas reais do Portal', () => {
    expect(isPathAllowedForContext('/portal/unidades', 'academy_active')).toBe(true)
    expect(isPathAllowedForContext('/portal/perfil', 'academy_active')).toBe(true)
    expect(isPathAllowedForContext('/portal/rota-futura', 'academy_active')).toBe(false)
  })
})
