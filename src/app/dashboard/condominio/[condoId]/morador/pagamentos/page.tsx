'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, ArrowLeft, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Pagamento {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: 'credito' | 'debito';
  status: 'pago' | 'pendente' | 'atrasado';
  referencia?: string;
}

function formatKz(v: number) {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(v).replace('AOA', 'Kz');
}

export default function PagamentosPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData, loading: authLoading } = useAuth();

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (authLoading || !condoId || !userData?.uid) return;
    const fetch = async () => {
      try {
        const q = query(
          collection(db, 'pagamentos'),
          where('condominioId', '==', condoId),
          where('moradorId', '==', userData.uid),
        );
        const snap = await getDocs(q);
        setPagamentos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pagamento)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [condoId, userData?.uid, authLoading]);

  const totalPago = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + p.valor, 0);
  const totalPendente = pagamentos.filter(p => p.status !== 'pago').reduce((s, p) => s + p.valor, 0);

  if (authLoading || loading) return <div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">
      <Link href={`/dashboard/condominio/${condoId}/morador`} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition">
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      <div className="flex items-center gap-3">
        <DollarSign size={22} className="text-orange-500" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Meus Pagamentos</h1>
          <p className="text-sm text-zinc-500">Histórico de pagamentos</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-zinc-500">Total Pago</p>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatKz(totalPago)}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-zinc-500">Em Aberto</p>
            <TrendingDown size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-500">{formatKz(totalPendente)}</p>
        </div>
      </div>

      {pagamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <DollarSign size={36} className="mb-2 opacity-30" />
          <p className="text-sm">Nenhum pagamento encontrado</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-100">
            {pagamentos.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${p.status === 'pago' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{p.descricao}</p>
                    <p className="text-xs text-zinc-400">{p.data}{p.referencia && ` · Ref: ${p.referencia}`}</p>
                  </div>
                </div>
                <p className={`text-sm font-bold ${p.status === 'pago' ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {formatKz(p.valor)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}