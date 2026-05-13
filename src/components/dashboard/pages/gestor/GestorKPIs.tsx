'use client';

import React, { useEffect, useState } from 'react';
import {
  DollarSign, TrendingDown, AlertTriangle,
  Clock, TrendingUp, BarChart3,
} from 'lucide-react';
import { getPortfolioFinanceiro, PortfolioResumo } from '@/lib/firebase/portfolioFinanceiro';
import type { PeriodoFiltro } from './GestorContent';
import { cn } from '@/lib/utils';

interface Props {
  condominios: { id: string; nome?: string }[];
  periodo: PeriodoFiltro;
}

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
}

function formatPercent(v: number): string {
  return `${v.toFixed(1)}%`;
}

// ─── Card individual ─────────────────────────────────────────────────────────

interface CardProps {
  label:    string;
  value:    string;
  sub?:     string;
  icon:     React.ReactNode;
  iconBg:   string;
  alert?:   boolean;
  positive?: boolean;
  trend?:   string;
}

function KPICard({ label, value, sub, icon, iconBg, alert, positive, trend }: CardProps) {
  return (
    <div className={cn(
      'bg-white border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md',
      alert    ? 'border-red-200 bg-red-50/30'     :
      positive ? 'border-emerald-200 bg-emerald-50/20' :
                 'border-zinc-200',
    )}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider leading-tight">
          {label}
        </p>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          {icon}
        </div>
      </div>

      <p className={cn(
        'text-2xl font-bold leading-none',
        alert    ? 'text-red-600'     :
        positive ? 'text-emerald-600' :
                   'text-zinc-900',
      )}>
        {value}
      </p>

      {(sub || trend) && (
        <div className="flex items-center justify-between mt-2">
          {sub   && <p className="text-xs text-zinc-400">{sub}</p>}
          {trend && <p className="text-xs font-medium text-zinc-500">{trend}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm animate-pulse">
          <div className="h-3 w-24 bg-zinc-200 rounded mb-4" />
          <div className="h-8 w-28 bg-zinc-200 rounded mb-2" />
          <div className="h-3 w-16 bg-zinc-100 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function GestorKPIs({ condominios, periodo }: Props) {
  const [data,    setData]    = useState<PortfolioResumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = condominios.map(c => c.id);
    if (!ids.length) { setLoading(false); return; }
    setLoading(true);
    getPortfolioFinanceiro(ids)
      .then(setData)
      .catch(err => console.error('Erro KPIs:', err))
      .finally(() => setLoading(false));
  }, [condominios, periodo]);

  if (loading) return <Skeleton />;
  if (!data)   return null;

  const nCondos = condominios.length;
  const sub     = `${nCondos} condomínio${nCondos !== 1 ? 's' : ''}`;

  const cards: CardProps[] = [
    {
      label:   'Receita do Mês',
      value:   formatMoney(data.receitaTotalMes),
      sub,
      icon:    <DollarSign size={17} className="text-emerald-600" />,
      iconBg:  'bg-emerald-50',
    },
    {
      label:   'Despesas do Mês',
      value:   formatMoney(data.despesasTotalMes),
      sub,
      icon:    <TrendingDown size={17} className="text-rose-500" />,
      iconBg:  'bg-rose-50',
      alert:   data.despesasTotalMes > data.receitaTotalMes,
    },
    {
      label:    'Margem Líquida',
      value:    formatMoney(data.margemLiquidaMes),
      sub:      `${formatPercent(data.margemPercentMes)} de margem`,
      icon:     <BarChart3 size={17} className={data.margemLiquidaMes >= 0 ? 'text-blue-600' : 'text-red-600'} />,
      iconBg:   data.margemLiquidaMes >= 0 ? 'bg-blue-50' : 'bg-red-50',
      positive: data.margemLiquidaMes > 0,
      alert:    data.margemLiquidaMes < 0,
    },
    {
      label:   'Receita Acumulada',
      value:   formatMoney(data.receitaTotalGeral),
      sub:     'Todas as quotas pagas',
      icon:    <TrendingUp size={17} className="text-orange-500" />,
      iconBg:  'bg-orange-50',
    },
    {
      label:   'Inadimplência Média',
      value:   formatPercent(data.taxaMediaInadimplencia),
      sub:     `${data.totalPagamentosMes} quotas este mês`,
      icon:    <AlertTriangle size={17} className="text-amber-500" />,
      iconBg:  'bg-amber-50',
      alert:   data.taxaMediaInadimplencia > 20,
    },
    {
      label:   'Total em Atraso',
      value:   formatMoney(data.totalAtrasado),
      sub:     'Quotas vencidas',
      icon:    <Clock size={17} className="text-red-500" />,
      iconBg:  'bg-red-50',
      alert:   data.totalAtrasado > 0,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Barra de margem visual */}
      {data.receitaTotalMes > 0 && (
        <div className="bg-white border border-zinc-200 rounded-2xl px-5 py-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Balanço do Mês
            </p>
            <span className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full',
              data.margemLiquidaMes >= 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700',
            )}>
              {data.margemLiquidaMes >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(data.margemPercentMes))}
            </span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-zinc-100 gap-0.5">
            {/* Barra de despesas */}
            {data.despesasTotalMes > 0 && (
              <div
                className="bg-rose-400 rounded-l-full transition-all"
                style={{ width: `${Math.min(100, (data.despesasTotalMes / data.receitaTotalMes) * 100)}%` }}
              />
            )}
            {/* Barra de margem */}
            {data.margemLiquidaMes > 0 && (
              <div
                className="bg-emerald-400 rounded-r-full transition-all"
                style={{ width: `${Math.min(100, (data.margemLiquidaMes / data.receitaTotalMes) * 100)}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-zinc-400 mt-1.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
              Despesas: {formatMoney(data.despesasTotalMes)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Margem: {formatMoney(data.margemLiquidaMes)}
            </span>
          </div>
        </div>
      )}

      {/* Grid de KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {cards.map(card => (
          <KPICard key={card.label} {...card} />
        ))}
      </div>
    </div>
  );
}
