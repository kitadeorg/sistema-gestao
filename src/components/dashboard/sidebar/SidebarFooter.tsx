'use client';

import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type SidebarFooterProps = {
  isCollapsed: boolean;
};

const SidebarFooter: React.FC<SidebarFooterProps> = ({ isCollapsed }) => {
  const { userData } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    toast('Tem a certeza que deseja sair?', {
      action: {
        label: 'Sair',
        onClick: async () => {
          setIsLoggingOut(true);
          try {
            await signOut(auth);
          } catch (err) {
            console.error('Erro ao fazer logout:', err);
            toast.error('Não foi possível sair. Tenta novamente.');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    });
  };

  return (
    <footer
      className={cn(
        'border-t theme-border theme-bg-surface',
        isCollapsed ? 'py-4 px-2' : 'px-3 pb-5 pt-4',
      )}
    >
      {/* EXPANDED */}
      {!isCollapsed && (
        <div className="rounded-2xl border theme-border theme-bg-surface p-2">
          <div className="px-2 pt-1 pb-2">
            <p className="text-xs font-semibold text-zinc-900 truncate">
              {userData?.nome ?? 'Utilizador'}
            </p>
            <p className="text-[11px] text-zinc-500 capitalize truncate">
              {userData?.role ?? ''}
            </p>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5',
              'text-sm font-semibold transition-colors',
              'text-red-600 hover:bg-red-50',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A sair...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Sair
              </>
            )}
          </button>
        </div>
      )}

      {/* COLLAPSED */}
      {isCollapsed && (
        <div className="relative group flex justify-center">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Sair"
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              'border theme-border theme-bg-surface',
              'text-red-600 hover:bg-red-50 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {isLoggingOut ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
          </button>

          {/* Tooltip */}
          <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {isLoggingOut ? 'A sair...' : 'Sair'}
          </div>
        </div>
      )}
    </footer>
  );
};

export default SidebarFooter;