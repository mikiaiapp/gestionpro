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
}

export const DataTableHeader: React.FC<DataTableHeaderProps> = ({
  label,
  field,
  sortConfig,
  onSort,
  filterValue,
  onFilter,
  showSearch = true
}) => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const isSorted = sortConfig?.key === field;
  const direction = isSorted ? sortConfig.direction : null;

  return (
    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest relative group">
      <div className="flex items-center justify-between gap-2">
        <span className="cursor-pointer hover:text-gray-600 transition-colors flex-1" onClick={() => onSort(field)}>
          {label}
        </span>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Sorting Icons */}
          <div className="flex flex-col -space-y-1">
            <ChevronUp 
              size={12} 
              className={`cursor-pointer hover:text-orange-500 ${direction === 'asc' ? 'text-orange-600' : 'text-gray-300'}`} 
              onClick={(e) => { e.stopPropagation(); onSort(field); }} 
            />
            <ChevronDown 
              size={12} 
              className={`cursor-pointer hover:text-orange-500 ${direction === 'desc' ? 'text-orange-600' : 'text-gray-300'}`} 
              onClick={(e) => { e.stopPropagation(); onSort(field); }} 
            />
          </div>

          {/* Search Icon */}
          {showSearch && (
            <Search 
              size={12} 
              className={`cursor-pointer hover:text-orange-500 ${filterValue ? 'text-orange-600' : 'text-gray-300'}`}
              onClick={(e) => { e.stopPropagation(); setIsSearchVisible(!isSearchVisible); }}
            />
          )}

          {/* Filter Icon (Simple toggle for now or indicator) */}
          <Filter 
             size={12} 
             className="cursor-pointer text-gray-300 hover:text-orange-500"
          />
        </div>
      </div>

      {/* Inline Search Input */}
      {isSearchVisible && (
        <div className="absolute top-full left-0 w-full px-2 py-2 bg-white shadow-xl border rounded-b-xl z-10 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="relative">
             <input 
               autoFocus
               type="text" 
               placeholder={`Filtrar ${label.toLowerCase()}...`}
               value={filterValue}
               onChange={(e) => onFilter(field, e.target.value)}
               className="w-full text-[10px] p-2 pr-6 border rounded bg-gray-50 lowercase font-bold outline-none border-orange-100 focus:border-orange-400 transition-colors"
             />
             {filterValue && (
               <X 
                 size={10} 
                 className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-red-500"
                 onClick={() => onFilter(field, '')}
               />
             )}
          </div>
        </div>
      )}
    </th>
  );
};
