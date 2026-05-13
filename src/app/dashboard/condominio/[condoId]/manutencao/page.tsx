'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  collection, query, where, getDocs, addDoc,
  serverTimestamp, doc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/permissionMatrix';
import {
  Wrench, Plus, Search, Clock, CheckCircle2, Loader2,
  CalendarDays, Building2, Phone, Mail, Trash2, X,
  RefreshCw, Users, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  status: 'pendente' | 'em_execucao' | 'concluida';
  prioridade: 'baixa' | 'media' | 'alta';
  dataAgendada?: any;
  fornecedorId?: string;
  fornecedorNome?: string;
  criadoEm?: any;
}

interface Fornecedor {
  id: string;
  nome: string;
  especialidade: string;
  telefone?: string;
  email?: string;
  notas?: string;
}

// ─── Configs ──────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  pendente:    { label: 'Pendente',    color: 'bg-amber-50 text-amber-600 border-amber-200'       },
  em_execucao: { label: 'Em Execução', color: 'bg-blue-50 text-blue-600 border-blue-200'          },
  concluida:   { label: 'Concluída',   color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};

const PRIORIDADE_MAP = {
  baixa: { label: 'Baixa', bar: 'bg-zinc-300',  text: 'text-zinc-500'  },
  media: { label: 'Média', bar: 'bg-amber-400', text: 'text-amber-600' },
  alta:  { label: 'Alta',  bar: 'bg-red-400',   text: 'text-red-600'   },
};

const ESPECIALIDADES = [
  'Electricidade', 'Canalização', 'Pintura', 'Carpintaria',
  'Elevadores', 'Jardim', 'Limpeza', 'Segurança', 'Outro',
];

type Tab = 'tarefas' | 'agenda' | 'fornecedores';

// ─── Modal Nova Tarefa ────────────────────────────────────────────────────────

function NovaTarefaModal({ condoId, fornecedores, onClose, onSuccess }: {
  condoId: string; fornecedores: Fornecedor[]; onClose: () => void; onSuccess: () => void;
}) {
  const { userData } = useAuthContext();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: '', descricao: '', prioridade: 'media' as Tarefa['prioridade'],
    dataAgendada: '', fornecedorId: '',
  });
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  const cls = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white';

  const handleSave = async () => {
    if (!form.titulo.trim()) { toast.warning('Título obrigatório.'); return; }
    setSaving(true);
    try {
      const forn = fornecedores.find(f => f.id === form.fornecedorId);
      await addDoc(collection(db, 'manutencao'), {
        condominioId:   condoId,
        titulo:         form.titulo.trim(),
        descricao:      form.descricao.trim() || null,
        prioridade:     form.prioridade,
        status:         'pendente',
        dataAgendada:   form.dataAgendada ? new Date(form.dataAgendada) : null,
        fornecedorId:   form.fornecedorId || null,
        fornecedorNome: forn?.nome ?? null,
        criadoPor:      userData?.uid ?? null,
        criadoEm:       serverTimestamp(),
      });
      toast.success('Tarefa criada.');
      onSuccess(); onClose();
    } catch { toast.error('Erro ao criar tarefa.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 shrink-0">
          <h2 className="font-semibold text-zinc-900 flex items-center gap-2">
            <Wrench size={16} className="text-orange-500" /> Nova Tarefa
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Título *</label>
            <input className={cls} placeholder="Ex: Reparar canalização Bloco A" value={form.titulo} onChange={e => set('titulo')(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Descrição</label>
            <textarea className={cn(cls, 'resize-none')} rows={3} placeholder="Detalhes da tarefa..." value={form.descricao} onChange={e => set('descricao')(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Prioridade</label>
              <select className={cls} value={form.prioridade} onChange={e => set('prioridade')(e.target.value)}>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Data Agendada</label>
              <input type="date" className={cls} value={form.dataAgendada} onChange={e => set('dataAgendada')(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Fornecedor (opcional)</label>
            <select className={cls} value={form.fornecedorId} onChange={e => set('fornecedorId')(e.target.value)}>
              <option value="">Sem fornecedor</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome} — {f.especialidade}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-zinc-100 shrink-0">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />} Criar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Novo Fornecedor ────────────────────────────────────────────────────

function NovoFornecedorModal({ condoId, onClose, onSuccess }: {
  condoId: string; onClose: () => void; onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: '', especialidade: 'Electricidade', telefone: '', email: '', notas: '' });
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  const cls = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white';

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.warning('Nome obrigatório.'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'fornecedores'), {
        condominioId:  condoId,
        nome:          form.nome.trim(),
        especialidade: form.especialidade,
        telefone:      form.telefone.trim() || null,
        email:         form.email.trim().toLowerCase() || null,
        notas:         form.notas.trim() || null,
        criadoEm:      serverTimestamp(),
      });
      toast.success('Fornecedor adicionado.');
      onSuccess(); onClose();
    } catch { toast.error('Erro ao adicionar fornecedor.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 shrink-0">
          <h2 className="font-semibold text-zinc-900 flex items-center gap-2">
            <Users size={16} className="text-blue-500" /> Novo Fornecedor
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nome / Empresa *</label>
            <input className={cls} placeholder="Ex: Electro Luanda Lda." value={form.nome} onChange={e => set('nome')(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Especialidade</label>
            <select className={cls} value={form.especialidade} onChange={e => set('especialidade')(e.target.value)}>
              {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Telefone</label>
              <input className={cls} placeholder="+244 9XX XXX XXX" value={form.telefone} onChange={e => set('telefone')(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</label>
              <input type="email" className={cls} placeholder="email@empresa.com" value={form.email} onChange={e => set('email')(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Notas</label>
            <textarea className={cn(cls, 'resize-none')} rows={2} placeholder="Observações, condições, etc." value={form.notas} onChange={e => set('notas')(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-zinc-100 shrink-0">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />} Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function ManutencaoPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData } = useAuthContext();
  const role = userData?.role;

  const podeCriar     = role ? can(role, 'create', 'manutencao') : false;
  const podeAtualizar = role ? can(role, 'update', 'manutencao') : false;

  const [tab, setTab]                   = useState<Tab>('tarefas');
  const [tarefas, setTarefas]           = useState<Tarefa[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filtro, setFiltro]             = useState<'todos' | Tarefa['status']>('todos');
  const [showNovaTarefa, setShowNovaTarefa]         = useState(false);
  const [showNovoFornecedor, setShowNovoFornecedor] = useState(false);
  const [expandedForn, setExpandedForn]             = useState<string | null>(null);

  const fetchTarefas = useCallback(async () => {
    if (!condoId) return;
    const q = query(collection(db, 'manutencao'), where('condominioId', '==', condoId));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Tarefa));
    data.sort((a, b) => {
      const po: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
      return (po[a.prioridade] ?? 1) - (po[b.prioridade] ?? 1);
    });
    setTarefas(data);
  }, [condoId]);

  const fetchFornecedores = useCallback(async () => {
    if (!condoId) return;
    const q = query(collection(db, 'fornecedores'), where('condominioId', '==', condoId));
    const snap = await getDocs(q);
    setFornecedores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Fornecedor)));
  }, [condoId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTarefas(), fetchFornecedores()]);
    setLoading(false);
  }, [fetchTarefas, fetchFornecedores]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAvancar = async (t: Tarefa) => {
    if (!podeAtualizar) return;
    const next: Record<Tarefa['status'], Tarefa['status'] | null> = {
      pendente: 'em_execucao', em_execucao: 'concluida', concluida: null,
    };
    const novoStatus = next[t.status];
    if (!novoStatus) return;
    try {
      await updateDoc(doc(db, 'manutencao', t.id), { status: novoStatus, updatedAt: serverTimestamp() });
      toast.success(`Marcada como "${STATUS_MAP[novoStatus].label}".`);
      fetchTarefas();
    } catch { toast.error('Erro ao actualizar.'); }
  };

  const handleDeleteTarefa = (id: string) => {
    toast('Eliminar tarefa?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          await deleteDoc(doc(db, 'manutencao', id));
          toast.success('Eliminada.');
          fetchTarefas();
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 5000,
    });
  };

  const handleDeleteFornecedor = (id: string) => {
    toast('Eliminar fornecedor?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          await deleteDoc(doc(db, 'fornecedores', id));
          toast.success('Eliminado.');
          fetchFornecedores();
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 5000,
    });
  };

  const counts = {
    pendente:    tarefas.filter(t => t.status === 'pendente').length,
    em_execucao: tarefas.filter(t => t.status === 'em_execucao').length,
    concluida:   tarefas.filter(t => t.status === 'concluida').length,
  };

  const agenda = tarefas
    .filter(t => t.dataAgendada && t.status !== 'concluida')
    .sort((a, b) => {
      const da = a.dataAgendada?.toDate?.() ?? new Date(a.dataAgendada);
      const db_ = b.dataAgendada?.toDate?.() ?? new Date(b.dataAgendada);
      return new Date(da).getTime() - new Date(db_).getTime();
    });

  const filteredTarefas = tarefas.filter(t => {
    const ms = search === '' || t.titulo.toLowerCase().includes(search.toLowerCase());
    const mf = filtro === 'todos' || t.status === filtro;
    return ms && mf;
  });

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isOverdue = (ts: any) => {
    if (!ts) return false;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d < new Date();
  };

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-50 rounded-xl">
            <Wrench size={20} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Manutenção</h1>
            <p className="text-sm text-zinc-500">Tarefas, agenda de serviços e fornecedores</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} disabled={loading} className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition disabled:opacity-50">
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} />
          </button>
          {podeCriar && tab === 'fornecedores' && (
            <button onClick={() => setShowNovoFornecedor(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition shadow-sm">
              <Plus size={16} /> Novo Fornecedor
            </button>
          )}
          {podeCriar && tab !== 'fornecedores' && (
            <button onClick={() => setShowNovaTarefa(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition shadow-sm">
              <Plus size={16} /> Nova Tarefa
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'pendente',    label: 'Pendentes',   icon: <Clock size={16} className="text-amber-500" />,          value: counts.pendente    },
          { key: 'em_execucao', label: 'Em Execução', icon: <Wrench size={16} className="text-blue-500" />,          value: counts.em_execucao },
          { key: 'concluida',   label: 'Concluídas',  icon: <CheckCircle2 size={16} className="text-emerald-500" />, value: counts.concluida   },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => { setTab('tarefas'); setFiltro(filtro === item.key ? 'todos' : item.key as Tarefa['status']); }}
            className={cn(
              'bg-white border rounded-2xl p-4 shadow-sm text-center transition-all hover:shadow-md',
              filtro === item.key && tab === 'tarefas' ? 'border-orange-300 ring-2 ring-orange-100' : 'border-zinc-200',
            )}
          >
            <div className="flex justify-center mb-1">{item.icon}</div>
            <p className="text-xl font-bold text-zinc-900">{item.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{item.label}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        {([
          { key: 'tarefas',      label: 'Tarefas'                               },
          { key: 'agenda',       label: `Agenda (${agenda.length})`             },
          { key: 'fornecedores', label: `Fornecedores (${fornecedores.length})` },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === t.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB TAREFAS ── */}
      {tab === 'tarefas' && (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Pesquisar tarefas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : filteredTarefas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <Wrench size={36} className="mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhuma tarefa encontrada</p>
              {podeCriar && <p className="text-xs mt-1">Clica em &quot;Nova Tarefa&quot; para começar.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTarefas.map(t => {
                const st = STATUS_MAP[t.status];
                const pr = PRIORIDADE_MAP[t.prioridade];
                const overdue = t.dataAgendada && t.status !== 'concluida' && isOverdue(t.dataAgendada);
                const nextLabel: Record<Tarefa['status'], string | null> = {
                  pendente: 'Iniciar', em_execucao: 'Concluir', concluida: null,
                };
                return (
                  <div key={t.id} className={cn(
                    'bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all',
                    overdue ? 'border-red-200' : 'border-zinc-200',
                  )}>
                    <div className={cn('h-0.5 w-full rounded-full mb-3', pr.bar)} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-zinc-900 text-sm">{t.titulo}</p>
                          <span className={cn('text-xs font-bold', pr.text)}>● {pr.label}</span>
                          {overdue && (
                            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              Atrasada
                            </span>
                          )}
                        </div>
                        {t.descricao && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.descricao}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-400">
                          {t.dataAgendada && (
                            <span className="flex items-center gap-1">
                              <CalendarDays size={11} />{formatDate(t.dataAgendada)}
                            </span>
                          )}
                          {t.fornecedorNome && (
                            <span className="flex items-center gap-1">
                              <Building2 size={11} />{t.fornecedorNome}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {podeAtualizar && nextLabel[t.status] && (
                          <button
                            onClick={() => handleAvancar(t)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors"
                          >
                            {nextLabel[t.status]}
                          </button>
                        )}
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold border', st.color)}>
                          {st.label}
                        </span>
                        {podeCriar && (
                          <button
                            onClick={() => handleDeleteTarefa(t.id)}
                            className="p-1 text-zinc-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── TAB AGENDA ── */}
      {tab === 'agenda' && (
        agenda.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <CalendarDays size={36} className="mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhum serviço agendado</p>
            <p className="text-xs mt-1 opacity-70">Cria uma tarefa com data agendada para aparecer aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agenda.map(t => {
              const pr = PRIORIDADE_MAP[t.prioridade];
              const overdue = isOverdue(t.dataAgendada);
              const st = STATUS_MAP[t.status];
              const d = t.dataAgendada?.toDate ? t.dataAgendada.toDate() : new Date(t.dataAgendada);
              return (
                <div key={t.id} className={cn(
                  'bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-4',
                  overdue ? 'border-red-200 bg-red-50/30' : 'border-zinc-200',
                )}>
                  <div className={cn(
                    'shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border',
                    overdue
                      ? 'bg-red-100 border-red-200 text-red-700'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700',
                  )}>
                    <span className="text-lg font-black leading-none">{d.getDate()}</span>
                    <span className="text-xs font-semibold uppercase">
                      {d.toLocaleDateString('pt-PT', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 text-sm">{t.titulo}</p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-zinc-400">
                      <span className={cn('font-bold', pr.text)}>● {pr.label}</span>
                      {t.fornecedorNome && (
                        <span className="flex items-center gap-1">
                          <Building2 size={10} />{t.fornecedorNome}
                        </span>
                      )}
                      {overdue && <span className="text-red-600 font-semibold">Atrasada</span>}
                    </div>
                  </div>
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0', st.color)}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── TAB FORNECEDORES ── */}
      {tab === 'fornecedores' && (
        loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : fornecedores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Users size={36} className="mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhum fornecedor registado</p>
            {podeCriar && <p className="text-xs mt-1">Clica em &quot;Novo Fornecedor&quot; para adicionar.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {fornecedores.map(f => {
              const isExp = expandedForn === f.id;
              const tarefasAtivas = tarefas.filter(t => t.fornecedorId === f.id && t.status !== 'concluida');
              return (
                <div key={f.id} className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                      {f.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-zinc-900 text-sm">{f.nome}</p>
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 font-semibold">
                          {f.especialidade}
                        </span>
                        {tarefasAtivas.length > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full border border-orange-200 font-semibold">
                            {tarefasAtivas.length} tarefa{tarefasAtivas.length !== 1 ? 's' : ''} activa{tarefasAtivas.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-zinc-400">
                        {f.telefone && (
                          <span className="flex items-center gap-1"><Phone size={10} />{f.telefone}</span>
                        )}
                        {f.email && (
                          <span className="flex items-center gap-1"><Mail size={10} />{f.email}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setExpandedForn(isExp ? null : f.id)}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"
                      >
                        {isExp ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                      {podeCriar && (
                        <button
                          onClick={() => handleDeleteFornecedor(f.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isExp && (
                    <div className="px-4 pb-4 border-t border-zinc-100 pt-3 space-y-3">
                      {f.notas && (
                        <p className="text-xs text-zinc-500 bg-zinc-50 rounded-lg p-3">{f.notas}</p>
                      )}
                      {tarefasAtivas.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Tarefas activas
                          </p>
                          {tarefasAtivas.map(t => (
                            <div key={t.id} className="flex items-center justify-between gap-2 text-xs bg-zinc-50 rounded-lg px-3 py-2">
                              <span className="font-medium text-zinc-700 truncate">{t.titulo}</span>
                              <span className={cn('px-2 py-0.5 rounded-full font-semibold border shrink-0', STATUS_MAP[t.status].color)}>
                                {STATUS_MAP[t.status].label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Modais */}
      {showNovaTarefa && (
        <NovaTarefaModal
          condoId={condoId}
          fornecedores={fornecedores}
          onClose={() => setShowNovaTarefa(false)}
          onSuccess={fetchTarefas}
        />
      )}
      {showNovoFornecedor && (
        <NovoFornecedorModal
          condoId={condoId}
          onClose={() => setShowNovoFornecedor(false)}
          onSuccess={fetchFornecedores}
        />
      )}
    </main>
  );
}
