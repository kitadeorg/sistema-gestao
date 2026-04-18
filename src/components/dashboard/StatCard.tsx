// components/dashboard/StatCard.tsx
'use client';

import React, { ElementType } from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';

/**
 * Interface para as props do StatCard.
 * Componente versátil para exibir métricas e estatísticas.
 */
interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  color?: 'orange' | 'blue' | 'green' | 'purple' | 'red' | 'zinc';
  trendValue?: string;
  trendDirection?: 'up' | 'down';
  isLoading?: boolean;
  onClick?: () => void;
  as?: ElementType; // Permite renderizar como 'div' ou 'button'
}

/**
 * Um card de estatísticas reutilizável e responsivo para dashboards.
 * Exibe um título, valor principal, um ícone e uma tendência opcional.
 * Suporta um estado de carregamento e pode ser clicável.
 */
export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color = 'zinc',
  trendValue,
  trendDirection,
  isLoading = false,
  onClick,
  as: Component = 'div',
}: StatCardProps) {
  // Mapeamento de cores para as classes do Tailwind.
  // Esta abordagem é segura para o PurgeCSS do Tailwind.
  const colorClasses = {
    container: {
      orange: 'bg-orange-50 border-orange-200 text-orange-900',
      blue: 'bg-blue-50 border-blue-200 text-blue-900',
      green: 'bg-green-50 border-green-200 text-green-900',
      purple: 'bg-purple-50 border-purple-200 text-purple-900',
      red: 'bg-red-50 border-red-200 text-red-900',
      zinc: 'bg-zinc-50 border-zinc-200 text-zinc-900',
    },
    icon: {
      orange: 'bg-orange-100 text-orange-600',
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      red: 'bg-red-100 text-red-600',
      zinc: 'bg-zinc-200 text-zinc-600',
    },
    trend: {
      up: 'text-green-600',
      down: 'text-red-600',
    },
  };

  // Determina o componente a ser renderizado (div ou button)
  const Tag = onClick ? 'button' : Component;

  if (isLoading) {
    return <StatCardSkeleton />;
  }

  return (
    <Tag
      onClick={onClick}
      className={`
        p-4 sm:p-6 rounded-2xl border transition-all duration-300 w-full text-left
        ${colorClasses.container[color]}
        ${onClick ? 'cursor-pointer hover:border-current hover:shadow-lg hover:-translate-y-1' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colorClasses.icon[color]}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        {trendValue && (
          <div className={`flex items-center gap-1 text-sm font-bold ${trendDirection === 'up' ? colorClasses.trend.up : colorClasses.trend.down}`}>
            {trendDirection === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold opacity-70">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
        {description && (
          <p className="text-xs sm:text-sm opacity-60 mt-2">{description}</p>
        )}
      </div>
    </Tag>
  );
}

// Componente Skeleton para o estado de carregamento
function StatCardSkeleton() {
  return (
    <div className="p-6 rounded-2xl border bg-zinc-50 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-lg bg-zinc-200"></div>
        <div className="h-5 w-16 rounded-md bg-zinc-200"></div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-1/2 rounded-md bg-zinc-200"></div>
        <div className="h-8 w-1/3 rounded-md bg-zinc-200"></div>
        <div className="h-4 w-3/4 rounded-md bg-zinc-200"></div>
      </div>
    </div>
  );
}