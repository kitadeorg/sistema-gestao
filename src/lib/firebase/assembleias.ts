import {
  collection, addDoc, getDocs, query, where,
  orderBy, serverTimestamp, doc, updateDoc, deleteDoc,
  getDoc, Timestamp, arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';

export type StatusAssembleia = 'agendada' | 'em_curso' | 'encerrada' | 'cancelada';
export type TipoVoto = 'sim' | 'nao' | 'abstencao';

export interface PautaItem {
  id: string;
  titulo: string;
  descricao?: string;
  resultado?: string;
  votacaoAtiva: boolean;
  votos: { moradorId: string; moradorNome: string; voto: TipoVoto; votadoEm: Timestamp }[];
}

export interface Assembleia {
  id: string;
  condominioId: string;
  titulo: string;
  descricao?: string;
  data: Timestamp;
  local: string;
  status: StatusAssembleia;
  pauta: PautaItem[];
  convocatoriaUrl?: string;
  ataUrl?: string;
  criadoPor: string;
  criadoPorNome: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface AssembleiaInput {
  condominioId: string;
  titulo: string;
  descricao?: string;
  data: Date;
  local: string;
  pauta: { titulo: string; descricao?: string }[];
  criadoPor: string;
  criadoPorNome: string;
}

export async function getAssembleias(condominioId: string): Promise<Assembleia[]> {
  const snap = await getDocs(
    query(
      collection(db, 'assembleias'),
      where('condominioId', '==', condominioId),
      orderBy('data', 'desc'),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Assembleia));
}

export async function createAssembleia(input: AssembleiaInput): Promise<string> {
  const pauta: PautaItem[] = input.pauta.map((p, i) => ({
    id: `pauta_${i}_${Date.now()}`,
    titulo: p.titulo,
    descricao: p.descricao,
    votacaoAtiva: false,
    votos: [],
  }));

  const ref = await addDoc(collection(db, 'assembleias'), {
    condominioId: input.condominioId,
    titulo: input.titulo,
    descricao: input.descricao ?? null,
    data: Timestamp.fromDate(input.data),
    local: input.local,
    status: 'agendada' as StatusAssembleia,
    pauta,
    criadoPor: input.criadoPor,
    criadoPorNome: input.criadoPorNome,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateStatusAssembleia(
  id: string,
  status: StatusAssembleia,
): Promise<void> {
  await updateDoc(doc(db, 'assembleias', id), { status, updatedAt: serverTimestamp() });
}

export async function toggleVotacaoPauta(
  assembleiaId: string,
  pautaId: string,
  ativa: boolean,
): Promise<void> {
  const snap = await getDoc(doc(db, 'assembleias', assembleiaId));
  if (!snap.exists()) return;
  const pauta: PautaItem[] = snap.data().pauta ?? [];
  const updated = pauta.map(p =>
    p.id === pautaId ? { ...p, votacaoAtiva: ativa } : p,
  );
  await updateDoc(doc(db, 'assembleias', assembleiaId), {
    pauta: updated,
    updatedAt: serverTimestamp(),
  });
}

export async function registarVoto(
  assembleiaId: string,
  pautaId: string,
  moradorId: string,
  moradorNome: string,
  voto: TipoVoto,
): Promise<void> {
  const snap = await getDoc(doc(db, 'assembleias', assembleiaId));
  if (!snap.exists()) throw new Error('Assembleia não encontrada.');
  const pauta: PautaItem[] = snap.data().pauta ?? [];
  const item = pauta.find(p => p.id === pautaId);
  if (!item) throw new Error('Pauta não encontrada.');
  if (!item.votacaoAtiva) throw new Error('Votação não está activa para este ponto.');
  if (item.votos.some(v => v.moradorId === moradorId)) {
    throw new Error('Já votaste neste ponto.');
  }
  const updated = pauta.map(p =>
    p.id === pautaId
      ? {
          ...p,
          votos: [
            ...p.votos,
            { moradorId, moradorNome, voto, votadoEm: Timestamp.now() },
          ],
        }
      : p,
  );
  await updateDoc(doc(db, 'assembleias', assembleiaId), {
    pauta: updated,
    updatedAt: serverTimestamp(),
  });
}

export async function registarResultadoPauta(
  assembleiaId: string,
  pautaId: string,
  resultado: string,
): Promise<void> {
  const snap = await getDoc(doc(db, 'assembleias', assembleiaId));
  if (!snap.exists()) return;
  const pauta: PautaItem[] = snap.data().pauta ?? [];
  const updated = pauta.map(p =>
    p.id === pautaId ? { ...p, resultado, votacaoAtiva: false } : p,
  );
  await updateDoc(doc(db, 'assembleias', assembleiaId), {
    pauta: updated,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAssembleia(id: string): Promise<void> {
  await deleteDoc(doc(db, 'assembleias', id));
}
