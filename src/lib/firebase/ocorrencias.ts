import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

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

  descricao: string;
  categoria: string;
}) {
  return await addDoc(collection(db, 'ocorrencias'), {
    ...data,

    prioridade: 'media',
    status: 'aberta',

    assignedTo: null,
    delegadoPor: null,
    instrucoes: null,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/* ========================================================= */
/* ✅ Delegar ocorrência (Síndico) */
/* ========================================================= */

export async function delegarOcorrencia(
  ocorrenciaId: string,
  funcionarioId: string,
  sindicoId: string,
  prioridade: 'baixa' | 'media' | 'alta',
  instrucoes?: string
) {
  const ref = doc(db, 'ocorrencias', ocorrenciaId);

  return await updateDoc(ref, {
    assignedTo: funcionarioId,
    delegadoPor: sindicoId,
    prioridade,
    instrucoes: instrucoes ?? null,
    status: 'delegada',
    updatedAt: serverTimestamp(),
  });
}

/* ========================================================= */
/* ✅ Funcionário inicia execução */
/* ========================================================= */

export async function iniciarExecucao(ocorrenciaId: string) {
  const ref = doc(db, 'ocorrencias', ocorrenciaId);

  return await updateDoc(ref, {
    status: 'em_execucao',
    updatedAt: serverTimestamp(),
  });
}

/* ========================================================= */
/* ✅ Funcionário conclui */
/* ========================================================= */

export async function concluirOcorrencia(ocorrenciaId: string) {
  const ref = doc(db, 'ocorrencias', ocorrenciaId);

  return await updateDoc(ref, {
    status: 'concluida',
    updatedAt: serverTimestamp(),
  });
}

/* ========================================================= */
/* ✅ Síndico encerra */
/* ========================================================= */

export async function encerrarOcorrencia(ocorrenciaId: string) {
  const ref = doc(db, 'ocorrencias', ocorrenciaId);

  return await updateDoc(ref, {
    status: 'encerrada',
    updatedAt: serverTimestamp(),
  });
}