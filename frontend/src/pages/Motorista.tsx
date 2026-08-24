import { useState } from 'react';

export default function Motorista() {
  const [status, setStatus] = useState<'pendente' | 'em_local' | 'concluido'>('pendente');
  const [horario, setHorario] = useState<string | null>(null);

  const handleAction = () => {
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (status === 'pendente') {
      setStatus('em_local');
      setHorario(now);
    } else if (status === 'em_local') {
      setStatus('concluido');
      setHorario(now);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {/* Mobile Device Mockup */}
      <div className="w-full max-w-[400px] h-[800px] bg-white rounded-[3rem] overflow-hidden shadow-2xl relative border-[8px] border-gray-800">
        
        {/* Header App */}
        <div className="bg-elis-teal text-white p-6 pt-12 rounded-b-3xl shadow-md" style={{ backgroundColor: '#009b98' }}>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">App Motorista</h1>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">👤</div>
          </div>
          <p className="text-sm opacity-90">Olá, Carlos Silva</p>
          <p className="text-xs font-mono mt-1 opacity-75">Veículo: FROTA-01</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 bg-gray-50 h-full">
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Próxima Parada</span>
              <span className="text-xs font-mono bg-yellow-100 text-yellow-800 px-2 py-1 rounded">ETA: 14:30</span>
            </div>
            <h2 className="text-lg font-bold text-gray-800">Hospital São Lucas</h2>
            <p className="text-sm text-gray-500 mt-1">Av. Central, 1000 - Centro</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Contratos a entregar</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <input type="checkbox" className="w-5 h-5 accent-teal-600" defaultChecked={status === 'concluido'} disabled />
                <span className="text-sm text-gray-700">Lençóis Cirúrgicos (250kg)</span>
              </li>
              <li className="flex items-center gap-3">
                <input type="checkbox" className="w-5 h-5 accent-teal-600" defaultChecked={status === 'concluido'} disabled />
                <span className="text-sm text-gray-700">Uniformes UTIs (50kg)</span>
              </li>
            </ul>
          </div>

          {/* Action Button Area */}
          <div className="absolute bottom-12 left-6 right-6">
            {status === 'pendente' && (
              <button 
                onClick={handleAction}
                className="w-full bg-blue-600 text-white font-bold text-lg py-5 rounded-2xl shadow-[0_8px_20px_rgba(37,99,235,0.4)] active:scale-95 transition-all"
              >
                📍 Fazer Check-in (Cheguei)
              </button>
            )}
            
            {status === 'em_local' && (
              <div className="space-y-3">
                <p className="text-center text-sm font-bold text-blue-600">Chegou às {horario}</p>
                <button 
                  onClick={handleAction}
                  className="w-full bg-teal-500 text-white font-bold text-lg py-5 rounded-2xl shadow-[0_8px_20px_rgba(20,184,166,0.4)] active:scale-95 transition-all"
                >
                  ✅ Finalizar Entrega (Check-out)
                </button>
              </div>
            )}

            {status === 'concluido' && (
              <div className="bg-green-100 border border-green-200 text-green-800 p-4 rounded-xl text-center shadow-sm">
                <p className="text-2xl mb-1">🎉</p>
                <p className="font-bold">Entrega Concluída!</p>
                <p className="text-xs mt-1">Registrado às {horario} com sucesso.</p>
                <button className="mt-4 text-xs font-bold underline" onClick={() => setStatus('pendente')}>Simular próxima</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
