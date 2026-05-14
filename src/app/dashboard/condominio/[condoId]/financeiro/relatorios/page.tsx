'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  FileText, Download, BarChart3, TrendingUp, Users,
  Home, Loader2, TrendingDown, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { gerarRelatorioPDF } from '@/lib/pdf/gerarRelatorio';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: any): string {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-PT');
}

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k Kz`;
  return `${v.toLocaleString('pt-AO')} Kz`;
}

// ─── Geradores de relatório (PDF) ─────────────────────────────────────────────

async function exportarFluxoMensal(condoId: string, geradoPor: string) {
  const now    = new Date();
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const fim    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [quotasSnap, despesasSnap] = await Promise.all([
    getDocs(query(collection(db, 'quotas'), where('condominioId', '==', condoId), orderBy('dataVencimento', 'desc'))),
    getDocs(query(collection(db, 'despesas'), where('condominioId', '==', condoId), orderBy('data', 'desc'))),
  ]);

  const quotas   = quotasSnap.docs.map(d => d.data());
  const despesas = despesasSnap.docs.map(d => d.data()).filter(d => {
    const data = d.data?.toDate?.();
    return data && data >= inicio && data <= fim;
  });

  const receita  = quotas.filter(q => q.status === 'pago').reduce((s, q) => s + (q.valor ?? 0), 0);
  const despTotal = despesas.reduce((s, d) => s + (d.valor ?? 0), 0);
  const margem   = receita - despTotal;

  const rows: (string | number)[][] = [
    ...quotas.map(q => ['Receita', `Quota ${q.moradorNome ?? ''} - Unidade ${q.unidadeNumero ?? ''}`, formatMoney(q.valor ?? 0), q.status, formatDate(q.dataVencimento), formatDate(q.dataPagamento)]),
    ...despesas.map(d => ['Despesa', d.descricao ?? '', formatMoney(d.valor ?? 0), d.categoria ?? '', formatDate(d.data), '']),
  ];

  await gerarRelatorioPDF({
    titulo:    `Fluxo de Caixa — ${now.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}`,
    descricao: 'Receitas (quotas) e despesas do mês actual.',
    geradoPor,
    secoes: [{
      titulo: 'Resumo do Mês',
      kpis: [
        { label: 'Receita',   valor: formatMoney(receita)   },
        { label: 'Despesas',  valor: formatMoney(despTotal) },
        { label: 'Margem',    valor: formatMoney(margem)    },
        { label: 'Margem %',  valor: receita > 0 ? `${((margem / receita) * 100).toFixed(1)}%` : '—' },
      ],
      tabela: {
        headers: ['Tipo', 'Descrição', 'Valor (Kz)', 'Estado/Categoria', 'Data Vencimento', 'Data Pagamento'],
        rows,
      },
    }],
  });
}

async function exportarInadimplencia(condoId: string, geradoPor: string) {
  const snap = await getDocs(query(
    collection(db, 'quotas'),
    where('condominioId', '==', condoId),
    where('status', 'in', ['pendente', 'atrasado']),
    orderBy('dataVencimento', 'asc'),
  ));

  const docs = snap.docs.map(d => d.data());
  const totalDevido    = docs.reduce((s, q) => s + (q.valor ?? 0), 0);
  const totalAtrasados = docs.filter(q => q.status === 'atrasado').length;
  const totalPendentes = docs.filter(q => q.status === 'pendente').length;

  await gerarRelatorioPDF({
    titulo:    'Relatório de Inadimplência',
    descricao: 'Quotas pendentes e atrasadas por morador.',
    geradoPor,
    secoes: [{
      titulo: 'Resumo de Inadimplência',
      kpis: [
        { label: 'Total em Dívida', valor: formatMoney(totalDevido)    },
        { label: 'Atrasados',       valor: String(totalAtrasados)      },
        { label: 'Pendentes',       valor: String(totalPendentes)      },
        { label: 'Total de Casos',  valor: String(docs.length)         },
      ],
      tabela: {
        headers: ['Morador', 'Unidade', 'Mês/Ano', 'Valor (Kz)', 'Estado', 'Vencimento'],
        rows: docs.map(q => [q.moradorNome ?? '—', q.unidadeNumero ?? '—', `${q.mes}/${q.ano}`, formatMoney(q.valor ?? 0), q.status === 'atrasado' ? 'Atrasado' : 'Pendente', formatDate(q.dataVencimento)]),
      },
    }],
  });
}

async function exportarMoradores(condoId: string, geradoPor: string) {
  const snap = await getDocs(query(
    collection(db, 'moradores'),
    where('condominioId', '==', condoId),
    orderBy('unidadeNumero', 'asc'),
  ));

  const docs = snap.docs.map(d => d.data());
  const proprietarios = docs.filter(m => m.tipo === 'proprietario').length;
  const inquilinos    = docs.filter(m => m.tipo === 'inquilino').length;
  const ativos        = docs.filter(m => m.status === 'ativo').length;
  const inadimplentes = docs.filter(m => m.status === 'inadimplente').length;

  await gerarRelatorioPDF({
    titulo:    'Relatório de Moradores',
    descricao: 'Lista completa de moradores e suas unidades.',
    geradoPor,
    secoes: [{
      titulo: 'Resumo de Moradores',
      kpis: [
        { label: 'Total',         valor: String(docs.length)    },
        { label: 'Proprietários', valor: String(proprietarios)  },
        { label: 'Inquilinos',    valor: String(inquilinos)     },
        { label: 'Ativos',        valor: String(ativos)         },
        { label: 'Inadimplentes', valor: String(inadimplentes)  },
      ],
      tabela: {
        headers: ['Nome', 'Email', 'Telefone', 'Unidade', 'Bloco', 'Tipo', 'Estado', 'Data Entrada'],
        rows: docs.map(m => [m.nome ?? '—', m.email ?? '—', m.telefone ?? '—', m.unidadeNumero ?? '—', m.bloco ?? '—', m.tipo === 'proprietario' ? 'Proprietário' : 'Inquilino', m.status ?? '—', formatDate(m.dataEntrada)]),
      },
    }],
  });
}

async function exportarUnidades(condoId: string, geradoPor: string) {
  const snap = await getDocs(query(
    collection(db, 'unidades'),
    where('condominioId', '==', condoId),
    orderBy('numero', 'asc'),
  ));

  const docs    = snap.docs.map(d => d.data());
  const ocupadas = docs.filter(u => u.status === 'ocupada').length;
  const vagas    = docs.filter(u => u.status === 'vaga').length;
  const reforma  = docs.filter(u => u.status === 'em_reforma').length;

  await gerarRelatorioPDF({
    titulo:    'Situação das Unidades',
    descricao: 'Ocupação, vagas e estado de todas as unidades.',
    geradoPor,
    secoes: [{
      titulo: 'Resumo de Unidades',
      kpis: [
        { label: 'Total',      valor: String(docs.length) },
        { label: 'Ocupadas',   valor: String(ocupadas)    },
        { label: 'Vagas',      valor: String(vagas)       },
        { label: 'Em Reforma', valor: String(reforma)     },
        { label: 'Ocupação',   valor: docs.length > 0 ? `${((ocupadas / docs.length) * 100).toFixed(1)}%` : '—' },
      ],
      tabela: {
        headers: ['Número', 'Bloco', 'Tipo', 'Área (m²)', 'Estado', 'Quota Individual (Kz)'],
        rows: docs.map(u => [u.numero ?? '—', u.bloco ?? '—', u.tipo ?? '—', u.area ?? '—', u.status ?? '—', u.quotaIndividual ? formatMoney(u.quotaIndividual) : '—']),
      },
    }],
  });
}

async function exportarDespesas(condoId: string, geradoPor: string) {
  const snap = await getDocs(query(
    collection(db, 'despesas'),
    where('condominioId', '==', condoId),
    orderBy('data', 'desc'),
  ));

  const docs  = snap.docs.map(d => d.data());
  const total = docs.reduce((s, d) => s + (d.valor ?? 0), 0);
  const porCat: Record<string, number> = {};
  docs.forEach(d => { porCat[d.categoria] = (porCat[d.categoria] ?? 0) + (d.valor ?? 0); });
  const topCat = Object.entries(porCat).sort((a, b) => b[1] - a[1]).slice(0, 4);

  await gerarRelatorioPDF({
    titulo:    'Despesas Operacionais',
    descricao: 'Todos os custos registados no condomínio.',
    geradoPor,
    secoes: [{
      titulo: 'Resumo de Despesas',
      kpis: [
        { label: 'Total Geral', valor: formatMoney(total) },
        ...topCat.map(([cat, val]) => ({ label: cat.charAt(0).toUpperCase() + cat.slice(1), valor: formatMoney(val) })),
      ],
      tabela: {
        headers: ['Descrição', 'Categoria', 'Valor (Kz)', 'Fornecedor', 'Data', 'Registado por'],
        rows: docs.map(d => [d.descricao ?? '—', d.categoria ?? '—', formatMoney(d.valor ?? 0), d.fornecedor ?? '—', formatDate(d.data), d.registadoPorNome ?? '—']),
      },
    }],
  });
}

async function exportarAnual(condoId: string, geradoPor: string) {
  const ano = new Date().getFullYear();

  const [quotasSnap, despesasSnap] = await Promise.all([
    getDocs(query(collection(db, 'quotas'), where('condominioId', '==', condoId), where('ano', '==', ano), orderBy('mes', 'asc'))),
    getDocs(query(collection(db, 'despesas'), where('condominioId', '==', condoId), orderBy('data', 'asc'))),
  ]);

  const porMes: Record<number, { receita: number; despesas: number }> = {};
  for (let m = 1; m <= 12; m++) porMes[m] = { receita: 0, despesas: 0 };

  quotasSnap.docs.forEach(d => {
    const q = d.data();
    if (q.status === 'pago') porMes[q.mes].receita += q.valor ?? 0;
  });

  despesasSnap.docs.forEach(d => {
    const dep  = d.data();
    const data = dep.data?.toDate?.();
    if (data && data.getFullYear() === ano) {
      porMes[data.getMonth() + 1].despesas += dep.valor ?? 0;
    }
  });

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const receitaTotal  = Object.values(porMes).reduce((s, m) => s + m.receita, 0);
  const despesasTotal = Object.values(porMes).reduce((s, m) => s + m.despesas, 0);
  const margemTotal   = receitaTotal - despesasTotal;

  await gerarRelatorioPDF({
    titulo:    `Relatório Anual ${ano}`,
    descricao: `Balanço mensal de receitas, despesas e margem do ano ${ano}.`,
    geradoPor,
    secoes: [{
      titulo: `Balanço ${ano}`,
      kpis: [
        { label: 'Receita Total',  valor: formatMoney(receitaTotal)  },
        { label: 'Despesas Total', valor: formatMoney(despesasTotal) },
        { label: 'Margem Total',   valor: formatMoney(margemTotal)   },
        { label: 'Margem %',       valor: receitaTotal > 0 ? `${((margemTotal / receitaTotal) * 100).toFixed(1)}%` : '—' },
      ],
      tabela: {
        headers: ['Mês', 'Receita (Kz)', 'Despesas (Kz)', 'Margem (Kz)', 'Margem (%)'],
        rows: Object.entries(porMes).map(([mes, v]) => [
          meses[Number(mes) - 1],
          formatMoney(v.receita),
          formatMoney(v.despesas),
          formatMoney(v.receita - v.despesas),
          v.receita > 0 ? `${(((v.receita - v.despesas) / v.receita) * 100).toFixed(1)}%` : '—',
        ]),
      },
    }],
  });
}

// ─── Página ───────────────────────────────────────────────────────────────────

interface Relatorio {
  id: string;
  titulo: string;
  descricao: string;
  icon: React.ReactNode;
  cor: string;
  exportFn: (condoId: string, geradoPor: string) => Promise<void>;
}

export default function RelatoriosPage() {
  const { condoId } = useParams() as { condoId: string };
  const { userData } = useAuthContext();
  const [exporting, setExporting] = useState<string | null>(null);

  const geradoPor = userData?.nome ?? 'Síndico';

  const relatorios: Relatorio[] = [
    {
      id: 'fluxo-mensal',
      titulo: 'Fluxo de Caixa Mensal',
      descricao: 'Receitas (quotas) e despesas do mês actual',
      icon: <BarChart3 size={20} />,
      cor: 'text-blue-500 bg-blue-50 border-blue-100',
      exportFn: exportarFluxoMensal,
    },
    {
      id: 'inadimplencia',
      titulo: 'Relatório de Inadimplência',
      descricao: 'Quotas pendentes e atrasadas por morador',
      icon: <TrendingUp size={20} />,
      cor: 'text-red-500 bg-red-50 border-red-100',
      exportFn: exportarInadimplencia,
    },
    {
      id: 'moradores',
      titulo: 'Relatório de Moradores',
      descricao: 'Lista completa de moradores e suas unidades',
      icon: <Users size={20} />,
      cor: 'text-emerald-500 bg-emerald-50 border-emerald-100',
      exportFn: exportarMoradores,
    },
    {
      id: 'unidades',
      titulo: 'Situação das Unidades',
      descricao: 'Ocupação, vagas e estado das unidades',
      icon: <Home size={20} />,
      cor: 'text-orange-500 bg-orange-50 border-orange-100',
      exportFn: exportarUnidades,
    },
    {
      id: 'despesas',
      titulo: 'Despesas Operacionais',
      descricao: 'Todos os custos registados no condomínio',
      icon: <TrendingDown size={20} />,
      cor: 'text-rose-500 bg-rose-50 border-rose-100',
      exportFn: exportarDespesas,
    },
    {
      id: 'anual',
      titulo: 'Relatório Anual',
      descricao: 'Balanço mensal de receitas, despesas e margem',
      icon: <FileText size={20} />,
      cor: 'text-purple-500 bg-purple-50 border-purple-100',
      exportFn: exportarAnual,
    },
  ];

  const handleExport = async (r: Relatorio) => {
    setExporting(r.id);
    try {
      await r.exportFn(condoId, geradoPor);
      toast.success(`"${r.titulo}" exportado com sucesso.`);
    } catch (e: any) {
      console.error(e);
      toast.error(`Erro ao gerar relatório: ${e?.message ?? 'tente novamente.'}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">

      {/* Voltar */}
      <Link
        href={`/dashboard/condominio/${condoId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-100">
          <FileText size={20} className="text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Relatórios</h1>
          <p className="text-sm text-zinc-500">Gera e exporta relatórios do condomínio em PDF</p>
        </div>
      </div>

      {/* Grid de relatórios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {relatorios.map(r => (
          <div
            key={r.id}
            className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
          >
            {/* Ícone + botão */}
            <div className="flex items-start justify-between mb-5">
              <div className={`p-3 rounded-xl border ${r.cor}`}>
                {r.icon}
              </div>
              <button
                disabled={!!exporting}
                onClick={() => handleExport(r)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 shadow-sm"
              >
                {exporting === r.id
                  ? <><Loader2 size={13} className="animate-spin" />A gerar...</>
                  : <><Download size={13} />Exportar PDF</>
                }
              </button>
            </div>

            {/* Texto */}
            <h3 className="text-sm font-bold text-zinc-900 mb-1">{r.titulo}</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">{r.descricao}</p>

            {/* Badge */}
            <div className="mt-4 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-500 text-xs font-semibold rounded-full">
                <FileText size={10} />
                PDF
              </span>
              <span className="text-xs text-zinc-400">Dados em tempo real</span>
            </div>
          </div>
        ))}
      </div>

      {/* Nota */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 flex items-start gap-3">
        <BarChart3 size={18} className="text-zinc-400 shrink-0 mt-0.5" />
        <p className="text-sm text-zinc-500 leading-relaxed">
          Os relatórios são gerados com os dados actuais do Firestore e exportados em PDF com capa, cabeçalho, rodapé e tabelas estilizadas.
          Cada relatório inclui um ID único de rastreabilidade.
        </p>
      </div>

    </main>
  );
}
