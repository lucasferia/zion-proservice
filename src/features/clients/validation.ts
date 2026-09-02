import type { ClientInput, ClientLocationInput } from './types'

export type FieldErrors<T> = Partial<Record<keyof T, string>>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateClient(input: ClientInput): FieldErrors<ClientInput> {
  const errors: FieldErrors<ClientInput> = {}
  const name = input.name.trim()
  const phone = input.phone.trim()
  const email = input.email.trim()
  const document = input.document.trim()

  if (name.length < 2) errors.name = 'Informe um nome com pelo menos 2 caracteres.'
  if (name.length > 160) errors.name = 'O nome deve ter no máximo 160 caracteres.'
  if (phone && phone.length < 8) errors.phone = 'Informe um telefone válido ou deixe o campo vazio.'
  if (phone.length > 30) errors.phone = 'O telefone deve ter no máximo 30 caracteres.'
  if (email && !emailPattern.test(email)) errors.email = 'Informe um e-mail válido.'
  if (email.length > 254) errors.email = 'O e-mail deve ter no máximo 254 caracteres.'
  if (document && document.length < 3) errors.document = 'O documento deve ter ao menos 3 caracteres.'
  if (document.length > 32) errors.document = 'O documento deve ter no máximo 32 caracteres.'
  if (input.notes.length > 1000) errors.notes = 'As observações devem ter no máximo 1.000 caracteres.'

  return errors
}

export function validateClientLocation(
  input: ClientLocationInput,
): FieldErrors<ClientLocationInput> {
  const errors: FieldErrors<ClientLocationInput> = {}
  const name = input.name.trim()
  const postalCode = input.postal_code.trim()
  const street = input.street.trim()
  const number = input.number.trim()
  const neighborhood = input.neighborhood.trim()
  const city = input.city.trim()
  const state = input.state.trim().toUpperCase()

  if (name.length < 2) errors.name = 'Dê um nome à unidade, como Matriz ou Academia Centro.'
  if (name.length > 120) errors.name = 'O nome da unidade deve ter no máximo 120 caracteres.'
  if (postalCode && postalCode.length < 3) errors.postal_code = 'Informe um CEP válido.'
  if (postalCode.length > 20) errors.postal_code = 'O CEP deve ter no máximo 20 caracteres.'
  if (street.length < 2) errors.street = 'Informe o logradouro.'
  if (street.length > 160) errors.street = 'O logradouro deve ter no máximo 160 caracteres.'
  if (number.length > 20) errors.number = 'O número deve ter no máximo 20 caracteres.'
  if (input.complement.length > 120) errors.complement = 'O complemento deve ter no máximo 120 caracteres.'
  if (neighborhood && neighborhood.length < 2) errors.neighborhood = 'Informe um bairro válido.'
  if (neighborhood.length > 100) errors.neighborhood = 'O bairro deve ter no máximo 100 caracteres.'
  if (city.length < 2) errors.city = 'Informe a cidade.'
  if (city.length > 100) errors.city = 'A cidade deve ter no máximo 100 caracteres.'
  if (!/^[A-Z]{2}$/.test(state)) errors.state = 'Use a sigla do estado com 2 letras.'
  if (input.notes.length > 500) errors.notes = 'As observações devem ter no máximo 500 caracteres.'

  return errors
}

export function hasValidationErrors<T>(errors: FieldErrors<T>) {
  return Object.keys(errors).length > 0
}

