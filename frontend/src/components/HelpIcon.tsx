import React from 'react';

interface HelpIconProps {
  text: string;
}

export function HelpIcon({ text }: HelpIconProps) {
  return (
    <div className="group relative inline-flex ml-2 items-center justify-center align-middle">
      <span 
        className="w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold cursor-help transition-colors"
        style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}
      >
        ?
      </span>
      <div 
        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 p-2.5 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center font-normal tracking-normal leading-relaxed"
        style={{ background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', border: '1px solid var(--border-subtle)' }}
      >
        {text}
        <div 
          className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
          style={{ borderTopColor: 'var(--border-subtle)' }}
        ></div>
        <div 
          className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent mt-[-1px]"
          style={{ borderTopColor: 'var(--color-surface-1)' }}
        ></div>
      </div>
    </div>
  );
}
