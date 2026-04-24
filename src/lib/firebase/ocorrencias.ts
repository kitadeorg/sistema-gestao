import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { logAudit } from './auditLog';

export interface OcorrenciaActor {
  actorId: string;
  actorNome: string;
  actorRole: string;
}

/* ========================================================= */
/* ✅ Criar ocorrência (Morador) */
/* ========================================================= */

export async function criarOcorrencia(data: {
  condominioId: string;
  unidadeId: string;
  unidadeNumero: string;
  bloco: string;
  criadoPor: string;
  criadoPorNome: string;
  titulo?: string;
  descricao: string;
  categoria: string;
}) {
  const ref = await addDoc(collection(db, 'ocorrencias'), {
    ...data,
    titulo: data.titulo ?? data.descricao.slice(0, 60),
    prioridade: 'media',
    status: 'aberta',
    assignedTo: null,
    delegadoPor: null,
    instrucoes: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  void logAudit({
    actorId:      data.criadoPor,
    actorNome:    data.criadoPorNome,
    actorRole:    'morador',
    accao:        'ocorrencia_criada',
    categoria:    'ocorrencias',
    descricao:    `Ocorrência "${data.titulo ?? data.descricao.slice(0, 60)}" criada`,
    condominioId: data.condominioId,
    entidadeId:   ref.id,
    entidadeTipo: 'ocorrencia',
    meta:         { categoria: data.categoria, unidadeNumero: data.unidadeNumero },
  });

  return ref;
}

/* ========================================================= */
/* ✅ Delegar ocorrência (Síndico) */
/* ========================================================= */

export async function delegarOcorrencia(
  ocorrenciaId: string,
  funcionarioId: string,
  sindicoId: string,
  prioridade: 'baixa' | 'media' | 'alta',
  instrucoes?: string,
  actor?: OcorrenciaActor,
) {
  const ref = doc(db, 'ocorrencias', ocorrenciaId);
  await updateDoc(ref, {
    assignedTo: funcionarioId,
    delegadoPor: sindicoId,
    prioridade,
    instrucoes: instrucoes ?? null,
    status: 'delegada',
    updatedAt: serverTimestamp(),
  });

  if (actor) {
    void logAudit({
      actorId:      actor.actorId,
      actorNome:    actor.actorNome,
      actorRole:    actor.actorRole,
      accao:        'ocorrencia_delegada',
      categoria:    'ocorrencias',
      descricao:    `Ocorrência ${ocorrenciaId} delegada ao funcionário ${funcionarioId}`,
      entidadeId:   ocorrenciaId,
      entidadeTipo: 'ocorrencia',
      meta:         { funcionarioId, prioridade },
    });
  }
}

export async function iniciarExecucao(ocorrenciaId: string, actor?: OcorrenciaActor) {
  const ref = doc(db, 'ocorrencias', ocorrenciaId);
  await updateDoc(ref, { status: 'em_execucao', updatedAt: serverTimestamp() });

  if (actor) {
    void logAudit({
      actorId:      actor.actorId,
      actorNome:    actor.actorNome,
      actorRole:    actor.actorRole,
      accao:        'ocorrencia_iniciada',
      categoria:    'ocorrencias',
      descricao:    `Ocorrência ${ocorrenciaId} iniciada`,
      entidadeId:   ocorrenciaId,
      entidadeTipo: 'ocorrencia',
    });
  }
}

export async function concluirOcorrencia(ocorrenciaId: string, actor?: OcorrenciaActor) {
  const ref = doc(db, 'ocorrencias', ocorrenciaId);
  await updateDoc(ref, { status: 'concluida', updatedAt: serverTimestamp() });

  if (actor) {
    void logAudit({
      actorId:      actor.actorId,
      actorNome:    actor.actorNome,
      actorRole:    actor.actorRole,
      accao:        'ocorrencia_concluida',
      categoria:    'ocorrencias',
      descricao:    `Ocorrência ${ocorrenciaId} concluída`,
      entidadeId:   ocorrenciaId,
      entidadeTipo: 'ocorrencia',
    });
  }
}

export async function encerrarOcorrencia(ocorrenciaId: string, actor?: OcorrenciaActor) {
  const ref = doc(db, 'ocorrencias', ocorrenciaId);
  await updateDoc(ref, { status: 'encerrada', updatedAt: serverTimestamp() });

  if (actor) {
    void logAudit({
      actorId:      actor.actorId,
      actorNome:    actor.actorNome,
      actorRole:    actor.actorRole,
      accao:        'ocorrencia_encerrada',
      categoria:    'ocorrencias',
      descricao:    `Ocorrência ${ocorrenciaId} encerrada`,
      entidadeId:   ocorrenciaId,
      entidadeTipo: 'ocorrencia',
    });
  }
}