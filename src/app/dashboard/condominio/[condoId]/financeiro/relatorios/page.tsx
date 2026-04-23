'use client';

import { useParams } from 'next/navigation';
import { ArrowLeft, FileText, Download, BarChart3, TrendingUp, Users, Home } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Relatorio {
  id: string;
  titulo: string;
  descricao: string;
  icon: React.ReactNode;
  cor: string;
}

export default function RelatoriosPage() {
  const { condoId } = useParams() as { condoId: string };

  const relatorios: Relatorio[] = [
    {
      id: 'fluxo-mensal',
      titulo: 'Fluxo de Caixa Mensal',
      descricao: 'Resumo de receitas e despesas do mês atual',
      icon: <BarChart3 size={20} />,
      cor: 'text-blue-500 bg-blue-50',
    },
    {
      id: 'inadimplencia',
      titulo: 'Relatório de Inadimplência',
      descricao: 'Lista de moradores com pagamentos em atraso',
      icon: <TrendingUp size={20} />,
      cor: 'text-red-500 bg-red-50',
    },
    {
      id: 'moradores',
      titulo: 'Relatório de Moradores',
      descricao: 'Lista completa de moradores e suas unidades',
      icon: <Users size={20} />,
      cor: 'text-emerald-500 bg-emerald-50',
    },
    {
      id: 'unidades',
      titulo: 'Situação das Unidades',
      descricao: 'Ocupação, vagas e estado das unidades',
      icon: <Home size={20} />,
      cor: 'text-orange-500 bg-orange-50',
    },
    {
      id: 'anual',
      titulo: 'Relatório Anual',
      descricao: 'Balanço completo do ano em curso',
      icon: <FileText size={20} />,
      cor: 'text-purple-500 bg-purple-50',
    },
  ];

  return (
    <main className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">

      <Link href={`/dashboard/condominio/${condoId}`} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition">
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      <div className="flex items-center gap-3">
        <FileText size={22} className="text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Relatórios</h1>
          <p className="text-sm text-zinc-500">Gera e exporta relatórios do condomínio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {relatorios.map(r => (
          <div key={r.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${r.cor}`}>
                {r.icon}
              </div>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                onClick={() => toast.info(`${r.titulo} — Exportação em desenvolvimento.`)}
              >
                <Download size={13} /> Exportar
              </button>
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-1">{r.titulo}</h3>
            <p className="text-xs text-zinc-500">{r.descricao}</p>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-amber-700 font-semibold mb-1">
          <FileText size={16} />
          Exportação em desenvolvimento
        </div>
        <p className="text-sm text-amber-600">
          A funcionalidade de exportação para PDF e Excel estará disponível em breve.
        </p>
      </div>

    </main>
  );
}