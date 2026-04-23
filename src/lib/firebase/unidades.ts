import { db } from './firebase';
import { withCondominioFilter } from './queryFilters';
import {
  collection,
  addDoc,
  getDocs,
  query,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

const unidadesCollection = collection(db, 'unidades');

/* =====================================================
   ✅ TIPOS
===================================================== */

export interface UnidadeInput {
  numero: string;
  bloco?: string;
  tipo: string;
  area?: number;
  fracao?: number;
  permilagem?: number;
  quotaIndividual?: number;
  ativaQuotaIndividual?: boolean;
  status: 'vaga' | 'ocupada';
  observacoes?: string;
}

/* =====================================================
   ✅ BUSCAR UNIDADES (SEGURA MULTI-TENANT)
===================================================== */

export const getUnidades = async (
  condominioId: string | null,
  isAdmin: boolean
) => {

  const baseQuery = query(unidadesCollection);

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
   ✅ CRIAR UNIDADE
===================================================== */

export const createUnidade = async (
  condominioId: string,
  data: UnidadeInput
) => {

  await addDoc(unidadesCollection, {
    condominioId,
    numero: data.numero,
    bloco: data.bloco ?? null,
    tipo: data.tipo,
    area: data.area ?? null,
    fracao: data.fracao ?? null,
    permilagem: data.permilagem ?? null,
    quotaIndividual: data.ativaQuotaIndividual
      ? data.quotaIndividual ?? null
      : null,
    ativaQuotaIndividual: data.ativaQuotaIndividual ?? false,
    status: data.status,
    observacoes: data.observacoes ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await atualizarTotalUnidades(condominioId);
};

/* =====================================================
   ✅ ATUALIZAR UNIDADE
===================================================== */

export const updateUnidade = async (
  id: string,
  condominioId: string,
  data: UnidadeInput
) => {

  const unidadeRef = doc(db, 'unidades', id);

  await updateDoc(unidadeRef, {
    numero: data.numero,
    bloco: data.bloco ?? null,
    tipo: data.tipo,
    area: data.area ?? null,
    fracao: data.fracao ?? null,
    permilagem: data.permilagem ?? null,
    quotaIndividual: data.ativaQuotaIndividual
      ? data.quotaIndividual ?? null
      : null,
    ativaQuotaIndividual: data.ativaQuotaIndividual ?? false,
    status: data.status,
    observacoes: data.observacoes ?? null,
    updatedAt: serverTimestamp(),
  });

  await atualizarTotalUnidades(condominioId);
};

/* =====================================================
   ✅ ELIMINAR UNIDADE
===================================================== */

export const deleteUnidade = async (
  id: string,
  condominioId: string
) => {

  await deleteDoc(doc(db, 'unidades', id));

  await atualizarTotalUnidades(condominioId);
};

/* =====================================================
   ✅ ELIMINAR MÚLTIPLAS UNIDADES
===================================================== */

export const deleteMultipleUnidades = async (
  ids: string[],
  condominioId: string
) => {

  for (const id of ids) {
    await deleteDoc(doc(db, 'unidades', id));
  }

  await atualizarTotalUnidades(condominioId);
};

/* =====================================================
   ✅ ATUALIZAR TOTAL DE UNIDADES (BLINDADO)
===================================================== */

const atualizarTotalUnidades = async (
  condominioId: string
) => {

  const baseQuery = query(unidadesCollection);

  const safeQuery = withCondominioFilter(
    baseQuery,
    condominioId,
    false // aqui nunca é admin
  );

  const snapshot = await getDocs(safeQuery);

  const total = snapshot.size;

  const condominioRef = doc(db, 'condominios', condominioId);

  await updateDoc(condominioRef, {
    totalUnidades: total,
    updatedAt: serverTimestamp(),
  });
};