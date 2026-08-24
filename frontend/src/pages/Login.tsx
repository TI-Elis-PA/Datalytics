import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getDefaultRoute } from '../contexts/AuthContext';
import { API_BASE } from '../lib/supabase';

type Mode = 'login' | 'solicitar' | 'status';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLight, setIsLight] = useState(() => localStorage.getItem('login_theme') === 'light');
  
  // For status check
  const [statusResult, setStatusResult] = useState<{ status: string, mensagem_resposta: string | null, created_at: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDefaultRoute(user.perfil), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    localStorage.setItem('login_theme', isLight ? 'light' : 'dark');
  }, [isLight]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email.trim(), senha);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Credenciais inválidas');
    }
  };

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/solicitar-acesso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email: email.trim(), senha, justificativa }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Erro ao enviar solicitação');
      } else {
        setSuccess(data.message || 'Solicitação enviada!');
        setNome(''); setEmail(''); setSenha(''); setJustificativa('');
      }
    } catch {
      setError('Servidor offline.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusResult(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/solicitacoes/status?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Erro ao buscar status');
      } else {
        setStatusResult(data.data);
      }
    } catch {
      setError('Servidor offline.');
    } finally {
      setLoading(false);
    }
  };

  // Theme colors
  const bg = isLight ? '#f1f5f9' : '#0a0a0c';
  const cardBg = isLight ? 'rgba(255,255,255,0.9)' : 'rgba(17, 24, 39, 0.8)';
  const cardBorder = isLight ? 'rgba(0,155,152,0.15)' : 'rgba(0, 155, 152, 0.2)';
  const inputBg = isLight ? 'rgba(241,245,249,0.9)' : 'rgba(30, 41, 59, 0.8)';
  const inputBorder = isLight ? 'rgba(203,213,225,0.6)' : 'rgba(100, 116, 139, 0.3)';
  const textPrimary = isLight ? '#0f172a' : '#e2e8f0';
  const textSecondary = isLight ? '#475569' : '#94a3b8';
  const textMuted = isLight ? '#94a3b8' : '#64748b';
  const footerBorder = isLight ? 'rgba(203,213,225,0.4)' : 'rgba(100, 116, 139, 0.2)';

  const inputStyle = {
    background: inputBg,
    border: `1px solid ${inputBorder}`,
    color: textPrimary,
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: bg, transition: 'background 0.4s' }}>
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full blur-[120px] pointer-events-none" style={{ background: '#009B98', opacity: isLight ? 0.08 : 0.15 }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ background: '#002D72', opacity: isLight ? 0.06 : 0.10 }} />
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${isLight ? '#cbd5e1' : '#fff'} 1px, transparent 1px), linear-gradient(90deg, ${isLight ? '#cbd5e1' : '#fff'} 1px, transparent 1px)`, backgroundSize: '40px 40px', opacity: isLight ? 0.06 : 0.03 }} />

      {/* Theme Toggle */}
      <button onClick={() => setIsLight(!isLight)} className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)', border: `1px solid ${isLight ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)'}` }} title={isLight ? 'Modo Escuro' : 'Modo Claro'}>
        <span className="text-lg">{isLight ? '🌙' : '☀️'}</span>
      </button>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="rounded-2xl p-8 backdrop-blur-md shadow-2xl" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: `0 0 60px rgba(0, 155, 152, ${isLight ? '0.04' : '0.08'})`, transition: 'all 0.4s' }}>
          
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src="/elis-logo.png" alt="Elis Logo" className="w-20 h-20 object-contain mb-4 drop-shadow-[0_0_20px_rgba(0,155,152,0.4)]" />
            <h1 className="text-2xl font-bold tracking-widest" style={{ color: textPrimary }}>DATALYTICS</h1>
            <p className="text-xs mt-1 tracking-wider" style={{ color: textMuted }}>SISTEMA INTELIGENTE DE OPERAÇÕES</p>
          </div>

          {/* Mode Tabs */}
          <div className="flex rounded-lg mb-6 p-1 overflow-x-auto whitespace-nowrap hide-scrollbar" style={{ background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }}>
            <button onClick={() => { setMode('login'); setError(''); setSuccess(''); setStatusResult(null) }} className="flex-1 py-2 px-3 rounded-md text-[11px] font-bold tracking-wider transition-all" style={{ background: mode === 'login' ? '#009B98' : 'transparent', color: mode === 'login' ? '#fff' : textSecondary, boxShadow: mode === 'login' ? '0 2px 8px rgba(0,155,152,0.3)' : 'none' }}>
              ENTRAR
            </button>
            <button onClick={() => { setMode('solicitar'); setError(''); setSuccess(''); setStatusResult(null) }} className="flex-1 py-2 px-3 rounded-md text-[11px] font-bold tracking-wider transition-all" style={{ background: mode === 'solicitar' ? '#009B98' : 'transparent', color: mode === 'solicitar' ? '#fff' : textSecondary, boxShadow: mode === 'solicitar' ? '0 2px 8px rgba(0,155,152,0.3)' : 'none' }}>
              SOLICITAR
            </button>
            <button onClick={() => { setMode('status'); setError(''); setSuccess(''); setStatusResult(null) }} className="flex-1 py-2 px-3 rounded-md text-[11px] font-bold tracking-wider transition-all" style={{ background: mode === 'status' ? '#009B98' : 'transparent', color: mode === 'status' ? '#fff' : textSecondary, boxShadow: mode === 'status' ? '0 2px 8px rgba(0,155,152,0.3)' : 'none' }}>
              STATUS
            </button>
          </div>

          {error && <div className="mb-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>⚠️ {error}</div>}
          {success && <div className="mb-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>✅ {success}</div>}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: textSecondary }}>E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu.email@elis.com" required className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-[#009B98]" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: textSecondary }}>Senha</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-[#009B98] pr-12" style={inputStyle} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-lg opacity-50 hover:opacity-100 transition-opacity" tabIndex={-1}>{showPassword ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50" style={{ background: loading ? (isLight ? '#e2e8f0' : '#1e293b') : 'linear-gradient(135deg, #009B98, #002D72)', boxShadow: loading ? 'none' : '0 4px 20px rgba(0,155,152,0.3)' }}>
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Autenticando...</span> : 'Entrar no Sistema'}
              </button>
            </form>
          )}

          {/* Access Request Form */}
          {mode === 'solicitar' && (
            <form onSubmit={handleSolicitar} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: textSecondary }}>Nome Completo</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" required className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#009B98]" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: textSecondary }}>E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu.email@elis.com" required className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#009B98]" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: textSecondary }}>Senha desejada</label>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 4 caracteres" required minLength={4} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#009B98]" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: textSecondary }}>Justificativa <span className="opacity-50">(opcional)</span></label>
                <textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} placeholder="Por que precisa de acesso?" rows={3} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#009B98] resize-none" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50" style={{ background: loading ? (isLight ? '#e2e8f0' : '#1e293b') : 'linear-gradient(135deg, #009B98, #002D72)', boxShadow: loading ? 'none' : '0 4px 20px rgba(0,155,152,0.3)' }}>
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</span> : '📩 Enviar Solicitação'}
              </button>
            </form>
          )}

          {/* Status Check Form */}
          {mode === 'status' && (
            <div className="space-y-4">
              <form onSubmit={handleCheckStatus} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: textSecondary }}>E-mail da Solicitação</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu.email@elis.com" required className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-[#009B98]" style={inputStyle} />
                </div>
                <button type="submit" disabled={loading || !email} className="w-full py-3 rounded-lg font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50" style={{ background: loading ? (isLight ? '#e2e8f0' : '#1e293b') : 'linear-gradient(135deg, #009B98, #002D72)', boxShadow: loading ? 'none' : '0 4px 20px rgba(0,155,152,0.3)' }}>
                  {loading ? 'Consultando...' : '🔍 Consultar Status'}
                </button>
              </form>

              {statusResult && (
                <div className="mt-6 p-5 rounded-xl" style={{ background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)', border: `1px solid ${inputBorder}` }}>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: textSecondary }}>Resultado da Consulta</h4>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase" style={{
                      background: statusResult.status === 'aprovada' ? 'rgba(16,185,129,0.1)' : statusResult.status === 'rejeitada' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                      color: statusResult.status === 'aprovada' ? '#10b981' : statusResult.status === 'rejeitada' ? '#ef4444' : '#eab308'
                    }}>
                      {statusResult.status}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: textMuted }}>{new Date(statusResult.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  
                  {statusResult.mensagem_resposta && (
                    <div className="p-3 rounded-lg" style={{ background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', borderLeft: '4px solid #009B98' }}>
                      <p className="text-[10px] font-bold uppercase mb-1" style={{ color: textMuted }}>Mensagem do Gestor:</p>
                      <p className="text-sm italic" style={{ color: textPrimary }}>"{statusResult.mensagem_resposta}"</p>
                    </div>
                  )}
                  
                  {statusResult.status === 'aprovada' && (
                    <button onClick={() => setMode('login')} className="mt-4 text-xs font-bold w-full text-center hover:underline" style={{ color: '#009B98' }}>
                      Ir para Login →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t flex justify-between items-center text-[10px]" style={{ borderColor: footerBorder, color: textMuted }}>
            <span>SECURE_AUTH: HMAC-SHA256</span>
            <span>v2.4.2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
