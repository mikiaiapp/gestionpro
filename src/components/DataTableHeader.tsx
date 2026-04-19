import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, X } from 'lucide-react';

interface DataTableHeaderProps {
  label: string;
  field: string;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (field: string) => void;
  filterValue: string;
  onFilter: (field: string, value: string) => void;
  showSearch?: boolean;
  filterOptions?: { label: string; value: string }[];
}

export const DataTableHeader: React.FC<DataTableHeaderProps> = ({
  label,
  field,
  sortConfig,
  onSort,
  filterValue,
  onFilter,
  showSearch = true,
  filterOptions
}) => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const isSorted = sortConfig?.key === field;
  const direction = isSorted ? sortConfig.direction : null;
  const hasFilter = !!filterValue;

  return (
    <th className={`px-6 py-4 text-[12px] font-black uppercase tracking-wider relative group transition-colors ${hasFilter ? 'bg-orange-50/50' : ''}`}>
      <div className="flex items-center justify-center gap-3 relative">
        <span 
          className={`cursor-pointer transition-all flex-1 whitespace-nowrap ${isSorted || hasFilter ? 'text-gray-900 scale-[1.02]' : 'text-gray-500 group-hover:text-gray-700'}`} 
          onClick={() => onSort(field)}
        >
          {label}
        </span>
        
        <div className={`flex items-center gap-2 ${isSorted || hasFilter ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'} transition-all`}>
          {/* Sorting Control */}
          <div 
            className={`flex flex-col -space-y-1.5 cursor-pointer p-1 rounded-md transition-colors ${isSorted ? 'bg-orange-50' : 'hover:bg-gray-100'}`} 
            onClick={(e) => { e.stopPropagation(); onSort(field); }}
          >
            <ChevronUp 
              size={14} 
              className={`transition-colors ${direction === 'asc' ? 'text-orange-600 stroke-[3]' : 'text-gray-400'}`} 
            />
            <ChevronDown 
              size={14} 
              className={`transition-colors ${direction === 'desc' ? 'text-orange-600 stroke-[3]' : 'text-gray-400'}`} 
            />
          </div>

          {/* Search/Filter Trigger */}
          {showSearch && (
            <div 
              className={`p-1.5 rounded-lg transition-all cursor-pointer shadow-sm ${hasFilter || isSearchVisible ? 'bg-orange-600 text-white shadow-orange-200' : 'bg-white border border-gray-100 hover:bg-orange-50 hover:border-orange-200 text-gray-500 hover:text-orange-600'}`}
              onClick={(e) => { e.stopPropagation(); setIsSearchVisible(!isSearchVisible); }}
            >
              <Search size={14} className={hasFilter || isSearchVisible ? 'stroke-[3]' : 'stroke-[2]'} />
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Filter/Search UI */}
      {isSearchVisible && (
        <div className="absolute top-full left-0 w-64 px-3 py-3 bg-white shadow-2xl border-x border-b border-orange-100 rounded-b-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-2">
             <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-orange-600 tracking-widest">{label}</span>
                <button onClick={() => setIsSearchVisible(false)}><X size={12} className="text-gray-400 hover:text-red-500"/></button>
             </div>
             <div className="relative">
                {filterOptions ? (
                  <select
                    value={filterValue}
                    onChange={(e) => onFilter(field, e.target.value)}
                    className="w-full text-xs p-3 border-2 rounded-xl bg-gray-50 font-bold outline-none border-orange-50 focus:border-orange-400 focus:bg-white transition-all appearance-none"
                  >
                    <option value="">Cualquier {label.toLowerCase()}...</option>
                    {filterOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder={`Buscar por ${label.toLowerCase()}...`}
                      value={filterValue}
                      onChange={(e) => onFilter(field, e.target.value)}
                      className="w-full text-xs p-3 pr-8 border-2 rounded-xl bg-gray-50 font-bold outline-none border-orange-50 focus:border-orange-400 focus:bg-white transition-all"
                    />
                    {filterValue && (
                      <X 
                        size={14} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-red-500 bg-white rounded-full p-0.5"
                        onClick={() => onFilter(field, '')}
                      />
                    )}
                  </>
                )}
             </div>
          </div>
        </div>
      )}
    </th>
  );
};
