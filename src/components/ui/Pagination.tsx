'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
  className?: string;
}

// Hook para paginação
export function usePagination<T>(items: T[], pageSize: number = 10) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(items.length / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paged = useMemo(() => items.slice(start, end), [items, start, end]);

  return {
    page,
    setPage,
    totalPages,
    paged,
    totalItems: items.length,
    pageSize,
    start,
    end,
  };
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className={cn('flex items-center justify-between gap-4 flex-wrap', className)}>
      {/* Info */}
      {itemsPerPage && totalItems !== undefined && (
        <p className="text-sm text-zinc-500">
          Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} a{' '}
          {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} resultados
        </p>
      )}

      {/* Controles */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            currentPage === 1
              ? 'text-zinc-300 cursor-not-allowed'
              : 'text-zinc-600 hover:bg-zinc-100'
          )}
        >
          <ChevronLeft size={16} />
          Anterior
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-zinc-400">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={cn(
                  'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                  currentPage === page
                    ? 'bg-orange-500 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                )}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            currentPage === totalPages
              ? 'text-zinc-300 cursor-not-allowed'
              : 'text-zinc-600 hover:bg-zinc-100'
          )}
        >
          Próxima
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
