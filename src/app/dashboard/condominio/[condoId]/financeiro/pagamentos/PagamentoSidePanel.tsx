'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/permissionMatrix';
import { addDoc, updateDoc, doc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { Pagamento } from './types';
import { toast } from 'sonner';

interface Props {
  condominioId: string;
  isOpen: boolean;
  pagamento?: Pagamento | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PagamentoSidePanel({
  condominioId,
  isOpen,
  pagamento,
  onClose,
  onSuccess,
}: Props) {

  const { userData } = useAuthContext();
  const role = userData?.role;

  const podeCriar  = role ? can(role, 'create', 'pagamento') : false;
  const podeEditar = role ? can(role, 'update', 'pagamento') : false;

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    tipo: 'receita',
    status: 'pendente',
    data: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (pagamento) {
      setForm({
        descricao: pagamento.descricao,
        valor: pagamento.valor.toString(),
        tipo: pagamento.tipo,
        status: pagamento.status,
        data: pagamento.data,
      });
    } else {
      setForm({
        descricao: '',
        valor: '',
        tipo: 'receita',
        status: 'pendente',
        data: new Date().toISOString().split('T')[0],
      });
    }
  }, [pagamento]);

  if (!isOpen) return null;

  const handleSubmit = async () => {

    const isEdit = !!pagamento?.id;

    if (isEdit && !podeEditar) return;
    if (!isEdit && !podeCriar) return;

    if (!form.descricao || !form.valor) {
      toast.warning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        condominioId,
        descricao: form.descricao,
        valor: Number(form.valor),
        tipo: form.tipo,
        status: form.status,
        data: form.data,
      };

      if (isEdit) {
        await updateDoc(doc(db, 'pagamentos', pagamento.id), payload);
      } else {
        await addDoc(collection(db, 'pagamentos'), payload);
      }

      toast.success(isEdit ? 'Pagamento actualizado.' : 'Pagamento criado com sucesso.');
      onSuccess();
      onClose();

    } catch (err) {
      console.error(err);
      toast.error('Erro ao guardar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">

      <div
        className="flex-1 bg-black/30"
        onClick={() => !loading && onClose()}
      />

      <div className="w-full sm:max-w-md lg:max-w-lg bg-white h-full shadow-xl flex flex-col">

        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-200">
          <h2 className="text-base sm:text-lg font-semibold text-zinc-900">
            {pagamento ? 'Editar Pagamento' : 'Novo Pagamento'}
          </h2>
          <button onClick={() => !loading && onClose()}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

          <input
            placeholder="Descrição"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            className="w-full text-black border border-zinc-200 rounded-xl px-3 py-2 text-sm"
          />

          <input
            type="number"
            placeholder="Valor"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            className="w-full border text-black border-zinc-200 rounded-xl px-3 py-2 text-sm"
          />

          <select
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            className="w-full border text-black border-zinc-200 rounded-xl px-3 py-2 text-sm"
          >
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>

          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full border text-black border-zinc-200 rounded-xl px-3 py-2 text-sm"
          >
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <input
            type="date"
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
            className="w-full border text-black border-zinc-200 rounded-xl px-3 py-2 text-sm"
          />

        </div>

        <div className="p-4 sm:p-6 border-t border-zinc-200">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-2 rounded-xl text-sm hover:bg-zinc-800 transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {pagamento ? 'Atualizar Pagamento' : 'Criar Pagamento'}
          </button>
        </div>

      </div>
    </div>
  );
}