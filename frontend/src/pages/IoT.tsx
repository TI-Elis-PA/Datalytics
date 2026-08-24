import { useState, useEffect } from 'react'
import DemoModal from '../components/DemoModal'

export default function EficienciaOperacional() {
  const [machines, setMachines] = useState([
    { id: 'M-01', name: 'Calandra 1', state: 'running', oee: 92, a: 98, p: 95, q: 99, temp: 45, vibration: 1.2, power: 15.4, debitoImpact: 0 },
    { id: 'M-02', name: 'Calandra 2', state: 'running', oee: 88, a: 95, p: 94, q: 98, temp: 48, vibration: 1.5, power: 16.2, debitoImpact: 1.5 },
    { id: 'M-03', name: 'Lavadora Contínua', state: 'maintenance', oee: 0, a: 0, p: 0, q: 0, temp: 22, vibration: 0.1, power: 0.5, debitoImpact: 0 },
    { id: 'M-04', name: 'Secadora A', state: 'running', oee: 95, a: 99, p: 98, q: 98, temp: 85, vibration: 2.1, power: 22.0, debitoImpact: 2.0 },
    { id: 'M-05', name: 'Secadora B', state: 'idle', oee: 0, a: 100, p: 0, q: 0, temp: 30, vibration: 0.2, power: 1.2, debitoImpact: 0 },
  ])
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [statusFiltro, setStatusFiltro] = useState<string>('todas')

  // Simulando atualização em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setMachines(prev => prev.map(m => {
        if (m.state !== 'running') return m
        return {
          ...m,
          temp: m.temp + (Math.random() * 2 - 1),
          vibration: Math.max(0.1, m.vibration + (Math.random() * 0.4 - 0.2)),
          power: Math.max(10, m.power + (Math.random() * 2 - 1)),
          p: Math.min(100, Math.max(70, m.p + (Math.random() * 2 - 1))),
          get oee() { return (this.a * this.p * this.q) / 10000 }
        }
      }
      ))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6" style={{ animation: 'var(--animate-in)' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Eficiência Operacional (Máquinas)</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Análise OEE e impacto da carga diária no maquinário</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="text-xs px-3 py-1.5 rounded-lg outline-none"
            style={{ background: 'var(--color-surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--color-text-primary)' }}
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
          >
            <option value="todas">Todas as Máquinas</option>
            <option value="running">🟢 Em Operação</option>
            <option value="idle">🟡 Ociosas</option>
            <option value="maintenance">🔴 Em Manutenção</option>
          </select>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(0,155,152,0.15)', color: 'var(--color-elis-teal)' }}>
            <span className="realtime-dot" /> Sensores Ativos
          </div>
        </div>
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <IoTKPICard title="Máquinas Ativas" value={machines.filter(m => m.state === 'running').length} icon="🏭" onClick={() => setActiveModal('Detalhamento — Máquinas Ativas')} />
        <IoTKPICard title="OEE Global" value={`${(machines.filter(m => m.state === 'running').reduce((acc, m) => acc + m.oee, 0) / machines.filter(m => m.state === 'running').length || 0).toFixed(1)}%`} icon="📈" onClick={() => setActiveModal('Detalhamento — OEE Médio')} />
        <IoTKPICard title="Consumo (kWh)" value={`${machines.reduce((acc, m) => acc + m.power, 0).toFixed(1)}`} icon="⚡" onClick={() => setActiveModal('Detalhamento — Consumo Atual')} />
        <IoTKPICard title="Sobrecarga D-1" value={`${machines.reduce((acc, m) => acc + (m.debitoImpact || 0), 0).toFixed(1)}h`} icon="⚠️" accent="var(--color-status-danger)" onClick={() => setActiveModal('Detalhamento — Sobrecarga')} />
      </div>

      {/* Machines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {machines
          .filter(m => statusFiltro === 'todas' || m.state === statusFiltro)
          .map(m => (
          <MachineCard key={m.id} machine={m} />
        ))}
      </div>

      {activeModal && (
        <DemoModal title={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </div>
  )
}

function IoTKPICard({ title, value, icon, accent, onClick }: { title: string, value: string | number, icon: string, accent?: string, onClick?: () => void }) {
  return (
    <div 
      className="card-glass p-4 rounded-xl flex items-center justify-between kpi-card" 
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
      <div className="text-3xl opacity-80">{icon}</div>
    </div>
  )
}

function MachineCard({ machine }: { machine: any }) {
  const isRunning = machine.state === 'running'
  const isMaintenance = machine.state === 'maintenance'
  
  const statusColor = isRunning ? 'var(--color-status-ok)' : isMaintenance ? 'var(--color-status-danger)' : 'var(--color-status-warning)'
  const statusText = isRunning ? 'Em Operação' : isMaintenance ? 'Manutenção' : 'Ociosa'

  return (
    <div className="card-glass p-5 rounded-xl flex flex-col justify-between" style={{ borderTop: `4px solid ${statusColor}` }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{machine.name}</h3>
          <p className="text-xs font-mono mt-1" style={{ color: 'var(--color-text-muted)' }}>ID: {machine.id}</p>
        </div>
        <div className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider" style={{ background: `${statusColor}22`, color: statusColor }}>
          {statusText}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
        <SensorValue label="OEE (Efic. Global)" value={`${machine.oee.toFixed(1)}%`} icon="⚙️" disabled={!isRunning} />
        <SensorValue label="Potência" value={`${machine.power.toFixed(1)} kW`} icon="⚡" disabled={!isRunning} />
        <SensorValue label="Temperatura" value={`${machine.temp.toFixed(1)} °C`} icon="🌡️" disabled={isMaintenance} />
        <SensorValue label="Vibração" value={`${machine.vibration.toFixed(2)} mm/s`} icon="〰️" disabled={!isRunning} />
      </div>

      {/* OEE Breakdown */}
      <div className="space-y-2 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Composição OEE</p>
        <div className="flex justify-between text-xs">
          <span>Disponibilidade</span>
          <span className="font-mono">{machine.a.toFixed(1)}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}><div className="h-full bg-blue-500 transition-all duration-700 ease-out" style={{ width: `${machine.a}%` }} /></div>
        
        <div className="flex justify-between text-xs pt-1">
          <span>Performance</span>
          <span className="font-mono">{machine.p.toFixed(1)}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}><div className="h-full bg-yellow-500 transition-all duration-700 ease-out" style={{ width: `${machine.p}%` }} /></div>
        
        <div className="flex justify-between text-xs pt-1">
          <span>Qualidade</span>
          <span className="font-mono">{machine.q.toFixed(1)}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}><div className="h-full bg-green-500 transition-all duration-700 ease-out" style={{ width: `${machine.q}%` }} /></div>
      </div>

      {/* Impacto D-1 & Alerta de Gargalo */}
      <div className="mt-4 space-y-3">
        {machine.debitoImpact > 0 && (
          <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-red-400 font-bold flex items-center gap-1"><span>⚠️</span> Sobrecarga D-1</p>
            <p style={{ color: 'var(--color-text-secondary)' }} className="mt-1">+{machine.debitoImpact.toFixed(1)}h extras necessárias hoje para reprocessar débito do dia anterior.</p>
          </div>
        )}
        
        {(machine.oee <= 50 || isMaintenance) && (
          <button
            onClick={async () => {
              try {
                // Gauge chart de OEE usando QuickChart
                const chartConfig = JSON.stringify({
                  type: 'radialGauge',
                  data: {
                    datasets: [{ data: [Math.round(machine.oee)], backgroundColor: isMaintenance ? 'red' : 'orange' }]
                  }
                });
                const chartUrl = `https://quickchart.io/chart?w=400&h=300&c=${encodeURIComponent(chartConfig)}`;
                
                const text = `🔧 *ALERTA DE MANUTENÇÃO (IoT)* 🔧\n\nA máquina *${machine.name}* (${machine.id}) reportou queda crítica de performance.\n\n📉 *OEE Atual:* ${machine.oee.toFixed(1)}%\n⚠️ *Status:* ${statusText}\n\nManutenção acionada automaticamente para evitar gargalo na expedição.\n_Datalytics Elis - Motor de Regras Automático_`;
                
                const response = await fetch('http://localhost:3005/api/notify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  // Disparo com anexo visual
                  body: JSON.stringify({ number: '91981646532', message: text, mediaUrl: chartUrl }) 
                });
                
                if (response.ok) alert('✅ Alerta de Manutenção enviado (com gráfico)!');
                else alert('❌ Falha ao enviar o alerta.');
              } catch (e) {
                alert('❌ Backend offline.');
              }
            }}
            className="w-full flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-transform hover:scale-[1.02] shadow-lg"
            style={{ background: isMaintenance ? '#ef4444' : '#f59e0b', color: 'white' }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Alertar Gargalo de Máquina
          </button>
        )}
      </div>
    </div>
  )
}

function SensorValue({ label, value, icon, disabled }: { label: string, value: string, icon: string, disabled: boolean }) {
  return (
    <div className={`p-3 rounded-lg ${disabled ? 'opacity-40' : ''}`} style={{ background: 'var(--color-surface-3)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
      <div className="font-mono font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
        {disabled ? '—' : value}
      </div>
    </div>
  )
}
