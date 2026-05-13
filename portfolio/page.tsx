'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { getCondominiosByUser } from '@/lib/firebase/condominios';
import {
  Building2, Search, ArrowUpRight, MapPin, Loader2, LayoutGrid,
} from 'lucide-react';

interface Condominio {
  id: string;
  nome: string;
  endereco?: { cidade?: string; provincia?: string };
  totalUnidades?: number;
  status?: string;
}

export default function PortfolioPage() {
  const router = useRouter();
  const { userData } = useAuthContext();
  const [ativos, setAtivos] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!userData) return;
    const fetchPortfolio = async () => {
      try {
        setLoading(true);
        const data = await getCondominiosByUser(
          userData.role,
          userData.condominioId,
          userData.condominiosGeridos,
        );
        setAtivos(data);
      } catch (error) {
        console.error('Erro ao carregar portfólio:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [userData?.uid]);

  const ativosFiltrados = ativos.filter(a =>
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (a.endereco?.cidade ?? '').toLowerCase().includes(busca.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="relative">
          <Loader2 className="animate-spin text-orange-500" size={48} />
          <Building2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-300" size={16} />
        </div>
        <p className="font-bold text-zinc-400 uppercase tracking-[0.2em] text-[10px]">Sincronizando Ativos</p>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid size={14} className="text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-400">Management</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 uppercase">Portfólio de Ativos</h1>
          <p className="text-zinc-500 font-medium mt-1">
            {ativos.length === 0
              ? 'Nenhum condomínio registado no sistema.'
              : `Gerindo ${ativos.length} unidades operacionais.`}
          </p>
        </div>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="flex-1 flex items-center bg-white px-6 py-4 rounded-[1.5rem] border border-zinc-100 shadow-sm focus-within:border-orange-500/50 transition-all">
          <Search size={18} className="text-zinc-400" />
          <input
            type="text"
            placeholder="Procurar por nome ou localização..."
            className="bg-transparent border-none outline-none text-sm ml-4 w-full font-medium text-zinc-600 placeholder:text-zinc-300"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* GRID */}
      {ativosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {ativosFiltrados.map(condo => (
            <div
              key={condo.id}
              className="bg-white rounded-[2.5rem] border border-zinc-100 p-8 hover:shadow-2xl hover:border-orange-500/10 transition-all group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="bg-zinc-900 text-white p-4 rounded-2xl group-hover:bg-orange-500 transition-all shadow-lg group-hover:shadow-orange-500/40">
                  <Building2 size={24} />
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  condo.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {condo.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <h3 className="text-2xl font-black text-zinc-900 mb-1 tracking-tight">{condo.nome}</h3>
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold mb-8">
                <MapPin size={14} className="text-orange-500" />
                {condo.endereco?.cidade ?? '—'}, {condo.endereco?.provincia ?? '—'}
              </div>

              <div className="grid grid-cols-1 gap-4 mb-8">
                <div className="bg-zinc-50/50 border border-zinc-100 p-5 rounded-[1.5rem]">
                  <p className="text-[9px] font-black text-zinc-400 uppercase mb-2 tracking-widest">Unidades</p>
                  <span className="text-xl font-black text-zinc-900">{condo.totalUnidades ?? 0}</span>
                </div>
              </div>

              <button
                className="w-full py-5 bg-zinc-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-orange-500 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98]"
                onClick={() => router.push(`/dashboard/condominio/${condo.id}`)}
              >
                Aceder Painel <ArrowUpRight size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 text-center bg-white rounded-[3rem] border border-dashed border-zinc-200">
          <div className="inline-flex p-6 bg-zinc-50 rounded-full mb-6">
            <Search size={32} className="text-zinc-200" />
          </div>
          <h3 className="text-lg font-black text-zinc-900 uppercase">Nenhum Ativo Encontrado</h3>
          <p className="text-zinc-400 font-medium max-w-xs mx-auto mt-2 text-sm">
            {busca ? `Não encontrámos resultados para "${busca}".` : 'Nenhum condomínio disponível.'}
          </p>
        </div>
      )}
    </div>
  );
}
