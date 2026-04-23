'use client';

import { useState, useEffect } from 'react';
import { getUnidades } from '@/lib/firebase/unidades';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';

export function useUnidades(condoId: string) {

  const { isAdmin } = useAuthContext();

  const [unidades, setUnidades] = useState<any[]>([]);
  const [moradoresMap, setMoradoresMap] = useState<Record<string, any>>({});
  const [financeiroMap, setFinanceiroMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchUnidades = async () => {
    if (!condoId) return;

    setLoading(true);

    const data = await getUnidades(condoId, isAdmin);
    setUnidades(data);

    const moradoresSnap = await getDocs(
      query(collection(db, 'moradores'), where('condominioId', '==', condoId))
    );

    const moradoresTemp: Record<string, any> = {};
    moradoresSnap.docs.forEach((doc) => {
      const m = doc.data();
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
  };

  useEffect(() => {
    fetchUnidades();
  }, [condoId]);

  return {
    unidades,
    moradoresMap,
    financeiroMap,
    loading,
    refresh: fetchUnidades,
  };
}