'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface EstadoOperacaoCardProps {
  ocupacao: number;
  isLoading: boolean;
  className?: string;
}

export default function EstadoOperacaoCard({
  ocupacao,
  isLoading,
  className,
}: EstadoOperacaoCardProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col justify-between rounded-3xl bg-zinc-900 p-8 text-white',
        className
      )}
    >
      <div>
        <h3 className="text-xl font-bold">Estado da Operação</h3>
        <p className="mt-1 text-sm text-zinc-400">Sumário de ocupação e ativos.</p>
      </div>
      <div className="text-right">
        {isLoading ? (
          // Um esqueleto mais apropriado para o valor
          <div className="mt-2 h-12 w-32 animate-pulse rounded-md bg-white/10 ml-auto"></div>
        ) : (
          <span className="text-5xl font-black">{`${ocupacao.toFixed(1)}%`}</span>
        )}
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-orange-500">
          Ocupação Média
        </p>
      </div>
    </div>
  );
}