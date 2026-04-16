"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, X } from "lucide-react";

interface Option {
  id: string;
  nombre: string;
  [key: string]: any;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  label?: string;
  error?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder, label, error }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => 
    o.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">{label}</label>}
      
      <div 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearchTerm("");
        }}
        className={`w-full p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all bg-[var(--background)] text-sm
          ${isOpen ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/10' : error ? 'border-red-300' : 'border-[var(--border)]'}
          ${!selectedOption ? 'text-gray-400' : 'text-[var(--foreground)] font-bold'}
        `}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.nombre : placeholder}
        </span>
        <div className="flex items-center gap-1 text-gray-400">
          {value && (
            <X 
              size={14} 
              className="hover:text-red-500 transition-colors" 
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            />
          )}
          <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[200] w-full mt-1 bg-white border border-[var(--border)] rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
          <div className="p-2 border-b border-[var(--border)] bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center italic">
                No se encontraron resultados
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between
                    ${value === opt.id ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-bold' : 'hover:bg-gray-50 text-gray-700'}
                  `}
                >
                  <span className="truncate">{opt.nombre}</span>
                  {value === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
