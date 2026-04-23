'use client';

import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { getPortfolioRanking, CondoPerformance } from '@/lib/firebase/portfolioRanking';

interface Props {
  condominios: { id: string; nome?: string }[];
}

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
}

function formatPercent(v: number): string {
  return `${v.toFixed(1)}%`;
}

export default function GestorRanking({ condominios }: Props) {

  const [ranking, setRanking] = useState<CondoPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      if (!condominios.length) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await getPortfolioRanking(condominios);
        setRanking(data);
      } catch (err) {
        console.error('Erro ao carregar ranking:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, [condominios]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm animate-pulse h-32" />
        ))}
      </div>
    );
  }

  if (!ranking.length) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
        <Trophy size={18} className="text-orange-500" />
        Ranking de Performance
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {ranking.map((condo, index) => {

          const nome = condominios.find(c => c.id === condo.condominioId)?.nome ?? 'Condomínio';

          const isTop = index === 0;
          const isLast = index === ranking.length - 1;

          return (
            <div
              key={condo.condominioId}
              className={`bg-white border rounded-2xl p-5 shadow-sm transition ${
                isTop
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : isLast
                  ? 'border-red-200 bg-red-50/40'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-zinc-800">
                  #{index + 1} {nome}
                </p>

                {isTop && <TrendingUp size={16} className="text-emerald-500" />}
                {isLast && <TrendingDown size={16} className="text-red-500" />}
              </div>

              <div className="mt-4 space-y-1 text-sm text-zinc-600">
                <p>Receita do mês: <span className="font-semibold">{formatMoney(condo.receitaMes)}</span></p>
                <p>Inadimplência: <span className="font-semibold">{formatPercent(condo.taxaInadimplencia)}</span></p>
                <p>Total em atraso: <span className="font-semibold">{formatMoney(condo.totalAtrasado)}</span></p>
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}