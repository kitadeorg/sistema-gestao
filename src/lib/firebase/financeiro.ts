import { db } from './firebase';
import { withCondominioFilter } from './queryFilters';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

const pagamentosCollection = collection(db, 'pagamentos');

/* =====================================================
   ✅ TIPOS
===================================================== */

export interface ResumoFinanceiro {
  receitaTotal: number;
  totalPago: number;
  totalPendente: number;
  totalAtrasado: number;
  taxaInadimplencia: number;
}

/* =====================================================
   ✅ RESUMO FINANCEIRO
===================================================== */

export const getResumoFinanceiro = async (
  condominioId: string | null,
  isAdmin: boolean
): Promise<ResumoFinanceiro> => {

  const baseQuery = query(pagamentosCollection);

  const safeQuery = withCondominioFilter(
    baseQuery,
    condominioId,
    isAdmin
  );

  const snapshot = await getDocs(safeQuery);

  let receitaTotal = 0;
  let totalPago = 0;
  let totalPendente = 0;
  let totalAtrasado = 0;

  snapshot.docs.forEach((docItem) => {
    const data = docItem.data();
    const valor = data.valor ?? 0;

    receitaTotal += valor;

    if (data.status === 'pago') totalPago += valor;
    if (data.status === 'pendente') totalPendente += valor;
    if (data.status === 'atrasado') totalAtrasado += valor;
  });

  const taxaInadimplencia =
    receitaTotal > 0
      ? ((totalPendente + totalAtrasado) / receitaTotal) * 100
      : 0;

  return {
    receitaTotal,
    totalPago,
    totalPendente,
    totalAtrasado,
    taxaInadimplencia,
  };
};

/* =====================================================
   ✅ AUTOMATIZAR ATRASOS
===================================================== */

export const atualizarPagamentosAtrasados = async (
  condominioId: string | null,
  isAdmin: boolean
) => {

  const hoje = new Date();

  const baseQuery = query(
    pagamentosCollection,
    where('status', '==', 'pendente')
  );

  const safeQuery = withCondominioFilter(
    baseQuery,
    condominioId,
    isAdmin
  );

  const snapshot = await getDocs(safeQuery);

  const promises: Promise<void>[] = [];

  snapshot.docs.forEach((docItem) => {

    const data = docItem.data();
    const dataVencimento = data.dataVencimento?.toDate?.();

    if (dataVencimento && dataVencimento < hoje) {

      const pagamentoRef = doc(db, 'pagamentos', docItem.id);

      promises.push(
        updateDoc(pagamentoRef, {
          status: 'atrasado',
          updatedAt: serverTimestamp(),
        })
      );
    }
  });

  await Promise.all(promises);
};