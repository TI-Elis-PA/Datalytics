import { useState } from 'react'
import { useEstoque, type EstoqueItem } from '../hooks/useData'
import FilterBar, { FilterConfig } from '../components/FilterBar'

const CATEGORIAS: Record<string, { label: string; icon: string }> = {
  materia_prima:   { label: 'Matéria-Prima',   icon: '🧵' },
  produto_acabado: { label: 'Produto Acabado', icon: '🛏️' },
  insumo:          { label: 'Insumo',          icon: '🧴' },
  embalagem:       { label: 'Embalagem',       icon: '📦' },
  quimico:         { label: 'Químico',         icon: '⚗️' },
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  ok:      { label: 'Saudável',  color: 'var(--color-status-ok)' },
  baixo:   { label: 'Baixo',     color: 'var(--color-status-warning)' },
  critico: { label: 'Crítico',   color: 'var(--color-status-danger)' },
}

const vazio = {
  produto: '', categoria: 'produto_acabado' as EstoqueItem['categoria'],
  quantidade: 0, unidade: 'un' as EstoqueItem['unidade'], estoque_minimo: 0,
  localizacao: '', fornecedor: '', valor_unitario: 0,
}

export default function Estoque() {
  const { itens, resumo, loading, criar, atualizar, movimentar, deletar } = useEstoque()
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas')
  const [statusFiltro, setStatusFiltro] = useState<string>('todos')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [movId, setMovId] = useState<string | null>(null)
  const [form, setForm] = useState(vazio)
  const [mov, setMov] = useState({ tipo: 'entrada' as 'entrada' | 'saida' | 'ajuste', quantidade: 0, observacao: '' })
  const [saving, setSaving] = useState(false)

  const abrirNovo = () => { setForm(vazio); setEditingId(null); setModal('novo') }
  const abrirEditar = (item: EstoqueItem) => {
    setForm({
      produto: item.produto, categoria: item.categoria, quantidade: item.quantidade,
      unidade: item.unidade, estoque_minimo: item.estoque_minimo,
      localizacao: item.localizacao || '', fornecedor: item.fornecedor || '',
      valor_unitario: item.valor_unitario,
    })
    setEditingId(item.id)
    setModal('editar')
  }

  const salvar = async () => {
    if (!form.produto.trim()) return
    setSaving(true)
    try {
      if (modal === 'editar' && editingId) {
        await atualizar(editingId, form)
      } else {
        await criar(form)
      }
      setModal(null)
    } finally {
      setSaving(false)
    }
  }

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      value: statusFiltro,
      onChange: setStatusFiltro,
      options: [
        { value: 'todos', label: 'Todos' },
        { value: 'ok', label: 'Saudável' },
        { value: 'baixo', label: 'Baixo' },
        { value: 'critico', label: 'Crítico' }
      ]
    },
    {
      key: 'categoria',
      label: 'Categoria',
      value: categoriaFiltro,
      onChange: setCategoriaFiltro,
      options: [
        { value: 'todas', label: 'Todas as Categorias' },
        ...Object.entries(CATEGORIAS).map(([k, v]) => ({
          value: k, label: `${v.icon} ${v.label}`
        }))
      ]
    }
  ]

  const filteredItens = itens.filter(i => {
    if (categoriaFiltro !== 'todas' && i.categoria !== categoriaFiltro) return false;
    if (statusFiltro !== 'todos' && i.status !== statusFiltro) return false;
    return true;
  });

  return (
    <div className="space-y-6" style={{ animation: 'var(--animate-in)' }} id="estoque-view">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Estoque</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Matérias-primas, insumos e produtos acabados da planta
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-elis-teal)', boxShadow: '0 4px 10px rgba(0,155,152,0.3)' }}
        >
          + Novo Item
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <EstoqueKPI icon="📦" label="Itens Cadastrados" value={String(resumo.total_itens)} sub={`${resumo.saudaveis} saudáveis`} />
        <EstoqueKPI icon="💰" label="Valor em Estoque" value={`R$ ${resumo.valor_total.toLocaleString('pt-BR')}`} sub="estimado" />
        <EstoqueKPI icon="🟡" label="Abaixo do Mínimo" value={String(resumo.baixos)} sub="repor em breve" accent="var(--color-status-warning)" />
        <EstoqueKPI icon="🔴" label="Críticos" value={String(resumo.criticos)} sub="atenção imediata" accent="var(--color-status-danger)" />
      </div>

      {/* Table */}
      <div className="card-glass overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-white/5 gap-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            📋 Itens em Estoque
          </h3>
          <FilterBar filters={filterConfigs} />
        </div>
        <div className="overflow-auto" style={{ maxHeight: '55vh' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Qtd.</th>
                <th>Mínimo</th>
                <th>Nível</th>
                <th>Localização</th>
                <th>Valor (R$)</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-[var(--color-text-muted)]">Carregando...</td></tr>
              ) : filteredItens.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-[var(--color-text-muted)]">Nenhum item encontrado.</td></tr>
              ) : (
                filteredItens.map(item => {
                  const cfg = STATUS_CFG[item.status] || STATUS_CFG.ok
                  const pct = item.estoque_minimo > 0
                    ? Math.min(100, (item.quantidade / item.estoque_minimo) * 100)
                    : 100
                  return (
                    <tr key={item.id}>
                      <td>
                        <span
                          className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                          style={{ background: `${cfg.color}22`, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="font-medium">{item.produto}</td>
                      <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {CATEGORIAS[item.categoria]?.icon} {CATEGORIAS[item.categoria]?.label || item.categoria}
                      </td>
                      <td className="font-mono">
                        {Number(item.quantidade).toLocaleString('pt-BR')} {item.unidade}
                      </td>
                      <td className="font-mono" style={{ color: 'var(--color-text-muted)' }}>
                        {Number(item.estoque_minimo).toLocaleString('pt-BR')}
                      </td>
                      <td style={{ minWidth: '110px' }}>
                        <div className="progress-track" style={{ height: '14px' }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              fontSize: '8px',
                              borderRadius: '7px',
                              background: pct <= 50 ? 'var(--color-status-danger)' : pct < 100 ? 'var(--color-status-warning)' : 'var(--color-status-ok)',
                            }}
                          />
                        </div>
                      </td>
                      <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.localizacao || '—'}</td>
                      <td className="font-mono">{(item.quantidade * item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setMovId(item.id)}
                            className="px-2 py-1 rounded text-[10px] font-bold"
                            style={{ background: 'var(--color-surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--color-elis-teal)' }}
                            title="Registrar entrada/saída"
                          >
                            ⟲ Mov.
                          </button>
                          <button
                            onClick={() => abrirEditar(item)}
                            className="px-2 py-1 rounded text-[10px] font-bold"
                            style={{ background: 'var(--color-surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--color-text-secondary)' }}
                            title="Editar item"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => { if (confirm(`Excluir "${item.produto}"?`)) deletar(item.id) }}
                            className="px-2 py-1 rounded text-[10px] font-bold"
                            style={{ background: 'var(--color-surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--color-status-danger)' }}
                            title="Excluir item"
                          >
                            🗑️
                          </button>
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

      {/* Modal: Novo/Editar item */}
      {modal && (
        <ModalOverlay onClose={() => setModal(null)}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            {modal === 'novo' ? '➕ Novo Item de Estoque' : '✏️ Editar Item'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Produto *" className="sm:col-span-2">
              <input className="input-dark" value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })} placeholder="Ex: Lençol Hospitalar 1.80x2.60" />
            </Field>
            <Field label="Categoria">
              <select className="input-dark" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value as any })}>
                {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </Field>
            <Field label="Unidade">
              <select className="input-dark" value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value as any })}>
                {['kg', 'un', 'pallet', 'cx', 'litro'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Quantidade inicial">
              <input type="number" min={0} className="input-dark" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: Number(e.target.value) })} />
            </Field>
            <Field label="Estoque mínimo (alerta)">
              <input type="number" min={0} className="input-dark" value={form.estoque_minimo} onChange={e => setForm({ ...form, estoque_minimo: Number(e.target.value) })} />
            </Field>
            <Field label="Valor unitário (R$)">
              <input type="number" min={0} step="0.01" className="input-dark" value={form.valor_unitario} onChange={e => setForm({ ...form, valor_unitario: Number(e.target.value) })} />
            </Field>
            <Field label="Localização">
              <input className="input-dark" value={form.localizacao} onChange={e => setForm({ ...form, localizacao: e.target.value })} placeholder="Almox. A - Rack 1" />
            </Field>
            <Field label="Fornecedor">
              <input className="input-dark" value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-secondary)' }} onClick={() => setModal(null)}>Cancelar</button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--color-elis-teal)' }}
              disabled={saving || !form.produto.trim()}
              onClick={salvar}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: Movimentação */}
      {movId && (
        <ModalOverlay onClose={() => setMovId(null)}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            ⟲ Registrar Movimentação
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(['entrada', 'saida', 'ajuste'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setMov({ ...mov, tipo: t })}
                  className="px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-colors"
                  style={{
                    background: mov.tipo === t ? 'var(--color-elis-teal)' : 'var(--color-surface-3)',
                    color: mov.tipo === t ? 'white' : 'var(--color-text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {t === 'entrada' ? '📥 Entrada' : t === 'saida' ? '📤 Saída' : '⚙️ Ajuste'}
                </button>
              ))}
            </div>
            <Field label="Quantidade *">
              <input type="number" min={1} className="input-dark" value={mov.quantidade || ''} onChange={e => setMov({ ...mov, quantidade: Number(e.target.value) })} />
            </Field>
            <Field label="Observação">
              <input className="input-dark" value={mov.observacao} onChange={e => setMov({ ...mov, observacao: e.target.value })} placeholder="Ex: Reposição recebida / Baixa para expedição" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-secondary)' }} onClick={() => setMovId(null)}>Cancelar</button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--color-elis-teal)' }}
              disabled={saving || mov.quantidade <= 0}
              onClick={async () => {
                setSaving(true)
                try {
                  await movimentar(movId, mov.tipo, mov.quantidade, mov.observacao || undefined)
                  setMovId(null)
                  setMov({ tipo: 'entrada', quantidade: 0, observacao: '' })
                } finally {
                  setSaving(false)
                }
              }}
            >
              {saving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

function EstoqueKPI({ icon, label, value, sub, accent }: { icon: string; label: string; value: string; sub: string; accent?: string }) {
  return (
    <div className="card-glass p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
      <p className="font-mono text-xl font-bold" style={{ color: accent || 'var(--color-text-primary)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[10px] font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      {children}
    </label>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="card-glass rounded-2xl p-6 w-full max-w-lg"
        style={{ animation: 'var(--animate-in)' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}