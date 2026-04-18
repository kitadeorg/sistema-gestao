'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MapPin } from 'lucide-react';

interface Props {
  condominios: any[];
}

export default function GestorCondoList({ condominios }: Props) {
  const router = useRouter();

  if (condominios.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 text-center text-zinc-500">
        Nenhum condomínio atribuído.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {condominios.map((condo) => (
        <div
          key={condo.id}
          className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition cursor-pointer"
          onClick={() => router.push(`/dashboard/condominio/${condo.id}`)}
        >
          <div className="flex items-center gap-3 mb-3">
            <Building2 size={20} className="text-orange-500" />
            <h3 className="font-semibold text-zinc-900 truncate">
              {condo.nome}
            </h3>
          </div>

          <div className="text-sm text-zinc-500 flex items-center gap-2">
            <MapPin size={14} />
            {condo.endereco?.cidade ?? 'Localização não definida'}
          </div>
        </div>
      ))}
    </div>
  );
}