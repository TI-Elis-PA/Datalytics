import { useState } from 'react'
import { useProducao, useExpedicao } from '../hooks/useData'
import DatePicker from '../components/DatePicker'
import FilterBar, { FilterConfig } from '../components/FilterBar'
import KPIDetailModal from '../components/KPIDetailModal'
import type { ModalVariant } from '../components/KPIDetailModal'

export default function Producao() {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const { resumo, porCliente, loading } = useProducao(selectedDate)
  const { expedicoes, stats } = useExpedicao(selectedDate)
  const [activeModal, setActiveModal] = useState<ModalVariant | null>(null)
  const [metaFilter, setMetaFilter] = useState('todos')

  const filterConfigs: FilterConfig[] = [
    {
      key: 'meta',
      label: 'Eficiência',
      value: metaFilter,
      onChange: setMetaFilter,
      options: [
        { value: 'todos', label: 'Todas' },
        { value: 'ok', label: 'Atingiu a Meta (≥ 94%)' },
        { value: 'abaixo', label: 'Abaixo da Meta (< 94%)' }
      ]
    }
  ]

  const filteredClientes = [...porCliente].filter(c => {
    if (metaFilter === 'ok') return c.eficiencia >= 94
    if (metaFilter === 'abaixo') return c.eficiencia < 94
    return true
  })

  const efColor = resumo.eficiencia >= 94 ? 'var(--color-verde-sustentavel)' : 'var(--color-status-danger)'
  const efBg = resumo.eficiencia >= 94 ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)'

  return (
    <div className="space-y-6" style={{ animation: 'var(--animate-in)' }} id="producao-view">
      {/* Date Picker and Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Produção</h2>
        <DatePicker 
          value={selectedDate}
          onChange={setSelectedDate}
          placeholder="Hoje"
        />
      </div>
      
      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProdCard
          icon="📥"
          label="Peso Recebido"
          value={`${resumo.entrada_total.toLocaleString('pt-BR')} kg`}
          sub={`${(resumo.entrada_total / 1000).toFixed(1)} toneladas`}
          color="var(--color-status-info)"
          onClick={() => setActiveModal('total')}
        />
        <ProdCard
          icon="📤"
          label="Peso Expedido"
          value={`${resumo.saida_total.toLocaleString('pt-BR')} kg`}
          sub={`${(resumo.saida_total / 1000).toFixed(1)} toneladas`}
          color="var(--color-elis-teal)"
          onClick={() => setActiveModal('expedidos')}
        />
        <ProdCard
          icon="⚡"
          label="Eficiência da Planta"
          value={`${resumo.eficiencia.toFixed(1)}%`}
          sub={resumo.eficiencia >= 94 ? '🟢 Meta atingida!' : '🔴 Abaixo da meta (94%)'}
          color={efColor}
          highlight
          onClick={() => setActiveModal('eficiencia')}
        />
      </div>

      {/* Giant Progress Bar */}
      <div className="card-glass p-6" style={{ background: efBg }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Progresso da Planta
          </h3>
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: 'var(--color-surface-3)', color: efColor }}>
            Meta: 94%
          </span>
        </div>

        {/* Big progress bar */}
        <div className="progress-track relative" style={{ height: '40px' }}>
          <div
            className={`progress-fill ${resumo.eficiencia >= 94 ? 'meta-ok' : ''}`}
            style={{
              width: `${Math.min(100, resumo.eficiencia)}%`,
              fontSize: '1rem',
              height: '100%',
              borderRadius: '20px',
            }}
          >
            {resumo.eficiencia.toFixed(1)}%
          </div>
          
          {/* Ghost Target (Meta) */}
          <div 
            className="absolute top-0 bottom-0 flex flex-col justify-center transition-all" 
            style={{ left: '94%', zIndex: 10 }}
            title="Meta: 94%"
          >
            <div className="h-[120%] w-[3px] absolute -top-[10%] bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] rounded-full" />
          </div>
        </div>

        {/* Scale */}
        <div className="flex justify-between mt-2 text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span style={{ color: 'var(--color-status-danger)' }}>94%</span>
          <span>100%</span>
        </div>

        {/* ASCII-style visual for impact */}
        <div className="mt-4 p-3 rounded-lg font-mono text-sm" style={{ background: 'var(--color-surface-2)' }}>
          <span style={{ color: efColor }}>
            {'█'.repeat(Math.round(resumo.eficiencia / 5))}
          </span>
          <span style={{ color: 'var(--color-surface-4)' }}>
            {'░'.repeat(Math.max(0, 20 - Math.round(resumo.eficiencia / 5)))}
          </span>
          <span className="ml-2 font-bold" style={{ color: efColor }}>
            {resumo.eficiencia.toFixed(1)}%
          </span>
        </div>

        {/* Pending */}
        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>📦 Pendente: <strong style={{ color: 'var(--color-status-warning)' }}>{resumo.pendente.toLocaleString('pt-BR')} kg</strong></span>
        </div>
      </div>

      {/* Per-client table */}
      <div className="card-glass overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-white/5 gap-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            📊 Eficiência por Cliente
          </h3>
          <FilterBar filters={filterConfigs} />
        </div>
        <div className="overflow-auto" style={{ maxHeight: '50vh' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Cliente</th>
                <th>Prev. (kg)</th>
                <th>Exp. (kg)</th>
                <th>Eficiência</th>
                <th>Progresso</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Carregando...</td></tr>
              ) : filteredClientes.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Nenhum dado encontrado para o filtro.</td></tr>
              ) : (
                filteredClientes.map((c, i) => {
                  const ef = parseFloat(String(c.eficiencia))
                  const efClr = ef >= 94 ? 'var(--color-verde-sustentavel)' : ef > 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)'
                  return (
                    <tr key={i}>
                      <td>
                        <span className={`status-dot ${c.status === 'concluido' ? 'done' : c.status === 'atrasado' ? 'danger' : c.status === 'proximo' ? 'warning' : 'ok'}`} />
                      </td>
                      <td className="font-medium">{c.cliente}</td>
                      <td className="font-mono">{c.peso_previsto.toLocaleString('pt-BR')}</td>
                      <td className="font-mono">{c.peso_expedido.toLocaleString('pt-BR')}</td>
                      <td>
                        <span className="font-mono font-bold" style={{ color: efClr }}>{ef.toFixed(1)}%</span>
                      </td>
                      <td style={{ minWidth: '120px' }}>
                        <div className="progress-track" style={{ height: '16px' }}>
                          <div
                            className={`progress-fill ${ef >= 94 ? 'meta-ok' : ''}`}
                            style={{ width: `${Math.min(100, ef)}%`, fontSize: '9px', height: '100%', borderRadius: '8px' }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeModal && (
        <KPIDetailModal
          variant={activeModal}
          onClose={() => setActiveModal(null)}
          expedicoes={expedicoes}
          stats={stats}
          resumo={resumo}
          porCliente={porCliente}
        />
      )}
    </div>
  )
}

function ProdCard({ icon, label, value, sub, color, highlight, onClick }: {
  icon: string; label: string; value: string; sub: string; color: string; highlight?: boolean; onClick?: () => void
}) {
  return (
    <div
      className="kpi-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      style={{
        background: highlight ? `linear-gradient(135deg, var(--color-surface-2), ${color}10)` : undefined,
        borderColor: highlight ? `${color}30` : undefined,
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
      <p className="font-mono text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
      {onClick && <span className="text-[10px] mt-2 block" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>Clique para detalhes</span>}
    </div>
  )
}
