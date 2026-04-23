'use client';

import React from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

export default function ManutencaoPage() {
  const { currentCondominioId } = useAuthContext();

  const condoId = currentCondominioId ?? '';

  if (!condoId) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-12 h-12 text-orange-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-zinc-800">Nenhum condomínio selecionado</h3>
          <p className="text-sm text-zinc-500 mt-1">Selecione um condomínio no menu superior</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-black mb-4">Manutenção</h1>
      <p className="text-zinc-500">
        Implementar componente de manutenção para o condomínio {condoId}
      </p>
    </div>
  );
}