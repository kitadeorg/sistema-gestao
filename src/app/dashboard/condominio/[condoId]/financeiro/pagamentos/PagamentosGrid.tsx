'use client';

import { Trash2, Pencil } from 'lucide-react';
import { Pagamento } from './types';
import { useAuthContext } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/permissionMatrix';

interface Props {
  pagamentos: Pagamento[];
  onEdit: (p: Pagamento) => void;
  onDelete: (id: string) => void;
}

export default function PagamentosGrid({
  pagamentos,
  onEdit,
  onDelete,
}: Props) {

  const { userData } = useAuthContext();
  const role = userData?.role;

  const podeEditar = role ? can(role, 'update', 'pagamento') : false;
  const podeExcluir = role ? can(role, 'delete', 'pagamento') : false;

  return (
    <div className="bg-white border rounded-2xl shadow-sm divide-y">
      {pagamentos.map(p => (
        <div key={p.id} className="flex justify-between px-5 py-3 items-center">
          <div>
            <p className="font-medium">{p.descricao}</p>
            <p className="text-xs text-zinc-400">{p.data}</p>
          </div>

          <div className="flex items-center gap-3">
            {podeEditar && (
              <button
                onClick={() => onEdit(p)}
                className="text-zinc-600 hover:text-black"
              >
                <Pencil size={16} />
              </button>
            )}

            {podeExcluir && (
              <button
                onClick={() => onDelete(p.id)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}