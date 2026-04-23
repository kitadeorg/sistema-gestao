// components/dashboard/sidebar/Sidebar.tsx
'use client';

import React from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useSidebarState } from './useSidebarState';
import SidebarHeader from './SidebarHeader';
import CondominioSelector from './CondominioSelector';
import SidebarNav from './SidebarNav';
import SidebarFooter from './SidebarFooter';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isSidebarCollapsed?: boolean;
}

export function Sidebar({ isSidebarCollapsed = false }: SidebarProps) {
  const { userData, loading: authLoading } = useAuthContext();
  const {
    condominiosList,
    selectedCondo,
    setSelectedCondo,
    expandedSections,
    toggleSection,
    loading: sidebarDataLoading,
  } = useSidebarState();

  const isLoading = authLoading || sidebarDataLoading;

  if (isLoading) {
    return <SidebarSkeleton isCollapsed={isSidebarCollapsed} />;
  }

  if (!userData) {
    return null;
  }

  return (
    <aside
      className={cn(
        'h-full w-full flex flex-col overflow-hidden',
        'theme-bg-surface theme-text border-r theme-border',
      )}
    >
      <div className="h-px bg-gradient-to-r from-transparent via-orange-400/30 to-transparent" />

      <SidebarHeader userRole={userData.role} isCollapsed={isSidebarCollapsed} />

      {!isSidebarCollapsed && (userData.role === 'admin' || userData.role === 'gestor') && (
        <CondominioSelector
          condominios={condominiosList}
          selectedCondo={selectedCondo}
          onSelect={setSelectedCondo}
        />
      )}

      <SidebarNav
        userData={userData}
        selectedCondo={selectedCondo}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
        isCollapsed={isSidebarCollapsed}
      />

      <SidebarFooter isCollapsed={isSidebarCollapsed} />
    </aside>
  );
}

function SidebarSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <aside
      className={cn(
        'h-full w-full flex flex-col overflow-hidden',
        'theme-bg-surface theme-text border-r theme-border',
      )}
    >
      <div className="h-px bg-gradient-to-r from-transparent via-orange-400/30 to-transparent" />

      <div
        className={cn(
          'border-b border-zinc-100 animate-pulse',
          isCollapsed ? 'p-4 flex justify-center' : 'px-4 py-6 sm:px-6 sm:py-7',
        )}
      >
        <div className={cn('bg-zinc-200 rounded-lg', isCollapsed ? 'w-12 h-12' : 'h-10')} />
      </div>

      {!isCollapsed && (
        <div className="px-4 py-3 border-b border-zinc-100 animate-pulse">
          <div className="h-4 w-2/3 bg-zinc-200 rounded-md mb-2" />
          <div className="h-10 bg-zinc-200 rounded-lg" />
        </div>
      )}

      <div
        className={cn(
          'flex-1 animate-pulse',
          isCollapsed ? 'p-2 space-y-2' : 'px-3 py-5 space-y-3',
        )}
      >
        {[...Array(isCollapsed ? 5 : 3)].map((_, i) => (
          <div key={i} className={cn('bg-zinc-200 rounded-lg', isCollapsed ? 'h-12' : 'h-10')} />
        ))}
      </div>

      <div className={cn('border-t border-zinc-100', isCollapsed ? 'py-4 px-2' : 'px-3 pb-5 pt-4')}>
        <div
          className={cn(
            'rounded-xl animate-pulse',
            isCollapsed ? 'h-12 w-12 mx-auto bg-zinc-200' : 'h-20 bg-zinc-100',
          )}
        />
      </div>
    </aside>
  );
}