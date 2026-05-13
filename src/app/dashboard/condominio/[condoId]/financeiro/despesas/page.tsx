'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  getDespesas, createDespesa, deleteDespesa,
  CATEGORIAS_DESPESA, type Despesa, type CategoriaDespesa,
} from '@/lib/firebase/despesas';
import {
  TrendingDown, Plus, Trash2, Loader2, ArrowLeft,
  Receipt, Search, RefreshCw, X,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import Pagination, { usePagination } from '@/components/ui/Pagination';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
}

function formatDate(ts: Timestamp | Date | undefined) {
  if (!ts) return '—';
  const d = ts instanceof Date ? ts : ts.toDate();
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CAT_COLORS: Record<CategoriaDespesa, string> = {
  manutencao:    'bg-blue-50 text-blue-700',
  limpeza:       'bg-teal-50 text-teal-700',
  seguranca:     'bg-purple-50 text-purple-700',
  energia:       'bg-yellow-50 text-yellow-700',
  agua:          'bg-cyan-50 text-cyan-700',
  administrativo:'bg-zinc-100 text-zinc-600',
  obras:         'bg-orange-50 text-orange-700',
  seguros:       'bg-emerald-50 text-emerald-700',
  outros:        'bg-zinc-50 text-zinc-500',
};

// ─── Modal de nova despesa ────────────────────────────────────────────────────

interface ModalProps {
  condominioId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function NovaDespesaModal({ condominioId, onClose, onSuccess }: ModalProps) {
  const { userData } = useAuthContext();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    descricao:  '',
    valor:      '',
    categoria:  'manutencao' as CategoriaDespesa,
    data:       new Date().toISOString().split('T')[0],
    fornecedor: '',
  });

  const set = (k: keyof typeof form) => (v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.descricao.trim()) { toast.warning('Descrição obrigatória.'); return; }
    if (!form.valor || Number(form.valor) <= 0) { toast.warning('Valor deve ser maior que zero.'); return; }
    if (!userData) return;

    setSaving(true);
    try {
      await createDespesa({
        condominioId,
        descricao:        form.descricao.trim(),
        valor:            Number(form.valor),
        categoria:        form.categoria,
        data:             new Date(form.data),
        fornecedor:       form.fornecedor.trim() || undefined,
        registadoPor:     userData.uid,
        registadoPorNome: userData.nome,
        registadoPorRole: userData.role,
      });
      toast.success('Despesa registada com sucesso.');
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao registar despesa.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Nova Despesa</h2>
          <button onClick={onClose} disabled={saving}><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Descrição *</label>
            <input className={inputCls} placeholder="Ex: Manutenção elevador" value={form.descricao} onChange={e => set('descricao')(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Valor (Kz) *</label>
              <input className={inputCls} type="number" min="0" placeholder="0" value={form.valor} onChange={e => set('valor')(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Data *</label>
              <input className={inputCls} type="date" value={form.data} onChange={e => set('data')(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Categoria</label>
            <select className={inputCls} value={form.categoria} onChange={e => set('categoria')(e.target.value as CategoriaDespesa)}>
              {CATEGORIAS_DESPESA.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Fornecedor</label>
            <input className={inputCls} placeholder="Nome do fornecedor (opcional)" value={form.fornecedor} onChange={e => set('fornecedor')(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-zinc-100">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Registar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DespesasPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData } = useAuthContext();

  const canEdit = userData?.role === 'admin' || userData?.role === 'gestor' || userData?.role === 'sindico';

  const [despesas, setDespesas]   = useState<Despesa[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState<CategoriaDespesa | 'todas'>('todas');
  const [showModal, setShowModal] = useState(false);

  const fetchDespesas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDespesas(condoId);
      setDespesas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [condoId]);

  useEffect(() => { fetchDespesas(); }, [fetchDespesas]);

  const handleDelete = (id: string, descricao: string) => {
    if (!userData) return;
    toast(`Eliminar "${descricao}"?`, {
      description: 'Esta acção não pode ser desfeita.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await deleteDespesa(id, { actorId: userData.uid, actorNome: userData.nome, actorRole: userData.role });
            toast.success('Despesa eliminada.');
            fetchDespesas();
          } catch (e: any) {
            toast.error(e?.message ?? 'Erro ao eliminar.');
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  const filtered = despesas.filter(d => {
    const matchSearch = search === '' ||
      d.descricao.toLowerCase().includes(search.toLowerCase()) ||
      (d.fornecedor ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'todas' || d.categoria === catFilter;
    return matchSearch && matchCat;
  });

  const totalFiltrado = filtered.reduce((s, d) => s + d.valor, 0);
  const totalGeral    = despesas.reduce((s, d) => s + d.valor, 0);

  // Paginação
  const { paged, page, setPage, totalPages, totalItems, pageSize } = usePagination(filtered, 15);

  // Resumo por categoria
  const porCategoria = despesas.reduce((acc, d) => {
    acc[d.categoria] = (acc[d.categoria] ?? 0) + d.valor;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-500">

      <Link href={`/dashboard/condominio/${condoId}`} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition">
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 rounded-xl">
            <TrendingDown size={20} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Despesas Operacionais</h1>
            <p className="text-sm text-zinc-500">Registo de custos do condomínio</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition"
          >
            <Plus size={16} /> Nova Despesa
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Total Geral</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{formatMoney(totalGeral)}</p>
        </div>
        {Object.entries(porCategoria).slice(0, 3).map(([cat, val]) => {
          const label = CATEGORIAS_DESPESA.find(c => c.value === cat)?.label ?? cat;
          return (
            <div key={cat} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-zinc-500 font-medium">{label}</p>
              <p className="text-xl font-bold text-zinc-900 mt-1">{formatMoney(val)}</p>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar por descrição ou fornecedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value as CategoriaDespesa | 'todas')}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white"
        >
          <option value="todas">Todas as categorias</option>
          {CATEGORIAS_DESPESA.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <button onClick={fetchDespesas} disabled={loading} className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition disabled:opacity-50">
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      {!loading && (
        <p className="text-xs text-zinc-400">
          {filtered.length} despesa{filtered.length !== 1 ? 's' : ''} · Total: <span className="font-semibold text-zinc-700">{formatMoney(totalFiltrado)}</span>
        </p>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <Receipt size={36} className="mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhuma despesa encontrada</p>
          {canEdit && <p className="text-xs mt-1 opacity-70">Clique em "Nova Despesa" para registar</p>}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header da tabela — desktop */}
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-zinc-50 border-b border-zinc-100 text-xs font-bold uppercase tracking-wider text-zinc-500">
            <span>Descrição</span>
            <span className="text-right">Categoria</span>
            <span className="text-right">Data</span>
            <span className="text-right">Valor</span>
            <span />
          </div>

          <div className="divide-y divide-zinc-100">
            {paged.map(d => (
              <div key={d.id} className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto_auto_auto] gap-2 md:gap-4 px-5 py-4 items-start md:items-center hover:bg-zinc-50/60 transition-colors">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{d.descricao}</p>
                  {d.fornecedor && <p className="text-xs text-zinc-400 mt-0.5">{d.fornecedor}</p>}
                </div>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', CAT_COLORS[d.categoria])}>
                  {CATEGORIAS_DESPESA.find(c => c.value === d.categoria)?.label ?? d.categoria}
                </span>
                <span className="text-xs text-zinc-500">{formatDate(d.data)}</span>
                <span className="text-sm font-bold text-red-600">{formatMoney(d.valor)}</span>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(d.id, d.descricao)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Paginação */}
          <div className="px-5 py-4 border-t border-zinc-100">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              itemsPerPage={pageSize}
              totalItems={totalItems}
            />
          </div>
        </div>
      )}

      {showModal && (
        <NovaDespesaModal
          condominioId={condoId}
          onClose={() => setShowModal(false)}
          onSuccess={fetchDespesas}
        />
      )}
    </main>
  );
}
