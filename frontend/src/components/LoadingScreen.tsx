import React, { useEffect, useState } from 'react';
import elisLogo from '../assets/elis-logo.png';

const LoadingScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('INICIALIZANDO SISTEMA...');

  useEffect(() => {
    const sequence = [
      { p: 15, text: 'INICIALIZANDO MÓDULOS DE IA...' },
      { p: 40, text: 'CONECTANDO AO SUPABASE...' },
      { p: 70, text: 'CARREGANDO HISTÓRICO DE PRODUÇÃO...' },
      { p: 90, text: 'SINCRONIZANDO EXPEDIÇÕES...' },
      { p: 100, text: 'SISTEMA ONLINE.' }
    ];
    
    let currentStep = 0;
    
    const interval = setInterval(() => {
      if (currentStep < sequence.length) {
        setProgress(sequence[currentStep].p);
        setStatusText(sequence[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 550);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-[#0a0a0c] flex flex-col items-center justify-center font-mono overflow-hidden relative">
      {/* Background Grid for Tech Feel */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      ></div>
      
      {/* Center Console */}
      <div className="relative z-10 w-full max-w-md p-8 bg-gray-900/50 border border-blue-500/30 rounded-lg shadow-[0_0_50px_rgba(59,130,246,0.1)] backdrop-blur-sm">
        
        {/* Logo / Header */}
        <div className="flex items-center justify-center mb-8">
          <img src={elisLogo} alt="Elis Logo" className="w-16 h-16 object-contain animate-pulse drop-shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
          <h1 className="ml-4 text-3xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
            DATALYTICS
          </h1>
        </div>

        {/* Status Text */}
        <div className="h-6 mb-4 flex items-center justify-between text-blue-400 text-sm font-semibold tracking-wider">
          <span className="truncate mr-4">{statusText}</span>
          <span className="text-blue-300 flex-shrink-0">{progress}%</span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
          <div 
            className="h-full bg-blue-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.8)]"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Decorative elements */}
        <div className="mt-8 flex justify-between text-[10px] text-gray-500 tracking-widest">
          <span>SECURE_CONN: TRUE</span>
          <span>SYS_VER: 2.4.1</span>
        </div>
      </div>
      
      {/* Scanning Line Animation */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/20 opacity-50 animate-[scan_3s_ease-in-out_infinite]"></div>
      
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          10% { opacity: 0.5; }
          50% { top: 100%; opacity: 0.5; }
          90% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
