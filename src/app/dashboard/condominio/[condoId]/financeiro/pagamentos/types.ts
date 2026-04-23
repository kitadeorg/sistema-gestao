export type TipoTransacao = 'receita' | 'despesa';
export type StatusPagamento = 'pago' | 'pendente' | 'cancelado';

export interface Pagamento {
  id: string;
  condominioId: string;
  descricao: string;
  valor: number;
  tipo: TipoTransacao;      // ✅ ADICIONADO
  status: StatusPagamento;  // ✅ CONFIRMADO
  data: string;
}