// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useAuth as useAuthHook } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

/* ─────────────────────────────────────────────────────────────────────────────
   TIPOS
───────────────────────────────────────────────────────────────────────────── */

export interface UserData {
  uid: string;
  role: UserRole;
  nome: string;
  email: string;
  telefone?: string;
  avatarUrl?: string;
  status: 'ativo' | 'inativo' | 'pendente';

  condominioId?: string;
  condominiosGeridos?: string[];

  // Campos do morador — preenchidos pelo useAuth se role === 'morador'
  moradorId?: string;
  unidadeId?: string;
  unidadeNumero?: string;
  bloco?: string;
}

export interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;

  isAdmin: boolean;
  isGestor: boolean;
  isSindico: boolean;
  isFuncionario: boolean;
  isMorador: boolean;

  condominiosAcessiveis: string[];
  isMultiCondominio: boolean;
  condominioIdPrincipal: string | undefined;
  
  currentCondominioId: string | null;
  setCurrentCondominio: (id: string | null) => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONTEXT
───────────────────────────────────────────────────────────────────────────── */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ─────────────────────────────────────────────────────────────────────────────
   PROVIDER
───────────────────────────────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthHook(); 
  const { userData } = auth;
  
  // ✅ ESTADO DO CONDOMÍNIO ATIVO
  const [currentCondominioId, setCurrentCondominioId] = useState<string | null>(null);

  const isAdmin       = userData?.role === 'admin';
  const isGestor      = userData?.role === 'gestor';
  const isSindico     = userData?.role === 'sindico';
  const isFuncionario = userData?.role === 'funcionario';
  const isMorador     = userData?.role === 'morador';

  const condominiosAcessiveis: string[] = (() => {
    if (!userData) return [];
    if (isAdmin)  return [];
    if (isGestor) return userData.condominiosGeridos ?? [];
    if (userData.condominioId) return [userData.condominioId];
    return [];
  })();

  const isMultiCondominio = isAdmin || condominiosAcessiveis.length > 1;

  const condominioIdPrincipal: string | undefined = (() => {
    if (!userData) return undefined;
    if (userData.condominioId) return userData.condominioId;
    if (isGestor) return userData.condominiosGeridos?.[0];
    return undefined;
  })();

  useEffect(() => {
    if (!currentCondominioId && condominioIdPrincipal) {
      setCurrentCondominioId(condominioIdPrincipal);
    }
  }, [condominioIdPrincipal, currentCondominioId]);

  const value: AuthContextType = {
    ...auth,
    isAdmin,
    isGestor,
    isSindico,
    isFuncionario,
    isMorador,
    condominiosAcessiveis,
    isMultiCondominio,
    condominioIdPrincipal,
    currentCondominioId,
    setCurrentCondominio: setCurrentCondominioId,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HOOK PRINCIPAL
───────────────────────────────────────────────────────────────────────────── */

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an <AuthProvider>');
  }
  return context;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HOOK ALIAS — retrocompatibilidade
───────────────────────────────────────────────────────────────────────────── */

export function useAuth() {
  return useAuthContext();
}