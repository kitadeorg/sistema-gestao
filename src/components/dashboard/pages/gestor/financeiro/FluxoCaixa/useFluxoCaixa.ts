import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { FluxoGeral, FluxoCaixaItem, Periodo } from './types';

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function getPeriodoRange(periodo: Periodo) {
  const now = new Date();
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  let inicio: Date;

  switch (periodo) {
    case '1m':
      inicio = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case '3m':
      inicio = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      break;
    case '6m':
      inicio = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      break;
    case '1a':
      inicio = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return { inicio, fim };
}

export function useFluxoCaixa(condominios: any[], periodo: Periodo) {
  const [dados, setDados] = useState<FluxoGeral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFluxo = useCallback(async () => {
    if (!condominios.length) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { inicio, fim } = getPeriodoRange(periodo);
      const condoIds = condominios.map((c) => c.id);
      const chunks = chunkArray(condoIds, 30);

      // ── Receita: quotas pagas no período ──────────────────────────
      const [receitaQuotasSnaps, receitaPagSnaps, despesasSnaps] = await Promise.all([
        // Quotas pagas
        Promise.all(chunks.map(ch =>
          getDocs(query(
            collection(db, 'quotas'),
            where('condominioId', 'in', ch),
            where('status', '==', 'pago'),
          ))
        )),
        // Pagamentos pagos (fallback para condomínios sem quotas)
        Promise.all(chunks.map(ch =>
          getDocs(query(
            collection(db, 'pagamentos'),
            where('condominioId', 'in', ch),
            where('status', '==', 'pago'),
          ))
        )),
        // Despesas no período
        Promise.all(chunks.map(ch =>
          getDocs(query(
            collection(db, 'despesas'),
            where('condominioId', 'in', ch),
          ))
        )),
      ]);

      // Normalizar receita de quotas
      const mapaReceita = new Map<string, number>();
      const condosComQuotas = new Set<string>();

      receitaQuotasSnaps.flatMap(s => s.docs).forEach(doc => {
        const d = doc.data();
        const dataPag = d.dataPagamento?.toDate?.();
        if (!dataPag || dataPag < inicio || dataPag > fim) return;
        mapaReceita.set(d.condominioId, (mapaReceita.get(d.condominioId) ?? 0) + (d.valor ?? 0));
        condosComQuotas.add(d.condominioId);
      });

      // Fallback: pagamentos para condomínios sem quotas
      receitaPagSnaps.flatMap(s => s.docs).forEach(doc => {
        const d = doc.data();
        if (condosComQuotas.has(d.condominioId)) return; // já tem quotas
        const dataPag = d.dataPagamento?.toDate?.();
        if (!dataPag || dataPag < inicio || dataPag > fim) return;
        mapaReceita.set(d.condominioId, (mapaReceita.get(d.condominioId) ?? 0) + (d.valor ?? 0));
      });

      // Despesas por condomínio no período
      const mapaDespesas = new Map<string, number>();
      despesasSnaps.flatMap(s => s.docs).forEach(doc => {
        const d = doc.data();
        const dataDespesa = d.data?.toDate?.();
        if (!dataDespesa || dataDespesa < inicio || dataDespesa > fim) return;
        mapaDespesas.set(d.condominioId, (mapaDespesas.get(d.condominioId) ?? 0) + (d.valor ?? 0));
      });

      // Montar por condomínio
      const porCondominio: FluxoCaixaItem[] = condominios.map(condo => {
        const receita  = mapaReceita.get(condo.id) ?? 0;
        const despesas = mapaDespesas.get(condo.id) ?? 0;
        const margem   = receita - despesas;
        const margemPercent = receita > 0 ? (margem / receita) * 100 : 0;
        return {
          condominioId:   condo.id,
          condominioNome: condo.nome ?? 'Sem nome',
          receita,
          despesas,
          margem,
          margemPercent,
        };
      });

      const receitaTotal  = porCondominio.reduce((a, c) => a + c.receita, 0);
      const despesasTotal = porCondominio.reduce((a, c) => a + c.despesas, 0);
      const margemTotal   = receitaTotal - despesasTotal;
      const margemPercent = receitaTotal > 0 ? (margemTotal / receitaTotal) * 100 : 0;

      setDados({ receitaTotal, despesasTotal, margemTotal, margemPercent, porCondominio });

    } catch (err) {
      console.error(err);
      setError('Erro ao carregar fluxo de caixa.');
    } finally {
      setLoading(false);
    }
  }, [condominios, periodo]);

  useEffect(() => { fetchFluxo(); }, [fetchFluxo]);

  return { dados, loading, error, refresh: fetchFluxo };
}
