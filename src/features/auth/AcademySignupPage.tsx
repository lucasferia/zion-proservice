import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import horizontalLogo from '../../../Imagens/Logo Horizontal.png'
import { useAuth } from './auth-context'
import { validateAcademySignup, type AcademySignupValues } from './academySignupValidation'

export function AcademySignupPage() {
  const { signUpAcademy, status } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState<AcademySignupValues>({
    fullName: '', email: '', password: '', passwordConfirmation: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof AcademySignupValues, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: keyof AcademySignupValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateAcademySignup(values)
    setErrors(nextErrors)
    setSubmitError(null)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    const result = await signUpAcademy({
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      password: values.password,
    })
    setIsSubmitting(false)
    if (result.error) {
      setSubmitError(result.error)
      return
    }
    navigate('/portal/cadastro/confirmar-email', {
      replace: true,
      state: { email: values.email.trim(), confirmationRequired: result.emailConfirmationRequired },
    })
  }

  const disabled = isSubmitting || status === 'configuration_error'

  return (
    <main className="portal-auth-page">
      <div className="portal-auth-page__grid" aria-hidden="true" />
      <section className="portal-auth-copy" aria-labelledby="signup-title">
        <Link to="/login" aria-label="Voltar para o login">
          <img src={horizontalLogo} alt="ZION ProService" />
        </Link>
        <span className="eyebrow">Portal da Academia · acesso externo</span>
        <h1 id="signup-title">Sua operação,<br /><strong>mais próxima.</strong></h1>
        <p>Crie sua conta. O acesso começa pendente e só é liberado após a vinculação segura pela equipe ZION.</p>
        <ol aria-label="Etapas de ativação">
          <li><span>01</span> Cadastro e confirmação do e-mail</li>
          <li><span>02</span> Validação da academia e das unidades</li>
          <li><span>03</span> Liberação segura do portal</li>
        </ol>
      </section>

      <section className="portal-auth-panel" aria-label="Cadastro no Portal da Academia">
        <form className="portal-signup-card" onSubmit={handleSubmit} noValidate>
          <div className="portal-signup-card__index" aria-hidden="true">10 / PORTAL</div>
          <span className="eyebrow">Solicitar acesso</span>
          <h2>Crie sua conta</h2>
          <p>Você não precisa escolher organização, unidade ou perfil. Esses vínculos são definidos após a validação.</p>

          {status === 'configuration_error' && (
            <div className="alert alert--error" role="alert">O cadastro está indisponível neste ambiente.</div>
          )}
          {submitError && <div className="alert alert--error" role="alert">{submitError}</div>}

          <div className="field">
            <label htmlFor="signup-name">Nome completo</label>
            <input id="signup-name" autoComplete="name" value={values.fullName} onChange={(event) => updateField('fullName', event.target.value)} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'signup-name-error' : undefined} disabled={disabled} />
            {errors.fullName && <small id="signup-name-error" className="field-error">{errors.fullName}</small>}
          </div>
          <div className="field">
            <label htmlFor="signup-email">E-mail</label>
            <input id="signup-email" type="email" autoComplete="email" inputMode="email" value={values.email} onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'signup-email-error' : undefined} disabled={disabled} />
            {errors.email && <small id="signup-email-error" className="field-error">{errors.email}</small>}
          </div>
          <div className="portal-signup-passwords">
            <div className="field">
              <label htmlFor="signup-password">Senha</label>
              <input id="signup-password" type="password" autoComplete="new-password" value={values.password} onChange={(event) => updateField('password', event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'signup-password-error' : 'signup-password-help'} disabled={disabled} />
              <small id={errors.password ? 'signup-password-error' : 'signup-password-help'} className={errors.password ? 'field-error' : 'field-help'}>{errors.password ?? 'Mínimo de 8 caracteres, com letra e número.'}</small>
            </div>
            <div className="field">
              <label htmlFor="signup-confirmation">Confirme a senha</label>
              <input id="signup-confirmation" type="password" autoComplete="new-password" value={values.passwordConfirmation} onChange={(event) => updateField('passwordConfirmation', event.target.value)} aria-invalid={Boolean(errors.passwordConfirmation)} aria-describedby={errors.passwordConfirmation ? 'signup-confirmation-error' : undefined} disabled={disabled} />
              {errors.passwordConfirmation && <small id="signup-confirmation-error" className="field-error">{errors.passwordConfirmation}</small>}
            </div>
          </div>

          <button className="primary-button" type="submit" disabled={disabled}>
            {isSubmitting ? 'Criando acesso…' : 'Criar acesso pendente'} <span aria-hidden="true">→</span>
          </button>
          <p className="portal-signup-card__login">Já possui conta? <Link to="/login">Entrar</Link></p>
        </form>
      </section>
    </main>
  )
}
