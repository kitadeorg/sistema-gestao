'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { delegarOcorrencia, encerrarOcorrencia } from '@/lib/firebase/ocorrencias';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Bell, Search, Building2, DoorOpen, User, Calendar,
  AlertTriangle, Clock, CheckCircle2, XCircle, Loader2,
  X, UserCheck, RefreshCw, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props { condoId: string; }

interface Ocorrencia {
  id: string;
  titulo: string;
  descricao?: string;
  status: 'aberta' | 'delegada' | 'em_execucao' | 'concluida' | 'encerrada';
  prioridade: 'baixa' | 'media' | 'alta';
  categoria?: string;
  bloco?: string;
  unidadeNumero?: string;
  criadoPorNome?: string;
  instrucoes?: string;
  assignedTo?: string;
  assignedNome?: string;
  createdAt?: any;
  condominioId: string;
}

interface Funcionario { id: string; nome: string; email: string; cargo?: string; }

// ─── Badges ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
  aberta:      { cls: 'bg-red-50 text-red-700 border-red-200',         label: 'Aberta',       icon: <AlertTriangle size={10} /> },
  delegada:    { cls: 'bg-blue-50 text-blue-700 border-blue-200',       label: 'Delegada',     icon: <UserCheck size={10} />     },
  em_execucao: { cls: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Em Execução',  icon: <Clock size={10} />         },
  concluida:   { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Concluída', icon: <CheckCircle2 size={10} />  },
  encerrada:   { cls: 'bg-zinc-100 text-zinc-500 border-zinc-200',      label: 'Encerrada',    icon: <XCircle size={10} />       },
};

const PRIORIDADE_CFG = {
  alta:  { cls: 'bg-red-100 text-red-700',    bar: 'bg-red-400',   label: 'Alta'  },
  media: { cls: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400', label: 'Média' },
  baixa: { cls: 'bg-zinc-100 text-zinc-600',   bar: 'bg-zinc-300',  label: 'Baixa' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.aberta;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border', cfg.cls)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function PrioridadeBadge({ prioridade }: { prioridade: string }) {
  const cfg = PRIORIDADE_CFG[prioridade as keyof typeof PRIORIDADE_CFG] ?? PRIORIDADE_CFG.baixa;
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

// ─── Card de Ocorrência ───────────────────────────────────────────────────────

function OcorrenciaCard({
  o,
  onDelegar,
  onEncerrar,
}: {
  o: Ocorrencia;
  onDelegar: (o: Ocorrencia) => void;
  onEncerrar: (id: string) => void;
}) {
  const cfg = PRIORIDADE_CFG[o.prioridade] ?? PRIORIDADE_CFG.baixa;
  const dataFormatada = o.createdAt?.toDate
    ? o.createdAt.toDate().toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Barra de prioridade */}
      <div className={cn('h-1 w-full', cfg.bar)} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-zinc-900 truncate">{o.titulo}</h3>
            {o.categoria && <p className="text-xs text-zinc-400 mt-0.5">{o.categoria}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <PrioridadeBadge prioridade={o.prioridade} />
            <StatusBadge status={o.status} />
          </div>
        </div>

        {/* Descrição */}
        {o.descricao && (
          <p className="text-sm text-zinc-600 leading-relaxed line-clamp-2">{o.descricao}</p>
        )}

        {/* Funcionário atribuído */}
        {o.assignedNome && (
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <UserCheck size={12} />
            <span>Atribuído a <strong>{o.assignedNome}</strong></span>
          </div>
        )}

        {/* Instruções */}
        {o.instrucoes && (
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-zinc-600 mb-1">Instruções enviadas</p>
            <p className="text-xs text-zinc-700">{o.instrucoes}</p>
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
          {(o.bloco || o.unidadeNumero) && (
            <span className="flex items-center gap-1">
              <Building2 size={11} />
              {o.bloco && `Bloco ${o.bloco}`}
              {o.bloco && o.unidadeNumero && ' · '}
              {o.unidadeNumero && `Unidade ${o.unidadeNumero}`}
            </span>
          )}
          {o.criadoPorNome && (
            <span className="flex items-center gap-1"><User size={11} />{o.criadoPorNome}</span>
          )}
          {dataFormatada && (
            <span className="flex items-center gap-1"><Calendar size={11} />{dataFormatada}</span>
          )}
        </div>

        {/* Acções */}
        <div className="pt-2 border-t border-zinc-100 flex gap-2">
          {(o.status === 'aberta' || o.status === 'delegada') && (
            <button
              onClick={() => onDelegar(o)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <UserCheck size={13} />
              {o.status === 'delegada' ? 'Re-delegar' : 'Delegar'}
            </button>
          )}
          {o.status === 'concluida' && (
            <button
              onClick={() => onEncerrar(o.id)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <XCircle size={13} />
              Encerrar
            </button>
          )}
          {o.status === 'encerrada' && (
            <div className="flex-1 flex items-center justify-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 size={13} />
              Encerrada
            </div>
          )}
          {o.status === 'em_execucao' && (
            <div className="flex-1 flex items-center justify-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-xl px-3 py-2">
              <Clock size={13} />
              Em execução pelo funcionário
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Painel de Delegação ──────────────────────────────────────────────────────

function DelegarPanel({
  ocorrencia,
  onClose,
  onSuccess,
}: {
  ocorrencia: Ocorrencia;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { userData } = useAuthContext();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selected, setSelected]         = useState('');
  const [prioridade, setPrioridade]     = useState<'baixa' | 'media' | 'alta'>(ocorrencia.prioridade ?? 'media');
  const [instrucoes, setInstrucoes]     = useState(ocorrencia.instrucoes ?? '');
  const [loading, setLoading]           = useState(false);
  const [loadingFuncs, setLoadingFuncs] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(query(
        collection(db, 'usuarios'),
        where('role', '==', 'funcionario'),
        where('condominioId', '==', ocorrencia.condominioId),
      ));
      setFuncionarios(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      // Pré-selecionar o funcionário já atribuído
      if (ocorrencia.assignedTo) setSelected(ocorrencia.assignedTo);
      setLoadingFuncs(false);
    };
    fetch();
  }, [ocorrencia]);

  const handleConfirm = async () => {
    if (!selected) { toast.error('Seleciona um funcionário.'); return; }
    if (!userData) return;
    setLoading(true);
    try {
      await delegarOcorrencia(ocorrencia.id, selected, userData.uid, prioridade, instrucoes || undefined);
      toast.success('Ocorrência delegada com sucesso.');
      onSuccess();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao delegar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 h-full w-full sm:max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl"><UserCheck size={18} className="text-orange-500" /></div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Delegar Ocorrência</h2>
              <p className="text-xs text-zinc-500 truncate max-w-[220px]">{ocorrencia.titulo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Funcionários */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Funcionário *
            </label>
            {loadingFuncs ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400 py-3">
                <Loader2 size={14} className="animate-spin" /> A carregar...
              </div>
            ) : funcionarios.length === 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                Nenhum funcionário activo neste condomínio. Adiciona um funcionário primeiro.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {funcionarios.map(f => (
                  <div
                    key={f.id}
                    onClick={() => setSelected(f.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors',
                      selected === f.id
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-zinc-200 hover:bg-zinc-50',
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 shrink-0">
                      {f.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{f.nome}</p>
                      <p className="text-xs text-zinc-500 truncate">{f.cargo ?? f.email}</p>
                    </div>
                    {selected === f.id && <CheckCircle2 size={16} className="text-orange-500 shrink-0 ml-auto" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Prioridade</label>
            <div className="grid grid-cols-3 gap-2">
              {(['baixa', 'media', 'alta'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPrioridade(p)}
                  className={cn(
                    'py-2 rounded-xl text-xs font-semibold border transition-colors',
                    prioridade === p
                      ? p === 'alta'  ? 'bg-red-500 text-white border-red-500'
                      : p === 'media' ? 'bg-amber-500 text-white border-amber-500'
                      :                 'bg-zinc-700 text-white border-zinc-700'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
                  )}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Instruções */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Instruções para o funcionário (opcional)
            </label>
            <textarea
              value={instrucoes}
              onChange={e => setInstrucoes(e.target.value)}
              rows={4}
              placeholder="Ex: Verificar a canalização do 3º andar, trazer ferramentas específicas..."
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none bg-white"
            />
          </div>

          {/* Info do fluxo */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-1">
            <p className="font-semibold">O que acontece depois:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
              <li>O funcionário vê a ocorrência nas suas tarefas</li>
              <li>Clica em "Iniciar Execução" quando começar</li>
              <li>Clica em "Concluída" quando terminar</li>
              <li>Tu podes encerrar definitivamente</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !selected}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {loading ? <><Loader2 size={15} className="animate-spin" />A delegar...</> : <><UserCheck size={15} />Delegar</>}
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

type StatusFiltro = 'todas' | 'aberta' | 'delegada' | 'em_execucao' | 'concluida' | 'encerrada';

export default function OcorrenciasSindicoContent({ condoId }: Props) {
  const { userData } = useAuthContext();

  const [ocorrencias, setOcorrencias]   = useState<Ocorrencia[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filtro, setFiltro]             = useState<StatusFiltro>('todas');
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<Ocorrencia | null>(null);

  const fetchOcorrencias = useCallback(async () => {
    if (!condoId) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'ocorrencias'), where('condominioId', '==', condoId)));

      // Enriquecer com nome do funcionário atribuído
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Ocorrencia));

      // Buscar nomes dos funcionários atribuídos
      const uidsUnicos = [...new Set(docs.map(d => d.assignedTo).filter(Boolean))];
      const nomesMap: Record<string, string> = {};
      if (uidsUnicos.length > 0) {
        const funcsSnap = await getDocs(query(collection(db, 'usuarios'), where('role', '==', 'funcionario'), where('condominioId', '==', condoId)));
        funcsSnap.docs.forEach(d => { nomesMap[d.id] = d.data().nome; });
      }

      setOcorrencias(docs.map(d => ({ ...d, assignedNome: d.assignedTo ? nomesMap[d.assignedTo] : undefined })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [condoId]);

  useEffect(() => { fetchOcorrencias(); }, [fetchOcorrencias]);

  const handleEncerrar = async (id: string) => {
    try {
      await encerrarOcorrencia(id);
      toast.success('Ocorrência encerrada.');
      setOcorrencias(prev => prev.map(o => o.id === id ? { ...o, status: 'encerrada' } : o));
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao encerrar.');
    }
  };

  const filtered = ocorrencias
    .filter(o => filtro === 'todas' || o.status === filtro)
    .filter(o =>
      search === '' ||
      o.titulo?.toLowerCase().includes(search.toLowerCase()) ||
      o.criadoPorNome?.toLowerCase().includes(search.toLowerCase()) ||
      o.unidadeNumero?.toLowerCase().includes(search.toLowerCase())
    );

  // KPIs
  const kpis = [
    { label: 'Abertas',      value: ocorrencias.filter(o => o.status === 'aberta').length,      cor: 'text-red-500'     },
    { label: 'Delegadas',    value: ocorrencias.filter(o => o.status === 'delegada').length,    cor: 'text-blue-500'    },
    { label: 'Em Execução',  value: ocorrencias.filter(o => o.status === 'em_execucao').length, cor: 'text-orange-500'  },
    { label: 'Concluídas',   value: ocorrencias.filter(o => o.status === 'concluida').length,   cor: 'text-emerald-500' },
  ];

  const filtros: { key: StatusFiltro; label: string }[] = [
    { key: 'todas',       label: 'Todas'       },
    { key: 'aberta',      label: 'Abertas'     },
    { key: 'delegada',    label: 'Delegadas'   },
    { key: 'em_execucao', label: 'Em Execução' },
    { key: 'concluida',   label: 'Concluídas'  },
    { key: 'encerrada',   label: 'Encerradas'  },
  ];

  return (
    <>
      <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-50 rounded-xl"><Bell size={20} className="text-orange-500" /></div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Ocorrências</h1>
              <p className="text-sm text-zinc-500">Gerir e delegar ocorrências do condomínio</p>
            </div>
          </div>
          <button onClick={fetchOcorrencias} disabled={loading} className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-50">
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map(({ label, value, cor }) => (
            <div key={label} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm text-center">
              <p className={cn('text-2xl font-bold', cor)}>{value}</p>
              <p className="text-xs text-zinc-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Filtros + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar por título, morador ou unidade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {filtros.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={cn(
                  'px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors',
                  filtro === key
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
                )}
              >
                {label}
                {key !== 'todas' && (
                  <span className="ml-1.5 opacity-60">
                    ({ocorrencias.filter(o => o.status === key).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Contador */}
        {!loading && (
          <p className="text-xs text-zinc-400">
            {filtered.length} ocorrência{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Bell size={36} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhuma ocorrência encontrada</p>
            <p className="text-xs mt-1 opacity-70">Tenta mudar o filtro ou a pesquisa</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(o => (
              <OcorrenciaCard
                key={o.id}
                o={o}
                onDelegar={setSelectedOcorrencia}
                onEncerrar={handleEncerrar}
              />
            ))}
          </div>
        )}
      </main>

      {selectedOcorrencia && (
        <DelegarPanel
          ocorrencia={selectedOcorrencia}
          onClose={() => setSelectedOcorrencia(null)}
          onSuccess={() => { setSelectedOcorrencia(null); fetchOcorrencias(); }}
        />
      )}
    </>
  );
}
