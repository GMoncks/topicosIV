import React from 'react';

export interface PaginationSelectorProps {
  pageSize: number;
  onPageSizeChange: (newSize: number) => void;
  options?: number[];
  disabled?: boolean;
}

export const PaginationSelector: React.FC<PaginationSelectorProps> = ({
  pageSize,
  onPageSizeChange,
  options = [4, 8, 12, 24, 40, 100],
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-300">
      <label htmlFor="pagination-size-select" className="text-xs text-gray-400 font-medium whitespace-nowrap">
        Jogos por página:
      </label>
      <div className="relative inline-block">
        <select
          id="pagination-size-select"
          aria-label="Selecionar quantidade de jogos por página"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={disabled}
          className="appearance-none bg-brand-surface border border-gray-700 hover:border-brand-purple focus:border-brand-purple text-white text-xs font-semibold rounded-lg px-3 py-1.5 pr-7 focus:outline-none transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-brand-card text-white">
              {opt}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
          <i className="fa-solid fa-chevron-down text-[10px]"></i>
        </div>
      </div>
    </div>
  );
};
