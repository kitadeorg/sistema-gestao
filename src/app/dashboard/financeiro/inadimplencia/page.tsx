'use client';

import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { getCondominiosByUser } from '@/lib/firebase/condominios';
import InadimplenciaContent from '@/components/dashboard/pages/gestor/financeiro/InadimplenciaContent';

export default function InadimplenciaPage() {
  const { userData } = useAuthContext();
  const [condominios, setCondominios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;
    const fetchCondominios = async () => {
      try {
        const data = await getCondominiosByUser(
          userData.role,
          userData.condominioId,
          userData.condominiosGeridos,
        );
        setCondominios(data);
      } catch (error) {
        console.error('Erro ao buscar condomínios:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCondominios();
  }, [userData?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <InadimplenciaContent condominios={condominios} />;
}