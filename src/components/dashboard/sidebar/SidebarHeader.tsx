// components/dashboard/sidebar/SidebarHeader.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { getRoleLabel } from './helpers';

interface SidebarHeaderProps {
  /** O role do usuário atual */
  userRole: string | undefined;

  /** Indica se a sidebar está recolhida */
  isCollapsed: boolean; // ✅ ADICIONADO
}

export default function SidebarHeader({
  userRole,
  isCollapsed,
}: SidebarHeaderProps) {
  const roleLabel = userRole ? getRoleLabel(userRole) : 'Carregando...';

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-7 border-b border-zinc-100">
      <Link href="/dashboard" className="flex items-center gap-3 group">
        
        {/* Logo Icon */}
        <span
          className="
            flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-zinc-900 rounded-xl 
            flex items-center justify-center 
            text-white font-black text-base sm:text-lg tracking-tighter
            shadow-lg shadow-zinc-900/20
            group-hover:bg-orange-500 group-hover:scale-105 
            transition-all duration-300
          "
        >
          M
        </span>

        {/* ✅ Só mostra nome e role se NÃO estiver colapsado */}
        {!isCollapsed && (
          <div className="leading-none">
            <p className="font-extrabold text-lg sm:text-xl tracking-tighter text-zinc-900">
              GEST<span className="text-orange-500">.</span>
            </p>

            <p
              className="
                text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase
                text-zinc-400 group-hover:text-orange-500 
                transition-colors mt-0.5
              "
            >
              {roleLabel}
            </p>
          </div>
        )}
      </Link>
    </div>
  );
}