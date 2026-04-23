'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { criarOcorrencia } from '@/lib/firebase/ocorrencias';
import { useAuthContext } from '@/contexts/AuthContext';
import { Plus, X, Loader2 } from 'lucide-react';

interface Ocorrencia {
  id: string;
  titulo: string;
  descricao?: string;
  status: string;
  prioridade: 'baixa' | 'media' | 'alta';
  categoria: string;
  createdAt?: any;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    aberta:      'bg-red-50 text-red-600',
    delegada:    'bg-amber-50 text-amber-600',
    em_execucao: 'bg-blue-50 text-blue-600',
    concluida:   'bg-emerald-50 text-emerald-600',
    encerrada:   'bg-zinc-100 text-zinc-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-zinc-100 text-zinc-600'}`}>
      {status}
    </span>
  );
}

function NovaOcorrenciaModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: {
    titulo: string;
    descricao: string;
    categoria: string;
    prioridade: 'baixa' | 'media' | 'alta';
  }) => void;
}) {
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    categoria: 'Barulho',
    prioridade: 'media' as 'baixa' | 'media' | 'alta',
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-black">Nova Ocorrência</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>

        <input
          type="text"
          placeholder="Título"
          value={form.titulo}
          onChange={e => setForm({ ...form, titulo: e.target.value })}
          className="w-full border p-2 rounded-lg text-black"
        />

        <textarea
          placeholder="Descrição"
          value={form.descricao}
          onChange={e => setForm({ ...form, descricao: e.target.value })}
          className="w-full border p-2 rounded-lg text-black"
        />

        <select
          value={form.categoria}
          onChange={e => setForm({ ...form, categoria: e.target.value })}
          className="w-full border p-2 rounded-lg text-black"
        >
          {['Barulho', 'Limpeza', 'Segurança', 'Manutenção', 'Outro'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={form.prioridade}
          onChange={e => setForm({ ...form, prioridade: e.target.value as 'baixa' | 'media' | 'alta' })}
          className="w-full border p-2 rounded-lg text-black"
        >
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </select>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">Cancelar</button>
          <button
            onClick={() => form.titulo && onSave(form)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg"
          >
            Registar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OcorrenciasMoradorPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData, loading: authLoading } = useAuthContext();

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);

  // ✅ Dados do morador vêm directamente do userData (enriquecido no useAuth)
  const unidadeId     = userData?.unidadeId;
  const unidadeNumero = userData?.unidadeNumero;
  const bloco         = userData?.bloco;

  const fetchOcorrencias = async () => {
    if (!userData?.uid) return;

    const q = query(
      collection(db, 'ocorrencias'),
      where('condominioId', '==', condoId),
      where('criadoPor', '==', userData.uid)
    );

    const snap = await getDocs(q);
    setOcorrencias(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ocorrencia)));
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !condoId || !userData?.uid) return;
    fetchOcorrencias();
  }, [condoId, userData?.uid, authLoading]);

  const handleSave = async (data: {
    titulo: string;
    descricao: string;
    categoria: string;
    prioridade: 'baixa' | 'media' | 'alta';
  }) => {
    // ✅ Guarda a ocorrência com os dados já disponíveis no userData
    if (!userData?.uid || !unidadeId || !unidadeNumero) return;

    await criarOcorrencia({
      condominioId:  condoId,
      unidadeId,
      unidadeNumero,
      bloco:         bloco ?? '',
      criadoPor:     userData.uid,
      criadoPorNome: userData.nome,
      descricao:     data.descricao,
      categoria:     data.categoria,
    });

    setShowModal(false);
    fetchOcorrencias();
  };

  if (authLoading || loading)
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );

  return (
    <main className="p-6 space-y-6">
      {showModal && (
        <NovaOcorrenciaModal
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-black">Minhas Ocorrências</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg"
        >
          <Plus size={16} />
        </button>
      </div>

      {ocorrencias.length === 0 ? (
        <p className="text-zinc-500">Nenhuma ocorrência registada</p>
      ) : (
        <div className="space-y-4">
          {ocorrencias.map(o => (
            <div key={o.id} className="border rounded-xl p-4 bg-white">
              <h3 className="font-semibold text-black">{o.titulo}</h3>
              <p className="text-sm text-zinc-600">{o.descricao}</p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={o.status} />
                <span className="text-xs text-zinc-500">{o.categoria}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}