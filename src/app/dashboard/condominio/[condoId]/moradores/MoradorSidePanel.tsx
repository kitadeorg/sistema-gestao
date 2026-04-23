'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/permissionMatrix';
import {
  createMorador,
  MoradorInput,
} from '@/lib/firebase/moradores';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { toast } from 'sonner';

interface Props {
  condominioId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MoradorSidePanel({
  condominioId,
  isOpen,
  onClose,
  onSuccess,
}: Props) {

  const { userData } = useAuthContext();
  const role = userData?.role;

  // ✅ PERMISSÃO
  const podeCriar = role ? can(role, 'create', 'morador') : false;

  const [loading, setLoading] = useState(false);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState<any[]>([]);

  const [form, setForm] = useState({
    unidadeId: '',
    nome: '',
    telefone: '',
    email: '',
    tipo: 'proprietario',
  });

  useEffect(() => {
    if (!isOpen) return;

    const fetchUnidades = async () => {
      const q = query(
        collection(db, 'unidades'),
        where('condominioId', '==', condominioId),
        where('status', '==', 'vaga')
      );

      const snapshot = await getDocs(q);

      setUnidadesDisponiveis(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    };

    fetchUnidades();
  }, [isOpen, condominioId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {

    if (!podeCriar) return;

    if (!form.unidadeId || !form.nome.trim()) {
      toast.warning('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);

      const payload: MoradorInput = {
        unidadeId: form.unidadeId,
        nome: form.nome,
        telefone: form.telefone || undefined,
        email: form.email || undefined,
        tipo: form.tipo as any,
      };

      await createMorador(condominioId, payload);
      toast.success('Morador criado com sucesso.');
      onSuccess();
      onClose();

    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar morador.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle =
    'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex">

      <div
        className="flex-1 bg-black/30"
        onClick={() => !loading && onClose()}
      />

      <div className="w-full max-w-lg bg-white h-full shadow-xl flex flex-col">

        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">
            Novo Morador
          </h2>
          <button onClick={() => !loading && onClose()}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          <select
            value={form.unidadeId}
            onChange={(e) =>
              setForm({ ...form, unidadeId: e.target.value })
            }
            className={inputStyle}
            disabled={loading}
          >
            <option value="">Selecionar Unidade</option>
            {unidadesDisponiveis.map((u) => (
              <option key={u.id} value={u.id}>
                {u.numero}
              </option>
            ))}
          </select>

          <input
            placeholder="Nome completo"
            value={form.nome}
            onChange={(e) =>
              setForm({ ...form, nome: e.target.value })
            }
            className={inputStyle}
            disabled={loading}
          />

          <input
            placeholder="Telefone"
            value={form.telefone}
            onChange={(e) =>
              setForm({ ...form, telefone: e.target.value })
            }
            className={inputStyle}
            disabled={loading}
          />

          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            className={inputStyle}
            disabled={loading}
          />

          <select
            value={form.tipo}
            onChange={(e) =>
              setForm({ ...form, tipo: e.target.value })
            }
            className={inputStyle}
            disabled={loading}
          >
            <option value="proprietario">Proprietário</option>
            <option value="inquilino">Inquilino</option>
          </select>

        </div>

        <div className="p-6 border-t border-zinc-200">

          {podeCriar && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-zinc-900 text-white py-2 rounded-xl text-sm hover:bg-zinc-800 transition disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'A guardar...' : 'Criar Morador'}
            </button>
          )}

        </div>

      </div>
    </div>
  );
}