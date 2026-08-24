import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div 
      className="w-full flex flex-col items-center overflow-x-hidden rounded-3xl relative" 
      style={{ 
        minHeight: 'calc(100vh - 120px)',
        background: 'linear-gradient(135deg, var(--color-surface-0) 0%, var(--color-surface-1) 100%)',
        animation: 'var(--animate-zoom-in)',
        boxShadow: 'var(--glass-shadow)',
        padding: '4rem 2rem'
      }}
    >
      {/* Animated Background Glows */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] rounded-full opacity-20 blur-[100px] pointer-events-none"
        style={{ background: 'var(--color-elis-teal)', animation: 'var(--animate-pulse-subtle)' }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] rounded-full opacity-20 blur-[100px] pointer-events-none"
        style={{ background: 'var(--color-elis-blue)', animation: 'var(--animate-pulse-subtle)' }}
      />

      <div className="my-auto flex flex-col items-center w-full z-10 relative">
        {/* Content Container */}
        <div className="flex flex-col items-center text-center max-w-4xl w-full mb-12">
          
          {/* Badge - Removed */}
          
          {/* Main Title */}
          <h1 className="text-4xl md:text-6xl font-extrabold text-[color:var(--color-text-primary)] leading-tight mb-10 drop-shadow-2xl">
            Não mostramos apenas o que está acontecendo. <br/>
            <span style={{ color: 'var(--color-elis-teal)' }}>
              Mostramos o que vai acontecer e como evitar.
            </span>
          </h1>
          
          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-6">
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,155,152,0.4)] hover:shadow-[0_0_30px_rgba(0,155,152,0.6)] flex items-center gap-2"
              style={{ background: 'var(--color-elis-teal)' }}
            >
              Acessar o Painel Principal
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
            <a 
              href="/tv"
              className="px-8 py-4 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2 card-glass text-[color:var(--color-text-primary)] no-underline"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Abrir Modo TV
            </a>
          </div>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          <div className="card-glass p-8 rounded-2xl text-center transition-all hover:-translate-y-2 group">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#009B98] to-[#002D72] rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-2xl">👁️</span>
            </div>
            <h3 className="font-bold text-lg mb-3 text-[color:var(--color-text-primary)]">Visibilidade 360º</h3>
            <p className="text-sm leading-relaxed text-[color:var(--color-text-secondary)]">Dashboards em tempo real integrando todas as etapas da operação logística e lavanderia.</p>
          </div>
          
          <div className="card-glass p-8 rounded-2xl text-center transition-all hover:-translate-y-2 group">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#F59E0B] to-[#E4002B] rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="font-bold text-lg mb-3 text-[color:var(--color-text-primary)]">Eficiência Operacional</h3>
            <p className="text-sm leading-relaxed text-[color:var(--color-text-secondary)]">Detecção de gargalos instantânea para tomadas de decisão ágeis da diretoria e gerentes.</p>
          </div>
          
          <div className="card-glass p-8 rounded-2xl text-center transition-all hover:-translate-y-2 group">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#3B82F6] to-[#002D72] rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="font-bold text-lg mb-3 text-[color:var(--color-text-primary)]">IA Preditiva</h3>
            <p className="text-sm leading-relaxed text-[color:var(--color-text-secondary)]">Alertas de risco automatizados antecipando problemas estruturais ou de atrasos.</p>
          </div>
        </div>
      </div>

    </div>
  )
}
