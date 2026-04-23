// lib/firebase/users.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
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

/**
 * Status de entrega de e-mail — preenchido pelo webhook de bounce
 * ou pelo sistema após confirmação de entrega.
 *
 * undefined  → convite ainda não disparado / status desconhecido
 * email_entregue → servidor de destino aceitou o e-mail
 * email_bounce   → hard bounce: conta ou domínio inexistente
 * email_spam     → destinatário marcou como spam
 * email_erro     → falha genérica de entrega (soft bounce / deferred)
 */
export type EmailDeliveryStatus =
  | 'email_entregue'
  | 'email_bounce'
  | 'email_spam'
  | 'email_erro';

export interface UserData {
  id: string;
  uid?: string; // presente apenas em docs activados via Auth
  nome: string;
  email: string;
  telefone: string;
  role: 'admin' | 'gestor' | 'sindico' | 'funcionario' | 'morador';
  status: 'ativo' | 'inativo' | 'pendente';
  avatarUrl?: string;
  condominioId?: string;
  condominiosGeridos?: string[];
  // ── Rastreio de entrega de e-mail ──────────────────────────
  emailStatus?: EmailDeliveryStatus;
  emailStatusUpdatedAt?: Timestamp;
  // ────────────────────────────────────────────────────────────
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
  emailStatus?: EmailDeliveryStatus;
}

// ─────────────────────────────────────────────
// REFERÊNCIAS
// ─────────────────────────────────────────────

const usersCollection = collection(db, 'usuarios');

// ─────────────────────────────────────────────
// LEITURA
// ─────────────────────────────────────────────

export async function getUsers(): Promise<UserData[]> {
  const q = query(usersCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as UserData[];
}

export async function getUsersByRole(role: UserData['role']): Promise<UserData[]> {
  const q = query(
    usersCollection,
    where('role', '==', role),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as UserData[];
}

export async function getUserById(userId: string): Promise<UserData | null> {
  const docRef = doc(db, 'usuarios', userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as UserData;
}

/**
 * Procura utilizador por email.
 * 1. Pesquisa em `usuarios` (query por campo email).
 * 2. Se não encontrar, pesquisa em `usuarios_pre_registro` (ID = email).
 */
export async function getUserByEmail(email: string): Promise<{
  source: 'usuarios' | 'usuarios_pre_registro';
  data: UserData;
} | null> {
  const emailNorm = email.trim().toLowerCase();

  const qMain = query(usersCollection, where('email', '==', emailNorm));
  const snapMain = await getDocs(qMain);

  if (!snapMain.empty) {
    const d = snapMain.docs[0];
    return {
      source: 'usuarios',
      data: { id: d.id, ...d.data() } as UserData,
    };
  }

  const preRef = doc(db, 'usuarios_pre_registro', emailNorm);
  const preSnap = await getDoc(preRef);

  if (preSnap.exists()) {
    return {
      source: 'usuarios_pre_registro',
      data: { id: preSnap.id, ...preSnap.data() } as UserData,
    };
  }

  return null;
}

export async function getUsersByCondominio(condominioId: string): Promise<UserData[]> {
  const qDireto = query(usersCollection, where('condominioId', '==', condominioId));
  const qGestor = query(
    usersCollection,
    where('condominiosGeridos', 'array-contains', condominioId),
  );

  const [snapDireto, snapGestor] = await Promise.all([
    getDocs(qDireto),
    getDocs(qGestor),
  ]);

  const mapa = new Map<string, UserData>();
  for (const d of [...snapDireto.docs, ...snapGestor.docs]) {
    mapa.set(d.id, { id: d.id, ...d.data() } as UserData);
  }
  return Array.from(mapa.values());
}

export async function getGestores(): Promise<UserData[]> {
  return getUsersByRole('gestor');
}

/**
 * Retorna todos os utilizadores com emailStatus de bounce ou erro —
 * ou seja, os que o Admin precisa de contactar manualmente.
 */
export async function getUsersParaContactar(): Promise<UserData[]> {
  const statusAlerta: EmailDeliveryStatus[] = ['email_bounce', 'email_spam', 'email_erro'];

  const snapshots = await Promise.all(
    statusAlerta.map((s) =>
      getDocs(query(usersCollection, where('emailStatus', '==', s))),
    ),
  );

  const mapa = new Map<string, UserData>();
  for (const snap of snapshots) {
    for (const d of snap.docs) {
      mapa.set(d.id, { id: d.id, ...d.data() } as UserData);
    }
  }
  return Array.from(mapa.values());
}

// ─────────────────────────────────────────────
// ESCRITA
// ─────────────────────────────────────────────

/**
 * Criar utilizador.
 *
 * STATUS "pendente"
 *   → Grava em `usuarios_pre_registro` (ID = email).
 *     O utilizador activa a conta no ecrã de login.
 *
 * STATUS "ativo" ou "inativo"
 *   → Grava em `usuarios_pre_registro` (ID = email) COM status correcto.
 *     MOTIVO: o admin cria o registo sem UID (ainda não há conta Auth);
 *     quando o utilizador se regista no ecrã de login, o activateUserFromPreRegistro
 *     move o doc para `usuarios` com o UID real.
 *     Desta forma não ficam documentos em `usuarios` sem UID.
 *
 * ✅ Verifica duplicado nas duas colecções.
 * ✅ Email normalizado para lowercase.
 */
export async function createUser(data: CreateUserData): Promise<string> {
  const emailNorm = data.email.trim().toLowerCase();
  const status = data.status ?? 'pendente';

  // 1. Verificar duplicado
  const existente = await getUserByEmail(emailNorm);
  if (existente) {
    const origem =
      existente.source === 'usuarios_pre_registro'
        ? 'pré-registo (convite pendente)'
        : 'utilizadores activos';
    throw new Error(
      `Já existe um utilizador com o email "${emailNorm}" em ${origem}.`,
    );
  }

  // 2. Payload base
  const payload: Record<string, unknown> = {
    nome: data.nome,
    email: emailNorm,
    telefone: data.telefone,
    role: data.role,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Só inclui campos de condomínio se relevantes
  if (data.condominioId) {
    payload.condominioId = data.condominioId;
  }
  if (data.condominiosGeridos && data.condominiosGeridos.length > 0) {
    payload.condominiosGeridos = data.condominiosGeridos;
  }

  // 3. Sempre grava em pre_registro (ID = email).
  //    O activateUserFromPreRegistro tratará da migração para `usuarios`
  //    quando o utilizador se autenticar pela primeira vez.
  await setDoc(doc(db, 'usuarios_pre_registro', emailNorm), payload);
  console.log(`[createUser] status=${status} → usuarios_pre_registro/${emailNorm}`);
  return emailNorm;
}

/**
 * Atualizar utilizador em `usuarios`.
 *
 * ✅ Verifica duplicado de email se o email for alterado.
 * ✅ Só actualiza campos de condomínio relevantes para o role.
 */
export async function updateUser(userId: string, data: UpdateUserData): Promise<void> {
  const docRef = doc(db, 'usuarios', userId);

  // Verificar duplicado se email está a ser alterado
  if (data.email) {
    const emailNorm = data.email.trim().toLowerCase();
    const existente = await getUserByEmail(emailNorm);
    if (existente && existente.data.id !== userId) {
      const origem =
        existente.source === 'usuarios_pre_registro'
          ? 'pré-registo (convite pendente)'
          : 'utilizadores activos';
      throw new Error(
        `Já existe um utilizador com o email "${emailNorm}" em ${origem}.`,
      );
    }
    data.email = emailNorm;
  }

  const payload: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, payload);
}

/**
 * Eliminar utilizador.
 * ✅ Apaga de `usuarios`.
 * ✅ Apaga também de `usuarios_pre_registro` se existir.
 * ❌ Bloqueia eliminação de utilizadores com role 'admin'.
 */
export async function deleteUser(userId: string): Promise<void> {
  const usuario = await getUserById(userId);

  if (usuario?.role === 'admin') {
    throw new Error('Não é permitido eliminar uma conta de Administrador.');
  }

  await deleteDoc(doc(db, 'usuarios', userId));

  if (usuario?.email) {
    const emailId = usuario.email.toLowerCase().trim();
    try {
      await deleteDoc(doc(db, 'usuarios_pre_registro', emailId));
    } catch (err) {
      console.warn('[deleteUser] Não foi possível limpar pré-registo:', err);
    }
  }
}

// ─────────────────────────────────────────────
// GESTÃO DO PORTFÓLIO (GESTOR)
// ─────────────────────────────────────────────

export async function adicionarCondominioAoGestor(
  gestorId: string,
  condominioId: string,
): Promise<void> {
  await updateDoc(doc(db, 'usuarios', gestorId), {
    condominiosGeridos: arrayUnion(condominioId),
    updatedAt: serverTimestamp(),
  });
}

export async function removerCondominioDoGestor(
  gestorId: string,
  condominioId: string,
): Promise<void> {
  await updateDoc(doc(db, 'usuarios', gestorId), {
    condominiosGeridos: arrayRemove(condominioId),
    updatedAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────

/**
 * Alternar status ativo ↔ inativo.
 * Bloqueia se pendente.
 */
export async function toggleUserStatus(
  userId: string,
  currentStatus: UserData['status'],
): Promise<void> {
  if (currentStatus === 'pendente') {
    throw new Error(
      'Não é possível alterar o status de um utilizador pendente. ' +
        'O utilizador deve activar a conta através do ecrã de login.',
    );
  }

  const newStatus: UserData['status'] = currentStatus === 'ativo' ? 'inativo' : 'ativo';
  await updateUser(userId, { status: newStatus });
}