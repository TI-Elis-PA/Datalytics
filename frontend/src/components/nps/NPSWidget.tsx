import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/supabase'
import { useLocation } from 'react-router-dom'

const NPS_STORAGE_KEY = 'datalytics_nps_voted'

export default function NPSWidget() {
  const [showCard, setShowCard] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [thankYou, setThankYou] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState<'happy' | 'neutral' | 'sad' | null>(null)
  const location = useLocation()

  // Don't show on TV mode
  if (location.pathname === '/tv') return null

  // Check localStorage — if already voted, never render again
  useEffect(() => {
    const stored = localStorage.getItem(NPS_STORAGE_KEY)
    if (stored) {
      setSubmitted(true)
    }
  }, [])

  const submit = async (emoji: 'happy' | 'neutral' | 'sad') => {
    const nota = emoji === 'happy' ? 10 : emoji === 'neutral' ? 7 : 4
    try {
      await apiFetch('/nps/', {
        method: 'POST',
        body: JSON.stringify({
          nota,
          emoji,
          comentario: comment || null,
          pagina: location.pathname.replace('/', '') || 'dashboard',
        }),
      })
    } catch (e) {
      console.error('NPS submit error:', e)
    }
    localStorage.setItem(NPS_STORAGE_KEY, 'true')
    setSubmitted(true)
    setThankYou(true)
    setTimeout(() => {
      setShowCard(false)
      setThankYou(false)
    }, 2500)
  }

  // Already voted — render nothing
  if (submitted && !thankYou) return null

  return (
    <div className="relative">
      {/* Star button in header — only shown if not yet voted */}
      {!submitted && !showCard && (
        <button
          onClick={() => setShowCard(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--border-subtle)',
          }}
          title="Avaliar este painel"
        >
          <span className="text-lg">⭐</span>
        </button>
      )}

      {/* Dropdown card positioned below the button */}
      {showCard && (
        <div
          className="absolute top-full right-0 mt-2 w-72 rounded-xl p-5 z-50"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid rgba(0,155,152,0.15)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            animation: 'var(--animate-in)',
          }}
        >
          {thankYou ? (
            <div className="text-center py-3">
              <p className="text-sm font-medium" style={{ color: 'var(--color-elis-teal-light)' }}>
                ✅ Obrigado pelo feedback!
              </p>
            </div>
          ) : (
            <>
              {/* Close */}
              <button
                onClick={() => setShowCard(false)}
                className="absolute top-2 right-3 text-xs transition-colors hover:text-red-400"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>

              <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Este painel ajudou na sua decisão hoje?
              </p>
              <p className="text-[10px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Sua opinião nos ajuda a melhorar! 🚀
              </p>

              {/* Emoji buttons */}
              <div className="flex justify-center gap-4 mb-3">
                {[
                  { emoji: '😀', value: 'happy' as const, label: 'Sim!' },
                  { emoji: '😐', value: 'neutral' as const, label: 'Neutro' },
                  { emoji: '☹️', value: 'sad' as const, label: 'Não' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSelectedEmoji(opt.value)
                      if (showComment) {
                        submit(opt.value)
                      } else {
                        setShowComment(true)
                      }
                    }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all hover:scale-110 hover:bg-white/5 ${selectedEmoji === opt.value ? 'ring-2 ring-[var(--color-elis-teal)] scale-110' : ''}`}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Optional comment + submit */}
              {showComment && selectedEmoji && (
                <div style={{ animation: 'var(--animate-in)' }}>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Sugestão? (opcional)"
                    rows={2}
                    className="w-full text-xs p-2 rounded-lg border-none outline-none resize-none mb-2"
                    style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-primary)' }}
                  />
                  <button
                    onClick={() => submit(selectedEmoji)}
                    className="w-full py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                    style={{ background: 'var(--color-elis-teal)' }}
                  >
                    Enviar Avaliação
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

