export interface KPIData {
  receitaTotal: number;
  totalUnidades: number;
  totalMoradores: number;
  taxaInadimplenciaMedia: number;
  ocorrenciasAbertas: number;
  usuariosAtivos: number;
}

export interface CondominioPerfomance {
  id: string;
  nome: string;
  unidades: number;
  receita: number;
  inadimplencia: number;
  moradores: number;
  status: 'ativo' | 'inativo';
}

export interface GestorPerformance {
  id: string;
  nome: string;
  condominios: number;
  receitaGerida: number;
  moradores: number;
  rating: number;
}

export interface ReceitaMensalData {
  mes: string;
  receita: number;
  meta: number;
}

export interface InadimplenciaData {
  nome: string;
  taxa: number;
  total: number;
}

export interface DistribuicaoUserData {
  role: string;
  total: number;
  percentage: number;
}

export interface AlertaDashboard {
  id: string;
  tipo: 'critico' | 'aviso' | 'info';
  titulo: string;
  mensagem: string;
  data: Date;
  acao?: {
    label: string;
    href: string;
  };
}

export interface DashboardAdminData {
  periodo: {
    dataInicio: Date;
    dataFim: Date;
  };
  kpis: KPIData;
  condominios: CondominioPerfomance[];
  gestores: GestorPerformance[];
  receitaMensalData: ReceitaMensalData[];
  inadimplenciaData: InadimplenciaData[];
  distribuicaoUsuarios: DistribuicaoUserData[];
  alertas: AlertaDashboard[];
  ocorrenciasStatus: {
    aberta: number;
    emAndamento: number;
    resolvida: number;
  };
}