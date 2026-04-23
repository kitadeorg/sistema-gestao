'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/permissionMatrix';
import { usePagamentos } from './usePagamentos';
import PagamentosGrid from './PagamentosGrid';
import PagamentoSidePanel from './PagamentoSidePanel';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function PagamentosPage() {

  const { condoId } = useParams() as { condoId: string };
  const { userData } = useAuthContext();
  const role = userData?.role;

  const podeCriar  = role ? can(role, 'create', 'pagamento') : false;
  const podeEditar = role ? can(role, 'update', 'pagamento') : false;
  const podeExcluir = role ? can(role, 'delete', 'pagamento') : false;

  const { pagamentos, loading, refresh } = usePagamentos(condoId);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingPagamento, setEditingPagamento] = useState<any | null>(null);

  const handleEdit = (p: any) => {
    if (!podeEditar) return;
    setEditingPagamento(p);
    setPanelOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!podeExcluir) return;
    toast('Eliminar pagamento?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const { deleteDoc, doc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase/firebase');
          await deleteDoc(doc(db, 'pagamentos', id));
          toast.success('Pagamento eliminado.');
          refresh();
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
          Pagamentos
        </h1>

        {podeCriar && (
          <button
            onClick={() => {
              setEditingPagamento(null);
              setPanelOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-zinc-800 transition"
          >
            <Plus size={16} />
            Novo Pagamento
          </button>
        )}
      </div>

      <PagamentosGrid
        pagamentos={pagamentos}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <PagamentoSidePanel
        isOpen={panelOpen}
        condominioId={condoId}
        pagamento={editingPagamento}
        onClose={() => setPanelOpen(false)}
        onSuccess={refresh}
      />

    </main>
  );
}