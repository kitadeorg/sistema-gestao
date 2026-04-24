'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { getQuotasMorador, type Quota } from '@/lib/firebase/quotas';
import { Bell, CreditCard, Users, Wallet, Loader2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
interface MoradorStats {
  ocorrenciasAtivas: number;
  visitantesHoje: number;
}

function formatKz(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
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
  const { condoId } = useParams() as { condoId: string };
  const { userData, loading: authLoading } = useAuthContext();

  const [stats, setStats] = useState<MoradorStats>({
    ocorrenciasAtivas: 0,
    visitantesHoje: 0,
  });
  const [quotaAtual, setQuotaAtual] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);

  // Usa o condoId da URL — fonte mais fiável
  const condominioId  = condoId;
  const unidadeId     = userData?.unidadeId;
  const unidadeNumero = userData?.unidadeNumero;
  const bloco         = userData?.bloco;

  /* ✅ Buscar estatísticas — só quando temos condominioId */
  useEffect(() => {
    // Se o auth ainda está a carregar, aguardar
    if (authLoading) return;
    // Se não temos condominioId, não há nada a buscar — terminar loading
    if (!condominioId) { setLoading(false); return; }
    // Se não temos uid ainda (pode acontecer brevemente), aguardar
    if (!userData?.uid) { setLoading(false); return; }

    const fetchStats = async () => {
      try {
        const hoje = new Date();
        const [ocorrSnap, visitSnap, quotas] = await Promise.all([
          getDocs(query(
            collection(db, 'ocorrencias'),
            where('condominioId', '==', condominioId),
            where('criadoPor', '==', userData.uid),
            where('status', '==', 'aberta')
          )),
          ...(unidadeNumero ? [getDocs(query(
            collection(db, 'visitantes'),
            where('condominioId', '==', condominioId),
            where('unidadeDestino', '==', unidadeNumero),
            where('status', '==', 'dentro')
          ))] : [Promise.resolve({ size: 0 })]),
          getQuotasMorador(condominioId, userData.uid),
        ]);

        setStats({
          ocorrenciasAtivas: ocorrSnap.size,
          visitantesHoje: visitSnap.size,
        });

        // Quota do mês actual
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();
        const qa = quotas.find(q => q.mes === mesAtual && q.ano === anoAtual) ?? null;
        setQuotaAtual(qa);
      } catch (e) {
        console.error('Erro ao buscar stats morador:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [condominioId, userData?.uid, unidadeNumero, authLoading]);

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
          Bem-vindo, {userData?.nome?.split(' ')[0]}
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
          value={
            quotaAtual
              ? quotaAtual.status === 'pago' ? 'Em dia'
              : quotaAtual.status === 'atrasado' ? 'Atrasado'
              : 'Pendente'
              : 'Sem quota'
          }
          icon={
            quotaAtual?.status === 'pago'
              ? <CheckCircle2 size={18} className="text-emerald-500" />
              : quotaAtual?.status === 'atrasado'
              ? <AlertTriangle size={18} className="text-red-500" />
              : <Clock size={18} className="text-amber-500" />
          }
          sub={
            quotaAtual
              ? `${formatKz(quotaAtual.valor)} · Vence dia ${quotaAtual.dataVencimento.toDate().getDate()}`
              : 'Nenhuma quota gerada'
          }
          cor={
            quotaAtual?.status === 'pago'     ? 'text-emerald-600' :
            quotaAtual?.status === 'atrasado' ? 'text-red-600'     :
            quotaAtual                        ? 'text-amber-600'   : 'text-zinc-500'
          }
          href={`/dashboard/condominio/${condominioId}/morador/pagamentos`}
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
            Quota do Mês
          </h3>
          {quotaAtual ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Valor</span>
                <span className="text-lg font-bold text-zinc-900">{formatKz(quotaAtual.valor)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Vencimento</span>
                <span className="text-sm font-medium text-zinc-700">
                  Dia {quotaAtual.dataVencimento.toDate().getDate()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Estado</span>
                <span className={cn(
                  'text-xs font-bold px-2 py-0.5 rounded-full',
                  quotaAtual.status === 'pago'     ? 'bg-emerald-100 text-emerald-700' :
                  quotaAtual.status === 'atrasado' ? 'bg-red-100 text-red-700'         : 'bg-amber-100 text-amber-700',
                )}>
                  {quotaAtual.status === 'pago' ? 'Pago' : quotaAtual.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                </span>
              </div>
              <Link
                href={`/dashboard/condominio/${condominioId}/morador/pagamentos`}
                className="block text-center text-xs text-orange-500 hover:text-orange-600 font-semibold mt-2"
              >
                Ver histórico completo
              </Link>
              {quotaAtual && (quotaAtual.status === 'pendente' || quotaAtual.status === 'atrasado') && (
                <Link
                  href={`/dashboard/condominio/${condominioId}/morador/pagar/${quotaAtual.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors mt-1"
                >
                  <CreditCard size={13} />
                  Pagar Agora
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Nenhuma quota gerada para este mês.</p>
          )}
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