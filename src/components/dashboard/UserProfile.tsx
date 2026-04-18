// components/dashboard/UserProfile.tsx
'use client';

import React from 'react';
import { User, Mail, Shield, Calendar, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext'; // 1. Usando o Contexto
import { getRoleLabel } from '@/utils/helpers'; // 2. Helper para centralizar os labels

/**
 * Componente que exibe um card de perfil para o usuário autenticado.
 * Busca os dados diretamente do AuthContext, não requer props.
 * Inclui um estado de carregamento (skeleton) para uma melhor UX.
 */
export function UserProfile() {
  const { user: firebaseUser, userData, loading } = useAuthContext();

  // 3. Exibe o esqueleto enquanto os dados estão a ser carregados
  if (loading) {
    return <UserProfileSkeleton />;
  }

  // Se não houver usuário após o carregamento, não renderiza nada
  if (!firebaseUser || !userData) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg animate-in fade-in duration-500">
      {/* --- Cabeçalho do Perfil (Responsivo) --- */}
      <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-4 mb-6">
        {firebaseUser.photoURL ? (
          <img
            src={firebaseUser.photoURL}
            alt={firebaseUser.displayName || 'User'}
            className="w-16 h-16 rounded-full border-4 border-white/30 flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30 flex-shrink-0">
            <User className="w-8 h-8" />
          </div>
        )}
        
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">
            Bem-vindo, {userData.nome || firebaseUser.displayName || 'Usuário'}!
          </h1>
          <p className="text-orange-100 text-sm flex items-center justify-center sm:justify-start gap-2 mt-1">
            <Mail className="w-4 h-4" />
            {firebaseUser.email}
          </p>
        </div>
      </div>

      {/* --- Estatísticas do Usuário (Responsivo) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-white/20">
        <InfoItem 
          icon={<Shield className="w-5 h-5 text-orange-200" />}
          label="Perfil"
          value={getRoleLabel(userData.role)} // 4. Usando a função helper
        />
        <InfoItem
          icon={<Calendar className="w-5 h-5 text-orange-200" />}
          label="Membro desde"
          value={
            firebaseUser.metadata.creationTime 
              ? new Date(firebaseUser.metadata.creationTime).toLocaleDateString('pt-PT')
              : 'N/A'
          }
        />
        <InfoItem
          icon={<div className={`w-2.5 h-2.5 rounded-full ${firebaseUser.emailVerified ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />}
          label="Status"
          value={firebaseUser.emailVerified ? 'Verificado' : 'Não Verificado'}
        />
      </div>
    </div>
  );
}

// Sub-componente para os itens de informação
function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-orange-200">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

// Componente Skeleton para o estado de carregamento
function UserProfileSkeleton() {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-white/20 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-white/20 rounded w-3/4"></div>
          <div className="h-4 bg-white/20 rounded w-1/2"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-white/20">
        <div className="h-8 bg-white/20 rounded w-3/4"></div>
        <div className="h-8 bg-white/20 rounded w-2/3"></div>
        <div className="h-8 bg-white/20 rounded w-1/2"></div>
      </div>
    </div>
  );
}