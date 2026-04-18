'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  DollarSign,
  Receipt,
  Bell,
  BarChart3,
  ClipboardList,
  Wrench,
  FileText,
  Settings,
  Home,
} from 'lucide-react';
import NavSection from './NavSection';
import NavItem from './NavItem';
import ExpandableNavItem from './ExpandableNavItem';

// --- Interfaces ---
interface UserData {
  role: 'admin' | 'gestor' | 'sindico' | 'funcionario' | 'morador';
}

interface NavItemConfig {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  activePaths?: string[];
  badge?: string | number;
  items?: NavItemConfig[];
}

interface NavSectionConfig {
  label: string;
  items: NavItemConfig[];
}

type NavConfig = NavSectionConfig[];

// --- Configuração da Navegação por Role ---
const navConfig: Record<string, (selectedCondo?: string) => NavConfig> = {
  admin: () => [
    {
      label: 'Gestão de Plataforma',
      items: [
        {
          href: '/dashboard',
          icon: BarChart3,
          label: 'Dashboard Global',
          activePaths: ['/dashboard'],
        },
        {
          href: '/dashboard/usuarios',
          icon: Users,
          label: 'Usuários',
          activePaths: ['/dashboard/usuarios'],
        },
        {
          href: '/dashboard/condominios',
          icon: Building2,
          label: 'Condomínios',
          activePaths: ['/dashboard/condominios'],
        },
        {
          href: '/dashboard/relatorios',
          icon: FileText,
          label: 'Relatórios',
          activePaths: ['/dashboard/relatorios'],
        },
        {
          href: '/dashboard/configuracoes',
          icon: Settings,
          label: 'Configurações',
          activePaths: ['/dashboard/configuracoes'],
        },
      ],
    },
  ],

  gestor: (selectedCondo) => [
    {
      label: 'Gestão de Portfólio',
      items: [
        {
          href: '/dashboard',
          icon: BarChart3,
          label: 'Visão Consolidada',
          activePaths: ['/dashboard'],
        },
        {
          href: '#',
          icon: Building2,
          label: 'Seu Portfólio',
          items: selectedCondo
            ? [
                {
                  href: `/dashboard/condominio/${selectedCondo}`,
                  icon: Home,
                  label: 'Visão por Condomínio',
                  activePaths: [`/dashboard/condominio/${selectedCondo}`],
                },
                {
                  href: `/dashboard/condominio/${selectedCondo}/moradores`,
                  icon: Users,
                  label: 'Moradores',
                  activePaths: [`/dashboard/condominio/${selectedCondo}/moradores`],
                },
                {
                  href: `/dashboard/condominio/${selectedCondo}/unidades`,
                  icon: Home,
                  label: 'Unidades',
                  activePaths: [`/dashboard/condominio/${selectedCondo}/unidades`],
                },
              ]
            : [],
        },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        {
          href: '/dashboard/financeiro',
          icon: DollarSign,
          label: 'Fluxo de Caixa',
          activePaths: ['/dashboard/financeiro'],
        },
        {
          href: '/dashboard/relatorio-inadimplencia',
          icon: BarChart3,
          label: 'Inadimplência',
          activePaths: ['/dashboard/relatorio-inadimplencia'],
        },
      ],
    },
    {
      label: 'Operacional',
      items: selectedCondo
        ? [
            {
              href: `/dashboard/condominio/${selectedCondo}/ocorrencias`,
              icon: Bell,
              label: 'Ocorrências',
              activePaths: [`/dashboard/condominio/${selectedCondo}/ocorrencias`],
              badge: '3',
            },
            {
              href: `/dashboard/condominio/${selectedCondo}/manutencao`,
              icon: Wrench,
              label: 'Manutenção',
              activePaths: [`/dashboard/condominio/${selectedCondo}/manutencao`],
            },
          ]
        : [],
    },
  ],

  sindico: () => [
    {
      label: 'Meu Condomínio',
      items: [
        {
          href: '/dashboard',
          icon: LayoutDashboard,
          label: 'Painel de Controle',
          activePaths: ['/dashboard'],
        },
        {
          href: '/dashboard/moradores',
          icon: Users,
          label: 'Moradores',
          activePaths: ['/dashboard/moradores'],
          badge: '50',
        },
        {
          href: '/dashboard/unidades',
          icon: Home,
          label: 'Unidades',
          activePaths: ['/dashboard/unidades'],
        },
      ],
    },
  ],

  funcionario: () => [
    {
      label: 'Minhas Tarefas',
      items: [
        {
          href: '/dashboard',
          icon: ClipboardList,
          label: 'Minhas Tarefas',
          activePaths: ['/dashboard'],
          badge: '8',
        },
        {
          href: '/dashboard/visitantes',
          icon: Users,
          label: 'Visitantes',
          activePaths: ['/dashboard/visitantes'],
        },
      ],
    },
  ],

  morador: () => [
    {
      label: 'Meu Apartamento',
      items: [
        {
          href: '/dashboard',
          icon: Home,
          label: 'Meu Painel',
          activePaths: ['/dashboard'],
        },
        {
          href: '/dashboard/minhas-quotas',
          icon: Receipt,
          label: 'Minhas Quotas',
          activePaths: ['/dashboard/minhas-quotas'],
        },
        {
          href: '/dashboard/pagamentos',
          icon: DollarSign,
          label: 'Meus Pagamentos',
          activePaths: ['/dashboard/pagamentos'],
        },
      ],
    },
  ],
};

interface SidebarNavProps {
  userData: UserData;
  selectedCondo: string;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  isCollapsed?: boolean;
}

export default function SidebarNav({
  userData,
  selectedCondo,
  expandedSections,
  onToggleSection,
  isCollapsed = false,
}: SidebarNavProps) {
  const pathname = usePathname();

  const roleNavConfigFn = navConfig[userData.role];
  if (!roleNavConfigFn) return null;

  const currentNavConfig = roleNavConfigFn(selectedCondo);

  // A LÓGICA CORRIGIDA:
  const isLinkActive = (href: string, activePaths: string[] = []): boolean => {
    // Se for o Dashboard, queremos um match exato
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    
    // Para outras páginas, permitimos que sub-rotas mantenham o item pai ativo
    return activePaths.some(
      (path) => pathname === path || (path.length > 1 && pathname.startsWith(path))
    );
  };

  return (
    <nav
      className={[
        'flex-1 px-3 py-5 overflow-y-auto space-y-0.5',
        'bg-white text-zinc-900',
        'scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent',
      ].join(' ')}
    >
      {currentNavConfig.map((section) => (
        <NavSection key={section.label} label={section.label} isCollapsed={isCollapsed}>
          {section.items.map((item) => {
            if (item.items) {
              return (
                <ExpandableNavItem
                  key={item.label}
                  label={item.label}
                  icon={<item.icon size={16} />}
                  expanded={expandedSections[item.label.toLowerCase()] || false}
                  onToggle={() => onToggleSection(item.label.toLowerCase())}
                >
                  {item.items.map((subItem) => (
                    <NavItem
                      key={subItem.label}
                      href={subItem.href}
                      icon={<subItem.icon size={14} />}
                      label={subItem.label}
                      // Passando o href para a função isLinkActive
                      active={isLinkActive(subItem.href, subItem.activePaths)}
                      badge={subItem.badge}
                    />
                  ))}
                </ExpandableNavItem>
              );
            }

            return (
              <NavItem
                key={item.label}
                href={item.href}
                icon={<item.icon size={16} />}
                label={item.label}
                // Passando o href para a função isLinkActive
                active={isLinkActive(item.href, item.activePaths)}
                badge={item.badge}
              />
            );
          })}
        </NavSection>
      ))}
    </nav>
  );
}