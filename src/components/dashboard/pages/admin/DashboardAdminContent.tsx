// src/components/dashboard/pages/admin/DashboardAdminContent.tsx

'use client';

import React, { useMemo, useState } from 'react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import AdminKPIs from './AdminKPIs';
import AdminCharts from './AdminCharts';

export default function DashboardAdminContent() {
  // 1. Definir as datas de forma mais limpa e o condomínio selecionado
  const [selectedCondo, setSelectedCondo] = useState<string>('all'); // Exemplo: 'all' para visão global
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 1);

  // 2. Chamar o hook com um único objeto, contendo as props necessárias
  const { data, loading, error } = useAdminDashboard({
    startDate,
    endDate,
    selectedCondo,
  });

  // Memoizar cálculos derivados dos dados.
  // Este valor só será recalculado se `data` mudar.
  const ocupacaoMedia = useMemo(() => {
    if (!data || !data.kpis || !data.condominios) return 0;

    const totalUnidadesPossiveis = data.condominios.reduce(
      (sum, c) => sum + c.unidades, 0
    );

    // Evita divisão por zero
    if (totalUnidadesPossiveis === 0) return 0;

    return (data.kpis.totalUnidades / totalUnidadesPossiveis) * 100;
  }, [data]);

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Erro ao carregar os dados do dashboard.</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <main className="p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">
          VISÃO GERAL
        </h1>
        <p className="text-zinc-500 mt-1">
          Indicadores de performance baseados nos dados atuais do sistema.
        </p>
      </div>

      {/* TODO: Adicionar um seletor para mudar o `selectedCondo` */}
      {/* <CondoSelector value={selectedCondo} onChange={setSelectedCondo} /> */}

      <AdminKPIs data={data?.kpis ?? null} isLoading={loading} />

      <AdminCharts
        receitaMensalData={data?.receitaMensalData ?? null}
        ocupacaoMedia={ocupacaoMedia}
        isLoading={loading}
      />
    </main>
  );
}