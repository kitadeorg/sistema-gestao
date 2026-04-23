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

      const receitaResults = await Promise.all(
        chunks.map((chunk) =>
          getDocs(
            query(
              collection(db, 'pagamentos'),
              where('condominioId', 'in', chunk),
              where('status', '==', 'pago'),
              where('dataPagamento', '>=', Timestamp.fromDate(inicio)),
              where('dataPagamento', '<=', Timestamp.fromDate(fim))
            )
          )
        )
      );

      const receitaDocs = receitaResults.flatMap((r) => r.docs);

      const mapaReceita = new Map<string, number>();

      receitaDocs.forEach((doc) => {
        const d = doc.data();
        mapaReceita.set(d.condominioId, (mapaReceita.get(d.condominioId) || 0) + (d.valor || 0));
      });

      const porCondominio: FluxoCaixaItem[] = condominios.map((condo) => {
        const receita = mapaReceita.get(condo.id) || 0;
        return {
          condominioId: condo.id,
          condominioNome: condo.nome || 'Sem nome',
          receita,
          despesas: 0,
          margem: receita,
          margemPercent: 100,
        };
      });

      const receitaTotal = porCondominio.reduce((a, c) => a + c.receita, 0);

      setDados({
        receitaTotal,
        despesasTotal: 0,
        margemTotal: receitaTotal,
        margemPercent: 100,
        porCondominio,
      });

    } catch (err) {
      console.error(err);
      setError('Erro ao carregar fluxo de caixa.');
    } finally {
      setLoading(false);
    }

  }, [condominios, periodo]);

  useEffect(() => {
    fetchFluxo();
  }, [fetchFluxo]);

  return { dados, loading, error, refresh: fetchFluxo };
}