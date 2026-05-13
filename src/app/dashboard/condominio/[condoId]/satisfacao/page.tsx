'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getResumoSatisfacao, type ResumoSatisfacao } from '@/lib/firebase/satisfacao';
import {
  Star, TrendingUp, TrendingDown, Minus,
  MessageSquare, Loader2, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const CATEGORIAS_LABEL: Record<string, string> = {
  limpeza:     'Limpeza',
  seguranca:   'Segurança',
  manutencao:  'Manutenção',
  comunicacao: 'Comunicação',
};

function StarDisplay({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={cn(
            i < Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-zinc-200 text-zinc-200',
          )}
        />
      ))}
    </div>
  );
}

function ScoreBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 80 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-zinc-700 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

export default function SatisfacaoPage() {
  const { condoId } = useParams() as { condoId: string };
  const [resumo, setResumo]   = useState<ResumoSatisfacao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!condoId) return;
    getResumoSatisfacao(condoId)
      .then(setResumo)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [condoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const tendenciaIcon = resumo?.tendencia === 'subindo'
    ? <TrendingUp size={16} className="text-emerald-500" />
    : resumo?.tendencia === 'descendo'
    ? <TrendingDown size={16} className="text-red-500" />
    : <Minus size={16} className="text-zinc-400" />;

  const tendenciaLabel = resumo?.tendencia === 'subindo' ? 'A subir'
    : resumo?.tendencia === 'descendo' ? 'A descer' : 'Estável';

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-amber-50 rounded-xl">
          <Star size={20} className="text-amber-500 fill-amber-500" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Satisfação dos Moradores</h1>
          <p className="text-sm text-zinc-500">Avaliações mensais do condomínio</p>
        </div>
      </div>

      {resumo?.totalAvaliacoes === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Star size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhuma avaliação ainda</p>
          <p className="text-xs mt-1">Os moradores podem avaliar em Painel → Avaliar Condomínio</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-zinc-500 mb-2">Nota Média</p>
              <div className="flex items-end gap-2">
                <p className={cn(
                  'text-3xl font-black',
                  (resumo?.mediaGeral ?? 0) >= 4 ? 'text-emerald-600' :
                  (resumo?.mediaGeral ?? 0) >= 3 ? 'text-amber-600' : 'text-red-600',
                )}>
                  {resumo?.mediaGeral.toFixed(1)}
                </p>
                <p className="text-zinc-400 text-sm mb-1">/5</p>
              </div>
              <StarDisplay value={resumo?.mediaGeral ?? 0} />
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-zinc-500 mb-2">Total de Avaliações</p>
              <p className="text-3xl font-black text-zinc-900">{resumo?.totalAvaliacoes}</p>
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                <Users size={11} />moradores avaliaram
              </p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm col-span-2 sm:col-span-1">
              <p className="text-xs text-zinc-500 mb-2">Tendência</p>
              <div className="flex items-center gap-2">
                {tendenciaIcon}
                <p className="text-lg font-bold text-zinc-900">{tendenciaLabel}</p>
              </div>
              <p className="text-xs text-zinc-400 mt-1">vs. mês anterior</p>
            </div>
          </div>

          {/* Distribuição de notas */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900">Distribuição de Notas</h3>
            {([5, 4, 3, 2, 1] as const).map(nota => {
              const count = resumo?.distribuicao[nota] ?? 0;
              const pct   = resumo?.totalAvaliacoes ? (count / resumo.totalAvaliacoes) * 100 : 0;
              return (
                <div key={nota} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16 shrink-0">
                    <span className="text-xs font-semibold text-zinc-600">{nota}</span>
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Médias por categoria */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900">Médias por Categoria</h3>
            {Object.entries(resumo?.mediaCategorias ?? {}).map(([key, val]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-zinc-700">{CATEGORIAS_LABEL[key] ?? key}</span>
                  <StarDisplay value={val} />
                </div>
                <ScoreBar value={val} />
              </div>
            ))}
          </div>

          {/* Comentários recentes */}
          {(resumo?.avaliacoes ?? []).filter(a => a.comentario).length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <MessageSquare size={15} className="text-zinc-400" />
                Comentários Recentes
              </h3>
              <div className="space-y-3">
                {(resumo?.avaliacoes ?? [])
                  .filter(a => a.comentario)
                  .slice(0, 5)
                  .map(a => (
                    <div key={a.id} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                            {a.moradorNome.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-zinc-700">{a.moradorNome}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <StarDisplay value={a.nota} />
                          <span className="text-xs text-zinc-400 ml-1">
                            {MESES[a.mes - 1]} {a.ano}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-600 leading-relaxed">{a.comentario}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
