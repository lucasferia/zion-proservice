import { Outlet } from 'react-router-dom'
import horizontalLogo from '../../../Imagens/Logo Horizontal.png'
import { useAuth } from '../auth/auth-context'

function LogoutButton() {
  const { signOut } = useAuth()
  return <button className="secondary-button" type="button" onClick={() => void signOut()}>Sair com segurança</button>
}

export function PortalShell() {
  const { session } = useAuth()
  const name = typeof session?.user.user_metadata.full_name === 'string'
    ? session.user.user_metadata.full_name
    : 'Academia'

  return (
    <div className="academy-shell">
      <header>
        <img src={horizontalLogo} alt="ZION ProService" />
        <div><span className="eyebrow">Portal da Academia</span><strong>{name}</strong></div>
        <LogoutButton />
      </header>
      <main id="portal-content" tabIndex={-1}><Outlet /></main>
    </div>
  )
}

export function PortalLandingPage() {
  return (
    <section className="portal-landing" aria-labelledby="portal-title">
      <span className="portal-landing__coordinate">ACESSO / VALIDADO</span>
      <span className="eyebrow">Ambiente externo seguro</span>
      <h1 id="portal-title">Portal<br /><strong>preparado.</strong></h1>
      <p>Seu vínculo está ativo. Os recursos operacionais da academia serão disponibilizados nas próximas etapas.</p>
      <div className="portal-landing__seal"><span>01</span><strong>Acesso isolado</strong><small>Nenhum dado interno é consultado nesta versão.</small></div>
    </section>
  )
}

const blockedCopy = {
  pending: {
    eyebrow: 'Cadastro em validação',
    title: 'Aguardando liberação',
    description: 'Sua conta está segura, mas ainda precisa ser vinculada à academia, às unidades e à liberação comercial.',
    marker: 'PENDENTE',
  },
  suspended: {
    eyebrow: 'Acesso temporariamente bloqueado',
    title: 'Portal suspenso',
    description: 'Não foi possível liberar o portal neste momento. Fale com a equipe ZION para revisar a situação da conta.',
    marker: 'SUSPENSO',
  },
  invalid: {
    eyebrow: 'Classificação de conta',
    title: 'Conta sem acesso',
    description: 'Esta conta não possui um ambiente válido. Nenhuma informação do sistema foi liberada.',
    marker: 'BLOQUEADO',
  },
} as const

export function PortalBlockedPage({ variant }: { variant: keyof typeof blockedCopy }) {
  const copy = blockedCopy[variant]
  return (
    <main className={`portal-blocked portal-blocked--${variant}`}>
      <section>
        <img src={horizontalLogo} alt="ZION ProService" />
        <span className="portal-blocked__marker">{copy.marker}</span>
        <span className="eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        <div className="portal-blocked__status"><span aria-hidden="true" /><div><strong>Acesso negado por padrão</strong><small>Seus dados de autenticação continuam protegidos.</small></div></div>
        <LogoutButton />
      </section>
    </main>
  )
}
