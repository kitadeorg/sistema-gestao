'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getHistoricoResidencia, type HistoricoResidencia } from '@/lib/firebase/moradores';
import { History, Search, ArrowLeft, User, Building2, Calendar, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function formatDate(ts: any): string {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HistoricoResidenciaPage() {
  const { condoId } = useParams() as { condoId: string };

  const [historico, setHistorico] = useState<HistoricoResidencia[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState('');

  const fetchHistorico = useCallback(async () => {
    if (!condoId) return;
    setLoading(true);
    try {
      const data = await getHistoricoResidencia(condoId);
      // Ordenar por dataSaida desc
      data.sort((a, b) => {
        const toMs = (v: any) => {
          if (!v) return 0;
          if (typeof v.toDate === 'function') return v.toDate().getTime();
          if (v instanceof Date) return v.getTime();
          return 0;
        };
        return toMs(b.dataSaida) - toMs(a.dataSaida);
      });
      setHistorico(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [condoId]);

  useEffect(() => { fetchHistorico(); }, [fetchHistorico]);

  // Unidades únicas para filtro
  const unidadesUnicas = [...new Set(
    historico.map(h => h.unidadeNumero ? (h.bloco ? `${h.bloco} — ${h.unidadeNumero}` : h.unidadeNumero) : '—')
  )].sort();

  const filtered = historico.filter(h => {
    const matchSearch =
      search === '' ||
      h.nome?.toLowerCase().includes(search.toLowerCase()) ||
      h.email?.toLowerCase().includes(search.toLowerCase()) ||
      h.unidadeNumero?.toLowerCase().includes(search.toLowerCase());

    const unidadeLabel = h.unidadeNumero ? (h.bloco ? `${h.bloco} — ${h.unidadeNumero}` : h.unidadeNumero) : '—';
    const matchUnidade = filtroUnidade === '' || unidadeLabel === filtroUnidade;

    return matchSearch && matchUnidade;
  });

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/condominio/${condoId}/moradores`}
            className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors text-zinc-500"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="p-2.5 bg-violet-50 rounded-xl">
            <History size={20} className="text-violet-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Histórico de Residência</h1>
            <p className="text-sm text-zinc-500">Registo de todos os moradores anteriores</p>
          </div>
        </div>
        <div className="text-sm text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-xl font-medium">
          {historico.length} registo{historico.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
          />
        </div>
        <select
          value={filtroUnidade}
          onChange={e => setFiltroUnidade(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
        >
          <option value="">Todas as unidades</option>
          {unidadesUnicas.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <History size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum registo encontrado</p>
          <p className="text-xs mt-1 opacity-70">O histórico é preenchido quando um morador é eliminado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(h => {
            const unidadeLabel = h.unidadeNumero
              ? (h.bloco ? `Bloco ${h.bloco} — Unidade ${h.unidadeNumero}` : `Unidade ${h.unidadeNumero}`)
              : '—';

            return (
              <div
                key={h.id}
                className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                  {/* Info do morador */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-bold shrink-0">
                      {h.nome?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 text-sm">{h.nome}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {h.email && <p className="text-xs text-zinc-400 truncate">{h.email}</p>}
                        {h.telefone && <p className="text-xs text-zinc-400">{h.telefone}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Badge tipo */}
                  <span className={cn(
                    'text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 self-start sm:self-auto',
                    h.tipo === 'proprietario'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-orange-50 text-orange-700 border-orange-200',
                  )}>
                    {h.tipo === 'proprietario' ? 'Proprietário' : 'Inquilino'}
                  </span>
                </div>

                {/* Detalhes */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Building2 size={13} className="text-zinc-400 shrink-0" />
                    <span>{unidadeLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Calendar size={13} className="text-zinc-400 shrink-0" />
                    <span>Entrada: <span className="font-medium text-zinc-700">{formatDate(h.dataEntrada)}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Calendar size={13} className="text-zinc-400 shrink-0" />
                    <span>Saída: <span className="font-medium text-zinc-700">{formatDate(h.dataSaida)}</span></span>
                  </div>
                </div>

                {/* Duração */}
                {h.dataEntrada && h.dataSaida && (() => {
                  const toDate = (v: any): Date => {
                    if (!v) return new Date(0);
                    if (typeof v.toDate === 'function') return v.toDate();
                    if (v instanceof Date) return v;
                    return new Date(0);
                  };
                  const entrada = toDate(h.dataEntrada);
                  const saida   = toDate(h.dataSaida);
                  const meses   = Math.round((saida.getTime() - entrada.getTime()) / (1000 * 60 * 60 * 24 * 30));
                  if (meses <= 0) return null;
                  return (
                    <div className="mt-3 pt-3 border-t border-zinc-100">
                      <p className="text-xs text-zinc-400">
                        Duração: <span className="font-medium text-zinc-600">
                          {meses >= 12
                            ? `${Math.floor(meses / 12)} ano${Math.floor(meses / 12) !== 1 ? 's' : ''} e ${meses % 12} mês${meses % 12 !== 1 ? 'es' : ''}`
                            : `${meses} mês${meses !== 1 ? 'es' : ''}`}
                        </span>
                      </p>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
