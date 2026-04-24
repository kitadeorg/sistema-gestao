'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  gerarQuotasMensais,
  getResumoQuotasMes,
  actualizarQuotasAtrasadas,
  registarPagamento,
  reverterPagamento,
  isentarQuota,
  type Quota,
} from '@/lib/firebase/quotas';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { toast } from 'sonner';
import {
  Receipt, Plus, RefreshCw, CheckCircle2, Clock,
  AlertTriangle, ChevronLeft, ChevronRight,
  Loader2, DollarSign, Users, TrendingDown, X, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function formatKz(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
}

function StatusBadge({ status }: { status: Quota['status'] }) {
  const map = {
    pago:     'bg-emerald-50 text-emerald-700 border-emerald-200',
    pendente: 'bg-amber-50 text-amber-700 border-amber-200',
    atrasado: 'bg-red-50 text-red-700 border-red-200',
    isento:   'bg-zinc-100 text-zinc-500 border-zinc-200',
  };
  const label = { pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado', isento: 'Isento' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', map[status])}>
      {label[status]}
    </span>
  );
}

// ─────────────────────────────────────────────
// MODAL DE PAGAMENTO
// ─────────────────────────────────────────────

function ModalPagamento({
  quota,
  onClose,
  onSuccess,
}: {
  quota: Quota;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { userData } = useAuthContext();
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [observacoes,   setObservacoes]   = useState('');
  const [saving,        setSaving]        = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await registarPagamento({
        quotaId:       quota.id,
        dataPagamento: new Date(dataPagamento + 'T12:00:00'),
        observacoes:   observacoes || undefined,
        registadoPor:  userData?.uid ?? 'sistema',
        actorNome:     userData?.nome,
        actorRole:     userData?.role,
      });
      toast.success(`Pagamento de ${quota.moradorNome} registado.`);
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao registar pagamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">Registar Pagamento</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><X size={16} /></button>
        </div>

        <div className="bg-zinc-50 rounded-xl p-4 space-y-1">
          <p className="text-sm font-semibold text-zinc-900">{quota.moradorNome}</p>
          <p className="text-xs text-zinc-500">Unidade {quota.unidadeNumero} · {MESES[quota.mes - 1]} {quota.ano}</p>
          <p className="text-lg font-bold text-orange-600">{formatKz(quota.valor)}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Data do Pagamento</label>
          <input
            type="date"
            value={dataPagamento}
            onChange={e => setDataPagamento(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Observações (opcional)</label>
          <input
            type="text"
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            placeholder="Ex: Transferência bancária, referência..."
            className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────

export default function QuotasPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData } = useAuthContext();

  const hoje = new Date();
  const [mes,     setMes]     = useState(hoje.getMonth() + 1);
  const [ano,     setAno]     = useState(hoje.getFullYear());
  const [resumo,  setResumo]  = useState<Awaited<ReturnType<typeof getResumoQuotasMes>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [filtro,  setFiltro]  = useState<'todos' | Quota['status']>('todos');
  const [search,  setSearch]  = useState('');
  const [modalQuota, setModalQuota] = useState<Quota | null>(null);
  const [valorPadrao, setValorPadrao] = useState(0);

  const fetchResumo = useCallback(async () => {
    if (!condoId) return;
    setLoading(true);
    try {
      await actualizarQuotasAtrasadas(condoId);
      const r = await getResumoQuotasMes(condoId, mes, ano);
      setResumo(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [condoId, mes, ano]);

  useEffect(() => { fetchResumo(); }, [fetchResumo]);

  // Buscar valor padrão do condomínio
  useEffect(() => {
    if (!condoId) return;
    getDoc(doc(db, 'condominios', condoId)).then(snap => {
      if (snap.exists()) setValorPadrao(snap.data().valorQuotaMensal ?? 0);
    });
  }, [condoId]);

  const handleGerarQuotas = async () => {
    if (!userData?.uid) return;
    setGerando(true);
    try {
      const count = await gerarQuotasMensais({
        condominioId: condoId,
        mes, ano,
        criadoPor: userData.uid,
      });
      toast.success(`${count} quotas geradas para ${MESES[mes - 1]} ${ano}.`);
      fetchResumo();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao gerar quotas.');
    } finally {
      setGerando(false);
    }
  };

  const handleReverter = async (quota: Quota) => {
    try {
      await reverterPagamento(quota.id, userData?.uid, userData?.nome, userData?.role);
      toast.success('Pagamento revertido.');
      fetchResumo();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao reverter.');
    }
  };

  const handleIsentar = async (quota: Quota) => {
    try {
      await isentarQuota(quota.id, 'Isento por decisão da administração', userData?.uid ?? 'sistema', userData?.nome, userData?.role);
      toast.success('Quota marcada como isenta.');
      fetchResumo();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao isentar.');
    }
  };

  const navegarMes = (dir: -1 | 1) => {
    let novoMes = mes + dir;
    let novoAno = ano;
    if (novoMes < 1)  { novoMes = 12; novoAno--; }
    if (novoMes > 12) { novoMes = 1;  novoAno++; }
    setMes(novoMes);
    setAno(novoAno);
  };

  const quotasFiltradas = (resumo?.quotas ?? []).filter(q =>
    (filtro === 'todos' || q.status === filtro) &&
    (search === '' ||
      q.moradorNome.toLowerCase().includes(search.toLowerCase()) ||
      q.unidadeNumero.toLowerCase().includes(search.toLowerCase()))
  );

  const jaGeradas = (resumo?.quotas.length ?? 0) > 0;

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-300">

      {/* Modal */}
      {modalQuota && (
        <ModalPagamento
          quota={modalQuota}
          onClose={() => setModalQuota(null)}
          onSuccess={fetchResumo}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Receipt size={22} className="text-orange-500" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Quotas Mensais</h1>
            <p className="text-sm text-zinc-500">Gestão de quotas condominiais</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchResumo}
            disabled={loading}
            className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          </button>

          {!jaGeradas && (
            <button
              onClick={handleGerarQuotas}
              disabled={gerando || valorPadrao === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 shadow-sm"
            >
              {gerando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Gerar Quotas
            </button>
          )}
        </div>
      </div>

      {/* Navegação de mês */}
      <div className="flex items-center gap-3">
        <button onClick={() => navegarMes(-1)} className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <p className="font-bold text-zinc-900">{MESES[mes - 1]} {ano}</p>
        </div>
        <button onClick={() => navegarMes(1)} className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Aviso sem valor padrão */}
      {valorPadrao === 0 && !jaGeradas && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Valor de quota não configurado</p>
            <p className="text-amber-700 mt-0.5">
              Vai às Configurações do Condomínio e define o valor mensal da quota antes de gerar.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : !jaGeradas ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Receipt size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma quota gerada para {MESES[mes - 1]} {ano}</p>
          {valorPadrao > 0 && (
            <p className="text-xs mt-1">Clica em "Gerar Quotas" para criar as quotas deste mês.</p>
          )}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-500 font-medium">Total a Receber</p>
                <DollarSign size={15} className="text-zinc-400" />
              </div>
              <p className="text-xl font-bold text-zinc-900">{formatKz(resumo?.total ?? 0)}</p>
              <p className="text-xs text-zinc-400 mt-1">{resumo?.totalUnidades} unidades</p>
            </div>

            <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-500 font-medium">Recebido</p>
                <CheckCircle2 size={15} className="text-emerald-500" />
              </div>
              <p className="text-xl font-bold text-emerald-600">{formatKz(resumo?.pago ?? 0)}</p>
              <p className="text-xs text-zinc-400 mt-1">{resumo?.unidadesPagas} pagos</p>
            </div>

            <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-500 font-medium">Pendente</p>
                <Clock size={15} className="text-amber-500" />
              </div>
              <p className="text-xl font-bold text-amber-600">{formatKz(resumo?.pendente ?? 0)}</p>
              <p className="text-xs text-zinc-400 mt-1">{resumo?.unidadesPendente} pendentes</p>
            </div>

            <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-500 font-medium">Inadimplência</p>
                <TrendingDown size={15} className="text-red-500" />
              </div>
              <p className="text-xl font-bold text-red-600">{(resumo?.taxaInadimplencia ?? 0).toFixed(1)}%</p>
              <p className="text-xs text-zinc-400 mt-1">{resumo?.unidadesAtrasado} atrasados</p>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-zinc-900">Progresso de Arrecadação</p>
              <p className="text-sm font-bold text-zinc-700">
                {resumo && resumo.total > 0
                  ? `${((resumo.pago / resumo.total) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
            <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${resumo && resumo.total > 0 ? (resumo.pago / resumo.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-400 mt-1">
              <span>{formatKz(resumo?.pago ?? 0)} recebido</span>
              <span>{formatKz(resumo?.total ?? 0)} total</span>
            </div>
          </div>

          {/* Filtros + Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Pesquisar por morador ou unidade..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['todos', 'pendente', 'pago', 'atrasado'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={cn(
                    'px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all',
                    filtro === f
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300',
                  )}
                >
                  {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== 'todos' && (
                    <span className="ml-1.5 opacity-60">
                      ({resumo?.quotas.filter(q => q.status === f).length ?? 0})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tabela desktop */}
          <div className="hidden md:block bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Unidade</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Morador</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Valor</th>
                  <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Pago em</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {quotasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400">
                      Nenhuma quota encontrada.
                    </td>
                  </tr>
                ) : quotasFiltradas.map(q => (
                  <tr key={q.id} className={cn(
                    'hover:bg-zinc-50/60 transition-colors',
                    q.status === 'atrasado' && 'bg-red-50/30',
                  )}>
                    <td className="px-4 py-3 text-sm font-semibold text-zinc-900">
                      {q.unidadeNumero}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{q.moradorNome}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-zinc-900">{formatKz(q.valor)}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={q.status} /></td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {q.dataPagamento
                        ? q.dataPagamento.toDate().toLocaleDateString('pt-PT')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {(q.status === 'pendente' || q.status === 'atrasado') && (
                          <button
                            onClick={() => setModalQuota(q)}
                            className="px-3 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                          >
                            Registar Pag.
                          </button>
                        )}
                        {q.status === 'pago' && (
                          <button
                            onClick={() => handleReverter(q)}
                            className="px-3 py-1.5 text-xs font-semibold border border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors"
                          >
                            Reverter
                          </button>
                        )}
                        {(q.status === 'pendente' || q.status === 'atrasado') && (
                          <button
                            onClick={() => handleIsentar(q)}
                            className="px-3 py-1.5 text-xs font-semibold border border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors"
                          >
                            Isentar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="md:hidden space-y-3">
            {quotasFiltradas.map(q => (
              <div key={q.id} className={cn(
                'bg-white border rounded-2xl p-4 shadow-sm',
                q.status === 'atrasado' ? 'border-red-200' : 'border-zinc-200',
              )}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-zinc-900 text-sm">Unidade {q.unidadeNumero}</p>
                    <p className="text-xs text-zinc-500">{q.moradorNome}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-zinc-900 text-sm">{formatKz(q.valor)}</p>
                    <StatusBadge status={q.status} />
                  </div>
                </div>
                {q.dataPagamento && (
                  <p className="text-xs text-zinc-400 mb-3">
                    Pago em: {q.dataPagamento.toDate().toLocaleDateString('pt-PT')}
                  </p>
                )}
                <div className="flex gap-2">
                  {(q.status === 'pendente' || q.status === 'atrasado') && (
                    <button
                      onClick={() => setModalQuota(q)}
                      className="flex-1 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors"
                    >
                      Registar Pagamento
                    </button>
                  )}
                  {q.status === 'pago' && (
                    <button
                      onClick={() => handleReverter(q)}
                      className="flex-1 py-2 text-xs font-semibold border border-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-50 transition-colors"
                    >
                      Reverter
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
