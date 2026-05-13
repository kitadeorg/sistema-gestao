import {
  collection, addDoc, getDocs, query, where,
  orderBy, serverTimestamp, doc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export type CategoriaDocumento =
  | 'regulamento'
  | 'ata'
  | 'contrato'
  | 'financeiro'
  | 'juridico'
  | 'outro';

export interface Documento {
  id: string;
  condominioId: string;
  titulo: string;
  descricao?: string;
  categoria: CategoriaDocumento;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  autorId: string;
  autorNome: string;
  createdAt: Timestamp;
}

export interface DocumentoInput {
  condominioId: string;
  titulo: string;
  descricao?: string;
  categoria: CategoriaDocumento;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  autorId: string;
  autorNome: string;
}

export const CATEGORIAS_DOCUMENTO: { value: CategoriaDocumento; label: string; cor: string }[] = [
  { value: 'regulamento', label: 'Regulamento',  cor: 'bg-blue-50 text-blue-700'       },
  { value: 'ata',         label: 'Ata de Reunião', cor: 'bg-purple-50 text-purple-700' },
  { value: 'contrato',    label: 'Contrato',      cor: 'bg-emerald-50 text-emerald-700' },
  { value: 'financeiro',  label: 'Financeiro',    cor: 'bg-orange-50 text-orange-700'   },
  { value: 'juridico',    label: 'Jurídico',      cor: 'bg-red-50 text-red-700'         },
  { value: 'outro',       label: 'Outro',         cor: 'bg-zinc-100 text-zinc-600'      },
];

export async function getDocumentos(condominioId: string): Promise<Documento[]> {
  const snap = await getDocs(
    query(
      collection(db, 'documentos'),
      where('condominioId', '==', condominioId),
      orderBy('createdAt', 'desc'),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Documento));
}

export async function createDocumento(input: DocumentoInput): Promise<string> {
  const ref = await addDoc(collection(db, 'documentos'), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteDocumento(id: string): Promise<void> {
  await deleteDoc(doc(db, 'documentos', id));
}
