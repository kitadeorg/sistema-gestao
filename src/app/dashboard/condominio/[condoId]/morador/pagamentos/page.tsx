'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { getQuotasMorador, type Quota } from '@/lib/firebase/quotas';
import {
  DollarSign, ArrowLeft, TrendingUp, TrendingDown,
  Loader2, CheckCircle2, Clock, AlertTriangle, Receipt,
  Search, CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function formatKz(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
}

function StatusBadge({ status }: { status: Quota['status'] }) {
  const map = {
    pago:     { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={11} />, label: 'Pago'      },
    pendente: { cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: <Clock size={11} />,        label: 'Pendente'  },
    atrasado: { cls: 'bg-red-50 text-red-700 border-red-200',             icon: <AlertTriangle size={11} />, label: 'Atrasado' },
    isento:   { cls: 'bg-zinc-100 text-zinc-500 border-zinc-200',         icon: null,                        label: 'Isento'   },
  };
  const s = map[status] ?? map.pendente;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border', s.cls)}>
      {s.icon}{s.label}
    </span>
  );
}

export default function MeusPagamentosPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData, loading: authLoading } = useAuthContext();

  const [quotas,  setQuotas]  = useState<Quota[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filtro,  setFiltro]  = useState<'todos' | Quota['status']>('todos');

  useEffect(() => {
    if (authLoading || !condoId || !userData?.uid) return;
    getQuotasMorador(condoId, userData.uid)
      .then(setQuotas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [condoId, userData?.uid, authLoading]);

  const totalPago    = quotas.filter(q => q.status === 'pago').reduce((s, q) => s + q.valor, 0);
  const totalAberto  = quotas.filter(q => q.status !== 'pago' && q.status !== 'isento').reduce((s, q) => s + q.valor, 0);
  const totalQuotas  = quotas.reduce((s, q) => s + q.valor, 0);
  const taxaPagamento = totalQuotas > 0 ? (totalPago / totalQuotas) * 100 : 0;

  const filtered = quotas
    .filter(q => filtro === 'todos' || q.status === filtro)
    .filter(q =>
      search === '' ||
      MESES[q.mes - 1].toLowerCase().includes(search.toLowerCase()) ||
      String(q.ano).includes(search)
    );

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-500">

      <Link
        href={`/dashboard/condominio/${condoId}/morador`}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition"
      >
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      <div className="flex items-center gap-3">
        <DollarSign size={22} className="text-orange-500" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Meus Pagamentos</h1>
          <p className="text-sm text-zinc-500">Histórico de quotas e pagamentos</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-500">Total Pago</p>
            <TrendingUp size={14} className="text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-600">{formatKz(totalPago)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{quotas.filter(q => q.status === 'pago').length} quotas pagas</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-500">Em Aberto</p>
            <TrendingDown size={14} className="text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-500">{formatKz(totalAberto)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{quotas.filter(q => q.status !== 'pago' && q.status !== 'isento').length} por pagar</p>
        </div>
      </div>

      {/* Barra de progresso */}
      {quotas.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-zinc-900">Taxa de Pagamento</p>
            <p className="text-sm font-bold text-zinc-700">{taxaPagamento.toFixed(1)}%</p>
          </div>
          <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                taxaPagamento >= 80 ? 'bg-emerald-500' : taxaPagamento >= 50 ? 'bg-amber-400' : 'bg-red-400',
              )}
              style={{ width: `${taxaPagamento}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-400 mt-1">
            <span>{formatKz(totalPago)} pago</span>
            <span>{formatKz(totalQuotas)} total</span>
          </div>
        </div>
      )}

      {/* Filtros + Search */}
      {quotas.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar por mês ou ano..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['todos', 'pendente', 'pago', 'atrasado', 'isento'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors',
                  filtro === f
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
                )}
              >
                {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'todos' && (
                  <span className="ml-1.5 opacity-60">
                    ({quotas.filter(q => q.status === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista */}
      {quotas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <Receipt size={36} className="mb-2 opacity-30" />
          <p className="text-sm font-medium">Nenhum pagamento encontrado</p>
          <p className="text-xs mt-1 text-center">
            As quotas aparecerão aqui quando forem geradas pela administração.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
          <p className="text-sm">Nenhum resultado para o filtro seleccionado.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-100">
            {filtered.map(q => (
              <div key={q.id} className={cn(
                  'flex items-center justify-between px-4 py-4 hover:bg-zinc-50 transition-colors',
                  q.status === 'atrasado' && 'bg-red-50/40',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    q.status === 'pago'     ? 'bg-emerald-500' :
                    q.status === 'atrasado' ? 'bg-red-500'     :
                    q.status === 'isento'   ? 'bg-zinc-400'    : 'bg-amber-400',
                  )} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">
                      Quota de {MESES[q.mes - 1]} {q.ano}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">
                      Vencimento: {q.dataVencimento.toDate().toLocaleDateString('pt-PT')}
                      {q.dataPagamento && ` · Pago: ${q.dataPagamento.toDate().toLocaleDateString('pt-PT')}`}
                      {q.observacoes && ` · ${q.observacoes}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <StatusBadge status={q.status} />
                  <p className={cn(
                    'text-sm font-bold',
                    q.status === 'pago'     ? 'text-emerald-600' :
                    q.status === 'atrasado' ? 'text-red-600'     :
                    q.status === 'isento'   ? 'text-zinc-400'    : 'text-amber-600',
                  )}>
                    {formatKz(q.valor)}
                  </p>
                  {(q.status === 'pendente' || q.status === 'atrasado') && (
                    <Link
                      href={`/dashboard/condominio/${condoId}/morador/pagar/${q.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors"
                    >
                      <CreditCard size={12} />
                      Pagar
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aviso de pagamento */}
      {quotas.some(q => q.status === 'pendente' || q.status === 'atrasado') && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Como efectuar o pagamento</p>
          <p className="text-amber-700 text-xs leading-relaxed">
            Para regularizar as suas quotas, contacte a administração do condomínio ou efectue a transferência bancária e aguarde a confirmação do pagamento.
          </p>
        </div>
      )}
    </main>
  );
}
