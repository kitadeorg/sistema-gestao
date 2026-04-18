// components/dashboard/sidebar/NavSection.tsx
'use client';

import React, { ReactNode } from 'react';

interface NavSectionProps {
  /** O título da seção de navegação. */
  label: string;
  /** Os componentes NavItem ou ExpandableNavItem a serem renderizados dentro da seção. */
  children: ReactNode;
  /** Indica se a sidebar está no estado colapsado. */
  isCollapsed?: boolean; // deixei opcional para não quebrar outros usos
}

/**
 * Componente que renderiza um grupo de itens de navegação na sidebar.
 * No modo colapsado, oculta o rótulo para otimizar espaço.
 */
export default function NavSection({
  label,
  children,
  isCollapsed = false,
}: NavSectionProps) {
  return (
    <section className="pt-4 first:pt-0">
      {/* Cabeçalho (Label + Linha) só aparece se NÃO estiver colapsado */}
      {!isCollapsed && (
        <div className="flex items-center gap-3 px-3 mb-2 animate-in fade-in duration-300">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
            {label}
          </h3>

          <div className="flex-1 h-px bg-zinc-200/80" />
        </div>
      )}

      <div className="space-y-1">{children}</div>
    </section>
  );
}