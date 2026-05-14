'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/permissionMatrix';
import {
  getAvisos, createAviso, deleteAviso, toggleFixarAviso,
  TIPOS_AVISO, type Aviso, type TipoAviso, type PrioridadeAviso,
} from '@/lib/firebase/comunicacao';
import {
  Bell, Plus, Trash2, Pin, PinOff, X, Loader2,
  Search, RefreshCw, Megaphone, AlertTriangle,
  MessageCircle, Send, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const PRIORIDADE_CFG: Record<PrioridadeAviso, { label: string; cls: string }> = {
  normal:  { label: 'Normal',  cls: 'bg-zinc-100 text-zinc-600'       },
  alta:    { label: 'Alta',    cls: 'bg-amber-50 text-amber-700'      },
  urgente: { label: 'Urgente', cls: 'bg-red-50 text-red-700 font-bold' },
};

// ─── Modal de novo aviso ──────────────────────────────────────────────────────

interface ModalProps {
  condominioId: string;
  condominioNome: string;
  autorId: string;
  autorNome: string;
  autorRole: string;
  onClose: () => void;
  onSuccess: () => void;
}

function NovoAvisoModal({ condominioId, condominioNome, autorId, autorNome, autorRole, onClose, onSuccess }: ModalProps) {
  const [saving, setSaving]           = useState(false);
  const [enviandoWA, setEnviandoWA]   = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    conteudo: '',
    tipo: 'geral' as TipoAviso,
    prioridade: 'normal' as PrioridadeAviso,
    fixado: false,
    notificarWhatsApp: false,
  });

  const set = (k: keyof typeof form) => (v: any) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.titulo.trim()) { toast.warning('Título obrigatório.'); return; }
    if (!form.conteudo.trim()) { toast.warning('Conteúdo obrigatório.'); return; }
    setSaving(true);
    try {
      await createAviso({
        condominioId,
        titulo:    form.titulo.trim(),
        conteudo:  form.conteudo.trim(),
        tipo:      form.tipo,
        prioridade: form.prioridade,
        fixado:    form.fixado,
        autorId,
        autorNome,
        autorRole,
      });

      // Enviar via WhatsApp/SMS se solicitado
      if (form.notificarWhatsApp) {
        setEnviandoWA(true);
        try {
          const res = await fetch('/api/notificacoes/enviar', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo:           form.prioridade === 'urgente' ? 'aviso_urgente' : 'aviso_geral',
              condominioId,
              condominioNome,
              titulo:         form.titulo.trim(),
              conteudo:       form.conteudo.trim(),
              urgente:        form.prioridade === 'urgente',
              destinatarios:  'todos',
              actorId:        autorId,
              actorNome:      autorNome,
              actorRole:      autorRole,
            }),
          });
          const data = await res.json();
          if (data.sucesso) {
            toast.success(`Aviso publicado e enviado via WhatsApp/SMS para ${data.enviados} morador(es).`);
          } else {
            toast.success('Aviso publicado.');
            toast.warning(`Notificações: ${data.falhados ?? 0} falharam. Verifica a configuração do Twilio.`);
          }
        } catch {
          toast.success('Aviso publicado.');
          toast.warning('Não foi possível enviar as notificações WhatsApp/SMS.');
        } finally {
          setEnviandoWA(false);
        }
      } else {
        toast.success('Aviso publicado com sucesso.');
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao publicar aviso.');
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
            <Megaphone size={18} className="text-orange-500" /> Novo Aviso
          </h2>
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Título *</label>
            <input className={inputCls} placeholder="Ex: Manutenção do elevador amanhã" value={form.titulo} onChange={e => set('titulo')(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Conteúdo *</label>
            <textarea
              className={cn(inputCls, 'resize-none')}
              rows={4}
              placeholder="Escreve o conteúdo do aviso aqui..."
              value={form.conteudo}
              onChange={e => set('conteudo')(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tipo</label>
              <select className={inputCls} value={form.tipo} onChange={e => set('tipo')(e.target.value as TipoAviso)}>
                {TIPOS_AVISO.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Prioridade</label>
              <select className={inputCls} value={form.prioridade} onChange={e => set('prioridade')(e.target.value as PrioridadeAviso)}>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => set('fixado')(!form.fixado)}
              className={cn(
                'w-10 h-5 rounded-full transition-colors relative',
                form.fixado ? 'bg-orange-500' : 'bg-zinc-200',
              )}
            >
              <div className={cn(
                'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                form.fixado ? 'translate-x-5' : 'translate-x-0.5',
              )} />
            </div>
            <span className="text-sm text-zinc-700">Fixar no topo</span>
          </label>

          {/* Notificação WhatsApp/SMS */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => set('notificarWhatsApp')(!form.notificarWhatsApp)}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative shrink-0',
                  form.notificarWhatsApp ? 'bg-emerald-500' : 'bg-zinc-200',
                )}
              >
                <div className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  form.notificarWhatsApp ? 'translate-x-5' : 'translate-x-0.5',
                )} />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                  <MessageCircle size={14} /> Notificar via WhatsApp / SMS
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Envia este aviso para todos os moradores com telefone registado
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-zinc-100">
          <button onClick={onClose} disabled={saving || enviandoWA} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || enviandoWA} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
            {(saving || enviandoWA) && <Loader2 size={14} className="animate-spin" />}
            {enviandoWA ? 'A enviar...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de Aviso ────────────────────────────────────────────────────────────

function AvisoCard({
  aviso,
  canEdit,
  onDelete,
  onTogglePin,
}: {
  aviso: Aviso;
  canEdit: boolean;
  onDelete: (id: string, titulo: string) => void;
  onTogglePin: (id: string, fixado: boolean) => void;
}) {
  const tipoCfg = TIPOS_AVISO.find(t => t.value === aviso.tipo);
  const prioridadeCfg = PRIORIDADE_CFG[aviso.prioridade];

  return (
    <div className={cn(
      'bg-white border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md',
      aviso.fixado ? 'border-orange-200 ring-1 ring-orange-100' : 'border-zinc-200',
      aviso.prioridade === 'urgente' && 'border-red-200',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {aviso.fixado && <Pin size={14} className="text-orange-500 shrink-0 mt-0.5" />}
          <h3 className="text-sm font-bold text-zinc-900 leading-snug">{aviso.titulo}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {tipoCfg && (
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', tipoCfg.cor)}>
              {tipoCfg.label}
            </span>
          )}
          <span className={cn('text-xs px-2 py-0.5 rounded-full', prioridadeCfg.cls)}>
            {prioridadeCfg.label}
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap mb-4">
        {aviso.conteudo}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
        <div className="text-xs text-zinc-400">
          <span className="font-medium text-zinc-600">{aviso.autorNome}</span>
          {' · '}
          {formatDate(aviso.createdAt)}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onTogglePin(aviso.id, !aviso.fixado)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                aviso.fixado
                  ? 'text-orange-500 hover:bg-orange-50'
                  : 'text-zinc-400 hover:bg-zinc-100',
              )}
              title={aviso.fixado ? 'Desafixar' : 'Fixar no topo'}
            >
              {aviso.fixado ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
            <button
              onClick={() => onDelete(aviso.id, aviso.titulo)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function ComunicacaoPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData } = useAuthContext();
  const role = userData?.role;

  const podeCriar  = role ? can(role, 'create', 'condominio') : false;
  const podeEditar = role ? can(role, 'update', 'condominio') : false;

  const [avisos, setAvisos]       = useState<Aviso[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoAviso | 'todos'>('todos');
  const [showModal, setShowModal] = useState(false);
  const [condominioNome, setCondominioNome] = useState('');

  // Buscar nome do condomínio
  useEffect(() => {
    if (!condoId) return;
    getDoc(doc(db, 'condominios', condoId)).then(snap => {
      if (snap.exists()) setCondominioNome(snap.data().nome ?? '');
    });
  }, [condoId]);

  const fetchAvisos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAvisos(condoId);
      setAvisos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [condoId]);

  useEffect(() => { fetchAvisos(); }, [fetchAvisos]);

  const handleDelete = (id: string, titulo: string) => {
    toast(`Eliminar "${titulo}"?`, {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await deleteAviso(id);
            toast.success('Aviso eliminado.');
            fetchAvisos();
          } catch (e: any) {
            toast.error(e?.message ?? 'Erro ao eliminar.');
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  const handleTogglePin = async (id: string, fixado: boolean) => {
    try {
      await toggleFixarAviso(id, fixado);
      toast.success(fixado ? 'Aviso fixado.' : 'Aviso desafixado.');
      fetchAvisos();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao actualizar.');
    }
  };

  const filtered = avisos.filter(a => {
    const matchSearch = search === '' ||
      a.titulo.toLowerCase().includes(search.toLowerCase()) ||
      a.conteudo.toLowerCase().includes(search.toLowerCase());
    const matchTipo = tipoFiltro === 'todos' || a.tipo === tipoFiltro;
    return matchSearch && matchTipo;
  });

  const urgentes = avisos.filter(a => a.prioridade === 'urgente' && !a.fixado).length;

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-50 rounded-xl">
            <Bell size={20} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Comunicação</h1>
            <p className="text-sm text-zinc-500">Avisos e comunicados para os moradores</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAvisos} disabled={loading} className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition disabled:opacity-50">
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          </button>
          {podeCriar && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Plus size={16} /> Novo Aviso
            </button>
          )}
        </div>
      </div>

      {/* Alerta urgente */}
      {urgentes > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {urgentes} aviso{urgentes > 1 ? 's' : ''} urgente{urgentes > 1 ? 's' : ''} activo{urgentes > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-zinc-900">{avisos.length}</p>
          <p className="text-xs text-zinc-500 mt-1">Total</p>
        </div>
        <div className="bg-white border border-orange-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-orange-500">{avisos.filter(a => a.fixado).length}</p>
          <p className="text-xs text-zinc-500 mt-1">Fixados</p>
        </div>
        <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-red-500">{avisos.filter(a => a.prioridade === 'urgente').length}</p>
          <p className="text-xs text-zinc-500 mt-1">Urgentes</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-zinc-900">{avisos.filter(a => a.prioridade === 'alta').length}</p>
          <p className="text-xs text-zinc-500 mt-1">Alta Prioridade</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar avisos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTipoFiltro('todos')}
            className={cn(
              'px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors',
              tipoFiltro === 'todos' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
            )}
          >
            Todos
          </button>
          {TIPOS_AVISO.map(t => (
            <button
              key={t.value}
              onClick={() => setTipoFiltro(t.value)}
              className={cn(
                'px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors',
                tipoFiltro === t.value ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Bell size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum aviso encontrado</p>
          {podeCriar && <p className="text-xs mt-1 opacity-70">Clica em "Novo Aviso" para publicar</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(aviso => (
            <AvisoCard
              key={aviso.id}
              aviso={aviso}
              canEdit={podeEditar}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {showModal && userData && (
        <NovoAvisoModal
          condominioId={condoId}
          condominioNome={condominioNome}
          autorId={userData.uid}
          autorNome={userData.nome}
          autorRole={userData.role}
          onClose={() => setShowModal(false)}
          onSuccess={fetchAvisos}
        />
      )}
    </main>
  );
}
