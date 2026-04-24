// components/dashboard/pages/gestor/GestorContent.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDashboardContext } from '@/contexts/DashboardContext';
import {
  Building2,
  ChevronLeft,
  ChevronDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  Globe,
} from 'lucide-react';

import GestorKPIs            from './GestorKPIs';
import GestorRanking         from './GestorRanking';
import GestorCondoList       from './GestorCondoList';
import GestorCondominioView  from './GestorCondominioView';

/* ─────────────────────────────────────────────
   TIPOS
───────────────────────────────────────────── */

export type PeriodoFiltro = 'mes' | 'trimestre' | 'ano';

interface CondominioItem {
  id: string;
  nome: string;
  taxaInadimplencia?: number;
  ocorrenciasAbertas?: number;
  endereco?: { cidade?: string; provincia?: string };
}

/* ─────────────────────────────────────────────
   SKELETON LOADER
───────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="bg-white border border-zinc-100 rounded-2xl p-5 animate-pulse">
      <div className="h-4 w-28 bg-zinc-200 rounded mb-4" />
      <div className="h-8 w-36 bg-zinc-200 rounded mb-2" />
      <div className="h-3 w-20 bg-zinc-100 rounded" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8">
      <div className="h-10 w-64 bg-zinc-200 rounded-xl animate-pulse" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────── */

function EmptyPortfolio() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center">
        <Building2 className="w-8 h-8 text-orange-400" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-zinc-800 mb-1">
          Nenhum condomínio no portfólio
        </h3>
        <p className="text-sm text-zinc-500 max-w-xs">
          Contacte o administrador para associar condomínios à sua conta.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SELETOR DE CONDOMÍNIO (dropdown)
───────────────────────────────────────────── */

interface SelectorProps {
  condominios: CondominioItem[];
  currentId: string;           // 'all' = visão global
  onChange: (id: string) => void;
}

function CondominioDropdown({ condominios, currentId, onChange }: SelectorProps) {
  const [open, setOpen] = useState(false);

  const isGlobal = currentId === 'all';
  const current  = isGlobal ? null : condominios.find(c => c.id === currentId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200
                   rounded-xl text-sm font-medium text-zinc-700 hover:border-orange-300
                   hover:text-orange-600 transition-all shadow-sm"
      >
        {current ? (
          <>
            <Building2 size={15} className="text-orange-500" />
            <span className="max-w-[180px] truncate">{current.nome}</span>
          </>
        ) : (
          <>
            <Globe size={15} className="text-zinc-400" />
            <span>Visão Global</span>
          </>
        )}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white border
                          border-zinc-200 rounded-2xl shadow-xl overflow-hidden">

            {/* Visão Global */}
            <button
              onClick={() => { onChange('all'); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition
                ${isGlobal
                  ? 'bg-orange-50 text-orange-600 font-semibold'
                  : 'text-zinc-700 hover:bg-zinc-50'
                }`}
            >
              <Globe size={15} />
              Visão Global
            </button>

            <div className="h-px bg-zinc-100 mx-3" />

            <div className="max-h-56 overflow-y-auto py-1">
              {condominios.map(c => (
                <button
                  key={c.id}
                  onClick={() => { onChange(c.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition
                    ${currentId === c.id
                      ? 'bg-orange-50 text-orange-600 font-semibold'
                      : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                >
                  <Building2 size={14} className="shrink-0" />
                  <span className="truncate text-left">{c.nome}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   FILTRO DE PERÍODO
───────────────────────────────────────────── */

interface PeriodoProps {
  value: PeriodoFiltro;
  onChange: (v: PeriodoFiltro) => void;
}

function PeriodoFilter({ value, onChange }: PeriodoProps) {
  const opcoes: { key: PeriodoFiltro; label: string }[] = [
    { key: 'mes',       label: 'Este mês'       },
    { key: 'trimestre', label: 'Últimos 3 meses' },
    { key: 'ano',       label: 'Ano actual'      },
  ];

  return (
    <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
      {opcoes.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            value === o.key
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ALERTAS RÁPIDOS
───────────────────────────────────────────── */

function QuickAlerts({ condominios }: { condominios: CondominioItem[] }) {
  const alerts = useMemo(() => {
    if (!condominios.length) return [];
    return [
      {
        type: 'warning' as const,
        label: 'Inadimplência alta',
        value: condominios.filter(c => (c.taxaInadimplencia ?? 0) > 15).length,
        icon: <AlertTriangle className="w-4 h-4" />,
      },
      {
        type: 'info' as const,
        label: 'Ocorrências abertas',
        value: condominios.reduce((acc, c) => acc + (c.ocorrenciasAbertas ?? 0), 0),
        icon: <Clock className="w-4 h-4" />,
      },
      {
        type: 'success' as const,
        label: 'Boa performance',
        value: condominios.filter(c => (c.taxaInadimplencia ?? 0) <= 5).length,
        icon: <TrendingUp className="w-4 h-4" />,
      },
    ];
  }, [condominios]);

  if (!alerts.length) return null;

  const colourMap = {
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info:    'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-green-50 border-green-200 text-green-700',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {alerts.map(alert => (
        <div
          key={alert.label}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border
                      text-sm font-medium ${colourMap[alert.type]}`}
        >
          {alert.icon}
          <span>{alert.label}:</span>
          <span className="font-bold ml-auto">{alert.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   HEADER GLOBAL
───────────────────────────────────────────── */

interface GlobalHeaderProps {
  nomeGestor: string;
  totalCondominios: number;
  condominios: CondominioItem[];
  currentId: string;
  onCondominioChange: (id: string) => void;
  periodo: PeriodoFiltro;
  onPeriodoChange: (v: PeriodoFiltro) => void;
}

function GlobalHeader({
  nomeGestor,
  totalCondominios,
  condominios,
  currentId,
  onCondominioChange,
  periodo,
  onPeriodoChange,
}: GlobalHeaderProps) {
  const saudacao = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const dataHoje = useMemo(() =>
    new Date().toLocaleDateString('pt-PT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }), []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500 capitalize">{dataHoje}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-0.5">
            {saudacao},{' '}
            <span className="text-orange-500">{nomeGestor.split(' ')[0]}</span>
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            Portfólio com{' '}
            <span className="font-semibold text-zinc-700">
              {totalCondominios} {totalCondominios === 1 ? 'condomínio' : 'condomínios'}
            </span>{' '}
            sob gestão
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50
                        border border-green-200 rounded-full w-fit">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-green-700">Sistema operacional</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CondominioDropdown
          condominios={condominios}
          currentId={currentId}
          onChange={onCondominioChange}
        />
        <PeriodoFilter value={periodo} onChange={onPeriodoChange} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HEADER INDIVIDUAL
───────────────────────────────────────────── */

interface IndividualHeaderProps {
  condominioNome: string;
  condominios: CondominioItem[];
  currentId: string;
  onCondominioChange: (id: string) => void;
  periodo: PeriodoFiltro;
  onPeriodoChange: (v: PeriodoFiltro) => void;
  onBack: () => void;
}

function IndividualHeader({
  condominioNome,
  condominios,
  currentId,
  onCondominioChange,
  periodo,
  onPeriodoChange,
  onBack,
}: IndividualHeaderProps) {
  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-2 text-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-orange-500 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Portfólio
        </button>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-800 font-semibold truncate max-w-[200px]">
          {condominioNome}
        </span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 leading-tight">
              {condominioNome}
            </h1>
            <span className="text-xs text-zinc-400">Visão individual</span>
          </div>
        </div>

        <span className="px-2.5 py-1 bg-orange-50 text-orange-600 text-xs
                         font-semibold rounded-full border border-orange-200 w-fit">
          Activo
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CondominioDropdown
          condominios={condominios}
          currentId={currentId}
          onChange={onCondominioChange}
        />
        <PeriodoFilter value={periodo} onChange={onPeriodoChange} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DIVIDER
───────────────────────────────────────────── */

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-zinc-100" />
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex-1 h-px bg-zinc-100" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */

export default function GestorContent() {
  const { userData } = useAuthContext();

  // ✅ FONTE ÚNICA DE VERDADE — mesmo estado que a Sidebar usa
  const {
    condominiosList,
    selectedCondo,
    setSelectedCondo,
    loading: dashLoading,
  } = useDashboardContext();

  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');

  // Filtra 'all' da lista para obter só os condomínios reais
  const condominiosGestor = useMemo<CondominioItem[]>(
    () => condominiosList.filter(c => c.id !== 'all'),
    [condominiosList],
  );

  // 'all' = visão global; qualquer outro id = visão individual
  const isGlobal = selectedCondo === 'all';

  /* ── LOADING ── */
  if (dashLoading) return <LoadingSkeleton />;

  /* ── MODO INDIVIDUAL ── */
  if (!isGlobal) {
    const condominioAtual = condominiosGestor.find(c => c.id === selectedCondo);

    return (
      <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-300">
        <IndividualHeader
          condominioNome={condominioAtual?.nome ?? 'Condomínio'}
          condominios={condominiosGestor}
          currentId={selectedCondo}
          onCondominioChange={setSelectedCondo}
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          onBack={() => setSelectedCondo('all')}
        />

        <div className="h-px bg-zinc-100" />

        {/* ✅ Re-renderiza automaticamente quando selectedCondo muda */}
        <GestorCondominioView key={selectedCondo} condominioId={selectedCondo} />
      </main>
    );
  }

  /* ── MODO GLOBAL ── */
  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-300">

      {/* ① HEADER */}
      <GlobalHeader
        nomeGestor={userData?.nome ?? 'Gestor'}
        totalCondominios={condominiosGestor.length}
        condominios={condominiosGestor}
        currentId={selectedCondo}
        onCondominioChange={setSelectedCondo}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
      />

      {/* ② ALERTAS */}
      {condominiosGestor.length > 0 && (
        <QuickAlerts condominios={condominiosGestor} />
      )}

      {/* ③ EMPTY STATE */}
      {condominiosGestor.length === 0 && <EmptyPortfolio />}

      {condominiosGestor.length > 0 && (
        <>
          <section className="space-y-3">
            <SectionDivider label="Indicadores Consolidados" />
            <GestorKPIs condominios={condominiosGestor} periodo={periodo} />
          </section>

          <section className="space-y-3">
            <SectionDivider label="Performance Comparativa" />
            <GestorRanking condominios={condominiosGestor} />
          </section>

          <section className="space-y-4">
            <SectionDivider label="Portfólio" />
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-orange-500" />
              <h2 className="text-base font-semibold text-zinc-900">Seus Condomínios</h2>
              <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs font-semibold rounded-full">
                {condominiosGestor.length}
              </span>
            </div>
            <GestorCondoList condominios={condominiosGestor} />
          </section>
        </>
      )}

      <p className="text-xs text-zinc-400 text-center pt-4 border-t border-zinc-100">
        Dados actualizados em tempo real · NETSUL CONDO
      </p>
    </main>
  );
}