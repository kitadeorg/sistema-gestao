'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { deleteUnidade, deleteMultipleUnidades } from '@/lib/firebase/unidades';
import UnidadeSidePanel from '../../../../../../portfolio/UnidadeSidePanel';
import UnidadesGrid from '@/components/dashboard/pages/unidades/UnidadesGrid';
import { useUnidades } from '@/hooks/useUnidades';
import { Plus, Trash2 } from 'lucide-react';
import { can } from '@/lib/permissions/permissionMatrix';
import { toast } from 'sonner';

export default function UnidadesPage() {

  const params = useParams();
  const condoId = params?.condoId as string;

  const { userData } = useAuthContext();
  const role = userData?.role;

  const {
    unidades,
    moradoresMap,
    financeiroMap,
    loading,
    refresh,
  } = useUnidades(condoId);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<any | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  /* ✅ PERMISSÕES SEGURAS */
  const podeCriar  = role ? can(role, 'create', 'unidade') : false;
  const podeEditar = role ? can(role, 'update', 'unidade') : false;
  const podeExcluir = role ? can(role, 'delete', 'unidade') : false;

  /* ─────────────────────────────────────────────────────────────
     SELEÇÃO
  ───────────────────────────────────────────────────────────── */

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selected.length === unidades.length) {
      setSelected([]);
    } else {
      setSelected(unidades.map((u) => u.id));
    }
  };

  /* ─────────────────────────────────────────────────────────────
     DELETE
  ───────────────────────────────────────────────────────────── */

  const handleDeleteSingle = async (id: string) => {
    if (!podeExcluir) return;
    toast('Eliminar unidade?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          await deleteUnidade(id, condoId);
          toast.success('Unidade eliminada.');
          refresh();
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  const handleDeleteMultiple = async () => {
    if (!podeExcluir) return;
    if (selected.length === 0) return;
    toast(`Eliminar ${selected.length} unidades?`, {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          await deleteMultipleUnidades(selected, condoId);
          toast.success(`${selected.length} unidades eliminadas.`);
          setSelected([]);
          refresh();
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  const handleEdit = (unidade: any) => {
    if (!podeEditar) return;
    setEditingUnidade(unidade);
    setPanelOpen(true);
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Unidades</h1>

        <div className="flex items-center gap-3">

          {/* Delete múltiplo */}
          {podeExcluir && selected.length > 0 && (
            <button
              onClick={handleDeleteMultiple}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-red-700 transition"
            >
              <Trash2 size={16} />
              Eliminar ({selected.length})
            </button>
          )}

          {/* Nova unidade */}
          {podeCriar && (
            <button
              onClick={() => {
                setEditingUnidade(null);
                setPanelOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-zinc-800 transition"
            >
              <Plus size={16} />
              Nova Unidade
            </button>
          )}

        </div>
      </div>

      {/* Selecionar Todos */}
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <input
          type="checkbox"
          checked={
            unidades.length > 0 &&
            selected.length === unidades.length
          }
          onChange={selectAll}
        />
        Selecionar todos
      </div>

      {/* Grid */}
      <UnidadesGrid
        unidades={unidades}
        moradoresMap={moradoresMap}
        financeiroMap={financeiroMap}
        selected={selected}
        toggleSelect={toggleSelect}
        handleEdit={podeEditar ? handleEdit : () => {}}
        handleDeleteSingle={podeExcluir ? handleDeleteSingle : () => {}}
        condoId={condoId}
      />

      {/* SidePanel */}
      <UnidadeSidePanel
        isOpen={panelOpen}
        condominioId={condoId}
        unidade={editingUnidade}
        onClose={() => {
          setPanelOpen(false);
          setEditingUnidade(null);
        }}
        onSuccess={refresh}
      />

    </main>
  );
}