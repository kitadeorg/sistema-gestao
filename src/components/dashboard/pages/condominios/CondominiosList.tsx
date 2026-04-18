// src/components/dashboard/pages/condominios/CondominiosTable.tsx

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Condominio } from '@/types';
import { Edit, Trash2, Power, PowerOff, MoreVertical, Building, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

interface ListProps {
  data: Condominio[];
  loading: boolean;
  onEdit?: (condominio: Condominio) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string, currentStatus: 'active' | 'inactive') => void;
}

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────

const StatusBadge: React.FC<{ status: 'active' | 'inactive' }> = ({ status }) => (
  <span className={cn(
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800',
  )}>
    {status === 'active' ? 'Ativo' : 'Inativo'}
  </span>
);

// ─────────────────────────────────────────────
// CARD INDIVIDUAL
// ─────────────────────────────────────────────

const CondominioCard: React.FC<
  Omit<ListProps, 'data' | 'loading'> & { condominio: Condominio }
> = ({ condominio, onEdit, onDelete, onToggleStatus }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Só mostra o menu se houver pelo menos uma ação disponível
  const hasActions = !!(onEdit || onDelete || onToggleStatus);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">

      {/* Cabeçalho */}
      <div className="p-4 border-b border-zinc-200 flex justify-between items-start">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200 shrink-0">
            {condominio.logoUrl ? (
              <img
                src={condominio.logoUrl}
                alt={`Logo de ${condominio.nome}`}
                className="w-full h-full rounded-lg object-cover"
              />
            ) : (
              <Building size={24} className="text-zinc-400" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-zinc-900 line-clamp-1">{condominio.nome}</h3>
            <p className="text-sm text-zinc-500">{condominio.cnpj || 'NIF não informado'}</p>
          </div>
        </div>

        {/* Menu de ações — só renderiza se houver permissões */}
        {hasActions && (
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(prev => !prev)}
              className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 transition-colors"
            >
              <MoreVertical size={20} />
            </button>

            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-xl z-10 overflow-hidden">
                {onEdit && (
                  <button
                    onClick={() => { onEdit(condominio); setIsMenuOpen(false); }}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <Edit size={15} /> Editar
                  </button>
                )}
                {onToggleStatus && (
                  <button
                    onClick={() => { onToggleStatus(condominio.id, condominio.status); setIsMenuOpen(false); }}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    {condominio.status === 'active'
                      ? <><PowerOff size={15} /> Desativar</>
                      : <><Power size={15} /> Ativar</>
                    }
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => { onDelete(condominio.id); setIsMenuOpen(false); }}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} /> Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Corpo */}
      <div className="p-4 space-y-3 flex-grow">
        <div className="flex items-center gap-3 text-zinc-600">
          <MapPin size={16} className="text-zinc-400 flex-shrink-0" />
          <span className="text-sm">{condominio.endereco.cidade}, {condominio.endereco.provincia}</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-600">
          <Building size={16} className="text-zinc-400 flex-shrink-0" />
          <span className="text-sm">
            <span className="font-medium">{condominio.totalUnidades}</span> unidades
          </span>
        </div>
        <div>
          <StatusBadge status={condominio.status} />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-200 bg-zinc-50 rounded-b-xl">
        <Link
          href={`/dashboard/condominio/${condominio.id}`}
          className="w-full text-center inline-flex items-center justify-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-900 transition-colors"
        >
          Gerir Condomínio
        </Link>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────

const CardSkeleton: React.FC = () => (
  <div className="bg-white border border-zinc-200 rounded-xl shadow-sm animate-pulse">
    <div className="p-4 border-b border-zinc-200 flex justify-between items-start">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-40" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
      </div>
      <div className="h-8 w-8 bg-gray-200 rounded-full" />
    </div>
    <div className="p-4 space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
    <div className="p-4 border-t border-zinc-200">
      <div className="h-9 bg-gray-300 rounded-lg w-full" />
    </div>
  </div>
);

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

const CondominiosList: React.FC<ListProps> = ({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-20 text-center">
        <Building size={48} className="mx-auto text-zinc-300" />
        <h3 className="mt-4 text-lg font-semibold text-zinc-800">Nenhum condomínio encontrado</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Comece por adicionar um novo condomínio para o visualizar aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.map((condominio) => (
        <CondominioCard
          key={condominio.id}
          condominio={condominio}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleStatus={onToggleStatus}
        />
      ))}
    </div>
  );
};

export default CondominiosList;