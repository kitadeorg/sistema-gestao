'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import FluxoCaixaContent from '../../../../../portfolio/FluxoCaixaContent';

export default function FluxoCaixaPage() {
  const [condominios, setCondominios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCondominios = async () => {
      try {
        const snap = await getDocs(collection(db, 'condominios'));
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCondominios(data);
      } catch (error) {
        console.error('Erro ao buscar condomínios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCondominios();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <FluxoCaixaContent condominios={condominios} />;
}