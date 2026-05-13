import { db } from './firebase';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { getQueryCache, CACHE_TTL } from './queryCache';

/* =====================================================
   TYPES
===================================================== */

export interface PortfolioResumo {
  receitaTotalMes:        number;
  receitaTotalGeral:      number;
  totalAtrasado:          number;
  totalPendente:          number;
  taxaMediaInadimplencia: number;
  totalPagamentosMes:     number;
  // Novos campos
  despesasTotalMes:       number;
  margemLiquidaMes:       number;
  margemPercentMes:       number;
}

/* =====================================================
   HELPERS
===================================================== */

const chunkArray = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/* =====================================================
   CONSOLIDAÇÃO GLOBAL DO PORTFÓLIO
   Lê de `quotas` (receita) e `despesas` (custos)
===================================================== */

export const getPortfolioFinanceiro = async (
  condominioIds: string[]
): Promise<PortfolioResumo> => {

  if (!condominioIds.length) {
    return {
      receitaTotalMes:        0,
      receitaTotalGeral:      0,
      totalAtrasado:          0,
      totalPendente:          0,
      taxaMediaInadimplencia: 0,
      totalPagamentosMes:     0,
      despesasTotalMes:       0,
      margemLiquidaMes:       0,
      margemPercentMes:       0,
    };
  }

  const cache    = getQueryCache();
  const cacheKey = `portfolio-financeiro:${[...condominioIds].sort().join(',')}`;

  return cache.get(cacheKey, CACHE_TTL.QUOTAS, async () => {

  const now       = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const fimMes    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const chunks = chunkArray(condominioIds, 30);

  // Buscar quotas e despesas em paralelo
  const [quotaSnaps, despesaSnaps] = await Promise.all([
    Promise.all(chunks.map(chunk =>
      getDocs(query(collection(db, 'quotas'), where('condominioId', 'in', chunk)))
    )),
    Promise.all(chunks.map(chunk =>
      getDocs(query(collection(db, 'despesas'), where('condominioId', 'in', chunk)))
    )),
  ]);

  const quotas   = quotaSnaps.flatMap(s => s.docs.map(d => d.data()));
  const despesas = despesaSnaps.flatMap(s => s.docs.map(d => d.data()));

  let receitaTotalMes    = 0;
  let receitaTotalGeral  = 0;
  let totalAtrasado      = 0;
  let totalPendente      = 0;
  let totalPagamentosMes = 0;
  let atrasadosMes       = 0;
  let despesasTotalMes   = 0;

  // ── Quotas ──────────────────────────────────────────────────────
  quotas.forEach(q => {
    const valor  = q.valor ?? 0;
    const pag    = q.dataPagamento?.toDate?.();
    const status = q.status as string;

    if (status === 'pago') {
      receitaTotalGeral += valor;
    }

    if (status === 'pago' && pag && pag >= inicioMes && pag <= fimMes) {
      receitaTotalMes += valor;
    }

    const pertenceAoMes = q.mes === now.getMonth() + 1 && q.ano === now.getFullYear();
    if (pertenceAoMes) {
      totalPagamentosMes++;
      if (status === 'atrasado') {
        atrasadosMes++;
        totalAtrasado += valor;
      }
      if (status === 'pendente') {
        totalPendente += valor;
      }
    }
  });

  // ── Despesas do mês ─────────────────────────────────────────────
  despesas.forEach(d => {
    const data = d.data?.toDate?.();
    if (data && data >= inicioMes && data <= fimMes) {
      despesasTotalMes += d.valor ?? 0;
    }
  });

  // ── Margem ──────────────────────────────────────────────────────
  const margemLiquidaMes  = receitaTotalMes - despesasTotalMes;
  const margemPercentMes  = receitaTotalMes > 0
    ? (margemLiquidaMes / receitaTotalMes) * 100
    : 0;

  const taxaMediaInadimplencia =
    totalPagamentosMes > 0
      ? (atrasadosMes / totalPagamentosMes) * 100
      : 0;

  return {
    receitaTotalMes,
    receitaTotalGeral,
    totalAtrasado,
    totalPendente,
    taxaMediaInadimplencia,
    totalPagamentosMes,
    despesasTotalMes,
    margemLiquidaMes,
    margemPercentMes,
  };
  }); // fim cache.get
};
