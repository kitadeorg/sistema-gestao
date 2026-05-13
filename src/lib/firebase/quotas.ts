/**
 * Sistema de Quotas Mensais
 * Gestão completa de quotas condominiais por unidade/morador
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { logAudit } from './auditLog';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type StatusQuota = 'pendente' | 'pago' | 'atrasado' | 'isento';

export interface Quota {
  id: string;
  condominioId: string;
  unidadeId: string;
  unidadeNumero: string;
  moradorId?: string;       // uid do morador (se tiver conta)
  moradorNome: string;
  valor: number;
  mes: number;              // 1-12
  ano: number;
  dataVencimento: Timestamp;
  dataPagamento?: Timestamp;
  status: StatusQuota;
  comprovativoUrl?: string;
  observacoes?: string;
  registadoPor?: string;    // uid de quem registou o pagamento
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GerarQuotasInput {
  condominioId: string;
  mes: number;
  ano: number;
  diaVencimento?: number;
  criadoPor: string;
  criadoPorNome?: string;
  criadoPorRole?: string;
}

export interface RegistarPagamentoInput {
  quotaId: string;
  dataPagamento: Date;
  comprovativoUrl?: string;
  observacoes?: string;
  registadoPor: string;
  actorNome?: string;
  actorRole?: string;
}

// ─────────────────────────────────────────────
// LEITURA
// ─────────────────────────────────────────────

/** Busca todas as quotas de um condomínio num mês/ano */
export async function getQuotasMes(
  condominioId: string,
  mes: number,
  ano: number,
): Promise<Quota[]> {
  const q = query(
    collection(db, 'quotas'),
    where('condominioId', '==', condominioId),
    where('mes', '==', mes),
    where('ano', '==', ano),
    orderBy('unidadeNumero'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Quota));
}

/** Busca todas as quotas de um morador específico.
 *  Tenta primeiro por moradorId (uid), depois por unidadeId como fallback
 *  para casos em que o morador ainda não tinha conta quando as quotas foram geradas.
 */
export async function getQuotasMorador(
  condominioId: string,
  moradorId: string,
): Promise<Quota[]> {
  // 1. Buscar por moradorId (uid) — caso normal
  const q1 = query(
    collection(db, 'quotas'),
    where('condominioId', '==', condominioId),
    where('moradorId', '==', moradorId),
    orderBy('ano', 'desc'),
    orderBy('mes', 'desc'),
  );
  const snap1 = await getDocs(q1);
  if (!snap1.empty) {
    return snap1.docs.map(d => ({ id: d.id, ...d.data() } as Quota));
  }

  // 2. Fallback: buscar a unidade do morador via doc usuarios
  const userSnap = await getDoc(doc(db, 'usuarios', moradorId));
  if (!userSnap.exists()) return [];
  const unidadeId = userSnap.data().unidadeId;
  if (!unidadeId) return [];

  const q2 = query(
    collection(db, 'quotas'),
    where('condominioId', '==', condominioId),
    where('unidadeId', '==', unidadeId),
    orderBy('ano', 'desc'),
    orderBy('mes', 'desc'),
  );
  const snap2 = await getDocs(q2);

  // Actualizar moradorId nas quotas encontradas (lazy fix)
  const batch = writeBatch(db);
  snap2.docs.forEach(d => {
    if (!d.data().moradorId) {
      batch.update(d.ref, { moradorId, updatedAt: serverTimestamp() });
    }
  });
  if (!snap2.empty) await batch.commit();

  return snap2.docs.map(d => ({ id: d.id, ...d.data() } as Quota));
}

/** Verifica se já existem quotas geradas para um mês/ano */
export async function quotasJaGeradas(
  condominioId: string,
  mes: number,
  ano: number,
): Promise<boolean> {
  const q = query(
    collection(db, 'quotas'),
    where('condominioId', '==', condominioId),
    where('mes', '==', mes),
    where('ano', '==', ano),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/** Resumo financeiro das quotas de um mês */
export async function getResumoQuotasMes(
  condominioId: string,
  mes: number,
  ano: number,
) {
  const quotas = await getQuotasMes(condominioId, mes, ano);

  const total     = quotas.reduce((s, q) => s + q.valor, 0);
  const pago      = quotas.filter(q => q.status === 'pago').reduce((s, q) => s + q.valor, 0);
  const pendente  = quotas.filter(q => q.status === 'pendente').reduce((s, q) => s + q.valor, 0);
  const atrasado  = quotas.filter(q => q.status === 'atrasado').reduce((s, q) => s + q.valor, 0);

  const totalUnidades    = quotas.length;
  const unidadesPagas    = quotas.filter(q => q.status === 'pago').length;
  const unidadesPendente = quotas.filter(q => q.status === 'pendente').length;
  const unidadesAtrasado = quotas.filter(q => q.status === 'atrasado').length;

  const taxaInadimplencia = totalUnidades > 0
    ? ((unidadesPendente + unidadesAtrasado) / totalUnidades) * 100
    : 0;

  return {
    total, pago, pendente, atrasado,
    totalUnidades, unidadesPagas, unidadesPendente, unidadesAtrasado,
    taxaInadimplencia,
    quotas,
  };
}

// ─────────────────────────────────────────────
// GERAÇÃO AUTOMÁTICA DE QUOTAS
// ─────────────────────────────────────────────

/**
 * Gera quotas mensais para todas as unidades ocupadas do condomínio.
 * Usa o campo `quotaIndividual` da unidade se existir,
 * caso contrário usa o valor padrão do condomínio.
 */
export async function gerarQuotasMensais(input: GerarQuotasInput): Promise<number> {
  const { condominioId, mes, ano, diaVencimento = 5, criadoPor } = input;

  // Verificar se já foram geradas
  const jaExistem = await quotasJaGeradas(condominioId, mes, ano);
  if (jaExistem) {
    throw new Error(`As quotas de ${mes}/${ano} já foram geradas para este condomínio.`);
  }

  // Buscar dados do condomínio (valor padrão da quota)
  const condoSnap = await getDoc(doc(db, 'condominios', condominioId));
  if (!condoSnap.exists()) throw new Error('Condomínio não encontrado.');
  const condoData = condoSnap.data();
  const valorPadrao: number = condoData.valorQuotaMensal ?? 0;

  // Buscar unidades ocupadas
  const unidadesSnap = await getDocs(
    query(
      collection(db, 'unidades'),
      where('condominioId', '==', condominioId),
      where('status', '==', 'ocupada'),
    )
  );

  if (unidadesSnap.empty) {
    throw new Error('Nenhuma unidade ocupada encontrada.');
  }

  // Buscar moradores para associar às unidades
  const moradoresSnap = await getDocs(
    query(collection(db, 'moradores'), where('condominioId', '==', condominioId))
  );
  const moradoresMap: Record<string, { nome: string; uid?: string }> = {};
  moradoresSnap.docs.forEach(d => {
    const m = d.data();
    if (m.unidadeId) {
      moradoresMap[m.unidadeId] = { nome: m.nome ?? 'Morador', uid: m.uid ?? undefined };
    }
  });

  // Enriquecer com uid via usuarios collection (para moradores criados via inviteUser)
  const emailsParaBuscar = moradoresSnap.docs
    .map(d => d.data().email)
    .filter(Boolean) as string[];

  if (emailsParaBuscar.length > 0) {
    // Buscar em lotes de 10 (limite do 'in' para strings)
    const lotes = [];
    for (let i = 0; i < emailsParaBuscar.length; i += 10) {
      lotes.push(emailsParaBuscar.slice(i, i + 10));
    }
    for (const lote of lotes) {
      const usersSnap = await getDocs(
        query(collection(db, 'usuarios'), where('email', 'in', lote), where('role', '==', 'morador'))
      );
      usersSnap.docs.forEach(d => {
        const u = d.data();
        // Encontrar a unidade deste morador e actualizar o uid
        const moradorEntry = Object.entries(moradoresMap).find(
          ([, v]) => v.nome === u.nome || (u.email && moradoresMap[u.condominioId ?? ''])
        );
        // Buscar por email no snap original
        const moradorDoc = moradoresSnap.docs.find(md => md.data().email === u.email);
        if (moradorDoc) {
          const unidadeId = moradorDoc.data().unidadeId;
          if (unidadeId && moradoresMap[unidadeId]) {
            moradoresMap[unidadeId].uid = d.id; // doc id = uid
          }
        }
      });
    }
  }

  // Data de vencimento
  const dataVencimento = new Date(ano, mes - 1, diaVencimento, 23, 59, 59);

  // Criar quotas em batch
  const batch = writeBatch(db);
  let count = 0;

  unidadesSnap.docs.forEach(unidadeDoc => {
    const unidade = unidadeDoc.data();
    const morador = moradoresMap[unidadeDoc.id];

    // Valor: usa quota individual da unidade se existir, senão usa o padrão
    const valor = unidade.ativaQuotaIndividual && unidade.quotaIndividual
      ? Number(unidade.quotaIndividual)
      : valorPadrao;

    if (valor <= 0) return; // Ignora unidades sem valor definido

    const quotaRef = doc(collection(db, 'quotas'));
    batch.set(quotaRef, {
      condominioId,
      unidadeId:     unidadeDoc.id,
      unidadeNumero: unidade.numero ?? '—',
      moradorId:     morador?.uid ?? null,
      moradorNome:   morador?.nome ?? 'Sem morador',
      valor,
      mes,
      ano,
      dataVencimento: Timestamp.fromDate(dataVencimento),
      status:        'pendente',
      createdAt:     serverTimestamp(),
      updatedAt:     serverTimestamp(),
      criadoPor,
    });
    count++;
  });

  await batch.commit();

  // Audit log
  void logAudit({
    actorId:      criadoPor,
    actorNome:    input.criadoPorNome ?? 'Sistema',
    actorRole:    input.criadoPorRole ?? 'sistema',
    accao:        'quotas_geradas',
    categoria:    'financeiro',
    descricao:    `${count} quotas geradas para ${mes}/${ano}`,
    condominioId,
    meta:         { mes, ano, total: count },
  });

  return count;
}

// ─────────────────────────────────────────────
// ACTUALIZAR STATUS (atrasos automáticos)
// ─────────────────────────────────────────────

/** Marca como atrasadas todas as quotas pendentes com vencimento passado,
 *  aplicando multa e juros configurados no condomínio */
export async function actualizarQuotasAtrasadas(condominioId: string): Promise<number> {
  const agora = new Date();

  // Buscar configurações de multa do condomínio
  const condoSnap = await getDoc(doc(db, 'condominios', condominioId));
  const condoData = condoSnap.exists() ? condoSnap.data() : {};
  const multaPct  = Number(condoData.multaPorAtraso ?? 0);   // % sobre o valor
  const jurosPct  = Number(condoData.jurosMensal    ?? 0);   // % ao mês

  const q = query(
    collection(db, 'quotas'),
    where('condominioId', '==', condominioId),
    where('status', '==', 'pendente'),
  );
  const snap = await getDocs(q);

  const batch = writeBatch(db);
  let count = 0;

  snap.docs.forEach(d => {
    const data       = d.data();
    const vencimento = data.dataVencimento?.toDate?.();
    if (!vencimento || vencimento >= agora) return;

    // Calcular meses de atraso (mínimo 1)
    const mesesAtraso = Math.max(
      1,
      Math.floor((agora.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    );

    const valorOriginal = data.valorOriginal ?? data.valor; // preservar original
    let novoValor = valorOriginal;

    // Aplicar multa única (só na primeira vez)
    if (multaPct > 0 && !data.multaAplicada) {
      novoValor += valorOriginal * (multaPct / 100);
    }

    // Aplicar juros mensais acumulados
    if (jurosPct > 0) {
      novoValor += valorOriginal * (jurosPct / 100) * mesesAtraso;
    }

    novoValor = Math.round(novoValor); // arredondar para inteiro (Kz)

    batch.update(d.ref, {
      status:         'atrasado',
      valorOriginal,                    // guardar valor sem multa
      valor:          novoValor,        // valor com multa/juros
      multaAplicada:  multaPct > 0,
      mesesAtraso,
      updatedAt:      serverTimestamp(),
    });
    count++;
  });

  if (count > 0) await batch.commit();
  return count;
}

// ─────────────────────────────────────────────
// REGISTAR PAGAMENTO
// ─────────────────────────────────────────────

export async function registarPagamento(input: RegistarPagamentoInput): Promise<void> {
  const { quotaId, dataPagamento, comprovativoUrl, observacoes, registadoPor, actorNome, actorRole } = input;

  // Buscar dados da quota para o log
  const quotaSnap = await getDoc(doc(db, 'quotas', quotaId));
  const quota = quotaSnap.data();

  await updateDoc(doc(db, 'quotas', quotaId), {
    status:          'pago',
    dataPagamento:   Timestamp.fromDate(dataPagamento),
    comprovativoUrl: comprovativoUrl ?? null,
    observacoes:     observacoes ?? null,
    registadoPor,
    updatedAt:       serverTimestamp(),
  });

  // Audit log
  void logAudit({
    actorId:      registadoPor,
    actorNome:    actorNome ?? 'Sistema',
    actorRole:    actorRole ?? 'sistema',
    accao:        'quota_paga',
    categoria:    'financeiro',
    descricao:    `Quota de ${quota?.moradorNome ?? '?'} (Unidade ${quota?.unidadeNumero ?? '?'}) marcada como paga`,
    condominioId: quota?.condominioId,
    entidadeId:   quotaId,
    entidadeTipo: 'quota',
    meta: {
      mes:   quota?.mes,
      ano:   quota?.ano,
      valor: quota?.valor,
    },
  });
}
export async function reverterPagamento(quotaId: string, actorId?: string, actorNome?: string, actorRole?: string): Promise<void> {
  const quotaSnap = await getDoc(doc(db, 'quotas', quotaId));
  const quota = quotaSnap.data();

  await updateDoc(doc(db, 'quotas', quotaId), {
    status:          'pendente',
    dataPagamento:   null,
    comprovativoUrl: null,
    registadoPor:    null,
    updatedAt:       serverTimestamp(),
  });

  void logAudit({
    actorId:      actorId ?? 'sistema',
    actorNome:    actorNome ?? 'Sistema',
    actorRole:    actorRole ?? 'sistema',
    accao:        'quota_revertida',
    categoria:    'financeiro',
    descricao:    `Pagamento de ${quota?.moradorNome ?? '?'} (Unidade ${quota?.unidadeNumero ?? '?'}) revertido`,
    condominioId: quota?.condominioId,
    entidadeId:   quotaId,
    entidadeTipo: 'quota',
    meta:         { mes: quota?.mes, ano: quota?.ano, valor: quota?.valor },
  });
}

/** Marca uma quota como isenta */
export async function isentarQuota(quotaId: string, motivo: string, registadoPor: string, actorNome?: string, actorRole?: string): Promise<void> {
  const quotaSnap = await getDoc(doc(db, 'quotas', quotaId));
  const quota = quotaSnap.data();

  await updateDoc(doc(db, 'quotas', quotaId), {
    status:      'isento',
    observacoes: motivo,
    registadoPor,
    updatedAt:   serverTimestamp(),
  });

  void logAudit({
    actorId:      registadoPor,
    actorNome:    actorNome ?? 'Sistema',
    actorRole:    actorRole ?? 'sistema',
    accao:        'quota_isenta',
    categoria:    'financeiro',
    descricao:    `Quota de ${quota?.moradorNome ?? '?'} (Unidade ${quota?.unidadeNumero ?? '?'}) marcada como isenta. Motivo: ${motivo}`,
    condominioId: quota?.condominioId,
    entidadeId:   quotaId,
    entidadeTipo: 'quota',
    meta:         { mes: quota?.mes, ano: quota?.ano, valor: quota?.valor, motivo },
  });
}

// ─────────────────────────────────────────────
// PAGAMENTO PARCIAL
// ─────────────────────────────────────────────

export interface PagamentoParcialInput {
  quotaId: string;
  valorPago: number;
  dataPagamento: Date;
  observacoes?: string;
  registadoPor: string;
  actorNome?: string;
  actorRole?: string;
}

/**
 * Regista um pagamento parcial.
 * Acumula o valor pago e calcula o saldo restante.
 * Se o total pago cobrir o valor da quota, muda para "pago".
 */
export async function registarPagamentoParcial(input: PagamentoParcialInput): Promise<void> {
  const { quotaId, valorPago, dataPagamento, observacoes, registadoPor, actorNome, actorRole } = input;

  const quotaSnap = await getDoc(doc(db, 'quotas', quotaId));
  if (!quotaSnap.exists()) throw new Error('Quota não encontrada.');
  const quota = quotaSnap.data();

  const valorTotal    = quota.valor ?? 0;
  const jaFoiPago     = quota.valorPago ?? 0;
  const novoTotalPago = jaFoiPago + valorPago;
  const saldo         = valorTotal - novoTotalPago;

  if (valorPago <= 0) throw new Error('O valor pago deve ser maior que zero.');
  if (valorPago > saldo + 0.01) throw new Error(`Valor excede o saldo em dívida (${saldo.toLocaleString('pt-AO')} Kz).`);

  const novoStatus: StatusQuota = saldo <= 0.01 ? 'pago' : quota.status;

  await updateDoc(doc(db, 'quotas', quotaId), {
    valorPago:     novoTotalPago,
    saldoDevedor:  Math.max(0, saldo),
    status:        novoStatus,
    dataPagamento: novoStatus === 'pago' ? Timestamp.fromDate(dataPagamento) : (quota.dataPagamento ?? null),
    observacoes:   observacoes ?? quota.observacoes ?? null,
    registadoPor,
    updatedAt:     serverTimestamp(),
  });

  // Histórico de pagamentos parciais
  await addDoc(collection(db, 'pagamentos_parciais'), {
    quotaId,
    condominioId:  quota.condominioId,
    moradorId:     quota.moradorId ?? null,
    moradorNome:   quota.moradorNome ?? '',
    unidadeNumero: quota.unidadeNumero ?? '',
    mes:           quota.mes,
    ano:           quota.ano,
    valorPago,
    saldoAntes:    saldo + valorPago,
    saldoDepois:   Math.max(0, saldo),
    dataPagamento: Timestamp.fromDate(dataPagamento),
    observacoes:   observacoes ?? null,
    registadoPor,
    createdAt:     serverTimestamp(),
  });

  void logAudit({
    actorId:      registadoPor,
    actorNome:    actorNome ?? 'Sistema',
    actorRole:    actorRole ?? 'sistema',
    accao:        'pagamento_parcial',
    categoria:    'financeiro',
    descricao:    `Pagamento parcial de ${valorPago.toLocaleString('pt-AO')} Kz — ${quota.moradorNome ?? '?'} (Unidade ${quota.unidadeNumero ?? '?'})`,
    condominioId: quota.condominioId,
    entidadeId:   quotaId,
    entidadeTipo: 'quota',
    meta:         { mes: quota.mes, ano: quota.ano, valorPago, saldoDevedor: Math.max(0, saldo) },
  });
}
