'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import {
  Building2,
  MapPin,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

import {
  getResumoFinanceiro,
  atualizarPagamentosAtrasados,
  ResumoFinanceiro,
} from '@/lib/firebase/financeiro';

interface Props {
  condominioId: string;
}

interface CondominioData {
  nome: string;
  status: 'active' | 'inactive';
  endereco?: { cidade?: string; provincia?: string };
}

function formatMoney(valor: number) {
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M Kz`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(1)}k Kz`;
  return `${valor.toLocaleString('pt-AO')} Kz`;
}

export default function GestorCondominioView({ condominioId }: Props) {

  const [condominio, setCondominio] = useState<CondominioData | null>(null);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDoc(doc(db, 'condominios', condominioId));
      if (snap.exists()) {
        setCondominio(snap.data() as CondominioData);
      }

      await atualizarPagamentosAtrasados(condominioId, false);
      const resumoData = await getResumoFinanceiro(condominioId, false);
      setResumo(resumoData);
    };

    fetchData();
  }, [condominioId]);

  if (!condominio) return null;

  return (
    <div className="space-y-8">

      <div>
        <div className="flex items-center gap-3">
          <Building2 size={20} className="text-orange-500" />
          <h1 className="text-2xl font-bold text-zinc-900">
            {condominio.nome}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500 mt-2">
          <MapPin size={14} />
          {condominio.endereco?.cidade ?? 'Cidade não definida'}
          {condominio.endereco?.provincia && `, ${condominio.endereco.provincia}`}
        </div>
      </div>

      {resumo && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Receita Total</p>
            <h3 className="text-2xl font-bold mt-2">
              {formatMoney(resumo.receitaTotal)}
            </h3>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Inadimplência</p>
            <h3 className="text-2xl font-bold mt-2 text-red-600">
              {resumo.taxaInadimplencia.toFixed(1)}%
            </h3>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Total Pago</p>
            <h3 className="text-2xl font-bold mt-2">
              {formatMoney(resumo.totalPago)}
            </h3>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Total em Atraso</p>
            <h3 className="text-2xl font-bold mt-2 text-red-600">
              {formatMoney(resumo.totalAtrasado)}
            </h3>
          </div>

        </div>
      )}

    </div>
  );
}