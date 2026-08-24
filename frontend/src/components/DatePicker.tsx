import { useState, useRef, useEffect } from 'react'

interface DatePickerProps {
  value: string          // "YYYY-MM-DD" or ""
  onChange: (date: string) => void
  placeholder?: string
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function formatDateISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseDateISO(str: string): { year: number; month: number; day: number } | null {
  if (!str) return null
  const parts = str.split('-')
  if (parts.length !== 3) return null
  return { year: parseInt(parts[0]), month: parseInt(parts[1]) - 1, day: parseInt(parts[2]) }
}

export default function DatePicker({ value, onChange, placeholder = 'Selecionar data' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const today = new Date()
  const todayStr = formatDateISO(today.getFullYear(), today.getMonth(), today.getDate())

  const parsed = parseDateISO(value)
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth())

  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [dropUp, setDropUp] = useState(false)
  const [dropLeft, setDropLeft] = useState(false)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Sync view to value changes
  useEffect(() => {
    const p = parseDateISO(value)
    if (p) {
      setViewYear(p.year)
      setViewMonth(p.month)
    }
  }, [value])

  // Calculate if the popover should drop up or to the left based on available space
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceRight = window.innerWidth - rect.right

      setDropUp(spaceBelow < 380)
      setDropLeft(spaceRight < 320)
    }
  }, [isOpen])

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const selectDay = (day: number) => {
    onChange(formatDateISO(viewYear, viewMonth, day))
    setIsOpen(false)
  }

  const goToToday = () => {
    onChange(todayStr)
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    setIsOpen(false)
  }

  const clearDate = () => {
    onChange('')
    setIsOpen(false)
  }

  const displayText = value
    ? (() => {
        const p = parseDateISO(value)
        if (!p) return value
        return `${String(p.day).padStart(2, '0')}/${String(p.month + 1).padStart(2, '0')}/${p.year}`
      })()
    : ''

  return (
    <div ref={containerRef} className="relative inline-block" id="date-picker" style={{ zIndex: 30 }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
        style={{
          background: 'var(--color-surface-2)',
          border: `1px solid ${isOpen ? 'var(--color-elis-teal)' : 'var(--border-subtle)'}`,
          color: value ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          boxShadow: isOpen ? '0 0 12px rgba(0, 155, 152, 0.2)' : 'none',
        }}
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {displayText || placeholder}
        {value && (
          <span
            onClick={(e) => { e.stopPropagation(); clearDate() }}
            className="ml-1 hover:text-red-400 transition-colors cursor-pointer"
            title="Limpar data"
          >
            ✕
          </span>
        )}
      </button>

      {/* Calendar Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute z-50 rounded-xl overflow-hidden"
          style={{
            ...(dropUp 
              ? { bottom: '100%', marginBottom: '8px' } 
              : { top: '100%', marginTop: '8px' }),
            ...(dropLeft 
              ? { right: 0 } 
              : { left: 0 }),
            background: 'var(--color-surface-1)',
            border: '1px solid rgba(0, 155, 152, 0.25)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 155, 152, 0.08)',
            width: '300px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 155, 152, 0.1), rgba(0, 45, 114, 0.1))',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-lg font-bold"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              type="button"
            >
              ‹
            </button>
            <span
              className="text-sm font-bold tracking-wide"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-lg font-bold"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              type="button"
            >
              ›
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {WEEKDAY_LABELS.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-bold uppercase tracking-widest py-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 px-3 pb-2 gap-0.5">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dateStr = formatDateISO(viewYear, viewMonth, day)
              const isSelected = dateStr === value
              const isToday = dateStr === todayStr

              return (
                <button
                  key={day}
                  onClick={() => selectDay(day)}
                  className="h-9 w-full rounded-lg text-sm font-medium transition-all hover:scale-110"
                  style={{
                    background: isSelected
                      ? 'var(--color-elis-teal)'
                      : isToday
                      ? 'rgba(0, 155, 152, 0.12)'
                      : 'transparent',
                    color: isSelected
                      ? 'white'
                      : isToday
                      ? 'var(--color-elis-teal-light)'
                      : 'var(--color-text-secondary)',
                    border: isToday && !isSelected ? '1px solid rgba(0, 155, 152, 0.4)' : '1px solid transparent',
                    boxShadow: isSelected ? '0 0 12px rgba(0, 155, 152, 0.4)' : 'none',
                    fontWeight: isToday || isSelected ? '700' : '400',
                  }}
                  type="button"
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <button
              onClick={goToToday}
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
              style={{
                background: 'rgba(0, 155, 152, 0.1)',
                color: 'var(--color-elis-teal)',
                border: '1px solid rgba(0, 155, 152, 0.2)',
              }}
              type="button"
            >
              📅 Hoje
            </button>
            <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
              {todayStr.split('-').reverse().join('/')}
            </span>
          </div>
        </div>
      )}

      {/* Inline animation keyframe */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
