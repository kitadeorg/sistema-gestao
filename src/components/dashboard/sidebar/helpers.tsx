// NOME DO FICHEIRO: src/components/dashboard/sidebar/helpers.tsx  <-- ATENÇÃO AQUI

import React from 'react';
import {
  KeyRound,   // Para Super Admin
  Briefcase,  // Para Gestor
  Landmark,   // Para Síndico
  Wrench,     // Para Operacional/Funcionário
  Home,       // Para Morador
  User,       // Ícone padrão
} from 'lucide-react';

export type UserRole = 'admin' | 'gestor' | 'sindico' | 'funcionario' | 'morador';

interface RoleConfig {
  label: string;
  icon: React.ReactNode;
}

const roleConfig: Record<UserRole, RoleConfig> = {
  admin: {
    label: 'Administrador',
    icon: <KeyRound className="w-4 h-4" />,
  },
  gestor: {
    label: 'Gestor',
    icon: <Briefcase className="w-4 h-4" />,
  },
  sindico: {
    label: 'Síndico',
    icon: <Landmark className="w-4 h-4" />,
  },
  funcionario: {
    label: 'Funcionário',
    icon: <Wrench className="w-4 h-4" />,
  },
  morador: {
    label: 'Morador',
    icon: <Home className="w-4 h-4" />,
  },
};

const fallbackConfig: RoleConfig = {
  label: 'Usuário',
  icon: <User className="w-4 h-4" />,
};

export function getRoleLabel(role?: UserRole | string): string {
  if (role && role in roleConfig) {
    return roleConfig[role as UserRole].label;
  }
  return fallbackConfig.label;
}

export function getRoleIcon(role?: UserRole | string): React.ReactNode {
  if (role && role in roleConfig) {
    return roleConfig[role as UserRole].icon;
  }
  return fallbackConfig.icon;
}

export function getRoleInfo(role?: UserRole | string): RoleConfig {
  if (role && role in roleConfig) {
    return roleConfig[role as UserRole];
  }
  return fallbackConfig;
}