'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Building2, Search, Check, ChevronsUpDown, Globe, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CondominioData {
  id: string;
  nome: string;
}

interface CondominioSelectorProps {
  condominios: CondominioData[];
  selectedCondo: string;
  onSelect: (condoId: string) => void;
  className?: string;
}

export default function CondominioSelector({
  condominios,
  selectedCondo,
  onSelect,
  className,
}: CondominioSelectorProps) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef    = useRef<HTMLInputElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focar no input ao abrir
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const selected = condominios.find(c => c.id === selectedCondo);
  const isGlobal = selectedCondo === 'all';

  // Filtrar e separar "Visão Global" dos condomínios reais
  const globalOption = condominios.find(c => c.id === 'all');
  const reais        = condominios.filter(c => c.id !== 'all');

  const filtrados = useMemo(() => {
    if (!search.trim()) return reais;
    const q = search.toLowerCase();
    return reais.filter(c => c.nome.toLowerCase().includes(q));
  }, [reais, search]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className={cn('px-3 py-3 border-b border-zinc-100 relative', className)} ref={containerRef}>
      <p className="text-[9.5px] font-bold tracking-[0.16em] uppercase text-zinc-400 mb-2 px-1">
        Condomínio Ativo
      </p>

      {/* ── Trigger ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
          open
            ? 'border-orange-400 ring-2 ring-orange-500/15 bg-white text-zinc-900'
            : 'border-zinc-200 bg-white text-zinc-700 hover:border-orange-300 hover:text-zinc-900',
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isGlobal
            ? <Globe size={14} className="text-zinc-400 shrink-0" />
            : <Building2 size={14} className="text-orange-500 shrink-0" />
          }
          <span className="truncate text-left">
            {selected?.nome ?? 'Selecionar...'}
          </span>
        </div>
        <ChevronsUpDown size={14} className="text-zinc-400 shrink-0" />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute left-3 right-3 z-50 mt-1 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden">

          {/* Search — só aparece se houver mais de 6 condomínios reais */}
          {reais.length > 6 && (
            <div className="p-2 border-b border-zinc-100">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Pesquisar entre ${reais.length} condomínios...`}
                  className="w-full pl-8 pr-8 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lista com scroll */}
          <div className="overflow-y-auto max-h-64 py-1">

            {/* Opção global */}
            {globalOption && !search && (
              <>
                <button
                  onClick={() => handleSelect('all')}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left',
                    selectedCondo === 'all'
                      ? 'bg-orange-50 text-orange-700 font-semibold'
                      : 'text-zinc-600 hover:bg-zinc-50',
                  )}
                >
                  <Globe size={14} className="shrink-0 text-zinc-400" />
                  <span className="flex-1 truncate">{globalOption.nome}</span>
                  {selectedCondo === 'all' && (
                    <Check size={13} className="text-orange-500 shrink-0" />
                  )}
                </button>
                <div className="mx-3 my-1 h-px bg-zinc-100" />
              </>
            )}

            {/* Condomínios filtrados */}
            {filtrados.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-zinc-400">
                Nenhum condomínio encontrado para "{search}"
              </div>
            ) : (
              filtrados.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left',
                    selectedCondo === c.id
                      ? 'bg-orange-50 text-orange-700 font-semibold'
                      : 'text-zinc-700 hover:bg-zinc-50',
                  )}
                >
                  <Building2 size={13} className="shrink-0 text-zinc-400" />
                  <span className="flex-1 truncate">{c.nome}</span>
                  {selectedCondo === c.id && (
                    <Check size={13} className="text-orange-500 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer com contador */}
          {reais.length > 6 && (
            <div className="px-3 py-2 border-t border-zinc-100 bg-zinc-50">
              <p className="text-xs text-zinc-400 text-center">
                {search
                  ? `${filtrados.length} de ${reais.length} condomínios`
                  : `${reais.length} condomínios no portfólio`
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
