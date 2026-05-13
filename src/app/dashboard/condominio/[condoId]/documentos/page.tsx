'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/permissionMatrix';
import {
  getDocumentos, createDocumento, deleteDocumento,
  CATEGORIAS_DOCUMENTO, type Documento, type CategoriaDocumento,
} from '@/lib/firebase/documentos';
import {
  FileText, Plus, Trash2, X, Loader2, Search,
  RefreshCw, Download, Upload, FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType?: string): string {
  if (!fileType) return '📄';
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('word') || fileType.includes('doc')) return '📘';
  if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv')) return '📗';
  if (fileType.includes('image')) return '🖼️';
  return '📄';
}

// ─── Modal de upload ──────────────────────────────────────────────────────────

interface ModalProps {
  condominioId: string;
  autorId: string;
  autorNome: string;
  onClose: () => void;
  onSuccess: () => void;
}

function UploadDocumentoModal({ condominioId, autorId, autorNome, onClose, onSuccess }: ModalProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    categoria: 'outro' as CategoriaDocumento,
    fileUrl: '',
    fileName: '',
    fileSize: 0,
    fileType: '',
  });

  const set = (k: keyof typeof form) => (v: any) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Ficheiro demasiado grande. Máximo 20MB.');
      return;
    }

    setUploading(true);
    try {
      // Obter URL de upload pré-assinada
      const res = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });

      if (!res.ok) throw new Error('Falha ao obter URL de upload.');
      const { uploadUrl, publicUrl } = await res.json();

      // Upload para S3/R2
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      setForm(prev => ({
        ...prev,
        fileUrl: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        titulo: prev.titulo || file.name.replace(/\.[^/.]+$/, ''),
      }));
      toast.success('Ficheiro carregado com sucesso.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao carregar ficheiro.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) { toast.warning('Título obrigatório.'); return; }
    if (!form.fileUrl) { toast.warning('Carrega um ficheiro primeiro.'); return; }
    setSaving(true);
    try {
      await createDocumento({
        condominioId,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || undefined,
        categoria: form.categoria,
        fileUrl: form.fileUrl,
        fileName: form.fileName,
        fileSize: form.fileSize,
        fileType: form.fileType,
        autorId,
        autorNome,
      });
      toast.success('Documento guardado com sucesso.');
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao guardar documento.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900 flex items-center gap-2">
            <Upload size={18} className="text-orange-500" /> Adicionar Documento
          </h2>
          <button onClick={onClose} disabled={saving || uploading} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Upload de ficheiro */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Ficheiro *</label>
            {form.fileUrl ? (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-2xl">{getFileIcon(form.fileType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{form.fileName}</p>
                  <p className="text-xs text-zinc-500">{formatFileSize(form.fileSize)}</p>
                </div>
                <button
                  onClick={() => setForm(prev => ({ ...prev, fileUrl: '', fileName: '', fileSize: 0, fileType: '' }))}
                  className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className={cn(
                'flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                uploading ? 'border-orange-300 bg-orange-50' : 'border-zinc-300 hover:border-orange-300 hover:bg-orange-50/30',
              )}>
                {uploading ? (
                  <><Loader2 size={24} className="animate-spin text-orange-500" /><span className="text-sm text-orange-600">A carregar...</span></>
                ) : (
                  <><Upload size={24} className="text-zinc-400" /><span className="text-sm text-zinc-500">Clica para seleccionar ficheiro</span><span className="text-xs text-zinc-400">PDF, Word, Excel, Imagens · Máx. 20MB</span></>
                )}
                <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" disabled={uploading} />
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Título *</label>
            <input className={inputCls} placeholder="Ex: Regulamento Interno 2024" value={form.titulo} onChange={e => set('titulo')(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Descrição</label>
            <textarea className={cn(inputCls, 'resize-none')} rows={2} placeholder="Breve descrição do documento (opcional)" value={form.descricao} onChange={e => set('descricao')(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Categoria</label>
            <select className={inputCls} value={form.categoria} onChange={e => set('categoria')(e.target.value as CategoriaDocumento)}>
              {CATEGORIAS_DOCUMENTO.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-zinc-100">
          <button onClick={onClose} disabled={saving || uploading} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || uploading || !form.fileUrl} className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de Documento ────────────────────────────────────────────────────────

function DocumentoCard({
  doc: documento,
  canEdit,
  onDelete,
}: {
  doc: Documento;
  canEdit: boolean;
  onDelete: (id: string, titulo: string) => void;
}) {
  const catCfg = CATEGORIAS_DOCUMENTO.find(c => c.value === documento.categoria);

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
      <div className="text-3xl shrink-0 mt-0.5">{getFileIcon(documento.fileType)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-zinc-900 truncate">{documento.titulo}</h3>
            {documento.descricao && (
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{documento.descricao}</p>
            )}
          </div>
          {catCfg && (
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full shrink-0', catCfg.cor)}>
              {catCfg.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
          <span>{documento.fileName}</span>
          {documento.fileSize && <span>· {formatFileSize(documento.fileSize)}</span>}
          <span>· {formatDate(documento.createdAt)}</span>
          <span>· {documento.autorNome}</span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <a
            href={documento.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <Download size={12} /> Descarregar
          </a>
          {canEdit && (
            <button
              onClick={() => onDelete(documento.id, documento.titulo)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function DocumentosPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData } = useAuthContext();
  const role = userData?.role;

  const podeCriar  = role ? can(role, 'create', 'documento') : false;
  const podeEditar = role ? can(role, 'update', 'documento') : false;

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [catFiltro, setCatFiltro]   = useState<CategoriaDocumento | 'todos'>('todos');
  const [showModal, setShowModal]   = useState(false);

  const fetchDocumentos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDocumentos(condoId);
      setDocumentos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [condoId]);

  useEffect(() => { fetchDocumentos(); }, [fetchDocumentos]);

  const handleDelete = (id: string, titulo: string) => {
    toast(`Eliminar "${titulo}"?`, {
      description: 'O ficheiro será removido permanentemente.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await deleteDocumento(id);
            toast.success('Documento eliminado.');
            fetchDocumentos();
          } catch (e: any) {
            toast.error(e?.message ?? 'Erro ao eliminar.');
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  const filtered = documentos.filter(d => {
    const matchSearch = search === '' ||
      d.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (d.descricao ?? '').toLowerCase().includes(search.toLowerCase()) ||
      d.fileName.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFiltro === 'todos' || d.categoria === catFiltro;
    return matchSearch && matchCat;
  });

  // Agrupar por categoria para exibição
  const porCategoria = CATEGORIAS_DOCUMENTO.map(cat => ({
    ...cat,
    docs: filtered.filter(d => d.categoria === cat.value),
  })).filter(g => g.docs.length > 0);

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <FolderOpen size={20} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Documentos & Regulamentos</h1>
            <p className="text-sm text-zinc-500">Repositório de documentos do condomínio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDocumentos} disabled={loading} className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition disabled:opacity-50">
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          </button>
          {podeCriar && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Plus size={16} /> Adicionar Documento
            </button>
          )}
        </div>
      </div>

      {/* KPIs por categoria */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CATEGORIAS_DOCUMENTO.map(cat => {
          const count = documentos.filter(d => d.categoria === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => setCatFiltro(catFiltro === cat.value ? 'todos' : cat.value)}
              className={cn(
                'bg-white border rounded-2xl p-3 shadow-sm text-center transition-all hover:shadow-md',
                catFiltro === cat.value ? 'border-orange-300 ring-2 ring-orange-100' : 'border-zinc-200',
              )}
            >
              <p className="text-xl font-bold text-zinc-900">{count}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{cat.label}</p>
            </button>
          );
        })}
      </div>

      {/* Pesquisa */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar documentos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <FolderOpen size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum documento encontrado</p>
          {podeCriar && <p className="text-xs mt-1 opacity-70">Clica em "Adicionar Documento" para começar</p>}
        </div>
      ) : catFiltro !== 'todos' ? (
        // Vista filtrada — lista simples
        <div className="space-y-3">
          {filtered.map(d => (
            <DocumentoCard key={d.id} doc={d} canEdit={podeEditar} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        // Vista global — agrupada por categoria
        <div className="space-y-8">
          {porCategoria.map(grupo => (
            <div key={grupo.value} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', grupo.cor)}>
                  {grupo.label}
                </span>
                <span className="text-xs text-zinc-400">{grupo.docs.length} documento{grupo.docs.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-3">
                {grupo.docs.map(d => (
                  <DocumentoCard key={d.id} doc={d} canEdit={podeEditar} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && userData && (
        <UploadDocumentoModal
          condominioId={condoId}
          autorId={userData.uid}
          autorNome={userData.nome}
          onClose={() => setShowModal(false)}
          onSuccess={fetchDocumentos}
        />
      )}
    </main>
  );
}
