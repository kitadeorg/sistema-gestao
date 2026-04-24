'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { getQuotasMorador, type Quota } from '@/lib/firebase/quotas';
import { Receipt, ArrowLeft, Loader2, CheckCircle2, Clock, AlertTriangle, Search } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function formatKz(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
}

function StatusBadge({ status }: { status: Quota['status'] }) {
  const map = {
    pago:     { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={11} />, label: 'Pago' },
    pendente: { cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: <Clock size={11} />,        label: 'Pendente' },
    atrasado: { cls: 'bg-red-50 text-red-700 border-red-200',             icon: <AlertTriangle size={11} />, label: 'Atrasado' },
    isento:   { cls: 'bg-zinc-100 text-zinc-500 border-zinc-200',         icon: null,                        label: 'Isento' },
  };
  const s = map[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border', s.cls)}>
      {s.icon}{s.label}
    </span>
  );
}

export default function MinhasQuotasPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData, loading: authLoading } = useAuthContext();

  const [quotas,  setQuotas]  = useState<Quota[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    if (authLoading || !condoId || !userData?.uid) return;
    getQuotasMorador(condoId, userData.uid)
      .then(setQuotas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [condoId, userData?.uid, authLoading]);

  const totalPago    = quotas.filter(q => q.status === 'pago').reduce((s, q) => s + q.valor, 0);
  const totalAberto  = quotas.filter(q => q.status !== 'pago' && q.status !== 'isento').reduce((s, q) => s + q.valor, 0);
  const quotaAtual   = quotas.find(q => {
    const hoje = new Date();
    return q.mes === hoje.getMonth() + 1 && q.ano === hoje.getFullYear();
  });

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-6 animate-in fade-in duration-500">

      <Link href={`/dashboard/condominio/${condoId}/morador`} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition">
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      <div className="flex items-center gap-3">
        <Receipt size={22} className="text-orange-500" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Minhas Quotas</h1>
          <p className="text-sm text-zinc-500">Histórico de quotas condominiais</p>
        </div>
      </div>

      {/* Quota do mês actual em destaque */}
      {quotaAtual && (
        <div className={cn(
          'rounded-2xl p-5 border-2',
          quotaAtual.status === 'pago'
            ? 'bg-emerald-50 border-emerald-300'
            : quotaAtual.status === 'atrasado'
              ? 'bg-red-50 border-red-300'
              : 'bg-amber-50 border-amber-300',
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Quota de {MESES[quotaAtual.mes - 1]} {quotaAtual.ano}
              </p>
              <p className="text-3xl font-black text-zinc-900">{formatKz(quotaAtual.valor)}</p>
              <p className="text-xs text-zinc-500 mt-1">
                Vencimento: dia {quotaAtual.dataVencimento.toDate().getDate()}
              </p>
            </div>
            <StatusBadge status={quotaAtual.status} />
          </div>
          {quotaAtual.status !== 'pago' && quotaAtual.status !== 'isento' && (
            <p className="text-xs text-zinc-600 mt-3 bg-white/60 rounded-lg px-3 py-2">
              Para efectuar o pagamento, contacte a administração do condomínio ou efectue a transferência bancária e aguarde a confirmação.
            </p>
          )}
          {quotaAtual.status === 'pago' && quotaAtual.dataPagamento && (
            <p className="text-xs text-emerald-700 mt-2 font-medium flex items-center gap-1">
              <CheckCircle2 size={11} />
              Pago em {quotaAtual.dataPagamento.toDate().toLocaleDateString('pt-PT')}
              {quotaAtual.observacoes && ` · ${quotaAtual.observacoes}`}
            </p>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-zinc-500 mb-1">Total Pago</p>
          <p className="text-xl font-bold text-emerald-600">{formatKz(totalPago)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{quotas.filter(q => q.status === 'pago').length} quotas</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-zinc-500 mb-1">Em Aberto</p>
          <p className="text-xl font-bold text-amber-500">{formatKz(totalAberto)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{quotas.filter(q => q.status !== 'pago' && q.status !== 'isento').length} quotas</p>
        </div>
      </div>

      {/* Histórico */}
      {quotas.length > 0 && (
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
      )}
      {quotas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <Receipt size={36} className="mb-2 opacity-30" />
          <p className="text-sm">Nenhuma quota encontrada</p>
          <p className="text-xs mt-1">As quotas aparecerão aqui quando forem geradas pela administração.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider">Histórico</h3>
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="divide-y divide-zinc-100">
              {quotas.filter(q =>
                search === '' ||
                MESES[q.mes - 1].toLowerCase().includes(search.toLowerCase()) ||
                String(q.ano).includes(search)
              ).map(q => (
                <div key={q.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {MESES[q.mes - 1]} {q.ano}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Vencimento: {q.dataVencimento.toDate().toLocaleDateString('pt-PT')}
                      {q.dataPagamento && ` · Pago: ${q.dataPagamento.toDate().toLocaleDateString('pt-PT')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={q.status} />
                    <p className={cn(
                      'text-sm font-bold',
                      q.status === 'pago' ? 'text-emerald-600' :
                      q.status === 'atrasado' ? 'text-red-600' : 'text-amber-600',
                    )}>
                      {formatKz(q.valor)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
