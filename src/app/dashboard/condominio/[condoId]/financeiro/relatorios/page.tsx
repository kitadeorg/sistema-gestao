'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, FileText, Download, BarChart3, TrendingUp, Users, Home, Loader2, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

// ─── Helpers CSV ──────────────────────────────────────────────────────────────

function escapeCsv(v: unknown): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map(r => r.map(escapeCsv).join(',')),
  ];
  return lines.join('\n');
}

function downloadCsv(csv: string, filename: string) {
  const bom = '\uFEFF'; // UTF-8 BOM para Excel
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-PT');
}

function formatMoney(v: number): string {
  return v.toLocaleString('pt-AO');
}

// ─── Geradores de relatório ───────────────────────────────────────────────────

async function exportarFluxoMensal(condoId: string) {
  const now = new Date();
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const fim    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [quotasSnap, despesasSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'quotas'),
      where('condominioId', '==', condoId),
      orderBy('dataVencimento', 'desc'),
    )),
    getDocs(query(
      collection(db, 'despesas'),
      where('condominioId', '==', condoId),
      orderBy('data', 'desc'),
    )),
  ]);

  const rows: unknown[][] = [];

  quotasSnap.docs.forEach(d => {
    const q = d.data();
    rows.push([
      'Receita',
      `Quota ${q.moradorNome ?? ''} - Unidade ${q.unidadeNumero ?? ''}`,
      formatMoney(q.valor ?? 0),
      q.status,
      formatDate(q.dataVencimento),
      formatDate(q.dataPagamento),
    ]);
  });

  despesasSnap.docs.forEach(d => {
    const dep = d.data();
    rows.push([
      'Despesa',
      dep.descricao ?? '',
      formatMoney(dep.valor ?? 0),
      dep.categoria ?? '',
      formatDate(dep.data),
      '',
    ]);
  });

  const csv = buildCsv(
    ['Tipo', 'Descrição', 'Valor (Kz)', 'Estado/Categoria', 'Data Vencimento/Despesa', 'Data Pagamento'],
    rows,
  );
  downloadCsv(csv, `fluxo-caixa-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.csv`);
}

async function exportarInadimplencia(condoId: string) {
  const snap = await getDocs(query(
    collection(db, 'quotas'),
    where('condominioId', '==', condoId),
    where('status', 'in', ['pendente', 'atrasado']),
    orderBy('dataVencimento', 'asc'),
  ));

  const rows = snap.docs.map(d => {
    const q = d.data();
    return [
      q.moradorNome ?? '',
      q.unidadeNumero ?? '',
      `${q.mes}/${q.ano}`,
      formatMoney(q.valor ?? 0),
      q.status,
      formatDate(q.dataVencimento),
    ];
  });

  const csv = buildCsv(
    ['Morador', 'Unidade', 'Mês/Ano', 'Valor (Kz)', 'Estado', 'Vencimento'],
    rows,
  );
  downloadCsv(csv, `inadimplencia-${new Date().toISOString().split('T')[0]}.csv`);
}

async function exportarMoradores(condoId: string) {
  const snap = await getDocs(query(
    collection(db, 'moradores'),
    where('condominioId', '==', condoId),
    orderBy('unidadeNumero', 'asc'),
  ));

  const rows = snap.docs.map(d => {
    const m = d.data();
    return [
      m.nome ?? '',
      m.email ?? '',
      m.telefone ?? '',
      m.unidadeNumero ?? '',
      m.bloco ?? '',
      m.tipo ?? '',
      m.status ?? '',
      formatDate(m.dataEntrada),
    ];
  });

  const csv = buildCsv(
    ['Nome', 'Email', 'Telefone', 'Unidade', 'Bloco', 'Tipo', 'Estado', 'Data Entrada'],
    rows,
  );
  downloadCsv(csv, `moradores-${new Date().toISOString().split('T')[0]}.csv`);
}

async function exportarUnidades(condoId: string) {
  const snap = await getDocs(query(
    collection(db, 'unidades'),
    where('condominioId', '==', condoId),
    orderBy('numero', 'asc'),
  ));

  const rows = snap.docs.map(d => {
    const u = d.data();
    return [
      u.numero ?? '',
      u.bloco ?? '',
      u.tipo ?? '',
      u.area ?? '',
      u.status ?? '',
      u.quotaIndividual ? formatMoney(u.quotaIndividual) : '',
    ];
  });

  const csv = buildCsv(
    ['Número', 'Bloco', 'Tipo', 'Área (m²)', 'Estado', 'Quota Individual (Kz)'],
    rows,
  );
  downloadCsv(csv, `unidades-${new Date().toISOString().split('T')[0]}.csv`);
}

async function exportarDespesas(condoId: string) {
  const snap = await getDocs(query(
    collection(db, 'despesas'),
    where('condominioId', '==', condoId),
    orderBy('data', 'desc'),
  ));

  const rows = snap.docs.map(d => {
    const dep = d.data();
    return [
      dep.descricao ?? '',
      dep.categoria ?? '',
      formatMoney(dep.valor ?? 0),
      dep.fornecedor ?? '',
      formatDate(dep.data),
      dep.registadoPorNome ?? '',
    ];
  });

  const csv = buildCsv(
    ['Descrição', 'Categoria', 'Valor (Kz)', 'Fornecedor', 'Data', 'Registado por'],
    rows,
  );
  downloadCsv(csv, `despesas-${new Date().toISOString().split('T')[0]}.csv`);
}

async function exportarAnual(condoId: string) {
  const ano = new Date().getFullYear();

  const [quotasSnap, despesasSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'quotas'),
      where('condominioId', '==', condoId),
      where('ano', '==', ano),
      orderBy('mes', 'asc'),
    )),
    getDocs(query(
      collection(db, 'despesas'),
      where('condominioId', '==', condoId),
      orderBy('data', 'asc'),
    )),
  ]);

  // Agrupar por mês
  const porMes: Record<number, { receita: number; despesas: number }> = {};
  for (let m = 1; m <= 12; m++) porMes[m] = { receita: 0, despesas: 0 };

  quotasSnap.docs.forEach(d => {
    const q = d.data();
    if (q.status === 'pago') {
      porMes[q.mes].receita += q.valor ?? 0;
    }
  });

  despesasSnap.docs.forEach(d => {
    const dep = d.data();
    const data = dep.data?.toDate?.();
    if (data && data.getFullYear() === ano) {
      const mes = data.getMonth() + 1;
      porMes[mes].despesas += dep.valor ?? 0;
    }
  });

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const rows = Object.entries(porMes).map(([mes, v]) => [
    meses[Number(mes) - 1],
    formatMoney(v.receita),
    formatMoney(v.despesas),
    formatMoney(v.receita - v.despesas),
    v.receita > 0 ? `${(((v.receita - v.despesas) / v.receita) * 100).toFixed(1)}%` : '—',
  ]);

  const csv = buildCsv(
    ['Mês', 'Receita (Kz)', 'Despesas (Kz)', 'Margem (Kz)', 'Margem (%)'],
    rows,
  );
  downloadCsv(csv, `relatorio-anual-${ano}.csv`);
}

// ─── Página ───────────────────────────────────────────────────────────────────

interface Relatorio {
  id: string;
  titulo: string;
  descricao: string;
  icon: React.ReactNode;
  cor: string;
  exportFn: (condoId: string) => Promise<void>;
}

export default function RelatoriosPage() {
  const { condoId } = useParams() as { condoId: string };
  const [exporting, setExporting] = useState<string | null>(null);

  const relatorios: Relatorio[] = [
    {
      id: 'fluxo-mensal',
      titulo: 'Fluxo de Caixa Mensal',
      descricao: 'Receitas (quotas) e despesas do mês atual',
      icon: <BarChart3 size={20} />,
      cor: 'text-blue-500 bg-blue-50',
      exportFn: exportarFluxoMensal,
    },
    {
      id: 'inadimplencia',
      titulo: 'Relatório de Inadimplência',
      descricao: 'Quotas pendentes e atrasadas por morador',
      icon: <TrendingUp size={20} />,
      cor: 'text-red-500 bg-red-50',
      exportFn: exportarInadimplencia,
    },
    {
      id: 'moradores',
      titulo: 'Relatório de Moradores',
      descricao: 'Lista completa de moradores e suas unidades',
      icon: <Users size={20} />,
      cor: 'text-emerald-500 bg-emerald-50',
      exportFn: exportarMoradores,
    },
    {
      id: 'unidades',
      titulo: 'Situação das Unidades',
      descricao: 'Ocupação, vagas e estado das unidades',
      icon: <Home size={20} />,
      cor: 'text-orange-500 bg-orange-50',
      exportFn: exportarUnidades,
    },
    {
      id: 'despesas',
      titulo: 'Despesas Operacionais',
      descricao: 'Todos os custos registados no condomínio',
      icon: <TrendingDown size={20} />,
      cor: 'text-rose-500 bg-rose-50',
      exportFn: exportarDespesas,
    },
    {
      id: 'anual',
      titulo: 'Relatório Anual',
      descricao: 'Balanço mensal de receitas, despesas e margem',
      icon: <FileText size={20} />,
      cor: 'text-purple-500 bg-purple-50',
      exportFn: exportarAnual,
    },
  ];

  const handleExport = async (r: Relatorio) => {
    setExporting(r.id);
    try {
      await r.exportFn(condoId);
      toast.success(`${r.titulo} exportado com sucesso.`);
    } catch (e: any) {
      console.error(e);
      toast.error(`Erro ao exportar: ${e?.message ?? 'tente novamente.'}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <main className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-8 animate-in fade-in duration-500">

      <Link href={`/dashboard/condominio/${condoId}`} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition">
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      <div className="flex items-center gap-3">
        <FileText size={22} className="text-orange-500" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Relatórios</h1>
          <p className="text-sm text-zinc-500">Exporta relatórios do condomínio em CSV</p>
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
                disabled={exporting === r.id}
                onClick={() => handleExport(r)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-60"
              >
                {exporting === r.id
                  ? <><Loader2 size={12} className="animate-spin" />A exportar...</>
                  : <><Download size={12} />Exportar CSV</>
                }
              </button>
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-1">{r.titulo}</h3>
            <p className="text-xs text-zinc-500">{r.descricao}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-sm text-zinc-500">
        Os ficheiros CSV são compatíveis com Excel, Google Sheets e qualquer software de folha de cálculo. O encoding UTF-8 com BOM garante que os caracteres especiais (ã, ç, etc.) são exibidos correctamente.
      </div>

    </main>
  );
}
