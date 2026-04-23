'use client';

import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { FluxoGeral } from './types';

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
}

interface Props {
  dados: FluxoGeral;
}

export default function FluxoKPIs({ dados }: Props) {

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-zinc-500">Receita Total</span>
          <TrendingUp size={16} className="text-emerald-500" />
        </div>
        <h3 className="text-2xl font-bold text-zinc-800">
          {formatMoney(dados.receitaTotal)}
        </h3>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-zinc-500">Despesas Totais</span>
          <TrendingDown size={16} className="text-red-500" />
        </div>
        <h3 className="text-2xl font-bold text-zinc-800">
          {formatMoney(dados.despesasTotal)}
        </h3>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-zinc-500">Margem Líquida</span>
          <DollarSign size={16} className="text-orange-500" />
        </div>
        <h3 className="text-2xl font-bold text-zinc-800">
          {formatMoney(dados.margemTotal)}
        </h3>
      </div>

    </div>
  );
}