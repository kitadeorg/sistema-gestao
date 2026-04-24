// hooks/useAuth.ts
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';
import type { UserData } from '@/contexts/AuthContext';

export interface UseAuthReturn {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user,     setUser]     = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading,  setLoading]  = useState(true);

  const fetchUserData = async (firebaseUser: FirebaseUser) => {
    const userDocRef  = doc(db, 'usuarios', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.warn(`Perfil não encontrado para uid: ${firebaseUser.uid}`);
      setUserData(null);
      return;
    }

    const data = userDocSnap.data();

    const mapped: UserData = {
      uid:      firebaseUser.uid,
      role:     data.role     ?? 'morador',
      nome:     data.nome     ?? '',
      email:    data.email    ?? firebaseUser.email ?? '',
      telefone: data.telefone,
      avatarUrl: data.avatarUrl ?? firebaseUser.photoURL ?? undefined,
      status:   data.status   ?? 'ativo',
      mustChangeCredentials: data.mustChangeCredentials ?? false,
      condominioId:       data.condominioId       ?? undefined,
      condominiosGeridos: data.condominiosGeridos ?? undefined,
    };

    if (mapped.role === 'morador') {
      const email = mapped.email.toLowerCase().trim();
      const moradorDocRef  = doc(db, 'moradores', email);
      const moradorDocSnap = await getDoc(moradorDocRef);

      if (moradorDocSnap.exists()) {
        const m = moradorDocSnap.data();
        mapped.moradorId     = moradorDocSnap.id;
        mapped.unidadeId     = m.unidadeId     ?? undefined;
        mapped.unidadeNumero = m.unidadeNumero ?? undefined;
        mapped.bloco         = m.bloco         ?? undefined;
      } else {
        const q = query(collection(db, 'moradores'), where('email', '==', email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const m = snap.docs[0].data();
          mapped.moradorId     = snap.docs[0].id;
          mapped.unidadeId     = m.unidadeId     ?? undefined;
          mapped.unidadeNumero = m.unidadeNumero ?? undefined;
          mapped.bloco         = m.bloco         ?? undefined;
        }
      }
    }

    setUserData(mapped);
  };

  // Exposto para forçar re-fetch após o setup
  const refreshUserData = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) await fetchUserData(currentUser);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          await fetchUserData(firebaseUser);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, userData, loading, refreshUserData };
}