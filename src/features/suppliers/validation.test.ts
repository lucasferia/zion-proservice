import { describe, expect, it } from 'vitest'
import { validateSupplier } from './validation'
import type { SupplierInput } from './types'

const valid: SupplierInput = { legal_name: 'Peças Fitness Brasil', trade_name: '', tax_id: '12.345.678/0001-90', contact_name: 'Ana', phone: '(11) 99999-0000', email: 'ana@fornecedor.com.br', address: 'Rua Azul, 10', notes: '', status: 'active' }

describe('validateSupplier', () => {
  it('aceita cadastro válido com CNPJ formatado', () => expect(validateSupplier(valid)).toEqual({}))
  it('exige nome e valida CPF/CNPJ e e-mail', () => {
    expect(validateSupplier({ ...valid, legal_name: '', tax_id: '123', email: 'invalido' })).toEqual(expect.objectContaining({ legal_name: expect.any(String), tax_id: expect.any(String), email: expect.any(String) }))
  })
})
