'use client';

import { useState } from 'react';
import {
  FileText, Download, BarChart3, TrendingUp, Users,
  Building2, Loader2, ShieldCheck, DollarSign, TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { gerarRelatorioPDF } from '@/lib/pdf/gerarRelatorio';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Geradores de relatório ───────────────────────────────────────────────────

// Helpers para chunking (limite Firestore 'in' = 30)
function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function getCondoMap(condoIds: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const chunks = chunkArray(condoIds, 30);
  for (const chunk of chunks) {
    const snap = await getDocs(query(collection(db, 'condominios'), where('__name__', 'in', chunk)));
    snap.docs.forEach(d => { map[d.id] = d.data().nome ?? d.id; });
  }
  return map;
}

async function gerarCondominios(geradoPor: string, condoIds: string[] | null) {
  let snap;
  if (condoIds === null) {
    snap = await getDocs(collection(db, 'condominios'));
  } else {
    const chunks = chunkArray(condoIds, 30);
    const snaps = await Promise.all(chunks.map(ch =>
      getDocs(query(collection(db, 'condominios'), where('__name__', 'in', ch)))
    ));
    const docs = snaps.flatMap(s => s.docs);
    snap = { docs };
  }
  const docs = snap.docs.map(d => d.data());

  const ativos   = docs.filter(c => c.status === 'active').length;
  const inativos = docs.filter(c => c.status !== 'active').length;
  const totalUnidades = docs.reduce((s, c) => s + (c.totalUnidades ?? 0), 0);

  gerarRelatorioPDF({
    titulo:    'Condomínios',
    descricao: 'Lista de condomínios do seu portfólio.',
    geradoPor,
    secoes: [
      {
        titulo: 'Resumo Geral',
        kpis: [
          { label: 'Total',          valor: String(docs.length) },
          { label: 'Ativos',         valor: String(ativos) },
          { label: 'Inativos',       valor: String(inativos) },
          { label: 'Total Unidades', valor: String(totalUnidades) },
        ],
        tabela: {
          headers: ['Nome', 'Cidade', 'Província', 'Unidades', 'Estado', 'NIF'],
          rows: docs.map(c => [
            c.nome ?? '—', c.endereco?.cidade ?? '—', c.endereco?.provincia ?? '—',
            c.totalUnidades ?? 0, c.status === 'active' ? 'Ativo' : 'Inativo', c.cnpj ?? '—',
          ]),
        },
      },
    ],
  });
}

async function gerarUtilizadores(geradoPor: string, condoIds: string[] | null) {
  let docs: any[];
  if (condoIds === null) {
    const snap = await getDocs(collection(db, 'usuarios'));
    docs = snap.docs.map(d => d.data());
  } else {
    const chunks = chunkArray(condoIds, 30);
    const [snapsDireto, snapsGestor] = await Promise.all([
      Promise.all(chunks.map(ch => getDocs(query(collection(db, 'usuarios'), where('condominioId', 'in', ch))))),
      Promise.all(chunks.map(ch => getDocs(query(collection(db, 'usuarios'), where('condominiosGeridos', 'array-contains-any', ch))))),
    ]);
    const mapa = new Map<string, any>();
    [...snapsDireto, ...snapsGestor].flatMap(s => s.docs).forEach(d => mapa.set(d.id, d.data()));
    docs = Array.from(mapa.values()).filter(u => u.role !== 'super_admin');
  }

  const porRole: Record<string, number> = {};
  docs.forEach(u => { porRole[u.role] = (porRole[u.role] ?? 0) + 1; });

  gerarRelatorioPDF({
    titulo:    'Utilizadores',
    descricao: 'Utilizadores do seu portfólio.',
    geradoPor,
    secoes: [{
      titulo: 'Resumo por Perfil',
      kpis: [
        { label: 'Total',        valor: String(docs.length) },
        { label: 'Admins',       valor: String(porRole['admin']       ?? 0) },
        { label: 'Gestores',     valor: String(porRole['gestor']      ?? 0) },
        { label: 'Síndicos',     valor: String(porRole['sindico']     ?? 0) },
        { label: 'Funcionários', valor: String(porRole['funcionario'] ?? 0) },
        { label: 'Moradores',    valor: String(porRole['morador']     ?? 0) },
        { label: 'Ativos',       valor: String(docs.filter(u => u.status === 'ativo').length) },
        { label: 'Pendentes',    valor: String(docs.filter(u => u.status === 'pendente').length) },
      ],
      tabela: {
        headers: ['Nome', 'Email', 'Perfil', 'Estado', 'Telefone', 'Criado em'],
        rows: docs.map(u => [u.nome ?? '—', u.email ?? '—', u.role ?? '—', u.status ?? '—', u.telefone ?? '—', formatDate(u.createdAt)]),
      },
    }],
  });
}

async function gerarFinanceiroGlobal(geradoPor: string, condoIds: string[] | null) {
  const ano = new Date().getFullYear();
  let docs: any[];
  if (condoIds === null) {
    const snap = await getDocs(query(collection(db, 'quotas'), where('ano', '==', ano)));
    docs = snap.docs.map(d => d.data());
  } else {
    const chunks = chunkArray(condoIds, 30);
    const snaps = await Promise.all(chunks.map(ch =>
      getDocs(query(collection(db, 'quotas'), where('condominioId', 'in', ch), where('ano', '==', ano)))
    ));
    docs = snaps.flatMap(s => s.docs.map(d => d.data()));
  }

  const condoMap = await getCondoMap(condoIds ?? [...new Set(docs.map(q => q.condominioId).filter(Boolean))]);
  const totalReceita  = docs.filter(q => q.status === 'pago').reduce((s, q) => s + (q.valor ?? 0), 0);
  const totalAtrasado = docs.filter(q => q.status === 'atrasado').reduce((s, q) => s + (q.valor ?? 0), 0);
  const totalPendente = docs.filter(q => q.status === 'pendente').reduce((s, q) => s + (q.valor ?? 0), 0);
  const taxaInad = docs.length > 0 ? ((docs.filter(q => q.status === 'atrasado').length / docs.length) * 100).toFixed(1) : '0.0';

  gerarRelatorioPDF({
    titulo: `Financeiro ${ano}`, descricao: `Quotas do ano ${ano}.`, geradoPor,
    secoes: [{
      titulo: `Resumo — ${ano}`,
      kpis: [
        { label: 'Total Recebido',     valor: formatMoney(totalReceita) },
        { label: 'Total em Atraso',    valor: formatMoney(totalAtrasado) },
        { label: 'Total Pendente',     valor: formatMoney(totalPendente) },
        { label: 'Taxa Inadimplência', valor: `${taxaInad}%` },
      ],
      tabela: {
        headers: ['Condomínio', 'Morador', 'Unidade', 'Mês/Ano', 'Valor', 'Estado', 'Pago em'],
        rows: docs.map(q => [condoMap[q.condominioId] ?? '—', q.moradorNome ?? '—', q.unidadeNumero ?? '—', `${q.mes}/${q.ano}`, formatMoney(q.valor ?? 0), q.status ?? '—', formatDate(q.dataPagamento)]),
      },
    }],
  });
}

async function gerarInadimplenciaGlobal(geradoPor: string, condoIds: string[] | null) {
  let docs: any[];
  if (condoIds === null) {
    const snap = await getDocs(query(collection(db, 'quotas'), where('status', 'in', ['pendente', 'atrasado'])));
    docs = snap.docs.map(d => d.data());
  } else {
    const chunks = chunkArray(condoIds, 30);
    const snaps = await Promise.all(chunks.map(ch =>
      getDocs(query(collection(db, 'quotas'), where('condominioId', 'in', ch), where('status', 'in', ['pendente', 'atrasado'])))
    ));
    docs = snaps.flatMap(s => s.docs.map(d => d.data()));
  }

  const condoMap = await getCondoMap(condoIds ?? [...new Set(docs.map(q => q.condominioId).filter(Boolean))]);
  const totalDevido = docs.reduce((s, q) => s + (q.valor ?? 0), 0);

  gerarRelatorioPDF({
    titulo: 'Inadimplência', descricao: 'Quotas pendentes e atrasadas.', geradoPor,
    secoes: [{
      titulo: 'Resumo',
      kpis: [
        { label: 'Total em Dívida', valor: formatMoney(totalDevido) },
        { label: 'Atrasados',       valor: String(docs.filter(q => q.status === 'atrasado').length) },
        { label: 'Pendentes',       valor: String(docs.filter(q => q.status === 'pendente').length) },
        { label: 'Total de Casos',  valor: String(docs.length) },
      ],
      tabela: {
        headers: ['Condomínio', 'Morador', 'Unidade', 'Mês/Ano', 'Valor', 'Estado', 'Vencimento'],
        rows: docs.map(q => [condoMap[q.condominioId] ?? '—', q.moradorNome ?? '—', q.unidadeNumero ?? '—', `${q.mes}/${q.ano}`, formatMoney(q.valor ?? 0), q.status === 'atrasado' ? 'Atrasado' : 'Pendente', formatDate(q.dataVencimento)]),
      },
    }],
  });
}

async function gerarDespesasGlobal(geradoPor: string, condoIds: string[] | null) {
  let docs: any[];
  if (condoIds === null) {
    const snap = await getDocs(collection(db, 'despesas'));
    docs = snap.docs.map(d => d.data());
  } else {
    const chunks = chunkArray(condoIds, 30);
    const snaps = await Promise.all(chunks.map(ch =>
      getDocs(query(collection(db, 'despesas'), where('condominioId', 'in', ch)))
    ));
    docs = snaps.flatMap(s => s.docs.map(d => d.data()));
  }

  const condoMap = await getCondoMap(condoIds ?? [...new Set(docs.map(d => d.condominioId).filter(Boolean))]);
  const total = docs.reduce((s, d) => s + (d.valor ?? 0), 0);
  const porCat: Record<string, number> = {};
  docs.forEach(d => { porCat[d.categoria] = (porCat[d.categoria] ?? 0) + (d.valor ?? 0); });
  const topCat = Object.entries(porCat).sort((a, b) => b[1] - a[1]).slice(0, 4);

  gerarRelatorioPDF({
    titulo: 'Despesas Operacionais', descricao: 'Custos registados no seu portfólio.', geradoPor,
    secoes: [{
      titulo: 'Resumo',
      kpis: [{ label: 'Total Geral', valor: formatMoney(total) }, ...topCat.map(([cat, val]) => ({ label: cat.charAt(0).toUpperCase() + cat.slice(1), valor: formatMoney(val) }))],
      tabela: {
        headers: ['Condomínio', 'Descrição', 'Categoria', 'Valor', 'Fornecedor', 'Data'],
        rows: docs.map(d => [condoMap[d.condominioId] ?? '—', d.descricao ?? '—', d.categoria ?? '—', formatMoney(d.valor ?? 0), d.fornecedor ?? '—', formatDate(d.data)]),
      },
    }],
  });
}

async function gerarAuditLog(geradoPor: string, condoIds: string[] | null, actorId: string | null) {
  let docs: any[];
  if (condoIds === null) {
    // super_admin — tudo
    const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc')));
    docs = snap.docs.map(d => d.data());
  } else {
    // admin scoped — as suas ações + ações nos seus condomínios
    const mapa = new Map<string, any>();
    const promises: Promise<any>[] = [];

    if (actorId) {
      promises.push(
        getDocs(query(collection(db, 'audit_logs'), where('actorId', '==', actorId), orderBy('createdAt', 'desc')))
          .then(s => s.docs.forEach(d => mapa.set(d.id, d.data())))
      );
    }
    const chunks = chunkArray(condoIds, 30);
    for (const ch of chunks) {
      promises.push(
        getDocs(query(collection(db, 'audit_logs'), where('condominioId', 'in', ch), orderBy('createdAt', 'desc')))
          .then(s => s.docs.forEach(d => mapa.set(d.id, d.data())))
      );
    }
    await Promise.all(promises);
    docs = Array.from(mapa.values()).sort((a, b) => {
      const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
      const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
      return tb - ta;
    });
  }

  const porCat: Record<string, number> = {};
  docs.forEach(l => { porCat[l.categoria] = (porCat[l.categoria] ?? 0) + 1; });

  gerarRelatorioPDF({
    titulo: 'Audit Log', descricao: 'Histórico de ações no sistema.', geradoPor,
    secoes: [{
      titulo: 'Resumo de Atividade',
      kpis: [{ label: 'Total de Registos', valor: String(docs.length) }, ...Object.entries(porCat).slice(0, 7).map(([cat, n]) => ({ label: cat.charAt(0).toUpperCase() + cat.slice(1), valor: String(n) }))],
      tabela: {
        headers: ['Data', 'Utilizador', 'Perfil', 'Categoria', 'Acção', 'Descrição'],
        rows: docs.map(l => [formatDate(l.createdAt), l.actorNome ?? '—', l.actorRole ?? '—', l.categoria ?? '—', l.accao ?? '—', (l.descricao ?? '—').slice(0, 60)]),
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
  exportFn: (geradoPor: string, condoIds: string[] | null, actorId: string | null) => Promise<void>;
}

export default function RelatoriosAdminPage() {
  const { userData } = useAuthContext();
  const [exporting, setExporting] = useState<string | null>(null);

  const geradoPor = userData?.nome ?? 'Administrador';

  // super_admin → condoIds = null (sem filtro)
  // admin scoped → condoIds = condominiosGeridos
  const isSuperAdmin = userData?.role === 'super_admin';
  const condoIds: string[] | null = isSuperAdmin
    ? null
    : (userData?.condominiosGeridos ?? []);
  const actorId = userData?.uid ?? null;

  const relatorios: Relatorio[] = [
    {
      id: 'condominios',
      titulo: 'Condomínios',
      descricao: 'Lista com estado, localização e unidades do seu portfólio',
      icon: <Building2 size={22} />,
      cor: 'text-orange-500 bg-orange-50 border-orange-100',
      exportFn: gerarCondominios,
    },
    {
      id: 'utilizadores',
      titulo: 'Utilizadores',
      descricao: 'Utilizadores com perfil, estado e condomínio',
      icon: <Users size={22} />,
      cor: 'text-blue-500 bg-blue-50 border-blue-100',
      exportFn: gerarUtilizadores,
    },
    {
      id: 'financeiro-global',
      titulo: 'Financeiro',
      descricao: 'Quotas do ano corrente no seu portfólio',
      icon: <DollarSign size={22} />,
      cor: 'text-emerald-500 bg-emerald-50 border-emerald-100',
      exportFn: gerarFinanceiroGlobal,
    },
    {
      id: 'inadimplencia-global',
      titulo: 'Inadimplência',
      descricao: 'Quotas pendentes e atrasadas no seu portfólio',
      icon: <TrendingUp size={22} />,
      cor: 'text-red-500 bg-red-50 border-red-100',
      exportFn: gerarInadimplenciaGlobal,
    },
    {
      id: 'despesas-global',
      titulo: 'Despesas Operacionais',
      descricao: 'Custos registados no seu portfólio',
      icon: <TrendingDown size={22} />,
      cor: 'text-rose-500 bg-rose-50 border-rose-100',
      exportFn: gerarDespesasGlobal,
    },
    {
      id: 'audit-log',
      titulo: 'Audit Log',
      descricao: 'Histórico de ações suas e dos seus condomínios',
      icon: <ShieldCheck size={22} />,
      cor: 'text-purple-500 bg-purple-50 border-purple-100',
      exportFn: gerarAuditLog,
    },
  ];

  const handleExport = async (r: Relatorio) => {
    setExporting(r.id);
    try {
      await r.exportFn(geradoPor, condoIds, actorId);
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

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-100">
          <FileText size={20} className="text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Relatórios da Plataforma</h1>
          <p className="text-sm text-zinc-500">Gera e exporta relatórios em PDF com design profissional</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {relatorios.map(r => (
          <div
            key={r.id}
            className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group"
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

            {/* Badge PDF */}
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
