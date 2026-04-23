// contexts/DashboardContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useDashboardData, type CondominioData, type DashboardMetrics } from '@/hooks/useDashboardData';
import { useAuthContext } from './AuthContext';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

interface DashboardContextType {
  metrics: DashboardMetrics | null;
  condominiosList: CondominioData[];
  selectedCondo: string;
  setSelectedCondo: (id: string) => void;
  loading: boolean;
  // UI da sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
}

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { userData, setCurrentCondominio } = useAuthContext();

  const dashboardData = useDashboardData(
    userData?.role ?? '',
    userData?.condominioId,
    userData?.condominiosGeridos,
  );

  const [isSidebarOpen,      setIsSidebarOpen]      = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar         = () => setIsSidebarOpen(prev => !prev);
  const toggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev);

  // ✅ SINCRONIZAÇÃO BIDIRECIONAL
  // Quando selectedCondo muda (via Topbar, Sidebar ou qualquer componente),
  // actualiza também o currentCondominioId no AuthContext para que todas as
  // páginas de rota dinâmica ([condoId]) reajam automaticamente.
  useEffect(() => {
    const id = dashboardData.selectedCondo;
    if (id && id !== 'all') {
      setCurrentCondominio(id);
    } else if (id === 'all') {
      // Visão global: limpa o condomínio activo no AuthContext
      setCurrentCondominio(null);
    }
  }, [dashboardData.selectedCondo, setCurrentCondominio]);

  const value: DashboardContextType = {
    ...dashboardData,
    isSidebarOpen,
    toggleSidebar,
    isSidebarCollapsed,
    toggleSidebarCollapse,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
}