'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Upload, FileSpreadsheet, Copy, Trash2, Plus } from 'lucide-react';
import {
  createUnidade,
  updateUnidade,
  deleteUnidade,
  UnidadeInput,
} from '@/lib/firebase/unidades';
import { toast } from 'sonner';

interface Props {
  condominioId: string;
  isOpen: boolean;
  unidade?: any;
  onClose: () => void;
  onSuccess: () => void;
}

type StatusType = 'vaga' | 'ocupada';
type ModeType = 'single' | 'batch' | 'import';

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

  const [mode, setMode] = useState<ModeType>('single');
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  
  // Criação em lote
  const [batchConfig, setBatchConfig] = useState({
    bloco: '',
    tipo: 'T1',
    numeroInicial: '',
    numeroFinal: '',
    prefixo: '',
    sufixo: '',
    area: '',
    fracao: '',
    permilagem: '',
    status: 'vaga' as StatusType,
  });

  // Preview das unidades em lote
  const [batchPreview, setBatchPreview] = useState<string[]>([]);

  // Importação CSV
  const [importedData, setImportedData] = useState<UnidadeInput[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  useEffect(() => {
    if (unidade) {
      setMode('single');
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
      setMode('single');
    }
  }, [unidade]);

  // Gerar preview de unidades em lote
  useEffect(() => {
    if (mode === 'batch' && batchConfig.numeroInicial && batchConfig.numeroFinal) {
      const start = parseInt(batchConfig.numeroInicial);
      const end = parseInt(batchConfig.numeroFinal);
      
      if (start <= end && !isNaN(start) && !isNaN(end)) {
        const preview = [];
        for (let i = start; i <= end; i++) {
          const num = `${batchConfig.prefixo}${i}${batchConfig.sufixo}`;
          preview.push(num);
        }
        setBatchPreview(preview.slice(0, 100)); // Limite de 100 unidades
      } else {
        setBatchPreview([]);
      }
    }
  }, [batchConfig, mode]);

  if (!isOpen) return null;

  const handleChange = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value ?? '' }));
  };

  const handleBatchChange = (field: keyof typeof batchConfig, value: any) => {
    setBatchConfig((prev) => ({ ...prev, [field]: value ?? '' }));
  };

  // Submeter unidade única
  const handleSubmit = async () => {
    if (loading) return;

    if (!form.numero.trim()) {
      toast.warning('Número da unidade é obrigatório.');
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
        await updateUnidade(unidade.id, condominioId, payload);
      } else {
        await createUnidade(condominioId, payload);
      }

      toast.success(unidade?.id ? 'Unidade actualizada.' : 'Unidade criada com sucesso.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao guardar unidade.');
    } finally {
      setLoading(false);
    }
  };

  // Criar unidades em lote
  const handleBatchSubmit = async () => {
    if (loading) return;
    if (batchPreview.length === 0) {
      toast.warning('Configure os números para gerar unidades.');
      return;
    }

    try {
      setLoading(true);

      for (const numero of batchPreview) {
        const payload: UnidadeInput = {
          numero,
          bloco: batchConfig.bloco || undefined,
          tipo: batchConfig.tipo,
          area: batchConfig.area ? Number(batchConfig.area) : undefined,
          fracao: batchConfig.fracao ? Number(batchConfig.fracao) : undefined,
          permilagem: batchConfig.permilagem ? Number(batchConfig.permilagem) : undefined,
          status: batchConfig.status,
        };

        await createUnidade(condominioId, payload);
      }

      toast.success(`${batchPreview.length} unidades criadas com sucesso!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar unidades em lote.');
    } finally {
      setLoading(false);
    }
  };

  // Importar CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const data: UnidadeInput[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: any = {};

          headers.forEach((header, idx) => {
            row[header] = values[idx];
          });

          if (!row.numero) {
            errors.push(`Linha ${i + 1}: Número obrigatório`);
            continue;
          }

          data.push({
            numero: row.numero,
            bloco: row.bloco || undefined,
            tipo: row.tipo || 'T1',
            area: row.area ? Number(row.area) : undefined,
            fracao: row.fracao ? Number(row.fracao) : undefined,
            permilagem: row.permilagem ? Number(row.permilagem) : undefined,
            status: (row.status as StatusType) || 'vaga',
            observacoes: row.observacoes || undefined,
          });
        }

        setImportedData(data);
        setImportErrors(errors);
      } catch (error) {
        toast.error('Erro ao processar ficheiro CSV.');
      }
    };
    reader.readAsText(file);
  };

  // Importar dados do CSV
  const handleImportSubmit = async () => {
    if (loading || importedData.length === 0) return;

    try {
      setLoading(true);

      for (const unidadeData of importedData) {
        await createUnidade(condominioId, unidadeData);
      }

      toast.success(`${importedData.length} unidades importadas com sucesso!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao importar unidades.');
    } finally {
      setLoading(false);
    }
  };

  // Duplicar unidade
  const handleDuplicate = () => {
    setForm({
      ...form,
      numero: form.numero + ' (cópia)',
    });
  };

  // Apagar unidade
  const handleDelete = async () => {
    if (!unidade?.id) return;

    toast('Apagar esta unidade?', {
      description: 'Esta acção não pode ser desfeita.',
      action: {
        label: 'Apagar',
        onClick: async () => {
          try {
            setLoading(true);
            await deleteUnidade(unidade.id, condominioId);
            toast.success('Unidade apagada.');
            onSuccess();
            onClose();
          } catch (error) {
            console.error(error);
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

  // Baixar template CSV
  const downloadTemplate = () => {
    const csv = 'numero,bloco,tipo,area,fracao,permilagem,status,observacoes\n101,A,T1,50,1,10,vaga,\n102,A,T2,75,2,15,vaga,';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_unidades.csv';
    a.click();
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

        {/* Modo de criação (só aparece se não estiver editando) */}
        {!unidade && (
          <div className="p-4 border-b border-zinc-200 bg-zinc-50">
            <div className="flex gap-2">
              <button
                onClick={() => setMode('single')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  mode === 'single'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <Plus size={14} className="inline mr-1" />
                Individual
              </button>
              <button
                onClick={() => setMode('batch')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  mode === 'batch'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <Copy size={14} className="inline mr-1" />
                Lote
              </button>
              <button
                onClick={() => setMode('import')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  mode === 'import'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <Upload size={14} className="inline mr-1" />
                Importar
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* MODO: Unidade Individual */}
          {mode === 'single' && (
            <>
              <input
                placeholder="Número"
                value={form.numero}
                disabled={loading}
                onChange={(e) => handleChange('numero', e.target.value)}
                className={inputStyle}
              />

              <input
                placeholder="Bloco"
                value={form.bloco}
                disabled={loading}
                onChange={(e) => handleChange('bloco', e.target.value)}
                className={inputStyle}
              />

              <select
                value={form.tipo}
                disabled={loading}
                onChange={(e) => handleChange('tipo', e.target.value)}
                className={inputStyle}
              >
                <option value="T0">T0</option>
                <option value="T1">T1</option>
                <option value="T2">T2</option>
                <option value="T3">T3</option>
                <option value="T4">T4</option>
                <option value="Vivenda">Vivenda</option>
                <option value="Loja">Loja</option>
                <option value="Garagem">Garagem</option>
                <option value="Arrecadação">Arrecadação</option>
              </select>

              <input
                type="number"
                placeholder="Área (m²)"
                value={form.area}
                disabled={loading}
                onChange={(e) => handleChange('area', e.target.value)}
                className={inputStyle}
              />

              <input
                type="number"
                placeholder="Fração"
                value={form.fracao}
                disabled={loading}
                onChange={(e) => handleChange('fracao', e.target.value)}
                className={inputStyle}
              />

              <input
                type="number"
                placeholder="Permilagem"
                value={form.permilagem}
                disabled={loading}
                onChange={(e) => handleChange('permilagem', e.target.value)}
                className={inputStyle}
              />

              <label className="flex items-center gap-2 text-sm text-zinc-900">
                <input
                  type="checkbox"
                  checked={form.ativaQuotaIndividual}
                  disabled={loading}
                  onChange={(e) =>
                    handleChange('ativaQuotaIndividual', e.target.checked)
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
                    handleChange('quotaIndividual', e.target.value)
                  }
                  className={inputStyle}
                />
              )}

              <select
                value={form.status}
                disabled={loading}
                onChange={(e) =>
                  handleChange('status', e.target.value as StatusType)
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
                onChange={(e) => handleChange('observacoes', e.target.value)}
                className={inputStyle}
                rows={3}
              />
            </>
          )}

          {/* MODO: Criação em Lote */}
          {mode === 'batch' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <strong>Dica:</strong> Crie múltiplas unidades com numeração sequencial automaticamente.
              </div>

              <input
                placeholder="Bloco (opcional)"
                value={batchConfig.bloco}
                onChange={(e) => handleBatchChange('bloco', e.target.value)}
                className={inputStyle}
              />

              <select
                value={batchConfig.tipo}
                onChange={(e) => handleBatchChange('tipo', e.target.value)}
                className={inputStyle}
              >
                <option value="T0">T0</option>
                <option value="T1">T1</option>
                <option value="T2">T2</option>
                <option value="T3">T3</option>
                <option value="T4">T4</option>
                <option value="Vivenda">Vivenda</option>
                <option value="Loja">Loja</option>
                <option value="Garagem">Garagem</option>
                <option value="Arrecadação">Arrecadação</option>
              </select>

              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Prefixo (ex: A)"
                  value={batchConfig.prefixo}
                  onChange={(e) => handleBatchChange('prefixo', e.target.value)}
                  className={inputStyle}
                />
                <input
                  placeholder="Sufixo (opcional)"
                  value={batchConfig.sufixo}
                  onChange={(e) => handleBatchChange('sufixo', e.target.value)}
                  className={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Número inicial"
                  value={batchConfig.numeroInicial}
                  onChange={(e) => handleBatchChange('numeroInicial', e.target.value)}
                  className={inputStyle}
                />
                <input
                  type="number"
                  placeholder="Número final"
                  value={batchConfig.numeroFinal}
                  onChange={(e) => handleBatchChange('numeroFinal', e.target.value)}
                  className={inputStyle}
                />
              </div>

              <input
                type="number"
                placeholder="Área (m²) - opcional"
                value={batchConfig.area}
                onChange={(e) => handleBatchChange('area', e.target.value)}
                className={inputStyle}
              />

              <input
                type="number"
                placeholder="Fração - opcional"
                value={batchConfig.fracao}
                onChange={(e) => handleBatchChange('fracao', e.target.value)}
                className={inputStyle}
              />

              <input
                type="number"
                placeholder="Permilagem - opcional"
                value={batchConfig.permilagem}
                onChange={(e) => handleBatchChange('permilagem', e.target.value)}
                className={inputStyle}
              />

              <select
                value={batchConfig.status}
                onChange={(e) =>
                  handleBatchChange('status', e.target.value as StatusType)
                }
                className={inputStyle}
              >
                <option value="vaga">Vaga</option>
                <option value="ocupada">Ocupada</option>
              </select>

              {/* Preview */}
              {batchPreview.length > 0 && (
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <p className="text-sm font-medium text-zinc-900 mb-2">
                    Preview ({batchPreview.length} unidades):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {batchPreview.slice(0, 20).map((num) => (
                      <span
                        key={num}
                        className="px-2 py-1 bg-white border border-zinc-200 rounded text-xs text-zinc-700"
                      >
                        {num}
                      </span>
                    ))}
                    {batchPreview.length > 20 && (
                      <span className="px-2 py-1 text-xs text-zinc-500">
                        +{batchPreview.length - 20} mais...
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* MODO: Importar CSV */}
          {mode === 'import' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <strong>Formato CSV:</strong> numero, bloco, tipo, area, fracao, permilagem, status, observacoes
              </div>

              <button
                onClick={downloadTemplate}
                className="w-full border-2 border-dashed border-zinc-300 rounded-xl py-3 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 transition flex items-center justify-center gap-2"
              >
                <FileSpreadsheet size={16} />
                Baixar template CSV
              </button>

              <label className="block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="w-full border-2 border-dashed border-zinc-300 rounded-xl py-8 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 transition flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload size={24} />
                  <span>Clique para selecionar ficheiro CSV</span>
                </label>
              </label>

              {importedData.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-green-900">
                    ✓ {importedData.length} unidades prontas para importar
                  </p>
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-red-900 mb-2">Erros encontrados:</p>
                  <ul className="text-xs text-red-800 space-y-1">
                    {importErrors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-200 space-y-3">
          
          {/* Ações da unidade (só no modo edição) */}
          {unidade && (
            <div className="flex gap-2">
              <button
                onClick={handleDuplicate}
                disabled={loading}
                className="flex-1 bg-zinc-100 text-zinc-700 py-2 rounded-xl text-sm hover:bg-zinc-200 transition disabled:opacity-70 flex items-center justify-center gap-2"
              >
                <Copy size={14} />
                Duplicar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl text-sm hover:bg-red-100 transition disabled:opacity-70 flex items-center justify-center gap-2"
              >
                <Trash2 size={14} />
                Apagar
              </button>
            </div>
          )}

          {/* Botão principal */}
          <button
            onClick={
              mode === 'single'
                ? handleSubmit
                : mode === 'batch'
                ? handleBatchSubmit
                : handleImportSubmit
            }
            disabled={
              loading ||
              (mode === 'batch' && batchPreview.length === 0) ||
              (mode === 'import' && importedData.length === 0)
            }
            className="w-full bg-zinc-900 text-white py-2 rounded-xl text-sm hover:bg-zinc-800 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading
              ? mode === 'import'
                ? 'A importar...'
                : mode === 'batch'
                ? 'A criar...'
                : 'A guardar...'
              : mode === 'import'
              ? `Importar ${importedData.length} unidades`
              : mode === 'batch'
              ? `Criar ${batchPreview.length} unidades`
              : unidade
              ? 'Atualizar Unidade'
              : 'Criar Unidade'}
          </button>
        </div>
      </div>
    </div>
  );
}