'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { getMoradores, deleteMorador } from '@/lib/firebase/moradores';
import MoradorSidePanel from './MoradorSidePanel';
import { Plus, Trash2, Search } from 'lucide-react';
import { can } from '@/lib/permissions/permissionMatrix';
import { toast } from 'sonner';

export default function MoradoresPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData, isAdmin } = useAuthContext();
  const role = userData?.role;

  const [moradores, setMoradores] = useState<any[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const podeCriar   = role ? can(role, 'create', 'morador') : false;
  const podeExcluir = role ? can(role, 'delete', 'morador') : false;

  const fetchMoradores = async () => {
    if (!condoId) { setLoading(false); return; }
    setLoading(true);
    const data = await getMoradores(condoId, isAdmin);
    setMoradores(data);
    setLoading(false);
  };

  useEffect(() => { fetchMoradores(); }, [condoId]);

  const handleDelete = async (id: string, unidadeId: string) => {
    if (!podeExcluir) return;
    toast('Eliminar morador?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          await deleteMorador(id, unidadeId, condoId);
          toast.success('Morador eliminado.');
          fetchMoradores();
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  const filtered = moradores.filter(m =>
    search === '' ||
    m.nome?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.unidadeNumero?.toLowerCase().includes(search.toLowerCase())
  );

  if (!condoId || loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-black">Moradores</h1>
        {podeCriar && (
          <button
            onClick={() => setPanelOpen(true)}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-zinc-800 transition"
          >
            <Plus size={16} /> Novo Morador
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar por nome, email ou unidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
        />
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-zinc-500 py-10">
            {search ? 'Nenhum resultado encontrado.' : 'Nenhum morador registado.'}
          </div>
        )}
        {filtered.map(m => (
          <div key={m.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-black">{m.nome}</h3>
              {m.unidadeNumero && <p className="text-sm text-zinc-500">Unidade: {m.unidadeNumero}</p>}
              <p className="text-sm text-zinc-500">Tipo: {m.tipo}</p>
              <p className="text-sm text-zinc-500">Status: {m.status}</p>
            </div>
            {podeExcluir && (
              <button onClick={() => handleDelete(m.id, m.unidadeId)} className="text-red-500 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <MoradorSidePanel
        isOpen={panelOpen}
        condominioId={condoId}
        onClose={() => setPanelOpen(false)}
        onSuccess={fetchMoradores}
      />
    </main>
  );
}