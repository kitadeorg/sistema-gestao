'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { Globe, Building2 } from 'lucide-react';

export default function ViewModeSwitcher() {

  const {
    currentCondominioId,
    setCurrentCondominio,
    condominiosAcessiveis,
    isMultiCondominio,
  } = useAuthContext();

  // Se não for multi-condomínio, não renderiza
  if (!isMultiCondominio) return null;

  const isGlobal = currentCondominioId === null;

  return (
    <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-xl w-fit">

      {/* 🌍 GLOBAL */}
      <button
        onClick={() => setCurrentCondominio(null)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
          isGlobal
            ? 'bg-white shadow-sm text-zinc-900'
            : 'text-zinc-500 hover:text-zinc-800'
        }`}
      >
        <Globe size={14} />
        Global
      </button>

      {/* 🏢 INDIVIDUAL */}
      <button
        onClick={() =>
          setCurrentCondominio(condominiosAcessiveis[0] ?? null)
        }
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
          !isGlobal
            ? 'bg-white shadow-sm text-zinc-900'
            : 'text-zinc-500 hover:text-zinc-800'
        }`}
      >
        <Building2 size={14} />
        Condomínio
      </button>

    </div>
  );
}