import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/supabase'
import FilterBar, { FilterConfig } from '../components/FilterBar'
interface HistEntry {
  data: string
  entrada: number
  saida: number
  eficiencia: number | string
}

interface DayStats {
  data: string
  total: number
  concluidos: number
  atrasados: number
}

interface RankingEntry {
  cliente: string
  total: number
  concluidos: number
  atrasados: number
  taxa_atraso: number
}

export default function Historico() {
  const [prodHist, setProdHist] = useState<HistEntry[]>([])
  const [expHist, setExpHist] = useState<DayStats[]>([])
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [clienteFiltro, setClienteFiltro] = useState('todos')

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: { diario: HistEntry[] } }>('/producao/historico'),
      apiFetch<{ data: DayStats[] }>('/expedicao/historico'),
      apiFetch<{ data: RankingEntry[] }>('/expedicao/ranking'),
    ]).then(([prod, exp, rank]) => {
      setProdHist(prod.data.diario || [])
      setExpHist(Array.isArray(exp.data) ? exp.data : [])
      setRanking(rank.data || [])
    }).catch(e => console.error(e)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6" style={{ animation: 'var(--animate-in)' }} id="historico-view">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          📈 Histórico & Comparativos
        </h2>
        <div className="flex gap-3">
          <FilterBar filters={[
            {
              key: 'cliente',
              label: 'Buscar Cliente',
              value: clienteFiltro,
              onChange: setClienteFiltro,
              options: [
                { value: 'todos', label: 'Todos os Clientes' },
                ...ranking.map(r => ({ value: r.cliente, label: r.cliente }))
              ]
            }
          ]} />
        </div>
      </div>

      {/* Efficiency chart - premium visualization */}
      <div className="card-glass p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              ⚡ Eficiência Diária
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Comparativo dos últimos 30 dias operacionais (Saída / Entrada)
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-mono p-2 rounded-lg" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" style={{ background: 'var(--color-verde-sustentavel)' }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>Atingiu a Meta (≥ 94%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" style={{ background: 'var(--color-status-danger)' }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>Abaixo da Meta</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-72 space-y-4">
            <div className="w-8 h-8 border-4 border-[#009B98] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Carregando dados históricos...</p>
          </div>
        ) : (
          <div className="relative h-72 mt-8 ml-10">
            {/* Background Grid Lines */}
            <div className="absolute top-0 bottom-8 left-0 right-0 z-0 pointer-events-none">
              {/* 100% Line */}
              <div className="absolute w-full border-b border-dashed opacity-20 transition-all" style={{ top: '0%', borderColor: 'var(--color-text-muted)' }}>
                <span className="absolute -top-2 -left-10 text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>100%</span>
              </div>
              {/* 50% Line */}
              <div className="absolute w-full border-b border-dashed opacity-20 transition-all" style={{ top: '50%', borderColor: 'var(--color-text-muted)' }}>
                <span className="absolute -top-2 -left-8 text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>50%</span>
              </div>
              {/* 0% Line */}
              <div className="absolute w-full border-b border-solid opacity-30 transition-all" style={{ top: '100%', borderColor: 'var(--color-text-muted)' }}>
                <span className="absolute -top-2 -left-6 text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>0%</span>
              </div>
              
              {/* Meta Line (94%) */}
              <div 
                className="absolute w-full border-b-2 border-dashed z-0 transition-all" 
                style={{ top: '6%', borderColor: 'var(--color-status-danger)', opacity: 0.6 }}
              >
                <span 
                  className="absolute -top-3 right-0 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md" 
                  style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-status-danger)', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  META: 94%
                </span>
              </div>
            </div>

            {/* Bars Area */}
            <div className="absolute top-0 bottom-0 left-0 right-0 flex items-end gap-2 sm:gap-3 overflow-x-auto overflow-y-visible custom-scrollbar z-10 pb-1">
              {prodHist.map((d, i) => {
                const ef = typeof d.eficiencia === 'string' ? parseFloat(d.eficiencia) : d.eficiencia
                const h = Math.min(100, Math.max(2, ef))
                const isOver100 = ef > 100
                const hitMeta = ef >= 94
                const color = hitMeta ? 'var(--color-verde-sustentavel)' : 'var(--color-status-danger)'
                const shadow = hitMeta ? '0 0 15px rgba(52, 211, 153, 0.15)' : '0 0 15px rgba(239, 68, 68, 0.15)'
                
                return (
                  <div key={i} className="flex flex-col items-center flex-shrink-0 group h-full justify-end relative" style={{ width: '40px' }}>
                    
                    {/* Interactive Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute bottom-[calc(100%+5px)] group-hover:bottom-[calc(100%+12px)] bg-black/90 text-white text-[11px] py-2 px-3 rounded-xl whitespace-nowrap pointer-events-none z-50 shadow-2xl border border-white/10 flex flex-col items-center backdrop-blur-md">
                      <span className="font-extrabold text-[15px] mb-1 drop-shadow-md" style={{ color }}>{ef.toFixed(1)}%</span>
                      <span className="text-gray-300 font-medium mb-1">{d.data.split('-').reverse().join('/')}</span>
                      <div className="flex gap-3 text-[10px] bg-white/5 rounded px-2 py-1 border border-white/5">
                        <span className="text-gray-400">Ent: <strong className="text-white">{d.entrada}kg</strong></span>
                        <span className="text-gray-400">Sai: <strong className="text-white">{d.saida}kg</strong></span>
                      </div>
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/90 border-r border-b border-white/10 rotate-45"></div>
                    </div>

                    {/* Bar Container matching the grid height (calc(100% - 2rem for labels)) */}
                    <div className="w-full relative flex items-end justify-center" style={{ height: 'calc(100% - 2rem)' }}>
                      <span className="absolute -top-6 text-[10px] font-mono opacity-0 group-hover:opacity-100 font-bold transition-all duration-300 transform translate-y-2 group-hover:translate-y-0" style={{ color }}>
                        {ef.toFixed(0)}%
                      </span>
                      
                      {/* Badge para eficiência >100% */}
                      {isOver100 && (
                        <span className="absolute -top-5 text-[9px] font-bold px-1 rounded" style={{ background: 'rgba(52,211,153,0.2)', color: 'var(--color-verde-sustentavel)' }}>
                          ▲
                        </span>
                      )}
                      
                      <div
                        className="w-full rounded-t-md transition-all duration-300 ease-out group-hover:brightness-125 group-hover:w-full sm:w-[80%] cursor-pointer"
                        style={{ 
                          height: `${h}%`, 
                          background: hitMeta ? 'linear-gradient(to top, var(--color-verde-sustentavel-dark), var(--color-verde-sustentavel))' : 'linear-gradient(to top, #991b1b, var(--color-status-danger))',
                          boxShadow: shadow
                        }}
                      />
                    </div>
                    
                    {/* Date Label */}
                    <span className="text-[10px] font-mono h-8 flex items-center justify-center group-hover:text-white transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                      {d.data.slice(8,10)}/{d.data.slice(5,7)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Ranking */}
      <div className="card-glass overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            🏆 Ranking de Clientes (Últimos 30 dias)
          </h3>
        </div>
        <div className="overflow-auto" style={{ maxHeight: '400px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Atrasados</th>
                <th>Concluídos</th>
                <th>Taxa Atraso</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4">Carregando...</td></tr>
              ) : ranking
                  .filter(r => clienteFiltro === 'todos' || r.cliente === clienteFiltro)
                  .map((r, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="font-mono font-bold" style={{ color: i < 3 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                  </td>
                  <td className="font-medium">{r.cliente}</td>
                  <td className="font-mono">{r.total}</td>
                  <td className="font-mono" style={{ color: Number(r.atrasados) > 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}>
                    {r.atrasados}
                  </td>
                  <td className="font-mono" style={{ color: 'var(--color-status-ok)' }}>{r.concluidos}</td>
                  <td>
                    <span className="font-mono font-bold" style={{
                      color: parseFloat(r.taxa_atraso) > 20 ? 'var(--color-status-danger)' : 'var(--color-text-secondary)'
                    }}>
                      {parseFloat(r.taxa_atraso).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
