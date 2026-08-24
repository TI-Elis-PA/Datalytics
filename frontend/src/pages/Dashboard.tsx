import { useExpedicao, useProducao } from '../hooks/useData'
import { apiFetch } from '../lib/supabase'
import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { HelpIcon } from '../components/HelpIcon'
import DatePicker from '../components/DatePicker'
import KPIDetailModal from '../components/KPIDetailModal'
import type { ModalVariant } from '../components/KPIDetailModal'

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const { expedicoes, stats, loading: expLoading } = useExpedicao(selectedDate)
  const { resumo, porCliente, loading: prodLoading } = useProducao(selectedDate)
  const [insights, setInsights] = useState<string>('')
  const [activeModal, setActiveModal] = useState<ModalVariant | null>(null)

  useEffect(() => {
    const d = selectedDate ? `?date=${selectedDate}` : ''
    apiFetch<{ data: { insights: string } }>(`/ai/insights${d}`)
      .then(r => setInsights(r.data.insights))
      .catch(() => { })
  }, [selectedDate])

  // Mocking D-1 Debt for Demo purposes (since API doesn't have it yet)
  const debitoD1 = 1250 // peças não entregues no dia anterior
  const penaltiEficiencia = 5.2 // Impacto na eficiência hoje devido à sobrecarga
  const eficienciaReal = Math.max(0, resumo.eficiencia - penaltiEficiencia)

  const efColor = eficienciaReal >= 94 ? 'var(--color-verde-sustentavel)' : 'var(--color-status-danger)'
  const andamentoPct = stats.total > 0 ? ((stats.concluidos / stats.total) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6 relative" style={{ animation: 'var(--animate-in)' }} id="dashboard-view">
      {/* Botão ✨ Analisar operação fixo no dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Visão Geral</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            placeholder="Hoje"
          />
        </div>
      </div>

      {/* ALERTA GLOBAL DE DÉBITO D-1 */}
      {debitoD1 > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-4">
          <div className="text-2xl mt-0.5">🚨</div>
          <div className="flex-1">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-red-400 font-bold text-sm inline-flex items-center">
                  Ineficiência Detectada: Carga Herdada do Dia Anterior (Débito D-1)
                  <HelpIcon text="Débito D-1 representa a quantidade de peças (roupas sujas) que chegaram no dia anterior, mas não foram processadas. Isso consome a capacidade das máquinas hoje, gerando um efeito dominó de atrasos." />
                </h3>
                <p className="text-red-400/80 text-xs mt-1 leading-relaxed max-w-3xl">
                  A planta possui um déficit de <strong>{debitoD1.toLocaleString('pt-BR')} peças</strong> não entregues ontem.
                  Isso sobrecarrega o maquinário hoje e reduz a capacidade disponível para as rotas normais, impactando a eficiência global em <strong>-{penaltiEficiencia.toFixed(1)}%</strong>.
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const text = `🚨 *ALERTA OPERACIONAL: DÉBITO D-1* 🚨\n\nA planta Elis amanheceu com déficit do dia anterior.\n\n📉 *Carga Herdada:* ${debitoD1.toLocaleString('pt-BR')} peças atrasadas\n⚠️ *Impacto na Capacidade Hoje:* -${penaltiEficiencia.toFixed(1)}%\n⚡ *Eficiência Real Projetada:* ${eficienciaReal.toFixed(1)}% (Abaixo da meta de 94%)\n\nPor favor, revisar prioridades de expedição.\n_Gerado via Datalytics Elis_`

                    const response = await fetch('http://localhost:3005/api/notify', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      // Em um cenário real, pegaríamos esse número do cadastro do usuário
                      body: JSON.stringify({ number: '91981646532', message: text })
                    });

                    if (response.ok) {
                      alert('✅ Mensagem enviada silenciosamente via Backend!');
                    } else {
                      const err = await response.json();
                      alert('❌ Falha ao enviar: ' + (err.error || 'Erro desconhecido. O backend está rodando?'));
                    }
                  } catch (e) {
                    alert('❌ Backend offline. Certifique-se de rodar "npm start" na pasta backend.');
                  }
                }}
                className="flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-transform hover:scale-105 shadow-lg"
                style={{ background: '#25D366', color: 'white' }}
                title="Enviar alerta pelo WhatsApp"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Notificar Gestão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Row — clicável para abrir modal detalhado */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="Andamento" value={`${andamentoPct}%`} icon="🚀" variant={parseFloat(andamentoPct) === 100 ? 'success' : 'info'} onClick={() => setActiveModal('andamento')} />
        <KPICard label="Total Previsto" value={stats.total} icon="📋" onClick={() => setActiveModal('total')} />
        <KPICard label="Expedidos" value={stats.concluidos} icon="✅" variant="success" onClick={() => setActiveModal('expedidos')} />
        <KPICard label="Atrasados" value={stats.atrasados} icon="🔴" variant="danger" onClick={() => setActiveModal('atrasados')} />
        <KPICard label="Eficiência Real" value={`${eficienciaReal.toFixed(1)}%`} icon="⚡" variant={eficienciaReal >= 94 ? 'success' : 'danger'} onClick={() => setActiveModal('eficiencia')} />
      </div>

      {/* NOVO MÓDULO: Tendências e Custo Oculto */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico de Tendência de Eficiência */}
        <div className="lg:col-span-2 card-glass p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
              📈 Tendência de Eficiência (Últimos 7 dias)
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-white/10" style={{ color: 'var(--color-elis-teal)' }}>Novo Módulo</span>
            </h3>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Seg', uv: 88 },
                { name: 'Ter', uv: 92 },
                { name: 'Qua', uv: 90 },
                { name: 'Qui', uv: 95 },
                { name: 'Sex', uv: 97 },
                { name: 'Sáb', uv: 93 },
                { name: 'Dom', uv: parseFloat(resumo.eficiencia.toFixed(1)) || 94 },
              ]}>
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-elis-teal)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-elis-teal)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[(dataMin: number) => Math.floor(dataMin - 5), 100]} />
                <Tooltip contentStyle={{ background: 'var(--color-surface-1)', border: 'none', borderRadius: '8px', color: 'white' }} />
                <Area type="monotone" dataKey="uv" stroke="var(--color-elis-teal)" fillOpacity={1} fill="url(#colorUv)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Custo Oculto de Rotas Avulsas */}
        <div className="card-glass p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold mb-1 inline-flex items-center" style={{ color: 'var(--color-text-secondary)' }}>
              💸 Custo Oculto Mensal
              <HelpIcon text="Custo Oculto é o gasto extra não-planejado causado por ineficiência logística. Quando cargas atrasam, a Elis precisa pagar horas extras aos motoristas e despachar caminhões fora da rota ideal, queimando margem de lucro." />
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Gasto extra com Rotas Avulsas não planejadas</p>
          </div>

          <div className="text-center bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
            <span className="text-sm font-bold text-red-400">Total Estimado</span>
            <div className="text-3xl font-mono font-bold text-red-500 mt-1">R$ 4.250,00</div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span>Combustível Extra</span>
              <span className="font-mono">R$ 2.800</span>
            </div>
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span>Horas Extras Motoristas</span>
              <span className="font-mono">R$ 1.450</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle row: Efficiency bar + quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Efficiency gauge */}
        <div className="lg:col-span-2 card-glass p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            ⚡ Eficiência da Planta

            {/* Tooltip Explicativo do D-1 */}
            <div className="relative group flex items-center">
              <span className="cursor-help flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)', border: '1px solid var(--border-subtle)' }}>?</span>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 p-3 bg-black/90 backdrop-blur-md rounded-xl text-white text-[11px] shadow-2xl border border-white/10 z-50 pointer-events-none">
                <p className="font-bold mb-1.5 text-xs">Como ler estas barras?</p>
                <p className="text-white/80 mb-2 leading-relaxed">
                  <span className="inline-block w-2 h-2 rounded-full mr-1 bg-gray-400"></span>
                  <strong>Barra Cinza (Fundo):</strong> Eficiência bruta de hoje, se não houvesse peças atrasadas de ontem (Sem D-1).
                </p>
                <p className="text-white/80 leading-relaxed">
                  <span className="inline-block w-2 h-2 rounded-full mr-1 bg-red-500"></span>
                  <strong>Barra Colorida:</strong> <i>Eficiência Real</i>. É a eficiência bruta <b>menos a penalidade</b> das peças acumuladas ontem.
                </p>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/90 border-r border-b border-white/10 rotate-45"></div>
              </div>
            </div>
          </h3>
          <div className="flex items-end gap-6 mb-4">
            <div>
              <p className="font-mono text-4xl font-bold" style={{ color: efColor }}>
                {eficienciaReal.toFixed(1)}%
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Meta: ≥ 94%
              </p>
            </div>
            <div className="flex-1 space-y-3 mt-2 sm:mt-0">
              {/* Barra 1: Eficiência Bruta (Sem D-1) */}
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>Eficiência Bruta (Capacidade de Hoje)</span>
                  <span className="font-mono">{resumo.eficiencia.toFixed(1)}%</span>
                </div>
                <div className="progress-track" style={{ background: 'var(--color-surface-3)', height: '20px' }}>
                  <div
                    className="progress-fill opacity-70"
                    style={{ width: `${Math.min(100, resumo.eficiencia)}%`, background: 'var(--color-text-muted)', height: '100%' }}
                  />
                </div>
              </div>

              {/* Barra 2: Eficiência Real (Após D-1) */}
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-medium">
                  <span className="flex items-center gap-1" style={{ color: 'var(--color-text-primary)' }}>
                    Eficiência Real <span className="text-red-400 font-bold ml-1">(-{penaltiEficiencia.toFixed(1)}% devido a atrasos)</span>
                  </span>
                  <span className="font-mono font-bold" style={{ color: efColor }}>{eficienciaReal.toFixed(1)}%</span>
                </div>
                <div className="progress-track relative" style={{ background: 'rgba(239, 68, 68, 0.1)', height: '24px' }}>
                  <div
                    className={`progress-fill ${eficienciaReal >= 94 ? 'meta-ok' : ''}`}
                    style={{ width: `${Math.min(100, eficienciaReal)}%`, background: efColor, height: '100%' }}
                  >
                    {eficienciaReal.toFixed(1)}%
                  </div>
                  {/* Ghost Target (Meta) */}
                  <div
                    className="absolute top-0 bottom-0 flex flex-col justify-center transition-all"
                    style={{ left: '94%', zIndex: 10 }}
                    title="Meta: 94%"
                  >
                    <div className="h-[140%] w-[3px] absolute -top-[20%] bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <MiniStat label="Entrada" value={`${(resumo.entrada_total / 1000).toFixed(1)}t`} color="var(--color-status-info)" />
            <MiniStat label="Saída" value={`${(resumo.saida_total / 1000).toFixed(1)}t`} color="var(--color-elis-teal)" />
            <MiniStat label="Pendente" value={`${(resumo.pendente / 1000).toFixed(1)}t`} color="var(--color-status-warning)" />
          </div>
        </div>

        {/* Expedition quick view */}
        <div className="card-glass p-6">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            🚚 Expedição Hoje
          </h3>
          <div className="space-y-3">
            <StatRow label="No Prazo" value={stats.no_prazo} dot="ok" />
            <StatRow label="Próximo do Limite" value={stats.proximos} dot="warning" />
            <StatRow label="Atrasados" value={stats.atrasados} dot="danger" />
            <StatRow label="Concluídos" value={stats.concluidos} dot="done" />
            <hr className="border-white/5 my-2" />
            <StatRow label="Total" value={stats.total} bold />
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {insights && (
        <div className="ai-panel p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-elis-teal)' }}>
            🤖 Insights IA
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(0,155,152,0.15)', color: 'var(--color-elis-teal)' }}>Automático</span>
          </h3>
          <div className="space-y-3">
            {insights.split('\n\n').map((paragraph, i) => {
              const pText = paragraph.trim()
              if (!pText) return null

              let borderColor = 'var(--color-elis-teal)'
              if (pText.includes('⚠️') || pText.includes('🔴') || pText.toLowerCase().includes('atraso')) {
                borderColor = 'var(--color-status-danger)'
              } else if (pText.includes('⏰') || pText.toLowerCase().includes('limite')) {
                borderColor = 'var(--color-status-warning)'
              } else if (pText.includes('🔮') || pText.toLowerCase().includes('predição')) {
                borderColor = '#A855F7'
              } else if (pText.includes('📈') || pText.toLowerCase().includes('tendência')) {
                borderColor = 'var(--color-status-info)'
              }

              return (
                <div
                  key={i}
                  className="p-4 rounded-lg transition-all"
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `3px solid ${borderColor}`,
                  }}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>
                    {pText.split('**').map((part, j) =>
                      j % 2 === 1
                        ? <strong key={j} style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{part}</strong>
                        : <span key={j}>{part}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal detalhado dos KPIs */}
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

function KPICard({ label, value, icon, variant, onClick }: { label: string; value: string | number; icon: string; variant?: string; onClick?: () => void }) {
  return (
    <div className={`kpi-card ${variant || ''}`} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick?.()}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="font-mono text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      <span className="text-[10px] mt-1 block" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>Clique para detalhes</span>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center p-3 rounded-lg" style={{ background: 'var(--color-surface-3)' }}>
      <p className="font-mono text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
    </div>
  )
}

function StatRow({ label, value, dot, bold }: { label: string; value: number; dot?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {dot && <span className={`status-dot ${dot}`} />}
        <span className={`text-sm ${bold ? 'font-semibold' : ''}`} style={{ color: bold ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
          {label}
        </span>
      </div>
      <span className={`font-mono text-sm ${bold ? 'font-bold' : 'font-medium'}`} style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </span>
    </div>
  )
}
