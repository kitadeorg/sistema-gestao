/**
 * Utilitários para o fluxo de convite automático.
 * Gera credenciais temporárias, cria conta no Firebase Auth,
 * cria o registo no Firestore e envia o email.
 */

import { setDoc, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/firebase';
import type { CreateUserData } from './firebase/users';
import { getUserByEmail } from './firebase/users';

// ─────────────────────────────────────────────
// GERAÇÃO DE CREDENCIAIS
// ─────────────────────────────────────────────

const ADJECTIVES = [
  'Rapido', 'Forte', 'Calmo', 'Brilhante', 'Veloz',
  'Firme', 'Claro', 'Seguro', 'Livre', 'Novo',
];

const NOUNS = [
  'Leao', 'Aguia', 'Tigre', 'Falcao', 'Lobo',
  'Urso', 'Puma', 'Corvo', 'Lince', 'Touro',
];

export function generateUsername(): string {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${noun}${num}`;
}

export function generatePassword(): string {
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower  = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const syms   = '@#$!';
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const chars = [
    pick(upper), pick(upper), pick(lower), pick(lower),
    pick(digits), pick(digits), pick(syms),
    pick(upper + lower + digits), pick(upper + lower + digits), pick(upper + lower + digits),
  ];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface InviteResult {
  username: string;
  password: string;
  emailSent: boolean;
  emailError?: string;
}

export interface InviteUserData extends CreateUserData {
  /** Cargo do funcionário (role=funcionario) */
  cargo?: string;
  /** Unidade do morador (role=morador) */
  unidadeId?: string;
  /** Tipo de morador: proprietario | inquilino */
  tipoMorador?: 'proprietario' | 'inquilino';
}

// ─────────────────────────────────────────────
// FLUXO COMPLETO DE CONVITE
// ─────────────────────────────────────────────

export async function inviteUser(data: InviteUserData): Promise<InviteResult> {
  const emailNorm = data.email.trim().toLowerCase();

  // 1. Verificar duplicado
  const existente = await getUserByEmail(emailNorm);
  if (existente) {
    const origem = existente.source === 'usuarios_pre_registro'
      ? 'pré-registo (convite pendente)'
      : 'utilizadores activos';
    throw new Error(`Já existe um utilizador com o email "${emailNorm}" em ${origem}.`);
  }

  const username = generateUsername();
  const password = generatePassword();

  // 2. Criar conta no Firebase Auth via API Route server-side
  const authRes = await fetch('/api/create-temp-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailNorm, password }),
  });

  if (!authRes.ok) {
    const body = await authRes.json().catch(() => ({}));
    throw new Error(body.error ?? 'Erro ao criar conta de autenticação.');
  }

  const { uid } = await authRes.json();

  // 3. Payload base em `usuarios`
  const payload: Record<string, unknown> = {
    uid,
    nome:                  data.nome || username,
    email:                 emailNorm,
    telefone:              data.telefone ?? '',
    role:                  data.role,
    status:                data.status ?? 'ativo',
    tempUsername:          username,
    mustChangeCredentials: true,
    isEmailVerified:       false,
    createdAt:             serverTimestamp(),
    updatedAt:             serverTimestamp(),
  };

  if (data.condominioId)               payload.condominioId       = data.condominioId;
  if (data.condominiosGeridos?.length) payload.condominiosGeridos = data.condominiosGeridos;
  if (data.cargo)                      payload.cargo              = data.cargo;

  await setDoc(doc(db, 'usuarios', uid), payload);

  // 4. Se for morador, criar/actualizar doc em `moradores`
  if (data.role === 'morador' && data.unidadeId && data.condominioId) {
    const unidadeSnap = await getDoc(doc(db, 'unidades', data.unidadeId));
    const unidadeData = unidadeSnap.exists() ? unidadeSnap.data() : null;

    await setDoc(doc(db, 'moradores', emailNorm), {
      condominioId:  data.condominioId,
      unidadeId:     data.unidadeId,
      unidadeNumero: unidadeData?.numero ?? null,
      bloco:         unidadeData?.bloco  ?? null,
      nome:          data.nome,
      telefone:      data.telefone ?? null,
      email:         emailNorm,
      tipo:          data.tipoMorador ?? 'proprietario',
      status:        'ativo',
      uid,
      dataEntrada:   serverTimestamp(),
      createdAt:     serverTimestamp(),
      updatedAt:     serverTimestamp(),
    });

    // Marcar unidade como ocupada
    await updateDoc(doc(db, 'unidades', data.unidadeId), {
      status:    'ocupada',
      updatedAt: serverTimestamp(),
    });
  }

  // 5. Enviar email com as credenciais
  let emailSent = false;
  let emailError: string | undefined;

  try {
    const res = await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:    emailNorm,
        nome:     data.nome || username,
        username,
        password,
        role:     data.role,
      }),
    });

    if (res.ok) {
      emailSent = true;
      await updateDoc(doc(db, 'usuarios', uid), {
        emailStatus:          'email_enviado',
        emailStatusUpdatedAt: serverTimestamp(),
        updatedAt:            serverTimestamp(),
      });
    } else {
      const body = await res.json().catch(() => ({}));
      emailError = body.error ?? 'Erro desconhecido ao enviar email.';
    }
  } catch (err: any) {
    emailError = err?.message ?? 'Falha de rede ao enviar email.';
  }

  return { username, password, emailSent, emailError };
}
