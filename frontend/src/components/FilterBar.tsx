import React from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (val: string) => void;
}

interface FilterBarProps {
  filters: FilterConfig[];
}

export default function FilterBar({ filters }: FilterBarProps) {
  if (!filters || filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 bg-[var(--color-surface-1)] p-3 rounded-lg border border-[var(--border-subtle)] shadow-sm">
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mr-2 font-medium">
        <span className="text-lg">🎯</span> Filtros:
      </div>
      
      {filters.map((filter) => (
        <div key={filter.key} className="flex items-center gap-2">
          <label htmlFor={`filter-${filter.key}`} className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
            {filter.label}
          </label>
          <select
            id={`filter-${filter.key}`}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="text-sm bg-[var(--color-surface-2)] border border-[var(--border-subtle)] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-elis-teal)] text-[var(--color-text-primary)] cursor-pointer appearance-none min-w-[120px]"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23888888%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right .7em top 50%',
              backgroundSize: '.65em auto',
              paddingRight: '2em'
            }}
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
