'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { getMoradores, deleteMorador } from '@/lib/firebase/moradores';
import MoradorSidePanel from './MoradorSidePanel';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { can } from '@/lib/permissions/permissionMatrix';
import { toast } from 'sonner';

export default function MoradoresPage() {
  const { userData, isAdmin, currentCondominioId } = useAuthContext();
  const role = userData?.role;

  // ✅ Usa currentCondominioId do contexto
  const condoId = currentCondominioId ?? '';

  const [moradores, setMoradores] = useState<any[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const podeCriar   = role ? can(role, 'create', 'morador') : false;
  const podeExcluir = role ? can(role, 'delete', 'morador') : false;

  const fetchMoradores = async () => {
    if (!condoId) { setLoading(false); return; }
    setLoading(true);
    const data = await getMoradores(condoId, isAdmin);
    setMoradores(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMoradores();
  }, [condoId]);

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

  if (!condoId) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-12 h-12 text-orange-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-zinc-800">Nenhum condomínio selecionado</h3>
          <p className="text-sm text-zinc-500 mt-1">Selecione um condomínio no menu superior</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Moradores</h1>
        {podeCriar && (
          <button
            onClick={() => setPanelOpen(true)}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-zinc-800 transition"
          >
            <Plus size={16} />
            Novo Morador
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {moradores.length === 0 && (
          <div className="col-span-full text-center text-zinc-500 py-10">
            Nenhum morador registado.
          </div>
        )}
        {moradores.map(m => (
          <div
            key={m.id}
            className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex justify-between items-start"
          >
            <div>
              <h3 className="font-semibold text-black">{m.nome}</h3>
              <p className="text-sm text-zinc-500">Tipo: {m.tipo}</p>
              <p className="text-sm text-zinc-500">Status: {m.status}</p>
            </div>
            {podeExcluir && (
              <button
                onClick={() => handleDelete(m.id, m.unidadeId)}
                className="text-red-500 hover:text-red-600"
              >
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