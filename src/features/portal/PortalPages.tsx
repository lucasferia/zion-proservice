import { useState, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import horizontalLogo from '../../../Imagens/Logo Horizontal.png'
import { getDefaultAccessPath } from '../auth/access'
import { useAuth } from '../auth/auth-context'
import { usePortalContext } from './portal-context'

type PortalIconName = 'home' | 'units' | 'profile' | 'switch' | 'logout'

function PortalIcon({ name }: { name: PortalIconName }) {
  const paths: Record<PortalIconName, ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5M9 20v-6h6v6" /></>,
    units: <><path d="M4 20V7l8-3 8 3v13" /><path d="M8 10h1m6 0h1m-8 4h1m6 0h1M3 20h18" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    switch: <><path d="m7 7-4 4 4 4M3 11h13" /><path d="m17 3 4 4-4 4m4-4H8" /></>,
    logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9" /></>,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24">{paths[name]}</svg>
}

const navigation = [
  { to: '/portal', label: 'Início', icon: 'home' as const, end: true },
  { to: '/portal/unidades', label: 'Unidades', icon: 'units' as const, end: false },
  { to: '/portal/perfil', label: 'Meu perfil', icon: 'profile' as const, end: false },
]

function PortalNavigation({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav className={mobile ? 'portal-mobile-nav' : 'portal-main-nav'} aria-label="Navegação do Portal">
      {navigation.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}>
          <PortalIcon name={item.icon} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function LogoutButton({ compact = false }: { compact?: boolean }) {
  const { signOut } = useAuth()
  return (
    <button className={compact ? 'portal-icon-button' : 'portal-logout-button'} type="button" onClick={() => void signOut()} aria-label="Sair com segurança">
      <PortalIcon name="logout" />
      {!compact && <span>Sair</span>}
    </button>
  )
}

function PortalStatusPill() {
  const { context } = usePortalContext()
  const trialing = context.access.isTrialing
  return <span className={`portal-access-pill ${trialing ? 'portal-access-pill--trial' : ''}`}>{trialing ? 'Período de teste' : 'Portal ativo'}</span>
}

export function PortalShell() {
  const { context, selectedUnit } = usePortalContext()
  const location = useLocation()

  if (!selectedUnit && location.pathname !== '/portal/unidades') {
    return <Navigate to="/portal/unidades" replace />
  }

  return (
    <div className="academy-portal-shell">
      <a className="skip-link" href="#portal-main">Ir para o conteúdo</a>
      <header className="portal-topbar">
        <Link className="portal-brand" to="/portal" aria-label="ZION ProService — início do Portal">
          <img src={horizontalLogo} alt="ZION ProService" />
          <span>Portal da Academia</span>
        </Link>
        <div className="portal-current-context" aria-label="Contexto atual">
          <span>{context.academy.name}</span>
          <strong>{selectedUnit?.name ?? 'Selecione uma unidade'}</strong>
        </div>
        <div className="portal-topbar__actions">
          {context.unitCount > 1 && (
            <Link className="portal-switch-link" to="/portal/unidades"><PortalIcon name="switch" />Trocar unidade</Link>
          )}
          <Link className="portal-profile-link" to="/portal/perfil" aria-label="Abrir meu perfil"><PortalIcon name="profile" /></Link>
          <LogoutButton compact />
        </div>
      </header>
      <PortalNavigation />
      <main id="portal-main" className="portal-main" tabIndex={-1}><Outlet /></main>
      <PortalNavigation mobile />
    </div>
  )
}

export function PortalHomePage() {
  const { context, selectedUnit } = usePortalContext()
  const firstName = context.user.fullName.trim().split(/\s+/)[0] || 'Olá'

  return (
    <div className="portal-page portal-home-page">
      <section className="portal-home-hero" aria-labelledby="portal-home-title">
        <div>
          <span className="portal-coordinate">UNIDADE / {selectedUnit?.state ?? '--'}</span>
          <PortalStatusPill />
          <p className="eyebrow">Olá, {firstName}</p>
          <h1 id="portal-home-title">Sua academia,<br /><strong>no contexto certo.</strong></h1>
          <p>Este é o ambiente seguro de acompanhamento da {context.academy.name}. As informações exibidas sempre respeitam a unidade selecionada e o seu vínculo atual.</p>
        </div>
        <aside className="portal-unit-ticket" aria-label="Unidade selecionada">
          <span>Unidade atual</span>
          <strong>{selectedUnit?.name ?? 'Seleção necessária'}</strong>
          {selectedUnit && <small>{selectedUnit.city} · {selectedUnit.state}</small>}
          {context.unitCount > 1 && <Link to="/portal/unidades">Trocar unidade <span aria-hidden="true">→</span></Link>}
        </aside>
      </section>

      <section className="portal-home-grid" aria-label="Informações do Portal">
        <article className="portal-info-panel">
          <span className="portal-panel-index">01</span>
          <p className="eyebrow">Seu acesso</p>
          <h2>{context.academy.name}</h2>
          <p>Você possui acesso a {context.unitCount === 1 ? '1 unidade autorizada' : `${context.unitCount} unidades autorizadas`}. A escolha da unidade organiza sua navegação, sem ampliar permissões.</p>
          <Link className="portal-text-link" to="/portal/unidades">Ver unidades autorizadas <span aria-hidden="true">→</span></Link>
        </article>
        <article className="portal-info-panel portal-info-panel--muted">
          <span className="portal-panel-index">02</span>
          <p className="eyebrow">Próximas etapas</p>
          <h2>Um canal direto com a Zion</h2>
          <p>Equipamentos, solicitações e histórico de atendimento serão adicionados em etapas futuras. Nenhum dado operacional fictício é exibido agora.</p>
          <ul aria-label="Recursos planejados">
            <li><span aria-hidden="true" />Acompanhamento de equipamentos</li>
            <li><span aria-hidden="true" />Solicitações de atendimento</li>
            <li><span aria-hidden="true" />Histórico de serviços</li>
          </ul>
        </article>
      </section>

      <section className="portal-help-strip">
        <div><span className="eyebrow">Acesso incorreto?</span><strong>Fale com a equipe Zion</strong></div>
        <p>Se a academia ou as unidades exibidas não correspondem ao seu acesso, saia da conta e solicite a revisão do vínculo.</p>
      </section>
    </div>
  )
}

export function PortalUnitsPage() {
  const { context, selectedUnit, selectingUnitId, selectUnit } = usePortalContext()
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(null)

  async function handleSelect(unitId: string) {
    setMessage(null)
    const selected = await selectUnit(unitId)
    if (selected) navigate('/portal')
    else setMessage('Essa unidade não está mais disponível. Seu acesso foi atualizado com segurança.')
  }

  return (
    <div className="portal-page portal-units-page">
      <header className="portal-page-heading">
        <div><span className="eyebrow">Contexto da navegação</span><h1>Unidades autorizadas</h1></div>
        <p>Escolha a unidade que deseja acompanhar. Esta preferência não concede acesso e é validada novamente pela Zion.</p>
      </header>
      {message && <div className="portal-inline-alert" role="alert">{message}</div>}
      <div className="portal-unit-grid" aria-live="polite">
        {context.units.map((unit, index) => {
          const current = selectedUnit?.id === unit.id
          const selecting = selectingUnitId === unit.id
          return (
            <article className={`portal-unit-card ${current ? 'portal-unit-card--current' : ''}`} key={unit.id}>
              <span className="portal-unit-card__index">{String(index + 1).padStart(2, '0')}</span>
              <div>{current && <span className="portal-current-mark">Unidade atual</span>}<h2>{unit.name}</h2><p>{unit.city} · {unit.state}</p></div>
              <button type="button" disabled={current || Boolean(selectingUnitId)} onClick={() => void handleSelect(unit.id)} aria-pressed={current}>
                {current ? 'Em uso' : selecting ? 'Validando…' : 'Acessar esta unidade'}
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export function PortalProfilePage() {
  const { context, selectedUnit } = usePortalContext()
  const { session } = useAuth()

  return (
    <div className="portal-page portal-profile-page">
      <header className="portal-page-heading">
        <div><span className="eyebrow">Conta e vínculo</span><h1>Meu perfil</h1></div>
        <p>Informações somente para consulta. Alterações de acesso devem ser solicitadas à equipe Zion.</p>
      </header>
      <div className="portal-profile-layout">
        <section className="portal-profile-card" aria-labelledby="profile-name">
          <div className="portal-profile-avatar" aria-hidden="true">{context.user.fullName.slice(0, 1).toUpperCase()}</div>
          <div><span>Usuário do Portal</span><h2 id="profile-name">{context.user.fullName}</h2><p>{session?.user.email ?? 'E-mail autenticado'}</p></div>
          <PortalStatusPill />
        </section>
        <section className="portal-profile-details" aria-label="Detalhes do vínculo">
          <article><span>Academia</span><strong>{context.academy.name}</strong></article>
          <article><span>Unidade atual</span><strong>{selectedUnit?.name ?? 'Seleção necessária'}</strong></article>
          <article><span>Unidades permitidas</span><strong>{context.unitCount}</strong><small>{context.units.map((unit) => unit.name).join(' · ')}</small></article>
          <article><span>Ambiente responsável</span><strong>{context.organization.name}</strong></article>
        </section>
        <section className="portal-profile-actions">
          <div><span className="eyebrow">Segurança</span><h2>Encerrar esta sessão</h2><p>Ao sair, a preferência de unidade deste usuário será removida deste navegador.</p></div>
          <LogoutButton />
        </section>
      </div>
    </div>
  )
}

const blockedCopy = {
  pending: {
    className: 'pending', marker: 'PENDENTE', eyebrow: 'Cadastro recebido', title: 'Aguardando liberação',
    description: 'Seu cadastro foi recebido e está aguardando vinculação ou liberação pela equipe Zion. Nenhuma ação adicional é necessária agora.',
    status: 'Acesso ainda não liberado', detail: 'Nenhum dado da academia está disponível enquanto a validação estiver pendente.',
  },
  suspended: {
    className: 'suspended', marker: 'SUSPENSO', eyebrow: 'Acesso temporariamente suspenso', title: 'Portal suspenso',
    description: 'Seu acesso ao Portal está temporariamente suspenso. Entre em contato com a equipe Zion para revisar a situação da conta.',
    status: 'Conteúdo protegido', detail: 'O motivo interno não é exibido e nenhuma informação da academia foi carregada.',
  },
  commercial: {
    className: 'commercial', marker: 'REGULARIZAÇÃO', eyebrow: 'Acesso da academia', title: 'Acesso indisponível',
    description: 'O acesso da academia precisa ser regularizado com a equipe Zion antes de continuar.',
    status: 'Dados preservados', detail: 'Nenhum detalhe financeiro ou informação das unidades é exibido nesta página.',
  },
  incomplete: {
    className: 'incomplete', marker: 'VÍNCULO', eyebrow: 'Configuração incompleta', title: 'Unidade não disponível',
    description: 'Sua conta ainda não possui uma unidade válida para acessar o Portal. Solicite à equipe Zion a revisão do vínculo.',
    status: 'Acesso negado por padrão', detail: 'Nenhuma unidade é escolhida automaticamente sem uma autorização válida.',
  },
  invalid: {
    className: 'invalid', marker: 'BLOQUEADO', eyebrow: 'Classificação de conta', title: 'Conta sem acesso',
    description: 'Esta conta não possui um ambiente válido. Nenhuma informação interna ou da academia foi liberada.',
    status: 'Acesso negado por padrão', detail: 'Saia da conta e entre em contato com a equipe Zion se precisar de ajuda.',
  },
} as const

type BlockedVariant = keyof typeof blockedCopy

export function PortalBlockedPage({ variant }: { variant: BlockedVariant }) {
  const copy = blockedCopy[variant]
  return (
    <main className={`portal-blocked portal-blocked--${copy.className}`}>
      <section>
        <img src={horizontalLogo} alt="ZION ProService" />
        <span className="portal-blocked__marker">{copy.marker}</span>
        <span className="eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        <div className="portal-blocked__status"><span aria-hidden="true" /><div><strong>{copy.status}</strong><small>{copy.detail}</small></div></div>
        <LogoutButton />
      </section>
    </main>
  )
}

export function PortalUnavailablePage() {
  const { accessContext } = useAuth()
  if (accessContext?.blockingReason === 'commercial_access_blocked') return <PortalBlockedPage variant="commercial" />
  if (accessContext?.blockingReason === 'no_active_location') return <PortalBlockedPage variant="incomplete" />
  return <Navigate to={getDefaultAccessPath(accessContext)} replace />
}
