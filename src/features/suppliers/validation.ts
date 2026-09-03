import type { FieldErrors } from '../clients/validation'
import type { SupplierInput } from './types'

export function validateSupplier(input: SupplierInput): FieldErrors<SupplierInput> {
  const errors: FieldErrors<SupplierInput> = {}
  const legalName = input.legal_name.trim()
  const tradeName = input.trade_name.trim()
  const taxDigits = input.tax_id.replace(/\D/g, '')
  const contact = input.contact_name.trim()
  const phone = input.phone.trim()
  const email = input.email.trim()

  if (legalName.length < 2) errors.legal_name = 'Informe um nome ou razão social com pelo menos 2 caracteres.'
  if (legalName.length > 160) errors.legal_name = 'O nome deve ter no máximo 160 caracteres.'
  if (tradeName && tradeName.length < 2) errors.trade_name = 'O nome fantasia deve ter pelo menos 2 caracteres.'
  if (tradeName.length > 160) errors.trade_name = 'O nome fantasia deve ter no máximo 160 caracteres.'
  if (taxDigits && ![11, 14].includes(taxDigits.length)) errors.tax_id = 'Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.'
  if (contact && contact.length < 2) errors.contact_name = 'O contato deve ter pelo menos 2 caracteres.'
  if (contact.length > 120) errors.contact_name = 'O contato deve ter no máximo 120 caracteres.'
  if (phone && (phone.length < 8 || phone.length > 30)) errors.phone = 'Informe um telefone válido.'
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Informe um e-mail válido.'
  if (email.length > 160) errors.email = 'O e-mail deve ter no máximo 160 caracteres.'
  if (input.address.length > 500) errors.address = 'O endereço deve ter no máximo 500 caracteres.'
  if (input.notes.length > 2000) errors.notes = 'As observações devem ter no máximo 2.000 caracteres.'
  if (!['active', 'inactive'].includes(input.status)) errors.status = 'Selecione um status válido.'
  return errors
}
