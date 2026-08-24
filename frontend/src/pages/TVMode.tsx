import { useExpedicao, useProducao } from '../hooks/useData'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from '../components/DatePicker'
import ClientModal from '../components/ClientModal'
import elisLogo from '../assets/elis-logo.png'

export default function TVMode() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<string>('')
  const { expedicoes, stats } = useExpedicao(selectedDate)
  const { resumo } = useProducao(selectedDate)
  const [activePanel, setActivePanel] = useState<'expedicao' | 'producao'>('expedicao')
  const [time, setTime] = useState(new Date())
  const [isLight, setIsLight] = useState(() => localStorage.getItem('theme') === 'light')
  const [selectedClientForModal, setSelectedClientForModal] = useState<string | null>(null)

  // Ensure theme is applied on mount
  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
    document.body.style.background = 'var(--color-surface-0)'
  }, [])

  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.remove('light')
      localStorage.setItem('theme', 'dark')
    }
  }, [isLight])

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const efColor = resumo.eficiencia >= 94 ? 'var(--color-verde-sustentavel)' : 'var(--color-status-danger)'

  return (
    <div className="min-h-screen flex flex-col w-full overflow-x-hidden" style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-primary)' }}>
      {/* Premium Responsive Header */}
      <div className="px-4 sm:px-8 py-3.5 sm:py-5 flex flex-col md:flex-row items-center justify-between gap-4 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)', background: 'var(--color-surface-1)' }}>
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shrink-0">
              <img src={elisLogo} alt="Elis Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(0,155,152,0.5)]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Datalytics Elis
              </h1>
              <p className="text-xs sm:text-sm md:text-base mt-0.5 tracking-wide uppercase font-semibold" style={{ color: 'var(--color-elis-teal)' }}>
                Live Operations Control
              </p>
            </div>
          </div>

          {/* Quick Exit on Mobile Header */}
          <div className="flex md:hidden items-center gap-2">
            <button 
              onClick={() => setIsLight(!isLight)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-transform shadow-sm"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-subtle)' }}
              title={isLight ? 'Modo Escuro' : 'Modo Claro'}
            >
              <span className="text-base">{isLight ? '🌙' : '☀️'}</span>
            </button>
            <button 
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-status-danger)' }}
            >
              ✖ Sair
            </button>
          </div>
        </div>

        {/* Date, Clock & Actions (Desktop / Tablet) */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-6 w-full md:w-auto">
          {/* Date Picker for TV Mode */}
          <DatePicker 
            value={selectedDate}
            onChange={setSelectedDate}
            placeholder="Hoje"
          />

          <div className="flex flex-col text-center md:text-right">
            <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {time.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <div className="flex items-center justify-center md:justify-end gap-2 mt-0.5">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--color-status-danger)', boxShadow: '0 0 10px rgba(239,68,68,0.8)' }} />
              <span className="font-mono text-xl sm:text-3xl md:text-4xl font-bold tracking-wider" style={{ color: 'var(--color-text-primary)' }}>
                {time.toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-3 border-l pl-4 sm:pl-6" style={{ borderColor: 'var(--border-subtle)' }}>
            <button 
              onClick={() => setIsLight(!isLight)}
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--color-text-primary)' }}
              title={isLight ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
            >
              <span className="text-lg lg:text-2xl">{isLight ? '🌙' : '☀️'}</span>
            </button>
            <button 
              onClick={() => navigate('/')}
              className="px-4 py-2.5 lg:px-5 lg:py-3 rounded-xl text-sm lg:text-base font-bold transition-all hover:scale-105"
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                color: 'var(--color-status-danger)' 
              }}
            >
              ✖ Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 sm:p-6 lg:p-8 flex flex-col overflow-y-auto">
        {/* Panel toggle buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6 justify-center w-full max-w-md sm:max-w-none mx-auto">
          <button
            onClick={() => setActivePanel('expedicao')}
            className={`px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs sm:text-base lg:text-lg font-bold uppercase tracking-wider sm:tracking-widest transition-all cursor-pointer ${
              activePanel === 'expedicao' ? 'scale-105' : 'opacity-60 hover:opacity-90'
            }`}
            style={{
              background: activePanel === 'expedicao' ? 'var(--color-elis-teal)' : 'var(--color-surface-3)',
              color: activePanel === 'expedicao' ? 'white' : 'var(--color-text-secondary)',
              boxShadow: activePanel === 'expedicao' ? '0 0 20px rgba(0,155,152,0.5)' : 'none',
              border: `1px solid ${activePanel === 'expedicao' ? 'var(--color-elis-teal)' : 'var(--border-subtle)'}`,
            }}
          >
            🚚 Logística / Expedição
          </button>
          <button
            onClick={() => setActivePanel('producao')}
            className={`px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs sm:text-base lg:text-lg font-bold uppercase tracking-wider sm:tracking-widest transition-all cursor-pointer ${
              activePanel === 'producao' ? 'scale-105' : 'opacity-60 hover:opacity-90'
            }`}
            style={{
              background: activePanel === 'producao' ? 'var(--color-elis-teal)' : 'var(--color-surface-3)',
              color: activePanel === 'producao' ? 'white' : 'var(--color-text-secondary)',
              boxShadow: activePanel === 'producao' ? '0 0 20px rgba(0,155,152,0.5)' : 'none',
              border: `1px solid ${activePanel === 'producao' ? 'var(--color-elis-teal)' : 'var(--border-subtle)'}`,
            }}
          >
            🏭 Eficiência / Produção
          </button>
        </div>

        {/* EXPEDIÇÃO Panel */}
        {activePanel === 'expedicao' && (
          <div className="flex-1 flex flex-col" style={{ animation: 'var(--animate-zoom-in)' }}>
            {/* Responsive KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
              <TVKpi label="TOTAL" value={stats.total} color="var(--color-text-primary)" />
              <TVKpi label="CONCLUÍDOS" value={stats.concluidos} color="var(--color-status-ok)" />
              <TVKpi label="NO PRAZO" value={stats.no_prazo} color="var(--color-elis-teal)" />
              <TVKpi label="PRÓXIMOS" value={stats.proximos} color="var(--color-status-warning)" />
              <TVKpi label="ATRASADOS" value={stats.atrasados} color="var(--color-status-danger)" />
            </div>

            {/* Departure Board with Responsive Overflow */}
            <div className="flex-1 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--border-subtle)' }}>
              <div className="overflow-x-auto w-full">
                <div className="min-w-[650px]">
                  <div className="grid grid-cols-12 gap-2 sm:gap-4 p-3 sm:p-5 border-b text-xs sm:text-base font-bold uppercase tracking-wider sm:tracking-widest" style={{ borderColor: 'var(--border-subtle)', color: 'var(--color-text-muted)' }}>
                    <div className="col-span-1 text-center">Status</div>
                    <div className="col-span-5">Cliente</div>
                    <div className="col-span-2 text-center">Volume</div>
                    <div className="col-span-2 text-center">Previsto</div>
                    <div className="col-span-2 text-center">Realizado</div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {expedicoes.length === 0 ? (
                      <div className="flex items-center justify-center p-8 sm:p-12">
                        <p className="text-base sm:text-2xl text-center" style={{ color: 'var(--color-text-muted)' }}>
                          📋 Nenhuma expedição programada para esta data
                        </p>
                      </div>
                    ) : (
                      [...expedicoes].sort((a, b) => {
                        const statusWeight: Record<string, number> = {
                          atrasado: 1,
                          proximo: 2,
                          no_prazo: 3,
                          concluido: 4,
                          pendente: 5
                        };
                        const weightA = statusWeight[a.status] || 99;
                        const weightB = statusWeight[b.status] || 99;
                        if (weightA !== weightB) return weightA - weightB;
                        return (a.horario_planejado || '').localeCompare(b.horario_planejado || '');
                      }).slice(0, 10).map((exp, i) => {
                        const isLate = exp.status === 'atrasado'
                        const isWarning = exp.status === 'proximo'
                        const isDone = exp.status === 'concluido'
                        
                        return (
                          <div key={exp.id} 
                               className="grid grid-cols-12 gap-2 sm:gap-4 p-3 sm:p-5 items-center transition-colors"
                               style={{ 
                                 borderColor: 'var(--border-subtle)',
                                 background: isLate ? 'rgba(239,68,68,0.08)' : i % 2 === 0 ? 'var(--color-surface-2)' : 'transparent',
                                 borderLeft: isLate ? '4px solid var(--color-status-danger)' : '4px solid transparent',
                                 animation: isLate ? 'var(--animate-pulse-subtle)' : undefined 
                               }}>
                            <div className="col-span-1 flex justify-center">
                              {isDone ? (
                                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-xl font-bold" style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid var(--color-status-ok)', color: 'var(--color-status-ok)' }}>✓</div>
                              ) : isLate ? (
                                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-xl font-bold animate-pulse" style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid var(--color-status-danger)', color: 'var(--color-status-danger)' }}>!</div>
                              ) : isWarning ? (
                                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-xl font-bold animate-pulse" style={{ background: 'rgba(245,158,11,0.15)', border: '2px solid var(--color-status-warning)', color: 'var(--color-status-warning)' }}>⚠</div>
                              ) : (
                                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-xl font-bold" style={{ background: 'rgba(59,130,246,0.15)', border: '2px solid var(--color-status-info)', color: 'var(--color-status-info)' }}>⧗</div>
                              )}
                            </div>
                            <div className="col-span-5 text-sm sm:text-xl lg:text-2xl font-extrabold truncate" style={{ color: 'var(--color-text-primary)' }}>
                              <button 
                                onClick={() => setSelectedClientForModal(exp.cliente)}
                                className="hover:underline transition-all text-left truncate w-full"
                                title="Ver ficha do cliente"
                              >
                                {exp.cliente}
                              </button>
                            </div>
                            <div className="col-span-2 text-center text-xs sm:text-lg lg:text-2xl font-mono font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                              {exp.peso_previsto_kg?.toLocaleString('pt-BR')}kg
                            </div>
                            <div className="col-span-2 text-center text-sm sm:text-2xl lg:text-3xl font-mono font-bold" style={{ color: isLate ? 'var(--color-status-danger)' : 'var(--color-text-primary)' }}>
                              {exp.horario_planejado?.slice(0, 5)}
                            </div>
                            <div className="col-span-2 text-center text-sm sm:text-2xl lg:text-3xl font-mono font-bold" style={{ color: isDone ? 'var(--color-status-ok)' : 'var(--color-text-muted)' }}>
                              {exp.horario_real ? exp.horario_real.slice(0, 5) : '--:--'}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRODUÇÃO Panel */}
        {activePanel === 'producao' && (
          <div className="flex-1 flex flex-col justify-center max-w-7xl mx-auto w-full" style={{ animation: 'var(--animate-zoom-in)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 lg:gap-10 mb-6 sm:mb-12">
              <TVKpi label="VOLUME DE ENTRADA" value={`${(resumo.entrada_total / 1000).toFixed(1)}t`} color="var(--color-status-info)" />
              <TVKpi label="VOLUME DE SAÍDA" value={`${(resumo.saida_total / 1000).toFixed(1)}t`} color="var(--color-elis-teal)" />
              <TVKpi label="EFICIÊNCIA GLOBAL" value={`${resumo.eficiencia.toFixed(1)}%`} color={efColor} />
            </div>

            <div className="p-4 sm:p-8 lg:p-10 rounded-xl sm:rounded-2xl" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--glass-shadow)' }}>
              <h2 className="text-base sm:text-xl lg:text-2xl font-bold mb-6 sm:mb-12 text-center uppercase tracking-wider sm:tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
                Rendimento Operacional Instantâneo
              </h2>
              
              <div className="relative mb-6 sm:mb-10">
                <div className="overflow-visible relative" style={{ height: '60px', borderRadius: '30px', background: 'var(--color-surface-3)', border: '2px solid var(--border-subtle)' }}>
                  <div
                    className="h-full flex items-center justify-end px-4 sm:px-8 transition-all duration-1000 ease-in-out"
                    style={{ 
                      width: `${Math.min(100, Math.max(0, resumo.eficiencia))}%`, 
                      background: `linear-gradient(90deg, ${resumo.eficiencia >= 94 ? 'var(--color-verde-sustentavel-dark)' : 'var(--color-status-danger)'}, ${resumo.eficiencia >= 94 ? 'var(--color-verde-sustentavel)' : '#f87171'})`,
                      boxShadow: `0 0 30px ${resumo.eficiencia >= 94 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`,
                      borderRadius: '30px',
                    }}
                  >
                    <span className="text-white text-xl sm:text-3xl lg:text-4xl font-extrabold drop-shadow-lg font-mono">
                      {resumo.eficiencia.toFixed(1)}%
                    </span>
                  </div>
                  
                  {/* Meta marker */}
                  <div className="absolute top-0 bottom-0 flex flex-col justify-center" style={{ left: '94%', zIndex: 10 }}>
                    <div className="h-[140%] w-[3px] absolute -top-[20%] shadow-[0_0_15px_rgba(250,204,21,0.8)]" style={{ background: '#FBBF24' }} />
                    <span className="absolute -top-10 sm:-top-14 -ml-10 sm:-ml-12 font-bold px-3 py-1 sm:px-5 sm:py-2 rounded-full text-xs sm:text-base tracking-wider sm:tracking-widest border whitespace-nowrap" 
                      style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#FBBF24', borderColor: 'rgba(251, 191, 36, 0.4)' }}>
                      META (94%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-4 px-2 sm:px-6 text-sm sm:text-xl lg:text-2xl font-mono font-bold" style={{ color: 'var(--color-text-muted)' }}>
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Global de Cliente */}
      {selectedClientForModal && (
        <ClientModal 
          clienteNome={selectedClientForModal} 
          onClose={() => setSelectedClientForModal(null)} 
        />
      )}
    </div>
  )
}

function TVKpi({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-center p-3 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--border-subtle)' }}>
      <p className="text-[10px] sm:text-xs lg:text-sm font-bold mb-1.5 sm:mb-3 uppercase tracking-wider sm:tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="font-mono font-extrabold text-2xl sm:text-4xl lg:text-6xl drop-shadow-md truncate" style={{ color }}>{value}</p>
    </div>
  )
}
