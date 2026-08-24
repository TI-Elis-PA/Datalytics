import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/supabase'

interface NPSComentario {
  nota: number
  comentario: string
  created_at: string
  pagina: string
}

interface NPSData {
  nps_score: number
  total: number
  promotores: number
  neutros: number
  detratores: number
  comentarios: NPSComentario[]
}

export default function NPSAdmin() {
  const [data, setData] = useState<NPSData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ data: NPSData }>('/nps/resumo')
      .then(res => setData(res.data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Carregando NPS...</div>
  if (!data) return <div className="p-8 text-center text-sm text-red-500">Erro ao carregar dados NPS</div>

  const npsColor = data.nps_score >= 75 ? 'var(--color-verde-sustentavel)' 
                 : data.nps_score >= 50 ? 'var(--color-status-warning)' 
                 : 'var(--color-status-danger)'

  return (
    <div className="space-y-6" style={{ animation: 'var(--animate-in)' }}>
      <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        ⭐ Gestão de Satisfação (NPS)
      </h2>

      {/* Hero NPS Score */}
      <div className="card-glass p-8 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Score NPS (Últimos 30 dias)
          </h3>
          <p className="font-mono text-6xl font-bold" style={{ color: npsColor }}>
            {data.nps_score}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            Baseado em {data.total} avaliações
          </p>
        </div>
        
        {/* Breakdown */}
        <div className="flex gap-4">
          <div className="text-center p-4 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
            <span className="text-2xl mb-2 block">😀</span>
            <p className="font-mono text-xl font-bold" style={{ color: 'var(--color-status-ok)' }}>
              {data.promotores}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Promotores</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
            <span className="text-2xl mb-2 block">😐</span>
            <p className="font-mono text-xl font-bold" style={{ color: 'var(--color-status-warning)' }}>
              {data.neutros}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Neutros</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
            <span className="text-2xl mb-2 block">☹️</span>
            <p className="font-mono text-xl font-bold" style={{ color: 'var(--color-status-danger)' }}>
              {data.detratores}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Detratores</p>
          </div>
        </div>
      </div>

      {/* Comentários Recentes */}
      <div className="card-glass p-6">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          💬 Últimos Comentários
        </h3>
        {data.comentarios?.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Nenhum comentário recebido ainda.</p>
        ) : (
          <div className="space-y-3">
            {data.comentarios?.map((c, i) => (
              <div key={i} className="p-4 rounded-lg flex items-start gap-3" style={{ background: 'var(--color-surface-2)' }}>
                <span className="text-xl">
                  {c.nota >= 9 ? '😀' : c.nota >= 7 ? '😐' : '☹️'}
                </span>
                <div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                    "{c.comentario}"
                  </p>
                  <p className="text-[10px] mt-2 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(c.created_at).toLocaleString('pt-BR')} • Página: {c.pagina} • Nota: {c.nota}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
