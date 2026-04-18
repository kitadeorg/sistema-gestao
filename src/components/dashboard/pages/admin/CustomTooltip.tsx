'use client';

import React from 'react';

// Interfaces permanecem as mesmas
interface PayloadEntry {
  name: string;
  value: number;
  color: string;
}

// 1. Adicionamos uma prop opcional 'formatter'
interface CustomTooltipProps {
  active?: boolean;
  payload?: PayloadEntry[];
  label?: string;
  formatter?: (value: number, name?: string) => string;
}

// 2. Criamos um formatador padrão para manter o comportamento original
const defaultFormatter = (value: number): string => {
  if (value === 0) return '0 Kz';
  return `${(value / 1000).toFixed(1)}k Kz`;
};

export function CustomTooltip({
  active,
  payload,
  label,
  formatter = defaultFormatter, // 3. Usamos o formatador padrão se nenhum for passado
}: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
        <p className="mb-1 text-xs font-bold text-zinc-500">{label}</p>
        
        {payload.map((pld, index) => (
          <div key={index} style={{ color: pld.color }}>
            <p className="text-sm font-semibold">
              {/* 4. Usamos a função de formatação aqui */}
              {`${pld.name}: ${formatter(pld.value, pld.name)}`}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
}