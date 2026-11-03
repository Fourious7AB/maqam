import React from 'react';
import { Filter, X } from 'lucide-react';

export default function FilterBar({
  filters = [],
  onFilterChange,
  onClear
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex items-center gap-2 text-slate-600">
        <Filter size={16} />
        <span className="text-sm font-medium">Filters:</span>
      </div>

      {filters.map((filter) => (
        <div
          key={filter.id}
          className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm text-blue-700 border border-blue-200"
        >
          <span>{filter.label}</span>
          <button
            onClick={() => onFilterChange(filter.id)}
            className="rounded-full hover:bg-blue-100 p-0.5 transition"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {filters.length > 0 && (
        <button
          onClick={onClear}
          className="text-sm text-slate-600 hover:text-slate-900 font-medium transition"
        >
          Clear All
        </button>
      )}
    </div>
  );
}
