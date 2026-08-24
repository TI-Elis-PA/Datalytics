import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import NPSWidget from '../nps/NPSWidget'
import { useAuth, canAccess } from '../../contexts/AuthContext'

const navItems = [
  { path: '/',          label: 'Início',      icon: '🏠' },
  { path: '/dashboard', label: 'Dashboard',   icon: '📊' },
  { path: '/expedicao', label: 'Expedição',   icon: '🚚' },
  { path: '/producao',  label: 'Produção',    icon: '🏭' },
  { path: '/historico', label: 'Histórico',   icon: '📈' },
  { path: '/estoque',         label: 'Estoque',                icon: '📦' },
  { path: '/rastreabilidade', label: 'Rastreabilidade RFID',  icon: '📡' },
  { path: '/logistica',       label: 'Logística (Demo)',       icon: '🚛' },
  { path: '/iot',             label: 'Eficiência (Máquinas)',  icon: '⚙️' },
  { path: '/nps',             label: 'NPS',                    icon: '⭐' },
  { path: '/usuarios',        label: 'Usuários',               icon: '🔐' },
  { path: '/tv',        label: 'Modo TV',     icon: '📺' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  
  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(item => 
    user ? canAccess(user.perfil, item.path) : false
  )
  
  // Theme Toggle Logic
  const [isLight, setIsLight] = useState(() => localStorage.getItem('theme') === 'light')

  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.remove('light')
      localStorage.setItem('theme', 'dark')
    }
  }, [isLight])

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`sidebar fixed top-0 left-0 h-screen z-40 flex flex-col transition-all duration-300 border-r border-white/5 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
        style={{ background: 'var(--color-surface-1)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-10 h-10 flex items-center justify-center">
            <img src="/elis-logo.png" alt="Elis Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Datalytics Elis</h1>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Premium Edition</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-2 mt-2 overflow-y-auto">
          {visibleNavItems.map(item => {
            // TV Mode is outside the Layout — use a full page navigation to avoid React hook mismatch
            if (item.path === '/tv') {
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className="sidebar-link"
                >
                  <span className="text-lg drop-shadow-md">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </a>
              )
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <span className="text-lg drop-shadow-md">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* User Info + Logout */}
        {user && (
          <div className="p-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            {!collapsed ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: user.perfil === 'gestor' ? '#009B98' : user.perfil === 'expedidor' ? '#3B82F6' : '#6B7280' }}>
                  {user.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{user.nome}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: user.perfil === 'gestor' ? '#009B98' : '#6B7280' }}>{user.perfil}</p>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                  style={{ color: 'var(--color-status-danger)' }}
                  title="Sair do sistema"
                >
                  ⮌
                </button>
              </div>
            ) : (
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="w-full flex items-center justify-center py-2 rounded hover:bg-red-500/10 transition-colors"
                style={{ color: 'var(--color-status-danger)' }}
                title="Sair"
              >
                ⮌
              </button>
            )}
          </div>
        )}

        {/* Realtime indicator */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            <span className="realtime-dot" />
            {!collapsed && <span>Tempo Real Ativo</span>}
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-3 border-t text-xs font-medium transition-colors"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--color-text-muted)' }}
        >
          {collapsed ? '→' : '← Recolher'}
        </button>
      </aside>

      {/* Main content */}
      <main
        className="main-content flex-1 transition-all duration-300"
        style={{ marginLeft: collapsed ? '4rem' : '15rem' }}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between border-b"
          style={{ 
            background: 'var(--glass-bg-start)', 
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderColor: 'var(--glass-border)'
          }}
        >
          <div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              {navItems.find(n => n.path === location.pathname)?.label || 'Dashboard'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button 
              onClick={() => setIsLight(!isLight)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-subtle)' }}
              title={isLight ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
            >
              <span className="text-lg">{isLight ? '🌙' : '☀️'}</span>
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-ai'))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs text-white shadow-lg transition-transform hover:scale-105"
              style={{ background: 'var(--color-elis-teal-dark)', boxShadow: '0 4px 14px rgba(0, 155, 152, 0.4)' }}
            >
              ✨ IA
            </button>
            <NPSWidget />
            <div className="text-sm font-mono font-medium px-4 py-2 rounded-lg" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--border-subtle)' }}>
              <Clock />
            </div>
          </div>
        </header>

        {/* Page content with Transition Wrapper */}
        <div className="p-8 page-transition-enter" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return <span>{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
}
