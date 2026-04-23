'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { AlertTriangle, ArrowLeft, Search, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

interface Inadimplente {
  id: string;
  nome: string;
  unidade: string;
  email?: string;
  telefone?: string;
  valorDevido: number;
  mesesAtraso: number;
  ultimoPagamento?: string;
}

function formatKz(valor: number) {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' })
    .format(valor).replace('AOA', 'Kz');
}

function SeveridadeBadge({ meses }: { meses: number }) {
  if (meses >= 3) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">Crítico</span>;
  if (meses >= 2) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600">Alto</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">Médio</span>;
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
        const q = query(
          collection(db, 'inadimplencia'),
          where('condominioId', '==', condoId),
        );
        const snap = await getDocs(q);
        setInadimplentes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Inadimplente)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [condoId]);

  const filtered = inadimplentes.filter(i =>
    i.nome.toLowerCase().includes(search.toLowerCase()) ||
    i.unidade.toLowerCase().includes(search.toLowerCase())
  );

  const totalDevido = inadimplentes.reduce((s, i) => s + i.valorDevido, 0);
  const taxaInadimplencia = inadimplentes.length;

  return (
    <main className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">

      <Link href={`/dashboard/condominio/${condoId}`} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition">
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      <div className="flex items-center gap-3">
        <AlertTriangle size={22} className="text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Inadimplência</h1>
          <p className="text-sm text-zinc-500">Moradores com pagamentos em atraso</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Total em Atraso</p>
          <p className="text-2xl font-bold text-red-600">{formatKz(totalDevido)}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Inadimplentes</p>
          <p className="text-2xl font-bold text-zinc-900">{taxaInadimplencia}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Casos Críticos</p>
          <p className="text-2xl font-bold text-red-500">
            {inadimplentes.filter(i => i.mesesAtraso >= 3).length}
          </p>
        </div>
      </div>

      {/* Pesquisa */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Pesquisar por nome ou unidade..."
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
          <p className="text-sm font-medium">Nenhum inadimplente encontrado</p>
          <p className="text-xs mt-1">Todos os moradores estão em dia!</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-100">
            {filtered.map(i => (
              <div key={i.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-semibold text-sm shrink-0">
                    {i.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{i.nome}</p>
                    <p className="text-xs text-zinc-500">Unidade {i.unidade} · {i.mesesAtraso} {i.mesesAtraso === 1 ? 'mês' : 'meses'} em atraso</p>
                    <div className="flex items-center gap-3 mt-1">
                      {i.email && <span className="flex items-center gap-1 text-xs text-zinc-400"><Mail size={11} />{i.email}</span>}
                      {i.telefone && <span className="flex items-center gap-1 text-xs text-zinc-400"><Phone size={11} />{i.telefone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <SeveridadeBadge meses={i.mesesAtraso} />
                  <p className="text-sm font-bold text-red-600">{formatKz(i.valorDevido)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}