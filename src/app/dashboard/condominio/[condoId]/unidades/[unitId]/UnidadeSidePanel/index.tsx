'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Copy, Upload, Trash2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/permissionMatrix';
import {
  createUnidade,
  updateUnidade,
  deleteUnidade,
  UnidadeInput,
} from '@/lib/firebase/unidades';

import ModoSingle from './Modosingle';
import ModoBatch from './Modobatch';
import ModoImport from './Modoimport';
import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type StatusType = 'vaga' | 'ocupada';
export type ModeType = 'single' | 'batch' | 'import';

export interface SingleForm {
  numero: string;
  bloco: string;
  tipo: string;
  area: string;
  fracao: string;
  permilagem: string;
  quotaIndividual: string;
  ativaQuotaIndividual: boolean;
  status: StatusType;
  observacoes: string;
}

export interface BatchConfig {
  bloco: string;
  tipo: string;
  numeroInicial: string;
  numeroFinal: string;
  prefixo: string;
  sufixo: string;
  area: string;
  fracao: string;
  permilagem: string;
  status: StatusType;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  condominioId: string;
  isOpen: boolean;
  unidade?: any;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Estado inicial ────────────────────────────────────────────────────────────

const initialSingleForm: SingleForm = {
  numero: '',
  bloco: '',
  tipo: 'T1',
  area: '',
  fracao: '',
  permilagem: '',
  quotaIndividual: '',
  ativaQuotaIndividual: false,
  status: 'vaga',
  observacoes: '',
};

const initialBatchConfig: BatchConfig = {
  bloco: '',
  tipo: 'T1',
  numeroInicial: '',
  numeroFinal: '',
  prefixo: '',
  sufixo: '',
  area: '',
  fracao: '',
  permilagem: '',
  status: 'vaga',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function UnidadeSidePanel({
  condominioId,
  isOpen,
  unidade,
  onClose,
  onSuccess,
}: Props) {
  const { userData } = useAuthContext();
  const role = userData?.role;

  // Permissões
  const podeCriar  = role ? can(role, 'create', 'unidade') : false;
  const podeEditar = role ? can(role, 'update', 'unidade') : false;
  const podeExcluir = role ? can(role, 'delete', 'unidade') : false;

  // Estado
  const [mode, setMode] = useState<ModeType>('single');
  const [form, setForm] = useState<SingleForm>(initialSingleForm);
  const [batchConfig, setBatchConfig] = useState<BatchConfig>(initialBatchConfig);
  const [batchPreview, setBatchPreview] = useState<string[]>([]);
  const [importedData, setImportedData] = useState<UnidadeInput[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Preencher form ao editar
  useEffect(() => {
    if (unidade) {
      setMode('single');
      setForm({
        numero:               unidade.numero              ?? '',
        bloco:                unidade.bloco               ?? '',
        tipo:                 unidade.tipo                ?? 'T1',
        area:                 unidade.area?.toString()    ?? '',
        fracao:               unidade.fracao?.toString()  ?? '',
        permilagem:           unidade.permilagem?.toString() ?? '',
        quotaIndividual:      unidade.quotaIndividual?.toString() ?? '',
        ativaQuotaIndividual: unidade.ativaQuotaIndividual ?? false,
        status:               unidade.status              ?? 'vaga',
        observacoes:          unidade.observacoes         ?? '',
      });
    } else {
      setForm(initialSingleForm);
      setBatchConfig(initialBatchConfig);
      setImportedData([]);
      setImportErrors([]);
      setMode('single');
    }
  }, [unidade, isOpen]);

  // Gerar preview em lote
  useEffect(() => {
    if (mode !== 'batch') return;

    const start = parseInt(batchConfig.numeroInicial);
    const end   = parseInt(batchConfig.numeroFinal);

    if (!isNaN(start) && !isNaN(end) && start <= end) {
      const preview: string[] = [];
      for (let i = start; i <= Math.min(end, start + 99); i++) {
        preview.push(`${batchConfig.prefixo}${i}${batchConfig.sufixo}`);
      }
      setBatchPreview(preview);
    } else {
      setBatchPreview([]);
    }
  }, [batchConfig, mode]);

  if (!isOpen) return null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSubmitSingle = async () => {
    if (loading) return;
    if (!form.numero.trim()) { toast.warning('Número da unidade é obrigatório.'); return; }

    const isEdit = !!unidade?.id;
    if (isEdit  && !podeEditar) return;
    if (!isEdit && !podeCriar)  return;

    try {
      setLoading(true);
      const payload: UnidadeInput = {
        numero:               form.numero,
        bloco:                form.bloco       || undefined,
        tipo:                 form.tipo,
        area:                 form.area        ? Number(form.area)       : undefined,
        fracao:               form.fracao      ? Number(form.fracao)     : undefined,
        permilagem:           form.permilagem  ? Number(form.permilagem) : undefined,
        quotaIndividual:      form.ativaQuotaIndividual ? Number(form.quotaIndividual) : undefined,
        ativaQuotaIndividual: form.ativaQuotaIndividual,
        status:               form.status,
        observacoes:          form.observacoes || undefined,
      };

      isEdit
        ? await updateUnidade(unidade.id, condominioId, payload)
        : await createUnidade(condominioId, payload);

      toast.success(isEdit ? 'Unidade actualizada com sucesso.' : 'Unidade criada com sucesso.');
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao guardar unidade.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBatch = async () => {
    if (loading || batchPreview.length === 0) return;
    if (!podeCriar) return;

    try {
      setLoading(true);
      for (const numero of batchPreview) {
        await createUnidade(condominioId, {
          numero,
          bloco:      batchConfig.bloco      || undefined,
          tipo:       batchConfig.tipo,
          area:       batchConfig.area       ? Number(batchConfig.area)       : undefined,
          fracao:     batchConfig.fracao     ? Number(batchConfig.fracao)     : undefined,
          permilagem: batchConfig.permilagem ? Number(batchConfig.permilagem) : undefined,
          status:     batchConfig.status,
        });
      }
      toast.success(`${batchPreview.length} unidades criadas com sucesso!`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar unidades em lote.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitImport = async () => {
    if (loading || importedData.length === 0) return;
    if (!podeCriar) return;

    try {
      setLoading(true);
      for (const u of importedData) {
        await createUnidade(condominioId, u);
      }
      toast.success(`${importedData.length} unidades importadas com sucesso!`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao importar unidades.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!unidade?.id || !podeExcluir) return;
    toast('Apagar esta unidade?', {
      description: 'Esta acção não pode ser desfeita.',
      action: {
        label: 'Apagar',
        onClick: async () => {
          try {
            setLoading(true);
            await deleteUnidade(unidade.id, condominioId);
            toast.success('Unidade apagada com sucesso.');
            onSuccess();
            onClose();
          } catch (err) {
            console.error(err);
            toast.error('Erro ao apagar unidade.');
          } finally {
            setLoading(false);
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  const handleDuplicate = () => {
    if (!podeCriar) return;
    setForm((prev) => ({ ...prev, numero: prev.numero + ' (cópia)' }));
  };

  // ── Label do botão principal ─────────────────────────────────────────────────

  const submitLabel = () => {
    if (loading) {
      return mode === 'import' ? 'A importar...' : mode === 'batch' ? 'A criar...' : 'A guardar...';
    }
    if (mode === 'import') return `Importar ${importedData.length} unidades`;
    if (mode === 'batch')  return `Criar ${batchPreview.length} unidades`;
    return unidade ? 'Atualizar Unidade' : 'Criar Unidade';
  };

  const isSubmitDisabled =
    loading ||
    (mode === 'batch'  && batchPreview.length   === 0) ||
    (mode === 'import' && importedData.length   === 0) ||
    (mode === 'single' && !unidade && !podeCriar)       ||
    (mode === 'single' && !!unidade && !podeEditar);

  const handleSubmit = () => {
    if (mode === 'single') return handleSubmitSingle();
    if (mode === 'batch')  return handleSubmitBatch();
    return handleSubmitImport();
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30"
        onClick={() => !loading && onClose()}
      />

      {/* Painel */}
      <div className="w-full max-w-lg bg-white h-full shadow-xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">
            {unidade ? 'Editar Unidade' : 'Nova Unidade'}
          </h2>
          <button onClick={() => !loading && onClose()} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs de modo (apenas na criação) */}
        {!unidade && (
          <div className="p-4 border-b border-zinc-200 bg-zinc-50">
            <div className="flex gap-2">
              {[
                { key: 'single', label: 'Individual', icon: <Plus size={14} />, show: podeCriar },
                { key: 'batch',  label: 'Lote',       icon: <Copy size={14} />, show: podeCriar },
                { key: 'import', label: 'Importar',   icon: <Upload size={14} />, show: podeCriar },
              ].filter(t => t.show).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setMode(tab.key as ModeType)}
                  className={`flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    mode === tab.key
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'single' && (
            <ModoSingle
              form={form}
              setForm={setForm}
              loading={loading}
              disabled={!!unidade && !podeEditar}
            />
          )}
          {mode === 'batch' && (
            <ModoBatch
              config={batchConfig}
              setConfig={setBatchConfig}
              preview={batchPreview}
              loading={loading}
            />
          )}
          {mode === 'import' && (
            <ModoImport
              importedData={importedData}
              setImportedData={setImportedData}
              importErrors={importErrors}
              setImportErrors={setImportErrors}
              loading={loading}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-200 space-y-3">

          {/* Ações edição */}
          {unidade && (podeEditar || podeExcluir) && (
            <div className="flex gap-2">
              {podeEditar && (
                <button
                  onClick={handleDuplicate}
                  disabled={loading}
                  className="flex-1 bg-zinc-100 text-zinc-700 py-2 rounded-xl text-sm hover:bg-zinc-200 transition disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  <Copy size={14} />
                  Duplicar
                </button>
              )}
              {podeExcluir && (
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl text-sm hover:bg-red-100 transition disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  Apagar
                </button>
              )}
            </div>
          )}

          {/* Botão principal */}
          {!isSubmitDisabled || loading ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="w-full bg-zinc-900 text-white py-2 rounded-xl text-sm hover:bg-zinc-800 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {submitLabel()}
            </button>
          ) : null}

        </div>
      </div>
    </div>
  );
}