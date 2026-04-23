// src/components/dashboard/pages/admin/DashboardAdminContent.tsx

'use client';

import React, { useMemo } from 'react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { useAuthContext } from '@/contexts/AuthContext';
import AdminKPIs from './AdminKPIs';
import AdminCharts from './AdminCharts';
import {
  Building2, Globe, LayoutGrid, ChevronDown, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

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

  // ✅ FONTE ÚNICA DE VERDADE — mesmo estado que a Sidebar e Topbar usam
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
    <main className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-0.5">
            {saudacao},{' '}
            <span className="text-orange-500">{userData?.nome?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {isGlobal
              ? 'Visão global de todos os condomínios da plataforma'
              : `A ver dados de: ${condominioAtual?.nome ?? '—'}`}
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full w-fit">
         
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

      {/* KPIs */}
      <AdminKPIs data={data?.kpis ?? null} isLoading={loading || dashLoading} />

      {/* Charts */}
      <AdminCharts
        receitaMensalData={data?.receitaMensalData ?? null}
        ocupacaoMedia={ocupacaoMedia}
        isLoading={loading || dashLoading}
      />
    </main>
  );
}