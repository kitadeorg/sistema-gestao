// hooks/useCondominioAtivo.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { getCondominioById, getCondominiosByIds, getCondominios } from '@/lib/firebase/condominios';
import type { Condominio } from '@/types';

// ─────────────────────────────────────────────
// CONSTANTE
// ─────────────────────────────────────────────

const STORAGE_KEY = 'condominioAtivoId';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type ModoNavegacao = 'global' | 'condominio';

export interface UseCondominioAtivoReturn {
  /** Condomínio atualmente selecionado (null = visão global) */
  condominioAtivo: Condominio | null;

  /** Lista de condomínios a que o utilizador tem acesso */
  condominiosDisponiveis: Condominio[];

  /** Modo de navegação atual */
  modoNavegacao: ModoNavegacao;

  /** True enquanto os dados estão a ser carregados */
  loading: boolean;

  /** Seleciona um condomínio específico */
  selecionarCondominio: (id: string) => void;

  /** Volta para a visão global (só disponível para admin e gestor) */
  irParaVisaoGlobal: () => void;

  /** True se o utilizador pode aceder à visão global */
  podeVerVisaoGlobal: boolean;
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useCondominioAtivo(): UseCondominioAtivoReturn {
  const { isAdmin, isGestor, condominiosAcessiveis, userData } = useAuthContext();

  const [condominioAtivo,       setCondominioAtivo]       = useState<Condominio | null>(null);
  const [condominiosDisponiveis, setCondominiosDisponiveis] = useState<Condominio[]>([]);
  const [loading,               setLoading]               = useState(true);

  // Admin e gestor podem ver a visão global
  const podeVerVisaoGlobal = isAdmin || isGestor;

  const modoNavegacao: ModoNavegacao = condominioAtivo ? 'condominio' : 'global';

  // ── Carregar lista de condomínios disponíveis ──
  useEffect(() => {
    if (!userData) return;

    const carregar = async () => {
      setLoading(true);
      try {
        let lista: Condominio[] = [];

        if (isAdmin) {
          // Admin vê todos
          lista = await getCondominios();
        } else if (condominiosAcessiveis.length > 0) {
          // Gestor/síndico/etc: só os seus
          lista = await getCondominiosByIds(condominiosAcessiveis);
        }

        setCondominiosDisponiveis(lista);

        // ── Restaurar seleção guardada no localStorage ──
        const idGuardado = localStorage.getItem(STORAGE_KEY);

        if (idGuardado) {
          const condoGuardado = lista.find(c => c.id === idGuardado);
          if (condoGuardado) {
            setCondominioAtivo(condoGuardado);
            setLoading(false);
            return;
          }
        }

        // ── Comportamento padrão por role ──
        if (!podeVerVisaoGlobal && lista.length === 1) {
          // Síndico/funcionário/morador com um único condomínio:
          // seleciona automaticamente sem mostrar seletor
          setCondominioAtivo(lista[0]);
        } else {
          // Admin/gestor: começa na visão global
          setCondominioAtivo(null);
        }
      } catch (error) {
        console.error('Erro ao carregar condomínios:', error);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [userData?.uid]);

  // ── Selecionar condomínio ──
  const selecionarCondominio = useCallback((id: string) => {
    const condo = condominiosDisponiveis.find(c => c.id === id);
    if (!condo) return;

    setCondominioAtivo(condo);
    localStorage.setItem(STORAGE_KEY, id);
  }, [condominiosDisponiveis]);

  // ── Voltar para visão global ──
  const irParaVisaoGlobal = useCallback(() => {
    if (!podeVerVisaoGlobal) return;
    setCondominioAtivo(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [podeVerVisaoGlobal]);

  return {
    condominioAtivo,
    condominiosDisponiveis,
    modoNavegacao,
    loading,
    selecionarCondominio,
    irParaVisaoGlobal,
    podeVerVisaoGlobal,
  };
}