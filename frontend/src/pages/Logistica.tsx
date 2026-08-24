import { useState, useEffect } from 'react'
import DemoModal from '../components/DemoModal'
import GanttTimeline from '../components/GanttTimeline'

export default function Logistica() {
  // Mock data for demonstration
  const [fleet, setFleet] = useState([
    { id: 'FROTA-01', driver: 'Carlos Silva', status: 'em_rota', progress: 65, dest: 'Hospital São Lucas', kmPercorrido: 42, eta: '14:30' },
    { id: 'FROTA-02', driver: 'João Marcos', status: 'em_rota', progress: 85, dest: 'Rede D\'Or São Luiz', kmPercorrido: 115, eta: '14:45' },
    { id: 'FROTA-03', driver: 'André Lima', status: 'carregando', progress: 0, dest: 'Indústria Química Apex', kmPercorrido: 0, eta: '16:00' },
    { id: 'FROTA-04', driver: 'Roberto Dias', status: 'atrasado', progress: 40, dest: 'Hotel Ibis Paulista', kmPercorrido: 18, eta: '15:20 (Atrasado)' },
    { id: 'FROTA-05', driver: 'Marcos Paulo', status: 'manutencao', progress: 0, dest: '—', kmPercorrido: 0, eta: '—' },
  ])
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list')
  const [statusFiltro, setStatusFiltro] = useState<string>('todos')

  // Simulando movimento
  useEffect(() => {
    const interval = setInterval(() => {
      setFleet(prev => prev.map(f => {
        if (f.status === 'em_rota' || f.status === 'atrasado') {
          return {
            ...f,
            progress: Math.min(100, f.progress + (Math.random() * 2)),
            kmPercorrido: +(f.kmPercorrido + Math.random() * 0.5).toFixed(1)
          }
        }
        return f
      }))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6" style={{ animation: 'var(--animate-in)' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Controle Logístico</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Supervisão da frota e entregas (Ambiente de Demonstração)</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <select
            className="text-xs px-3 py-1.5 rounded-lg outline-none"
            style={{ background: 'var(--color-surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--color-text-primary)' }}
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
          >
            <option value="todos">Todos os Status</option>
            <option value="em_rota">🟢 Em Rota</option>
            <option value="carregando">🔵 Carregando</option>
            <option value="atrasado">🔴 Atrasado</option>
            <option value="manutencao">⚙️ Manutenção</option>
          </select>
          <div className="flex rounded-lg p-1" style={{ background: 'var(--color-surface-2)' }}>
            <button 
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--color-elis-teal)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >
              📋 Lista
            </button>
            <button 
              onClick={() => setViewMode('gantt')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'gantt' ? 'bg-[var(--color-elis-teal)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >
              📊 Gantt
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(0,155,152,0.15)', color: 'var(--color-elis-teal)' }}>
            <span className="realtime-dot" /> Rastreamento Ativo
          </div>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <LogisticaKPICard title="Entregas no Prazo" value="84%" icon="🚚" accent="var(--color-status-ok)" onClick={() => setActiveModal('Detalhamento — Entregas no Prazo')} />
        <LogisticaKPICard title="Em Atraso" value="3" icon="⚠️" accent="var(--color-status-danger)" onClick={() => setActiveModal('Detalhamento — Em Atraso')} />
        <LogisticaKPICard title="Km Rodados (Hoje)" value={`${Math.floor(fleet.reduce((acc, f) => acc + f.kmPercorrido, 0))} km`} icon="🛣️" onClick={() => setActiveModal('Detalhamento — Km Rodados')} />
        <LogisticaKPICard title="Veículos Ativos" value={fleet.filter(f => f.status === 'em_rota' || f.status === 'atrasado').length} icon="📍" onClick={() => setActiveModal('Detalhamento — Veículos Ativos')} />
      </div>

      {/* Split layout: Fleet Status & Deliveries Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Fleet Tracking or Gantt */}
        <div className="lg:col-span-2 flex flex-col">
          {viewMode === 'list' ? (
            <div className="card-glass p-6 rounded-xl flex-1">
              <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text-primary)' }}>Status da Frota (Tempo Real)</h3>
              
              <div className="space-y-4">
                {fleet
                  .filter(f => statusFiltro === 'todos' || f.status === statusFiltro)
                  .map(truck => (
                  <TruckRow key={truck.id} truck={truck} />
                ))}
              </div>
            </div>
          ) : (
            <GanttTimeline />
          )}
        </div>

        {/* Analytics side panel */}
        <div className="card-glass p-6 rounded-xl flex flex-col gap-6">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>Análise de Rota</h3>
          
          <div className="p-4 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Tempo Médio por Entrega</p>
            <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>1h 42m</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-status-ok)' }}>↓ 12% vs. mês passado</p>
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>Ocorrências Hoje</p>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span>Trânsito intenso</span>
                <span className="font-bold">4</span>
              </li>
              <li className="flex justify-between">
                <span>Cliente ausente</span>
                <span className="font-bold">1</span>
              </li>
              <li className="flex justify-between">
                <span>Avaria veículo</span>
                <span className="font-bold">1</span>
              </li>
            </ul>
          </div>
          
          <div className="mt-auto p-4 rounded-lg border border-dashed border-white/20 text-center" style={{ background: 'rgba(0,155,152,0.05)' }}>
            <span className="text-2xl mb-2 block">🗺️</span>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Integração de Mapa Inteligente em Desenvolvimento</p>
          </div>

        </div>
      </div>
      
      {activeModal && (
        <DemoModal title={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </div>
  )
}

function LogisticaKPICard({ title, value, icon, accent, onClick }: { title: string, value: string | number, icon: string, accent?: string, onClick?: () => void }) {
  return (
    <div 
      className="card-glass p-5 rounded-xl flex items-center justify-between kpi-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div>
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>{title}</p>
        <p className="text-2xl font-bold font-mono" style={{ color: accent || 'var(--color-text-primary)' }}>{value}</p>
        {onClick && <span className="text-[10px] mt-2 block" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>Clique para detalhes</span>}
      </div>
      <div className="text-3xl opacity-80" style={{ filter: accent ? `drop-shadow(0 0 10px ${accent}40)` : '' }}>{icon}</div>
    </div>
  )
}

function TruckRow({ truck }: { truck: any }) {
  let statusColor = 'var(--color-text-muted)'
  let statusLabel = 'Indefinido'
  let isMoving = false

  switch (truck.status) {
    case 'em_rota':
      statusColor = 'var(--color-elis-teal)'
      statusLabel = 'Em Rota'
      isMoving = true
      break
    case 'atrasado':
      statusColor = 'var(--color-status-danger)'
      statusLabel = 'Atrasado'
      isMoving = true
      break
    case 'carregando':
      statusColor = 'var(--color-status-warning)'
      statusLabel = 'Carregando'
      break
    case 'manutencao':
      statusColor = 'var(--color-text-muted)'
      statusLabel = 'Manutenção'
      break
  }

  return (
    <div className="p-4 rounded-lg transition-all" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: `${statusColor}22` }}>
            🚛
          </div>
          <div>
            <h4 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{truck.id}</h4>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{truck.driver}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide mb-1 inline-block" style={{ background: `${statusColor}22`, color: statusColor }}>
            {statusLabel}
          </div>
          <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>ETA: {truck.eta}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs mt-2">
        <div className="flex-1">
          <div className="flex justify-between mb-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>Origem (CNN)</span>
            <span>{truck.dest}</span>
          </div>
          <div className="progress-track" style={{ height: '6px' }}>
            <div 
              className="progress-fill" 
              style={{ 
                width: `${truck.progress}%`, 
                background: statusColor,
                transition: 'width 2s ease-out'
              }} 
            />
            {isMoving && (
              <div 
                className="absolute top-0 bottom-0 text-[10px] drop-shadow-md" 
                style={{ 
                  left: `calc(${truck.progress}% - 8px)`, 
                  transition: 'left 2s ease-out',
                  zIndex: 10 
                }}
              >
                🚚
              </div>
            )}
          </div>
        </div>
        
        <div className="w-20 text-right font-mono font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {truck.kmPercorrido > 0 ? `${truck.kmPercorrido.toFixed(1)} km` : '---'}
        </div>
      </div>
    </div>
  )
}
