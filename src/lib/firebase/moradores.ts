import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

const moradoresCollection = collection(db, 'moradores');
const unidadesCollection = collection(db, 'unidades');

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
   ✅ BUSCAR MORADORES
===================================================== */

export const getMoradoresByCondominio = async (
  condominioId: string
) => {
  const q = query(
    moradoresCollection,
    where('condominioId', '==', condominioId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/* =====================================================
   ✅ CRIAR MORADOR
===================================================== */

export const createMorador = async (
  condominioId: string,
  data: MoradorInput
) => {

  // 1️⃣ Criar morador
  await addDoc(moradoresCollection, {
    condominioId,
    unidadeId: data.unidadeId,
    nome: data.nome,
    telefone: data.telefone ?? null,
    email: data.email?.toLowerCase().trim() ?? null,
    tipo: data.tipo,
    status: 'ativo',
    dataEntrada: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 2️⃣ Atualizar unidade para ocupada
  await updateDoc(
    doc(db, 'unidades', data.unidadeId),
    {
      status: 'ocupada',
      updatedAt: serverTimestamp(),
    }
  );

  // 3️⃣ Criar autorização para login (se tiver email)
  if (data.email) {
    await setDoc(
      doc(db, 'usuarios_pre_registro', data.email.toLowerCase().trim()),
      {
        email: data.email.toLowerCase().trim(),
        condominioId,
        createdAt: serverTimestamp(),
      }
    );
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
  const q = query(
    moradoresCollection,
    where('unidadeId', '==', unidadeId)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    // ✅ Se não houver mais moradores, marcar unidade como vaga
    await updateDoc(
      doc(db, 'unidades', unidadeId),
      {
        status: 'vaga',
        updatedAt: serverTimestamp(),
      }
    );
  }

  // 3️⃣ Atualizar total de moradores
  await atualizarTotalMoradores(condominioId);
};

/* =====================================================
   ✅ ATUALIZAR TOTAL DE MORADORES
===================================================== */

const atualizarTotalMoradores = async (
  condominioId: string
) => {

  const q = query(
    moradoresCollection,
    where('condominioId', '==', condominioId)
  );

  const snapshot = await getDocs(q);

  const total = snapshot.size;

  await updateDoc(
    doc(db, 'condominios', condominioId),
    {
      totalMoradores: total,
      updatedAt: serverTimestamp(),
    }
  );
};