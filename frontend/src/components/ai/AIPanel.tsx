import { useState, useRef, useEffect } from 'react'
import { apiFetch } from '../../lib/supabase'

interface Message {
  role: 'user' | 'ai'
  content: string
  source?: string
}

export default function AIPanel() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: '🤖 Olá! Sou o assistente IA do CNN Dashboard.\n\nPergunte sobre: **eficiência**, **atrasos**, **ranking de clientes**, ou peça um **relatório do dia**.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await apiFetch<{ data: { answer: string; source: string } }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg }),
      })
      setMessages(prev => [...prev, { role: 'ai', content: res.data.answer, source: res.data.source }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'ai', content: `❌ Erro: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const quickQuestions = [
    'Relatório do dia',
    'Quem mais atrasou?',
    'Eficiência da planta',
    'Clientes pendentes',
  ]

  return (
    <div className="flex flex-col h-full" style={{ minHeight: '400px' }}>
      {/* Header */}
      <div className="p-3 border-b border-white/5 flex items-center gap-2">
        <span className="text-sm">🤖</span>
        <span className="text-xs font-semibold" style={{ color: 'var(--color-elis-teal-light)' }}>
          Assistente IA
        </span>
        <span className="realtime-dot ml-auto" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3" style={{ maxHeight: '400px' }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ animation: 'var(--animate-in)' }}
          >
            <div
              className="max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed"
              style={{
                background: msg.role === 'user' ? 'var(--color-elis-teal)' : 'var(--color-surface-3)',
                color: msg.role === 'user' ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              <div className="whitespace-pre-line">{msg.content}</div>
              {msg.source && (
                <div className="mt-1 text-[9px] opacity-50">
                  via {msg.source === 'gemini' ? '✨ Gemini AI' : '📊 Smart Analysis'}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>
              <span style={{ animation: 'var(--animate-pulse-subtle)' }}>🤖 Analisando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick questions */}
      <div className="px-3 pb-2 flex gap-1 flex-wrap">
        {quickQuestions.map(q => (
          <button
            key={q}
            onClick={() => { setInput(q); }}
            className="text-[9px] px-2 py-1 rounded-full transition-all hover:scale-105"
            style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Pergunte sobre a operação..."
          className="flex-1 text-xs px-3 py-2 rounded-lg border-none outline-none"
          style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-primary)' }}
        />
        <button
          onClick={send}
          disabled={loading}
          className="px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-105 disabled:opacity-50"
          style={{ background: 'var(--color-elis-teal)', color: 'white' }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
