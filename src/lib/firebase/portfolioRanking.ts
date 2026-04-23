import { db } from './firebase';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';

/* =====================================================
   ✅ TYPES
===================================================== */

export interface CondoPerformance {
  condominioId: string;
  receitaMes: number;
  totalAtrasado: number;
  taxaInadimplencia: number;
  performanceScore: number;
}

/* =====================================================
   ✅ RANKING DE CONDOMÍNIOS
===================================================== */

export const getPortfolioRanking = async (
  condominios: { id: string; nome?: string }[]
): Promise<CondoPerformance[]> => {

  if (!condominios.length) return [];

  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const pagamentosRef = collection(db, 'pagamentos');

  const resultados: CondoPerformance[] = [];

  for (const condo of condominios) {

    const pagamentosSnap = await getDocs(
      query(
        pagamentosRef,
        where('condominioId', '==', condo.id)
      )
    );

    let receitaMes = 0;
    let totalAtrasado = 0;
    let totalPagamentosMes = 0;
    let atrasadosMes = 0;

    pagamentosSnap.docs.forEach((doc) => {
      const data = doc.data();
      const valor = data.valor ?? 0;

      const dataVencimento = data.dataVencimento?.toDate?.();
      const dataPagamento = data.dataPagamento?.toDate?.();

      // Receita do mês (pagos neste mês)
      if (
        data.status === 'pago' &&
        dataPagamento &&
        dataPagamento >= inicioMes &&
        dataPagamento <= fimMes
      ) {
        receitaMes += valor;
      }

      // Base para inadimplência
      if (
        dataVencimento &&
        dataVencimento >= inicioMes &&
        dataVencimento <= fimMes
      ) {
        totalPagamentosMes++;

        if (data.status === 'atrasado') {
          atrasadosMes++;
          totalAtrasado += valor;
        }
      }
    });

    const taxaInadimplencia =
      totalPagamentosMes > 0
        ? (atrasadosMes / totalPagamentosMes) * 100
        : 0;

    // 🔥 Fórmula simples de performance
    const performanceScore =
      receitaMes * 0.6 +
      (100 - taxaInadimplencia) * 1000 * 0.4;

    resultados.push({
      condominioId: condo.id,
      receitaMes,
      totalAtrasado,
      taxaInadimplencia,
      performanceScore,
    });
  }

  // Ordena do melhor para o pior
  resultados.sort((a, b) => b.performanceScore - a.performanceScore);

  return resultados;
};