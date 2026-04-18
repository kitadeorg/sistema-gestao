// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface UserData {
  uid: string;
  role: UserRole;
  nome: string;
  email: string;
  telefone?: string;
  avatarUrl?: string;
  status: 'ativo' | 'inativo' | 'pendente';

  // --- Relação utilizador ↔ condomínio ---
  /** Para síndicos, funcionários e moradores: ID do único condomínio associado. */
  condominioId?: string;
  /** Para gestores de portfólio: lista de IDs dos condomínios que gerem. */
  condominiosGeridos?: string[];
  // ----------------------------------------
}

export interface AuthContextType {
  /** Utilizador autenticado no Firebase Auth (null se não autenticado). */
  user: FirebaseUser | null;
  /** Dados do perfil do utilizador guardados no Firestore. */
  userData: UserData | null;
  /** True enquanto o estado de autenticação está a ser resolvido. */
  loading: boolean;

  // --- Helpers derivados (calculados uma vez aqui, usados em todo o lado) ---

  /** True se o utilizador é Admin (acesso total). */
  isAdmin: boolean;
  /** True se o utilizador é Gestor de Portfólio. */
  isGestor: boolean;
  /** True se o utilizador é Síndico. */
  isSindico: boolean;
  /** True se o utilizador é Funcionário. */
  isFuncionario: boolean;
  /** True se o utilizador é Morador. */
  isMorador: boolean;

  /**
   * IDs dos condomínios a que o utilizador tem acesso.
   * - Admin    → [] (acesso total, sem filtro)
   * - Gestor   → condominiosGeridos[]
   * - Outros   → [condominioId] (array com um único elemento)
   */
  condominiosAcessiveis: string[];

  /** True se o utilizador tem acesso a mais do que um condomínio. */
  isMultiCondominio: boolean;
}

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth(); // { user, userData, loading }

  const { userData } = auth;

  // --- Helpers de role ---
  const isAdmin      = userData?.role === 'admin';
  const isGestor     = userData?.role === 'gestor';
  const isSindico    = userData?.role === 'sindico';
  const isFuncionario = userData?.role === 'funcionario';
  const isMorador    = userData?.role === 'morador';

  // --- Lista de condomínios acessíveis ---
  const condominiosAcessiveis: string[] = (() => {
    if (!userData) return [];
    if (isAdmin) return [];                                         // sem filtro
    if (isGestor) return userData.condominiosGeridos ?? [];         // portfólio
    if (userData.condominioId) return [userData.condominioId];      // único condo
    return [];
  })();

  const isMultiCondominio = isAdmin || condominiosAcessiveis.length > 1;

  const value: AuthContextType = {
    ...auth,
    isAdmin,
    isGestor,
    isSindico,
    isFuncionario,
    isMorador,
    condominiosAcessiveis,
    isMultiCondominio,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}