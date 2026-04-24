'use client';

import { Upload, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { UnidadeInput } from '@/lib/firebase/unidades';
import { StatusType } from './index';

interface Props {
  importedData: UnidadeInput[];
  setImportedData: React.Dispatch<React.SetStateAction<UnidadeInput[]>>;
  importErrors: string[];
  setImportErrors: React.Dispatch<React.SetStateAction<string[]>>;
  loading: boolean;
}

export default function ModoImport({
  importedData,
  setImportedData,
  importErrors,
  setImportErrors,
  loading,
}: Props) {

  const downloadTemplate = () => {
    const csv =
      'numero,bloco,tipo,area,fracao,permilagem,status,observacoes\n' +
      '101,A,T1,50,1,10,vaga,\n' +
      '102,A,T2,75,2,15,vaga,';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'template_unidades.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Resetar estado anterior
    setImportedData([]);
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());

        if (lines.length < 2) {
          setImportErrors(['O ficheiro está vazio ou não tem dados além do cabeçalho.']);
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const data: UnidadeInput[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((header, idx) => { row[header] = values[idx] ?? ''; });

          if (!row['numero']) {
            errors.push(`Linha ${i + 1}: campo "numero" é obrigatório`);
            continue;
          }

          data.push({
            numero:     row['numero'],
            bloco:      row['bloco']      || undefined,
            tipo:       row['tipo']       || 'T1',
            area:       row['area']       ? Number(row['area'])       : undefined,
            fracao:     row['fracao']     ? Number(row['fracao'])     : undefined,
            permilagem: row['permilagem'] ? Number(row['permilagem']) : undefined,
            status:     (row['status'] as StatusType) || 'vaga',
            observacoes: row['observacoes'] || undefined,
          });
        }

        setImportedData(data);
        setImportErrors(errors);
      } catch {
        setImportErrors(['Erro ao processar ficheiro CSV. Verifique o formato.']);
      }
    };
    reader.readAsText(file);

    // Limpar input para permitir re-upload do mesmo ficheiro
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Formato esperado:</strong>{' '}
        <code className="text-xs bg-blue-100 px-1 py-0.5 rounded">
          numero, bloco, tipo, area, fracao, permilagem, status, observacoes
        </code>
        <br />
        <span className="text-xs mt-1 block">O campo <strong>numero</strong> é obrigatório. Os restantes são opcionais.</span>
      </div>

      {/* Download template */}
      <button
        onClick={downloadTemplate}
        disabled={loading}
        className="w-full border-2 border-dashed border-zinc-300 rounded-xl py-3 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 transition flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <FileSpreadsheet size={16} />
        Baixar template CSV
      </button>

      {/* Upload */}
      <div>
        <input
          type="file"
          accept=".csv"
          id="csv-upload"
          onChange={handleFileUpload}
          disabled={loading}
          className="hidden"
        />
        <label
          htmlFor="csv-upload"
          className={`w-full border-2 border-dashed border-zinc-300 rounded-xl py-8 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 transition flex flex-col items-center justify-center gap-2 ${
            loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <Upload size={24} />
          <span>Clique para selecionar ficheiro CSV</span>
        </label>
      </div>

      {/* Resultado sucesso */}
      {importedData.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-900 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-green-600" />
            {importedData.length} unidade{importedData.length !== 1 ? 's' : ''} pronta{importedData.length !== 1 ? 's' : ''} para importar
          </p>
          {importErrors.length > 0 && (
            <p className="text-xs text-green-700 mt-1">
              ({importErrors.length} linha{importErrors.length !== 1 ? 's' : ''} ignorada{importErrors.length !== 1 ? 's' : ''} por erros)
            </p>
          )}
        </div>
      )}

      {/* Erros */}
      {importErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-900 mb-2">
            {importErrors.length} erro{importErrors.length !== 1 ? 's' : ''} encontrado{importErrors.length !== 1 ? 's' : ''}:
          </p>
          <ul className="text-xs text-red-800 space-y-1 max-h-32 overflow-y-auto">
            {importErrors.map((err, idx) => (
              <li key={idx}>• {err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}