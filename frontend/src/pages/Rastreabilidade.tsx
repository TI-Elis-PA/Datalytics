import { useState, useEffect } from 'react'
import ClientModal from '../components/ClientModal'
import DatePicker from '../components/DatePicker'

// ===========================================================
// MOCK DATA — Simulando leituras do sistema RFID da planta
// Quando a integração real for feita, estes dados virão do
// banco de dados, alimentados pelos leitores RFID em cada setor.
// ===========================================================

type Stage = 'sujo' | 'lavando' | 'secando' | 'dobrando' | 'disponivel'

interface ClienteLote {
  id: string
  cliente: string
  contrato: string
  meta_expedicao_pcs: number
  sujo: number
  lavando: number
  secando: number
  dobrando: number
  disponivel: number
  ultima_leitura: string
}

const MOCK_LOTES: ClienteLote[] = [
  {
    id: '1',
    cliente: 'Hospital Galileu',
    contrato: 'HG-2024-001',
    meta_expedicao_pcs: 1000,
    sujo: 0,
    lavando: 120,
    secando: 80,
    dobrando: 50,
    disponivel: 750,
    ultima_leitura: '11:22',
  },
  {
    id: '2',
    cliente: "Rede D'Or São Luiz",
    contrato: 'RD-2024-007',
    meta_expedicao_pcs: 1500,
    sujo: 200,
    lavando: 300,
    secando: 150,
    dobrando: 200,
    disponivel: 650,
    ultima_leitura: '11:18',
  },
  {
    id: '3',
    cliente: 'UPA Central',
    contrato: 'UPA-2024-003',
    meta_expedicao_pcs: 400,
    sujo: 0,
    lavando: 0,
    secando: 0,
    dobrando: 20,
    disponivel: 380,
    ultima_leitura: '11:30',
  },
  {
    id: '4',
    cliente: 'Hospital Santa Maria',
    contrato: 'HSM-2024-012',
    meta_expedicao_pcs: 800,
    sujo: 100,
    lavando: 200,
    secando: 250,
    dobrando: 100,
    disponivel: 150,
    ultima_leitura: '11:05',
  },
  {
    id: '5',
    cliente: 'Clínica São Rafael',
    contrato: 'CSR-2024-005',
    meta_expedicao_pcs: 300,
    sujo: 0,
    lavando: 0,
    secando: 30,
    dobrando: 40,
    disponivel: 230,
    ultima_leitura: '11:28',
  },
]

const STAGES: { key: Stage; label: string; icon: string; color: string; bg: string }[] = [
  { key: 'sujo',       label: 'Sujo / Recepção', icon: '📥', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { key: 'lavando',    label: 'Lavagem',          icon: '🧼', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { key: 'secando',    label: 'Secagem',           icon: '🌀', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { key: 'dobrando',   label: 'Dobragem/Calandria',icon: '👔', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { key: 'disponivel', label: 'Disponível',        icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
]

// Anima a contagem para simular atualização em tempo real
function useAnimatedValue(target: number) {
  const [value, setValue] = useState(target)
  useEffect(() => {
    const delta = Math.floor(Math.random() * 5 - 2) // ±2 kg de variação simulada
    const timeout = setTimeout(() => setValue(Math.max(0, target + delta)), Math.random() * 4000 + 2000)
    return () => clearTimeout(timeout)
  }, [value, target])
  return value
}

function KgBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}88` }}
        />
      </div>
      <span className="text-[10px] font-mono w-8 text-right" style={{ color: 'var(--color-text-muted)' }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}

function StageCell({ kg, totalMeta, stage }: { kg: number; totalMeta: number; stage: typeof STAGES[0] }) {
  const animated = useAnimatedValue(kg)
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl" style={{ background: animated > 0 ? stage.bg : 'transparent', minWidth: 90 }}>
      <span className="text-base">{stage.icon}</span>
      <span className="font-mono font-bold text-sm" style={{ color: animated > 0 ? stage.color : 'var(--color-text-muted)' }}>
        {animated.toLocaleString('pt-BR')} <span className="text-[10px] font-normal">pçs</span>
      </span>
      {animated > 0 && (
        <KgBar value={animated} total={totalMeta} color={stage.color} />
      )}
    </div>
  )
}

export default function Rastreabilidade() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [selectedStageFilter, setSelectedStageFilter] = useState<Stage | 'todos'>('todos')
  const [time, setTime] = useState(new Date())
  const [pulse, setPulse] = useState(false)
  const [viewMode, setViewMode] = useState<'gestor' | 'expedidor'>('gestor')
  const [cargas, setCargas] = useState<Record<string, { confirmado: boolean; horario: string }>>({}) 
  const [selectedDate, setSelectedDate] = useState<string>('') 

  // Relógio + pulso de "leitura RFID simulada"
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date())
      setPulse(true)
      setTimeout(() => setPulse(false), 500)
    }, 3000)
    return () => clearInterval(t)
  }, [])

  const filtered = selectedStageFilter === 'todos'
    ? MOCK_LOTES
    : MOCK_LOTES.filter(l => l[selectedStageFilter] > 0)

  // Totalizadores da planta
  const totals = MOCK_LOTES.reduce(
    (acc, l) => ({
      sujo: acc.sujo + l.sujo,
      lavando: acc.lavando + l.lavando,
      secando: acc.secando + l.secando,
      dobrando: acc.dobrando + l.dobrando,
      disponivel: acc.disponivel + l.disponivel,
    }),
    { sujo: 0, lavando: 0, secando: 0, dobrando: 0, disponivel: 0 }
  )
  const totalNaPlanta = Object.values(totals).reduce((a, b) => a + b, 0)

  // Total de tags RFID lidas (soma de todas as peças em todos os setores)
  const totalTags = MOCK_LOTES.reduce(
    (acc, l) => acc + l.sujo + l.lavando + l.secando + l.dobrando + l.disponivel, 0
  )

  return (
    <div className="space-y-6" style={{ animation: 'var(--animate-in)' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Rastreabilidade RFID da Planta
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Pipeline em tempo real — visão do enxoval por setor
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DatePicker value={selectedDate} onChange={setSelectedDate} placeholder="Hoje" />
          
          {/* Toggle de Visão */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={() => setViewMode('gestor')}
              className="px-4 py-2 text-xs font-bold transition-all"
              style={{
                background: viewMode === 'gestor' ? 'var(--color-elis-teal)' : 'var(--color-surface-2)',
                color: viewMode === 'gestor' ? 'white' : 'var(--color-text-muted)',
              }}
            >
              🏭 Gestor
            </button>
            <button
              onClick={() => setViewMode('expedidor')}
              className="px-4 py-2 text-xs font-bold transition-all"
              style={{
                background: viewMode === 'expedidor' ? '#f59e0b' : 'var(--color-surface-2)',
                color: viewMode === 'expedidor' ? 'white' : 'var(--color-text-muted)',
              }}
            >
              🚚 Expedidor
            </button>
          </div>
          {/* Indicador de leitura RFID */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-subtle)' }}>
            <div
              className="w-2.5 h-2.5 rounded-full transition-all duration-300"
              style={{
                background: pulse ? '#10b981' : 'rgba(16,185,129,0.3)',
                boxShadow: pulse ? '0 0 8px #10b981' : 'none',
              }}
            />
            <span className="text-xs font-mono font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              RFID • {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <div className="px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'rgba(0,155,152,0.15)', color: 'var(--color-elis-teal)', border: '1px solid rgba(0,155,152,0.3)' }}>
            {totalNaPlanta.toLocaleString('pt-BR')} peças na planta
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* VISÃO EXPEDIDOR */}
      {/* ============================================================ */}
      {viewMode === 'expedidor' && (
        <div style={{ animation: 'var(--animate-in)' }}>
          {/* Banner orientativo */}
          <div className="flex items-center gap-3 p-4 rounded-xl mb-4" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <span className="text-2xl">🚚</span>
            <div>
              <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>Painel do Expedidor — Verificação de Carga (Regra 94%)</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Confira se há peças suficientes disponíveis antes de liberar o caminhão. Mínimo: 94% do contrato.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {MOCK_LOTES.map(lote => {
              const pct = lote.meta_expedicao_pcs > 0 ? (lote.disponivel / lote.meta_expedicao_pcs) * 100 : 0
              const minimo = Math.ceil(lote.meta_expedicao_pcs * 0.94)
              const faltam = Math.max(0, minimo - lote.disponivel)
              const isGo = pct >= 94
              const isWarn = pct >= 75 && pct < 94
              const isRisk = pct < 75
              const jaConfirmado = cargas[lote.id]?.confirmado

              const statusColor = jaConfirmado ? '#10b981' : isGo ? '#10b981' : isWarn ? '#f59e0b' : '#ef4444'
              const statusBg = jaConfirmado ? 'rgba(16,185,129,0.08)' : isGo ? 'rgba(16,185,129,0.08)' : isWarn ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)'
              const statusBorder = jaConfirmado ? 'rgba(16,185,129,0.3)' : isGo ? 'rgba(16,185,129,0.3)' : isWarn ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.4)'
              const statusLabel = jaConfirmado ? '✅ CARGA CONFIRMADA' : isGo ? '✅ LIBERAR CARGA' : isWarn ? '⏳ AGUARDAR' : '🚨 RISCO — ACIONAR SUPERVISOR'

              return (
                <div
                  key={lote.id}
                  className="card-glass rounded-2xl overflow-hidden"
                  style={{ border: `2px solid ${statusBorder}`, background: statusBg }}
                >
                  {/* Status Banner */}
                  <div className="px-4 py-2 flex items-center justify-between" style={{ background: statusColor + '22' }}>
                    <span className="text-xs font-extrabold tracking-wider" style={{ color: statusColor }}>
                      {statusLabel}
                    </span>
                    {jaConfirmado && (
                      <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                        {cargas[lote.id].horario}
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    {/* Cliente */}
                    <button
                      onClick={() => setSelectedClient(lote.cliente)}
                      className="font-bold text-lg text-left hover:underline mb-1 block"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {lote.cliente}
                    </button>
                    <p className="text-[10px] font-mono mb-4" style={{ color: 'var(--color-text-muted)' }}>
                      {lote.contrato} • última leitura RFID: {lote.ultima_leitura}
                    </p>

                    {/* Números grandes */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--color-text-muted)' }}>Disponível</p>
                        <p className="text-2xl font-mono font-extrabold" style={{ color: statusColor }}>
                          {lote.disponivel.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>peças</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--color-text-muted)' }}>Mínimo (94%)</p>
                        <p className="text-2xl font-mono font-extrabold" style={{ color: 'var(--color-text-secondary)' }}>
                          {minimo.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>peças</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--color-text-muted)' }}>Contrato</p>
                        <p className="text-2xl font-mono font-extrabold" style={{ color: 'var(--color-text-secondary)' }}>
                          {lote.meta_expedicao_pcs.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>peças</p>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div className="mb-2">
                      <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>
                        <span>Progresso</span>
                        <span className="font-mono font-bold" style={{ color: statusColor }}>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {/* Barra de fundo cinza até 100% */}
                        <div className="relative h-full">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, pct)}%`, background: statusColor, boxShadow: `0 0 10px ${statusColor}88` }}
                          />
                          {/* Marcador de 94% */}
                          <div className="absolute inset-y-0" style={{ left: '94%', width: '2px', background: 'rgba(255,255,255,0.5)' }} />
                        </div>
                      </div>
                      <div className="flex justify-between text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        <span>0</span>
                        <span style={{ marginLeft: '88%' }}>94%</span>
                      </div>
                    </div>

                    {/* Faltam X peças */}
                    {!isGo && !jaConfirmado && (
                      <div className="text-xs text-center py-1.5 rounded-lg mb-3" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                        ⏳ Faltam <strong>{faltam.toLocaleString('pt-BR')} peças</strong> para atingir 94%
                        {lote.dobrando > 0 && (
                          <span style={{ color: 'var(--color-text-muted)' }}> ({lote.dobrando} pçs na dobragem)</span>
                        )}
                      </div>
                    )}

                    {/* Botão de ação */}
                    {!jaConfirmado ? (
                      <button
                        disabled={!isGo}
                        onClick={() => {
                          const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          setCargas(prev => ({ ...prev, [lote.id]: { confirmado: true, horario: agora } }))
                        }}
                        className="w-full py-3 rounded-xl font-extrabold text-sm transition-all"
                        style={{
                          background: isGo ? '#10b981' : 'rgba(255,255,255,0.05)',
                          color: isGo ? 'white' : 'var(--color-text-muted)',
                          cursor: isGo ? 'pointer' : 'not-allowed',
                          boxShadow: isGo ? '0 4px 14px rgba(16,185,129,0.4)' : 'none',
                        }}
                      >
                        {isGo ? '✅ Confirmar Liberação de Carga' : '🔒 Aguardando peças...'}
                      </button>
                    ) : (
                      <div className="w-full py-3 rounded-xl text-center text-sm font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                        🚚 Carga liberada às {cargas[lote.id].horario}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pipeline Visual — Totais da Planta (Visão Gestor) */}
      {viewMode === 'gestor' && <div className="card-glass p-6" style={{ animation: 'var(--animate-in)' }}>
        <h3 className="text-sm font-semibold mb-5 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
          🏭 Visão Geral da Planta — Fluxo Total por Setor
        </h3>
        <div className="flex items-stretch gap-0">
          {STAGES.map((stage, i) => {
            const val = totals[stage.key]
            const pct = totalNaPlanta > 0 ? (val / totalNaPlanta) * 100 : 0
            return (
              <div key={stage.key} className="flex items-center flex-1">
                <button
                  onClick={() => setSelectedStageFilter(selectedStageFilter === stage.key ? 'todos' : stage.key)}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] cursor-pointer ${selectedStageFilter === stage.key ? 'scale-[1.03]' : ''}`}
                  style={{
                    background: selectedStageFilter === stage.key ? stage.bg : 'rgba(255,255,255,0.02)',
                    borderColor: selectedStageFilter === stage.key ? stage.color : 'var(--border-subtle)',
                    boxShadow: selectedStageFilter === stage.key ? `0 0 20px ${stage.color}44` : 'none',
                  }}
                >
                  <span className="text-2xl">{stage.icon}</span>
                  <span className="text-[11px] font-bold text-center leading-tight" style={{ color: 'var(--color-text-muted)' }}>
                    {stage.label}
                  </span>
                  <span className="text-xl font-mono font-extrabold" style={{ color: stage.color }}>
                    {val.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    pçs • {pct.toFixed(1)}%
                  </span>
                  {/* Barra de volume */}
                  <div className="w-full h-1.5 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: stage.color }} />
                  </div>
                </button>
                {/* Seta de fluxo */}
                {i < STAGES.length - 1 && (
                  <div className="flex flex-col items-center px-1" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="text-xl">→</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {selectedStageFilter !== 'todos' && (
          <button
            onClick={() => setSelectedStageFilter('todos')}
            className="mt-4 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)', border: '1px solid var(--border-subtle)' }}
          >
            ✕ Limpar filtro — ver todos os clientes
          </button>
        )}
      </div>}

      {/* Tabela por Cliente (Visão Gestor) */}
      {viewMode === 'gestor' && <div className="card-glass overflow-hidden" style={{ animation: 'var(--animate-in)' }}>
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            📋 Rastreabilidade por Cliente
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,155,152,0.15)', color: 'var(--color-elis-teal)' }}>
              {filtered.length} contratos
            </span>
          </h3>
          <div className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
            <span className={`w-2 h-2 rounded-full ${pulse ? 'bg-green-400' : 'bg-green-400/30'} transition-all`} />
            Leitores RFID ativos
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left p-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Cliente / Contrato
                </th>
                {STAGES.map(s => (
                  <th key={s.key} className="text-center p-4 text-xs font-bold uppercase tracking-wider" style={{ color: s.color }}>
                    {s.icon} {s.label}
                  </th>
                ))}
                <th className="text-center p-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Progresso (Meta)
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lote, i) => {
                const totalLote = lote.sujo + lote.lavando + lote.secando + lote.dobrando + lote.disponivel
                const pctPronto = lote.meta_expedicao_pcs > 0 ? (lote.disponivel / lote.meta_expedicao_pcs) * 100 : 0
                const isReady = pctPronto >= 94
                const isRisk = pctPronto < 60

                return (
                  <tr
                    key={lote.id}
                    className="border-b border-white/5 hover:bg-white/2 transition-colors"
                    style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                  >
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedClient(lote.cliente)}
                        className="font-bold text-left hover:underline transition-colors"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {lote.cliente}
                      </button>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {lote.contrato} • última leitura: {lote.ultima_leitura}
                      </p>
                    </td>

                    {STAGES.map(stage => (
                      <td key={stage.key} className="p-2 text-center">
                        <StageCell kg={lote[stage.key]} totalMeta={lote.meta_expedicao_pcs} stage={stage} />
                      </td>
                    ))}

                    <td className="p-4">
                      <div className="flex flex-col items-center gap-2 min-w-[120px]">
                        {/* Barra geral */}
                        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(100, pctPronto)}%`,
                              background: isReady ? '#10b981' : isRisk ? '#ef4444' : '#f59e0b',
                              boxShadow: isReady ? '0 0 8px rgba(16,185,129,0.6)' : isRisk ? '0 0 8px rgba(239,68,68,0.6)' : 'none',
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm" style={{ color: isReady ? '#10b981' : isRisk ? '#ef4444' : '#f59e0b' }}>
                            {pctPronto.toFixed(1)}%
                          </span>
                          {isReady && <span className="text-[10px] font-bold text-green-400">✅ Pronto</span>}
                          {isRisk && <span className="text-[10px] font-bold text-red-400 animate-pulse">⚠️ Risco</span>}
                        </div>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                          {lote.disponivel.toLocaleString('pt-BR')} / {lote.meta_expedicao_pcs.toLocaleString('pt-BR')} peças
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Nota de integração */}
      <div className="card-glass p-4 flex items-start gap-3 border-l-4" style={{ borderLeftColor: 'var(--color-elis-teal)' }}>
        <span className="text-lg mt-0.5">📡</span>
        <div>
          <p className="text-xs font-bold" style={{ color: 'var(--color-elis-teal)' }}>Integração RFID Pendente</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Os dados exibidos são simulados para demonstração. A integração real será feita via API com o sistema RFID da planta,
            consumindo eventos de leitura de cada leitor posicionado na entrada/saída de cada setor (Recepção, Lavagem, Secagem, Calandria, Estoque).
          </p>
        </div>
      </div>

      {selectedClient && (
        <ClientModal clienteNome={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  )
}
