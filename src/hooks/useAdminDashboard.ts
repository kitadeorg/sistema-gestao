'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import type {
  DashboardAdminData,
  KPIData,
  CondominioPerfomance,
  ReceitaMensalData,
  AlertaDashboard,
} from '@/types/admin';

interface UseAdminDashboardProps {
  startDate: Date;
  endDate: Date;
  selectedCondo?: string;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Divide array em blocos de N (limite Firestore 'in' = 30) */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Rótulo curto do mês: "Jan", "Fev", … */
function mesLabel(date: Date): string {
  return date.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '');
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useAdminDashboard({
  startDate,
  endDate,
  selectedCondo,
}: UseAdminDashboardProps) {
  const [data,    setData]    = useState<DashboardAdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCondo) { setLoading(false); return; }

    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);

        const isGlobal = selectedCondo === 'all';

        // ── 1. Condomínios ──────────────────────────────────────────
        const condosSnap = await getDocs(collection(db, 'condominios'));
        const todosCondos = condosSnap.docs.map(d => ({
          id:           d.id,
          nome:         d.data().nome         ?? 'Condomínio',
          status:       d.data().status        ?? 'inactive',
          totalUnidades: d.data().totalUnidades ?? 0,
        }));

        const condosFiltrados = isGlobal
          ? todosCondos
          : todosCondos.filter(c => c.id === selectedCondo);

        const condoIds = condosFiltrados.map(c => c.id);

        if (!condoIds.length) {
          setData(buildEmpty(startDate, endDate));
          return;
        }

        // ── 2. Pagamentos (dados financeiros reais) ─────────────────
        const pagamentosRef = collection(db, 'pagamentos');
        const chunks = chunk(condoIds, 30);

        const pagSnaps = await Promise.all(
          chunks.map(ch =>
            getDocs(query(pagamentosRef, where('condominioId', 'in', ch)))
          )
        );

        interface PagamentoDoc {
          id: string;
          valor?: number;
          condominioId?: string;
          status?: string;
          dataPagamento?: { toDate?: () => Date } | Date;
          dataVencimento?: { toDate?: () => Date } | Date;
        }

        const pagamentos: PagamentoDoc[] = pagSnaps.flatMap(s =>
          s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PagamentoDoc, 'id'>) }))
        );

        // ── 3. Moradores ────────────────────────────────────────────
        const moradoresRef = collection(db, 'moradores');
        const morSnaps = await Promise.all(
          chunks.map(ch =>
            getDocs(query(moradoresRef, where('condominioId', 'in', ch)))
          )
        );
        const totalMoradores = morSnaps.reduce((acc, s) => acc + s.size, 0);

        // ── 4. Ocorrências abertas ──────────────────────────────────
        const ocorrRef = collection(db, 'ocorrencias');
        const ocorrSnaps = await Promise.all(
          chunks.map(ch =>
            getDocs(query(
              ocorrRef,
              where('condominioId', 'in', ch),
              where('status', '==', 'aberta'),
            ))
          )
        );
        const ocorrenciasAbertas = ocorrSnaps.reduce((acc, s) => acc + s.size, 0);

        // ── 5. Utilizadores activos ─────────────────────────────────
        const usuariosSnap = await getDocs(
          query(collection(db, 'usuarios'), where('status', '==', 'ativo'))
        );
        const usuariosAtivos = usuariosSnap.size;

        // ── 6. Calcular KPIs financeiros ────────────────────────────
        let receitaTotal = 0;
        let totalPago    = 0;
        let totalPendente = 0;
        let totalAtrasado = 0;

        const now = new Date();
        const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
        const fimMes    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Mapa: condominioId → métricas (para CondominioPerfomance)
        const condoMetrics: Record<string, {
          receita: number; pago: number; pendente: number; atrasado: number; moradores: number;
        }> = {};
        condoIds.forEach(id => {
          condoMetrics[id] = { receita: 0, pago: 0, pendente: 0, atrasado: 0, moradores: 0 };
        });

        // Moradores por condomínio
        morSnaps.flatMap(s => s.docs).forEach(d => {
          const cid = d.data().condominioId;
          if (condoMetrics[cid]) condoMetrics[cid].moradores++;
        });

        // Pagamentos
        pagamentos.forEach(p => {
          const valor = p.valor ?? 0;
          const cid   = p.condominioId;
          if (!cid) return;

          receitaTotal += valor;
          if (condoMetrics[cid]) condoMetrics[cid].receita += valor;

          if (p.status === 'pago') {
            totalPago += valor;
            if (condoMetrics[cid]) condoMetrics[cid].pago += valor;
          }
          if (p.status === 'pendente') {
            totalPendente += valor;
            if (condoMetrics[cid]) condoMetrics[cid].pendente += valor;
          }
          if (p.status === 'atrasado') {
            totalAtrasado += valor;
            if (condoMetrics[cid]) condoMetrics[cid].atrasado += valor;
          }
        });

        const taxaInadimplenciaMedia =
          receitaTotal > 0
            ? ((totalPendente + totalAtrasado) / receitaTotal) * 100
            : 0;

        const totalUnidades = condosFiltrados.reduce(
          (acc, c) => acc + (c.totalUnidades ?? 0), 0
        );

        const kpis: KPIData = {
          receitaTotal,
          totalUnidades,
          totalMoradores,
          taxaInadimplenciaMedia,
          ocorrenciasAbertas,
          usuariosAtivos,
        };

        // ── 7. Performance por condomínio ───────────────────────────
        const condominiosData: CondominioPerfomance[] = condosFiltrados.map(c => {
          const m = condoMetrics[c.id];
          const inadimplencia = m.receita > 0
            ? ((m.pendente + m.atrasado) / m.receita) * 100
            : 0;
          return {
            id:           c.id,
            nome:         c.nome,
            unidades:     c.totalUnidades ?? 0,
            moradores:    m.moradores,
            receita:      m.receita,
            inadimplencia,
            status:       c.status === 'active' ? 'ativo' : 'inativo',
          };
        });

        // ── 8. Receita mensal (últimos 6 meses) ─────────────────────
        const receitaMensalData: ReceitaMensalData[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

          const receitaMes = pagamentos
            .filter(p => {
              const raw = p.dataPagamento;
              const dataPag = raw && typeof raw === 'object' && 'toDate' in raw && raw.toDate
                ? raw.toDate()
                : raw instanceof Date ? raw : null;
              return (
                p.status === 'pago' &&
                dataPag instanceof Date &&
                dataPag >= d &&
                dataPag <= fim
              );
            })
            .reduce((acc, p) => acc + (p.valor ?? 0), 0);

          receitaMensalData.push({
            mes:    mesLabel(d),
            receita: receitaMes,
            meta:    receitaTotal / 6, // meta simples = média
          });
        }

        // ── 9. Alertas automáticos ──────────────────────────────────
        const alertas: AlertaDashboard[] = [];

        if (taxaInadimplenciaMedia > 20) {
          alertas.push({
            id:       'inadimplencia-alta',
            tipo:     'critico',
            titulo:   'Inadimplência elevada',
            mensagem: `Taxa média de ${taxaInadimplenciaMedia.toFixed(1)}% — acima do limite recomendado de 20%.`,
            data:     new Date(),
          });
        }

        if (ocorrenciasAbertas > 10) {
          alertas.push({
            id:       'ocorrencias-abertas',
            tipo:     'aviso',
            titulo:   `${ocorrenciasAbertas} ocorrências em aberto`,
            mensagem: 'Existem ocorrências por resolver. Verifique o painel operacional.',
            data:     new Date(),
          });
        }

        if (totalAtrasado > 0) {
          alertas.push({
            id:       'pagamentos-atrasados',
            tipo:     'aviso',
            titulo:   'Pagamentos em atraso',
            mensagem: `Total em atraso: ${(totalAtrasado / 1000).toFixed(1)}k Kz.`,
            data:     new Date(),
          });
        }

        // ── 10. Montar resultado final ──────────────────────────────
        setData({
          periodo:             { dataInicio: startDate, dataFim: endDate },
          kpis,
          condominios:         condominiosData,
          gestores:            [],
          receitaMensalData,
          inadimplenciaData:   [],
          distribuicaoUsuarios: [],
          alertas,
          ocorrenciasStatus: {
            aberta:      ocorrenciasAbertas,
            emAndamento: 0,
            resolvida:   0,
          },
        });

      } catch (err: any) {
        console.error('[useAdminDashboard] Erro:', err);
        setError('Erro ao carregar dados do dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [selectedCondo, startDate.toISOString(), endDate.toISOString()]);

  return { data, loading, error };
}

// ─────────────────────────────────────────────
// HELPER — estado vazio
// ─────────────────────────────────────────────

function buildEmpty(startDate: Date, endDate: Date): DashboardAdminData {
  return {
    periodo:             { dataInicio: startDate, dataFim: endDate },
    kpis:                { receitaTotal: 0, totalUnidades: 0, totalMoradores: 0, taxaInadimplenciaMedia: 0, ocorrenciasAbertas: 0, usuariosAtivos: 0 },
    condominios:         [],
    gestores:            [],
    receitaMensalData:   [],
    inadimplenciaData:   [],
    distribuicaoUsuarios: [],
    alertas:             [],
    ocorrenciasStatus:   { aberta: 0, emAndamento: 0, resolvida: 0 },
  };
}
