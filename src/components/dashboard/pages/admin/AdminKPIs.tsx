// src/components/dashboard/pages/admin/AdminKPIs.tsx

'use client';

import React from 'react';
import {
  DollarSign,
  Users,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { KPIData } from '@/types/admin';

// ===================================================================
// 1. DEFINIÇÃO DOS SUB-COMPONENTES E TIPOS
// ===================================================================

type TrendStatus = 'positive' | 'negative' | 'neutral' | 'info';

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: {
    text: string;
    status: TrendStatus;
  };
}

// 1.1 (NOVO) - Interface para a configuração de cada KPI.
// Esta é a chave para a solução.
interface KpiConfigItem {
  title: string;
  icon: React.ReactNode;
  getValue: (data: KPIData | null) => string;
  getTrend: (data: KPIData | null) => {
    text: string;
    status: TrendStatus; // Forçamos o tipo correto aqui!
  };
}

const trendColorMap: Record<TrendStatus, string> = {
  positive: 'bg-green-100 text-green-700',
  negative: 'bg-red-100 text-red-700',
  neutral: 'bg-zinc-100 text-zinc-500',
  info: 'bg-blue-100 text-blue-700',
};

function KPICard({ title, value, icon, trend }: KPICardProps) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-full bg-zinc-100 p-3 text-zinc-500">{icon}</div>
        <div className={`rounded-full px-2 py-1 text-[11px] font-bold ${trendColorMap[trend.status]}`}>
          {trend.text}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </p>
        <h2 className="mt-1 text-3xl font-black tracking-tighter text-zinc-800">
          {value}
        </h2>
      </div>
    </div>
  );
}

function KPISkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className="h-12 w-12 rounded-full bg-zinc-200"></div>
        <div className="h-6 w-20 rounded-full bg-zinc-200"></div>
      </div>
      <div>
        <div className="mb-2 h-3 w-1/3 rounded-md bg-zinc-200"></div>
        <div className="h-8 w-1/2 rounded-md bg-zinc-200"></div>
      </div>
    </div>
  );
}

// ===================================================================
// COMPONENTE PRINCIPAL
// ===================================================================

interface AdminKPIsProps {
  data: KPIData | null;
  isLoading: boolean;
}

// 2. (ALTERADO) - Aplicamos o novo tipo ao array de configuração.
const kpiConfig: KpiConfigItem[] = [
  {
    title: 'Receita Global',
    icon: <DollarSign size={20} />,
    getValue: (data) => {
      if (!data) return '0,0k Kz';
      const v = data.receitaTotal;
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
      if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k Kz`;
      return `${v.toLocaleString('pt-AO')} Kz`;
    },
    getTrend: (data) => ({
      text: data && data.receitaTotal > 0 ? 'Com receita' : 'Sem receita',
      status: data && data.receitaTotal > 0 ? 'positive' : 'neutral',
    }),
  },
  {
    title: 'Total Unidades',
    icon: <Users size={20} />,
    getValue: (data) => data ? data.totalUnidades.toString() : '0',
    getTrend: (data) => ({
      text: data ? `${data.totalMoradores} moradores` : 'Sem dados',
      status: 'info',
    }),
  },
  {
    title: 'Inadimplência Média',
    icon: <Activity size={20} />,
    getValue: (data) =>
      data ? `${data.taxaInadimplenciaMedia.toFixed(1)}%` : '0.0%',
    getTrend: (data) => {
      const taxa = data?.taxaInadimplenciaMedia ?? 0;
      return {
        text: taxa > 20 ? 'Crítica' : taxa > 10 ? 'Elevada' : taxa > 0 ? 'Normal' : 'Sem atrasos',
        status: taxa > 20 ? 'negative' : taxa > 10 ? 'negative' : taxa > 0 ? 'neutral' : 'positive',
      };
    },
  },
  {
    title: 'Ocorrências Abertas',
    icon: <AlertCircle size={20} />,
    getValue: (data) =>
      data ? data.ocorrenciasAbertas.toString() : '0',
    getTrend: (data) => ({
      text: data && data.ocorrenciasAbertas > 0
        ? `${data.ocorrenciasAbertas} por resolver`
        : 'Sem pendentes',
      status: data && data.ocorrenciasAbertas > 10
        ? 'negative'
        : data && data.ocorrenciasAbertas > 0
          ? 'neutral'
          : 'positive',
    }),
  },
];

export default function AdminKPIs({ data, isLoading }: AdminKPIsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiConfig.map((_, index) => <KPISkeletonCard key={index} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpiConfig.map((config) => (
        <KPICard
          key={config.title}
          title={config.title}
          icon={config.icon}
          value={config.getValue(data)}
          trend={config.getTrend(data)}
        />
      ))}
    </div>
  );
}