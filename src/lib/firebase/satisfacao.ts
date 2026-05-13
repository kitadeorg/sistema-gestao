/**
 * Sistema de Satisfação dos Moradores
 * Permite que moradores avaliem o condomínio mensalmente (1–5 estrelas)
 * e deixem comentários opcionais.
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface Avaliacao {
  id: string;
  condominioId: string;
  moradorId: string;
  moradorNome: string;
  nota: 1 | 2 | 3 | 4 | 5;
  comentario?: string;
  categorias: {
    limpeza: 1 | 2 | 3 | 4 | 5;
    seguranca: 1 | 2 | 3 | 4 | 5;
    manutencao: 1 | 2 | 3 | 4 | 5;
    comunicacao: 1 | 2 | 3 | 4 | 5;
  };
  mes: number;
  ano: number;
  createdAt: Timestamp;
}

export interface ResumoSatisfacao {
  mediaGeral: number;
  totalAvaliacoes: number;
  distribuicao: Record<1 | 2 | 3 | 4 | 5, number>;
  mediaCategorias: {
    limpeza: number;
    seguranca: number;
    manutencao: number;
    comunicacao: number;
  };
  avaliacoes: Avaliacao[];
  tendencia: 'subindo' | 'descendo' | 'estavel';
}

export interface SubmeterAvaliacaoInput {
  condominioId: string;
  moradorId: string;
  moradorNome: string;
  nota: 1 | 2 | 3 | 4 | 5;
  comentario?: string;
  categorias: Avaliacao['categorias'];
}

// ─────────────────────────────────────────────
// ESCREVER
// ─────────────────────────────────────────────

/** Submete ou actualiza a avaliação do morador para o mês actual */
export async function submeterAvaliacao(input: SubmeterAvaliacaoInput): Promise<void> {
  const agora = new Date();
  const mes   = agora.getMonth() + 1;
  const ano   = agora.getFullYear();

  // ID único por morador/mês/ano — evita duplicados
  const docId = `${input.condominioId}_${input.moradorId}_${ano}_${mes}`;

  await setDoc(doc(db, 'avaliacoes', docId), {
    condominioId: input.condominioId,
    moradorId:    input.moradorId,
    moradorNome:  input.moradorNome,
    nota:         input.nota,
    comentario:   input.comentario ?? null,
    categorias:   input.categorias,
    mes,
    ano,
    createdAt:    serverTimestamp(),
  });
}

/** Verifica se o morador já avaliou este mês */
export async function jaAvaliouEsteMes(
  condominioId: string,
  moradorId: string,
): Promise<boolean> {
  const agora = new Date();
  const docId = `${condominioId}_${moradorId}_${agora.getFullYear()}_${agora.getMonth() + 1}`;
  const snap  = await getDoc(doc(db, 'avaliacoes', docId));
  return snap.exists();
}

// ─────────────────────────────────────────────
// LER
// ─────────────────────────────────────────────

/** Resumo de satisfação de um condomínio */
export async function getResumoSatisfacao(condominioId: string): Promise<ResumoSatisfacao> {
  const snap = await getDocs(
    query(
      collection(db, 'avaliacoes'),
      where('condominioId', '==', condominioId),
      orderBy('createdAt', 'desc'),
    )
  );

  const avaliacoes = snap.docs.map(d => ({ id: d.id, ...d.data() } as Avaliacao));

  if (avaliacoes.length === 0) {
    return {
      mediaGeral: 0,
      totalAvaliacoes: 0,
      distribuicao: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      mediaCategorias: { limpeza: 0, seguranca: 0, manutencao: 0, comunicacao: 0 },
      avaliacoes: [],
      tendencia: 'estavel',
    };
  }

  // Distribuição de notas
  const distribuicao: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  avaliacoes.forEach(a => { distribuicao[a.nota] = (distribuicao[a.nota] ?? 0) + 1; });

  // Média geral
  const mediaGeral = avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length;

  // Médias por categoria
  const cats = ['limpeza', 'seguranca', 'manutencao', 'comunicacao'] as const;
  const mediaCategorias = Object.fromEntries(
    cats.map(cat => [
      cat,
      avaliacoes.reduce((s, a) => s + (a.categorias?.[cat] ?? 3), 0) / avaliacoes.length,
    ])
  ) as ResumoSatisfacao['mediaCategorias'];

  // Tendência: comparar último mês com o anterior
  const agora = new Date();
  const mesMes = agora.getMonth() + 1;
  const anoAtual = agora.getFullYear();
  const mesAnterior = mesMes === 1 ? 12 : mesMes - 1;
  const anoAnterior = mesMes === 1 ? anoAtual - 1 : anoAtual;

  const avMesAtual   = avaliacoes.filter(a => a.mes === mesMes && a.ano === anoAtual);
  const avMesAnterior = avaliacoes.filter(a => a.mes === mesAnterior && a.ano === anoAnterior);

  let tendencia: ResumoSatisfacao['tendencia'] = 'estavel';
  if (avMesAtual.length > 0 && avMesAnterior.length > 0) {
    const mediaAtual    = avMesAtual.reduce((s, a) => s + a.nota, 0) / avMesAtual.length;
    const mediaAnterior = avMesAnterior.reduce((s, a) => s + a.nota, 0) / avMesAnterior.length;
    if (mediaAtual > mediaAnterior + 0.2)      tendencia = 'subindo';
    else if (mediaAtual < mediaAnterior - 0.2) tendencia = 'descendo';
  }

  return { mediaGeral, totalAvaliacoes: avaliacoes.length, distribuicao, mediaCategorias, avaliacoes, tendencia };
}

/** Score de satisfação normalizado 0–100 para o ranking */
export async function getSatisfacaoScore(condominioId: string): Promise<number> {
  const resumo = await getResumoSatisfacao(condominioId);
  if (resumo.totalAvaliacoes === 0) return 50; // neutro se sem dados
  return ((resumo.mediaGeral - 1) / 4) * 100; // 1–5 → 0–100
}
