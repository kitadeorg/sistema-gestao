'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUnidades } from '@/lib/firebase/unidades';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { UnidadeDoc, MoradorDoc } from '@/types/firestore';

// Tipo com id incluído (como vem do Firestore)
export type Unidade = { id: string } & Partial<UnidadeDoc> & Record<string, any>;

export function useUnidades(condoId: string) {

  const { isSuperAdmin } = useAuthContext();

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [moradoresMap, setMoradoresMap] = useState<Record<string, MoradorDoc>>({});
  const [financeiroMap, setFinanceiroMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchUnidades = useCallback(async () => {
    if (!condoId) return;

    setLoading(true);

    const data = await getUnidades(condoId, isSuperAdmin);
    setUnidades(data);

    const moradoresSnap = await getDocs(
      query(collection(db, 'moradores'), where('condominioId', '==', condoId))
    );

    const moradoresTemp: Record<string, MoradorDoc> = {};
    moradoresSnap.docs.forEach((doc) => {
      const m = doc.data() as MoradorDoc;
      if (m.unidadeId) moradoresTemp[m.unidadeId] = m;
    });

    setMoradoresMap(moradoresTemp);

    const pagamentosSnap = await getDocs(
      query(collection(db, 'pagamentos'), where('condominioId', '==', condoId))
    );

    const financeiroTemp: Record<string, number> = {};
    pagamentosSnap.docs.forEach((doc) => {
      const p = doc.data();
      if (p.unidadeId && p.status === 'pendente') {
        financeiroTemp[p.unidadeId] =
          (financeiroTemp[p.unidadeId] || 0) + (p.valor || 0);
      }
    });

    setFinanceiroMap(financeiroTemp);
    setLoading(false);
  }, [condoId, isSuperAdmin]);

  useEffect(() => {
    fetchUnidades();
  }, [fetchUnidades]);

  return {
    unidades,
    moradoresMap,
    financeiroMap,
    loading,
    refresh: fetchUnidades,
  };
}