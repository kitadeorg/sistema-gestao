// src/components/dashboard/pages/condominios/CondominiosList.tsx

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Condominio } from '@/types';
import {
  Edit, Trash2, Power, PowerOff, MoreVertical,
  Building, MapPin, Home, Users, Settings,
  ArrowRight, CheckCircle2, XCircle, Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Pagination, { usePagination } from '@/components/ui/Pagination';

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
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
    status === 'active'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-red-50 text-red-700 border border-red-200',
  )}>
    {status === 'active'
      ? <><CheckCircle2 size={10} />Ativo</>
      : <><XCircle size={10} />Inativo</>
    }
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

  const hasActions = !!(onEdit || onDelete || onToggleStatus);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={cn(
      'bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden',
      condominio.status === 'inactive' ? 'border-zinc-200 opacity-75' : 'border-zinc-200',
    )}>

      {/* ── Cabeçalho ── */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center border border-zinc-200 shrink-0 overflow-hidden">
            {condominio.logoUrl ? (
              <img src={condominio.logoUrl} alt={condominio.nome} className="w-full h-full object-cover" />
            ) : (
              <Building size={20} className="text-zinc-400" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-zinc-900 text-sm truncate">{condominio.nome}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">{condominio.cnpj || 'NIF não informado'}</p>
          </div>
        </div>

        {/* Menu ⋮ */}
        {hasActions && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(p => !p)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              <MoreVertical size={16} />
            </button>

            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-zinc-200 rounded-xl shadow-xl z-20 overflow-hidden py-1">
                {onEdit && (
                  <button
                    onClick={() => { onEdit(condominio); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <Edit size={14} className="text-zinc-400" />
                    Editar dados
                  </button>
                )}
                {onToggleStatus && (
                  <button
                    onClick={() => { onToggleStatus(condominio.id, condominio.status); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    {condominio.status === 'active'
                      ? <><PowerOff size={14} className="text-amber-500" />Desativar</>
                      : <><Power size={14} className="text-emerald-500" />Ativar</>
                    }
                  </button>
                )}
                {onDelete && (
                  <>
                    <div className="mx-3 my-1 h-px bg-zinc-100" />
                    <button
                      onClick={() => { onDelete(condominio.id); setIsMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Corpo ── */}
      <div className="px-4 pb-3 space-y-2 flex-grow">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <MapPin size={12} className="text-zinc-400 shrink-0" />
          <span className="truncate">{condominio.endereco.cidade}, {condominio.endereco.provincia}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Home size={12} className="text-zinc-400" />
            <span><b className="text-zinc-700">{condominio.totalUnidades}</b> unidades</span>
          </div>
          <StatusBadge status={condominio.status} />
        </div>
      </div>

      {/* ── Acções rápidas ── */}
      <div className="px-4 pb-4 pt-3 border-t border-zinc-100">
        <div className="grid grid-cols-3 gap-2 mb-2.5">
          <Link
            href={`/dashboard/condominio/${condominio.id}/moradores`}
            className="flex flex-col items-center gap-1 py-2 rounded-xl bg-zinc-50 hover:bg-orange-50 hover:text-orange-600 transition-colors text-zinc-500"
          >
            <Users size={14} />
            <span className="text-[10px] font-semibold">Moradores</span>
          </Link>
          <Link
            href={`/dashboard/condominio/${condominio.id}/financeiro/quotas`}
            className="flex flex-col items-center gap-1 py-2 rounded-xl bg-zinc-50 hover:bg-orange-50 hover:text-orange-600 transition-colors text-zinc-500"
          >
            <Receipt size={14} />
            <span className="text-[10px] font-semibold">Quotas</span>
          </Link>
          <Link
            href={`/dashboard/condominio/${condominio.id}/configuracoes`}
            className="flex flex-col items-center gap-1 py-2 rounded-xl bg-zinc-50 hover:bg-orange-50 hover:text-orange-600 transition-colors text-zinc-500"
          >
            <Settings size={14} />
            <span className="text-[10px] font-semibold">Config.</span>
          </Link>
        </div>

        <Link
          href={`/dashboard/condominio/${condominio.id}`}
          className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
        >
          Ver Painel Completo
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────

const CardSkeleton: React.FC = () => (
  <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm animate-pulse overflow-hidden">
    <div className="p-4 flex items-start gap-3">
      <div className="w-11 h-11 rounded-xl bg-zinc-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-200 rounded w-3/4" />
        <div className="h-3 bg-zinc-100 rounded w-1/2" />
      </div>
    </div>
    <div className="px-4 pb-3 space-y-2">
      <div className="h-3 bg-zinc-100 rounded w-2/3" />
      <div className="h-3 bg-zinc-100 rounded w-1/3" />
    </div>
    <div className="px-4 pb-4 pt-3 border-t border-zinc-100 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-zinc-100 rounded-xl" />)}
      </div>
      <div className="h-8 bg-zinc-200 rounded-xl" />
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
  const { paged, page, setPage, totalPages, totalItems, pageSize } = usePagination(data, 9);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paged.map((condominio) => (
          <CondominioCard
            key={condominio.id}
            condominio={condominio}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
          />
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        itemsPerPage={pageSize}
        totalItems={totalItems}
      />
    </>
  );
};

export default CondominiosList;
