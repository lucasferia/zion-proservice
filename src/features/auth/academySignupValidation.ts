export type AcademySignupValues = {
  fullName: string
  email: string
  password: string
  passwordConfirmation: string
}

export function validateAcademySignup(values: AcademySignupValues) {
  const errors: Partial<Record<keyof AcademySignupValues, string>> = {}
  if (values.fullName.trim().length < 2) errors.fullName = 'Informe seu nome completo.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Informe um e-mail válido.'
  }
  if (values.password.length < 8 || !/[A-Za-zÀ-ÿ]/.test(values.password) || !/\d/.test(values.password)) {
    errors.password = 'Use ao menos 8 caracteres, incluindo uma letra e um número.'
  }
  if (values.passwordConfirmation !== values.password) {
    errors.passwordConfirmation = 'As senhas precisam ser idênticas.'
  }
  return errors
}
