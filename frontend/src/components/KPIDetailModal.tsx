import { useEffect } from 'react'
import type { Expedicao, ExpedicaoStats, ProducaoResumo, ProducaoCliente } from '../hooks/useData'

export type ModalVariant = 'total' | 'expedidos' | 'atrasados' | 'eficiencia' | 'andamento' | 'proximo' | 'no_prazo'

interface KPIDetailModalProps {
  variant: ModalVariant
  onClose: () => void
  expedicoes: Expedicao[]
  stats: ExpedicaoStats
  resumo: ProducaoResumo
  porCliente: ProducaoCliente[]
}

const STATUS_LABELS: Record<string, string> = {
  concluido: '✅ Concluído',
  atrasado: '🔴 Atrasado',
  proximo: '⚠️ Próximo',
  no_prazo: '🟢 No Prazo',
  pendente: '⏳ Pendente',
}

const MODAL_CONFIG: Record<ModalVariant, { icon: string; title: string; accent: string }> = {
  total: { icon: '📋', title: 'Detalhamento — Total Previsto', accent: 'var(--color-elis-teal)' },
  expedidos: { icon: '✅', title: 'Detalhamento — Expedidos', accent: 'var(--color-status-ok)' },
  atrasados: { icon: '🔴', title: 'Detalhamento — Atrasados', accent: 'var(--color-status-danger)' },
  eficiencia: { icon: '⚡', title: 'Detalhamento — Eficiência', accent: 'var(--color-status-warning)' },
  andamento: { icon: '🚀', title: 'Detalhamento — Andamento', accent: 'var(--color-status-info)' },
  proximo: { icon: '⚠️', title: 'Detalhamento — Próximos do Limite', accent: 'var(--color-status-warning)' },
  no_prazo: { icon: '🟢', title: 'Detalhamento — No Prazo', accent: 'var(--color-status-ok)' },
}

export default function KPIDetailModal({
  variant,
  onClose,
  expedicoes,
  stats,
  resumo,
  porCliente,
}: KPIDetailModalProps) {
  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const config = MODAL_CONFIG[variant]

  return (
    <div className="kpi-modal-overlay" onClick={onClose}>
      <div className="kpi-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="kpi-modal-header" style={{ borderBottomColor: config.accent + '33' }}>
          <h3>
            <span>{config.icon}</span>
            {config.title}
          </h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="kpi-modal-body">
          {variant === 'total' && (
            <TotalPrevistoContent expedicoes={expedicoes} stats={stats} />
          )}
          {variant === 'expedidos' && (
            <ExpedidosContent expedicoes={expedicoes} stats={stats} />
          )}
          {variant === 'atrasados' && (
            <AtrasadosContent expedicoes={expedicoes} stats={stats} />
          )}
          {variant === 'eficiencia' && (
            <EficienciaContent resumo={resumo} porCliente={porCliente} expedicoes={expedicoes} />
          )}
          {variant === 'andamento' && (
            <AndamentoContent expedicoes={expedicoes} stats={stats} />
          )}
          {variant === 'proximo' && (
            <StatusListContent expedicoes={expedicoes} statusTarget="proximo" emptyText="Nenhuma expedição próxima do limite de horário." />
          )}
          {variant === 'no_prazo' && (
            <StatusListContent expedicoes={expedicoes} statusTarget="no_prazo" emptyText="Nenhuma expedição dentro do prazo no momento." />
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Total Previsto ─── */
function TotalPrevistoContent({ expedicoes, stats }: { expedicoes: Expedicao[]; stats: ExpedicaoStats }) {
  const sorted = [...expedicoes].sort((a, b) => a.horario_planejado.localeCompare(b.horario_planejado))

  return (
    <>
      <div className="kpi-modal-summary">
        <SummaryItem value={stats.total} label="Expedições" />
        <SummaryItem value={`${(stats.peso_previsto_total / 1000).toFixed(1)}t`} label="Peso Total" />
        <SummaryItem value={stats.concluidos} label="Concluídos" color="var(--color-status-ok)" />
        <SummaryItem value={stats.pendentes} label="Pendentes" color="var(--color-status-warning)" />
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
        Lista completa das expedições previstas para o dia selecionado, ordenadas por horário planejado.
      </p>

      <table className="kpi-modal-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Horário</th>
            <th>Peso (kg)</th>
            <th>Turno</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((exp) => (
            <tr key={exp.id}>
              <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{exp.cliente}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{exp.horario_planejado}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{exp.peso_previsto_kg.toLocaleString('pt-BR')}</td>
              <td style={{ textTransform: 'capitalize' }}>{exp.turno}</td>
              <td>
                <StatusBadge status={exp.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sorted.length === 0 && <EmptyState text="Nenhuma expedição prevista para este dia." />}
    </>
  )
}

/* ─── Expedidos ─── */
function ExpedidosContent({ expedicoes, stats }: { expedicoes: Expedicao[]; stats: ExpedicaoStats }) {
  const concluidos = expedicoes
    .filter((e) => e.status === 'concluido')
    .sort((a, b) => (a.horario_real || '').localeCompare(b.horario_real || ''))

  const pesoExpedido = concluidos.reduce((sum, e) => sum + e.peso_expedido_kg, 0)
  const taxaConclusao = stats.total > 0 ? ((stats.concluidos / stats.total) * 100).toFixed(1) : '0.0'

  return (
    <>
      <div className="kpi-modal-summary">
        <SummaryItem value={stats.concluidos} label="Expedidos" color="var(--color-status-ok)" />
        <SummaryItem value={`${(pesoExpedido / 1000).toFixed(1)}t`} label="Peso Expedido" />
        <SummaryItem value={`${taxaConclusao}%`} label="Taxa Conclusão" color="var(--color-elis-teal)" />
        <SummaryItem value={stats.pendentes} label="Restantes" color="var(--color-status-warning)" />
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
        Expedições concluídas com sucesso. Mostra horário real de expedição e se foi no prazo.
      </p>

      <table className="kpi-modal-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Planejado</th>
            <th>Real</th>
            <th>Peso (kg)</th>
            <th>Pontualidade</th>
          </tr>
        </thead>
        <tbody>
          {concluidos.map((exp) => {
            const noPrazo = exp.horario_real && exp.horario_real <= exp.horario_planejado
            return (
              <tr key={exp.id}>
                <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{exp.cliente}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{exp.horario_planejado}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-status-ok)' }}>
                  {exp.horario_real || '—'}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>
                  {exp.peso_expedido_kg.toLocaleString('pt-BR')}
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      background: noPrazo ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      color: noPrazo ? 'var(--color-status-ok)' : 'var(--color-status-warning)',
                    }}
                  >
                    {noPrazo ? '✅ No prazo' : '⚠️ Atrasou'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {concluidos.length === 0 && <EmptyState text="Nenhuma expedição concluída até o momento." />}
    </>
  )
}

/* ─── Atrasados ─── */
function AtrasadosContent({ expedicoes, stats }: { expedicoes: Expedicao[]; stats: ExpedicaoStats }) {
  const atrasados = expedicoes
    .filter((e) => e.status === 'atrasado')
    .sort((a, b) => a.horario_planejado.localeCompare(b.horario_planejado))

  const pesoAtrasado = atrasados.reduce((sum, e) => sum + e.peso_previsto_kg, 0)
  const taxaAtraso = stats.total > 0 ? ((stats.atrasados / stats.total) * 100).toFixed(1) : '0.0'

  // Calculate time delayed
  const calcAtraso = (horario: string) => {
    const now = new Date()
    const [h, m] = horario.split(':').map(Number)
    const planned = new Date()
    planned.setHours(h, m, 0, 0)
    const diffMs = now.getTime() - planned.getTime()
    if (diffMs <= 0) return '—'
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 60) return `${diffMin}min`
    const hours = Math.floor(diffMin / 60)
    const mins = diffMin % 60
    return `${hours}h${mins > 0 ? `${mins}min` : ''}`
  }

  return (
    <>
      <div className="kpi-modal-summary">
        <SummaryItem value={stats.atrasados} label="Atrasados" color="var(--color-status-danger)" />
        <SummaryItem value={`${(pesoAtrasado / 1000).toFixed(1)}t`} label="Peso Pendente" />
        <SummaryItem value={`${taxaAtraso}%`} label="Taxa de Atraso" color="var(--color-status-danger)" />
        <SummaryItem value={stats.total - stats.atrasados} label="Em Dia" color="var(--color-status-ok)" />
      </div>

      {stats.atrasados > 0 && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            color: 'var(--color-status-danger)',
          }}
        >
          ⚠️ <strong>{stats.atrasados} expedição(ões)</strong> ultrapassaram o horário planejado.
          Peso total pendente: <strong>{pesoAtrasado.toLocaleString('pt-BR')} kg</strong>.
          Priorize as entregas mais antigas.
        </div>
      )}

      <table className="kpi-modal-table">
        <thead>
          <tr>
            <th>Prioridade</th>
            <th>Cliente</th>
            <th>Planejado</th>
            <th>Atraso</th>
            <th>Peso (kg)</th>
          </tr>
        </thead>
        <tbody>
          {atrasados.map((exp, idx) => (
            <tr key={exp.id}>
              <td>
                <span
                  style={{
                    background: idx === 0 ? 'var(--color-status-danger)' : idx < 3 ? 'var(--color-status-warning)' : 'var(--color-surface-4)',
                    color: idx < 3 ? 'white' : 'var(--color-text-secondary)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  #{idx + 1}
                </span>
              </td>
              <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{exp.cliente}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{exp.horario_planejado}</td>
              <td
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-status-danger)',
                  fontWeight: 600,
                }}
              >
                {calcAtraso(exp.horario_planejado)}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{exp.peso_previsto_kg.toLocaleString('pt-BR')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {atrasados.length === 0 && <EmptyState text="🎉 Nenhuma expedição atrasada! Tudo em dia." />}
    </>
  )
}

/* ─── Eficiência ─── */
function EficienciaContent({
  resumo,
  porCliente,
  expedicoes,
}: {
  resumo: ProducaoResumo
  porCliente: ProducaoCliente[]
  expedicoes: Expedicao[]
}) {
  const gap = resumo.entrada_total - resumo.saida_total
  const metaOk = resumo.eficiencia >= 94

  // Calculate turno breakdown from expedições
  const porTurno = expedicoes.reduce(
    (acc, exp) => {
      const t = exp.turno || 'manha'
      if (!acc[t]) acc[t] = { previsto: 0, expedido: 0 }
      acc[t].previsto += exp.peso_previsto_kg
      acc[t].expedido += exp.peso_expedido_kg
      return acc
    },
    {} as Record<string, { previsto: number; expedido: number }>
  )

  return (
    <>
      <div className="kpi-modal-summary">
        <SummaryItem
          value={`${resumo.eficiencia.toFixed(1)}%`}
          label="Eficiência"
          color={metaOk ? 'var(--color-status-ok)' : 'var(--color-status-danger)'}
        />
        <SummaryItem value={`${(resumo.entrada_total / 1000).toFixed(1)}t`} label="Entrada Total" />
        <SummaryItem value={`${(resumo.saida_total / 1000).toFixed(1)}t`} label="Saída Total" color="var(--color-elis-teal)" />
        <SummaryItem value={`${(gap / 1000).toFixed(1)}t`} label="Gap (Pendente)" color="var(--color-status-warning)" />
      </div>

      {/* Insight box */}
      <div
        style={{
          background: metaOk ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `1px solid ${metaOk ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          borderRadius: '0.5rem',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          color: metaOk ? 'var(--color-status-ok)' : 'var(--color-status-danger)',
        }}
      >
        {metaOk ? (
          <>
            ✅ Eficiência <strong>acima da meta (≥94%)</strong>. A planta está operando dentro do esperado.
            Saída de <strong>{resumo.saida_total.toLocaleString('pt-BR')} kg</strong> para uma entrada de{' '}
            <strong>{resumo.entrada_total.toLocaleString('pt-BR')} kg</strong>.
          </>
        ) : (
          <>
            ⚠️ Eficiência <strong>abaixo da meta (94%)</strong>. Gap de{' '}
            <strong>{gap.toLocaleString('pt-BR')} kg</strong> entre entrada e saída.
            {resumo.entrada_total > 0
              ? ` Para atingir a meta, seria necessário expedir mais ${Math.ceil(resumo.entrada_total * 0.94 - resumo.saida_total).toLocaleString('pt-BR')} kg.`
              : ''}
          </>
        )}
      </div>

      {/* Breakdown por turno */}
      {Object.keys(porTurno).length > 0 && (
        <>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', marginTop: '1rem' }}>
            📊 Breakdown por Turno
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
            {Object.entries(porTurno).map(([turno, vals]) => {
              const ef = vals.previsto > 0 ? (vals.expedido / vals.previsto) * 100 : 0
              return (
                <div
                  key={turno}
                  style={{
                    background: 'var(--color-surface-3)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                    {turno === 'manha' ? '🌅 Manhã' : turno === 'tarde' ? '🌇 Tarde' : '🌙 Noite'}
                  </span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
                    {ef.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                    {vals.expedido.toLocaleString('pt-BR')} / {vals.previsto.toLocaleString('pt-BR')} kg
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Breakdown por cliente */}
      <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
        📦 Eficiência por Cliente
      </h4>
      <table className="kpi-modal-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Previsto (kg)</th>
            <th>Expedido (kg)</th>
            <th>Eficiência</th>
          </tr>
        </thead>
        <tbody>
          {porCliente.map((c, idx) => {
            const barColor =
              c.eficiencia >= 94
                ? 'var(--color-status-ok)'
                : c.eficiencia > 0
                ? 'var(--color-status-warning)'
                : 'var(--color-surface-4)'
            return (
              <tr key={idx}>
                <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{c.cliente}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{c.peso_previsto.toLocaleString('pt-BR')}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{c.peso_expedido.toLocaleString('pt-BR')}</td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: barColor }}>
                    {c.eficiencia.toFixed(1)}%
                  </span>
                  <div className="modal-eff-bar">
                    <div
                      className="modal-eff-bar-fill"
                      style={{
                        width: `${Math.min(100, c.eficiencia)}%`,
                        background: barColor,
                      }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {porCliente.length === 0 && <EmptyState text="Sem dados de produção por cliente para este dia." />}
    </>
  )
}

/* ─── Andamento ─── */
function AndamentoContent({ expedicoes, stats }: { expedicoes: Expedicao[]; stats: ExpedicaoStats }) {
  const emAndamento = expedicoes
    .filter((e) => e.status !== 'concluido')
    .sort((a, b) => a.horario_planejado.localeCompare(b.horario_planejado))

  const andamentoPct = stats.total > 0 ? ((stats.concluidos / stats.total) * 100).toFixed(1) : '0.0'

  return (
    <>
      <div className="kpi-modal-summary">
        <SummaryItem value={`${andamentoPct}%`} label="Concluído" color="var(--color-status-info)" />
        <SummaryItem value={stats.concluidos} label="Expedidos" color="var(--color-status-ok)" />
        <SummaryItem value={stats.pendentes} label="Pendentes" color="var(--color-status-warning)" />
        <SummaryItem value={stats.total} label="Total Previsto" />
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
        Acompanhamento das atividades que <strong>ainda estão em andamento</strong> (não concluídas).
      </p>

      <table className="kpi-modal-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Horário Previsto</th>
            <th>Peso (kg)</th>
            <th>Turno</th>
            <th>Status Atual</th>
          </tr>
        </thead>
        <tbody>
          {emAndamento.map((exp) => (
            <tr key={exp.id}>
              <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{exp.cliente}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{exp.horario_planejado}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{exp.peso_previsto_kg.toLocaleString('pt-BR')}</td>
              <td style={{ textTransform: 'capitalize' }}>{exp.turno}</td>
              <td>
                <StatusBadge status={exp.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {emAndamento.length === 0 && <EmptyState text="🚀 Todas as atividades do dia foram concluídas!" />}
    </>
  )
}

/* ─── Generic Status List ─── */
function StatusListContent({ expedicoes, statusTarget, emptyText }: { expedicoes: Expedicao[]; statusTarget: string; emptyText: string }) {
  const filtered = expedicoes
    .filter((e) => e.status === statusTarget)
    .sort((a, b) => a.horario_planejado.localeCompare(b.horario_planejado))

  return (
    <>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
        Lista de expedições com o status selecionado.
      </p>

      <table className="kpi-modal-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Horário Previsto</th>
            <th>Peso (kg)</th>
            <th>Turno</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((exp) => (
            <tr key={exp.id}>
              <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{exp.cliente}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{exp.horario_planejado}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{exp.peso_previsto_kg.toLocaleString('pt-BR')}</td>
              <td style={{ textTransform: 'capitalize' }}>{exp.turno}</td>
              <td>
                <StatusBadge status={exp.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && <EmptyState text={emptyText} />}
    </>
  )
}

/* ─── Shared sub-components ─── */

function SummaryItem({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="kpi-modal-summary-item">
      <span className="summary-value" style={color ? { color } : undefined}>
        {value}
      </span>
      <span className="summary-label">{label}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge badge-${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2rem',
        color: 'var(--color-text-muted)',
        fontSize: '0.875rem',
      }}
    >
      {text}
    </div>
  )
}
