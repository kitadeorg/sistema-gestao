'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import OcorrenciasContentSindico from '@/components/dashboard/pages/sindico/OcorrenciasSindicoContent';

export default function OcorrenciasPage() {
  const { condoId } = useParams() as { condoId: string };
  const { isSindico, isGestor, isAdmin } = useAuthContext();

  if (isSindico || isGestor || isAdmin) {
    return <OcorrenciasContentSindico condoId={condoId} />;
  }

  return (
    <div className="p-6 text-zinc-500">
      Sem permissão para ver ocorrências.
    </div>
  );
}