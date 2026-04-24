'use client';

import { useRef, useState } from 'react';
import { Paperclip, X, Loader2, FileText, CheckCircle2 } from 'lucide-react';

export interface UploadedDoc {
  nome: string;
  tipo: string;
  url: string;
  tamanho: number;
}

interface Props {
  folder: string;
  onUploaded: (docs: UploadedDoc[]) => void;
  maxFiles?: number;
  accept?: string;
}

const TIPOS_DOC = [
  'BI / Passaporte',
  'Contrato',
  'Comprovativo de Residência',
  'Comprovativo de Pagamento',
  'Outro',
];

export default function DocumentUploader({ folder, onUploaded, maxFiles = 5, accept = '*' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs]       = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tipoMap, setTipoMap] = useState<Record<string, string>>({});

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (docs.length + files.length > maxFiles) {
      alert(`Máximo de ${maxFiles} documentos.`);
      return;
    }

    setUploading(true);
    const novos: UploadedDoc[] = [];

    for (const file of Array.from(files)) {
      try {
        const res = await fetch('/api/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileType: file.type, folder }),
        });
        const { uploadUrl, publicUrl } = await res.json();

        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        novos.push({ nome: file.name, tipo: tipoMap[file.name] ?? 'Outro', url: publicUrl, tamanho: file.size });
      } catch {
        console.error('Erro ao fazer upload de', file.name);
      }
    }

    const updated = [...docs, ...novos];
    setDocs(updated);
    onUploaded(updated);
    setUploading(false);
  };

  const remove = (url: string) => {
    const updated = docs.filter(d => d.url !== url);
    setDocs(updated);
    onUploaded(updated);
  };

  const setTipo = (nome: string, tipo: string) => {
    setTipoMap(prev => ({ ...prev, [nome]: tipo }));
    setDocs(prev => prev.map(d => d.nome === nome ? { ...d, tipo } : d));
    onUploaded(docs.map(d => d.nome === nome ? { ...d, tipo } : d));
  };

  return (
    <div className="space-y-3">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className="border-2 border-dashed border-zinc-200 rounded-xl p-4 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-colors"
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
            <Loader2 size={16} className="animate-spin text-orange-500" />
            A fazer upload...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Paperclip size={20} className="text-zinc-400" />
            <p className="text-sm text-zinc-500">Clique para anexar documentos</p>
            <p className="text-xs text-zinc-400">PDF, imagens, Word — máx. {maxFiles} ficheiros</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map(d => (
            <div key={d.url} className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <FileText size={16} className="text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-800 truncate">{d.nome}</p>
                <select
                  value={d.tipo}
                  onChange={e => setTipo(d.nome, e.target.value)}
                  className="mt-1 text-xs border border-zinc-200 rounded-lg px-2 py-1 bg-white w-full"
                >
                  {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <button onClick={() => remove(d.url)} className="text-zinc-400 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
