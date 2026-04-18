'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getUnidadesByCondominio,
  deleteUnidade,
  deleteMultipleUnidades,
} from '@/lib/firebase/unidades';
import UnidadeSidePanel from './UnidadeSidePanel';
import { Plus, Trash2, Pencil } from 'lucide-react';

export default function UnidadesPage() {
  const params = useParams();
  const condoId = params?.condoId as string;

  const [unidades, setUnidades] = useState<any[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<any | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const fetchUnidades = async () => {
    const data = await getUnidadesByCondominio(condoId);
    setUnidades(data);
  };

  useEffect(() => {
    if (!condoId) return;
    fetchUnidades();
  }, [condoId]);

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

  const handleDeleteSingle = async (id: string) => {
    if (!confirm('Eliminar unidade?')) return;
    await deleteUnidade(id, condoId);
    fetchUnidades();
  };

  const handleDeleteMultiple = async () => {
    if (selected.length === 0) return;

    if (!confirm('Eliminar unidades selecionadas?')) return;

    await deleteMultipleUnidades(selected, condoId);
    setSelected([]);
    fetchUnidades();
  };

  const handleEdit = (unidade: any) => {
    setEditingUnidade(unidade);
    setPanelOpen(true);
  };

  return (
    <main className="p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Unidades</h1>

        <div className="flex items-center gap-3">

          {selected.length > 0 && (
            <button
              onClick={handleDeleteMultiple}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-red-700 transition"
            >
              <Trash2 size={16} />
              Eliminar ({selected.length})
            </button>
          )}

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

      {/* Lista */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">

        {unidades.map((u) => (
          <div
            key={u.id}
            className={`bg-white border rounded-2xl p-5 shadow-sm transition ${
              selected.includes(u.id)
                ? 'border-zinc-900'
                : 'border-zinc-200'
            }`}
          >

            <div className="flex justify-between items-start">

              <div className="flex items-start gap-3">

                <input
                  type="checkbox"
                  checked={selected.includes(u.id)}
                  onChange={() => toggleSelect(u.id)}
                />

                <div>
                  <h3 className="font-semibold text-black">
                    Unidade {u.numero}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Tipo: {u.tipo}
                  </p>
                  <p className="text-sm text-zinc-500">
                    Status: {u.status}
                  </p>
                </div>

              </div>

              <div className="flex items-center gap-3">

                <button
                  onClick={() => handleEdit(u)}
                  className="text-zinc-600 hover:text-black"
                >
                  <Pencil size={16} />
                </button>

                <button
                  onClick={() => handleDeleteSingle(u.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>

              </div>

            </div>
          </div>
        ))}

      </div>

      {/* SidePanel */}
      <UnidadeSidePanel
        isOpen={panelOpen}
        condominioId={condoId}
        unidade={editingUnidade} // ✅ modo edição
        onClose={() => {
          setPanelOpen(false);
          setEditingUnidade(null);
        }}
        onSuccess={fetchUnidades}
      />

    </main>
  );
}