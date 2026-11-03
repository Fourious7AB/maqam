import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({
  placeholder = 'Search...',
  onSearch,
  value = '',
  onChange
}) {
  const [query, setQuery] = useState(value);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange?.(val);
  };

  const handleClear = () => {
    setQuery('');
    onChange?.('');
    onSearch?.('');
  };

  const handleSearch = () => {
    onSearch?.(query);
  };

  return (
    <div className="relative flex w-full items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 shadow-sm">
      <Search size={18} className="text-slate-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        className="ml-3 flex-1 bg-transparent outline-none text-slate-900 placeholder-slate-400"
      />
      {query && (
        <button
          onClick={handleClear}
          className="ml-2 rounded-full p-1 hover:bg-slate-100 transition"
        >
          <X size={16} className="text-slate-400" />
        </button>
      )}
    </div>
  );
}
