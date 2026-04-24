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
  AlertTriangle,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';import NavSection from './NavSection';
import NavItem from './NavItem';
import ExpandableNavItem from './ExpandableNavItem';

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

const condoBase = (condoId?: string) =>
  condoId && condoId !== 'all' ? `/dashboard/condominio/${condoId}` : '/dashboard';

/** Verifica se o condoId é válido (não é 'all' nem vazio) */
const hasValidCondo = (condoId?: string): condoId is string =>
  !!condoId && condoId !== 'all';

const navConfig: Record<string, (selectedCondo?: string) => NavConfig> = {

  /* ══ ADMIN ══ */
  admin: () => [
    {
      label: 'Gestão de Plataforma',
      items: [
        { href: '/dashboard',               icon: BarChart3,   label: 'Geral',        activePaths: ['/dashboard'] },
        { href: '/dashboard/usuarios',      icon: Users,       label: 'Usuários',      activePaths: ['/dashboard/usuarios'] },
        { href: '/dashboard/condominios',   icon: Building2,   label: 'Condomínios',   activePaths: ['/dashboard/condominios'] },
        { href: '/dashboard/relatorios',    icon: FileText,    label: 'Relatórios',    activePaths: ['/dashboard/relatorios'] },
        { href: '/dashboard/audit',         icon: ShieldCheck, label: 'Audit Log',     activePaths: ['/dashboard/audit'] },
        { href: '/dashboard/configuracoes', icon: Settings,    label: 'Configurações', activePaths: ['/dashboard/configuracoes'] },
      ],
    },
  ],

  /* ══ GESTOR ══ */
  gestor: (selectedCondo) => [
    {
      label: 'Gestão de Portfólio',
      items: [
        { href: '/dashboard', icon: BarChart3, label: 'Geral', activePaths: ['/dashboard'] },
        {
          href: '#',
          icon: Building2,
          label: 'Seu Portfólio',
          items: hasValidCondo(selectedCondo) ? [
            { href: `/dashboard/condominio/${selectedCondo}`,                icon: Home,         label: 'Visão por Condomínio', activePaths: [`/dashboard/condominio/${selectedCondo}`] },
            { href: `/dashboard/condominio/${selectedCondo}/moradores`,       icon: Users,        label: 'Moradores',            activePaths: [`/dashboard/condominio/${selectedCondo}/moradores`] },
            { href: `/dashboard/condominio/${selectedCondo}/unidades`,        icon: Home,         label: 'Unidades',             activePaths: [`/dashboard/condominio/${selectedCondo}/unidades`] },
            { href: `/dashboard/condominio/${selectedCondo}/sindico`,         icon: ShieldCheck,  label: 'Síndico',              activePaths: [`/dashboard/condominio/${selectedCondo}/sindico`] },
            { href: `/dashboard/condominio/${selectedCondo}/equipe`,          icon: UserCheck,    label: 'Equipa',               activePaths: [`/dashboard/condominio/${selectedCondo}/equipe`] },
            { href: `/dashboard/condominio/${selectedCondo}/configuracoes`,   icon: Settings,     label: 'Configurações',        activePaths: [`/dashboard/condominio/${selectedCondo}/configuracoes`] },
          ] : [],
        },
      ],
    },
    {
      label: 'Financeiro',
      items: hasValidCondo(selectedCondo) ? [
        {
          href: `/dashboard/condominio/${selectedCondo}/financeiro/quotas`,
          icon: Receipt,
          label: 'Quotas Mensais',
          activePaths: [`/dashboard/condominio/${selectedCondo}/financeiro/quotas`],
        },
        {
          href: `/dashboard/condominio/${selectedCondo}/financeiro/fluxo-caixa`,
          icon: DollarSign,
          label: 'Fluxo de Caixa',
          activePaths: [`/dashboard/condominio/${selectedCondo}/financeiro/fluxo-caixa`],
        },
        {
          href: `/dashboard/condominio/${selectedCondo}/financeiro/pagamentos`,
          icon: Receipt,
          label: 'Pagamentos',
          activePaths: [`/dashboard/condominio/${selectedCondo}/financeiro/pagamentos`],
        },
        {
          href: `/dashboard/condominio/${selectedCondo}/financeiro/inadimplencia`,
          icon: AlertTriangle,
          label: 'Inadimplência',
          activePaths: [`/dashboard/condominio/${selectedCondo}/financeiro/inadimplencia`],
        },
      ] : [],
    },
    {
      label: 'Operacional',
      items: hasValidCondo(selectedCondo) ? [
        { href: `/dashboard/condominio/${selectedCondo}/ocorrencias`, icon: Bell,   label: 'Ocorrências', activePaths: [`/dashboard/condominio/${selectedCondo}/ocorrencias`] },
        { href: `/dashboard/condominio/${selectedCondo}/manutencao`,  icon: Wrench, label: 'Manutenção',  activePaths: [`/dashboard/condominio/${selectedCondo}/manutencao`] },
      ] : [],
    },
    {
      label: 'Conta',
      items: [
        { href: '/dashboard/audit',         icon: ShieldCheck, label: 'Audit Log',     activePaths: ['/dashboard/audit'] },
        { href: '/dashboard/configuracoes', icon: Settings,    label: 'Configurações', activePaths: ['/dashboard/configuracoes'] },
      ],
    },
  ],

  /* ══ SÍNDICO ══ */
  sindico: (selectedCondo) => {
    const base = condoBase(selectedCondo);
    return [      {
        label: 'Meu Condomínio',
        items: [
          { href: '/dashboard',        icon: LayoutDashboard, label: 'Painel',       activePaths: ['/dashboard'] },
          { href: `${base}/moradores`, icon: Users,           label: 'Moradores',    activePaths: [`${base}/moradores`] },
          { href: `${base}/unidades`,  icon: Home,            label: 'Unidades',     activePaths: [`${base}/unidades`] },
          { href: `${base}/equipe`,    icon: UserCheck,       label: 'Minha Equipa', activePaths: [`${base}/equipe`] },
        ],
      },
      {
        label: 'Financeiro',
        items: [
          { href: `${base}/financeiro/quotas`,        icon: Receipt,       label: 'Quotas Mensais',  activePaths: [`${base}/financeiro/quotas`] },
          { href: `${base}/financeiro/fluxo-caixa`,   icon: DollarSign,    label: 'Fluxo de Caixa', activePaths: [`${base}/financeiro/fluxo-caixa`] },
          { href: `${base}/financeiro/inadimplencia`, icon: AlertTriangle, label: 'Inadimplência',  activePaths: [`${base}/financeiro/inadimplencia`] },
          { href: `${base}/financeiro/relatorios`,    icon: FileText,      label: 'Relatórios',     activePaths: [`${base}/financeiro/relatorios`] },
        ],
      },
      {
        label: 'Operacional',
        items: [
          { href: `${base}/ocorrencias`, icon: Bell,   label: 'Ocorrências', activePaths: [`${base}/ocorrencias`] },
          { href: `${base}/manutencao`,  icon: Wrench, label: 'Manutenção',  activePaths: [`${base}/manutencao`] },
        ],
      },
      {
        label: 'Configurações',
        items: [
          { href: `${base}/configuracoes`, icon: Settings, label: 'Configurações do Condomínio', activePaths: [`${base}/configuracoes`] },
          { href: '/dashboard/configuracoes', icon: Settings, label: 'Minha Conta', activePaths: ['/dashboard/configuracoes'] },
        ],
      },
    ];
  },

  /* ══ FUNCIONÁRIO ══ */
  funcionario: () => [
    {
      label: 'Minhas Tarefas',
      items: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Painel', activePaths: ['/dashboard'] },
      ],
    },
    {
      label: 'Operacional',
      items: [
        { href: '/dashboard/funcionario/tarefas',    icon: ClipboardList, label: 'Minhas Tarefas', activePaths: ['/dashboard/funcionario/tarefas'] },
        { href: '/dashboard/funcionario/visitantes', icon: Users,         label: 'Visitantes',     activePaths: ['/dashboard/funcionario/visitantes'] },
        { href: '/dashboard/funcionario/ocorrencias',icon: Bell,          label: 'Ocorrências',    activePaths: ['/dashboard/funcionario/ocorrencias'] },
        { href: '/dashboard/funcionario/manutencao', icon: Wrench,        label: 'Manutenção',     activePaths: ['/dashboard/funcionario/manutencao'] },
      ],
    },
    {
      label: 'Conta',
      items: [
        { href: '/dashboard/configuracoes', icon: Settings, label: 'Configurações', activePaths: ['/dashboard/configuracoes'] },
      ],
    },
  ],

  /* ══ MORADOR ══
     Rotas seguem a estrutura:
     /dashboard/condominio/[condoId]/morador/...
  ══════════════ */
  morador: (selectedCondo) => {
    const base = condoBase(selectedCondo);
    return [
      {
        label: 'Meu Apartamento',
        items: [
          { href: '/dashboard',                   icon: LayoutDashboard, label: 'Painel',          activePaths: ['/dashboard'] },
          { href: `${base}/morador/minhas-quotas`,icon: Receipt,         label: 'Minhas Quotas',   activePaths: [`${base}/morador/minhas-quotas`] },
          { href: `${base}/morador/pagamentos`,   icon: DollarSign,      label: 'Meus Pagamentos', activePaths: [`${base}/morador/pagamentos`] },
          { href: `${base}/morador/ocorrencias`,  icon: Bell,            label: 'Ocorrências',     activePaths: [`${base}/morador/ocorrencias`] },
          { href: `${base}/morador/visitantes`,   icon: Users,           label: 'Visitantes',      activePaths: [`${base}/morador/visitantes`] },
        ],
      },
      {
        label: 'Conta',
        items: [
          { href: '/dashboard/configuracoes', icon: Settings, label: 'Configurações', activePaths: ['/dashboard/configuracoes'] },
        ],
      },
    ];
  },
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

  const isLinkActive = (href: string, activePaths: string[] = []): boolean => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (pathname === href) return true;
    return activePaths.some((path) => {
      if (path === '/dashboard') return pathname === '/dashboard';
      return pathname === path || pathname.startsWith(path + '/');
    });
  };

  return (
    <nav className={[
      'flex-1 px-3 py-5 overflow-y-auto',
      'theme-bg-surface theme-text',
      'scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent',
    ].join(' ')}>
      {currentNavConfig.map((section) => {
        if (!section.items.length) return null;
        return (
          <NavSection key={section.label} label={section.label} isCollapsed={isCollapsed}>
            {section.items.map((item) => {
              if (item.items) {
                const hasActiveChild = item.items.some((sub) =>
                  isLinkActive(sub.href, sub.activePaths)
                );
                return (
                  <ExpandableNavItem
                    key={item.label}
                    label={item.label}
                    icon={<item.icon size={16} />}
                    expanded={expandedSections[item.label.toLowerCase()] || hasActiveChild}
                    onToggle={() => onToggleSection(item.label.toLowerCase())}
                  >
                    {item.items.map((subItem) => (
                      <NavItem
                        key={subItem.label}
                        href={subItem.href}
                        icon={<subItem.icon size={14} />}
                        label={subItem.label}
                        active={isLinkActive(subItem.href, subItem.activePaths)}
                        badge={subItem.badge}
                        isCollapsed={isCollapsed}
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
                  active={isLinkActive(item.href, item.activePaths)}
                  badge={item.badge}
                  isCollapsed={isCollapsed}
                />
              );
            })}
          </NavSection>
        );
      })}
    </nav>
  );
}