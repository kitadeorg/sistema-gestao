'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Building2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

interface Props {
  condominios: any[];
}

interface FluxoCaixaItem {
  condominioId: string;
  condominioNome: string;
  receita: number;
  despesas: number;
  margem: number;
  margemPercent: number;
}

interface FluxoGeral {
  receitaTotal: number;
  despesasTotal: number;
  margemTotal: number;
  margemPercent: number;
  porCondominio: FluxoCaixaItem[];
}

type Periodo = '1m' | '3m' | '6m' | '1a';

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
}

function getPeriodoRange(periodo: Periodo): { inicio: Date; fim: Date; label: string } {
  const now = new Date();
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  let inicio: Date;
  let label: string;

  switch (periodo) {
    case '1m':
      inicio = new Date(now.getFullYear(), now.getMonth(), 1);
      label = 'Este mês';
      break;
    case '3m':
      inicio = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      label = 'Últimos 3 meses';
      break;
    case '6m':
      inicio = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      label = 'Últimos 6 meses';
      break;
    case '1a':
      inicio = new Date(now.getFullYear(), 0, 1);
      label = 'Este ano';
      break;
  }

  return { inicio, fim, label };
}

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */

export default function FluxoCaixaContent({ condominios }: Props) {
  const [dados, setDados] = useState<FluxoGeral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>('1m');
  const [showPeriodoMenu, setShowPeriodoMenu] = useState(false);

  /* ── Fetch ── */

  const fetchFluxo = useCallback(async () => {
    if (!condominios.length) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { inicio, fim } = getPeriodoRange(periodo);
      const condoIds = condominios.map((c) => c.id);
      const chunks = chunkArray(condoIds, 30);

      // ── Receitas (pagamentos pagos) ──
      const receitaResults = await Promise.all(
        chunks.map((chunk) =>
          getDocs(
            query(
              collection(db, 'pagamentos'),
              where('condominioId', 'in', chunk),
              where('status', '==', 'pago'),
              where('dataPagamento', '>=', Timestamp.fromDate(inicio)),
              where('dataPagamento', '<=', Timestamp.fromDate(fim))
            )
          )
        )
      );
      const receitaDocs = receitaResults.flatMap((r) => r.docs);

      // ── Despesas (financeiro com tipo 'despesa') ──
      let despesaDocs: any[] = [];
      try {
        const despesaResults = await Promise.all(
          chunks.map((chunk) =>
            getDocs(
              query(
                collection(db, 'financeiro'),
                where('condominioId', 'in', chunk),
                where('tipo', '==', 'despesa'),
                where('data', '>=', Timestamp.fromDate(inicio)),
                where('data', '<=', Timestamp.fromDate(fim))
              )
            )
          )
        );
        despesaDocs = despesaResults.flatMap((r) => r.docs);
      } catch (e) {
        console.warn('[FluxoCaixa] Despesas indisponível:', e);
      }

      // ── Agregar por condomínio ──
      const mapaReceita = new Map<string, number>();
      const mapaDespesa = new Map<string, number>();

      receitaDocs.forEach((doc) => {
        const d = doc.data();
        const id = d.condominioId;
        mapaReceita.set(id, (mapaReceita.get(id) || 0) + (d.valor || 0));
      });

      despesaDocs.forEach((doc) => {
        const d = doc.data();
        const id = d.condominioId;
        mapaDespesa.set(id, (mapaDespesa.get(id) || 0) + (d.valor || 0));
      });

      // ── Montar resultado por condomínio ──
      const porCondominio: FluxoCaixaItem[] = condominios.map((condo) => {
        const receita = mapaReceita.get(condo.id) || 0;
        const despesas = mapaDespesa.get(condo.id) || 0;
        const margem = receita - despesas;
        const margemPercent = receita > 0 ? (margem / receita) * 100 : 0;

        return {
          condominioId: condo.id,
          condominioNome: condo.nome || condo.name || 'Sem nome',
          receita,
          despesas,
          margem,
          margemPercent,
        };
      });

      // ── Totais gerais ──
      const receitaTotal = porCondominio.reduce((a, c) => a + c.receita, 0);
      const despesasTotal = porCondominio.reduce((a, c) => a + c.despesas, 0);
      const margemTotal = receitaTotal - despesasTotal;
      const margemPercent = receitaTotal > 0 ? (margemTotal / receitaTotal) * 100 : 0;

      // Ordenar por receita desc
      porCondominio.sort((a, b) => b.receita - a.receita);

      setDados({
        receitaTotal,
        despesasTotal,
        margemTotal,
        margemPercent,
        porCondominio,
      });
    } catch (err: any) {
      console.error('[FluxoCaixa] Erro:', err);
      setError('Erro ao carregar dados financeiros.');
    } finally {
      setLoading(false);
    }
  }, [condominios, periodo]);

  useEffect(() => {
    fetchFluxo();
  }, [fetchFluxo]);

  /* ── Skeleton ── */

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-zinc-200">
              <div className="h-4 w-24 bg-zinc-200 rounded mb-3" />
              <div className="h-8 w-32 bg-zinc-200 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <div className="h-4 w-40 bg-zinc-200 rounded mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between py-3 border-b border-zinc-100">
              <div className="h-4 w-32 bg-zinc-200 rounded" />
              <div className="h-4 w-24 bg-zinc-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Erro ── */

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-red-700 font-semibold">Erro ao carregar dados</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
        <button
          onClick={fetchFluxo}
          className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <RefreshCw size={14} />
          Tentar novamente
        </button>
      </div>
    );
  }

  const periodos: { value: Periodo; label: string }[] = [
    { value: '1m', label: 'Este mês' },
    { value: '3m', label: 'Últimos 3 meses' },
    { value: '6m', label: 'Últimos 6 meses' },
    { value: '1a', label: 'Este ano' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-800">Fluxo de Caixa</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Receitas e despesas consolidadas de {condominios.length} condomínio
            {condominios.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Seletor de período */}
        <div className="relative">
          <button
            onClick={() => setShowPeriodoMenu((v) => !v)}
            className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 hover:border-zinc-300 transition shadow-sm"
          >
            <Calendar size={15} className="text-zinc-400" />
            {periodos.find((p) => p.value === periodo)?.label}
            <ChevronDown size={14} className="text-zinc-400" />
          </button>

          {showPeriodoMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg z-20 overflow-hidden w-48">
              {periodos.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setPeriodo(p.value);
                    setShowPeriodoMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition ${
                    periodo === p.value
                      ? 'bg-orange-50 text-orange-600 font-medium'
                      : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Receita */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-zinc-500 font-medium">Receita Total</p>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-zinc-800">
            {formatMoney(dados?.receitaTotal || 0)}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight size={12} className="text-emerald-500" />
            <p className="text-xs text-emerald-600 font-medium">Pagamentos recebidos</p>
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-zinc-500 font-medium">Despesas Totais</p>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <TrendingDown size={16} className="text-red-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-zinc-800">
            {formatMoney(dados?.despesasTotal || 0)}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <ArrowDownRight size={12} className="text-red-500" />
            <p className="text-xs text-red-500 font-medium">Custos operacionais</p>
          </div>
        </div>

        {/* Margem */}
        <div className={`border rounded-2xl p-5 shadow-sm ${
          (dados?.margemTotal || 0) >= 0
            ? 'bg-white border-zinc-200'
            : 'bg-red-50/40 border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-zinc-500 font-medium">Margem Líquida</p>
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <DollarSign size={16} className="text-orange-500" />
            </div>
          </div>
          <h3 className={`text-2xl font-bold ${
            (dados?.margemTotal || 0) >= 0 ? 'text-zinc-800' : 'text-red-600'
          }`}>
            {formatMoney(dados?.margemTotal || 0)}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {dados?.margemPercent?.toFixed(1) || '0.0'}% de margem
          </p>
        </div>
      </div>

      {/* ── Tabela por condomínio ── */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Header tabela */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
          <Building2 size={16} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-700">
            Breakdown por Condomínio
          </h2>
        </div>

        {/* Colunas header */}
        <div className="grid grid-cols-5 px-6 py-2 bg-zinc-50 border-b border-zinc-100">
          {['Condomínio', 'Receita', 'Despesas', 'Margem', 'Performance'].map((col) => (
            <p key={col} className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              {col}
            </p>
          ))}
        </div>

        {/* Linhas */}
        {!dados?.porCondominio.length ? (
          <div className="px-6 py-12 text-center">
            <DollarSign size={32} className="text-zinc-200 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">Sem dados financeiros no período</p>
          </div>
        ) : (
          dados.porCondominio.map((item, idx) => (
            <div
              key={item.condominioId}
              className={`grid grid-cols-5 px-6 py-4 items-center ${
                idx < dados.porCondominio.length - 1
                  ? 'border-b border-zinc-50'
                  : ''
              } hover:bg-zinc-50/50 transition`}
            >
              {/* Nome */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 size={13} className="text-orange-500" />
                </div>
                <span className="text-sm font-medium text-zinc-700 truncate">
                  {item.condominioNome}
                </span>
              </div>

              {/* Receita */}
              <span className="text-sm font-semibold text-emerald-600">
                {formatMoney(item.receita)}
              </span>

              {/* Despesas */}
              <span className="text-sm font-semibold text-red-500">
                {formatMoney(item.despesas)}
              </span>

              {/* Margem */}
              <span className={`text-sm font-bold ${
                item.margem >= 0 ? 'text-zinc-800' : 'text-red-600'
              }`}>
                {formatMoney(item.margem)}
              </span>

              {/* Barra de performance */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      item.margemPercent >= 50
                        ? 'bg-emerald-400'
                        : item.margemPercent >= 20
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, item.margemPercent))}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-10 text-right">
                  {item.margemPercent.toFixed(0)}%
                </span>
              </div>
            </div>
          ))
        )}

        {/* Footer total */}
        {dados?.porCondominio.length ? (
          <div className="grid grid-cols-5 px-6 py-4 bg-zinc-50 border-t border-zinc-200">
            <span className="text-sm font-bold text-zinc-700">TOTAL</span>
            <span className="text-sm font-bold text-emerald-600">
              {formatMoney(dados.receitaTotal)}
            </span>
            <span className="text-sm font-bold text-red-500">
              {formatMoney(dados.despesasTotal)}
            </span>
            <span className={`text-sm font-bold ${
              dados.margemTotal >= 0 ? 'text-zinc-800' : 'text-red-600'
            }`}>
              {formatMoney(dados.margemTotal)}
            </span>
            <span className="text-xs text-zinc-500">
              {dados.margemPercent.toFixed(1)}% margem geral
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}