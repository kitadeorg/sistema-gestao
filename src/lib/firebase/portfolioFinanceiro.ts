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

export interface PortfolioResumo {
  receitaTotalMes: number;
  receitaTotalGeral: number;
  totalAtrasado: number;
  totalPendente: number;
  taxaMediaInadimplencia: number;
  totalPagamentosMes: number;
}

/* =====================================================
   ✅ CONSOLIDAÇÃO GLOBAL DO PORTFÓLIO
===================================================== */

export const getPortfolioFinanceiro = async (
  condominioIds: string[]
): Promise<PortfolioResumo> => {

  if (!condominioIds.length) {
    return {
      receitaTotalMes: 0,
      receitaTotalGeral: 0,
      totalAtrasado: 0,
      totalPendente: 0,
      taxaMediaInadimplencia: 0,
      totalPagamentosMes: 0,
    };
  }

  const pagamentosRef = collection(db, 'pagamentos');

  // 🔹 Divide em blocos de 30 (limite Firestore)
  const chunkArray = <T>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const chunks = chunkArray(condominioIds, 30);

  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  let receitaTotalMes = 0;
  let receitaTotalGeral = 0;
  let totalAtrasado = 0;
  let totalPendente = 0;
  let totalPagamentosMes = 0;

  // 🔹 Buscar todos pagamentos por condomínio
  const resultados = await Promise.all(
    chunks.map((chunk) =>
      getDocs(
        query(
          pagamentosRef,
          where('condominioId', 'in', chunk)
        )
      )
    )
  );

  resultados.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const valor = data.valor ?? 0;

      receitaTotalGeral += valor;

      const dataVencimento = data.dataVencimento?.toDate?.();
      const dataPagamento = data.dataPagamento?.toDate?.();

      // 🔹 Receita do mês (pagos no mês atual)
      if (
        data.status === 'pago' &&
        dataPagamento &&
        dataPagamento >= inicioMes &&
        dataPagamento <= fimMes
      ) {
        receitaTotalMes += valor;
      }

      // 🔹 Pagamentos do mês (base para inadimplência)
      if (
        dataVencimento &&
        dataVencimento >= inicioMes &&
        dataVencimento <= fimMes
      ) {
        totalPagamentosMes++;
      }

      // 🔹 Pendentes
      if (data.status === 'pendente') {
        totalPendente += valor;
      }

      // 🔹 Atrasados
      if (data.status === 'atrasado') {
        totalAtrasado += valor;
      }
    });
  });

  const taxaMediaInadimplencia =
    totalPagamentosMes > 0
      ? (totalAtrasado / totalPagamentosMes) * 100
      : 0;

  return {
    receitaTotalMes,
    receitaTotalGeral,
    totalAtrasado,
    totalPendente,
    taxaMediaInadimplencia,
    totalPagamentosMes,
  };
};