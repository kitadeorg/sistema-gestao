'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { Bell, CreditCard, Users, Wallet, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface MoradorStats {
  ocorrenciasAtivas: number;
  visitantesHoje: number;
}

function KPICard({
  title, value, icon, sub, cor = 'text-zinc-900', href
}: {
  title: string; value: number | string; icon: React.ReactNode;
  sub?: string; cor?: string; href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:border-orange-200 transition-all block group"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-zinc-500">{title}</p>
        <div className="p-2 bg-zinc-50 rounded-xl group-hover:bg-orange-50 transition-colors">
          {icon}
        </div>
      </div>
      <h3 className={`text-2xl font-bold ${cor}`}>{value}</h3>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </Link>
  );
}

export default function MoradorPainelPage() {
  const { userData, loading: authLoading } = useAuthContext();

  // ✅ FONTE ÚNICA DE VERDADE — sincronizado com Topbar/Sidebar
  const { selectedCondo } = useDashboardContext();

  const [stats, setStats] = useState<MoradorStats>({
    ocorrenciasAtivas: 0,
    visitantesHoje: 0,
  });
  const [loading, setLoading] = useState(true);

  // Morador tem condominioId fixo no perfil; selectedCondo é inicializado com esse valor
  const condominioId   = (selectedCondo !== 'all' ? selectedCondo : null) ?? userData?.condominioId;
  const unidadeId      = userData?.unidadeId;
  const unidadeNumero  = userData?.unidadeNumero;
  const bloco          = userData?.bloco;

  /* ✅ Buscar estatísticas — só quando temos condominioId */
  useEffect(() => {
    if (!condominioId || !userData?.uid) return;

    const fetchStats = async () => {
      const [ocorrSnap, visitSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'ocorrencias'),
          where('condominioId', '==', condominioId),
          where('criadoPor', '==', userData.uid),
          where('status', '==', 'aberta')
        )),
        getDocs(query(
          collection(db, 'visitantes'),
          where('condominioId', '==', condominioId),
          where('unidadeDestino', '==', unidadeNumero),
          where('status', '==', 'dentro')
        ))
      ]);

      setStats({
        ocorrenciasAtivas: ocorrSnap.size,
        visitantesHoje: visitSnap.size,
      });

      setLoading(false);
    };

    fetchStats();
  }, [condominioId, userData?.uid, unidadeNumero]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
          Bem-vindo, {userData?.nome?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Unidade:{' '}
          <span className="font-semibold text-orange-600">
            {unidadeNumero
              ? `${bloco} - ${unidadeNumero}`
              : 'Não atribuída'}
          </span>
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <KPICard
          title="Minhas Quotas"
          value="Em dia"
          icon={<CreditCard size={18} className="text-emerald-500" />}
          sub="Próximo vencimento: Dia 05"
          cor="text-emerald-600"
          href={`/dashboard/condominio/${condominioId}/morador/minhas-quotas`}
        />
        <KPICard
          title="Ocorrências"
          value={stats.ocorrenciasAtivas}
          icon={<Bell size={18} className="text-amber-500" />}
          sub="Relatos em aberto"
          cor={stats.ocorrenciasAtivas > 0 ? 'text-amber-600' : 'text-zinc-900'}
          href={`/dashboard/condominio/${condominioId}/morador/ocorrencias`}
        />
        <KPICard
          title="Visitantes"
          value={stats.visitantesHoje}
          icon={<Users size={18} className="text-blue-500" />}
          sub="Presentes agora"
          cor={stats.visitantesHoje > 0 ? 'text-blue-600' : 'text-zinc-900'}
          href={`/dashboard/condominio/${condominioId}/morador/visitantes`}
        />
      </div>

      {/* Financeiro + CTA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <Wallet size={18} className="text-orange-500" />
            Financeiro Rápido
          </h3>
        </div>

        <div className="bg-orange-500 rounded-3xl p-6 text-white shadow-lg">
          <h3 className="font-bold text-lg mb-2">Precisa de ajuda?</h3>
          <p className="text-orange-100 text-sm mb-4">
            Abra uma ocorrência diretamente para a administração.
          </p>
          <Link
            href={`/dashboard/condominio/${condominioId}/morador/ocorrencias`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-xl text-sm font-bold"
          >
            Reportar Problema
          </Link>
        </div>
      </div>

    </main>
  );
}