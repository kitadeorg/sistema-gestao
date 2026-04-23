export interface FluxoCaixaItem {
  condominioId: string;
  condominioNome: string;
  receita: number;
  despesas: number;
  margem: number;
  margemPercent: number;
}

export interface FluxoGeral {
  receitaTotal: number;
  despesasTotal: number;
  margemTotal: number;
  margemPercent: number;
  porCondominio: FluxoCaixaItem[];
}

export type Periodo = '1m' | '3m' | '6m' | '1a';