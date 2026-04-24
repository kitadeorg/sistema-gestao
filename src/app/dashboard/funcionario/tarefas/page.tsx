'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import {
  iniciarExecucao,
  concluirOcorrencia,
} from '@/lib/firebase/ocorrencias';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface Ocorrencia {
  id: string;
  titulo?: string;
  descricao: string;
  status: 'aberta' | 'em_analise' | 'delegada' | 'em_execucao' | 'concluida' | 'encerrada';
  prioridade: 'baixa' | 'media' | 'alta';
}

function StatusIcon({ status }: { status: Ocorrencia['status'] }) {
  if (status === 'concluida')
    return <CheckCircle2 size={18} className="text-emerald-500" />;

  if (status === 'em_execucao')
    return <Clock size={18} className="text-blue-500" />;

  return <AlertCircle size={18} className="text-amber-500" />;
}

function PrioridadeBadge({ prioridade }: { prioridade: Ocorrencia['prioridade'] }) {
  const map = {
    alta:  'bg-red-50 text-red-600',
    media: 'bg-amber-50 text-amber-600',
    baixa: 'bg-zinc-100 text-zinc-500',
  };

  const label = {
    alta: 'Alta',
    media: 'Média',
    baixa: 'Baixa',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[prioridade]}`}>
      {label[prioridade]}
    </span>
  );
}

export default function TarefasPage() {
  const { userData } = useAuthContext();
  const [tarefas, setTarefas] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTarefas = async () => {
    if (!userData?.uid) return;
    try {
      const snap = await getDocs(query(
        collection(db, 'ocorrencias'),
        where('assignedTo', '==', userData.uid),
        where('status', 'in', ['delegada', 'em_execucao', 'concluida']),
      ));
      setTarefas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ocorrencia)));
    } catch (e) {
      console.error('Erro ao buscar ocorrências:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTarefas(); }, [userData?.uid]);

  const handleIniciar = async (id: string) => {
    await iniciarExecucao(id);
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, status: 'em_execucao' } : t));
  };

  const handleConcluir = async (id: string) => {
    await concluirOcorrencia(id);
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, status: 'concluida' } : t));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <ClipboardList className="w-8 h-8 animate-pulse text-orange-300" />
      </div>
    );
  }

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">

      <div className="flex items-center gap-3">
        <ClipboardList size={22} className="text-orange-500" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
            Minhas Ocorrências
          </h1>
          <p className="text-sm text-zinc-500">
            Ocorrências delegadas para ti
          </p>
        </div>
      </div>

      {tarefas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <ClipboardList size={36} className="mb-2 opacity-30" />
          <p className="text-sm font-medium">
            Nenhuma ocorrência atribuída
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tarefas.map(t => (
            <div
              key={t.id}
              className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <StatusIcon status={t.status} />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {t.titulo ?? t.descricao}
                  </p>
                  {t.titulo && t.descricao && (
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{t.descricao}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <PrioridadeBadge prioridade={t.prioridade} />
                    <span className="text-xs text-zinc-400">
                      {t.status === 'delegada' ? 'Aguarda início' : t.status === 'em_execucao' ? 'Em execução' : 'Concluída'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                {t.status === 'delegada' && (
                  <button
                    onClick={() => handleIniciar(t.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
                  >
                    Iniciar
                  </button>
                )}
                {t.status === 'em_execucao' && (
                  <button
                    onClick={() => handleConcluir(t.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors"
                  >
                    Concluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}