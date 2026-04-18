// lib/firebase/users.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface UserData {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  role: 'admin' | 'gestor' | 'sindico' | 'funcionario' | 'morador';
  status: 'ativo' | 'inativo' | 'pendente';
  avatarUrl?: string;

  // --- Relação utilizador ↔ condomínio ---
  /** Para síndicos, funcionários e moradores: ID do único condomínio associado. */
  condominioId?: string;
  /** Para gestores de portfólio: lista de IDs dos condomínios que gerem. */
  condominiosGeridos?: string[];
  // ----------------------------------------

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateUserData {
  nome: string;
  email: string;
  telefone: string;
  role: UserData['role'];
  status?: UserData['status'];
  condominioId?: string;
  condominiosGeridos?: string[];
}

export interface UpdateUserData {
  nome?: string;
  email?: string;
  telefone?: string;
  role?: UserData['role'];
  status?: UserData['status'];
  avatarUrl?: string;
  condominioId?: string;
  condominiosGeridos?: string[];
}

// ─────────────────────────────────────────────
// REFERÊNCIA DA COLEÇÃO
// ─────────────────────────────────────────────

const usersCollection = collection(db, 'usuarios');

// ─────────────────────────────────────────────
// LEITURA
// ─────────────────────────────────────────────

/** Buscar todos os utilizadores, ordenados por data de criação. */
export async function getUsers(): Promise<UserData[]> {
  const q = query(usersCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as UserData[];
}

/** Buscar utilizadores por role. */
export async function getUsersByRole(role: UserData['role']): Promise<UserData[]> {
  const q = query(
    usersCollection,
    where('role', '==', role),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as UserData[];
}

/** Buscar um utilizador por ID. */
export async function getUserById(userId: string): Promise<UserData | null> {
  const docRef = doc(db, 'usuarios', userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return { id: docSnap.id, ...docSnap.data() } as UserData;
}

/**
 * Buscar todos os utilizadores associados a um condomínio específico.
 * Cobre síndicos/funcionários/moradores (campo condominioId)
 * e gestores de portfólio (array condominiosGeridos).
 */
export async function getUsersByCondominio(condominioId: string): Promise<UserData[]> {
  // Utilizadores com condominioId direto (síndico, funcionário, morador)
  const qDireto = query(
    usersCollection,
    where('condominioId', '==', condominioId),
  );

  // Gestores que têm este condomínio no portfólio
  const qGestor = query(
    usersCollection,
    where('condominiosGeridos', 'array-contains', condominioId),
  );

  const [snapDireto, snapGestor] = await Promise.all([
    getDocs(qDireto),
    getDocs(qGestor),
  ]);

  const mapaUtilizadores = new Map<string, UserData>();

  for (const d of [...snapDireto.docs, ...snapGestor.docs]) {
    mapaUtilizadores.set(d.id, { id: d.id, ...d.data() } as UserData);
  }

  return Array.from(mapaUtilizadores.values());
}

/**
 * Buscar todos os gestores (role === 'gestor').
 * Útil para popular dropdowns de atribuição de portfólio.
 */
export async function getGestores(): Promise<UserData[]> {
  return getUsersByRole('gestor');
}

// ─────────────────────────────────────────────
// ESCRITA
// ─────────────────────────────────────────────

/** Criar um novo utilizador. */
export async function createUser(data: CreateUserData): Promise<string> {
  const payload: Record<string, unknown> = {
    nome: data.nome,
    email: data.email,
    telefone: data.telefone,
    role: data.role,
    status: data.status ?? 'ativo',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Só persiste os campos de relação relevantes para o role
  if (data.condominioId) {
    payload.condominioId = data.condominioId;
  }
  if (data.condominiosGeridos && data.condominiosGeridos.length > 0) {
    payload.condominiosGeridos = data.condominiosGeridos;
  }

  const docRef = await addDoc(usersCollection, payload);
  return docRef.id;
}

/** Atualizar dados de um utilizador. */
export async function updateUser(userId: string, data: UpdateUserData): Promise<void> {
  const docRef = doc(db, 'usuarios', userId);

  const payload: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, payload);
}

/** Eliminar um utilizador. */
export async function deleteUser(userId: string): Promise<void> {
  const docRef = doc(db, 'usuarios', userId);
  await deleteDoc(docRef);
}

// ─────────────────────────────────────────────
// GESTÃO DO PORTFÓLIO (GESTOR)
// ─────────────────────────────────────────────

/**
 * Adicionar um condomínio ao portfólio de um gestor.
 * Usa arrayUnion para evitar duplicados automaticamente.
 */
export async function adicionarCondominioAoGestor(
  gestorId: string,
  condominioId: string,
): Promise<void> {
  const docRef = doc(db, 'usuarios', gestorId);
  await updateDoc(docRef, {
    condominiosGeridos: arrayUnion(condominioId),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Remover um condomínio do portfólio de um gestor.
 */
export async function removerCondominioDoGestor(
  gestorId: string,
  condominioId: string,
): Promise<void> {
  const docRef = doc(db, 'usuarios', gestorId);
  await updateDoc(docRef, {
    condominiosGeridos: arrayRemove(condominioId),
    updatedAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────

/** Alternar status ativo/inativo de um utilizador. */
export async function toggleUserStatus(
  userId: string,
  currentStatus: UserData['status'],
): Promise<void> {
  const newStatus: UserData['status'] = currentStatus === 'ativo' ? 'inativo' : 'ativo';
  await updateUser(userId, { status: newStatus });
}