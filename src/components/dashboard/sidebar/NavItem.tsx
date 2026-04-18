'use client';

import React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils'; 

// 1. Definir as variantes do componente com CVA
const navItemVariants = cva(
  // Classes base aplicadas a todos os NavItems
  'relative flex items-center group transition-all duration-150',
  {
    variants: {
      // Variante para o estado 'active'
      active: {
        true: 'bg-zinc-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.14)]',
        false: 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800',
      },
      // Variante para o estado 'disabled'
      disabled: {
        true: 'opacity-50 cursor-not-allowed',
        false: '',
      },
      // Variante para o estado 'collapsed' (responsividade)
      isCollapsed: {
        true: 'justify-center rounded-lg w-12 h-12 p-0',
        false: 'justify-between rounded-xl px-3 py-2.5',
      },
    },
    defaultVariants: {
      active: false,
      disabled: false,
      isCollapsed: false,
    },
  },
);

// Definir as variantes do ícone
const iconVariants = cva(
  'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-150',
  {
    variants: {
      active: {
        true: 'bg-white/10 text-orange-400',
        false:
          'bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200 group-hover:text-zinc-600',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

// Props do componente, incluindo as variantes do CVA e as props originais
export interface NavItemProps extends VariantProps<typeof navItemVariants> {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
}

export default function NavItem({
  href,
  icon,
  label,
  active,
  badge,
  disabled,
  isCollapsed,
}: NavItemProps) {
  return (
    <Link
      href={disabled ? '#' : href}
      aria-label={isCollapsed ? label : undefined} // Acessibilidade para o modo colapsado
      aria-disabled={!!disabled} // <-- CORREÇÃO APLICADA AQUI
      className={cn(navItemVariants({ active, disabled, isCollapsed }))}
      onClick={(e) => disabled && e.preventDefault()}
    >
      {/* Indicador de item ativo */}
      {active && !isCollapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-orange-500 rounded-r-full" />
      )}

      {/* Conteúdo principal (ícone e texto) */}
      <div
        className={cn('flex items-center gap-3', {
          'justify-center': isCollapsed,
        })}
      >
        <span className={cn(iconVariants({ active }))}>{icon}</span>

        {/* O texto e o badge só são renderizados se o menu não estiver colapsado */}
        {!isCollapsed && (
          <span
            className={`text-[13.5px] font-semibold tracking-tight ${
              active ? 'text-white' : ''
            }`}
          >
            {label}
          </span>
        )}
      </div>

      {/* Badge (notificação) */}
      {!isCollapsed && badge && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
            active ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'
          }`}
        >
          {badge}
        </span>
      )}

      {/* Dica (Tooltip) que aparece no hover quando o menu está colapsado */}
      {isCollapsed && (
        <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {label}
        </div>
      )}
    </Link>
  );
}