'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { getCondominiosByUser } from '@/lib/firebase/condominios';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

interface PeriodoConfig {
  label: string;
  inicio: Date;
  fim: Date;
}

interface PeriodoData {
  receita: number;
  despesas: number;
  margem: number;
  margemPercent: number;
  totalQuotas: number;
  quotasAtrasadas: number;
  inadimplencia: number;
}

interface ComparativoResult {
  periodoA: PeriodoData;
  periodoB: PeriodoData;
  labelA: string;
  labelB: string;
}

type ModoComparativo = 'meses' | 'trimestres' | 'anos';

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
}

function formatPercent(v: number): string {
  return `${v.toFixed(1)}%`;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getMesesDisponiveis(): { label: string; inicio: Date; fim: Date }[] {
  const now = new Date();
  const result = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      label: `${MESES_PT[d.getMonth()]} ${d.getFullYear()}`,
      inicio: new Date(d.getFullYear(), d.getMonth(), 1),
      fim: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
    });
  }
  return result;
}

function getTrimestresDisponiveis(): { label: string; inicio: Date; fim: Date }[] {
  const now = new Date();
  const result = [];
  for (let i = 0; i < 8; i++) {
    const trimestre = Math.floor(now.getMonth() / 3) - i;
    const ano = now.getFullYear() + Math.floor(trimestre / 4);
    const t = ((trimestre % 4) + 4) % 4;
    const mesInicio = t * 3;
    result.push({
      label: `T${t + 1} ${ano}`,
      inicio: new Date(ano, mesInicio, 1),
      fim: new Date(ano, mesInicio + 3, 0, 23, 59, 59),
    });
  }
  return result;
}

function getAnosDisponiveis(): { label: string; inicio: Date; fim: Date }[] {
  const now = new Date();
  return Array.from({ length: 5 }, (_, i) => {
    const ano = now.getFullYear() - i;
    return {
      label: String(ano),
      inicio: new Date(ano, 0, 1),
      fim: new Date(ano, 11, 31, 23, 59, 59),
    };
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   FETCH
───────────────────────────────────────────────────────────────────────────── */

async function fetchPeriodoData(
  condoIds: string[],
  inicio: Date,
  fim: Date,
): Promise<PeriodoData> {
  if (!condoIds.length) {
    return { receita: 0, despesas: 0, margem: 0, margemPercent: 0, totalQuotas: 0, quotasAtrasadas: 0, inadimplencia: 0 };
  }

  const chunks = chunkArray(condoIds, 30);

  const [quotaSnaps, despesaSnaps] = await Promise.all([
    Promise.all(chunks.map((chunk) =>
      getDocs(query(collection(db, 'quotas'), where('condominioId', 'in', chunk)))
    )),
    Promise.all(chunks.map((chunk) =>
      getDocs(query(collection(db, 'despesas'), where('condominioId', 'in', chunk)))
    )),
  ]);

  const quotas = quotaSnaps.flatMap((s) => s.docs.map((d) => d.data()));
  const despesas = despesaSnaps.flatMap((s) => s.docs.map((d) => d.data()));

  let receita = 0;
  let totalQuotas = 0;
  let quotasAtrasadas = 0;

  quotas.forEach((q) => {
    const pag = q.dataPagamento?.toDate?.();
    const venc = q.dataVencimento?.toDate?.();

    // Receita: quotas pagas com dataPagamento no período
    if (q.status === 'pago' && pag && pag >= inicio && pag <= fim) {
      receita += q.valor ?? 0;
    }

    // Inadimplência: quotas cujo vencimento cai no período
    if (venc && venc >= inicio && venc <= fim) {
      totalQuotas++;
      if (q.status === 'atrasado') quotasAtrasadas++;
    }
  });

  let despesasTotal = 0;
  despesas.forEach((d) => {
    const data = d.data?.toDate?.();
    if (data && data >= inicio && data <= fim) {
      despesasTotal += d.valor ?? 0;
    }
  });

  const margem = receita - despesasTotal;
  const margemPercent = receita > 0 ? (margem / receita) * 100 : 0;
  const inadimplencia = totalQuotas > 0 ? (quotasAtrasadas / totalQuotas) * 100 : 0;

  return { receita, despesas: despesasTotal, margem, margemPercent, totalQuotas, quotasAtrasadas, inadimplencia };
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELTA BADGE
───────────────────────────────────────────────────────────────────────────── */

function DeltaBadge({ a, b, invertido = false }: { a: number; b: number; invertido?: boolean }) {
  if (b === 0) return <span className="text-xs text-zinc-400">—</span>;
  const delta = ((a - b) / Math.abs(b)) * 100;
  const positivo = invertido ? delta < 0 : delta > 0;
  const neutro = Math.abs(delta) < 0.1;

  if (neutro) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-zinc-500">
        <Minus size={11} /> 0%
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
      positivo ? 'text-emerald-600' : 'text-red-500'
    }`}>
      {positivo
        ? <ArrowUpRight size={12} />
        : <ArrowDownRight size={12} />
      }
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   BARRA COMPARATIVA
───────────────────────────────────────────────────────────────────────────── */

function BarraComparativa({
  labelA, valueA, labelB, valueB, corA, corB, formatFn,
}: {
  labelA: string; valueA: number;
  labelB: string; valueB: number;
  corA: string; corB: string;
  formatFn: (v: number) => string;
}) {
  const max = Math.max(valueA, valueB, 1);
  const pctA = (valueA / max) * 100;
  const pctB = (valueB / max) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500 w-28 shrink-0 truncate">{labelA}</span>
        <div className="flex-1 bg-zinc-100 rounded-full h-2.5 overflow-hidden">
          <div className={`h-2.5 rounded-full transition-all ${corA}`} style={{ width: `${pctA}%` }} />
        </div>
        <span className="text-xs font-semibold text-zinc-700 w-24 text-right shrink-0">
          {formatFn(valueA)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500 w-28 shrink-0 truncate">{labelB}</span>
        <div className="flex-1 bg-zinc-100 rounded-full h-2.5 overflow-hidden">
          <div className={`h-2.5 rounded-full transition-all ${corB}`} style={{ width: `${pctB}%` }} />
        </div>
        <span className="text-xs font-semibold text-zinc-700 w-24 text-right shrink-0">
          {formatFn(valueB)}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SELECTOR DROPDOWN
───────────────────────────────────────────────────────────────────────────── */

function PeriodoSelector({
  label, opcoes, value, onChange,
}: {
  label: string;
  opcoes: PeriodoConfig[];
  value: number;
  onChange: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{label}</p>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 hover:border-zinc-300 transition shadow-sm w-full"
        >
          <Calendar size={14} className="text-zinc-400 shrink-0" />
          <span className="flex-1 text-left truncate">{opcoes[value]?.label}</span>
          <ChevronDown size={13} className="text-zinc-400 shrink-0" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full mt-1 z-40 w-full bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
              {opcoes.map((op, i) => (
                <button
                  key={i}
                  onClick={() => { onChange(i); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition ${
                    i === value
                      ? 'bg-orange-50 text-orange-600 font-semibold'
                      : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */

export default function RelatorioComparativoPage() {
  const { userData } = useAuthContext();

  const [modo, setModo] = useState<ModoComparativo>('meses');
  const [idxA, setIdxA] = useState(0);   // período mais recente
  const [idxB, setIdxB] = useState(1);   // período anterior
  const [condoIds, setCondoIds] = useState<string[]>([]);
  const [resultado, setResultado] = useState<ComparativoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opções de período conforme o modo
  const opcoes: PeriodoConfig[] = modo === 'meses'
    ? getMesesDisponiveis()
    : modo === 'trimestres'
    ? getTrimestresDisponiveis()
    : getAnosDisponiveis();

  // Carregar IDs dos condomínios acessíveis
  useEffect(() => {
    if (!userData) return;
    getCondominiosByUser(
      userData.role,
      userData.condominioId,
      userData.condominiosGeridos,
    ).then((condos) => setCondoIds(condos.map((c) => c.id)));
  }, [userData]);

  const calcular = useCallback(async () => {
    if (!condoIds.length || !opcoes[idxA] || !opcoes[idxB]) return;
    setLoading(true);
    setError(null);
    try {
      const [dadosA, dadosB] = await Promise.all([
        fetchPeriodoData(condoIds, opcoes[idxA].inicio, opcoes[idxA].fim),
        fetchPeriodoData(condoIds, opcoes[idxB].inicio, opcoes[idxB].fim),
      ]);
      setResultado({
        periodoA: dadosA,
        periodoB: dadosB,
        labelA: opcoes[idxA].label,
        labelB: opcoes[idxB].label,
      });
    } catch (e: any) {
      setError('Erro ao carregar dados. Tente novamente.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [condoIds, idxA, idxB, opcoes]);

  // Recalcular automaticamente quando os parâmetros mudam
  useEffect(() => {
    if (condoIds.length) calcular();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condoIds, idxA, idxB, modo]);

  const modos: { key: ModoComparativo; label: string }[] = [
    { key: 'meses', label: 'Meses' },
    { key: 'trimestres', label: 'Trimestres' },
    { key: 'anos', label: 'Anos' },
  ];

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-300">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
            <BarChart3 size={20} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Relatório Comparativo</h1>
            <p className="text-sm text-zinc-500">Compare receitas, despesas e margem entre dois períodos</p>
          </div>
        </div>

        {resultado && (
          <button
            onClick={calcular}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        )}
      </div>

      {/* ── Configuração ── */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-5">

        {/* Modo */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Granularidade</p>
          <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 w-fit">
            {modos.map((m) => (
              <button
                key={m.key}
                onClick={() => { setModo(m.key); setIdxA(0); setIdxB(1); }}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  modo === m.key
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Seletores de período */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PeriodoSelector
            label="Período A (principal)"
            opcoes={opcoes}
            value={idxA}
            onChange={(i) => { if (i !== idxB) setIdxA(i); }}
          />
          <PeriodoSelector
            label="Período B (comparação)"
            opcoes={opcoes}
            value={idxB}
            onChange={(i) => { if (i !== idxA) setIdxB(i); }}
          />
        </div>

        {idxA === idxB && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Os dois períodos são iguais. Selecione períodos diferentes para comparar.
          </p>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-5 h-24" />
          ))}
        </div>
      )}

      {/* ── Erro ── */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between">
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={calcular} className="text-sm text-red-600 hover:text-red-800 font-medium">
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Resultado ── */}
      {resultado && !loading && (
        <div className="space-y-5">

          {/* Legenda */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-400 shrink-0" />
              <span className="font-semibold text-zinc-700">{resultado.labelA}</span>
              <span className="text-zinc-400">(Período A)</span>
            </div>
            <span className="text-zinc-300">vs</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-zinc-400 shrink-0" />
              <span className="font-semibold text-zinc-700">{resultado.labelB}</span>
              <span className="text-zinc-400">(Período B)</span>
            </div>
          </div>

          {/* Cards de métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Receita */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Receita</p>
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <TrendingUp size={15} className="text-emerald-500" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-zinc-900">{formatMoney(resultado.periodoA.receita)}</span>
                  <DeltaBadge a={resultado.periodoA.receita} b={resultado.periodoB.receita} />
                </div>
                <p className="text-xs text-zinc-400">vs {formatMoney(resultado.periodoB.receita)}</p>
              </div>
              <BarraComparativa
                labelA={resultado.labelA} valueA={resultado.periodoA.receita}
                labelB={resultado.labelB} valueB={resultado.periodoB.receita}
                corA="bg-orange-400" corB="bg-zinc-300"
                formatFn={formatMoney}
              />
            </div>

            {/* Despesas */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Despesas</p>
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                  <TrendingDown size={15} className="text-red-500" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-zinc-900">{formatMoney(resultado.periodoA.despesas)}</span>
                  <DeltaBadge a={resultado.periodoA.despesas} b={resultado.periodoB.despesas} invertido />
                </div>
                <p className="text-xs text-zinc-400">vs {formatMoney(resultado.periodoB.despesas)}</p>
              </div>
              <BarraComparativa
                labelA={resultado.labelA} valueA={resultado.periodoA.despesas}
                labelB={resultado.labelB} valueB={resultado.periodoB.despesas}
                corA="bg-red-400" corB="bg-zinc-300"
                formatFn={formatMoney}
              />
            </div>

            {/* Margem */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Margem Líquida</p>
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <DollarSign size={15} className="text-blue-500" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className={`text-xl font-bold ${resultado.periodoA.margem >= 0 ? 'text-zinc-900' : 'text-red-600'}`}>
                    {formatMoney(resultado.periodoA.margem)}
                  </span>
                  <DeltaBadge a={resultado.periodoA.margem} b={resultado.periodoB.margem} />
                </div>
                <p className="text-xs text-zinc-400">
                  {formatPercent(resultado.periodoA.margemPercent)} · vs {formatMoney(resultado.periodoB.margem)}
                </p>
              </div>
              <BarraComparativa
                labelA={resultado.labelA} valueA={Math.max(0, resultado.periodoA.margem)}
                labelB={resultado.labelB} valueB={Math.max(0, resultado.periodoB.margem)}
                corA="bg-blue-400" corB="bg-zinc-300"
                formatFn={formatMoney}
              />
            </div>
          </div>

          {/* Tabela detalhada */}
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
              <Building2 size={16} className="text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-700">Comparativo Detalhado</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Métrica</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-orange-500 uppercase tracking-wide">
                      {resultado.labelA}
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                      {resultado.labelB}
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Variação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {[
                    {
                      label: 'Receita Total',
                      a: resultado.periodoA.receita,
                      b: resultado.periodoB.receita,
                      fmt: formatMoney,
                      invertido: false,
                    },
                    {
                      label: 'Despesas Totais',
                      a: resultado.periodoA.despesas,
                      b: resultado.periodoB.despesas,
                      fmt: formatMoney,
                      invertido: true,
                    },
                    {
                      label: 'Margem Líquida',
                      a: resultado.periodoA.margem,
                      b: resultado.periodoB.margem,
                      fmt: formatMoney,
                      invertido: false,
                    },
                    {
                      label: 'Margem (%)',
                      a: resultado.periodoA.margemPercent,
                      b: resultado.periodoB.margemPercent,
                      fmt: formatPercent,
                      invertido: false,
                    },
                    {
                      label: 'Taxa de Inadimplência',
                      a: resultado.periodoA.inadimplencia,
                      b: resultado.periodoB.inadimplencia,
                      fmt: formatPercent,
                      invertido: true,
                    },
                  ].map((row) => (
                    <tr key={row.label} className="hover:bg-zinc-50/50 transition">
                      <td className="px-6 py-3.5 font-medium text-zinc-700">{row.label}</td>
                      <td className="px-6 py-3.5 text-right font-semibold text-zinc-900">
                        {row.fmt(row.a)}
                      </td>
                      <td className="px-6 py-3.5 text-right text-zinc-500">
                        {row.fmt(row.b)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <DeltaBadge a={row.a} b={row.b} invertido={row.invertido} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Nota de rodapé */}
          <p className="text-xs text-zinc-400 text-center">
            Receitas baseadas em quotas pagas · Despesas baseadas na data de registo · Dados em tempo real
          </p>
        </div>
      )}
    </main>
  );
}
