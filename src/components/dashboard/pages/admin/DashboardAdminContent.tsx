// src/components/dashboard/pages/admin/DashboardAdminContent.tsx

'use client';

import React, { useMemo } from 'react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { useAuthContext } from '@/contexts/AuthContext';
import AdminKPIs from './AdminKPIs';
import AdminCharts from './AdminCharts';
import AdminAlerts from './AdminAlerts';
import type { CondominioPerfomance } from '@/types/admin';
import {
  Building2, Globe, LayoutGrid, ChevronDown, Check, TrendingUp, TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

/* ── Tabela de performance por condomínio ── */
function CondominiosPerformanceTable({
  condominios,
  isLoading,
}: {
  condominios: CondominioPerfomance[];
  isLoading: boolean;
}) {
  const formatMoney = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k Kz`;
    return `${v.toLocaleString('pt-AO')} Kz`;
  };

  // Ordenar por receita desc
  const sorted = [...condominios].sort((a, b) => b.receita - a.receita);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 size={18} className="text-orange-500" />
        <h2 className="text-base font-semibold text-zinc-900">Performance por Condomínio</h2>
        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs font-semibold rounded-full">
          {condominios.length}
        </span>
      </div>

      {/* Desktop */}
      <div className="hidden md:block rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">#</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Condomínio</th>
              <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Unidades</th>
              <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Moradores</th>
              <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Receita</th>
              <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Inadimplência</th>
              <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sorted.map((c, i) => {
              const isTop  = i === 0 && c.receita > 0;
              const isLast = i === sorted.length - 1 && sorted.length > 1;
              return (
                <tr key={c.id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="px-4 py-3 text-sm text-zinc-400 font-medium">
                    {isTop  && <TrendingUp  size={14} className="text-emerald-500" />}
                    {isLast && <TrendingDown size={14} className="text-red-400" />}
                    {!isTop && !isLast && <span>{i + 1}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-zinc-900">{c.nome}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-700">{c.unidades}</td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-700">{c.moradores}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">
                    {formatMoney(c.receita)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      'text-sm font-bold',
                      c.inadimplencia > 20 ? 'text-red-600' :
                      c.inadimplencia > 10 ? 'text-amber-600' : 'text-emerald-600',
                    )}>
                      {c.inadimplencia.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold',
                      c.status === 'ativo'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-zinc-100 text-zinc-500',
                    )}>
                      {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sorted.map((c, i) => (
          <div key={c.id} className="bg-white border border-zinc-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-zinc-900 text-sm">{c.nome}</p>
              <span className={cn(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                c.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500',
              )}>
                {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
              <span>Receita: <b className="text-zinc-900">{formatMoney(c.receita)}</b></span>
              <span>Inadimplência: <b className={c.inadimplencia > 20 ? 'text-red-600' : 'text-emerald-600'}>{c.inadimplencia.toFixed(1)}%</b></span>
              <span>Unidades: <b className="text-zinc-900">{c.unidades}</b></span>
              <span>Moradores: <b className="text-zinc-900">{c.moradores}</b></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Seletor de condomínio inline ── */
function CondoSelector() {
  const { condominiosList, selectedCondo, setSelectedCondo } = useDashboardContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = condominiosList.find(c => c.id === selectedCondo);
  const isGlobal = selectedCondo === 'all';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all shadow-sm',
          isGlobal
            ? 'border-zinc-200 bg-white text-zinc-600 hover:border-orange-300'
            : 'border-orange-300 bg-orange-50 text-orange-700',
        )}
      >
        {isGlobal
          ? <LayoutGrid size={15} className="text-zinc-400" />
          : <Building2 size={15} className="text-orange-500" />}
        <span className="max-w-[200px] truncate">{current?.nome ?? 'Selecionar...'}</span>
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-2 space-y-0.5 max-h-72 overflow-y-auto">
            {condominiosList.map(c => {
              const sel = selectedCondo === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCondo(c.id); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors',
                    sel ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-zinc-700 hover:bg-zinc-50',
                  )}
                >
                  {c.id === 'all'
                    ? <Globe size={14} className="shrink-0 text-zinc-400" />
                    : <Building2 size={14} className="shrink-0 text-zinc-400" />}
                  <span className="flex-1 truncate">{c.nome}</span>
                  {sel && <Check size={13} className="text-orange-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardAdminContent() {
  const { userData } = useAuthContext();

  const { selectedCondo, setSelectedCondo, condominiosList, loading: dashLoading } = useDashboardContext();

  const endDate = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }, []);

  const { data, loading, error } = useAdminDashboard({
    startDate,
    endDate,
    selectedCondo,
  });

  const ocupacaoMedia = useMemo(() => {
    if (!data?.kpis || !data?.condominios) return 0;
    const total = data.condominios.reduce((sum, c) => sum + c.unidades, 0);
    if (total === 0) return 0;
    return (data.kpis.totalUnidades / total) * 100;
  }, [data]);

  const isGlobal = selectedCondo === 'all';
  const condominioAtual = condominiosList.find(c => c.id === selectedCondo);

  const saudacao = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Erro ao carregar os dados do dashboard.</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-0.5">
            {saudacao},{' '}
            <span className="text-orange-500">{userData?.nome?.split(' ')[0]}</span>
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {isGlobal
              ? 'Visão global de todos os condomínios da plataforma'
              : `A ver dados de: ${condominioAtual?.nome ?? '—'}`}
          </p>
        </div>

        
      </div>

      {/* Seletor */}
      <div className="flex items-center gap-3">
        <CondoSelector />
        {!isGlobal && (
          <button
            onClick={() => setSelectedCondo('all')}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-orange-500 transition-colors font-medium"
          >
            <Globe size={14} />
            Visão Global
          </button>
        )}
      </div>

      {/* Alertas automáticos */}
      {data?.alertas && data.alertas.length > 0 && (
        <AdminAlerts alertas={data.alertas} />
      )}

      {/* KPIs */}
      <AdminKPIs data={data?.kpis ?? null} isLoading={loading || dashLoading} />

      {/* Charts */}
      <AdminCharts
        receitaMensalData={data?.receitaMensalData ?? null}
        ocupacaoMedia={ocupacaoMedia}
        isLoading={loading || dashLoading}
      />

      {/* Tabela de performance por condomínio */}
      {data?.condominios && data.condominios.length > 0 && (
        <CondominiosPerformanceTable
          condominios={data.condominios}
          isLoading={loading || dashLoading}
        />
      )}
    </main>
  );
}