'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth'; // Hook que vamos criar
import { Loader2 } from 'lucide-react';

// Importe os componentes de dashboard para cada role
import DashboardAdminContent from '@/components/dashboard/pages/admin/DashboardAdminContent';
import DashboardGestorContent from '@/components/dashboard/pages/gestor/GestorContent';
// import DashboardSindicoContent from '@/components/dashboard/pages/sindico/DashboardSindicoContent';
// import DashboardFuncionarioContent from '@/components/dashboard/pages/funcionario/DashboardFuncionarioContent';
// import DashboardMoradorContent from '@/components/dashboard/pages/morador/DashboardMoradorContent';

export default function DashboardPage() {
  const { userData, loading } = useAuth();

  // 1. Enquanto carrega, mostra um spinner
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  // 2. Se não houver usuário, pode redirecionar ou mostrar mensagem
  if (!userData) {
    // Idealmente, o middleware já teria redirecionado para /login
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p>Usuário não autenticado. Redirecionando...</p>
      </div>
    );
  }

  // 3. O "Roteador" de Dashboards
  switch (userData.role) {
    case 'admin':
      return <DashboardAdminContent />;
     case 'gestor':
       return <DashboardGestorContent />;
    // case 'sindico':
    //   return <DashboardSindicoContent />;
    // case 'funcionario':
    //   return <DashboardFuncionarioContent />;
    // case 'morador':
    //   return <DashboardMoradorContent />;
    default:
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold">Role desconhecido</h1>
          <p>Seu perfil não foi configurado corretamente.</p>
        </div>
      );
  }
}