'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { criarOcorrencia, getComentarios, addComentario, type Comentario } from '@/lib/firebase/ocorrencias';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Plus, X, Loader2, Bell, MessageSquare,
  Paperclip, Send, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Ocorrencia {
  id: string;
  titulo: string;
  descricao?: string;
  status: string;
  prioridade: 'baixa' | 'media' | 'alta';
  categoria: string;
  createdAt?: any;
  ultimoComentario?: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  aberta:      { label: 'Aberta',       cls: 'bg-red-50 text-red-600 border-red-200'           },
  delegada:    { label: 'Delegada',     cls: 'bg-amber-50 text-amber-600 border-amber-200'     },
  em_execucao: { label: 'Em Execução',  cls: 'bg-blue-50 text-blue-600 border-blue-200'        },
  concluida:   { label: 'Concluída',    cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  encerrada:   { label: 'Encerrada',    cls: 'bg-zinc-100 text-zinc-500 border-zinc-200'       },
};

// ─── Modal nova ocorrência ────────────────────────────────────────────────────

function NovaOcorrenciaModal({
  onClose, onSave, saving,
}: {
  onClose: () => void;
  saving: boolean;
  onSave: (data: { titulo: string; descricao: string; categoria: string; prioridade: 'baixa' | 'media' | 'alta' }) => void;
}) {
  const [form, setForm] = useState({
    titulo: '', descricao: '', categoria: 'Barulho', prioridade: 'media' as 'baixa' | 'media' | 'alta',
  });

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
            <Bell size={16} className="text-orange-500" /> Nova Ocorrência
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><X size={16} /></button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Título *</label>
          <input className={inputCls} placeholder="Ex: Barulho no corredor" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Descrição</label>
          <textarea className={cn(inputCls, 'resize-none')} rows={3} placeholder="Descreve o problema com mais detalhe..." value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Categoria</label>
            <select className={inputCls} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
              {['Barulho', 'Limpeza', 'Segurança', 'Manutenção', 'Outro'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Prioridade</label>
            <select className={inputCls} value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as 'baixa' | 'media' | 'alta' }))}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2.5 text-sm border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
          <button
            onClick={() => form.titulo && onSave(form)}
            disabled={!form.titulo || saving}
            className="px-4 py-2.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Registar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Secção de comentários inline ────────────────────────────────────────────

function ComentariosSection({ ocorrenciaId, userData }: { ocorrenciaId: string; userData: any }) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading]         = useState(true);
  const [texto, setTexto]             = useState('');
  const [sending, setSending]         = useState(false);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [anexosPendentes, setAnexosPendentes] = useState<{ url: string; nome: string; tipo: string }[]>([]);

  const fetchComents = useCallback(async () => {
    setLoading(true);
    try { setComentarios(await getComentarios(ocorrenciaId)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [ocorrenciaId]);

  useEffect(() => { fetchComents(); }, [fetchComents]);

  const handleAnexo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Ficheiro máx. 10MB.'); return; }
    setUploadingAnexo(true);
    try {
      const res = await window.fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      if (!res.ok) throw new Error('Falha no upload.');
      const { uploadUrl, publicUrl } = await res.json();
      await window.fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setAnexosPendentes(prev => [...prev, { url: publicUrl, nome: file.name, tipo: file.type }]);
      toast.success('Ficheiro anexado.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro no upload.');
    } finally {
      setUploadingAnexo(false);
      e.target.value = '';
    }
  };

  const handleEnviar = async () => {
    if (!texto.trim() && anexosPendentes.length === 0) return;
    if (!userData) return;
    setSending(true);
    try {
      await addComentario(
        ocorrenciaId,
        { id: userData.uid, nome: userData.nome, role: userData.role },
        texto.trim() || '(anexo)',
        anexosPendentes.length > 0 ? anexosPendentes : undefined,
      );
      setTexto('');
      setAnexosPendentes([]);
      fetchComents();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao enviar.');
    } finally {
      setSending(false);
    }
  };

  const formatTs = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="border-t border-zinc-100 pt-3 space-y-3">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
        <MessageSquare size={12} /> Comentários {comentarios.length > 0 && `(${comentarios.length})`}
      </p>

      {loading ? (
        <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-zinc-300" /></div>
      ) : comentarios.length === 0 ? (
        <p className="text-xs text-zinc-400 text-center py-2">Sem comentários ainda</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {comentarios.map(c => {
            const isMe = c.autorId === userData?.uid;
            return (
              <div key={c.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  isMe ? 'bg-orange-100 text-orange-600' : 'bg-zinc-100 text-zinc-600',
                )}>
                  {c.autorNome.charAt(0).toUpperCase()}
                </div>
                <div className={cn('max-w-[80%]', isMe && 'items-end flex flex-col')}>
                  <div className={cn(
                    'px-3 py-2 rounded-2xl text-xs leading-relaxed',
                    isMe ? 'bg-orange-500 text-white rounded-tr-sm' : 'bg-zinc-100 text-zinc-800 rounded-tl-sm',
                  )}>
                    {c.texto !== '(anexo)' && <p>{c.texto}</p>}
                    {c.anexos && c.anexos.length > 0 && c.anexos.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                        className={cn('flex items-center gap-1 underline mt-1', isMe ? 'text-orange-100' : 'text-blue-600')}>
                        <Paperclip size={10} />{a.nome}
                      </a>
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-0.5 px-1">{formatTs(c.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Anexos pendentes */}
      {anexosPendentes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {anexosPendentes.map((a, i) => (
            <div key={i} className="flex items-center gap-1 px-2 py-1 bg-zinc-100 rounded-lg text-xs text-zinc-700">
              <Paperclip size={10} />
              <span className="max-w-[100px] truncate">{a.nome}</span>
              <button onClick={() => setAnexosPendentes(prev => prev.filter((_, idx) => idx !== i))} className="text-zinc-400 hover:text-red-500">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <label className={cn('p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 cursor-pointer shrink-0', uploadingAnexo && 'opacity-50')}>
          {uploadingAnexo ? <Loader2 size={14} className="animate-spin text-zinc-400" /> : <Paperclip size={14} className="text-zinc-400" />}
          <input type="file" className="hidden" onChange={handleAnexo} disabled={uploadingAnexo} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
        </label>
        <input
          type="text"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar(); } }}
          placeholder="Adicionar comentário..."
          className="flex-1 px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        />
        <button
          onClick={handleEnviar}
          disabled={sending || (!texto.trim() && anexosPendentes.length === 0)}
          className="p-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50 shrink-0"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}

// ─── Card de ocorrência ───────────────────────────────────────────────────────

function OcorrenciaCard({ o, userData }: { o: Ocorrencia; userData: any }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_MAP[o.status] ?? STATUS_MAP.aberta;

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className={cn(
      'bg-white border rounded-2xl shadow-sm overflow-hidden transition-all',
      o.prioridade === 'alta' ? 'border-red-200' : 'border-zinc-200',
    )}>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-zinc-900">{o.titulo}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{o.categoria} · {formatDate(o.createdAt)}</p>
          </div>
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0', statusCfg.cls)}>
            {statusCfg.label}
          </span>
        </div>

        {o.descricao && (
          <p className="text-xs text-zinc-600 leading-relaxed">{o.descricao}</p>
        )}

        {o.ultimoComentario && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-50 rounded-lg px-2 py-1.5">
            <MessageSquare size={11} />
            <span className="truncate">{o.ultimoComentario}</span>
          </div>
        )}

        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-600 font-semibold transition-colors"
        >
          <MessageSquare size={12} />
          {expanded ? 'Fechar comentários' : 'Ver comentários'}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          <ComentariosSection ocorrenciaId={o.id} userData={userData} />
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function OcorrenciasMoradorPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData, loading: authLoading } = useAuthContext();

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [saving, setSaving]           = useState(false);

  const unidadeId     = userData?.unidadeId;
  const unidadeNumero = userData?.unidadeNumero;
  const bloco         = userData?.bloco;

  const fetchOcorrencias = useCallback(async () => {
    if (!userData?.uid) return;
    try {
      const snap = await getDocs(query(
        collection(db, 'ocorrencias'),
        where('condominioId', '==', condoId),
        where('criadoPor', '==', userData.uid),
      ));
      setOcorrencias(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ocorrencia)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [condoId, userData?.uid]);

  useEffect(() => {
    if (authLoading || !condoId || !userData?.uid) return;
    fetchOcorrencias();
  }, [condoId, userData?.uid, authLoading, fetchOcorrencias]);

  const handleSave = async (data: { titulo: string; descricao: string; categoria: string; prioridade: 'baixa' | 'media' | 'alta' }) => {
    if (!userData?.uid || !unidadeId || !unidadeNumero) return;
    setSaving(true);
    try {
      await criarOcorrencia({
        condominioId: condoId, unidadeId, unidadeNumero,
        bloco: bloco ?? '', criadoPor: userData.uid, criadoPorNome: userData.nome,
        titulo: data.titulo, descricao: data.descricao,
        categoria: data.categoria, prioridade: data.prioridade,
      });
      toast.success('Ocorrência registada com sucesso.');
      setShowModal(false);
      fetchOcorrencias();
    } catch (e) {
      toast.error('Erro ao registar ocorrência.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading)
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-500">
      {showModal && <NovaOcorrenciaModal onClose={() => setShowModal(false)} onSave={handleSave} saving={saving} />}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-xl"><Bell size={20} className="text-orange-500" /></div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Minhas Ocorrências</h1>
            <p className="text-sm text-zinc-500">{ocorrencias.length} registo{ocorrencias.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus size={16} /> Nova
        </button>
      </div>

      {ocorrencias.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Bell size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhuma ocorrência registada</p>
          <p className="text-xs mt-1">Clica em "Nova" para reportar um problema</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ocorrencias.map(o => (
            <OcorrenciaCard key={o.id} o={o} userData={userData} />
          ))}
        </div>
      )}
    </main>
  );
}
