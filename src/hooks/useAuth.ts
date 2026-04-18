// hooks/useAuth.ts
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';
import type { UserData } from '@/contexts/AuthContext';

// ─────────────────────────────────────────────
// TIPO DE RETORNO
// ─────────────────────────────────────────────

export interface UseAuthReturn {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useAuth(): UseAuthReturn {
  const [user,     setUser]     = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          const userDocRef  = doc(db, 'usuarios', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();

            // Mapeia o documento do Firestore para o tipo UserData completo
            const mapped: UserData = {
              uid:      firebaseUser.uid,
              role:     data.role     ?? 'morador',
              nome:     data.nome     ?? '',
              email:    data.email    ?? firebaseUser.email ?? '',
              telefone: data.telefone,
              avatarUrl: data.avatarUrl ?? firebaseUser.photoURL ?? undefined,
              status:   data.status   ?? 'ativo',

              // Relação utilizador ↔ condomínio
              condominioId:       data.condominioId       ?? undefined,
              condominiosGeridos: data.condominiosGeridos ?? undefined,
            };

            setUserData(mapped);
          } else {
            // Documento não existe no Firestore — utilizador autenticado mas sem perfil
            console.warn(`Perfil não encontrado para uid: ${firebaseUser.uid}`);
            setUserData(null);
          }
        } else {
          setUser(null);
          setUserData(null);
        }
      } catch (error) {
        console.error('Erro ao buscar dados do utilizador:', error);
        setUser(null);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, userData, loading };
}