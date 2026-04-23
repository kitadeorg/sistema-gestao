import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { Pagamento } from './types';

export function usePagamentos(condominioId: string) {

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPagamentos = async () => {
    if (!condominioId) return;

    setLoading(true);

    const q = query(
      collection(db, 'pagamentos'),
      where('condominioId', '==', condominioId),
      orderBy('data', 'desc')
    );

    const snap = await getDocs(q);

    setPagamentos(
      snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      } as Pagamento))
    );

    setLoading(false);
  };

  useEffect(() => {
    fetchPagamentos();
  }, [condominioId]);

  return {
    pagamentos,
    loading,
    refresh: fetchPagamentos,
  };
}