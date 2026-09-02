import { describe, expect, it } from 'vitest'
import { validateClient, validateClientLocation } from './validation'

describe('client validation', () => {
  it('aceita um cliente válido com campos opcionais vazios', () => {
    expect(
      validateClient({ name: 'Academia Central', phone: '', email: '', document: '', notes: '' }),
    ).toEqual({})
  })

  it('rejeita nome curto, e-mail e telefone inválidos', () => {
    const errors = validateClient({
      name: 'A',
      phone: '123',
      email: 'email-invalido',
      document: '',
      notes: '',
    })

    expect(errors.name).toBeDefined()
    expect(errors.phone).toBeDefined()
    expect(errors.email).toBeDefined()
  })
})

describe('client location validation', () => {
  it('aceita um endereço completo e UF em maiúsculas', () => {
    expect(
      validateClientLocation({
        name: 'Matriz',
        postal_code: '80000-000',
        street: 'Rua das Flores',
        number: '120',
        complement: '',
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: 'PR',
        notes: '',
      }),
    ).toEqual({})
  })

  it('exige nome, logradouro, cidade e UF válida', () => {
    const errors = validateClientLocation({
      name: '',
      postal_code: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: 'P',
      notes: '',
    })

    expect(errors.name).toBeDefined()
    expect(errors.street).toBeDefined()
    expect(errors.city).toBeDefined()
    expect(errors.state).toBeDefined()
  })
})

