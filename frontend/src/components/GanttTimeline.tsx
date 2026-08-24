import React, { useState } from 'react';

// Interfaces para os dados
interface RouteTask {
  id: string;
  driver: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  status: 'on_time' | 'delayed' | 'break';
  destinations: number;
}

const mockRoutes: RouteTask[] = [
  { id: 'FROTA-01', driver: 'Carlos Silva', startTime: '06:30', endTime: '15:30', status: 'on_time', destinations: 12 },
  { id: 'FROTA-02', driver: 'João Marcos', startTime: '07:00', endTime: '16:00', status: 'on_time', destinations: 8 },
  { id: 'FROTA-03', driver: 'André Lima', startTime: '08:30', endTime: '18:30', status: 'delayed', destinations: 15 },
  { id: 'FROTA-04', driver: 'Roberto Dias', startTime: '06:00', endTime: '14:00', status: 'on_time', destinations: 6 },
  { id: 'FROTA-05', driver: 'Marcos Paulo', startTime: '10:00', endTime: '17:30', status: 'on_time', destinations: 10 },
];

export default function GanttTimeline() {
  const startHour = 6; // 06:00
  const endHour = 18; // 18:00
  const totalHours = endHour - startHour;
  
  // Gera os rótulos de tempo
  const timeLabels = Array.from({ length: totalHours + 1 }, (_, i) => {
    const hour = startHour + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Converte string "HH:mm" para minutos desde o startHour
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return ((h - startHour) * 60) + m;
  };

  // Calcula a posição e largura do bloco em porcentagem
  const getStyleForTask = (start: string, end: string) => {
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);
    const totalMins = totalHours * 60;

    const left = (startMins / totalMins) * 100;
    const width = ((endMins - startMins) / totalMins) * 100;

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - left, width)}%`,
    };
  };

  return (
    <div className="card-glass p-6 rounded-xl overflow-x-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>Linha do Tempo (Gantt) - Roteiro do Dia</h3>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Módulo Inteligente Acoplado</p>
        </div>
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: 'var(--color-status-ok)' }}></span>
            No Prazo
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: 'var(--color-status-danger)' }}></span>
            Risco de Atraso
          </div>
        </div>
      </div>

      <div className="min-w-[800px] relative">
        {/* Header de Tempo (Eixo X) */}
        <div className="flex border-b pb-2 mb-2 ml-40" style={{ borderColor: 'var(--border-subtle)' }}>
          {timeLabels.map((time, idx) => (
            <div key={time} className="flex-1 text-xs font-mono text-center" style={{ color: 'var(--color-text-muted)' }}>
              {time}
            </div>
          ))}
        </div>

        {/* Linhas de Grade de Fundo */}
        <div className="absolute top-8 bottom-0 left-40 right-0 flex pointer-events-none opacity-10">
          {timeLabels.slice(0, -1).map((_, idx) => (
            <div key={idx} className="flex-1 border-l" style={{ borderColor: 'var(--color-text-primary)' }}></div>
          ))}
          <div className="border-l" style={{ borderColor: 'var(--color-text-primary)' }}></div>
        </div>

        {/* Linhas de Veículos */}
        <div className="space-y-4 py-2">
          {mockRoutes.map((route) => {
            const { left, width } = getStyleForTask(route.startTime, route.endTime);
            const isDelayed = route.status === 'delayed';
            const bgColor = isDelayed ? 'var(--color-status-danger)' : 'var(--color-elis-teal)';
            
            return (
              <div key={route.id} className="flex items-center relative group">
                {/* Info do Veículo (Eixo Y fixo à esquerda) */}
                <div className="w-40 flex-shrink-0 pr-4">
                  <div className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{route.id}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{route.driver}</div>
                </div>

                {/* Área da Linha do Tempo */}
                <div className="flex-1 relative h-12 bg-white/5 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
                  {/* O Bloco da Rota */}
                  <div 
                    className="absolute top-1 bottom-1 rounded-md shadow-lg flex items-center px-3 cursor-pointer transition-transform hover:scale-[1.01]"
                    style={{ 
                      left, 
                      width, 
                      backgroundColor: `${bgColor}CC`, 
                      border: `1px solid ${bgColor}` 
                    }}
                  >
                    <span className="text-xs font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                      {route.startTime} - {route.endTime} ({route.destinations} paradas)
                    </span>
                    
                    {isDelayed && (
                      <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] px-1 rounded shadow-md animate-pulse">
                        Risco
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
