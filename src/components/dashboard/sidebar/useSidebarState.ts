// hooks/useSidebarState.ts
'use client';

import { useState, useEffect } from 'react';
import { useDashboardContext } from '@/contexts/DashboardContext';

/**
 * Hook que gere o estado de UI da Sidebar.
 * O selectedCondo vem do DashboardContext (fonte única de verdade),
 * evitando dessincronização entre a sidebar e o conteúdo principal.
 */
export function useSidebarState() {
  const {
    condominiosList,
    selectedCondo,
    setSelectedCondo,
    loading,
  } = useDashboardContext();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    gestao: true,
    financeiro: true,
    operacional: true,
    'seu portfólio': true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return {
    condominiosList,
    selectedCondo,
    setSelectedCondo,
    expandedSections,
    toggleSection,
    loading,
  };
}