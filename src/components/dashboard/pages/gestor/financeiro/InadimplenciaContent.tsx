'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Building2,
  User,
  Calendar,
  RefreshCw,
  TrendingDown,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  Search,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

interface Props {
  condominios: any[];
}

interface PagamentoAtrasado {
  id: string;
  condominioId: string;
  condominioNome: string;
  moradorNome: string;
  unidade: string;
  valor: number;
  dataVencimento: Date;
  diasAtraso: number;
  status: string;
}

interface InadimplenciaCondo {
  condominioId: string;
  condominioNome: string;
  totalUnidades: number;
  inadimplentes: number;
  valorEmAberto: number;
  taxaInadimplencia: number;
}

interface InadimplenciaGeral {
  taxaMedia: number;
  totalEmAberto: number;
  totalInadimplentes: number;
  porCondominio: InadimplenciaCondo[];
  pagamentosAtrasados: PagamentoAtrasado[];
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

function diasAtraso(data: Date): number {
  const hoje = new Date();
  const diff = hoje.getTime() - data.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function severidade(dias: number): {
  label: string;
  color: string;
  bg: string;
  dot: string;
} {
  if (dias <= 15) return {
    label: 'Leve',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    dot: 'bg-amber-400',
  };
  if (dias <= 30) return {
    label: 'Moderado',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    dot: 'bg-orange-400',
  };
  return {
    label: 'Grave',
    color: 'text-red-600',
    bg: 'bg-red-50',
    dot: 'bg-red-500',
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */

export default function InadimplenciaContent({ condominios }: Props) {
  const [dados, setDados] = useState<InadimplenciaGeral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtroCondominio, setFiltroCondominio] = useState<string>('todos');
  const [showFiltro, setShowFiltro] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumo' | 'lista'>('resumo');

  /* ── Fetch ── */

  const fetchInadimplencia = useCallback(async () => {
    if (!condominios.length) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const hoje = new Date();
      const condoIds = condominios.map((c) => c.id);
      const chunks = chunkArray(condoIds, 30);

      // ── Buscar pagamentos atrasados ──
      const atrasadosResults = await Promise.all(
        chunks.map((chunk) =>
          getDocs(
            query(
              collection(db, 'pagamentos'),
              where('condominioId', 'in', chunk),
              where('status', '==', 'pendente'),
              where('dataVencimento', '<', Timestamp.fromDate(hoje))
            )
          )
        )
      );
      const atrasadosDocs = atrasadosResults.flatMap((r) => r.docs);

      // ── Buscar total de unidades por condomínio ──
      const unidadesResults = await Promise.all(
        chunks.map((chunk) =>
          getDocs(
            query(
              collection(db, 'unidades'),
              where('condominioId', 'in', chunk)
            )
          )
        )
      );
      const unidadesDocs = unidadesResults.flatMap((r) => r.docs);

      // ── Mapa de unidades por condomínio ──
      const mapaUnidades = new Map<string, number>();
      unidadesDocs.forEach((doc) => {
        const id = doc.data().condominioId;
        mapaUnidades.set(id, (mapaUnidades.get(id) || 0) + 1);
      });

      // ── Mapa de inadimplentes por condomínio ──
      const mapaInadimplentes = new Map<string, number>();
      const mapaValorAberto = new Map<string, number>();

      atrasadosDocs.forEach((doc) => {
        const d = doc.data();
        const id = d.condominioId;
        mapaInadimplentes.set(id, (mapaInadimplentes.get(id) || 0) + 1);
        mapaValorAberto.set(id, (mapaValorAberto.get(id) || 0) + (d.valor || 0));
      });

      // ── Montar lista de pagamentos atrasados ──
      const pagamentosAtrasados: PagamentoAtrasado[] = atrasadosDocs.map((doc) => {
        const d = doc.data();
        const vencimento = d.dataVencimento?.toDate?.() || new Date();
        const condo = condominios.find((c) => c.id === d.condominioId);

        return {
          id: doc.id,
          condominioId: d.condominioId,
          condominioNome: condo?.nome || condo?.name || 'Desconhecido',
          moradorNome: d.moradorNome || d.nomeDevedor || 'Morador',
          unidade: d.unidade || d.numeroUnidade || '-',
          valor: d.valor || 0,
          dataVencimento: vencimento,
          diasAtraso: diasAtraso(vencimento),
          status: d.status,
        };
      });

      // Ordenar por dias em atraso desc
      pagamentosAtrasados.sort((a, b) => b.diasAtraso - a.diasAtraso);

      // ── Por condomínio ──
      const porCondominio: InadimplenciaCondo[] = condominios.map((condo) => {
        const total = mapaUnidades.get(condo.id) || 0;
        const inadimplentes = mapaInadimplentes.get(condo.id) || 0;
        const valorEmAberto = mapaValorAberto.get(condo.id) || 0;
        const taxa = total > 0 ? (inadimplentes / total) * 100 : 0;

        return {
          condominioId: condo.id,
          condominioNome: condo.nome || condo.name || 'Sem nome',
          totalUnidades: total,
          inadimplentes,
          valorEmAberto,
          taxaInadimplencia: taxa,
        };
      });

      // Ordenar por taxa desc
      porCondominio.sort((a, b) => b.taxaInadimplencia - a.taxaInadimplencia);

      // ── Totais ──
      const totalInadimplentes = atrasadosDocs.length;
      const totalEmAberto = atrasadosDocs.reduce(
        (acc, doc) => acc + (doc.data().valor || 0),
        0
      );
      const totalUnidadesGeral = unidadesDocs.length;
      const taxaMedia = totalUnidadesGeral > 0
        ? (totalInadimplentes / totalUnidadesGeral) * 100
        : 0;

      setDados({
        taxaMedia,
        totalEmAberto,
        totalInadimplentes,
        porCondominio,
        pagamentosAtrasados,
      });
    } catch (err: any) {
      console.error('[Inadimplencia] Erro:', err);
      setError('Erro ao carregar dados de inadimplência.');
    } finally {
      setLoading(false);
    }
  }, [condominios]);

  useEffect(() => {
    fetchInadimplencia();
  }, [fetchInadimplencia]);

  /* ── Filtros ── */

  const pagamentosFiltrados = (dados?.pagamentosAtrasados || []).filter((p) => {
    const matchSearch =
      !search ||
      p.moradorNome.toLowerCase().includes(search.toLowerCase()) ||
      p.unidade.toLowerCase().includes(search.toLowerCase()) ||
      p.condominioNome.toLowerCase().includes(search.toLowerCase());

    const matchCondo =
      filtroCondominio === 'todos' || p.condominioId === filtroCondominio;

    return matchSearch && matchCondo;
  });

  /* ── Skeleton ── */

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-zinc-200">
              <div className="h-4 w-28 bg-zinc-200 rounded mb-3" />
              <div className="h-8 w-24 bg-zinc-200 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-zinc-100 rounded-xl" />
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
          onClick={fetchInadimplencia}
          className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <RefreshCw size={14} />
          Tentar novamente
        </button>
      </div>
    );
  }

  const taxaColor =
    (dados?.taxaMedia || 0) > 30
      ? 'text-red-600'
      : (dados?.taxaMedia || 0) > 15
      ? 'text-amber-600'
      : 'text-emerald-600';

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-800">Inadimplência</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Monitorização de pagamentos em atraso
          </p>
        </div>

        <button
          onClick={fetchInadimplencia}
          className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 transition shadow-sm"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Taxa média */}
        <div className={`border rounded-2xl p-5 shadow-sm ${
          (dados?.taxaMedia || 0) > 20
            ? 'bg-red-50/40 border-red-200'
            : 'bg-white border-zinc-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-zinc-500 font-medium">Taxa de Inadimplência</p>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
          </div>
          <h3 className={`text-3xl font-bold ${taxaColor}`}>
            {dados?.taxaMedia?.toFixed(1) || '0.0'}%
          </h3>
          <p className="text-xs text-zinc-400 mt-1">média geral do portfólio</p>
        </div>

        {/* Total inadimplentes */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-zinc-500 font-medium">Pagamentos em Atraso</p>
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock size={16} className="text-amber-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-zinc-800">
            {dados?.totalInadimplentes || 0}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">quotas não pagas</p>
        </div>

        {/* Valor em aberto */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-zinc-500 font-medium">Valor em Aberto</p>
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <TrendingDown size={16} className="text-orange-500" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-zinc-800">
            {formatMoney(dados?.totalEmAberto || 0)}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">a recuperar</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        {[
          { key: 'resumo', label: 'Por Condomínio' },
          { key: 'lista', label: 'Lista Detalhada' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-zinc-800 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Resumo por Condomínio ── */}
      {activeTab === 'resumo' && (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Header */}
          <div className="grid grid-cols-5 px-6 py-3 bg-zinc-50 border-b border-zinc-100">
            {['Condomínio', 'Unidades', 'Inadimplentes', 'Valor em Aberto', 'Taxa'].map((col) => (
              <p key={col} className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                {col}
              </p>
            ))}
          </div>

          {!dados?.porCondominio.length ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle size={32} className="text-emerald-200 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">Sem inadimplência registada!</p>
            </div>
          ) : (
            dados.porCondominio.map((item, idx) => {
              const sv = severidade(
                item.taxaInadimplencia > 30 ? 45 :
                item.taxaInadimplencia > 15 ? 20 : 5
              );

              return (
                <div
                  key={item.condominioId}
                  className={`grid grid-cols-5 px-6 py-4 items-center hover:bg-zinc-50/50 transition ${
                    idx < dados.porCondominio.length - 1
                      ? 'border-b border-zinc-50'
                      : ''
                  }`}
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

                  {/* Total unidades */}
                  <span className="text-sm text-zinc-600">{item.totalUnidades}</span>

                  {/* Inadimplentes */}
                  <span className="text-sm font-semibold text-red-500">
                    {item.inadimplentes}
                  </span>

                  {/* Valor */}
                  <span className="text-sm font-semibold text-zinc-800">
                    {formatMoney(item.valorEmAberto)}
                  </span>

                  {/* Taxa com barra */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          item.taxaInadimplencia > 30
                            ? 'bg-red-400'
                            : item.taxaInadimplencia > 15
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, item.taxaInadimplencia)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold w-10 text-right ${
                      item.taxaInadimplencia > 30
                        ? 'text-red-600'
                        : item.taxaInadimplencia > 15
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}>
                      {item.taxaInadimplencia.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB: Lista Detalhada ── */}
      {activeTab === 'lista' && (
        <div className="space-y-4">

          {/* Filtros */}
          <div className="flex gap-3 flex-wrap">

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Pesquisar morador, unidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
              />
            </div>

            {/* Filtro condomínio */}
            <div className="relative">
              <button
                onClick={() => setShowFiltro((v) => !v)}
                className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 transition"
              >
                <Building2 size={14} className="text-zinc-400" />
                {filtroCondominio === 'todos'
                  ? 'Todos os condomínios'
                  : condominios.find((c) => c.id === filtroCondominio)?.nome || 'Condomínio'}
                <ChevronDown size={13} className="text-zinc-400" />
              </button>

              {showFiltro && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg z-20 overflow-hidden w-56">
                  <button
                    onClick={() => {
                      setFiltroCondominio('todos');
                      setShowFiltro(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition ${
                      filtroCondominio === 'todos'
                        ? 'bg-orange-50 text-orange-600 font-medium'
                        : 'text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    Todos os condomínios
                  </button>
                  {condominios.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setFiltroCondominio(c.id);
                        setShowFiltro(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition ${
                        filtroCondominio === c.id
                          ? 'bg-orange-50 text-orange-600 font-medium'
                          : 'text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {c.nome || c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contador */}
          <p className="text-xs text-zinc-400">
            {pagamentosFiltrados.length} pagamento
            {pagamentosFiltrados.length !== 1 ? 's' : ''} em atraso
          </p>

          {/* Lista */}
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">

            {/* Header */}
            <div className="grid grid-cols-6 px-6 py-3 bg-zinc-50 border-b border-zinc-100">
              {['Morador', 'Condomínio', 'Unidade', 'Valor', 'Vencimento', 'Atraso'].map((col) => (
                <p key={col} className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  {col}
                </p>
              ))}
            </div>

            {!pagamentosFiltrados.length ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle size={32} className="text-emerald-200 mx-auto mb-2" />
                <p className="text-zinc-400 text-sm">
                  {search || filtroCondominio !== 'todos'
                    ? 'Nenhum resultado encontrado'
                    : 'Sem pagamentos em atraso!'}
                </p>
              </div>
            ) : (
              pagamentosFiltrados.map((p, idx) => {
                const sv = severidade(p.diasAtraso);

                return (
                  <div
                    key={p.id}
                    className={`grid grid-cols-6 px-6 py-4 items-center hover:bg-zinc-50/50 transition ${
                      idx < pagamentosFiltrados.length - 1
                        ? 'border-b border-zinc-50'
                        : ''
                    }`}
                  >
                    {/* Morador */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={13} className="text-zinc-400" />
                      </div>
                      <span className="text-sm font-medium text-zinc-700 truncate">
                        {p.moradorNome}
                      </span>
                    </div>

                    {/* Condomínio */}
                    <span className="text-sm text-zinc-500 truncate">
                      {p.condominioNome}
                    </span>

                    {/* Unidade */}
                    <span className="text-sm text-zinc-600 font-mono">
                      {p.unidade}
                    </span>

                    {/* Valor */}
                    <span className="text-sm font-semibold text-zinc-800">
                      {formatMoney(p.valor)}
                    </span>

                    {/* Data vencimento */}
                    <div className="flex items-center gap-1">
                      <Calendar size={12} className="text-zinc-400" />
                      <span className="text-xs text-zinc-500">
                        {p.dataVencimento.toLocaleDateString('pt-AO')}
                      </span>
                    </div>

                    {/* Dias em atraso */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sv.bg} ${sv.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sv.dot}`} />
                        {p.diasAtraso}d — {sv.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}