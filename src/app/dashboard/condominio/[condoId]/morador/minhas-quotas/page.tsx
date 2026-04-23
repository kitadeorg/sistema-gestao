'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Receipt, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Quota {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  status: 'pago' | 'pendente' | 'atrasado';
  mes?: string;
}

function formatKz(v: number) {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(v).replace('AOA', 'Kz');
}

function StatusBadge({ status }: { status: Quota['status'] }) {
  const map = { pago: 'bg-emerald-50 text-emerald-600', pendente: 'bg-amber-50 text-amber-600', atrasado: 'bg-red-50 text-red-600' };
  const label = { pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>{label[status]}</span>;
}

export default function MinhasQuotasPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData, loading: authLoading } = useAuth();

  const [quotas, setQuotas]   = useState<Quota[]>([]);
  const [loading, setLoading] = useState(true);

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
        setQuotas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quota)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [condoId, userData?.uid, authLoading]);

  const totalPago     = quotas.filter(q => q.status === 'pago').reduce((s, q) => s + q.valor, 0);
  const totalPendente = quotas.filter(q => q.status !== 'pago').reduce((s, q) => s + q.valor, 0);

  if (authLoading || loading) return <div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <main className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      <Link href={`/dashboard/condominio/${condoId}/morador`} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition">
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      <div className="flex items-center gap-3">
        <Receipt size={22} className="text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Minhas Quotas</h1>
          <p className="text-sm text-zinc-500">Histórico de quotas condominiais</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Total Pago</p>
          <p className="text-2xl font-bold text-emerald-600">{formatKz(totalPago)}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Total Pendente</p>
          <p className="text-2xl font-bold text-amber-500">{formatKz(totalPendente)}</p>
        </div>
      </div>

      {quotas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <Receipt size={36} className="mb-2 opacity-30" />
          <p className="text-sm">Nenhuma quota encontrada</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-100">
            {quotas.map(q => (
              <div key={q.id} className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{q.descricao}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Vencimento: {q.dataVencimento}{q.mes && ` · ${q.mes}`}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={q.status} />
                  <p className={`text-sm font-bold ${q.status === 'pago' ? 'text-emerald-600' : 'text-amber-500'}`}>{formatKz(q.valor)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}