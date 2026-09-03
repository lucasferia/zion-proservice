import { NavLink, Outlet } from 'react-router-dom'
import horizontalLogo from '../../Imagens/Logo Horizontal.png'
import markLogo from '../../Imagens/Logo.png'
import { useAuth } from '../features/auth/auth-context'

function HomeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="m4 10.5 8-6.5 8 6.5V20H4v-9.5Z" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  )
}

function ExitIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M14 8V5H5v14h9v-3" />
      <path d="M10 12h10m-3.5-3.5L20 12l-3.5 3.5" />
    </svg>
  )
}

function ClientsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.8 19v-2.2c0-2.4 2.1-4.3 4.6-4.3h1.2c2.5 0 4.6 1.9 4.6 4.3V19" />
      <path d="M15.5 5.5a3 3 0 0 1 0 5.3M16.5 13c2.2.4 3.7 2 3.7 4V19" />
    </svg>
  )
}

function EquipmentIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M5 7.5h14v9H5z" />
      <path d="M8 4v3.5M16 4v3.5M8 16.5V20m8-3.5V20" />
      <path d="M9 12h6" />
    </svg>
  )
}

function InventoryIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5Z" />
      <path d="M4 7.5V17l8 3 8-3V7.5M12 11v9" />
      <path d="m8 6 8 3.5" />
    </svg>
  )
}

function SupplierIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M4 8h11v9H4zM15 11h3l2 3v3h-5z" />
      <circle cx="8" cy="18" r="2" /><circle cx="17" cy="18" r="2" />
    </svg>
  )
}

function MaintenanceIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M14.5 5.2a4.5 4.5 0 0 0-5.7 5.7L4 15.7 8.3 20l4.8-4.8a4.5 4.5 0 0 0 5.7-5.7l-3 3-3.3-3.3 3-3Z" />
      <path d="m6.5 16.5 1 1" />
    </svg>
  )
}

function FinancialIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M4 7.5h16v10H4z" />
      <path d="M7 5v2.5M17 5v2.5M8 12.5h8M12 10v5" />
    </svg>
  )
}

function AgendaIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M5 6.5h14V20H5zM8 4v5M16 4v5M5 10h14" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  )
}

function navItemClass({ isActive }: { isActive: boolean }) {
  return `primary-nav__item${isActive ? ' primary-nav__item--active' : ''}`
}

export function AppShell() {
  const { session, signOut } = useAuth()
  const accountLabel = typeof session?.user.user_metadata.full_name === 'string'
    ? session.user.user_metadata.full_name
    : session?.user.email

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>

      <aside className="side-rail" aria-label="Navegação principal">
        <div className="side-rail__brand">
          <img src={horizontalLogo} alt="ZION ProService" />
        </div>

        <nav className="primary-nav">
          <NavLink className={navItemClass} to="/app" end>
            <HomeIcon />
            <span>Início</span>
          </NavLink>
          <NavLink className={navItemClass} to="/app/clientes">
            <ClientsIcon />
            <span>Clientes</span>
          </NavLink>
          <NavLink className={navItemClass} to="/app/equipamentos">
            <EquipmentIcon />
            <span>Equipamentos</span>
          </NavLink>
          <NavLink className={navItemClass} to="/app/manutencoes">
            <MaintenanceIcon />
            <span>Manutenções</span>
          </NavLink>
          <NavLink className={navItemClass} to="/app/estoque">
            <InventoryIcon />
            <span>Estoque</span>
          </NavLink>
          <NavLink className={navItemClass} to="/app/fornecedores">
            <SupplierIcon />
            <span>Fornecedores</span>
          </NavLink>
          <NavLink className={navItemClass} to="/app/financeiro">
            <FinancialIcon />
            <span>Financeiro</span>
          </NavLink>
          <NavLink className={navItemClass} to="/app/agenda">
            <AgendaIcon />
            <span>Agenda</span>
          </NavLink>
        </nav>

        <div className="side-rail__account">
          <span className="eyebrow">Sessão ativa</span>
          <span className="account-email" title={accountLabel}>
            {accountLabel}
          </span>
          <button className="text-button" type="button" onClick={() => void signOut()}>
            <ExitIcon />
            Sair com segurança
          </button>
        </div>
      </aside>

      <header className="mobile-header">
        <img className="mobile-header__logo" src={markLogo} alt="" />
        <span>ZION <strong>ProService</strong></span>
        <button className="icon-button" type="button" onClick={() => void signOut()} aria-label="Sair">
          <ExitIcon />
        </button>
      </header>

      <nav className="mobile-nav" aria-label="Navegação principal">
        <NavLink className={navItemClass} to="/app" end>
          <HomeIcon />
          <span>Início</span>
        </NavLink>
        <NavLink className={navItemClass} to="/app/clientes">
          <ClientsIcon />
          <span>Clientes</span>
        </NavLink>
        <NavLink className={navItemClass} to="/app/equipamentos">
          <EquipmentIcon />
          <span>Equipamentos</span>
        </NavLink>
        <NavLink className={navItemClass} to="/app/manutencoes">
          <MaintenanceIcon />
          <span>OS</span>
        </NavLink>
        <NavLink className={navItemClass} to="/app/estoque">
          <InventoryIcon />
          <span>Estoque</span>
        </NavLink>
        <NavLink className={navItemClass} to="/app/financeiro">
          <FinancialIcon />
          <span>Financeiro</span>
        </NavLink>
        <NavLink className={navItemClass} to="/app/agenda">
          <AgendaIcon />
          <span>Agenda</span>
        </NavLink>
      </nav>

      <main id="main-content" className="app-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
