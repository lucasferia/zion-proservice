import type { AuthError } from '@supabase/supabase-js'

export function getFriendlyAuthError(error: AuthError): string {
  if (error.status === 400) return 'E-mail ou senha inválidos.'
  if (error.status === 422) return 'Confira o formato do e-mail informado.'
  if (error.status === 429) return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
  return 'Não foi possível entrar agora. Tente novamente.'
}

