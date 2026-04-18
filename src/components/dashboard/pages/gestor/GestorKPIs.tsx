'use client';

import React from 'react';
import { DollarSign, Building2, AlertTriangle, Wrench } from 'lucide-react';

interface Props {
  condominios: any[];
}

export default function GestorKPIs({ condominios }: Props) {

  const totalUnidades = condominios.reduce(
    (acc, c) => acc + (c.totalUnidades || 0),
    0
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

      {/* Receita */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500 font-medium">Receita</p>
          <DollarSign size={18} className="text-emerald-500" />
        </div>
        <h3 className="text-2xl font-bold mt-3">0.0k Kz</h3>
      </div>

      {/* Unidades */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500 font-medium">Unidades</p>
          <Building2 size={18} className="text-orange-500" />
        </div>
        <h3 className="text-2xl font-bold mt-3">{totalUnidades}</h3>
      </div>

      {/* Inadimplência */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500 font-medium">Inadimplência</p>
          <AlertTriangle size={18} className="text-amber-500" />
        </div>
        <h3 className="text-2xl font-bold mt-3">0.0%</h3>
      </div>

      {/* Ocorrências */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500 font-medium">Ocorrências</p>
          <Wrench size={18} className="text-blue-500" />
        </div>
        <h3 className="text-2xl font-bold mt-3">0</h3>
      </div>

    </div>
  );
}