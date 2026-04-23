'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Wrench,
  Building2,
  Calendar,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  ChevronDown,
  DollarSign,
  Shield,
  Zap,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

interface Props {
  condominios: any[];
}

type TipoTab = 'todas' | 'preventiva' | 'corretiva' | 'urgente';
type StatusManu = 'pendente' | 'em_execucao' | 'concluida' | 'cancelada';

interface Manutencao {
  id: string;
  condominioId: string;
  condominioNome: string;
  titulo: string;
  descricao: string;
  tipo: TipoTab;
  status: StatusManu;
  custo: number;
  responsavel: string;
  dataAgendada?: Date;
  dataConclusao?: Date;
  createdAt: Date;
  diasPendente: number;
}

interface KPIs {
  pendentes: number;
  emExecucao: number;
  concluidas: number;
  custoTotal: number;
}

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

function diasDesde(data: Date): number {
  return Math.floor(
    (new Date().getTime() - data.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function statusManuConfig(s: string) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pendente:     { label: 'Pendente',     color: 'text-amber-600',   bg: 'bg-amber-50',   icon: <Clock size={13} />          },
    em_execucao:  { label: 'Em Execução',  color: 'text-blue-600',    bg: 'bg-blue-50',    icon: <Wrench size={13} />         },
    concluida:    { label: 'Concluída',    color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle size={13} />    },
    cancelada:    { label: 'Cancelada',    color: 'text-zinc-500',    bg: 'bg-zinc-100',   icon: <AlertTriangle size={13} />  },
  };
  return map[s] ?? map.pendente;
}

function tipoConfig(t: string) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    preventiva: { label: 'Preventiva', color: 'text-blue-600',    bg: 'bg-blue-50',    icon: <Shield size={13} />  },
    corretiva:  { label: 'Corretiva',  color: 'text-orange-600',  bg: 'bg-orange-50',  icon: <Wrench size={13} />  },
    urgente:    { label: 'Urgente',    color: 'text-red-600',     bg: 'bg-red-50',     icon: <Zap size={13} />     },
  };
  return map[t] ?? map.corretiva;
}

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */

export default function ManutencaoContent({ condominios }: Props) {
  const [manutencoes, setManutencoes]   = useState<Manutencao[]>([]);
  const [kpis, setKpis]                 = useState<KPIs>({ pendentes: 0, emExecucao: 0, concluidas: 0, custoTotal: 0 });
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<TipoTab>('todas');
  const [search, setSearch]             = useState('');
  const [filtroCondominio, setFiltroCondominio] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showCondoMenu, setShowCondoMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  /* ── Fetch ── */

  const fetchManutencoes = useCallback(async () => {
    if (!condominios.length) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      const condoIds = condominios.map((c) => c.id);
      const chunks   = chunkArray(condoIds, 30);

      const results = await Promise.all(
        chunks.map((chunk) =>
          getDocs(
            query(
              collection(db, 'manutencao'),
              where('condominioId', 'in', chunk)
            )
          )
        )
      );

      const docs = results.flatMap((r) => r.docs);

      const lista: Manutencao[] = docs.map((doc) => {
        const d       = doc.data();
        const condo   = condominios.find((c) => c.id === d.condominioId);
        const criadoEm = d.createdAt?.toDate?.() ?? new Date();

        return {
          id:              doc.id,
          condominioId:    d.condominioId,
          condominioNome:  condo?.nome ?? condo?.name ?? 'Desconhecido',
          titulo:          d.titulo ?? d.title ?? 'Sem título',
          descricao:       d.descricao ?? '',
          tipo:            d.tipo ?? 'corretiva',
          status:          d.status ?? 'pendente',
          custo:           d.custo ?? d.valor ?? 0,
          responsavel:     d.responsavel ?? d.tecnico ?? '-',
          dataAgendada:    d.dataAgendada?.toDate?.(),
          dataConclusao:   d.dataConclusao?.toDate?.(),
          createdAt:       criadoEm,
          diasPendente:    diasDesde(criadoEm),
        };
      });

      // Ordenar: urgente → pendente → em_execucao → concluida
      const statusOrder = { pendente: 0, em_execucao: 1, concluida: 2, cancelada: 3 };
      lista.sort((a, b) =>
        (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0) ||
        b.createdAt.getTime() - a.createdAt.getTime()
      );

      // KPIs
      const pendentes   = lista.filter((m) => m.status === 'pendente').length;
      const emExecucao  = lista.filter((m) => m.status === 'em_execucao').length;
      const concluidas  = lista.filter((m) => m.status === 'concluida').length;
      const custoTotal  = lista.reduce((acc, m) => acc + m.custo, 0);

      setKpis({ pendentes, emExecucao, concluidas, custoTotal });
      setManutencoes(lista);
    } catch (err: any) {
      console.error('[Manutencao]', err);
      setError('Erro ao carregar manutenções.');
    } finally {
      setLoading(false);
    }
  }, [condominios]);

  useEffect(() => { fetchManutencoes(); }, [fetchManutencoes]);

  /* ── Filtros ── */

  const filtradas = manutencoes.filter((m) => {
    const matchTab    = activeTab === 'todas' || m.tipo === activeTab;
    const matchCondo  = filtroCondominio === 'todos' || m.condominioId === filtroCondominio;
    const matchStatus = filtroStatus === 'todos' || m.status === filtroStatus;
    const matchSearch = !search ||
      m.titulo.toLowerCase().includes(search.toLowerCase()) ||
      m.responsavel.toLowerCase().includes(search.toLowerCase()) ||
      m.condominioNome.toLowerCase().includes(search.toLowerCase());

    return matchTab && matchCondo && matchStatus && matchSearch;
  });

  /* ── Skeleton ── */

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-zinc-200">
              <div className="h-4 w-24 bg-zinc-200 rounded mb-3" />
              <div className="h-8 w-16 bg-zinc-200 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="h-16 bg-zinc-100 rounded-xl" />
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
          <p className="text-red-700 font-semibold">Erro ao carregar manutenções</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
        <button
          onClick={fetchManutencoes}
          className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <RefreshCw size={14} />
          Tentar novamente
        </button>
      </div>
    );
  }

  const tabs: { key: TipoTab; label: string; count: number }[] = [
    { key: 'todas',      label: 'Todas',      count: manutencoes.length },
    { key: 'preventiva', label: 'Preventiva', count: manutencoes.filter((m) => m.tipo === 'preventiva').length },
    { key: 'corretiva',  label: 'Corretiva',  count: manutencoes.filter((m) => m.tipo === 'corretiva').length  },
    { key: 'urgente',    label: 'Urgente',    count: manutencoes.filter((m) => m.tipo === 'urgente').length    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-800">Manutenção</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Gestão técnica de {condominios.length} condomínio
            {condominios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchManutencoes}
          className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 transition shadow-sm"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Pendentes',
            value: kpis.pendentes,
            icon: <Clock size={16} className="text-amber-500" />,
            bg: 'bg-amber-50',
            alert: kpis.pendentes > 5,
          },
          {
            label: 'Em Execução',
            value: kpis.emExecucao,
            icon: <Wrench size={16} className="text-blue-500" />,
            bg: 'bg-blue-50',
            alert: false,
          },
          {
            label: 'Concluídas',
            value: kpis.concluidas,
            icon: <CheckCircle size={16} className="text-emerald-500" />,
            bg: 'bg-emerald-50',
            alert: false,
          },
          {
            label: 'Custo Total',
            value: formatMoney(kpis.custoTotal),
            icon: <DollarSign size={16} className="text-orange-500" />,
            bg: 'bg-orange-50',
            alert: false,
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`bg-white border rounded-2xl p-5 shadow-sm ${
              card.alert ? 'border-amber-200 bg-amber-50/30' : 'border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-zinc-500 font-medium">{card.label}</p>
              <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center`}>
                {card.icon}
              </div>
            </div>
            <h3 className={`text-2xl font-bold ${card.alert ? 'text-amber-600' : 'text-zinc-800'}`}>
              {card.value}
            </h3>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-zinc-800 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key
                ? 'bg-orange-100 text-orange-600'
                : 'bg-zinc-200 text-zinc-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="flex gap-3 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar título, responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
          />
        </div>

        {/* Filtro condomínio */}
        <div className="relative">
          <button
            onClick={() => { setShowCondoMenu((v) => !v); setShowStatusMenu(false); }}
            className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 transition"
          >
            <Building2 size={14} className="text-zinc-400" />
            {filtroCondominio === 'todos'
              ? 'Todos os condomínios'
              : condominios.find((c) => c.id === filtroCondominio)?.nome ?? 'Condomínio'}
            <ChevronDown size={13} className="text-zinc-400" />
          </button>
          {showCondoMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg z-20 overflow-hidden w-56">
              {['todos', ...condominios.map((c) => c.id)].map((id) => {
                const label = id === 'todos' ? 'Todos os condomínios' : condominios.find((c) => c.id === id)?.nome ?? id;
                return (
                  <button
                    key={id}
                    onClick={() => { setFiltroCondominio(id); setShowCondoMenu(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition ${
                      filtroCondominio === id
                        ? 'bg-orange-50 text-orange-600 font-medium'
                        : 'text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Filtro status */}
        <div className="relative">
          <button
            onClick={() => { setShowStatusMenu((v) => !v); setShowCondoMenu(false); }}
            className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 transition"
          >
            <ChevronDown size={13} className="text-zinc-400" />
            {filtroStatus === 'todos' ? 'Todos os estados' : statusManuConfig(filtroStatus).label}
          </button>
          {showStatusMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg z-20 overflow-hidden w-48">
              {['todos', 'pendente', 'em_execucao', 'concluida', 'cancelada'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setFiltroStatus(s); setShowStatusMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition ${
                    filtroStatus === s
                      ? 'bg-orange-50 text-orange-600 font-medium'
                      : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {s === 'todos' ? 'Todos os estados' : statusManuConfig(s).label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Contador ── */}
      <p className="text-xs text-zinc-400">
        {filtradas.length} manutenção{filtradas.length !== 1 ? 'ões' : ''}
      </p>

      {/* ── Lista ── */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="grid grid-cols-6 px-6 py-3 bg-zinc-50 border-b border-zinc-100">
          {['Manutenção', 'Condomínio', 'Tipo', 'Status', 'Custo', 'Data'].map((col) => (
            <p key={col} className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              {col}
            </p>
          ))}
        </div>

        {/* Linhas */}
        {!filtradas.length ? (
          <div className="px-6 py-16 text-center">
            <Wrench size={32} className="text-zinc-200 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">Nenhuma manutenção encontrada</p>
            <p className="text-zinc-300 text-sm mt-1">
              {search ? 'Tente outros termos de pesquisa' : 'Sem manutenções nesta categoria'}
            </p>
          </div>
        ) : (
          filtradas.map((m, idx) => {
            const tipo   = tipoConfig(m.tipo);
            const status = statusManuConfig(m.status);

            return (
              <div
                key={m.id}
                className={`grid grid-cols-6 px-6 py-4 items-center hover:bg-zinc-50/50 transition ${
                  idx < filtradas.length - 1 ? 'border-b border-zinc-50' : ''
                }`}
              >
                {/* Título */}
                <div>
                  <p className="text-sm font-semibold text-zinc-800 truncate">{m.titulo}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{m.responsavel}</p>
                </div>

                {/* Condomínio */}
                <div className="flex items-center gap-2">
                  <Building2 size={13} className="text-zinc-300 flex-shrink-0" />
                  <span className="text-sm text-zinc-600 truncate">{m.condominioNome}</span>
                </div>

                {/* Tipo */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${tipo.bg} ${tipo.color}`}>
                  {tipo.icon}
                  {tipo.label}
                </span>

                {/* Status */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${status.bg} ${status.color}`}>
                  {status.icon}
                  {status.label}
                </span>

                {/* Custo */}
                <span className="text-sm font-semibold text-zinc-800">
                  {m.custo > 0 ? formatMoney(m.custo) : '—'}
                </span>

                {/* Data */}
                <div className="flex items-center gap-1">
                  <Calendar size={12} className="text-zinc-300" />
                  <span className="text-xs text-zinc-500">
                    {(m.dataAgendada ?? m.createdAt).toLocaleDateString('pt-AO')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}