'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import {
  createUnidade,
  updateUnidade,
  UnidadeInput,
} from '@/lib/firebase/unidades';

interface Props {
  condominioId: string;
  isOpen: boolean;
  unidade?: any; // ✅ opcional para modo edição
  onClose: () => void;
  onSuccess: () => void;
}

type StatusType = 'vaga' | 'ocupada';

export default function UnidadeSidePanel({
  condominioId,
  isOpen,
  unidade,
  onClose,
  onSuccess,
}: Props) {

  const initialState = {
    numero: '',
    bloco: '',
    tipo: 'T1',
    area: '',
    fracao: '',
    permilagem: '',
    quotaIndividual: '',
    ativaQuotaIndividual: false,
    status: 'vaga' as StatusType,
    observacoes: '',
  };

  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);

  // ✅ Preencher automaticamente se for edição
  useEffect(() => {
    if (unidade) {
      setForm({
        numero: unidade.numero ?? '',
        bloco: unidade.bloco ?? '',
        tipo: unidade.tipo ?? 'T1',
        area: unidade.area?.toString() ?? '',
        fracao: unidade.fracao?.toString() ?? '',
        permilagem: unidade.permilagem?.toString() ?? '',
        quotaIndividual: unidade.quotaIndividual?.toString() ?? '',
        ativaQuotaIndividual: unidade.ativaQuotaIndividual ?? false,
        status: unidade.status ?? 'vaga',
        observacoes: unidade.observacoes ?? '',
      });
    } else {
      setForm(initialState);
    }
  }, [unidade]);

  if (!isOpen) return null;

  const handleChange = (
    field: keyof typeof form,
    value: any
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value ?? '',
    }));
  };

  const handleSubmit = async () => {

    if (loading) return;

    if (!form.numero.trim()) {
      alert('Número da unidade é obrigatório.');
      return;
    }

    try {
      setLoading(true);

      const payload: UnidadeInput = {
        numero: form.numero,
        bloco: form.bloco || undefined,
        tipo: form.tipo,
        area: form.area ? Number(form.area) : undefined,
        fracao: form.fracao ? Number(form.fracao) : undefined,
        permilagem: form.permilagem ? Number(form.permilagem) : undefined,
        quotaIndividual: form.ativaQuotaIndividual
          ? Number(form.quotaIndividual)
          : undefined,
        ativaQuotaIndividual: form.ativaQuotaIndividual,
        status: form.status,
        observacoes: form.observacoes || undefined,
      };

      if (unidade?.id) {
        await updateUnidade(
          unidade.id,
          condominioId,
          payload
        );
      } else {
        await createUnidade(
          condominioId,
          payload
        );
      }

      onSuccess();
      onClose();

    } catch (error) {
      console.error(error);
      alert('Erro ao guardar unidade.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle =
    'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 disabled:opacity-60';

  return (
    <div className="fixed inset-0 z-50 flex">

      <div
        className="flex-1 bg-black/30"
        onClick={() => !loading && onClose()}
      />

      <div className="w-full max-w-lg bg-white h-full shadow-xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">
            {unidade ? 'Editar Unidade' : 'Nova Unidade'}
          </h2>
          <button
            onClick={() => !loading && onClose()}
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          <input
            placeholder="Número"
            value={form.numero}
            disabled={loading}
            onChange={(e) =>
              handleChange('numero', e.target.value)
            }
            className={inputStyle}
          />

          <input
            placeholder="Bloco"
            value={form.bloco}
            disabled={loading}
            onChange={(e) =>
              handleChange('bloco', e.target.value)
            }
            className={inputStyle}
          />

          <select
            value={form.tipo}
            disabled={loading}
            onChange={(e) =>
              handleChange('tipo', e.target.value)
            }
            className={inputStyle}
          >
            <option value="T0">T0</option>
            <option value="T1">T1</option>
            <option value="T2">T2</option>
            <option value="T3">T3</option>
            <option value="Vivenda">Vivenda</option>
            <option value="Loja">Loja</option>
            <option value="Garagem">Garagem</option>
          </select>

          <input
            type="number"
            placeholder="Área (m²)"
            value={form.area}
            disabled={loading}
            onChange={(e) =>
              handleChange('area', e.target.value)
            }
            className={inputStyle}
          />

          <input
            type="number"
            placeholder="Fração"
            value={form.fracao}
            disabled={loading}
            onChange={(e) =>
              handleChange('fracao', e.target.value)
            }
            className={inputStyle}
          />

          <input
            type="number"
            placeholder="Permilagem"
            value={form.permilagem}
            disabled={loading}
            onChange={(e) =>
              handleChange('permilagem', e.target.value)
            }
            className={inputStyle}
          />

          <label className="flex items-center gap-2 text-sm text-zinc-900">
            <input
              type="checkbox"
              checked={form.ativaQuotaIndividual}
              disabled={loading}
              onChange={(e) =>
                handleChange(
                  'ativaQuotaIndividual',
                  e.target.checked
                )
              }
            />
            Ativar quota individual
          </label>

          {form.ativaQuotaIndividual && (
            <input
              type="number"
              placeholder="Valor quota individual"
              value={form.quotaIndividual}
              disabled={loading}
              onChange={(e) =>
                handleChange(
                  'quotaIndividual',
                  e.target.value
                )
              }
              className={inputStyle}
            />
          )}

          <select
            value={form.status}
            disabled={loading}
            onChange={(e) =>
              handleChange(
                'status',
                e.target.value as StatusType
              )
            }
            className={inputStyle}
          >
            <option value="vaga">Vaga</option>
            <option value="ocupada">Ocupada</option>
          </select>

          <textarea
            placeholder="Observações"
            value={form.observacoes}
            disabled={loading}
            onChange={(e) =>
              handleChange('observacoes', e.target.value)
            }
            className={inputStyle}
            rows={3}
          />

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-200">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-2 rounded-xl text-sm hover:bg-zinc-800 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <Loader2 size={16} className="animate-spin" />
            )}
            {loading
              ? 'A guardar...'
              : unidade
              ? 'Atualizar Unidade'
              : 'Criar Unidade'}
          </button>
        </div>

      </div>
    </div>
  );
}