'use client';

import {
  Trash2,
  Pencil,
  User,
  AlertTriangle,
  CheckCircle,
  Home
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/permissionMatrix';

interface Props {
  unidades: any[];
  moradoresMap: Record<string, any>;
  financeiroMap: Record<string, number>;
  selected: string[];
  toggleSelect: (id: string) => void;
  handleEdit: (u: any) => void;
  handleDeleteSingle: (id: string) => void;
  condoId: string;
}

export default function UnidadesGrid({
  unidades,
  moradoresMap,
  financeiroMap,
  selected,
  toggleSelect,
  handleEdit,
  handleDeleteSingle,
  condoId
}: Props) {

  const router = useRouter();
  const { userData } = useAuthContext();

  const role = userData?.role;

  // ✅ PERMISSÕES SEGURAS
  const podeEditar = role ? can(role, 'update', 'unidade') : false;
  const podeExcluir = role ? can(role, 'delete', 'unidade') : false;

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {unidades.map((u) => {

        const morador = moradoresMap[u.id];
        const emAtraso = financeiroMap[u.id] || 0;

        return (
          <div
            key={u.id}
            onClick={() =>
              router.push(`/dashboard/condominio/${condoId}/unidades/${u.id}`)
            }
            className={`bg-white border rounded-2xl p-5 shadow-sm transition cursor-pointer hover:shadow-md ${
              selected.includes(u.id)
                ? 'border-zinc-900'
                : 'border-zinc-200'
            }`}
          >
            <div className="flex justify-between items-start">

              {/* Lado esquerdo */}
              <div className="flex items-start gap-3">

                <input
                  type="checkbox"
                  onClick={(e) => e.stopPropagation()}
                  checked={selected.includes(u.id)}
                  onChange={() => toggleSelect(u.id)}
                />

                <div>
                  <h3 className="font-semibold text-black flex items-center gap-2">
                    <Home size={14} />
                    Unidade {u.numero}
                  </h3>

                  <p className="text-sm text-zinc-500">
                    Tipo: {u.tipo}
                  </p>

                  <p className="text-sm text-zinc-500">
                    Status: {u.status}
                  </p>

                  {/* MORADOR */}
                  {morador ? (
                    <p className="text-sm text-zinc-600 flex items-center gap-1 mt-1">
                      <User size={12} />
                      {morador.nome}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400 mt-1">
                      Unidade vaga
                    </p>
                  )}

                  {/* FINANCEIRO */}
                  {emAtraso > 0 ? (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertTriangle size={12} />
                      Em atraso: {emAtraso} Kz
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                      <CheckCircle size={12} />
                      Em dia
                    </p>
                  )}

                </div>
              </div>

              {/* Lado direito */}
              <div className="flex items-center gap-3">

                {/* ✅ EDITAR */}
                {podeEditar && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(u);
                    }}
                    className="text-zinc-600 hover:text-black"
                  >
                    <Pencil size={16} />
                  </button>
                )}

                {/* ✅ EXCLUIR */}
                {podeExcluir && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSingle(u.id);
                    }}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}