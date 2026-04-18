// /app/dashboard/layout.tsx
'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { DashboardProvider, useDashboardContext } from '@/contexts/DashboardContext';
import { Sidebar } from '@/components/dashboard/sidebar/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Componente interno que renderiza a estrutura visual do dashboard.
 */
function DashboardStructure({ children }: { children: ReactNode }) {
  const { isSidebarOpen, toggleSidebar, isSidebarCollapsed } = useDashboardContext();

  return (
    <div className="flex min-h-screen bg-white">
      {/* SIDEBAR PARA DESKTOP */}
      <div
        className={cn(
          'hidden lg:flex lg:flex-shrink-0 transition-all duration-300',
          isSidebarCollapsed ? 'w-20' : 'w-64',
        )}
      >
        <Sidebar isSidebarCollapsed={isSidebarCollapsed} />
      </div>

      {/* SIDEBAR PARA MOBILE (Drawer) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="w-64 flex-shrink-0 bg-white border-r border-zinc-200">
            <Sidebar />
          </div>

          <div
            onClick={toggleSidebar}
            className="flex-shrink-0 flex-1 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          />
        </div>
      )}

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Layout principal que envolve a aplicação com os provedores de contexto.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthProvider>
      <DashboardProvider>
        <DashboardStructure>{children}</DashboardStructure>
      </DashboardProvider>
    </AuthProvider>
  );
}