'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/permissionMatrix';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { Plus, ArrowLeft, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Transacao {
  id: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: string;
  categoria?: string;
  status: 'pago' | 'pendente' | 'cancelado';
}

function formatKz(valor: number) {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' })
    .format(valor)
    .replace('AOA', 'Kz');
}

function StatusBadge({ status }: { status: Transacao['status'] }) {
  const map = {
    pago: 'bg-emerald-50 text-emerald-600',
    pendente: 'bg-amber-50 text-amber-600',
    cancelado: 'bg-red-50 text-red-500',
  };
  const label = { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function NovaTransacaoModal({
  condoId,
  onClose,
  onSuccess,
}: {
  condoId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    tipo: 'receita' as 'receita' | 'despesa',
    descricao: '',
    valor: '',
    categoria: '',
    status: 'pago' as 'pago' | 'pendente',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.descricao || !form.valor) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'financeiro'), {
        condominioId: condoId,
        tipo: form.tipo,
        descricao: form.descricao,
        valor: Number(form.valor),
        categoria: form.categoria || null,
        status: form.status,
        data: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      });
      toast.success('Transação registada com sucesso.');
      onSuccess();
    } catch (e) {
      toast.error('Erro ao registar transação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">Nova Transação</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['receita', 'despesa'] as const).map(t => (
            <button
              key={t}
              onClick={() => setForm(f => ({ ...f, tipo: t }))}
              className={`py-2 rounded-xl text-sm font-semibold border transition-colors ${
                form.tipo === t
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {t === 'receita' ? 'Receita' : 'Despesa'}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Descrição *"
          value={form.descricao}
          onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
          className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <input
          type="number"
          placeholder="Valor (Kz) *"
          value={form.valor}
          onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
          className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <input
          type="text"
          placeholder="Categoria (opcional)"
          value={form.categoria}
          onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
          className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <select
          value={form.status}
          onChange={e => setForm(f => ({ ...f, status: e.target.value as 'pago' | 'pendente' }))}
          className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        >
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
        </select>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-zinc-200 rounded-xl hover:bg-zinc-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.descricao || !form.valor}
            className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl flex items-center gap-2"
          >
            {saving && <Loader2 size={13} className="animate-spin" />} Registar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FluxoCaixaPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData } = useAuthContext();
  const role = userData?.role;

  const podeVerFinanceiro  = role ? can(role, 'view',   'financeiro') : false;
  const podeCriarTransacao = role ? can(role, 'create', 'financeiro') : false;

  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);

  const fetchTransacoes = async () => {
    if (!condoId || !podeVerFinanceiro) return;
    setLoading(true);
    try {
      // Receitas: quotas pagas
      const quotasSnap = await getDocs(
        query(
          collection(db, 'quotas'),
          where('condominioId', '==', condoId),
          where('status', '==', 'pago'),
        ),
      );
      const receitas: Transacao[] = quotasSnap.docs.map(d => {
        const q = d.data();
        return {
          id: d.id,
          tipo: 'receita',
          descricao: `Quota ${q.moradorNome ?? ''} — Unidade ${q.unidadeNumero ?? ''}`,
          valor: q.valor ?? 0,
          data: q.dataPagamento?.toDate?.()?.toISOString().split('T')[0] ?? '',
          categoria: 'Quota',
          status: 'pago',
        };
      });

      // Despesas
      const despesasSnap = await getDocs(
        query(
          collection(db, 'despesas'),
          where('condominioId', '==', condoId),
          orderBy('data', 'desc'),
        ),
      );
      const despesas: Transacao[] = despesasSnap.docs.map(d => {
        const dep = d.data();
        return {
          id: d.id,
          tipo: 'despesa',
          descricao: dep.descricao ?? '—',
          valor: dep.valor ?? 0,
          data: dep.data?.toDate?.()?.toISOString().split('T')[0] ?? '',
          categoria: dep.categoria ?? '',
          status: 'pago',
        };
      });

      // Transações manuais (coleção 'financeiro')
      const finSnap = await getDocs(
        query(
          collection(db, 'financeiro'),
          where('condominioId', '==', condoId),
          orderBy('data', 'desc'),
        ),
      );
      const manuais: Transacao[] = finSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      } as Transacao));

      const todas = [...receitas, ...despesas, ...manuais].sort((a, b) =>
        b.data.localeCompare(a.data),
      );
      setTransacoes(todas);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransacoes(); }, [condoId, podeVerFinanceiro]);

  if (!podeVerFinanceiro) {
    return (
      <main className="p-3 sm:p-4 lg:p-6 xl:p-8 text-center text-zinc-500">
        Sem permissão para visualizar o fluxo de caixa.
      </main>
    );
  }

  const totalReceitas = transacoes
    .filter(t => t.tipo === 'receita')
    .reduce((s, t) => s + t.valor, 0);

  const totalDespesas = transacoes
    .filter(t => t.tipo === 'despesa')
    .reduce((s, t) => s + t.valor, 0);

  const saldo = totalReceitas - totalDespesas;

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8">
      {showModal && (
        <NovaTransacaoModal
          condoId={condoId}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchTransacoes(); }}
        />
      )}

      <Link
        href={`/dashboard/condominio/${condoId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Fluxo de Caixa</h1>
        {podeCriarTransacao && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} /> Nova Transação
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Total Receitas</p>
          <p className="text-2xl font-bold text-emerald-600">{formatKz(totalReceitas)}</p>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Total Despesas</p>
          <p className="text-2xl font-bold text-red-500">{formatKz(totalDespesas)}</p>
        </div>
        <div
          className={`border rounded-2xl p-5 shadow-sm ${
            saldo >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <p className="text-sm text-zinc-500">Saldo</p>
          <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatKz(saldo)}
          </p>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white border rounded-2xl shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">A carregar...</div>
        ) : transacoes.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">Nenhuma transação registada.</div>
        ) : (
          <div className="divide-y">
            {transacoes.map(t => (
              <div key={t.id} className="flex justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-sm">{t.descricao}</p>
                  <p className="text-xs text-zinc-400">{t.categoria ?? '—'} · {t.data}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={t.status} />
                  <p
                    className={`font-bold text-sm ${
                      t.tipo === 'receita' ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {t.tipo === 'receita' ? '+' : '-'}{formatKz(t.valor)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
