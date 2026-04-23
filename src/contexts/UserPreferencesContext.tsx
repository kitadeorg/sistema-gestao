'use client';

import {
  createContext, useContext, useEffect, useState, useCallback, ReactNode,
} from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from './AuthContext';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type Tema = 'claro' | 'escuro' | 'sistema';
export type IdiomaApp = 'pt' | 'en';
export type DensidadeUI = 'compacta' | 'normal' | 'espaçosa';

export interface UserPreferences {
  tema: Tema;
  densidade: DensidadeUI;
  notificacoesEmail: boolean;
  notificacoesPush: boolean;
  notificacoesOcorrencias: boolean;
  notificacoesFinanceiro: boolean;
  idioma: IdiomaApp;
  animacoes: boolean;
  mostrarAvatares: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  tema: 'claro',
  densidade: 'normal',
  notificacoesEmail: true,
  notificacoesPush: true,
  notificacoesOcorrencias: true,
  notificacoesFinanceiro: true,
  idioma: 'pt',
  animacoes: true,
  mostrarAvatares: true,
};

const LS_KEY = 'user_prefs_cache';

// ─────────────────────────────────────────────
// HELPERS DE TEMA — aplicam diretamente no DOM
// ─────────────────────────────────────────────

function applyTheme(tema: Tema) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = tema === 'escuro' || (tema === 'sistema' && prefersDark);

  if (isDark) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

function applyAnimations(on: boolean) {
  if (typeof document === 'undefined') return;
  if (on) {
    document.documentElement.classList.remove('no-animations');
  } else {
    document.documentElement.classList.add('no-animations');
  }
}

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────

interface UserPreferencesContextType {
  prefs: UserPreferences;
  saving: boolean;
  loading: boolean;
  updatePref: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  savePrefs: () => Promise<void>;
  isDark: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthContext();

  // Inicializa com cache do localStorage para aplicar tema instantaneamente
  const [prefs, setPrefs] = useState<UserPreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFS;
    try {
      const cached = localStorage.getItem(LS_KEY);
      if (cached) return { ...DEFAULT_PREFS, ...JSON.parse(cached) };
    } catch { /* ignora */ }
    return DEFAULT_PREFS;
  });

  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Aplicar tema imediatamente ao montar (usa cache do localStorage) ──
  useEffect(() => {
    applyTheme(prefs.tema);
    applyAnimations(prefs.animacoes);
  }, []); // só na montagem — o efeito abaixo trata das mudanças

  // ── Reagir a mudanças de prefs em tempo real ──
  useEffect(() => {
    applyTheme(prefs.tema);
  }, [prefs.tema]);

  useEffect(() => {
    applyAnimations(prefs.animacoes);
  }, [prefs.animacoes]);

  // ── Carregar preferências do Firestore ──
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    const load = async () => {
      try {
        const ref  = doc(db, 'user_preferences', user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const loaded = { ...DEFAULT_PREFS, ...(snap.data() as Partial<UserPreferences>) };
          setPrefs(loaded);
          // Guardar no localStorage para próxima visita
          try { localStorage.setItem(LS_KEY, JSON.stringify(loaded)); } catch { /* ignora */ }
        }
      } catch (e) {
        console.error('[UserPreferences] Erro ao carregar:', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.uid, authLoading]);

  const updatePref = useCallback(<K extends keyof UserPreferences>(
    key: K, value: UserPreferences[K],
  ) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }, []);

  const savePrefs = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'user_preferences', user.uid), {
        ...prefs,
        updatedAt: serverTimestamp(),
      });
      // Actualizar cache local
      try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch { /* ignora */ }
    } catch (e) {
      console.error('[UserPreferences] Erro ao guardar:', e);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [user, prefs]);

  const isDark = prefs.tema === 'escuro' ||
    (prefs.tema === 'sistema' && typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <UserPreferencesContext.Provider value={{ prefs, saving, loading, updatePref, savePrefs, isDark }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  return ctx;
}
