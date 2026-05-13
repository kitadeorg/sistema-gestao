'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { AlertTriangle, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import Pagination, { usePagination } from '@/components/ui/Pagination';

interface Inadimplente {
  id: string;
  moradorNome: string;
  unidadeNumero: string;
  valor: number;
  mes: number;
  ano: number;
  status: 'atrasado' | 'pendente';
  dataVencimento?: any;
}

function formatKz(valor: number) {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' })
    .format(valor)
    .replace('AOA', 'Kz');
}

function SeveridadeBadge({ status }: { status: string }) {
  if (status === 'atrasado')
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
        Atrasado
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
      Pendente
    </span>
  );
}

export default function InadimplenciaPage() {
  const { condoId } = useParams() as { condoId: string };
  const [inadimplentes, setInadimplentes] = useState<Inadimplente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!condoId) return;
    const fetch = async () => {
      try {
        // Busca quotas atrasadas ou pendentes na coleção correta
        const q = query(
          collection(db, 'quotas'),
          where('condominioId', '==', condoId),
          where('status', 'in', ['atrasado', 'pendente']),
        );
        const snap = await getDocs(q);
        setInadimplentes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Inadimplente)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [condoId]);

  const filtered = inadimplentes.filter(
    i =>
      (i.moradorNome ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (i.unidadeNumero ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const { paged, page, setPage, totalPages, totalItems, pageSize } = usePagination(filtered, 10);

  const totalDevido    = inadimplentes.reduce((s, i) => s + (i.valor ?? 0), 0);
  const totalAtrasados = inadimplentes.filter(i => i.status === 'atrasado').length;

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">

      <Link
        href={`/dashboard/condominio/${condoId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition"
      >
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      <div className="flex items-center gap-3">
        <AlertTriangle size={22} className="text-orange-500" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Inadimplência</h1>
          <p className="text-sm text-zinc-500">Quotas pendentes e atrasadas</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Total em Dívida</p>
          <p className="text-2xl font-bold text-red-600">{formatKz(totalDevido)}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Casos Totais</p>
          <p className="text-2xl font-bold text-zinc-900">{inadimplentes.length}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Atrasados</p>
          <p className="text-2xl font-bold text-red-500">{totalAtrasados}</p>
        </div>
      </div>

      {/* Pesquisa */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Pesquisar por morador ou unidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="p-8 text-zinc-500 text-sm text-center">A carregar...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <AlertTriangle size={36} className="mb-2 opacity-30" />
          <p className="text-sm font-medium">Nenhuma inadimplência encontrada</p>
          <p className="text-xs mt-1">Todos os moradores estão em dia!</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-100">
            {paged.map(i => (
              <div
                key={i.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-semibold text-sm shrink-0">
                    {(i.moradorNome ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{i.moradorNome ?? '—'}</p>
                    <p className="text-xs text-zinc-500">
                      Unidade {i.unidadeNumero ?? '—'} · {i.mes}/{i.ano}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <SeveridadeBadge status={i.status} />
                  <p className="text-sm font-bold text-red-600">{formatKz(i.valor ?? 0)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-zinc-100">
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
