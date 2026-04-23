'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDashboardContext } from '@/contexts/DashboardContext';
import {
  ClipboardList,
  Bell,
  Wrench,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface Counts {
  delegadas: number;
  emExecucao: number;
  concluidas: number;
  visitantesDentro: number;
}

function KPICard({
  title,
  value,
  icon,
  sub,
  cor = 'text-zinc-900',
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  sub?: string;
  cor?: string;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-zinc-500">{title}</p>
        <div className="p-2 bg-zinc-50 rounded-xl">{icon}</div>
      </div>
      <h3 className={`text-2xl font-bold ${cor}`}>{value}</h3>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardFuncionarioContent() {
  const { userData, loading: authLoading } = useAuthContext();

  // ✅ FONTE ÚNICA DE VERDADE — sincronizado com Topbar/Sidebar
  const { selectedCondo } = useDashboardContext();

  // Funcionário tem apenas um condomínio; usa selectedCondo que é inicializado
  // com o condominioId do utilizador em useDashboardData
  const condoId = selectedCondo !== 'all' ? selectedCondo : (userData?.condominioId ?? null);

  const [counts, setCounts] = useState<Counts>({
    delegadas: 0,
    emExecucao: 0,
    concluidas: 0,
    visitantesDentro: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!userData?.uid) {
      setLoading(false);
      return;
    }

    const fetchCounts = async () => {
      try {
        const ocorrSnap = await getDocs(
          query(
            collection(db, 'ocorrencias'),
            where('assignedTo', '==', userData.uid)
          )
        );

        const visitSnap = await getDocs(
          query(
            collection(db, 'visitantes'),
            where('condominioId', '==', condoId ?? userData.condominioId)
          )
        );

        const ocorrencias = ocorrSnap.docs.map(d => d.data());

        setCounts({
          delegadas: ocorrencias.filter(o => o.status === 'delegada').length,
          emExecucao: ocorrencias.filter(o => o.status === 'em_execucao').length,
          concluidas: ocorrencias.filter(o => o.status === 'concluida').length,
          visitantesDentro: visitSnap.docs.filter(d => d.data().status === 'dentro').length,
        });

      } catch (e) {
        console.error('Erro ao carregar dashboard funcionário:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, [userData?.uid, authLoading, condoId]);

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
          Olá, {userData?.nome?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Aqui está o resumo das tuas ocorrências.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Delegadas"
          value={counts.delegadas}
          icon={<AlertCircle size={16} className="text-amber-500" />}
          sub="Aguardando início"
          cor={counts.delegadas > 0 ? 'text-amber-500' : 'text-zinc-900'}
        />
        <KPICard
          title="Em Execução"
          value={counts.emExecucao}
          icon={<Clock size={16} className="text-blue-500" />}
          sub="Em andamento"
          cor={counts.emExecucao > 0 ? 'text-blue-500' : 'text-zinc-900'}
        />
        <KPICard
          title="Concluídas"
          value={counts.concluidas}
          icon={<CheckCircle2 size={16} className="text-emerald-500" />}
          sub="Aguardando validação"
          cor={counts.concluidas > 0 ? 'text-emerald-500' : 'text-zinc-900'}
        />
        <KPICard
          title="Visitantes Dentro"
          value={counts.visitantesDentro}
          icon={<Users size={16} className="text-purple-500" />}
          sub="Neste momento"
        />
      </div>

      {/* Acesso Rápido */}
      <div>
        <h2 className="text-base font-semibold text-zinc-900 mb-3">
          Acesso Rápido
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/dashboard/funcionario/tarefas"
            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:border-orange-300 hover:shadow-md transition-all"
          >
            <ClipboardList size={20} className="text-orange-500" />
            <span className="text-xs font-medium text-zinc-700">
              Minhas Ocorrências
            </span>
          </Link>

          <Link
            href="/dashboard/funcionario/visitantes"
            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:border-orange-300 hover:shadow-md transition-all"
          >
            <Users size={20} className="text-orange-500" />
            <span className="text-xs font-medium text-zinc-700">
              Visitantes
            </span>
          </Link>
        </div>
      </div>

      {/* Dica */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-orange-700 font-semibold mb-1">
          <TrendingUp size={16} />
          Dica
        </div>
        <p className="text-sm text-orange-600">
          Atualiza o estado das ocorrências em tempo real para que o síndico
          acompanhe o progresso.
        </p>
      </div>

    </main>
  );
}