import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE } from '../lib/supabase'

interface Usuario {
  id: string
  email: string
  nome: string
  perfil: string
  ativo: boolean
  created_at: string
}

interface Solicitacao {
  id: string
  email: string
  nome: string
  justificativa: string
  status: 'pendente' | 'aprovada' | 'rejeitada'
  mensagem_resposta?: string
  created_at: string
}

const PERFIL_CONFIG: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  gestor:     { label: 'Gestor',     color: '#009B98', icon: '👑', desc: 'Acesso total ao sistema' },
  expedidor:  { label: 'Expedidor',  color: '#3B82F6', icon: '🚚', desc: 'Expedição, Produção, TV e Copiloto IA' },
  comum:      { label: 'Comum',      color: '#6B7280', icon: '👤', desc: 'NPS e Modo TV apenas' },
}

export default function Usuarios() {
  const { token, user: loggedUser } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modals
  const [userModal, setUserModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState<Usuario | null>(null)
  const [feedbackModal, setFeedbackModal] = useState<{ id: string, type: 'aprovar' | 'rejeitar', nome: string } | null>(null)
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form states
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({ id: '', nome: '', email: '', senha: '', perfil: 'comum', ativo: true })
  const [feedbackMessage, setFeedbackMessage] = useState('')

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/auth/usuarios`, { headers }).then(r => r.json()),
      fetch(`${API_BASE}/auth/solicitacoes`, { headers }).then(r => r.json())
    ]).then(([resUsr, resSol]) => {
      setUsuarios(resUsr.data || [])
      setSolicitacoes(resSol.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  // ─── USER ACTIONS ───
  const openNewUser = () => {
    setIsEditing(false)
    setForm({ id: '', nome: '', email: '', senha: '', perfil: 'comum', ativo: true })
    setError('')
    setSuccess('')
    setUserModal(true)
  }

  const openEditUser = (u: Usuario) => {
    setIsEditing(true)
    setForm({ id: u.id, nome: u.nome, email: u.email, senha: '', perfil: u.perfil, ativo: u.ativo })
    setError('')
    setSuccess('')
    setUserModal(true)
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const url = isEditing ? `${API_BASE}/auth/usuarios/${form.id}` : `${API_BASE}/auth/usuarios`
      const method = isEditing ? 'PUT' : 'POST'
      const payload: any = { ...form }
      if (isEditing && !payload.senha) delete payload.senha // Don't send empty password on edit

      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Erro desconhecido' }))
        throw new Error(err.detail || 'Erro na operação')
      }
      setSuccess(isEditing ? `Usuário "${form.nome}" atualizado!` : `Usuário "${form.nome}" criado com sucesso!`)
      fetchData()
      setTimeout(() => { setUserModal(false); setSuccess('') }, 1500)
    } catch (err: any) {
      setError(err.message || 'Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/auth/usuarios/${deleteModal.id}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error('Erro ao excluir usuário')
      fetchData()
      setDeleteModal(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── REQUEST ACTIONS ───
  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackModal) return
    setSaving(true)
    try {
      const url = `${API_BASE}/auth/solicitacoes/${feedbackModal.id}/${feedbackModal.type}`
      const res = await fetch(url, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ mensagem_resposta: feedbackMessage }) 
      })
      if (!res.ok) throw new Error('Erro ao processar solicitação')
      fetchData()
      setFeedbackModal(null)
      setFeedbackMessage('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const pendingRequests = solicitacoes.filter(s => s.status === 'pendente')
  const historyRequests = solicitacoes.filter(s => s.status !== 'pendente')

  return (
    <div className="space-y-6" style={{ animation: 'var(--animate-in)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Gerenciamento de Usuários
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Cadastre e gerencie os acessos ao sistema
          </p>
        </div>
        <button
          onClick={openNewUser}
          className="px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #009B98, #002D72)', boxShadow: '0 4px 14px rgba(0, 155, 152, 0.4)' }}
        >
          + Novo Usuário
        </button>
      </div>

      {/* Perfil Legend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(PERFIL_CONFIG).map(([key, cfg]) => {
          const count = usuarios.filter(u => u.perfil === key).length
          return (
            <div key={key} className="card-glass p-4 rounded-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-lg" style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}40` }}>
                {cfg.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{cfg.label}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{cfg.desc}</p>
              </div>
              <span className="text-2xl font-bold font-mono" style={{ color: cfg.color }}>{count}</span>
            </div>
          )
        })}
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="card-glass overflow-hidden" style={{ border: '1px solid var(--color-status-warning)' }}>
          <div className="p-4 border-b border-white/5 bg-yellow-500/10">
            <h3 className="text-sm font-semibold text-yellow-500 flex items-center gap-2">
              ⚠️ Solicitações de Acesso Pendentes ({pendingRequests.length})
            </h3>
          </div>
          <div className="overflow-auto max-h-[30vh]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Justificativa</th>
                  <th className="text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map(s => (
                  <tr key={s.id} className="hover:bg-white/5">
                    <td className="font-mono text-xs">{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="font-semibold">{s.nome}</td>
                    <td className="font-mono text-xs">{s.email}</td>
                    <td className="text-xs italic text-gray-400 max-w-xs truncate" title={s.justificativa}>{s.justificativa || '-'}</td>
                    <td className="text-right space-x-2">
                      <button onClick={() => { setFeedbackModal({ id: s.id, type: 'aprovar', nome: s.nome }); setFeedbackMessage('Olá! Seu acesso foi aprovado. Bem-vindo à Elis.') }} className="px-3 py-1 bg-green-500/20 text-green-500 text-xs font-bold rounded hover:bg-green-500/30">Aprovar</button>
                      <button onClick={() => { setFeedbackModal({ id: s.id, type: 'rejeitar', nome: s.nome }); setFeedbackMessage('') }} className="px-3 py-1 bg-red-500/20 text-red-500 text-xs font-bold rounded hover:bg-red-500/30">Rejeitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card-glass overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            👥 Usuários Cadastrados
          </h3>
        </div>
        <div className="overflow-auto max-h-[50vh]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Cadastro</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Carregando...</td></tr>
              ) : usuarios.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Nenhum usuário cadastrado.</td></tr>
              ) : (
                usuarios.map(u => {
                  const cfg = PERFIL_CONFIG[u.perfil] || PERFIL_CONFIG.comum
                  const isMe = u.email === loggedUser?.email
                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{ background: u.ativo ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: u.ativo ? 'var(--color-status-ok)' : 'var(--color-status-danger)' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.ativo ? 'var(--color-status-ok)' : 'var(--color-status-danger)' }} />
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="font-semibold">{u.nome} {isMe && <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Você</span>}</td>
                      <td className="font-mono text-xs">{u.email}</td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="text-right space-x-2">
                        <button onClick={() => openEditUser(u)} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-300">✏️ Editar</button>
                        {!isMe && (
                          <button onClick={() => setDeleteModal(u)} className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded text-xs">🗑️</button>
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

      {/* History Requests */}
      {historyRequests.length > 0 && (
        <div className="card-glass overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              📜 Histórico de Aprovações/Rejeições
            </h3>
          </div>
          <div className="overflow-auto max-h-[30vh]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Decisão</th>
                  <th>Data</th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Devolutiva (Feedback)</th>
                </tr>
              </thead>
              <tbody>
                {historyRequests.map(s => (
                  <tr key={s.id} className="hover:bg-white/5">
                    <td>
                      <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase"
                        style={{ background: s.status === 'aprovada' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: s.status === 'aprovada' ? '#10b981' : '#ef4444' }}>
                        {s.status}
                      </span>
                    </td>
                    <td className="font-mono text-xs">{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="font-semibold text-sm">{s.nome}</td>
                    <td className="font-mono text-xs">{s.email}</td>
                    <td className="text-xs italic text-gray-400 max-w-xs truncate" title={s.mensagem_resposta}>
                      {s.mensagem_resposta || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Create/Edit User */}
      {userModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setUserModal(false)}>
          <div className="w-full max-w-lg mx-4 rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {isEditing ? '✏️ Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={() => setUserModal(false)} className="text-xl opacity-50 hover:opacity-100" style={{ color: 'var(--color-text-muted)' }}>✕</button>
            </div>
            {error && <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>⚠️ {error}</div>}
            {success && <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>✅ {success}</div>}
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Nome Completo</label>
                <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#009B98]"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--color-text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>E-mail</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#009B98]"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--color-text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  {isEditing ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha'}
                </label>
                <input type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} required={!isEditing} minLength={4}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#009B98]"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--color-text-primary)' }} />
              </div>
              {isEditing && (
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} className="w-4 h-4 accent-[#009B98]" />
                  <span className="text-sm font-semibold" style={{ color: form.ativo ? 'var(--color-status-ok)' : 'var(--color-status-danger)' }}>
                    {form.ativo ? 'Conta Ativa' : 'Conta Desativada'}
                  </span>
                </label>
              )}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Perfil de Acesso</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(PERFIL_CONFIG).map(([key, cfg]) => (
                    <button key={key} type="button" onClick={() => setForm({ ...form, perfil: key })}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-105"
                      style={{ background: form.perfil === key ? `${cfg.color}20` : 'var(--color-surface-2)', border: `2px solid ${form.perfil === key ? cfg.color : 'var(--border-subtle)'}`, boxShadow: form.perfil === key ? `0 0 20px ${cfg.color}30` : 'none' }}>
                      <span className="text-2xl">{cfg.icon}</span>
                      <span className="text-xs font-bold" style={{ color: form.perfil === key ? cfg.color : 'var(--color-text-secondary)' }}>{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setUserModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-secondary)', border: '1px solid var(--border-subtle)' }}>Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #009B98, #002D72)' }}>{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteModal(null)}>
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-status-danger)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-500 mb-2">Excluir Usuário?</h3>
            <p className="text-sm text-gray-300 mb-6">Tem certeza que deseja excluir permanentemente o acesso de <strong>{deleteModal.nome}</strong>? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-600">Cancelar</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">{saving ? '...' : 'Excluir'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Feedback Approval/Rejection */}
      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setFeedbackModal(null)}>
          <div className="w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--color-surface-1)', border: `1px solid ${feedbackModal.type === 'aprovar' ? 'var(--color-status-ok)' : 'var(--color-status-danger)'}` }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2" style={{ color: feedbackModal.type === 'aprovar' ? '#10b981' : '#ef4444' }}>
              {feedbackModal.type === 'aprovar' ? 'Aprovar Acesso' : 'Rejeitar Acesso'}
            </h3>
            <p className="text-sm text-gray-400 mb-4">Você está prestes a {feedbackModal.type} o acesso de <strong>{feedbackModal.nome}</strong>.</p>
            
            <form onSubmit={submitFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Mensagem de Devolutiva (Opcional)
                </label>
                <textarea 
                  value={feedbackMessage} 
                  onChange={e => setFeedbackMessage(e.target.value)} 
                  placeholder={feedbackModal.type === 'aprovar' ? 'Ex: Bem-vindo! Seu perfil é de usuário comum.' : 'Ex: Acesso negado. Solicite autorização ao seu gerente.'}
                  rows={3} 
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none resize-none"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--color-text-primary)' }}
                />
                <p className="text-[10px] text-gray-500 mt-1">O usuário verá esta mensagem ao consultar o status do pedido.</p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setFeedbackModal(null)} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50" 
                  style={{ background: feedbackModal.type === 'aprovar' ? '#10b981' : '#ef4444' }}>
                  {saving ? 'Enviando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
