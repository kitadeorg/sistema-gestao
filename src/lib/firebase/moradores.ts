// lib/firebase/moradores.ts
import { db } from './firebase';
import { withCondominioFilter } from './queryFilters';
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

const moradoresCollection = collection(db, 'moradores');

/* =====================================================
   ✅ TIPOS
===================================================== */

export interface MoradorInput {
  unidadeId: string;
  nome: string;
  telefone?: string;
  email?: string;
  tipo: 'proprietario' | 'inquilino';
}

/* =====================================================
   ✅ BUSCAR MORADORES (SEGURA MULTI-TENANT)
===================================================== */

export const getMoradores = async (
  condominioId: string | null,
  isAdmin: boolean
) => {
  const baseQuery = query(moradoresCollection);

  const safeQuery = withCondominioFilter(
    baseQuery,
    condominioId,
    isAdmin
  );

  const snapshot = await getDocs(safeQuery);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
};

/* =====================================================
   ✅ CRIAR MORADOR
===================================================== */

export const createMorador = async (
  condominioId: string,
  data: MoradorInput
) => {
  const normalizedEmail = data.email?.toLowerCase().trim() ?? null;

  let moradorDocRef;
  if (normalizedEmail) {
    moradorDocRef = doc(db, 'moradores', normalizedEmail);
  } else {
    moradorDocRef = doc(moradoresCollection);
  }

  // ✅ Vai buscar numero e bloco da unidade antes de criar o morador
  const unidadeSnap = await getDoc(doc(db, 'unidades', data.unidadeId));
  const unidadeData = unidadeSnap.exists() ? unidadeSnap.data() : null;

  const unidadeNumero = unidadeData?.numero ?? null;
  const bloco         = unidadeData?.bloco  ?? null;

  // 1️⃣ Criar morador com unidadeNumero e bloco desnormalizados
  await setDoc(moradorDocRef, {
    condominioId,
    unidadeId:     data.unidadeId,
    unidadeNumero,           // ✅ ex: "A8"
    bloco,                   // ✅ ex: "A"
    nome:          data.nome,
    telefone:      data.telefone ?? null,
    email:         normalizedEmail,
    tipo:          data.tipo,
    status:        'ativo',
    dataEntrada:   serverTimestamp(),
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
  });

  // 2️⃣ Atualizar unidade para ocupada
  await updateDoc(doc(db, 'unidades', data.unidadeId), {
    status:    'ocupada',
    updatedAt: serverTimestamp(),
  });

  // 3️⃣ Criar pré-registo para login
  if (normalizedEmail) {
    await setDoc(doc(db, 'usuarios_pre_registro', normalizedEmail), {
      email:        normalizedEmail,
      condominioId,
      createdAt:    serverTimestamp(),
    });
  }

  // 4️⃣ Atualizar total de moradores
  await atualizarTotalMoradores(condominioId);
};

/* =====================================================
   ✅ ELIMINAR MORADOR
===================================================== */

export const deleteMorador = async (
  id: string,
  unidadeId: string,
  condominioId: string
) => {
  // 1️⃣ Eliminar morador
  await deleteDoc(doc(db, 'moradores', id));

  // 2️⃣ Verificar se ainda existem moradores na unidade
  const baseQuery = query(
    moradoresCollection,
    where('unidadeId', '==', unidadeId)
  );

  const safeQuery = withCondominioFilter(
    baseQuery,
    condominioId,
    false
  );

  const snapshot = await getDocs(safeQuery);

  if (snapshot.empty) {
    await updateDoc(doc(db, 'unidades', unidadeId), {
      status:    'vaga',
      updatedAt: serverTimestamp(),
    });
  }

  // 3️⃣ Atualizar total
  await atualizarTotalMoradores(condominioId);
};

/* =====================================================
   ✅ ATUALIZAR TOTAL DE MORADORES
===================================================== */

const atualizarTotalMoradores = async (condominioId: string) => {
  const baseQuery = query(moradoresCollection);

  const safeQuery = withCondominioFilter(
    baseQuery,
    condominioId,
    false
  );

  const snapshot = await getDocs(safeQuery);

  await updateDoc(doc(db, 'condominios', condominioId), {
    totalMoradores: snapshot.size,
    updatedAt:      serverTimestamp(),
  });
};