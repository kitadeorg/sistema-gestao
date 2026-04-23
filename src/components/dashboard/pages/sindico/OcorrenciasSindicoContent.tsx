'use client';

import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { delegarOcorrencia } from '@/lib/firebase/ocorrencias';
import { useAuthContext } from '@/contexts/AuthContext';

interface Props {
  condoId: string;
}

export default function OcorrenciasSindicoContent({ condoId }: Props) {
  const { userData } = useAuthContext();

  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<any>(null);

  const fetchOcorrencias = async () => {
    const q = query(
      collection(db, 'ocorrencias'),
      where('condominioId', '==', condoId)
    );

    const snap = await getDocs(q);
    const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setOcorrencias(docs);
    setLoading(false);
  };

  useEffect(() => {
    fetchOcorrencias();
  }, [condoId]);

  if (loading) return <div className="p-6 text-black">Carregando...</div>;

  return (
    <>
      <div className="p-6 space-y-6">
        <h1 className="text-xl font-bold text-black">Ocorrências</h1>

        {ocorrencias.length === 0 && (
          <div className="text-sm text-zinc-500">
            Nenhuma ocorrência encontrada.
          </div>
        )}

        {ocorrencias.map(o => (
          <div
            key={o.id}
            className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm"
          >
            <div className="flex justify-between items-start">

              <div className="space-y-2">

                <h3 className="text-base font-bold text-black">
                  {o.titulo}
                </h3>

                <p className="text-sm text-zinc-700">
                  {o.descricao}
                </p>

                {/* ✅ Bloco e Unidade */}
                <div className="flex gap-4 text-xs text-zinc-500">
                  {o.bloco && (
                    <span>🏢 Bloco: <strong>{o.bloco}</strong></span>
                  )}
                  {o.unidadeNumero && (
                    <span>🚪 Unidade: <strong>{o.unidadeNumero}</strong></span>
                  )}
                </div>

                {/* ✅ Morador e Data */}
                <div className="flex gap-4 text-xs text-zinc-500">
                  {o.criadoPorNome && (
                    <span>👤 {o.criadoPorNome}</span>
                  )}
                  {o.createdAt?.toDate && (
                    <span>
                      📅 {o.createdAt.toDate().toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* ✅ Prioridade */}
                <div className="mt-2">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      o.prioridade === 'alta'
                        ? 'bg-red-100 text-red-600'
                        : o.prioridade === 'media'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {o.prioridade?.toUpperCase()}
                  </span>
                </div>

                {/* ✅ Instruções (se houver) */}
                {o.instrucoes && (
                  <div className="mt-3 p-3 bg-zinc-50 rounded-lg text-xs text-black">
                    <strong>Instruções:</strong>
                    <p className="mt-1">{o.instrucoes}</p>
                  </div>
                )}

              </div>

              {/* ✅ Botão Delegar */}
              {o.status === 'aberta' && (
                <button
                  onClick={() => setSelectedOcorrencia(o)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg"
                >
                  Delegar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedOcorrencia && (
        <DelegarSidePanel
          ocorrencia={selectedOcorrencia}
          onClose={() => setSelectedOcorrencia(null)}
          onSuccess={() => {
            setSelectedOcorrencia(null);
            fetchOcorrencias();
          }}
        />
      )}
    </>
  );
}

/* ===================================================== */
/* ================= SIDE PANEL ========================= */
/* ===================================================== */

function DelegarSidePanel({
  ocorrencia,
  onClose,
  onSuccess,
}: {
  ocorrencia: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { userData } = useAuthContext();

  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [prioridade, setPrioridade] = useState<'baixa' | 'media' | 'alta'>('media');
  const [instrucoes, setInstrucoes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFuncionarios = async () => {
      const snap = await getDocs(
        query(
          collection(db, 'usuarios'),
          where('role', '==', 'funcionario'),
          where('condominioId', '==', ocorrencia.condominioId)
        )
      );

      setFuncionarios(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
    };

    fetchFuncionarios();
  }, [ocorrencia]);

  const handleConfirm = async () => {
    if (!selectedFuncionario || !userData) return;

    try {
      setLoading(true);

      await delegarOcorrencia(
        ocorrencia.id,
        selectedFuncionario,
        userData.uid,
        prioridade,
        instrucoes
      );

      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
      <div className="w-[450px] bg-white h-full p-6 shadow-xl flex flex-col">

        <h2 className="text-lg font-bold text-black mb-4">
          Delegar Ocorrência
        </h2>

        <p className="text-sm text-black mb-4">
          {ocorrencia.titulo}
        </p>

        <label className="text-sm font-semibold text-black mb-2 block">
          Funcionário
        </label>

        <div className="space-y-2 mb-4">
          {funcionarios.length === 0 && (
            <p className="text-sm text-red-500">
              Nenhum funcionário neste condomínio.
            </p>
          )}

          {funcionarios.map(f => (
            <div
              key={f.id}
              onClick={() => setSelectedFuncionario(f.id)}
              className={`p-3 border rounded-lg cursor-pointer transition ${
                selectedFuncionario === f.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <p className="text-sm font-semibold text-black">
                {f.nome}
              </p>
              <p className="text-xs text-zinc-500">
                {f.email}
              </p>
            </div>
          ))}
        </div>

        <label className="text-sm font-semibold text-black mb-1">
          Prioridade
        </label>

        <select
  value={prioridade}
  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
    setPrioridade(e.target.value as 'baixa' | 'media' | 'alta')
  }
  className="w-full border border-zinc-300 text-black rounded-lg p-2 mb-4 bg-white"
>
  <option value="baixa">Baixa</option>
  <option value="media">Média</option>
  <option value="alta">Alta</option>
</select>

        <label className="text-sm font-semibold text-black mb-1">
          Instruções
        </label>

        <textarea
          value={instrucoes}
          onChange={(e) => setInstrucoes(e.target.value)}
          className="w-full border border-zinc-300 text-black rounded-lg p-2 mb-4 bg-white"
          rows={4}
        />

        <div className="mt-auto flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-zinc-300 text-black rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? 'Delegando...' : 'Confirmar'}
          </button>
        </div>

      </div>
    </div>
  );
}