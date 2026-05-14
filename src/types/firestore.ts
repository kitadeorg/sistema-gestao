/**
 * Tipos Firestore — Documentos tal como são armazenados na base de dados.
 * Diferem dos tipos de domínio (src/types/index.ts) porque usam
 * Timestamp do Firestore em vez de Date do JS.
 */

import { Timestamp } from 'firebase/firestore';

// ─────────────────────────────────────────────
// CONDOMÍNIO
// ─────────────────────────────────────────────

export interface CondominioDoc {
  nome: string;
  endereco: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    provincia: string;
    codigoPostal?: string;
  };
  cnpj?: string;
  logoUrl?: string;
  totalUnidades: number;
  totalMoradores?: number;
  valorQuotaMensal: number;
  diaVencimento: number;
  multaPorAtraso: number;
  jurosMensal: number;
  permitePagamentoParcial: boolean;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─────────────────────────────────────────────
// UTILIZADOR
// ─────────────────────────────────────────────

export interface UsuarioDoc {
  email: string;
  nome: string;
  displayName?: string;
  photoURL?: string;
  role: 'super_admin' | 'admin' | 'gestor' | 'sindico' | 'funcionario' | 'morador';
  condominioId?: string;
  condominiosGeridos?: string[];
  unidadeId?: string;
  moradorId?: string;
  ativo: boolean;
  primeiroAcesso?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UsuarioPreRegistoDoc {
  email: string;
  condominioId: string;
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────
// UNIDADE
// ─────────────────────────────────────────────

export interface UnidadeDoc {
  condominioId: string;
  numero: string;
  bloco?: string;
  tipo: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'Vivenda' | 'Loja' | 'Escritorio';
  area: number;
  fracao: number;
  status: 'ocupada' | 'vazia' | 'em_reforma';
  ativaQuotaIndividual?: boolean;
  quotaIndividual?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─────────────────────────────────────────────
// MORADOR
// ─────────────────────────────────────────────

export interface MoradorDoc {
  condominioId: string;
  unidadeId: string;
  unidadeNumero?: string;
  bloco?: string;
  nome: string;
  email?: string;
  telefone?: string;
  bi?: string;
  tipo: 'proprietario' | 'inquilino';
  status: 'ativo' | 'inadimplente' | 'ausente' | 'inativo';
  uid?: string;
  dataEntrada?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HistoricoResidenciaDoc {
  moradorId: string;
  condominioId: string;
  unidadeId: string;
  unidadeNumero?: string;
  bloco?: string;
  nome: string;
  email?: string;
  telefone?: string;
  tipo: 'proprietario' | 'inquilino';
  dataEntrada?: Timestamp;
  dataSaida: Timestamp;
  arquivadoPor: string;
}

// ─────────────────────────────────────────────
// QUOTA
// ─────────────────────────────────────────────

export interface QuotaDoc {
  condominioId: string;
  unidadeId: string;
  unidadeNumero: string;
  moradorId?: string;
  moradorNome: string;
  valor: number;
  valorOriginal?: number;
  valorPago?: number;
  saldoDevedor?: number;
  mes: number;
  ano: number;
  dataVencimento: Timestamp;
  dataPagamento?: Timestamp;
  status: 'pendente' | 'pago' | 'atrasado' | 'isento';
  comprovativoUrl?: string;
  observacoes?: string;
  registadoPor?: string;
  criadoPor?: string;
  multaAplicada?: boolean;
  mesesAtraso?: number;
  /** IDs das notificações de lembrete já enviadas (evita duplicados) */
  lembreteEnviado?: boolean;
  lembrete3DiasEnviado?: boolean;
  lembrete7DiasAtrasadoEnviado?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─────────────────────────────────────────────
// PAGAMENTO (coleção legada)
// ─────────────────────────────────────────────

export interface PagamentoDoc {
  condominioId: string;
  unidadeId: string;
  moradorId?: string;
  valor: number;
  mes: number;
  ano: number;
  status: 'pendente' | 'pago' | 'atrasado';
  dataPagamento?: Timestamp;
  comprovativoUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PagamentoParcialDoc {
  quotaId: string;
  condominioId: string;
  moradorId?: string;
  moradorNome: string;
  unidadeNumero: string;
  mes: number;
  ano: number;
  valorPago: number;
  saldoAntes: number;
  saldoDepois: number;
  dataPagamento: Timestamp;
  observacoes?: string;
  registadoPor: string;
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────
// DESPESA
// ─────────────────────────────────────────────

export interface DespesaDoc {
  condominioId: string;
  descricao: string;
  valor: number;
  categoria: 'manutencao' | 'limpeza' | 'seguranca' | 'energia' | 'agua' | 'administrativo' | 'obras' | 'seguros' | 'outros';
  data: Timestamp;
  comprovativoUrl?: string;
  fornecedor?: string;
  observacoes?: string;
  criadoPor: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─────────────────────────────────────────────
// AVISO / COMUNICAÇÃO
// ─────────────────────────────────────────────

export interface AvisoDoc {
  condominioId: string;
  titulo: string;
  conteudo: string;
  tipo: 'geral' | 'financeiro' | 'manutencao' | 'seguranca' | 'evento' | 'urgente';
  prioridade: 'normal' | 'alta' | 'urgente';
  autorId: string;
  autorNome: string;
  autorRole: string;
  fixado: boolean;
  /** Canais pelos quais o aviso foi enviado */
  canaisEnviados?: ('email' | 'whatsapp' | 'sms')[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ─────────────────────────────────────────────
// ASSEMBLEIA
// ─────────────────────────────────────────────

export interface AssembleiaDoc {
  condominioId: string;
  titulo: string;
  descricao?: string;
  data: Timestamp;
  local?: string;
  status: 'agendada' | 'em_curso' | 'encerrada' | 'cancelada';
  pauta: PautaItem[];
  criadoPor: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PautaItem {
  id: string;
  titulo: string;
  descricao?: string;
  votacaoAberta: boolean;
  resultado?: 'aprovado' | 'rejeitado' | 'adiado';
  votos?: { sim: number; nao: number; abstencao: number };
}

// ─────────────────────────────────────────────
// DOCUMENTO
// ─────────────────────────────────────────────

export interface DocumentoDoc {
  condominioId: string;
  nome: string;
  categoria: 'regulamento' | 'ata' | 'contrato' | 'financeiro' | 'juridico' | 'outro';
  url: string;
  tamanho?: number;
  mimeType?: string;
  carregadoPor: string;
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────
// OCORRÊNCIA
// ─────────────────────────────────────────────

export interface OcorrenciaDoc {
  condominioId: string;
  titulo: string;
  descricao: string;
  categoria: 'barulho' | 'agua' | 'seguranca' | 'limpeza' | 'manutencao' | 'outro';
  status: 'aberta' | 'em_andamento' | 'resolvida' | 'encerrada';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  reportadoPor: string;
  reportadoPorNome: string;
  unidadeId?: string;
  unidadeNumero?: string;
  delegadoPara?: string;
  delegadoNome?: string;
  resolvidoPor?: string;
  dataResolucao?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ComentarioOcorrenciaDoc {
  ocorrenciaId: string;
  condominioId: string;
  autorId: string;
  autorNome: string;
  autorRole: string;
  conteudo: string;
  anexoUrl?: string;
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────
// MANUTENÇÃO
// ─────────────────────────────────────────────

export interface ManutencaoDoc {
  condominioId: string;
  titulo: string;
  descricao?: string;
  status: 'pendente' | 'em_execucao' | 'concluida';
  prioridade: 'baixa' | 'media' | 'alta';
  dataAgendada?: Timestamp;
  fornecedorId?: string;
  fornecedorNome?: string;
  criadoPor?: string;
  criadoEm: Timestamp;
  updatedAt?: Timestamp;
}

export interface FornecedorDoc {
  condominioId: string;
  nome: string;
  especialidade: string;
  telefone?: string;
  email?: string;
  notas?: string;
  criadoEm: Timestamp;
}

// ─────────────────────────────────────────────
// VISITANTE
// ─────────────────────────────────────────────

export interface VisitanteDoc {
  condominioId: string;
  nome: string;
  documento?: string;
  unidadeDestino: string;
  motivoVisita?: string;
  entrada: string;
  saida?: string;
  status: 'dentro' | 'saiu';
  criadoPor: string;
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────
// AVALIAÇÃO DE SATISFAÇÃO
// ─────────────────────────────────────────────

export interface AvaliacaoDoc {
  condominioId: string;
  moradorId: string;
  moradorNome?: string;
  mes: number;
  ano: number;
  nota: number; // 1-5
  categorias?: {
    limpeza?: number;
    seguranca?: number;
    manutencao?: number;
    comunicacao?: number;
  };
  comentario?: string;
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────

export interface AuditLogDoc {
  actorId: string;
  actorNome: string;
  actorRole: string;
  accao: string;
  categoria: 'financeiro' | 'moradores' | 'unidades' | 'utilizadores' | 'condominio' | 'acesso' | 'visitantes' | 'despesas' | 'notificacoes' | 'sistema';
  descricao: string;
  condominioId?: string;
  entidadeId?: string;
  entidadeTipo?: string;
  meta?: Record<string, unknown>;
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────
// NOTIFICAÇÃO (nova coleção)
// ─────────────────────────────────────────────

export type CanalNotificacao = 'whatsapp' | 'sms' | 'email';
export type StatusNotificacao = 'pendente' | 'enviada' | 'falhou' | 'entregue';
export type TipoNotificacao =
  | 'lembrete_quota'
  | 'quota_atrasada'
  | 'aviso_geral'
  | 'aviso_urgente'
  | 'quota_gerada'
  | 'pagamento_confirmado'
  | 'ocorrencia_atualizada'
  | 'assembleia_convocatoria';

export interface NotificacaoDoc {
  condominioId: string;
  destinatarioId?: string;
  destinatarioNome?: string;
  destinatarioTelefone?: string;
  destinatarioEmail?: string;
  canal: CanalNotificacao;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  status: StatusNotificacao;
  erro?: string;
  /** ID externo do provider (Twilio SID, etc.) */
  externalId?: string;
  meta?: Record<string, unknown>;
  createdAt: Timestamp;
  enviadoEm?: Timestamp;
}

// ─────────────────────────────────────────────
// SCHEDULER LOG (nova coleção)
// ─────────────────────────────────────────────

export interface SchedulerLogDoc {
  job: string;
  status: 'sucesso' | 'erro' | 'parcial';
  condominioId?: string;
  detalhes?: string;
  meta?: Record<string, unknown>;
  executadoEm: Timestamp;
}
