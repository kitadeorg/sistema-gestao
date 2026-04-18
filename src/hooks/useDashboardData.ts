'use client';

// hooks/useDashboardData.ts

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import type { UserRole } from '@/types';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface CondominioData {
  id: string;
  nome: string;
}

interface FinanceiroData {
  valor: number;
  status: 'pago' | 'pendente' | 'atrasado';
  condominioId: string;
}

interface OcorrenciaData {
  status: 'aberto' | 'fechado';
  condominioId: string;
}

interface UnidadeData {
  condominioId: string;
}

export interface DashboardMetrics {
  totalReceita: number;
  totalUnidades: number;
  taxaInadimplencia: number;
  manutencaoAberta: number;
}

export interface UseDashboardDataReturn {
  metrics: DashboardMetrics | null;
  condominiosList: CondominioData[];
  selectedCondo: string;
  setSelectedCondo: (id: string) => void;
  loading: boolean;
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useDashboardData(
  userRole: UserRole | '',
  condominioId?: string,
  condominiosGeridos?: string[],
): UseDashboardDataReturn {
  const [loading,          setLoading]          = useState(true);
  const [condominiosList,  setCondominiosList]  = useState<CondominioData[]>([]);
  const [selectedCondo,    setSelectedCondo]    = useState<string>('all');
  const [allUnidades,      setAllUnidades]      = useState<UnidadeData[]>([]);
  const [allFinanceiro,    setAllFinanceiro]    = useState<FinanceiroData[]>([]);
  const [allOcorrencias,   setAllOcorrencias]   = useState<OcorrenciaData[]>([]);

  // ── Carregar dados iniciais ──
  useEffect(() => {
    if (!userRole) return;

    const loadInitialData = async () => {
      setLoading(true);
      try {
        let targetCondoIds: string[] = [];

        // 1. Determinar quais condomínios buscar consoante o role
        if (userRole === 'admin') {
          const condosSnap = await getDocs(collection(db, 'condominios'));
          const adminCondos = condosSnap.docs.map(d => ({
            id: d.id,
            nome: d.data().nome || 'Condomínio',
          }));
          setCondominiosList([{ id: 'all', nome: 'Todos os Condomínios' }, ...adminCondos]);
          targetCondoIds = adminCondos.map(c => c.id);

        } else if (userRole === 'gestor' && condominiosGeridos?.length) {
          // Buscar dados de cada condomínio do portfólio em paralelo
          const condoData = await Promise.all(
            condominiosGeridos.map(async (id) => {
              const snap = await getDoc(doc(db, 'condominios', id));
              return snap.exists()
                ? { id, nome: snap.data().nome || 'Condomínio' }
                : null;
            }),
          );
          const lista = condoData.filter(Boolean) as CondominioData[];
          setCondominiosList([{ id: 'all', nome: 'Visão Consolidada' }, ...lista]);
          targetCondoIds = condominiosGeridos;

        } else if (
          (userRole === 'sindico' || userRole === 'funcionario' || userRole === 'morador') &&
          condominioId
        ) {
          // Utilizador ligado a um único condomínio
          const snap = await getDoc(doc(db, 'condominios', condominioId));
          if (snap.exists()) {
            setCondominiosList([{ id: condominioId, nome: snap.data().nome || 'Condomínio' }]);
          }
          targetCondoIds = [condominioId];
          setSelectedCondo(condominioId); // Fixa o condomínio, sem opção "all"
        }

        if (targetCondoIds.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Firestore limita 'in' a 30 items — buscar em lotes se necessário
        const chunks: string[][] = [];
        for (let i = 0; i < targetCondoIds.length; i += 30) {
          chunks.push(targetCondoIds.slice(i, i + 30));
        }

        const [unidadesResults, financeiroResults, ocorrenciasResults] = await Promise.all([
          Promise.all(chunks.map(chunk =>
            getDocs(query(collection(db, 'unidades'), where('condominioId', 'in', chunk)))
          )),
          Promise.all(chunks.map(chunk =>
            getDocs(query(collection(db, 'financeiro'), where('condominioId', 'in', chunk)))
          )),
          Promise.all(chunks.map(chunk =>
            getDocs(query(collection(db, 'ocorrencias'), where('condominioId', 'in', chunk)))
          )),
        ]);

        setAllUnidades(
          unidadesResults.flatMap(snap => snap.docs.map(d => d.data() as UnidadeData))
        );
        setAllFinanceiro(
          financeiroResults.flatMap(snap => snap.docs.map(d => d.data() as FinanceiroData))
        );
        setAllOcorrencias(
          ocorrenciasResults.flatMap(snap => snap.docs.map(d => d.data() as OcorrenciaData))
        );

      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [userRole, condominioId, condominiosGeridos?.join(',')]);

  // ── Calcular métricas com useMemo (sem chamadas ao Firestore) ──
  const metrics = useMemo<DashboardMetrics>(() => {
    const isAll = selectedCondo === 'all';

    const unidades    = isAll ? allUnidades    : allUnidades.filter(u => u.condominioId === selectedCondo);
    const financeiro  = isAll ? allFinanceiro  : allFinanceiro.filter(f => f.condominioId === selectedCondo);
    const ocorrencias = isAll ? allOcorrencias : allOcorrencias.filter(o => o.condominioId === selectedCondo);

    let totalReceita = 0;
    let totalDivida  = 0;
    let totalQuotas  = 0;

    financeiro.forEach(item => {
      totalQuotas += item.valor || 0;
      if (item.status === 'pago') {
        totalReceita += item.valor || 0;
      } else {
        totalDivida += item.valor || 0;
      }
    });

    return {
      totalReceita,
      totalUnidades:     unidades.length,
      taxaInadimplencia: totalQuotas > 0 ? (totalDivida / totalQuotas) * 100 : 0,
      manutencaoAberta:  ocorrencias.filter(o => o.status === 'aberto').length,
    };
  }, [allUnidades, allFinanceiro, allOcorrencias, selectedCondo]);

  return {
    metrics,
    condominiosList,
    selectedCondo,
    setSelectedCondo,
    loading,
  };
}