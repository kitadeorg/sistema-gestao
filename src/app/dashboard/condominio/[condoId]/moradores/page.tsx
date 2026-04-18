'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getMoradoresByCondominio,
  deleteMorador,
} from '@/lib/firebase/moradores';
import MoradorSidePanel from './MoradorSidePanel';
import { Plus, Trash2 } from 'lucide-react';

export default function MoradoresPage() {

  const params = useParams();
  const condoId = params?.condoId as string;

  const [moradores, setMoradores] = useState<any[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  const fetchMoradores = async () => {
    const data = await getMoradoresByCondominio(condoId);
    setMoradores(data);
  };

  useEffect(() => {
    if (!condoId) return;
    fetchMoradores();
  }, [condoId]);

  // ✅ CORRIGIDO — passa condoId como 3º argumento
  const handleDelete = async (
    id: string,
    unidadeId: string
  ) => {
    if (!confirm('Eliminar morador?')) return;

    await deleteMorador(
      id,
      unidadeId,
      condoId // ✅ argumento que faltava
    );

    fetchMoradores();
  };

  return (
    <main className="p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">
          Moradores
        </h1>

        <button
          onClick={() => setPanelOpen(true)}
          className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-zinc-800 transition"
        >
          <Plus size={16} />
          Novo Morador
        </button>
      </div>

      {/* Lista */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">

        {moradores.length === 0 && (
          <div className="col-span-full text-center text-zinc-500 py-10">
            Nenhum morador registado.
          </div>
        )}

        {moradores.map((m) => (
          <div
            key={m.id}
            className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex justify-between items-start"
          >

            <div>
              <h3 className="font-semibold text-black">
                {m.nome}
              </h3>

              <p className="text-sm text-zinc-500">
                Tipo: {m.tipo}
              </p>

              <p className="text-sm text-zinc-500">
                Status: {m.status}
              </p>
            </div>

            <button
              onClick={() =>
                handleDelete(m.id, m.unidadeId)
              }
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>

          </div>
        ))}

      </div>

      {/* SidePanel */}
      <MoradorSidePanel
        isOpen={panelOpen}
        condominioId={condoId}
        onClose={() => setPanelOpen(false)}
        onSuccess={fetchMoradores}
      />

    </main>
  );
}