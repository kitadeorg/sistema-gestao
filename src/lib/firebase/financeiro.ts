import { db } from './firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

const quotasCollection = collection(db, 'quotas');

/* =====================================================
   TIPOS
===================================================== */

export interface ResumoFinanceiro {
  receitaTotal: number;
  totalPago: number;
  totalPendente: number;
  totalAtrasado: number;
  taxaInadimplencia: number;
}

/* =====================================================
   RESUMO FINANCEIRO — usa quotas (dados reais)
===================================================== */

export const getResumoFinanceiro = async (
  condominioId: string | null,
  _isAdmin: boolean,
): Promise<ResumoFinanceiro> => {
  if (!condominioId) {
    return { receitaTotal: 0, totalPago: 0, totalPendente: 0, totalAtrasado: 0, taxaInadimplencia: 0 };
  }

  const snap = await getDocs(
    query(quotasCollection, where('condominioId', '==', condominioId)),
  );

  let receitaTotal = 0;
  let totalPago = 0;
  let totalPendente = 0;
  let totalAtrasado = 0;

  snap.docs.forEach(d => {
    const data = d.data();
    const valor = data.valor ?? 0;
    receitaTotal += valor;
    if (data.status === 'pago')     totalPago     += valor;
    if (data.status === 'pendente') totalPendente += valor;
    if (data.status === 'atrasado') totalAtrasado += valor;
  });

  const taxaInadimplencia = receitaTotal > 0
    ? ((totalPendente + totalAtrasado) / receitaTotal) * 100
    : 0;

  return { receitaTotal, totalPago, totalPendente, totalAtrasado, taxaInadimplencia };
};

/* =====================================================
   AUTOMATIZAR ATRASOS — usa quotas
===================================================== */

export const atualizarPagamentosAtrasados = async (
  condominioId: string | null,
  _isAdmin: boolean,
): Promise<void> => {
  if (!condominioId) return;

  const hoje = new Date();

  const snap = await getDocs(
    query(
      quotasCollection,
      where('condominioId', '==', condominioId),
      where('status', '==', 'pendente'),
    ),
  );

  const promises: Promise<void>[] = [];

  snap.docs.forEach(d => {
    const vencimento = d.data().dataVencimento?.toDate?.();
    if (vencimento && vencimento < hoje) {
      promises.push(
        updateDoc(doc(db, 'quotas', d.id), {
          status:    'atrasado',
          updatedAt: serverTimestamp(),
        }),
      );
    }
  });

  await Promise.all(promises);
};
