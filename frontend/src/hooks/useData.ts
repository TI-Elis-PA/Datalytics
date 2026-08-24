import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '../lib/supabase'

/* ─── Types ─── */
export interface Expedicao {
  id: string
  cliente: string
  horario_planejado: string
  horario_real: string | null
  status: 'pendente' | 'no_prazo' | 'proximo' | 'atrasado' | 'concluido'
  data: string
  peso_previsto_kg: number
  peso_expedido_kg: number
  observacoes: string | null
  planta: string
  turno: string
}

export interface ExpedicaoStats {
  total: number
  concluidos: number
  atrasados: number
  proximos: number
  no_prazo: number
  pendentes: number
  peso_previsto_total: number
  peso_expedido_total: number
}

export interface ProducaoResumo {
  entrada_total: number
  saida_total: number
  pendente: number
  eficiencia: number
  debito_d1_pcs: number // Carga herdada do dia anterior
  status: 'ok' | 'alerta' | 'sem_dados'
}

export interface ProducaoCliente {
  cliente: string
  peso_previsto: number
  peso_expedido: number
  eficiencia: number
  status: string
  horario_planejado: string
  horario_real: string | null
}

/* ─── Expedição Hook ─── */
export function useExpedicao(date?: string) {
  const [expedicoes, setExpedicoes] = useState<Expedicao[]>([])
  const [stats, setStats] = useState<ExpedicaoStats>({
    total: 0, concluidos: 0, atrasados: 0, proximos: 0, no_prazo: 0, pendentes: 0,
    peso_previsto_total: 0, peso_expedido_total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const endpoint = date ? `/expedicao/hoje?target_date=${date}` : '/expedicao/hoje'
      const res = await apiFetch<{ data: { expedicoes: Expedicao[]; stats: ExpedicaoStats } }>(endpoint)
      setExpedicoes(res.data.expedicoes)
      setStats(res.data.stats)
      setError(null)
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message)
      } else {
        setError(String(e))
      }
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchData()
    // Poll every 30s for real-time updates (replaces Supabase Realtime)
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const concluir = async (id: string, peso?: number) => {
    await apiFetch(`/expedicao/${id}/concluir`, {
      method: 'PUT',
      body: JSON.stringify({ peso_expedido_kg: peso }),
    })
    fetchData()
  }

  return { expedicoes, stats, loading, error, refetch: fetchData, concluir }
}

/* ─── Produção Hook ─── */
export function useProducao(date?: string) {
  const [resumo, setResumo] = useState<ProducaoResumo>({
    entrada_total: 0, saida_total: 0, pendente: 0, eficiencia: 0, debito_d1_pcs: 0, status: 'sem_dados',
  })
  const [porCliente, setPorCliente] = useState<ProducaoCliente[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const endpoint = date ? `/producao/hoje?target_date=${date}` : '/producao/hoje'
      const res = await apiFetch<{ data: { resumo: ProducaoResumo; por_cliente: ProducaoCliente[] } }>(endpoint)
      setResumo(res.data.resumo)
      setPorCliente(res.data.por_cliente)
    } catch (e) {
      console.error('Producao fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  return { resumo, porCliente, loading, refetch: fetchData }
}

export interface Alerta {
  id: string
  expedicao_id: string
  tipo: string
  mensagem: string
  lido: boolean
  created_at: string
  expedicao_diaria?: {
    cliente: string
    horario_planejado: string
  }
}

/* ─── Alertas Hook ─── */
export function useAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([])

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: Alerta[] }>('/expedicao/alertas')
      setAlertas(res.data)
    } catch (e) {
      console.error('Alertas fetch error:', e)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  return { alertas, refetch: fetchData }
}

export interface EstoqueItem {
  id: string
  produto: string
  categoria: 'materia_prima' | 'produto_acabado' | 'insumo' | 'embalagem' | 'quimico'
  quantidade: number
  unidade: 'kg' | 'un' | 'pallet' | 'cx' | 'litro'
  estoque_minimo: number
  localizacao: string | null
  fornecedor: string | null
  valor_unitario: number
  planta: string
  status: 'ok' | 'baixo' | 'critico'
  updated_at: string
}

export interface EstoqueResumo {
  total_itens: number
  baixos: number
  criticos: number
  saudaveis: number
  valor_total: number
}

export interface EstoqueMovimentacao {
  id: string
  estoque_id: string
  tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  observacao: string | null
  usuario: string | null
  created_at: string
}

/* ─── Estoque Hook ─── */
export function useEstoque() {
  const [itens, setItens] = useState<EstoqueItem[]>([])
  const [resumo, setResumo] = useState<EstoqueResumo>({
    total_itens: 0, baixos: 0, criticos: 0, saudaveis: 0, valor_total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [itensRes, resumoRes] = await Promise.all([
        apiFetch<{ data: EstoqueItem[] }>('/estoque/'),
        apiFetch<{ data: EstoqueResumo }>('/estoque/resumo'),
      ])
      setItens(itensRes.data)
      setResumo(resumoRes.data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const criar = async (item: Omit<EstoqueItem, 'id' | 'status' | 'updated_at' | 'planta'>) => {
    await apiFetch('/estoque/', { method: 'POST', body: JSON.stringify(item) })
    fetchData()
  }

  const atualizar = async (id: string, item: Partial<EstoqueItem>) => {
    await apiFetch(`/estoque/${id}`, { method: 'PUT', body: JSON.stringify(item) })
    fetchData()
  }

  const movimentar = async (id: string, tipo: 'entrada' | 'saida' | 'ajuste', quantidade: number, observacao?: string) => {
    await apiFetch(`/estoque/${id}/movimentacao`, {
      method: 'POST',
      body: JSON.stringify({ tipo, quantidade, observacao, usuario: 'dashboard' }),
    })
    fetchData()
  }

  const deletar = async (id: string) => {
    await apiFetch(`/estoque/${id}`, { method: 'DELETE' })
    fetchData()
  }

  return { itens, resumo, loading, error, refetch: fetchData, criar, atualizar, movimentar, deletar }
}
