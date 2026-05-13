'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { getAuditLogs, type AuditLog, type AuditCategoria } from '@/lib/firebase/auditLog';
import {
  ShieldCheck, Search, RefreshCw, Loader2,
  DollarSign, Users, Bell, Building2, LogIn, Home, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Pagination, { usePagination } from '@/components/ui/Pagination';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORIA_CFG: Record<AuditCategoria, { label: string; icon: React.ReactNode; cls: string }> = {
  financeiro:   { label: 'Financeiro',   icon: <DollarSign size={12} />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  utilizadores: { label: 'Utilizadores', icon: <Users size={12} />,      cls: 'bg-blue-50 text-blue-700 border-blue-200'           },
  ocorrencias:  { label: 'Ocorrências',  icon: <Bell size={12} />,       cls: 'bg-amber-50 text-amber-700 border-amber-200'         },
  condominio:   { label: 'Condomínio',   icon: <Building2 size={12} />,  cls: 'bg-purple-50 text-purple-700 border-purple-200'      },
  acesso:       { label: 'Acesso',       icon: <LogIn size={12} />,      cls: 'bg-zinc-100 text-zinc-600 border-zinc-200'           },
  moradores:    { label: 'Moradores',    icon: <Home size={12} />,       cls: 'bg-orange-50 text-orange-700 border-orange-200'      },
  visitantes:   { label: 'Visitantes',   icon: <Eye size={12} />,        cls: 'bg-teal-50 text-teal-700 border-teal-200'            },
};

function CategoriaBadge({ categoria }: { categoria: AuditCategoria }) {
  const cfg = CATEGORIA_CFG[categoria] ?? CATEGORIA_CFG.condominio;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border', cfg.cls)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function formatDate(ts: any): string {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('pt-PT', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin:       'bg-red-50 text-red-700',
    gestor:      'bg-blue-50 text-blue-700',
    sindico:     'bg-purple-50 text-purple-700',
    funcionario: 'bg-emerald-50 text-emerald-700',
    morador:     'bg-orange-50 text-orange-700',
    sistema:     'bg-zinc-100 text-zinc-500',
  };
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-xs font-semibold', map[role] ?? 'bg-zinc-100 text-zinc-500')}>
      {role}
    </span>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const { userData } = useAuthContext();

  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [categoria, setCategoria] = useState<AuditCategoria | 'todas'>('todas');
  const [expanded, setExpanded] = useState<string | null>(null);

  const canAccess = userData?.role === 'admin'
    || userData?.role === 'super_admin'
    || userData?.role === 'gestor';

  // admin scoped: só vê os seus próprios logs + logs dos seus condomínios
  const isScopedAdmin      = userData?.role === 'admin';
  const condominiosGeridos = userData?.condominiosGeridos ?? [];
  const adminUid           = userData?.uid ?? '';

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      if (isScopedAdmin) {
        // Duas queries em paralelo:
        // 1. Logs onde o admin é o actor (as suas próprias acções)
        // 2. Logs dos seus condomínios (acções de outros nos seus condomínios)
        const promises: Promise<AuditLog[]>[] = [
          getAuditLogs({
            actorId:  adminUid,
            pageSize: 100,
            ...(categoria !== 'todas' ? { categoria } : {}),
          }),
        ];

        // Adicionar uma query por cada condomínio gerido
        for (const condoId of condominiosGeridos) {
          promises.push(
            getAuditLogs({
              condominioId: condoId,
              pageSize:     50,
              ...(categoria !== 'todas' ? { categoria } : {}),
            })
          );
        }

        const resultados = await Promise.all(promises);

        // Fundir sem duplicados, ordenar por data desc
        const mapa = new Map<string, AuditLog>();
        for (const lista of resultados) {
          for (const log of lista) mapa.set(log.id, log);
        }
        const merged = Array.from(mapa.values()).sort((a, b) => {
          const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
          const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
          return tb - ta;
        });
        setLogs(merged.slice(0, 150));
      } else if (userData?.role === 'gestor') {
        // gestor — só logs dos seus condomínios
        const gestorCondos = userData?.condominiosGeridos ?? [];
        const promises: Promise<AuditLog[]>[] = gestorCondos.map(condoId =>
          getAuditLogs({
            condominioId: condoId,
            pageSize: 50,
            ...(categoria !== 'todas' ? { categoria } : {}),
          })
        );
        const resultados = await Promise.all(promises);
        const mapa = new Map<string, AuditLog>();
        for (const lista of resultados) {
          for (const log of lista) mapa.set(log.id, log);
        }
        const merged = Array.from(mapa.values()).sort((a, b) => {
          const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
          const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
          return tb - ta;
        });
        setLogs(merged.slice(0, 100));
      } else {
        // super_admin — sem filtro
        const data = await getAuditLogs({
          pageSize: 100,
          ...(categoria !== 'todas' ? { categoria } : {}),
        });
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [categoria, isScopedAdmin, adminUid, condominiosGeridos.join(',')]);

  useEffect(() => { if (canAccess) fetchLogs(); }, [fetchLogs, canAccess]);

  const filtered = logs.filter(l =>
    (search === '' ||
      l.descricao.toLowerCase().includes(search.toLowerCase()) ||
      l.actorNome.toLowerCase().includes(search.toLowerCase()) ||
      l.accao.toLowerCase().includes(search.toLowerCase()))
  );

  // usePagination deve estar antes de qualquer early return (Rules of Hooks)
  const { paged, page, setPage, totalPages, totalItems, pageSize } = usePagination(filtered, 20);

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center p-8">
        <ShieldCheck className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900">Acesso Restrito</h2>
        <p className="text-zinc-500 mt-2 max-w-sm">Apenas Administradores e Gestores podem aceder ao registo de auditoria.</p>
      </div>
    );
  }

  const categorias: { key: AuditCategoria | 'todas'; label: string }[] = [
    { key: 'todas',       label: 'Todas'        },
    { key: 'financeiro',  label: 'Financeiro'   },
    { key: 'utilizadores',label: 'Utilizadores' },
    { key: 'ocorrencias', label: 'Ocorrências'  },
    { key: 'condominio',  label: 'Condomínio'   },
    { key: 'acesso',      label: 'Acesso'       },
    { key: 'moradores',   label: 'Moradores'    },
    { key: 'visitantes',  label: 'Visitantes'   },
  ];

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-zinc-100 rounded-xl">
            <ShieldCheck size={20} className="text-zinc-700" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Registo de Auditoria</h1>
            <p className="text-sm text-zinc-500">Histórico completo de acções no sistema</p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['financeiro', 'utilizadores', 'ocorrencias', 'acesso'] as AuditCategoria[]).map(cat => {
          const cfg = CATEGORIA_CFG[cat];
          const count = logs.filter(l => l.categoria === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setCategoria(prev => prev === cat ? 'todas' : cat)}
              className={cn(
                'bg-white border rounded-2xl p-4 shadow-sm text-left transition-all hover:shadow-md',
                categoria === cat ? 'border-orange-300 ring-1 ring-orange-200' : 'border-zinc-200',
              )}
            >
              <p className="text-2xl font-bold text-zinc-900">{count}</p>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">{cfg.icon}{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar por acção, utilizador ou descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categorias.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCategoria(key)}
              className={cn(
                'px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors',
                categoria === key
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
              )}
            >
              {label}
              {key !== 'todas' && (
                <span className="ml-1.5 opacity-60">({logs.filter(l => l.categoria === key).length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contador */}
      {!loading && (
        <p className="text-xs text-zinc-400">
          {filtered.length} registo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <ShieldCheck size={36} className="mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum registo encontrado</p>
          <p className="text-xs mt-1 opacity-70">As acções do sistema aparecerão aqui</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-100">
            {paged.map(log => (
              <div key={log.id} className="hover:bg-zinc-50/60 transition-colors">
                <div
                  className="flex items-start gap-4 px-4 py-3.5 cursor-pointer"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  {/* Categoria */}
                  <div className="shrink-0 pt-0.5">
                    <CategoriaBadge categoria={log.categoria} />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{log.descricao}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-zinc-500">{log.actorNome}</span>
                      <RoleBadge role={log.actorRole} />
                      <span className="text-xs text-zinc-400">{formatDate(log.createdAt)}</span>
                    </div>
                  </div>

                  {/* Acção */}
                  <span className="text-xs font-mono text-zinc-400 shrink-0 hidden sm:block">
                    {log.accao}
                  </span>
                </div>

                {/* Detalhes expandidos */}
                {expanded === log.id && log.meta && (
                  <div className="px-4 pb-4">
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Detalhes</p>
                      {log.condominioId && (
                        <div className="flex gap-2 text-xs">
                          <span className="text-zinc-400 w-24 shrink-0">Condomínio</span>
                          <span className="font-mono text-zinc-700">{log.condominioId}</span>
                        </div>
                      )}
                      {log.entidadeId && (
                        <div className="flex gap-2 text-xs">
                          <span className="text-zinc-400 w-24 shrink-0">{log.entidadeTipo ?? 'Entidade'}</span>
                          <span className="font-mono text-zinc-700">{log.entidadeId}</span>
                        </div>
                      )}
                      {Object.entries(log.meta).map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-xs">
                          <span className="text-zinc-400 w-24 shrink-0 capitalize">{k}</span>
                          <span className="font-mono text-zinc-700">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Paginação */}
          <div className="px-4 py-4 border-t border-zinc-100">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              itemsPerPage={pageSize}
              totalItems={totalItems}
            />
          </div>
        </div>
      )}
    </main>
  );
}
