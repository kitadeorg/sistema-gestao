import {
  collection, addDoc, getDocs, query, where,
  orderBy, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export type TipoAviso = 'geral' | 'financeiro' | 'manutencao' | 'seguranca' | 'evento' | 'urgente';
export type PrioridadeAviso = 'normal' | 'alta' | 'urgente';

export interface Aviso {
  id: string;
  condominioId: string;
  titulo: string;
  conteudo: string;
  tipo: TipoAviso;
  prioridade: PrioridadeAviso;
  autorId: string;
  autorNome: string;
  autorRole: string;
  fixado: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface AvisoInput {
  condominioId: string;
  titulo: string;
  conteudo: string;
  tipo: TipoAviso;
  prioridade: PrioridadeAviso;
  autorId: string;
  autorNome: string;
  autorRole: string;
  fixado?: boolean;
}

export const TIPOS_AVISO: { value: TipoAviso; label: string; cor: string }[] = [
  { value: 'geral',       label: 'Geral',       cor: 'bg-zinc-100 text-zinc-700'       },
  { value: 'financeiro',  label: 'Financeiro',  cor: 'bg-blue-50 text-blue-700'        },
  { value: 'manutencao',  label: 'Manutenção',  cor: 'bg-orange-50 text-orange-700'    },
  { value: 'seguranca',   label: 'Segurança',   cor: 'bg-purple-50 text-purple-700'    },
  { value: 'evento',      label: 'Evento',      cor: 'bg-emerald-50 text-emerald-700'  },
  { value: 'urgente',     label: 'Urgente',     cor: 'bg-red-50 text-red-700'          },
];

export async function getAvisos(condominioId: string): Promise<Aviso[]> {
  const snap = await getDocs(
    query(
      collection(db, 'avisos'),
      where('condominioId', '==', condominioId),
      orderBy('fixado', 'desc'),
      orderBy('createdAt', 'desc'),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Aviso));
}

export async function createAviso(input: AvisoInput): Promise<string> {
  const ref = await addDoc(collection(db, 'avisos'), {
    ...input,
    fixado: input.fixado ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAviso(id: string, data: Partial<AvisoInput>): Promise<void> {
  await updateDoc(doc(db, 'avisos', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteAviso(id: string): Promise<void> {
  await deleteDoc(doc(db, 'avisos', id));
}

export async function toggleFixarAviso(id: string, fixado: boolean): Promise<void> {
  await updateDoc(doc(db, 'avisos', id), { fixado, updatedAt: serverTimestamp() });
}
