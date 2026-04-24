import { NextResponse } from 'next/server';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const BASE_URL   = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ─── Helpers REST Firestore ───────────────────────────────────────────────────

/** Converte um valor JS para o formato de campo Firestore REST */
function toField(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string')  return { stringValue: value };
  if (typeof value === 'number')  return { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (value instanceof Date)      return { timestampValue: value.toISOString() };
  return { stringValue: String(value) };
}

/** Constrói o body de um PATCH (updateDoc) para a REST API */
function buildFields(obj: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toField(v);
  }
  return { fields };
}

/** PATCH — actualiza campos de um documento existente */
async function patchDoc(
  path: string,
  data: Record<string, unknown>,
  apiKey: string,
) {
  const updateMask = Object.keys(data).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const url = `${BASE_URL}/${path}?${updateMask}&key=${apiKey}`;
  const res = await fetch(url, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(buildFields(data)),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Firestore PATCH falhou: ${res.status}`);
  }
  return res.json();
}

/** POST — cria um novo documento numa colecção */
async function createDoc(
  collection: string,
  data: Record<string, unknown>,
  apiKey: string,
) {
  const url = `${BASE_URL}/${collection}?key=${apiKey}`;
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(buildFields(data)),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Firestore POST falhou: ${res.status}`);
  }
  return res.json();
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { quotaId, moradorId, valor, metodo, referencia } = await request.json();

    if (!quotaId || !moradorId || !valor || !metodo) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Firebase API Key não configurada.' }, { status: 500 });
    }

    // Simular latência bancária (1.5–3s)
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));

    // 5% de falha aleatória para realismo
    if (Math.random() < 0.05) {
      return NextResponse.json(
        { error: 'Pagamento recusado pelo banco. Verifique os dados e tente novamente.' },
        { status: 402 },
      );
    }

    const refTransacao = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const agora = new Date();
    const metodoLabel: Record<string, string> = {
      cartao:        'Cartão Bancário',
      transferencia: 'Transferência Bancária',
      multicaixa:    'Multicaixa Express',
    };

    // 1. Actualizar quota → status 'pago'
    await patchDoc(`quotas/${quotaId}`, {
      status:          'pago',
      dataPagamento:   agora,
      observacoes:     `Pago via ${metodoLabel[metodo] ?? metodo} · Ref: ${refTransacao}`,
      registadoPor:    moradorId,
      comprovativoUrl: null,
      updatedAt:       agora,
    }, apiKey);

    // 2. Registar transacção
    await createDoc('transacoes', {
      quotaId,
      moradorId,
      valor,
      metodo,
      referencia:   referencia ?? null,
      refTransacao,
      status:       'aprovado',
      processadoEm: agora,
      createdAt:    agora,
    }, apiKey);

    return NextResponse.json({ success: true, refTransacao, processadoEm: agora.toISOString() });

  } catch (err: any) {
    console.error('[simular-pagamento]', err.message);
    return NextResponse.json({ error: 'Erro interno ao processar pagamento.' }, { status: 500 });
  }
}
