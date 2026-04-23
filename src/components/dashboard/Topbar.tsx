// components/dashboard/Topbar.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Building2, ChevronDown, User as UserIcon,
  Settings, LogOut, Menu, LayoutGrid, Check,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─────────────────────────────────────────────
// HOOK DROPDOWN
// ─────────────────────────────────────────────

function useDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return { isOpen, toggle: () => setIsOpen(p => !p), close: () => setIsOpen(false), ref };
}

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────

export function Topbar() {
  const { userData, isAdmin, isGestor } = useAuthContext();
  const {
    condominiosList,
    selectedCondo,
    setSelectedCondo,
    toggleSidebar,
  } = useDashboardContext();

  const condoDropdown    = useDropdown();
  const profileDropdown  = useDropdown();

  const handleLogout = async () => {
    toast('Tem a certeza que deseja sair?', {
      action: {
        label: 'Sair',
        onClick: async () => { await signOut(auth); },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  const handleSelectCondo = (condoId: string) => {
    setSelectedCondo(condoId);
    condoDropdown.close();
  };

  // Só admin e gestor veem o seletor de condomínio
  const mostrarSeletor = (isAdmin || isGestor) && condominiosList.length > 1;

  const selectedCondoName =
    condominiosList.find(c => c.id === selectedCondo)?.nome ?? 'Selecionar...';

  const isVisaoGlobal = selectedCondo === 'all';

  if (!userData) {
    return <div className="h-20 border-b border-zinc-100" />;
  }

  return (
    <header className="h-14 sm:h-16 theme-bg-surface backdrop-blur-md sticky top-0 z-30 px-3 sm:px-5 lg:px-8 flex items-center justify-between border-b theme-border-soft" style={{ backgroundColor: 'var(--bg-surface)' }}>

      {/* ── LADO ESQUERDO ── */}
      <div className="flex items-center gap-3">
        {/* Hamburger mobile */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>

        {/* Seletor de condomínio */}
        {mostrarSeletor && (
          <div className="relative" ref={condoDropdown.ref}>
            <button
              onClick={condoDropdown.toggle}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors text-sm font-medium',
                condoDropdown.isOpen
                  ? 'border-orange-300 bg-orange-50 text-orange-700'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50',
              )}
            >
              {isVisaoGlobal ? (
                <LayoutGrid size={16} className="text-zinc-500 flex-shrink-0" />
              ) : (
                <Building2 size={16} className="text-orange-500 flex-shrink-0" />
              )}
              <span className="max-w-[160px] truncate">{selectedCondoName}</span>
              <ChevronDown
                size={15}
                className={cn(
                  'text-zinc-400 transition-transform flex-shrink-0',
                  condoDropdown.isOpen && 'rotate-180',
                )}
              />
            </button>

            {/* Dropdown */}
            {condoDropdown.isOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden z-50">
                <div className="p-2 space-y-0.5">
                  {condominiosList.map((condo) => {
                    const isSelected = selectedCondo === condo.id;
                    const isGlobal   = condo.id === 'all';

                    return (
                      <button
                        key={condo.id}
                        onClick={() => handleSelectCondo(condo.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors text-sm',
                          isSelected
                            ? 'bg-orange-50 text-orange-700 font-semibold'
                            : 'text-zinc-700 hover:bg-zinc-50',
                        )}
                      >
                        {isGlobal
                          ? <LayoutGrid size={15} className="flex-shrink-0 text-zinc-400" />
                          : <Building2 size={15} className="flex-shrink-0 text-zinc-400" />
                        }
                        <span className="flex-1 truncate">{condo.nome}</span>
                        {isSelected && <Check size={14} className="text-orange-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Badge do condomínio para síndico/funcionário/morador (sem seletor) */}
        {!mostrarSeletor && condominiosList.length === 1 && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-600">
            <Building2 size={15} className="text-orange-500" />
            <span className="font-medium truncate max-w-[180px]">
              {condominiosList[0]?.nome ?? '—'}
            </span>
          </div>
        )}
      </div>

      {/* ── LADO DIREITO ── */}
      <div className="flex items-center gap-2">

        {/* Perfil */}
        <div className="relative" ref={profileDropdown.ref}>
          <button
            onClick={profileDropdown.toggle}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {userData.avatarUrl ? (
                <img src={userData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={16} className="text-zinc-500" />
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-zinc-900 leading-tight max-w-[120px] truncate">
                {userData.nome}
              </p>
              <p className="text-xs text-zinc-500 capitalize">{userData.role}</p>
            </div>
            <ChevronDown
              size={15}
              className={cn(
                'text-zinc-400 transition-transform hidden sm:block',
                profileDropdown.isOpen && 'rotate-180',
              )}
            />
          </button>

          {profileDropdown.isOpen && (
            <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden z-50">
              {/* Info do utilizador */}
              <div className="px-4 py-3 border-b border-zinc-100">
                <p className="text-sm font-semibold text-zinc-900 truncate">{userData.nome}</p>
                <p className="text-xs text-zinc-500 truncate">{userData.email}</p>
              </div>

              <div className="p-2 space-y-0.5">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-700 hover:bg-zinc-50 transition-colors text-left">
                  <UserIcon size={15} className="text-zinc-400" />
                  Perfil
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-700 hover:bg-zinc-50 transition-colors text-left">
                  <Settings size={15} className="text-zinc-400" />
                  Definições
                </button>
              </div>

              <div className="p-2 border-t border-zinc-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut size={15} />
                  Terminar sessão
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}