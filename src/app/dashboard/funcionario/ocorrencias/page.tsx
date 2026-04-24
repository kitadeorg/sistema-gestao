'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { iniciarExecucao, concluirOcorrencia } from '@/lib/firebase/ocorrencias';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Bell, Search, CheckCircle2, Clock, Zap,
  MapPin, User, Calendar, AlertTriangle, Loader2
} from 'lucide-react';

interface Ocorrencia {
  id: string;
  titulo: string;
  descricao: string;
  prioridade: 'baixa' | 'media' | 'alta';
  status: 'aberta' | 'delegada' | 'em_execucao' | 'concluida' | 'encerrada';
  categoria?: string;
  bloco?: string;
  unidadeNumero?: string;
  criadoPorNome?: string;
  instrucoes?: string;
  createdAt?: any;
}

/* ─── Badges ─────────────────────────────────────────────── */

function PrioridadeBadge({ prioridade }: { prioridade: Ocorrencia['prioridade'] }) {
  const cfg = {
    alta:  { cls: 'bg-red-100 text-red-700 border border-red-200',    label: 'Alta'   },
    media: { cls: 'bg-amber-100 text-amber-700 border border-amber-200', label: 'Média' },
    baixa: { cls: 'bg-zinc-100 text-zinc-600 border border-zinc-200',  label: 'Baixa' },
  };
  const { cls, label } = cfg[prioridade] ?? cfg.baixa;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: Ocorrencia['status'] }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    aberta:      { cls: 'bg-zinc-100 text-zinc-600',       label: 'Aberta'       },
    delegada:    { cls: 'bg-blue-100 text-blue-700',       label: 'Delegada'     },
    em_execucao: { cls: 'bg-orange-100 text-orange-700',   label: 'Em Execução'  },
    concluida:   { cls: 'bg-emerald-100 text-emerald-700', label: 'Concluída'    },
    encerrada:   { cls: 'bg-zinc-200 text-zinc-500',       label: 'Encerrada'    },
  };
  const { cls, label } = cfg[status] ?? cfg.aberta;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

/* ─── Card ───────────────────────────────────────────────── */

function OcorrenciaCard({
  o,
  onIniciar,
  onConcluir,
}: {
  o: Ocorrencia;
  onIniciar: (id: string) => void;
  onConcluir: (id: string) => void;
}) {
  const [loadingAction, setLoadingAction] = useState(false);

  const handleIniciar = async () => {
    setLoadingAction(true);
    await onIniciar(o.id);
    setLoadingAction(false);
  };

  const handleConcluir = async () => {
    setLoadingAction(true);
    await onConcluir(o.id);
    setLoadingAction(false);
  };

  const dataFormatada = o.createdAt?.toDate
    ? o.createdAt.toDate().toLocaleDateString('pt-PT', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null;

  const isAtiva = o.status === 'delegada' || o.status === 'em_execucao';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-all hover:shadow-md ${
      o.status === 'em_execucao'
        ? 'border-orange-300 ring-1 ring-orange-200'
        : 'border-zinc-200'
    }`}>
      {/* Topo colorido por prioridade */}
      <div className={`h-1 w-full rounded-t-2xl ${
        o.prioridade === 'alta'  ? 'bg-red-400'   :
        o.prioridade === 'media' ? 'bg-amber-400' : 'bg-zinc-300'
      }`} />

      <div className="p-5 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-zinc-900 truncate">
              {o.titulo}
            </h3>
            {o.categoria && (
              <p className="text-xs text-zinc-400 mt-0.5">{o.categoria}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PrioridadeBadge prioridade={o.prioridade} />
            <StatusBadge status={o.status} />
          </div>
        </div>

        {/* Descrição */}
        {o.descricao && (
          <p className="text-sm text-zinc-600 leading-relaxed line-clamp-2">
            {o.descricao}
          </p>
        )}

        {/* Instruções do síndico */}
        {o.instrucoes && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1.5">
              <Bell size={11} className="text-blue-600" />
              Instruções do síndico
            </p>
            <p className="text-xs text-blue-800">{o.instrucoes}</p>
          </div>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
          {(o.bloco || o.unidadeNumero) && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {o.bloco && `Bloco ${o.bloco}`}
              {o.bloco && o.unidadeNumero && ' · '}
              {o.unidadeNumero && `Unidade ${o.unidadeNumero}`}
            </span>
          )}
          {o.criadoPorNome && (
            <span className="flex items-center gap-1">
              <User size={12} />
              {o.criadoPorNome}
            </span>
          )}
          {dataFormatada && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {dataFormatada}
            </span>
          )}
        </div>

        {/* Acções */}
        {isAtiva && (
          <div className="pt-1 border-t border-zinc-100">
            {o.status === 'delegada' && (
              <button
                onClick={handleIniciar}
                disabled={loadingAction}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {loadingAction
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Zap size={14} />
                }
                Iniciar Execução
              </button>
            )}

            {o.status === 'em_execucao' && (
              <button
                onClick={handleConcluir}
                disabled={loadingAction}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {loadingAction
                  ? <Loader2 size={14} className="animate-spin" />
                  : <CheckCircle2 size={14} />
                }
                Marcar como Concluída
              </button>
            )}
          </div>
        )}

        {(o.status === 'concluida' || o.status === 'encerrada') && (
          <div className="pt-1 border-t border-zinc-100 flex items-center gap-2 text-xs text-emerald-600">
            <CheckCircle2 size={14} />
            Ocorrência finalizada
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */

type Filtro = 'todas' | 'delegada' | 'em_execucao' | 'concluida' | 'encerrada';

export default function OcorrenciasFuncionarioPage() {
  const { userData } = useAuthContext();

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filtro, setFiltro]           = useState<Filtro>('todas');

  const fetchOcorrencias = async () => {
    if (!userData?.uid) return;
    const q    = query(collection(db, 'ocorrencias'), where('assignedTo', '==', userData.uid));
    const snap = await getDocs(q);
    setOcorrencias(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ocorrencia)));
    setLoading(false);
  };

  useEffect(() => {
    fetchOcorrencias();
  }, [userData?.uid]);

  const handleIniciar = async (id: string) => {
    await iniciarExecucao(id);
    setOcorrencias(prev =>
      prev.map(o => o.id === id ? { ...o, status: 'em_execucao' } : o)
    );
  };

  const handleConcluir = async (id: string) => {
    await concluirOcorrencia(id);
    setOcorrencias(prev =>
      prev.map(o => o.id === id ? { ...o, status: 'concluida' } : o)
    );
  };

  const filtered = ocorrencias
    .filter(o => filtro === 'todas' || o.status === filtro)
    .filter(o => o.titulo?.toLowerCase().includes(search.toLowerCase()));

  // KPIs
  const kpis = [
    { label: 'Delegadas',    value: ocorrencias.filter(o => o.status === 'delegada').length,    cor: 'text-blue-500'    },
    { label: 'Em Execução',  value: ocorrencias.filter(o => o.status === 'em_execucao').length, cor: 'text-orange-500'  },
    { label: 'Concluídas',   value: ocorrencias.filter(o => o.status === 'concluida').length,   cor: 'text-emerald-500' },
  ];

  const filtros: { key: Filtro; label: string }[] = [
    { key: 'todas',       label: 'Todas'       },
    { key: 'delegada',    label: 'Delegadas'   },
    { key: 'em_execucao', label: 'Em Execução' },
    { key: 'concluida',   label: 'Concluídas'  },
    { key: 'encerrada',   label: 'Encerradas'  },
  ];

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-orange-50 rounded-xl">
          <Bell size={20} className="text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Minhas Ocorrências</h1>
          <p className="text-sm text-zinc-500">Ocorrências atribuídas a ti</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map(({ label, value, cor }) => (
          <div key={label} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm text-center">
            <p className={`text-2xl font-bold ${cor}`}>{value}</p>
            <p className="text-xs text-zinc-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {filtros.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors ${
              filtro === key
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            {label}
            {key !== 'todas' && (
              <span className="ml-1.5 opacity-60">
                {ocorrencias.filter(o => o.status === key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pesquisa */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Pesquisar por título..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        />
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
        <div className="space-y-4">
          {filtered.map(o => (
            <OcorrenciaCard
              key={o.id}
              o={o}
              onIniciar={handleIniciar}
              onConcluir={handleConcluir}
            />
          ))}
        </div>
      )}
    </main>
  );
}