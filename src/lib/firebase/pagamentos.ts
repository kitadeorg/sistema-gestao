import { db } from './firebase';
import { withCondominioFilter } from './queryFilters';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
} from 'firebase/firestore';

const pagamentosCollection = collection(db, 'pagamentos');

/* =====================================================
   ✅ TIPOS
===================================================== */

export type StatusPagamento = 'pendente' | 'pago' | 'atrasado';

export interface PagamentoInput {
  unidadeId: string;
  moradorId: string;
  valor: number;
  mesReferencia: string;
  dataVencimento: Date;
}

/* =====================================================
   ✅ BUSCAR PAGAMENTOS
===================================================== */

export const getPagamentos = async (
  condominioId: string | null,
  isAdmin: boolean
) => {

  const baseQuery = query(
    pagamentosCollection,
    orderBy('mesReferencia', 'desc')
  );

  const safeQuery = withCondominioFilter(
    baseQuery,
    condominioId,
    isAdmin
  );

  const snapshot = await getDocs(safeQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/* =====================================================
   ✅ CRIAR PAGAMENTO
===================================================== */

export const createPagamento = async (
  condominioId: string,
  data: PagamentoInput
) => {

  await addDoc(pagamentosCollection, {
    condominioId,
    unidadeId: data.unidadeId,
    moradorId: data.moradorId,
    valor: data.valor,
    mesReferencia: data.mesReferencia,
    status: 'pendente',
    dataVencimento: Timestamp.fromDate(data.dataVencimento),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/* =====================================================
   ✅ MARCAR COMO PAGO
===================================================== */

export const marcarComoPago = async (
  pagamentoId: string
) => {

  const pagamentoRef = doc(db, 'pagamentos', pagamentoId);

  await updateDoc(pagamentoRef, {
    status: 'pago',
    dataPagamento: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/* =====================================================
   ✅ BUSCAR POR MÊS
===================================================== */

export const getPagamentosPorMes = async (
  condominioId: string | null,
  isAdmin: boolean,
  mesReferencia: string
) => {

  const baseQuery = query(
    pagamentosCollection,
    where('mesReferencia', '==', mesReferencia)
  );

  const safeQuery = withCondominioFilter(
    baseQuery,
    condominioId,
    isAdmin
  );

  const snapshot = await getDocs(safeQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};