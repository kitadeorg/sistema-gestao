'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/permissionMatrix';
import { Wrench, Plus, Search, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  status: 'pendente' | 'em_execucao' | 'concluida';
  prioridade: 'baixa' | 'media' | 'alta';
  criadoEm?: any;
}

const STATUS_MAP = {
  pendente:     { label: 'Pendente',     color: 'bg-amber-50 text-amber-600 border-amber-200' },
  em_execucao:  { label: 'Em Execução',  color: 'bg-blue-50 text-blue-600 border-blue-200' },
  concluida:    { label: 'Concluída',    color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};

const PRIORIDADE_MAP = {
  baixa:  { label: 'Baixa',  color: 'text-zinc-400' },
  media:  { label: 'Média',  color: 'text-amber-500' },
  alta:   { label: 'Alta',   color: 'text-red-500' },
};

export default function ManutencaoPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData } = useAuthContext();
  const role = userData?.role;

  const podeCriar = role ? can(role, 'create', 'manutencao') : false;

  const [tarefas,  setTarefas]  = useState<Tarefa[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filtro,   setFiltro]   = useState<'todos' | Tarefa['status']>('todos');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ titulo: '', descricao: '', prioridade: 'media' as Tarefa['prioridade'] });
  const [saving,   setSaving]   = useState(false);

  const fetchTarefas = async () => {
    if (!condoId) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'manutencao'), where('condominioId', '==', condoId));
      const snap = await getDocs(q);
      setTarefas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tarefa)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTarefas(); }, [condoId]);

  const handleCreate = async () => {
    if (!form.titulo.trim()) { toast.warning('O título é obrigatório.'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'manutencao'), {
        condominioId: condoId,
        titulo:       form.titulo.trim(),
        descricao:    form.descricao.trim() || null,
        prioridade:   form.prioridade,
        status:       'pendente',
        criadoPor:    userData?.uid ?? null,
        criadoEm:     serverTimestamp(),
      });
      toast.success('Tarefa criada com sucesso.');
      setForm({ titulo: '', descricao: '', prioridade: 'media' });
      setShowForm(false);
      fetchTarefas();
    } catch (e) {
      toast.error('Erro ao criar tarefa.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = tarefas.filter(t => {
    const matchSearch = t.titulo.toLowerCase().includes(search.toLowerCase());
    const matchFiltro = filtro === 'todos' || t.status === filtro;
    return matchSearch && matchFiltro;
  });

  const counts = {
    pendente:    tarefas.filter(t => t.status === 'pendente').length,
    em_execucao: tarefas.filter(t => t.status === 'em_execucao').length,
    concluida:   tarefas.filter(t => t.status === 'concluida').length,
  };

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wrench size={22} className="text-orange-500" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Manutenção</h1>
            <p className="text-sm text-zinc-500">Gestão de tarefas e ocorrências de manutenção</p>
          </div>
        </div>
        {podeCriar && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nova Tarefa
          </button>
        )}
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-zinc-900 text-sm">Nova Tarefa de Manutenção</h3>
          <input
            type="text"
            placeholder="Título da tarefa *"
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <textarea
            placeholder="Descrição (opcional)"
            value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
          />
          <div className="flex items-center gap-3">
            <select
              value={form.prioridade}
              onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as Tarefa['prioridade'] }))}
              className="px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="baixa">Prioridade Baixa</option>
              <option value="media">Prioridade Média</option>
              <option value="alta">Prioridade Alta</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Criar
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { key: 'pendente',    label: 'Pendentes',    icon: <Clock size={16} className="text-amber-500" />,     value: counts.pendente },
          { key: 'em_execucao', label: 'Em Execução',  icon: <Wrench size={16} className="text-blue-500" />,    value: counts.em_execucao },
          { key: 'concluida',   label: 'Concluídas',   icon: <CheckCircle2 size={16} className="text-emerald-500" />, value: counts.concluida },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFiltro(filtro === item.key ? 'todos' : item.key as Tarefa['status'])}
            className={`bg-white border rounded-2xl p-4 shadow-sm text-center transition-all ${
              filtro === item.key ? 'border-orange-300 ring-2 ring-orange-200' : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="flex justify-center mb-1">{item.icon}</div>
            <p className="text-xl font-bold text-zinc-900">{item.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{item.label}</p>
          </button>
        ))}
      </div>

      {/* Pesquisa */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Pesquisar tarefas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <Wrench size={36} className="mb-2 opacity-30" />
          <p className="text-sm font-medium">Nenhuma tarefa encontrada</p>
          {podeCriar && <p className="text-xs mt-1">Clica em "Nova Tarefa" para começar.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => {
            const st = STATUS_MAP[t.status];
            const pr = PRIORIDADE_MAP[t.prioridade];
            return (
              <div key={t.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-4 hover:border-zinc-300 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-zinc-900 text-sm">{t.titulo}</p>
                    <span className={`text-xs font-bold ${pr.color}`}>● {pr.label}</span>
                  </div>
                  {t.descricao && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.descricao}</p>
                  )}
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border ${st.color}`}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
