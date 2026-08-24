import { useEffect } from 'react'

interface DemoModalProps {
  title: string
  onClose: () => void
}

export default function DemoModal({ title, onClose }: DemoModalProps) {
  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="kpi-modal-overlay" onClick={onClose}>
      <div className="kpi-modal-container" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div className="kpi-modal-header" style={{ borderBottomColor: 'var(--color-elis-teal)33' }}>
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="kpi-modal-body text-center p-8">
          <div className="text-4xl mb-4">🚧</div>
          <h4 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Módulo em Desenvolvimento</h4>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Este painel exibe dados de demonstração. O detalhamento completo estará disponível quando a integração da API for finalizada.
          </p>
          <button 
            onClick={onClose}
            className="mt-6 px-6 py-2 rounded-lg font-bold transition-all hover:scale-105"
            style={{ background: 'var(--color-elis-teal)', color: 'white' }}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}
