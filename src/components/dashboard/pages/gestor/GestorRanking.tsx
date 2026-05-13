'use client';

import { useEffect, useState } from 'react';
import {
  Trophy, TrendingUp, TrendingDown, Wrench,
  DollarSign, Star, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { getPortfolioRanking, CondoPerformance } from '@/lib/firebase/portfolioRanking';
import { cn } from '@/lib/utils';

interface Props {
  condominios: { id: string; nome?: string }[];
}

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
}

// ─── Barra de score ───────────────────────────────────────────────────────────

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={cn('h-1.5 rounded-full transition-all duration-500', color)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-zinc-600 w-7 text-right tabular-nums">
        {value.toFixed(0)}
      </span>
    </div>
  );
}

// ─── Badge de score geral ─────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const { label, cls } =
    score >= 80 ? { label: 'Excelente', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' } :
    score >= 60 ? { label: 'Bom',       cls: 'bg-blue-50 text-blue-700 border-blue-200'           } :
    score >= 40 ? { label: 'Regular',   cls: 'bg-amber-50 text-amber-700 border-amber-200'         } :
                  { label: 'Crítico',   cls: 'bg-red-50 text-red-700 border-red-200'               };

  return (
    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', cls)}>
      {label}
    </span>
  );
}

// ─── Card do condomínio ───────────────────────────────────────────────────────

interface CardProps {
  condo:  CondoPerformance;
  nome:   string;
  index:  number;
  total:  number;
}

function CondoCard({ condo, nome, index, total }: CardProps) {
  const isTop  = index === 0;
  const isLast = index === total - 1 && total > 1;

  const scoreColor =
    condo.performanceScore >= 70 ? 'bg-emerald-400' :
    condo.performanceScore >= 40 ? 'bg-amber-400'   : 'bg-red-400';

  return (
    <div className={cn(
      'bg-white border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md',
      isTop  ? 'border-emerald-300 ring-1 ring-emerald-100' :
      isLast ? 'border-red-200 ring-1 ring-red-50'          :
               'border-zinc-200',
    )}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          {/* Posição */}
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
            isTop  ? 'bg-emerald-500 text-white' :
            isLast ? 'bg-red-400 text-white'      :
                     'bg-zinc-100 text-zinc-500',
          )}>
            {index + 1}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-zinc-900 text-sm truncate">{nome}</p>
            <ScoreBadge score={condo.performanceScore} />
          </div>
        </div>
        {isTop  && <TrendingUp  size={18} className="text-emerald-500 shrink-0" />}
        {isLast && <TrendingDown size={18} className="text-red-500 shrink-0" />}
      </div>

      {/* ── Score geral ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-zinc-500 font-medium">Score Geral</span>
          <span className="text-sm font-black text-zinc-800 tabular-nums">
            {condo.performanceScore.toFixed(0)}<span className="text-zinc-400 font-normal">/100</span>
          </span>
        </div>
        <ScoreBar value={condo.performanceScore} color={scoreColor} />
      </div>

      {/* ── Scores detalhados ── */}
      <div className="space-y-2.5 mb-4">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <DollarSign size={10} className="text-blue-400" />
            <span className="text-xs text-zinc-400">Financeiro</span>
          </div>
          <ScoreBar value={condo.scoreFinanceiro} color="bg-blue-400" />
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Wrench size={10} className="text-purple-400" />
            <span className="text-xs text-zinc-400">Manutenção</span>
          </div>
          <ScoreBar value={condo.scoreManutencao} color="bg-purple-400" />
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Star size={10} className="text-amber-400" />
            <span className="text-xs text-zinc-400">Satisfação</span>
          </div>
          <ScoreBar value={condo.scoreSatisfacao} color="bg-amber-400" />
        </div>
      </div>

      {/* ── Métricas concretas ── */}
      <div className="border-t border-zinc-100 pt-3 grid grid-cols-2 gap-x-4 gap-y-2">

        {/* Receita */}
        <div>
          <p className="text-xs text-zinc-400 mb-0.5">Receita do mês</p>
          <p className="text-sm font-bold text-zinc-800">{formatMoney(condo.receitaMes)}</p>
        </div>

        {/* Inadimplência */}
        <div>
          <p className="text-xs text-zinc-400 mb-0.5">Inadimplência</p>
          <p className={cn(
            'text-sm font-bold',
            condo.taxaInadimplencia > 20 ? 'text-red-600' :
            condo.taxaInadimplencia > 10 ? 'text-amber-600' : 'text-emerald-600',
          )}>
            {condo.taxaInadimplencia.toFixed(1)}%
          </p>
        </div>

        {/* Ocorrências abertas */}
        <div className="flex items-center gap-1.5">
          {condo.ocorrenciasAbertas > 5
            ? <AlertTriangle size={12} className="text-amber-500 shrink-0" />
            : <CheckCircle2  size={12} className="text-emerald-500 shrink-0" />
          }
          <div>
            <p className="text-xs text-zinc-400">Ocorr. abertas</p>
            <p className={cn(
              'text-sm font-bold',
              condo.ocorrenciasAbertas > 5 ? 'text-amber-600' : 'text-zinc-800',
            )}>
              {condo.ocorrenciasAbertas}
            </p>
          </div>
        </div>

        {/* Taxa de resolução */}
        <div>
          <p className="text-xs text-zinc-400 mb-0.5">Resolução</p>
          <p className={cn(
            'text-sm font-bold',
            condo.taxaResolucao >= 80 ? 'text-emerald-600' :
            condo.taxaResolucao >= 50 ? 'text-amber-600'   : 'text-red-600',
          )}>
            {condo.taxaResolucao.toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GestorRanking({ condominios }: Props) {
  const [ranking, setRanking] = useState<CondoPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!condominios.length) { setLoading(false); return; }
    setLoading(true);
    getPortfolioRanking(condominios)
      .then(setRanking)
      .catch(err => console.error('Erro ranking:', err))
      .finally(() => setLoading(false));
  }, [condominios]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: Math.min(condominios.length || 3, 3) }).map((_, i) => (
          <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm animate-pulse h-64" />
        ))}
      </div>
    );
  }

  if (!ranking.length) return null;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
          <Trophy size={18} className="text-orange-500" />
          Ranking de Performance
        </h2>
        <span className="text-xs text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full font-medium">
          financeiro · manutenção · satisfação
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ranking.map((condo, index) => (
          <CondoCard
            key={condo.condominioId}
            condo={condo}
            nome={condominios.find(c => c.id === condo.condominioId)?.nome ?? 'Condomínio'}
            index={index}
            total={ranking.length}
          />
        ))}
      </div>
    </div>
  );
}
