/**
 * Módulo de Despesas Operacionais
 * Regista custos por condomínio para cálculo de margem líquida.
 */

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { logAudit } from './auditLog';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type CategoriaDespesa =
  | 'manutencao'
  | 'limpeza'
  | 'seguranca'
  | 'energia'
  | 'agua'
  | 'administrativo'
  | 'obras'
  | 'seguros'
  | 'outros';

export const CATEGORIAS_DESPESA: { value: CategoriaDespesa; label: string }[] = [
  { value: 'manutencao',    label: 'Manutenção'       },
  { value: 'limpeza',       label: 'Limpeza'          },
  { value: 'seguranca',     label: 'Segurança'        },
  { value: 'energia',       label: 'Energia'          },
  { value: 'agua',          label: 'Água'             },
  { value: 'administrativo',label: 'Administrativo'   },
  { value: 'obras',         label: 'Obras'            },
  { value: 'seguros',       label: 'Seguros'          },
  { value: 'outros',        label: 'Outros'           },
];

export interface Despesa {
  id: string;
  condominioId: string;
  descricao: string;
  valor: number;
  categoria: CategoriaDespesa;
  data: Timestamp;          // data da despesa
  fornecedor?: string;
  comprovativoUrl?: string;
  registadoPor: string;     // uid
  registadoPorNome: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DespesaInput {
  condominioId: string;
  descricao: string;
  valor: number;
  categoria: CategoriaDespesa;
  data: Date;
  fornecedor?: string;
  comprovativoUrl?: string;
  registadoPor: string;
  registadoPorNome: string;
  registadoPorRole: string;
}

// ─────────────────────────────────────────────
// LEITURA
// ─────────────────────────────────────────────

export async function getDespesas(
  condominioId: string,
  inicio?: Date,
  fim?: Date,
): Promise<Despesa[]> {
  const q = query(
    collection(db, 'despesas'),
    where('condominioId', '==', condominioId),
    orderBy('data', 'desc'),
  );

  const snap = await getDocs(q);
  let docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Despesa));

  // Filtro de período em memória (evita índice composto extra)
  if (inicio) docs = docs.filter(d => d.data.toDate() >= inicio);
  if (fim)    docs = docs.filter(d => d.data.toDate() <= fim);

  return docs;
}

/** Busca despesas de múltiplos condomínios (portfólio) */
export async function getDespesasPortfolio(
  condominioIds: string[],
  inicio?: Date,
  fim?: Date,
): Promise<Despesa[]> {
  if (!condominioIds.length) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < condominioIds.length; i += 30) {
    chunks.push(condominioIds.slice(i, i + 30));
  }

  const snaps = await Promise.all(
    chunks.map(ch =>
      getDocs(query(
        collection(db, 'despesas'),
        where('condominioId', 'in', ch),
        orderBy('data', 'desc'),
      ))
    )
  );

  let docs = snaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() } as Despesa)));

  if (inicio) docs = docs.filter(d => d.data.toDate() >= inicio);
  if (fim)    docs = docs.filter(d => d.data.toDate() <= fim);

  return docs;
}

/** Resumo de despesas por categoria para um condomínio */
export async function getResumoDespesas(
  condominioId: string,
  inicio?: Date,
  fim?: Date,
): Promise<{ total: number; porCategoria: Record<CategoriaDespesa, number> }> {
  const despesas = await getDespesas(condominioId, inicio, fim);

  const porCategoria = {} as Record<CategoriaDespesa, number>;
  let total = 0;

  despesas.forEach(d => {
    porCategoria[d.categoria] = (porCategoria[d.categoria] ?? 0) + d.valor;
    total += d.valor;
  });

  return { total, porCategoria };
}

// ─────────────────────────────────────────────
// ESCRITA
// ─────────────────────────────────────────────

export async function createDespesa(input: DespesaInput): Promise<string> {
  const ref = await addDoc(collection(db, 'despesas'), {
    condominioId:      input.condominioId,
    descricao:         input.descricao,
    valor:             input.valor,
    categoria:         input.categoria,
    data:              Timestamp.fromDate(input.data),
    fornecedor:        input.fornecedor ?? null,
    comprovativoUrl:   input.comprovativoUrl ?? null,
    registadoPor:      input.registadoPor,
    registadoPorNome:  input.registadoPorNome,
    createdAt:         serverTimestamp(),
    updatedAt:         serverTimestamp(),
  });

  void logAudit({
    actorId:      input.registadoPor,
    actorNome:    input.registadoPorNome,
    actorRole:    input.registadoPorRole,
    accao:        'despesa_registada',
    categoria:    'financeiro',
    descricao:    `Despesa "${input.descricao}" de ${input.valor.toLocaleString('pt-AO')} Kz registada`,
    condominioId: input.condominioId,
    entidadeId:   ref.id,
    entidadeTipo: 'despesa',
    meta:         { categoria: input.categoria, valor: input.valor, fornecedor: input.fornecedor },
  });

  return ref.id;
}

export async function updateDespesa(
  id: string,
  input: Partial<DespesaInput>,
  actor: { actorId: string; actorNome: string; actorRole: string },
): Promise<void> {
  const ref = doc(db, 'despesas', id);
  const payload: Record<string, unknown> = { ...input, updatedAt: serverTimestamp() };
  if (input.data) payload.data = Timestamp.fromDate(input.data);
  delete payload.registadoPor;
  delete payload.registadoPorNome;
  delete payload.registadoPorRole;

  await updateDoc(ref, payload);

  void logAudit({
    actorId:      actor.actorId,
    actorNome:    actor.actorNome,
    actorRole:    actor.actorRole,
    accao:        'despesa_editada',
    categoria:    'financeiro',
    descricao:    `Despesa ${id} actualizada`,
    entidadeId:   id,
    entidadeTipo: 'despesa',
  });
}

export async function deleteDespesa(
  id: string,
  actor: { actorId: string; actorNome: string; actorRole: string },
): Promise<void> {
  const snap = await getDoc(doc(db, 'despesas', id));
  const d = snap.data();

  await deleteDoc(doc(db, 'despesas', id));

  void logAudit({
    actorId:      actor.actorId,
    actorNome:    actor.actorNome,
    actorRole:    actor.actorRole,
    accao:        'despesa_eliminada',
    categoria:    'financeiro',
    descricao:    `Despesa "${d?.descricao ?? id}" eliminada`,
    condominioId: d?.condominioId,
    entidadeId:   id,
    entidadeTipo: 'despesa',
    meta:         { valor: d?.valor, categoria: d?.categoria },
  });
}
