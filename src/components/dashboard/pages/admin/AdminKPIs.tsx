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
    getValue: (data) => 
      data ? `${(data.receitaTotal / 1000).toFixed(1)}k Kz` : '0,0k Kz',
    getTrend: (data) => ({
      text: 'Últimos 30d',
      status: 'neutral'
    }),
  },
  {
    title: 'Total Unidades',
    icon: <Users size={20} />,
    getValue: (data) => data ? data.totalUnidades.toString() : '0',
    getTrend: (data) => ({ text: 'Atual', status: 'info' }),
  },
  {
    title: 'Inadimplência',
    icon: <Activity size={20} />,
    getValue: (data) => 
      data ? `${data.taxaInadimplenciaMedia.toFixed(1)}%` : '0.0%',
    getTrend: (data) => ({
      text: 'Estável',
      status: 'neutral',
    }),
  },
  {
    title: 'Manutenção',
    icon: <AlertCircle size={20} />,
    getValue: (data) => 
      data ? data.ocorrenciasAbertas.toString() : '0',
    getTrend: (data) => ({
      text: data && data.ocorrenciasAbertas > 0 ? `${data.ocorrenciasAbertas} aberta(s)` : 'Sem alertas',
      status: data && data.ocorrenciasAbertas > 0 ? 'negative' : 'positive',
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