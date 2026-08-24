import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiFetch } from '../lib/supabase';

interface AIPanelProps {
  date?: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'ai';
  text: string;
}

export const AIPanel: React.FC<AIPanelProps> = ({ date }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-ai', handleOpen);
    return () => window.removeEventListener('open-ai', handleOpen);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadInitialAnalysis();
    }
  }, [isOpen, date]);

  const loadInitialAnalysis = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          message: "Faça uma análise operacional detalhada e estruturada da expedição e produção de hoje. Organize em seções: (1) Resumo Executivo com eficiência e status geral, (2) Pontos Críticos com clientes atrasados e gargalos identificados, (3) Análise de Tendência baseada no histórico de 30 dias, (4) Recomendações de Ação concretas e priorizadas. Use emojis e negrito para destacar dados.",
          date: date || undefined
        })
      });
      setMessages([{ role: 'system', text: res.data.answer }]);
    } catch (e) {
      setMessages([{ role: 'system', text: "⚠️ Erro ao conectar com o motor de IA. Verifique se o backend está rodando." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userText = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          message: userText,
          date: date || undefined
        })
      });
      setMessages(prev => [...prev, { role: 'ai', text: res.data.answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'system', text: "⚠️ Ocorreu um erro ao consultar a IA." }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessageContent = (text: string, role: string) => {
    if (role === 'user') {
      return <p className="text-sm">{text}</p>;
    }

    const hasAlertAction = text.includes('[ACTION:ALERT_WHATSAPP]');
    const cleanText = text.replace('[ACTION:ALERT_WHATSAPP]', '');

    const handleBroadcast = async () => {
      try {
        await apiFetch('/expedicao/broadcast-atrasos', { method: 'POST' });
        alert("🚨 Alerta enviado com sucesso para todos os clientes atrasados!");
      } catch (e) {
        alert("Erro ao disparar alertas.");
      }
    };

    return (
      <div className="flex flex-col gap-2">
        {cleanText.split('\n\n').map((paragraph, i) => {
          const pText = paragraph.trim();
          if (!pText) return null;

          // Dynamic card styling based on content
          let cardClass = "ai-msg-card";
          let borderAccent = "rgba(0, 155, 152, 0.15)";
          let leftBorder = "var(--color-elis-teal)";

          if (pText.includes('⚠️') || pText.includes('🔴') || pText.toLowerCase().includes('atrasada') || pText.toLowerCase().includes('atraso')) {
            borderAccent = "rgba(239, 68, 68, 0.2)";
            leftBorder = "var(--color-status-danger)";
          } else if (pText.includes('⏰') || pText.toLowerCase().includes('limite')) {
            borderAccent = "rgba(245, 158, 11, 0.2)";
            leftBorder = "var(--color-status-warning)";
          } else if (pText.includes('🔮') || pText.toLowerCase().includes('predição') || pText.toLowerCase().includes('tendência')) {
            borderAccent = "rgba(168, 85, 247, 0.2)";
            leftBorder = "#A855F7";
          } else if (pText.includes('✅') || pText.includes('🏆')) {
            borderAccent = "rgba(16, 185, 129, 0.2)";
            leftBorder = "var(--color-status-ok)";
          }

          return (
            <div 
              key={i} 
              className={cardClass}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: `1px solid ${borderAccent}`,
                borderLeft: `3px solid ${leftBorder}`,
                background: 'var(--color-surface-2)',
                transition: 'all 0.2s ease',
              }}
            >
              <div 
                className="text-sm leading-relaxed [&_p]:m-0 [&_strong]:font-bold [&_ul]:ml-4 [&_ul]:list-disc [&_li]:my-0.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <ReactMarkdown>
                  {pText}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}
        {hasAlertAction && (
          <button 
            onClick={handleBroadcast}
            className="mt-3 w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all hover:scale-[1.02] flex justify-center items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Disparar Alerta WhatsApp
          </button>
        )}
      </div>
    );
  };

  return (
    <>


      {/* Floating Chat Window — positioned with safe margins */}
      {isOpen && (
        <div 
          className="ai-chat-window fixed z-50 flex flex-col overflow-hidden"
          style={{
            bottom: '16px',
            right: '16px',
            width: 'min(400px, calc(100vw - 32px))',
            height: 'min(600px, calc(100vh - 32px))',
            background: 'var(--color-surface-1)',
            border: '1px solid rgba(0, 155, 152, 0.25)',
            boxShadow: '0 15px 50px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 155, 152, 0.1)',
            borderRadius: '16px',
            animation: 'slide-in-from-bottom 0.3s ease-out',
          }}
        >
          {/* Header */}
          <div 
            className="ai-chat-header flex justify-between items-center px-5 py-4 border-b shrink-0"
            style={{
              background: 'linear-gradient(90deg, var(--color-surface-2), var(--color-surface-1))',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-elis-teal-light)' }}>
              🤖 Copiloto IA
              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,155,152,0.15)', color: 'var(--color-elis-teal-light)' }}>
                BETA
              </span>
            </h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/10 hover:text-red-400"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {msg.role !== 'user' && (
                  <span className="text-[10px] mb-1 ml-1 uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>
                    {msg.role === 'system' ? '📊 Análise Automática' : '🤖 Assistente'}
                  </span>
                )}
                {msg.role === 'user' && (
                  <span className="text-[10px] mb-1 mr-1 uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>
                    Você
                  </span>
                )}
                
                <div className={`max-w-[90%] ${msg.role === 'user' ? 'p-3 rounded-2xl rounded-tr-sm shadow-md' : 'w-full'}`}
                  style={msg.role === 'user' ? { background: 'var(--color-elis-teal)', color: 'white' } : undefined}
                >
                  {renderMessageContent(msg.text, msg.role)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex flex-col items-start">
                <span className="text-[10px] mb-1 ml-1 uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>🤖 Assistente</span>
                <div className="flex items-center gap-2 p-4 rounded-2xl rounded-tl-sm w-3/4 shadow-md"
                  style={{ background: 'var(--color-surface-2)', border: `1px solid var(--border-subtle)` }}
                >
                  <div className="w-2 h-2 bg-[#00C9C5] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#00C9C5] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#00C9C5] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* FAQ / Quick Suggestions */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar shrink-0 border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--color-surface-1)' }}>
            <button 
              onClick={() => setInputValue('Onde vejo as Expedições atrasadas e como notifico a gestão?')}
              className="whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors hover:bg-white/5" 
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--color-text-primary)' }}
            >
              📍 Onde vejo Expedições?
            </button>
            <button 
              onClick={() => setInputValue('O que significa Débito D-1 e como ele impacta a planta?')}
              className="whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors hover:bg-white/5" 
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--color-text-primary)' }}
            >
              📉 O que é Débito D-1?
            </button>
            <button 
              onClick={() => setInputValue('Como analisar os gráficos de Eficiência Máquinas (OEE)?')}
              className="whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors hover:bg-white/5" 
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--color-text-primary)' }}
            >
              ⚙️ OEE e Máquinas
            </button>
          </div>

          {/* Input Footer */}
          <div className="ai-chat-footer px-4 pb-3 pt-2 shrink-0" style={{ background: 'var(--color-surface-1)' }}>
            <form onSubmit={handleSend} className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Pergunte sobre a operação..."
                className="ai-chat-input w-full text-sm rounded-full pl-4 pr-12 py-3 focus:outline-none transition-colors"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-text-primary)',
                }}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-[#009B98] text-white hover:bg-[#00C9C5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </form>
            <div className="text-center mt-2">
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>IA Preditiva com Contexto Logístico</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
