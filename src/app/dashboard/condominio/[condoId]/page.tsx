'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { ArrowLeft, Building2, MapPin } from 'lucide-react';
import Link from 'next/link';

interface CondominioData {
  nome: string;
  status: 'active' | 'inactive';
  endereco?: {
    cidade?: string;
    provincia?: string;
  };
  totalUnidades?: number;
}

export default function CondominioPage() {
  const params = useParams();
  const condoId = params?.condoId as string;

  const [condominio, setCondominio] = useState<CondominioData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!condoId) return;

    const fetchCondominio = async () => {
      try {
        const docRef = doc(db, 'condominios', condoId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          setCondominio(snapshot.data() as CondominioData);
        }
      } catch (error) {
        console.error('Erro ao carregar condomínio:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCondominio();
  }, [condoId]);

  if (loading) {
    return (
      <div className="p-8 text-zinc-500">
        A carregar condomínio...
      </div>
    );
  }

  if (!condominio) {
    return (
      <div className="p-8 text-red-500">
        Condomínio não encontrado.
      </div>
    );
  }

  return (
    <main className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">

      {/* Voltar */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition"
      >
        <ArrowLeft size={16} />
        Voltar ao Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        <div>
          <div className="flex items-center gap-3">
            <Building2 size={22} className="text-orange-500" />
            <h1 className="text-3xl font-bold text-zinc-900">
              {condominio.nome}
            </h1>
          </div>

          <div className="flex items-center gap-3 text-sm text-zinc-500 mt-2">
            <MapPin size={14} />
            {condominio.endereco?.cidade ?? 'Cidade não definida'}
            {condominio.endereco?.provincia && `, ${condominio.endereco.provincia}`}
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            condominio.status === 'active'
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {condominio.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>

      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Unidades</p>
          <h3 className="text-2xl font-bold mt-2">
            {condominio.totalUnidades ?? 0}
          </h3>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Moradores</p>
          <h3 className="text-2xl font-bold mt-2">0</h3>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Receita</p>
          <h3 className="text-2xl font-bold mt-2">0.0k Kz</h3>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Inadimplência</p>
          <h3 className="text-2xl font-bold mt-2">0.0%</h3>
        </div>

      </div>

      {/* Navegação de Módulos */}
      <div className="flex flex-wrap gap-3 border-b border-zinc-200 pb-3">

        <Link
          href={`/dashboard/condominio/${condoId}/unidades`}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-900 text-white"
        >
          Unidades
        </Link>

        <Link
  href={`/dashboard/condominio/${condoId}/moradores`}
  className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-900 text-white"
>
  Moradores
</Link>

        <button className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-500 cursor-not-allowed">
          Financeiro
        </button>

        <button className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-500 cursor-not-allowed">
          Ocorrências
        </button>

      </div>

      {/* Placeholder */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm text-zinc-500 text-center">
        Selecione um módulo acima para gerir o condomínio.
      </div>

    </main>
  );
}