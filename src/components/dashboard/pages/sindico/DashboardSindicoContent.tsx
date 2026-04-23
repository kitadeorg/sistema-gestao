'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDashboardContext } from '@/contexts/DashboardContext';
import {
  Building2, MapPin, DollarSign,
  Wrench, AlertTriangle, Bell,
  TrendingUp, TrendingDown, Loader2,
} from 'lucide-react';
import Link from 'next/link';

import {
  getResumoFinanceiro,
  atualizarPagamentosAtrasados,
  ResumoFinanceiro
} from '@/lib/firebase/financeiro';

interface CondominioData {
  nome: string;
  status: 'active' | 'inactive';
  endereco?: { cidade?: string; provincia?: string };
  totalUnidades?: number;
}

function formatCurrency(valor: number) {
  return `${(valor / 1000).toFixed(1)}k Kz`;
}

function KPICard({
  title,
  value,
  icon,
  trend,
  trendUp
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-zinc-500">{title}</p>
        <div className="p-2 bg-zinc-50 rounded-xl">{icon}</div>
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-zinc-900">{value}</h3>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trendUp
            ? <TrendingUp size={12} className="text-emerald-500" />
            : <TrendingDown size={12} className="text-red-500" />}
          <p className="text-xs text-zinc-400">{trend}</p>
        </div>
      )}
    </div>
  );
}

export default function DashboardSindicoContent() {
  const { userData } = useAuthContext();

  // ✅ FONTE ÚNICA DE VERDADE — sincronizado com Topbar/Sidebar
  const { selectedCondo } = useDashboardContext();

  // Síndico tem apenas um condomínio; usa selectedCondo (que é inicializado
  // com o condominioId do utilizador em useDashboardData)
  const condoId = selectedCondo !== 'all' ? selectedCondo : (userData?.condominioId ?? null);

  const [condominio, setCondominio] = useState<CondominioData | null>(null);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!condoId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setCondominio(null);
    setResumo(null);

    const fetchData = async () => {
      try {
        const snap = await getDoc(doc(db, 'condominios', condoId));
        if (snap.exists()) {
          setCondominio(snap.data() as CondominioData);
        }

        await atualizarPagamentosAtrasados(condoId, false);
        const resumoData = await getResumoFinanceiro(condoId, false);
        setResumo(resumoData);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [condoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!condoId || !condominio) {
    return <div className="p-8 text-red-500">Nenhum condomínio associado ao seu perfil.</div>;
  }

  const percentualRecebido =
    resumo && resumo.receitaTotal > 0
      ? (resumo.totalPago / resumo.receitaTotal) * 100
      : 0;

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Building2 size={22} className="text-orange-500" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-zinc-900">{condominio.nome}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500 mt-2">
            <MapPin size={14} />
            {condominio.endereco?.cidade ?? 'Cidade não definida'}
            {condominio.endereco?.provincia && `, ${condominio.endereco.provincia}`}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          condominio.status === 'active'
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-red-50 text-red-600'
        }`}>
          {condominio.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Receita Total"
          value={resumo ? formatCurrency(resumo.receitaTotal) : '0.0k Kz'}
          icon={<DollarSign size={16} className="text-emerald-500" />}
          trend="Total acumulado"
          trendUp
        />
        <KPICard
          title="Inadimplência"
          value={resumo ? `${resumo.taxaInadimplencia.toFixed(1)}%` : '0%'}
          icon={<AlertTriangle size={16} className="text-red-500" />}
          trend="Taxa atual"
          trendUp={false}
        />
        <KPICard
          title="Total Pendente"
          value={resumo ? formatCurrency(resumo.totalPendente) : '0.0k Kz'}
          icon={<Bell size={16} className="text-amber-500" />}
          trend="Aguardando pagamento"
        />
        <KPICard
          title="Total Atrasado"
          value={resumo ? formatCurrency(resumo.totalAtrasado) : '0.0k Kz'}
          icon={<Wrench size={16} className="text-blue-500" />}
          trend="Em atraso"
        />
      </div>

      {/* Resumo Financeiro */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-zinc-900">Resumo Financeiro</h3>
          <Link
            href={`/dashboard/condominio/${condoId}/financeiro/fluxo-caixa`}
            className="text-xs text-orange-500 hover:underline"
          >
            Ver detalhe
          </Link>
        </div>

        {resumo && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Total Recebido</span>
              <span className="font-bold text-emerald-600">{formatCurrency(resumo.totalPago)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Total Pendente</span>
              <span className="font-bold text-red-500">{formatCurrency(resumo.totalPendente)}</span>
            </div>
            <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${percentualRecebido}%` }}
              />
            </div>
            <p className="text-center text-xs text-zinc-400">
              {percentualRecebido.toFixed(1)}% da arrecadação concluída
            </p>
          </div>
        )}
      </div>

    </main>
  );
}