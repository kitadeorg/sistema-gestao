'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/permissionMatrix';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { DollarSign, TrendingUp, TrendingDown, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Transacao {
  id: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: string;
  categoria?: string;
  status: 'pago' | 'pendente' | 'cancelado';
}

function formatKz(valor: number) {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' })
    .format(valor)
    .replace('AOA', 'Kz');
}

function StatusBadge({ status }: { status: Transacao['status'] }) {
  const map = {
    pago: 'bg-emerald-50 text-emerald-600',
    pendente: 'bg-amber-50 text-amber-600',
    cancelado: 'bg-red-50 text-red-500',
  };
  const label = { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}

export default function FluxoCaixaPage() {

  const { condoId } = useParams() as { condoId: string };
  const { userData } = useAuthContext();
  const role = userData?.role;

  // ✅ PERMISSÕES
  const podeVerFinanceiro = role ? can(role, 'view', 'financeiro') : false;
  const podeCriarTransacao = role ? can(role, 'create', 'financeiro') : false;

  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!condoId || !podeVerFinanceiro) return;

    const fetch = async () => {
      try {
        const q = query(
          collection(db, 'financeiro'),
          where('condominioId', '==', condoId),
          orderBy('data', 'desc'),
        );
        const snap = await getDocs(q);
        setTransacoes(
          snap.docs.map(d => ({ id: d.id, ...d.data() } as Transacao))
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [condoId, podeVerFinanceiro]);

  if (!podeVerFinanceiro) {
    return (
      <main className="p-6 lg:p-8 text-center text-zinc-500">
        Sem permissão para visualizar o fluxo de caixa.
      </main>
    );
  }

  const totalReceitas = transacoes
    .filter(t => t.tipo === 'receita' && t.status === 'pago')
    .reduce((s, t) => s + t.valor, 0);

  const totalDespesas = transacoes
    .filter(t => t.tipo === 'despesa' && t.status === 'pago')
    .reduce((s, t) => s + t.valor, 0);

  const saldo = totalReceitas - totalDespesas;

  return (
    <main className="p-6 lg:p-8 space-y-8">

      <Link
        href={`/dashboard/condominio/${condoId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Fluxo de Caixa</h1>

        {podeCriarTransacao && (
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
            <Plus size={16} /> Nova Transação
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Total Receitas</p>
          <p className="text-2xl font-bold text-emerald-600">{formatKz(totalReceitas)}</p>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Total Despesas</p>
          <p className="text-2xl font-bold text-red-500">{formatKz(totalDespesas)}</p>
        </div>

        <div className={`border rounded-2xl p-5 shadow-sm ${
          saldo >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        }`}>
          <p className="text-sm text-zinc-500">Saldo</p>
          <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatKz(saldo)}
          </p>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white border rounded-2xl shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">A carregar...</div>
        ) : transacoes.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">
            Nenhuma transação registada.
          </div>
        ) : (
          <div className="divide-y">
            {transacoes.map(t => (
              <div key={t.id} className="flex justify-between px-5 py-3">
                <div>
                  <p className="font-medium">{t.descricao}</p>
                  <p className="text-xs text-zinc-400">{t.categoria ?? '—'} · {t.data}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={t.status} />
                  <p className={`font-bold ${t.tipo === 'receita' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {t.tipo === 'receita' ? '+' : '-'}{formatKz(t.valor)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}