'use client';

import { Building2 } from 'lucide-react';
import { FluxoGeral } from './types';

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
}

interface Props {
  dados: FluxoGeral;
}

export default function FluxoTabela({ dados }: Props) {

  if (!dados.porCondominio.length) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 text-center text-zinc-500">
        Sem dados financeiros no período.
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">

      <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
        <Building2 size={16} className="text-zinc-400" />
        <h2 className="text-sm font-semibold text-zinc-700">
          Breakdown por Condomínio
        </h2>
      </div>

      {dados.porCondominio.map((item, idx) => (
        <div
          key={item.condominioId}
          className={`grid grid-cols-4 px-6 py-4 items-center ${
            idx < dados.porCondominio.length - 1
              ? 'border-b border-zinc-50'
              : ''
          }`}
        >
          <span className="text-sm text-zinc-700">
            {item.condominioNome}
          </span>

          <span className="text-sm text-emerald-600 font-semibold">
            {formatMoney(item.receita)}
          </span>

          <span className="text-sm text-red-500 font-semibold">
            {formatMoney(item.despesas)}
          </span>

          <span className="text-sm font-bold text-zinc-800">
            {formatMoney(item.margem)}
          </span>
        </div>
      ))}

    </div>
  );
}