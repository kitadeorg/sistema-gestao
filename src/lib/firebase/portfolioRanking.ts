import { db } from './firebase';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { getSatisfacaoScore } from './satisfacao';
import { getQueryCache, CACHE_TTL } from './queryCache';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface CondoPerformance {
  condominioId: string;
  // Financeiro
  receitaMes: number;
  totalAtrasado: number;
  taxaInadimplencia: number;
  // Manutenção
  ocorrenciasAbertas: number;
  ocorrenciasConcluidas: number;
  taxaResolucao: number;
  // Satisfação
  scoreSatisfacao: number;
  totalAvaliacoes: number;
  // Score composto
  performanceScore: number;
  scoreFinanceiro: number;
  scoreManutencao: number;
}

// ─────────────────────────────────────────────
// RANKING
// ─────────────────────────────────────────────

export const getPortfolioRanking = async (
  condominios: { id: string; nome?: string }[]
): Promise<CondoPerformance[]> => {
  if (!condominios.length) return [];

  const cache    = getQueryCache();
  const cacheKey = `portfolio-ranking:${condominios.map(c => c.id).sort().join(',')}`;

  return cache.get(cacheKey, CACHE_TTL.RANKING, async () => {

  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const fimMes    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Buscar quotas, ocorrências abertas e concluídas em paralelo por condomínio
  const resultados: CondoPerformance[] = await Promise.all(
    condominios.map(async condo => {
      const [quotasSnap, ocorrAbertas, ocorrConcluidas, scoreSatisfacao] = await Promise.all([
        getDocs(query(
          collection(db, 'quotas'),
          where('condominioId', '==', condo.id),
        )),
        getDocs(query(
          collection(db, 'ocorrencias'),
          where('condominioId', '==', condo.id),
          where('status', '==', 'aberta'),
        )),
        getDocs(query(
          collection(db, 'ocorrencias'),
          where('condominioId', '==', condo.id),
          where('status', 'in', ['concluida', 'encerrada']),
        )),
        getSatisfacaoScore(condo.id),
      ]);

      // ── Financeiro ──────────────────────────────────────────────
      let receitaMes    = 0;
      let totalAtrasado = 0;
      let totalMes      = 0;
      let atrasadosMes  = 0;

      quotasSnap.docs.forEach(doc => {
        const d      = doc.data();
        const pag    = d.dataPagamento?.toDate?.();
        const status = d.status as string;

        // Receita do mês — quotas pagas com dataPagamento no mês corrente
        if (status === 'pago' && pag && pag >= inicioMes && pag <= fimMes) {
          receitaMes += d.valor ?? 0;
        }

        // Quotas do mês corrente (para calcular inadimplência)
        const pertenceAoMes = d.mes === now.getMonth() + 1 && d.ano === now.getFullYear();
        if (pertenceAoMes) {
          totalMes++;
          if (status === 'atrasado') {
            atrasadosMes++;
            totalAtrasado += d.valor ?? 0;
          }
        }
      });

      const taxaInadimplencia = totalMes > 0 ? (atrasadosMes / totalMes) * 100 : 0;

      // ── Manutenção ──────────────────────────────────────────────
      const nAbertas    = ocorrAbertas.size;
      const nConcluidas = ocorrConcluidas.size;
      const totalOcorr  = nAbertas + nConcluidas;
      const taxaResolucao = totalOcorr > 0 ? (nConcluidas / totalOcorr) * 100 : 100;

      // ── Scores normalizados (0–100) ─────────────────────────────
      // Score financeiro: 100 = sem inadimplência, 0 = 100% inadimplência
      const scoreFinanceiro = Math.max(0, 100 - taxaInadimplencia);

      // Score manutenção: 100 = todas resolvidas e sem abertas, penaliza abertas
      const penalizacaoAbertas = Math.min(nAbertas * 5, 50);
      const scoreManutencao = Math.max(0, taxaResolucao - penalizacaoAbertas);

      // Score composto: 50% financeiro + 30% manutenção + 20% satisfação
      const performanceScore = scoreFinanceiro * 0.5 + scoreManutencao * 0.3 + scoreSatisfacao * 0.2;

      return {
        condominioId:          condo.id,
        receitaMes,
        totalAtrasado,
        taxaInadimplencia,
        ocorrenciasAbertas:    nAbertas,
        ocorrenciasConcluidas: nConcluidas,
        taxaResolucao,
        scoreSatisfacao,
        totalAvaliacoes:       0, // preenchido pelo resumo se necessário
        performanceScore,
        scoreFinanceiro,
        scoreManutencao,
      };
    })
  );

  // Ordenar do melhor para o pior
  return resultados.sort((a, b) => b.performanceScore - a.performanceScore);
  }); // fim cache.get
};
