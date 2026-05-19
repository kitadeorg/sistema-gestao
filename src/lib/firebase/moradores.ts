// lib/firebase/moradores.ts
import { db } from './firebase';
import { withCondominioFilter } from './queryFilters';
import { logAudit } from './auditLog';
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
  Timestamp,
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

export interface MoradorActor {
  actorId: string;
  actorNome: string;
  actorRole: string;
}

/* =====================================================
   ✅ BUSCAR MORADORES (SEGURA MULTI-TENANT)
===================================================== */

export const getMoradores = async (
  condominioId: string | null,
  isSuperAdmin: boolean
) => {
  const baseQuery = query(moradoresCollection);

  const safeQuery = withCondominioFilter(
    baseQuery,
    condominioId,
    isSuperAdmin
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
  data: MoradorInput,
  actor?: MoradorActor,
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

  if (actor) {
    void logAudit({
      actorId:      actor.actorId,
      actorNome:    actor.actorNome,
      actorRole:    actor.actorRole,
      accao:        'morador_criado',
      categoria:    'moradores',
      descricao:    `Morador "${data.nome}" criado na unidade ${unidadeNumero ?? data.unidadeId}`,
      condominioId,
      entidadeId:   moradorDocRef.id,
      entidadeTipo: 'morador',
      meta:         { nome: data.nome, email: normalizedEmail, tipo: data.tipo, unidadeId: data.unidadeId },
    });
  }
};

/* =====================================================
   ✅ ELIMINAR MORADOR
===================================================== */

export const deleteMorador = async (
  id: string,
  unidadeId: string,
  condominioId: string,
  actor?: MoradorActor,
) => {
  // 0️⃣ Guardar histórico antes de eliminar
  const moradorSnap = await getDoc(doc(db, 'moradores', id));
  if (moradorSnap.exists()) {
    const moradorData = moradorSnap.data();
    await setDoc(doc(collection(db, 'historico_residencia')), {
      ...moradorData,
      moradorId:   id,
      condominioId,
      unidadeId,
      dataSaida:   serverTimestamp(),
      arquivadoPor: actor?.actorId ?? 'sistema',
    });
  }

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

  if (actor) {
    void logAudit({
      actorId:      actor.actorId,
      actorNome:    actor.actorNome,
      actorRole:    actor.actorRole,
      accao:        'morador_eliminado',
      categoria:    'moradores',
      descricao:    `Morador ${id} eliminado`,
      condominioId,
      entidadeId:   id,
      entidadeTipo: 'morador',
    });
  }
};

/* =====================================================
   ✅ ATUALIZAR STATUS DO MORADOR
===================================================== */

export type StatusMorador = 'ativo' | 'inadimplente' | 'ausente' | 'inativo';

export const updateMoradorStatus = async (
  id: string,
  novoStatus: StatusMorador,
  actor?: MoradorActor,
) => {
  await updateDoc(doc(db, 'moradores', id), {
    status:    novoStatus,
    updatedAt: serverTimestamp(),
  });

  if (actor) {
    void logAudit({
      actorId:      actor.actorId,
      actorNome:    actor.actorNome,
      actorRole:    actor.actorRole,
      accao:        'morador_editado',
      categoria:    'moradores',
      descricao:    `Estado do morador ${id} alterado para "${novoStatus}"`,
      entidadeId:   id,
      entidadeTipo: 'morador',
      meta:         { novoStatus },
    });
  }
};

/* =====================================================
   ✅ BUSCAR HISTÓRICO DE RESIDÊNCIA
===================================================== */

export interface HistoricoResidencia {
  id: string;
  moradorId: string;
  nome: string;
  email?: string;
  telefone?: string;
  tipo: 'proprietario' | 'inquilino';
  unidadeId: string;
  unidadeNumero?: string;
  bloco?: string;
  condominioId: string;
  dataEntrada?: Timestamp | Date;
  dataSaida?: Timestamp | Date;
  arquivadoPor?: string;
}

export const getHistoricoResidencia = async (
  condominioId: string,
): Promise<HistoricoResidencia[]> => {
  const snap = await getDocs(
    query(
      collection(db, 'historico_residencia'),
      where('condominioId', '==', condominioId),
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as HistoricoResidencia));
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