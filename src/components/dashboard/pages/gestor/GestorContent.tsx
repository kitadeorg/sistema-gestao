'use client';

import React from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { Building2 } from 'lucide-react';
import GestorKPIs from './GestorKPIs';
import GestorCondoList from './GestorCondoList';

export default function GestorContent() {
  const { userData, condominiosAcessiveis } = useAuthContext();
  const { condominiosList } = useDashboardContext();

  // Filtra apenas os condomínios do gestor
  const condominiosGestor = condominiosList.filter((c) =>
    condominiosAcessiveis.includes(c.id)
  );

  return (
    <main className="p-6 lg:p-8 animate-in fade-in duration-500 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">
          VISÃO DO PORTFÓLIO
        </h1>
        <p className="text-zinc-500 mt-1">
          Indicadores consolidados dos condomínios sob sua gestão.
        </p>
      </div>

      {/* KPIs */}
      <GestorKPIs condominios={condominiosGestor} />

      {/* Lista de condomínios */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-orange-500" />
          <h2 className="text-lg font-semibold text-zinc-900">
            Seus Condomínios
          </h2>
        </div>

        <GestorCondoList condominios={condominiosGestor} />
      </div>

    </main>
  );
}