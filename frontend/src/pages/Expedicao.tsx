import { useExpedicao, useAlertas, useProducao } from '../hooks/useData'
import { useState } from 'react'
import { apiFetch } from '../lib/supabase'
import DatePicker from '../components/DatePicker'
import FilterBar, { FilterConfig } from '../components/FilterBar'
import ClientModal from '../components/ClientModal'
import KPIDetailModal from '../components/KPIDetailModal'
import type { ModalVariant } from '../components/KPIDetailModal'

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  no_prazo:  { label: 'No Prazo',   dot: 'ok',      bg: 'rgba(16,185,129,0.08)' },
  proximo:   { label: 'Próximo',    dot: 'warning',  bg: 'rgba(245,158,11,0.08)' },
  atrasado:  { label: 'Atrasado',   dot: 'danger',   bg: 'rgba(239,68,68,0.08)' },
  concluido: { label: 'Concluído',  dot: 'done',     bg: 'rgba(0,155,152,0.08)' },
  pendente:  { label: 'Pendente',   dot: 'ok',       bg: 'transparent' },
}

export default function Expedicao() {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const { expedicoes, stats, loading, concluir } = useExpedicao(selectedDate)
  const { alertas } = useAlertas()
  const { resumo, porCliente } = useProducao(selectedDate)
  const [activeModal, setActiveModal] = useState<ModalVariant | null>(null)
  const [selectedClientForModal, setSelectedClientForModal] = useState<string | null>(null)
  const [isModalRotaOpen, setIsModalRotaOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [turnoFilter, setTurnoFilter] = useState('todos')

  const statusWeight: Record<string, number> = {
    atrasado: 1,
    proximo: 2,
    pendente: 3,
    no_prazo: 4,
    concluido: 5
  }

  const filtered = [...expedicoes]
    .filter(a => statusFilter === 'todos' || a.status === statusFilter)
    .filter(a => {
       if (turnoFilter === 'todos') return true;
       // Mock logic for turno based on horario_planejado (e.g. "08:00" -> manha)
       const hour = parseInt((a.horario_planejado || "12:00").split(':')[0], 10);
       if (turnoFilter === 'manha') return hour >= 6 && hour < 12;
       if (turnoFilter === 'tarde') return hour >= 12 && hour < 18;
       if (turnoFilter === 'noite') return hour >= 18 || hour < 6;
       return true;
    })
    .sort((a, b) => {
      const weightA = statusWeight[a.status] || 99
      const weightB = statusWeight[b.status] || 99
      if (weightA !== weightB) return weightA - weightB
      return (a.horario_planejado || '').localeCompare(b.horario_planejado || '')
    })

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'todos', label: 'Todos' },
        { value: 'concluido', label: 'Concluído' },
        { value: 'no_prazo', label: 'No Prazo' },
        { value: 'pendente', label: 'Pendente' },
        { value: 'proximo', label: 'Próximo' },
        { value: 'atrasado', label: 'Atrasado' }
      ]
    },
    {
      key: 'turno',
      label: 'Turno',
      value: turnoFilter,
      onChange: setTurnoFilter,
      options: [
        { value: 'todos', label: 'Todos' },
        { value: 'manha', label: 'Manhã (06h - 12h)' },
        { value: 'tarde', label: 'Tarde (12h - 18h)' },
        { value: 'noite', label: 'Noite (18h - 06h)' }
      ]
    }
  ]

  return (
    <div className="space-y-6" style={{ animation: 'var(--animate-in)' }} id="expedicao-view">
      {/* Date Picker and Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Expedição</h2>
        <div className="flex flex-wrap items-center gap-3">
          <DatePicker 
            value={selectedDate}
            onChange={setSelectedDate}
            placeholder="Hoje"
          />
          <button
            onClick={() => setIsModalRotaOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white shadow-lg transition-transform hover:scale-105"
            style={{ background: 'var(--color-elis-teal-dark)', boxShadow: '0 4px 14px rgba(0, 155, 152, 0.4)' }}
          >
            ➕ Rota Avulsa (Inteligente)
          </button>
        </div>
      </div>
      {/* Alert Banner */}
      {stats.atrasados > 0 && (
        <div
          className="rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            animation: 'var(--animate-pulse-subtle)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-status-danger)' }}>
                {stats.atrasados} expedição(ões) atrasada(s)!
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Ação necessária — risco de ruptura hospitalar (quebra de SLA)
              </p>
            </div>
          </div>
          
          <button
            onClick={async () => {
              try {
                // Gráfico gerado na hora mostrando o atraso crítico
                const chartConfig = JSON.stringify({
                  type: 'bar',
                  data: {
                    labels: ['Hospital Santa Paula'],
                    datasets: [{ label: 'Atraso (Horas)', data: [2], backgroundColor: 'red' }]
                  }
                });
                const chartUrl = `https://quickchart.io/chart?w=600&h=300&c=${encodeURIComponent(chartConfig)}`;
                
                const text = `🚨 *RISCO DE RUPTURA HOSPITALAR* 🚨\n\nA carga do Hospital Santa Paula está com *2 horas de atraso* na expedição.\n\n⚠️ Risco iminente de quebra de SLA contratual.\n🚑 Cirurgias podem ser impactadas caso o enxoval não seja despachado com urgência.\n\n_Datalytics Elis - Motor de Regras Automático_`;
                
                const response = await fetch('http://localhost:3005/api/notify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  // Simulando disparo com anexo de imagem
                  body: JSON.stringify({ number: '91981646532', message: text, mediaUrl: chartUrl }) 
                });
                
                if (response.ok) alert('✅ Alerta SLA enviado com sucesso (com anexo visual)!');
                else alert('❌ Falha ao enviar o alerta.');
              } catch (e) {
                alert('❌ Backend offline.');
              }
            }}
            className="flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-transform hover:scale-105 shadow-lg"
            style={{ background: '#ef4444', color: 'white' }}
            title="Enviar alerta de SLA (com gráfico) pelo WhatsApp"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Alertar Risco de SLA
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <FilterCard label="Total" value={stats.total} onClick={() => setActiveModal('total')} />
        <FilterCard label="No Prazo" value={stats.no_prazo} color="var(--color-status-ok)" onClick={() => setActiveModal('no_prazo')} />
        <FilterCard label="Próximo" value={stats.proximos} color="var(--color-status-warning)" onClick={() => setActiveModal('proximo')} />
        <FilterCard label="Atrasados" value={stats.atrasados} color="var(--color-status-danger)" onClick={() => setActiveModal('atrasados')} />
        <FilterCard label="Concluídos" value={stats.concluidos} color="var(--color-elis-teal)" onClick={() => setActiveModal('expedidos')} />
      </div>

      {/* Main Table */}
      <div className="card-glass overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-white/5 gap-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            🚚 Programação de Expedição
          </h3>
          <FilterBar filters={filterConfigs} />
        </div>

        <div className="flex">
          <div className="flex-1 overflow-auto" style={{ maxHeight: '60vh' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Cliente</th>
                  <th>Planejado</th>
                  <th>Real</th>
                  <th>Peso (kg)</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Carregando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Nenhuma expedição encontrada</td></tr>
                ) : (
                  filtered.map((exp, index) => {
                    const cfg = STATUS_CONFIG[exp.status] || STATUS_CONFIG.pendente
                    
                    // LÓGICA MOCK PARA REGRA D-1 (94%)
                    // Simulamos que alguns clientes (ex: índice par) tiveram coleta muito maior ontem
                    const coletadoD1 = (exp.peso_previsto_kg || 0) * (index % 3 === 0 ? 1.15 : 1.02); 
                    const percShipped = coletadoD1 > 0 ? (exp.peso_previsto_kg || 0) / coletadoD1 : 1;
                    const isRuleBroken = percShipped < 0.94 && (exp.peso_previsto_kg || 0) > 0;

                    return (
                      <tr 
                        key={exp.id} 
                        style={{ 
                          background: cfg.bg,
                          borderLeft: exp.status === 'atrasado' ? '3px solid var(--color-status-danger)' : '3px solid transparent',
                          animation: exp.status === 'atrasado' ? 'var(--animate-pulse-subtle)' : undefined
                        }}
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <span className={`status-dot ${cfg.dot}`} />
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                              {cfg.label}
                            </span>
                          </div>
                        </td>
                        <td className="font-medium relative">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setSelectedClientForModal(exp.cliente)}
                              className="hover:underline hover:text-elis-teal transition-colors text-left font-bold"
                            >
                              {exp.cliente}
                            </button>
                            
                            {/* Alerta D-1 (Abaixo de 94%) */}
                            {isRuleBroken && (() => {
                              const alertId = `alert-${exp.id}`;
                              return (
                              <div className="relative">
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const el = document.getElementById(alertId);
                                    if (el) el.classList.toggle('hidden');
                                  }}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer flex items-center gap-1" 
                                  style={{ background: 'var(--color-status-danger)', color: 'white', animation: 'var(--animate-pulse-subtle)' }}
                                >
                                  ⚠️ D-1 Abaixo
                                </button>
                                {/* Popup de Risco (toggle por clique) */}
                                <div id={alertId} className="absolute left-0 bottom-full mb-2 hidden w-64 p-3 bg-gray-900 border border-red-500 rounded-lg text-[11px] text-white z-50 shadow-2xl">
                                  <div className="flex justify-between items-center mb-2 border-b border-red-500/30 pb-1">
                                    <p className="font-bold text-red-400">Quebra de Regra (D-1)</p>
                                    <button onClick={(e) => { e.stopPropagation(); document.getElementById(alertId)?.classList.add('hidden'); }} className="text-gray-500 hover:text-white text-sm">✕</button>
                                  </div>
                                  <div className="space-y-1 mb-2">
                                    <div className="flex justify-between"><span className="text-gray-400">Coletado ontem:</span> <span>{Math.round(coletadoD1).toLocaleString('pt-BR')} kg</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400">Expedido hoje:</span> <span>{(exp.peso_previsto_kg || 0).toLocaleString('pt-BR')} kg</span></div>
                                  </div>
                                  <p className="font-bold text-center bg-red-500/20 py-1 rounded text-red-300">Total: {(percShipped * 100).toFixed(1)}% (Meta: ≥94%)</p>
                                  <button 
                                    className="mt-2 w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg flex items-center justify-center gap-1 transition-colors font-bold"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const msg = `🚨 *ALERTA DATALYTICS — Quebra de Regra D-1*\n\n` +
                                        `📋 *Cliente:* ${exp.cliente}\n` +
                                        `📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}\n` +
                                        `⏰ *Horário:* ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n` +
                                        `📦 Coletado ontem (D-1): *${Math.round(coletadoD1).toLocaleString('pt-BR')} kg*\n` +
                                        `🚚 Expedindo hoje (D0): *${(exp.peso_previsto_kg || 0).toLocaleString('pt-BR')} kg*\n\n` +
                                        `⚠️ *Índice: ${(percShipped * 100).toFixed(1)}%* (Meta: ≥94%)\n\n` +
                                        `_Ação necessária antes da saída do veículo._\n` +
                                        `_Enviado via Datalytics Elis — CNN Smart Plant_`;
                                      const encoded = encodeURIComponent(msg);
                                      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
                                    }}
                                  >
                                    <span>📱</span> Enviar via WhatsApp
                                  </button>
                                </div>
                              </div>
                              );
                            })()}

                            {resumo.eficiencia > 0 && resumo.eficiencia < 80 && (exp.status === 'pendente' || exp.status === 'proximo') && !isRuleBroken && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-status-warning)', color: 'white', animation: 'var(--animate-pulse-subtle)' }}>
                                ⚠️ Risco Logístico
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="font-mono text-sm">{exp.horario_planejado?.slice(0, 5)}</td>
                        <td className="font-mono text-sm" style={{ color: exp.horario_real ? 'var(--color-elis-teal)' : 'var(--color-text-muted)' }}>
                          {exp.horario_real?.slice(0, 5) || '—'}
                        </td>
                        <td className="font-mono">{(exp.peso_previsto_kg || 0).toLocaleString('pt-BR')}</td>
                        <td>
                          {exp.status !== 'concluido' && (
                            <button
                              onClick={() => concluir(exp.id, exp.peso_previsto_kg)}
                              className="text-xs px-4 py-2 rounded-lg font-bold transition-all hover:scale-105 shadow-lg"
                              style={{ 
                                background: exp.status === 'atrasado' || exp.status === 'proximo' 
                                  ? 'var(--color-verde-sustentavel-dark)' 
                                  : 'var(--color-elis-teal)',
                                color: 'white' 
                              }}
                            >
                              ✅ CONCLUIR
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Timeline Heatmap */}
      <div className="card-glass p-6">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          🕐 Timeline de Expedição — Concentração por Horário
        </h3>
        <div className="flex gap-1 items-end">
          {Array.from({ length: 16 }, (_, i) => i + 6).map(hour => {
            const count = expedicoes.filter(e => {
              const h = parseInt(e.horario_planejado?.slice(0, 2) || '0')
              return h === hour
            }).length
            const maxCount = Math.max(1, ...Array.from({ length: 16 }, (_, i) =>
              expedicoes.filter(e => parseInt(e.horario_planejado?.slice(0, 2) || '0') === i + 6).length
            ))
            const intensity = count / maxCount
            return (
              <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: `${Math.max(4, intensity * 60)}px`,
                    background: count === 0
                      ? 'var(--color-surface-3)'
                      : `rgba(0, 155, 152, ${0.2 + intensity * 0.8})`,
                  }}
                  title={`${hour}h: ${count} expedição(ões)`}
                />
                <span className="text-[9px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                  {hour}h
                </span>
              </div>
            )
          })}
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

      {/* Modal Inteligente de Rota Avulsa */}
      {isModalRotaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ animation: 'var(--animate-in)' }}>
            
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
              <div>
                <h3 className="font-bold text-lg text-white">Criar Rota Avulsa</h3>
                <p className="text-xs text-gray-400">Módulo Inteligente de Sugestão e Custo</p>
              </div>
              <button onClick={() => setIsModalRotaOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Seleção Básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Cliente / Contrato</label>
                  <select 
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white"
                    value={selectedCliente}
                    onChange={(e) => setSelectedCliente(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    <option value="HOSPITAL_A">Hospital Galileu (500kg)</option>
                    <option value="HOSPITAL_B">Rede D'Or (320kg)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Motivo Viagem Extra</label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white">
                    <option>Complemento de Carga</option>
                    <option>Urgência Cirúrgica</option>
                    <option>Falha na Rota Principal</option>
                  </select>
                </div>
              </div>

              {/* Box de Inteligência (Aparece ao selecionar cliente) */}
              <div className={`transition-all duration-500 overflow-hidden ${selectedCliente ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0'}`}>
                
                <div className="bg-elis-teal/10 border border-elis-teal/30 rounded-xl p-4 mb-4">
                  <h4 className="text-sm font-bold text-elis-teal flex items-center gap-2 mb-3">
                    🤖 Sugestão do Motor Inteligente
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/80 p-3 rounded-lg">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Veículo Ideal Disponível</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl">🚛</span>
                        <div>
                          <p className="font-bold text-white text-sm">FROTA-15 (VUC)</p>
                          <p className="text-xs text-green-400">Capacidade: Sobra 200kg</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex flex-col justify-center">
                      <p className="text-[10px] text-red-400 uppercase tracking-wide">⚠️ Custo Oculto Estimado</p>
                      <p className="text-xl font-bold text-red-500 font-mono mt-1">
                        + R$ 285,40
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-800/30 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalRotaOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
              >
                Cancelar
              </button>
              <button 
                disabled={!selectedCliente}
                className={`px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-all ${selectedCliente ? 'bg-elis-teal text-white hover:scale-105' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                onClick={() => {
                  alert('Rota Avulsa criada! Custo computado no Dashboard.');
                  setIsModalRotaOpen(false);
                }}
              >
                Executar Rota Avulsa
              </button>
            </div>
            
          </div>
        </div>
      )}
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

function FilterCard({ label, value, color, onClick }: {
  label: string; value: number; color?: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="kpi-card text-left transition-all hover:scale-[1.02]"
    >
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="font-mono text-xl font-bold mt-1" style={{ color: color || 'var(--color-text-primary)' }}>
        {value}
      </p>
      <span className="text-[10px] mt-2 block" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>Clique para detalhes</span>
    </button>
  )
}
