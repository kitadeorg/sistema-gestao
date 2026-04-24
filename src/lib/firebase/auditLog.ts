/**
 * Sistema de Audit Log
 * Regista todas as acções críticas do sistema com quem, o quê, quando e onde.
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type AuditAccao =
  // Pagamentos / Quotas
  | 'quota_paga'
  | 'quota_revertida'
  | 'quota_isenta'
  | 'quotas_geradas'
  // Utilizadores
  | 'utilizador_criado'
  | 'utilizador_activado'
  | 'utilizador_desactivado'
  | 'utilizador_eliminado'
  | 'utilizador_editado'
  | 'convite_enviado'
  // Ocorrências
  | 'ocorrencia_criada'
  | 'ocorrencia_delegada'
  | 'ocorrencia_iniciada'
  | 'ocorrencia_concluida'
  | 'ocorrencia_encerrada'
  // Condomínio / Unidades
  | 'configuracoes_alteradas'
  | 'condominio_criado'
  | 'unidade_criada'
  | 'unidade_editada'
  | 'unidade_eliminada'
  // Acesso
  | 'primeiro_login'
  | 'conta_activada'
  // Moradores
  | 'morador_criado'
  | 'morador_eliminado'
  // Visitantes
  | 'visitante_registado'
  | 'visitante_saida';

export type AuditCategoria =
  | 'financeiro'
  | 'utilizadores'
  | 'ocorrencias'
  | 'condominio'
  | 'acesso'
  | 'moradores'
  | 'visitantes';

export interface AuditLog {
  id: string;
  // Quem
  actorId: string;          // uid de quem fez a acção
  actorNome: string;        // nome legível
  actorRole: string;        // role no momento
  // O quê
  accao: AuditAccao;
  categoria: AuditCategoria;
  descricao: string;        // texto legível para humanos
  // Onde
  condominioId?: string;
  entidadeId?: string;      // id do doc afectado (quotaId, userId, etc.)
  entidadeTipo?: string;    // 'quota' | 'usuario' | 'ocorrencia' | etc.
  // Detalhes extra (opcional)
  meta?: Record<string, unknown>;
  // Quando
  createdAt: Timestamp;
}

export interface LogAuditInput {
  actorId: string;
  actorNome: string;
  actorRole: string;
  accao: AuditAccao;
  categoria: AuditCategoria;
  descricao: string;
  condominioId?: string;
  entidadeId?: string;
  entidadeTipo?: string;
  meta?: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// MAPA DE CATEGORIAS POR ACÇÃO
// ─────────────────────────────────────────────

export const CATEGORIA_MAP: Record<AuditAccao, AuditCategoria> = {
  quota_paga:              'financeiro',
  quota_revertida:         'financeiro',
  quota_isenta:            'financeiro',
  quotas_geradas:          'financeiro',
  utilizador_criado:       'utilizadores',
  utilizador_activado:     'utilizadores',
  utilizador_desactivado:  'utilizadores',
  utilizador_eliminado:    'utilizadores',
  utilizador_editado:      'utilizadores',
  convite_enviado:         'utilizadores',
  ocorrencia_criada:       'ocorrencias',
  ocorrencia_delegada:     'ocorrencias',
  ocorrencia_iniciada:     'ocorrencias',
  ocorrencia_concluida:    'ocorrencias',
  ocorrencia_encerrada:    'ocorrencias',
  configuracoes_alteradas: 'condominio',
  condominio_criado:       'condominio',
  unidade_criada:          'condominio',
  unidade_editada:         'condominio',
  unidade_eliminada:       'condominio',
  primeiro_login:          'acesso',
  conta_activada:          'acesso',
  morador_criado:          'moradores',
  morador_eliminado:       'moradores',
  visitante_registado:     'visitantes',
  visitante_saida:         'visitantes',
};

// ─────────────────────────────────────────────
// ESCREVER LOG
// ─────────────────────────────────────────────

/**
 * Regista uma acção no audit log.
 * Falha silenciosamente — nunca deve bloquear a operação principal.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      actorId:      input.actorId,
      actorNome:    input.actorNome,
      actorRole:    input.actorRole,
      accao:        input.accao,
      categoria:    input.categoria ?? CATEGORIA_MAP[input.accao],
      descricao:    input.descricao,
      condominioId: input.condominioId ?? null,
      entidadeId:   input.entidadeId   ?? null,
      entidadeTipo: input.entidadeTipo ?? null,
      meta:         input.meta         ?? null,
      createdAt:    serverTimestamp(),
    });
  } catch (e) {
    // Nunca bloquear — audit log é best-effort
    console.warn('[auditLog] Falha ao registar:', e);
  }
}

// ─────────────────────────────────────────────
// LER LOGS
// ─────────────────────────────────────────────

export interface GetAuditLogsOptions {
  condominioId?: string;
  categoria?: AuditCategoria;
  actorId?: string;
  pageSize?: number;
  after?: DocumentSnapshot;
}

export async function getAuditLogs(opts: GetAuditLogsOptions = {}): Promise<AuditLog[]> {
  const { condominioId, categoria, actorId, pageSize = 50, after } = opts;

  let q = query(
    collection(db, 'audit_logs'),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  );

  if (condominioId) {
    q = query(q, where('condominioId', '==', condominioId));
  }
  if (categoria) {
    q = query(q, where('categoria', '==', categoria));
  }
  if (actorId) {
    q = query(q, where('actorId', '==', actorId));
  }
  if (after) {
    q = query(q, startAfter(after));
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
}
