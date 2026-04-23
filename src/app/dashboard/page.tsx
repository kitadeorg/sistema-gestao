'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

// Importação dos conteúdos de cada Role
import DashboardAdminContent       from '@/components/dashboard/pages/admin/DashboardAdminContent';
import DashboardGestorContent      from '@/components/dashboard/pages/gestor/GestorContent';
import DashboardSindicoContent     from '@/components/dashboard/pages/sindico/DashboardSindicoContent';
import DashboardFuncionarioContent from '@/components/dashboard/pages/funcionario/DashboardFuncionarioContent';

// Importação da nova tela de Morador
// Nota: Se o componente em morador/page.tsx for o export default, importamos assim:
import DashboardMoradorContent     from '@/app/dashboard/condominio/[condoId]/morador/page';

export default function DashboardPage() {
  const { userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <div className="text-center space-y-2">
           <p className="text-zinc-500">Usuário não autenticado.</p>
           <p className="text-xs text-zinc-400">Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  // Router de Roles
  switch (userData.role) {
    case 'admin':
      return <DashboardAdminContent />;
    case 'gestor':
      return <DashboardGestorContent />;
    case 'sindico':
      return <DashboardSindicoContent />;
    case 'funcionario':
      return <DashboardFuncionarioContent />;
    case 'morador':
      return <DashboardMoradorContent />; // <-- ADICIONADO AQUI
    
    default:
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-900">Role desconhecido</h1>
            <p className="text-zinc-500">O seu perfil ({userData.role}) não possui uma interface definida.</p>
          </div>
        </div>
      );
  }
}