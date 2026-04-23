// src/types/index.ts

// ─────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────

/**
 * Hierarquia de acesso (do mais privilegiado para o menos):
 *  admin            → Super Admin (empresa gestora) — acesso total
 *  gestor           → Gestor de Portfólio — gere múltiplos condomínios
 *  sindico          → Síndico — gere um único condomínio
 *  funcionario      → Funcionário operacional (porteiro, manutenção…)
 *  morador          → Morador — acesso apenas ao seu apartamento
 */
export type UserRole =
  | 'admin'
  | 'gestor'
  | 'sindico'
  | 'funcionario'
  | 'morador';

// ─────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────

/**
 * Utilizador armazenado na coleção `users` do Firestore.
 *
 * Relação utilizador ↔ condomínio:
 *  - admin  → sem restrição de condomínio (vê tudo)
 *  - gestor → condominiosGeridos: string[]  (portfólio de N condomínios)
 *  - sindico / funcionario / morador → condominioId: string  (um único condomínio)
 */
export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL?: string | null;
  role: UserRole;

  // --- Relação utilizador ↔ condomínio ---
  /** Para síndicos, funcionários e moradores: ID do único condomínio associado. */
  condominioId?: string;
  /** Para gestores de portfólio: lista de IDs dos condomínios que gerem. */
  condominiosGeridos?: string[];
  // ----------------------------------------
  permissions?: {
    [condominioId: string]: {
      canManageFinances: boolean;
      canManageUsers: boolean;
      canViewReports: boolean;
      canManageMaintenance: boolean;
    };
  };

  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────
// CONDOMÍNIO
// ─────────────────────────────────────────────

export interface Condominio {
  id: string;
  nome: string;
  endereco: EnderecoCondominio;
  cnpj?: string;
  logoUrl?: string;
  totalUnidades: number;
  configuracoes: ConfiguracoesCondominio;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface EnderecoCondominio {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  provincia: string;
  codigoPostal?: string;
}

export interface ConfiguracoesCondominio {
  valorQuotaMensal: number;
  diaVencimento: number;
  multaPorAtraso: number;
  jurosMensal: number;
  permitePagamentoParcial: boolean;
}

/**
 * Dados do formulário para criar/editar um condomínio.
 * Exclui campos gerados automaticamente pelo sistema.
 */
export type CondominioFormData = Omit<
  Condominio,
  'id' | 'totalUnidades' | 'configuracoes' | 'status' | 'createdAt' | 'updatedAt'
>;

// ─────────────────────────────────────────────
// TABELA PIVOT user_condominium
// ─────────────────────────────────────────────

/**
 * Registo da relação N:N entre utilizadores e condomínios.
 * Guardada na subcoleção `userCondominios` ou numa coleção de topo.
 * Útil para queries como "todos os gestores do condomínio X".
 */
export interface UserCondominio {
  id: string;
  userId: string;
  condominioId: string;
  role: UserRole;
  createdAt: Date;
}

// ─────────────────────────────────────────────
// UNIDADE
// ─────────────────────────────────────────────

export interface Unidade {
  id: string;
  condominioId: string;
  numero: string;
  bloco?: string;
  tipo: TipoUnidade;
  area: number;
  fracao: number;
  status: StatusUnidade;
  createdAt: Date;
  updatedAt: Date;
}

export type TipoUnidade =
  | 'T0'
  | 'T1'
  | 'T2'
  | 'T3'
  | 'T4'
  | 'Vivenda'
  | 'Loja'
  | 'Escritorio';

export type StatusUnidade = 'ocupada' | 'vazia' | 'em_reforma';

// ─────────────────────────────────────────────
// MORADOR
// ─────────────────────────────────────────────

export interface Morador {
  id: string;
  userId: string;
  nome: string;
  email: string;
  telefone: string;
  bi?: string;
  tipo: TipoMorador;
  status: StatusMorador;
  createdAt: Date;
  updatedAt: Date;
}

export type TipoMorador = 'proprietario' | 'inquilino';
export type StatusMorador = 'ativo' | 'inadimplente' | 'inativo';

export interface UnidadeMorador {
  id: string;
  unidadeId: string;
  moradorId: string;
  condominioId: string;
  dataInicio: Date;
  dataFim?: Date;
  isPrincipal: boolean;
}

// ─────────────────────────────────────────────
// DASHBOARD / KPIs (para visão consolidada)
// ─────────────────────────────────────────────

/**
 * Métricas agregadas de um condomínio — usadas no Dashboard Executivo Global.
 */
export interface CondominioKPI {
  condominioId: string;
  nomeCondominio: string;
  totalUnidades: number;
  unidadesOcupadas: number;
  receitaMensal: number;
  taxaInadimplencia: number; // 0–100 (%)
  ocorrenciasAbertas: number;
}

/**
 * Resumo consolidado de todo o portfólio de um gestor/admin.
 */
export interface PortfolioSummary {
  totalCondominios: number;
  totalUnidades: number;
  receitaTotal: number;
  taxaMediaInadimplencia: number;
  ocorrenciasAbertas: number;
  kpisPorCondominio: CondominioKPI[];
}