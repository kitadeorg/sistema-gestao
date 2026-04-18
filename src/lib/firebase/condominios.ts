// src/lib/firebase/condominios.ts

import { db } from './firebase';
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  where,
  documentId,
} from 'firebase/firestore';
import type { Condominio, CondominioFormData } from '@/types';

// ─────────────────────────────────────────────
// REFERÊNCIA DA COLEÇÃO
// ─────────────────────────────────────────────

const condominiosCollection = collection(db, 'condominios');

// ─────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────

function mapDocToCondominio(d: ReturnType<typeof doc> | any): Condominio {
  const data = d.data();
  return {
    id: d.id,
    ...data,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
  } as Condominio;
}

// ─────────────────────────────────────────────
// LEITURA
// ─────────────────────────────────────────────

/**
 * Busca TODOS os condomínios — uso exclusivo do Admin.
 */
export const getCondominios = async (): Promise<Condominio[]> => {
  const q = query(condominiosCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapDocToCondominio);
};

/**
 * Busca um único condomínio por ID.
 */
export const getCondominioById = async (id: string): Promise<Condominio | null> => {
  const docRef = doc(db, 'condominios', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return mapDocToCondominio(docSnap);
};

/**
 * Busca os condomínios de um Gestor de Portfólio.
 * Recebe o array de IDs que está guardado em `condominiosGeridos` no documento do utilizador.
 *
 * Nota: o Firestore limita queries `in` a 30 IDs por chamada.
 * Para portfólios maiores, fazer paginação em lotes de 30.
 */
export const getCondominiosByIds = async (ids: string[]): Promise<Condominio[]> => {
  if (ids.length === 0) return [];

  // Divide em lotes de 30 (limite do Firestore para 'in')
  const lotes: string[][] = [];
  for (let i = 0; i < ids.length; i += 30) {
    lotes.push(ids.slice(i, i + 30));
  }

  const resultados = await Promise.all(
    lotes.map(async (lote) => {
      const q = query(condominiosCollection, where(documentId(), 'in', lote));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(mapDocToCondominio);
    }),
  );

  return resultados.flat();
};

/**
 * Busca condomínios por status.
 */
export const getCondominiosByStatus = async (
  status: Condominio['status'],
): Promise<Condominio[]> => {
  const q = query(
    condominiosCollection,
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapDocToCondominio);
};

// ─────────────────────────────────────────────
// ESCRITA
// ─────────────────────────────────────────────

/**
 * Cria um novo condomínio com valores padrão.
 */
export const createCondominio = async (data: CondominioFormData): Promise<string> => {
  const docRef = await addDoc(condominiosCollection, {
    ...data,
    totalUnidades: 0,
    status: 'active',
    configuracoes: {
      valorQuotaMensal: 0,
      diaVencimento: 10,
      multaPorAtraso: 0,
      jurosMensal: 0,
      permitePagamentoParcial: false,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * Atualiza os dados de um condomínio existente.
 */
export const updateCondominio = async (
  id: string,
  data: CondominioFormData,
): Promise<void> => {
  const condominioDoc = doc(db, 'condominios', id);
  await updateDoc(condominioDoc, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Elimina um condomínio.
 */
export const deleteCondominio = async (id: string): Promise<void> => {
  const condominioDoc = doc(db, 'condominios', id);
  await deleteDoc(condominioDoc);
};

/**
 * Alterna o status de um condomínio entre 'active' e 'inactive'.
 */
export const toggleCondominioStatus = async (
  id: string,
  currentStatus: Condominio['status'],
): Promise<void> => {
  const condominioDoc = doc(db, 'condominios', id);
  await updateDoc(condominioDoc, {
    status: currentStatus === 'active' ? 'inactive' : 'active',
    updatedAt: serverTimestamp(),
  });
};

/**
 * Atualiza apenas as configurações financeiras de um condomínio.
 */
export const updateConfiguracoes = async (
  id: string,
  configuracoes: Partial<Condominio['configuracoes']>,
): Promise<void> => {
  const condominioDoc = doc(db, 'condominios', id);
  await updateDoc(condominioDoc, {
    configuracoes,
    updatedAt: serverTimestamp(),
  });
};