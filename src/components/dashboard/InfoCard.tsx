// components/dashboard/InfoCard.tsx
'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * Interface para cada item de informação exibido no card.
 * Inclui um ícone opcional para uma apresentação mais visual.
 */
interface InfoItemProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
}

/**
 * Interface para as props do InfoCard.
 * Permite customizar o título, os itens, o layout e o estado de carregamento.
 */
interface InfoCardProps {
  title: string;
  items: InfoItemProps[];
  layout?: 'list' | 'grid'; // 'list' (padrão) ou 'grid' (2 colunas)
  isLoading?: boolean;
}

/**
 * Sub-componente para renderizar uma única linha de informação.
 */
function InfoItemRow({ label, value, icon: Icon }: InfoItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
    </div>
  );
}

/**
 * Componente Skeleton para o estado de carregamento do InfoCard.
 */
function InfoCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 animate-pulse">
      <div className="h-6 w-1/3 bg-gray-200 rounded-md mb-6"></div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-4 w-1/4 bg-gray-200 rounded-md"></div>
            <div className="h-4 w-1/3 bg-gray-200 rounded-md"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Um card reutilizável para exibir listas de informações chave-valor.
 * Suporta layouts de lista e grade, estado de carregamento e ícones.
 */
export function InfoCard({
  title,
  items,
  layout = 'list',
  isLoading = false,
}: InfoCardProps) {

  if (isLoading) {
    return <InfoCardSkeleton />;
  }

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm">
      <h3 className="font-bold text-gray-800 mb-2 text-base sm:text-lg">{title}</h3>
      
      {/* Renderiza o layout de lista ou grade com base na prop */}
      <div className={
        layout === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-6' 
          : 'flex flex-col'
      }>
        {items.map((item, index) => (
          <InfoItemRow key={index} {...item} />
        ))}
      </div>
    </div>
  );
}