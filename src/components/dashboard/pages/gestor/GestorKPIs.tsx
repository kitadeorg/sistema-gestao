'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, Building2, AlertTriangle, Clock } from 'lucide-react';
import { getPortfolioFinanceiro, PortfolioResumo } from '@/lib/firebase/portfolioFinanceiro';
import type { PeriodoFiltro } from './GestorContent';

/* ─────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────── */

export default function GestorKPIs({ condominios, periodo }: Props) {
  const [data,    setData]    = useState<PortfolioResumo | null>(null);
  const [loading, setLoading] = useState(true);

  const condoIds = condominios.map(c => c.id);

  const fetchData = async () => {
    if (!condoIds.length) { setLoading(false); return; }
    setLoading(true);
    try {
      const resumo = await getPortfolioFinanceiro(condoIds);
      setData(resumo);
    } catch (err) {
      console.error('Erro ao carregar consolidação:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [condominios, periodo]); // ✅ re-fetch quando período muda

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm animate-pulse">
            <div className="h-6 w-32 bg-zinc-200 rounded mb-4" />
            <div className="h-8 w-24 bg-zinc-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      label: 'Receita do Mês',
      value: formatMoney(data.receitaTotalMes),
      icon:  <DollarSign size={18} className="text-emerald-500" />,
      alert: false,
    },
    {
      label: 'Receita Acumulada',
      value: formatMoney(data.receitaTotalGeral),
      icon:  <Building2 size={18} className="text-orange-500" />,
      alert: false,
    },
    {
      label: 'Inadimplência Média',
      value: formatPercent(data.taxaMediaInadimplencia),
      icon:  <AlertTriangle size={18} className="text-amber-500" />,
      alert: data.taxaMediaInadimplencia > 20,
    },
    {
      label: 'Total em Atraso',
      value: formatMoney(data.totalAtrasado),
      icon:  <Clock size={18} className="text-red-500" />,
      alert: data.totalAtrasado > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(card => (
        <div
          key={card.label}
          className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
            card.alert
              ? 'border-red-200 bg-red-50/40'
              : 'border-zinc-200 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 font-medium">{card.label}</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-50">
              {card.icon}
            </div>
          </div>

          <h3 className={`text-2xl font-bold mt-4 ${card.alert ? 'text-red-600' : 'text-zinc-800'}`}>
            {card.value}
          </h3>

          <p className="text-xs text-zinc-400 mt-1">
            {condominios.length} condomínio{condominios.length !== 1 ? 's' : ''}
          </p>
        </div>
      ))}
    </div>
  );
}