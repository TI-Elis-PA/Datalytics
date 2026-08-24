import React from 'react';

interface ClientModalProps {
  clienteNome: string;
  onClose: () => void;
}

export default function ClientModal({ clienteNome, onClose }: ClientModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-gray-900 border border-gray-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col" 
        style={{ animation: 'var(--animate-in)' }}
      >
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-elis-teal/20 text-elis-teal flex items-center justify-center font-bold border border-elis-teal/50">
              {clienteNome.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-lg text-white leading-tight">{clienteNome}</h3>
              <p className="text-xs text-gray-400">Ficha Estratégica do Cliente</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 text-xl font-bold">✕</button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Informações Cruciais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Status do Contrato</p>
              <p className="text-sm font-bold text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400"></span> Ativo (Risco Baixo)
              </p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">SLA de Entrega (Mês)</p>
              <p className="text-sm font-bold text-white">96.5% no prazo</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Contato Principal</p>
              <p className="text-sm font-bold text-white">Dr. Marcos (Gestor Hotelaria)</p>
              <p className="text-xs text-gray-400 mt-1">📞 (11) 98888-0000</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Média Diária Coletada</p>
              <p className="text-sm font-bold text-white">1.250 kg</p>
            </div>
          </div>

          {/* Ocorrências Recentes */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-elis-teal">■</span> Últimas Ocorrências
            </h4>
            <div className="space-y-2">
              <div className="bg-gray-800/30 p-3 rounded-lg text-xs border border-gray-700/30 flex justify-between">
                <span className="text-gray-300">Reclamação de enxoval manchado (Lençol)</span>
                <span className="text-gray-500">Há 3 dias</span>
              </div>
              <div className="bg-gray-800/30 p-3 rounded-lg text-xs border border-gray-700/30 flex justify-between">
                <span className="text-gray-300">Atraso na entrega (Trânsito - Frota 03)</span>
                <span className="text-gray-500">Há 1 semana</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-800/30 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-bold bg-gray-700 text-white hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
