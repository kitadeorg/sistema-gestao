// src/app/api/webhook/email-bounce/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

/**
 * Status de entrega de e-mail que podem ser gravados no Firestore.
 * Estende o UserData['status'] existente sem o quebrar.
 */
export type EmailDeliveryStatus =
  | 'email_entregue'      // Confirmação positiva de entrega
  | 'email_bounce'        // Hard bounce: conta/domínio inexistente
  | 'email_spam'          // Marcado como spam pelo destinatário
  | 'email_erro';         // Falha genérica de entrega

// Payload normalizado — independente do provedor
interface NormalizedBounceEvent {
  email: string;
  deliveryStatus: EmailDeliveryStatus;
  providerEventType: string;
  rawPayload: unknown;
}

// ─────────────────────────────────────────────
// NORMALIZAÇÃO DE PAYLOAD POR PROVEDOR
// ─────────────────────────────────────────────

/**
 * Normaliza o payload do Resend para o formato interno.
 * Docs: https://resend.com/docs/dashboard/webhooks/event-types
 */
function normalizeResendPayload(body: Record<string, unknown>): NormalizedBounceEvent | null {
  const type = body.type as string;
  const data = body.data as Record<string, unknown> | undefined;
  const email = data?.email_id
    ? (data.to as string[] | undefined)?.[0]
    : undefined;

  if (!email || !type) return null;

  const statusMap: Record<string, EmailDeliveryStatus> = {
    'email.bounced':           'email_bounce',
    'email.delivery_delayed':  'email_erro',
    'email.complained':        'email_spam',
    'email.delivered':         'email_entregue',
  };

  const deliveryStatus = statusMap[type];
  if (!deliveryStatus) return null;

  return { email, deliveryStatus, providerEventType: type, rawPayload: body };
}

/**
 * Normaliza o payload do SendGrid para o formato interno.
 * Docs: https://docs.sendgrid.com/for-developers/tracking-events/event
 *
 * O SendGrid envia um array de eventos num único POST.
 * Processamos apenas o primeiro evento relevante.
 */
function normalizeSendGridPayload(body: unknown[]): NormalizedBounceEvent | null {
  const eventMap: Record<string, EmailDeliveryStatus> = {
    bounce:     'email_bounce',
    dropped:    'email_bounce',
    deferred:   'email_erro',
    spamreport: 'email_spam',
    delivered:  'email_entregue',
  };

  for (const raw of body) {
    const event = raw as Record<string, unknown>;
    const email = event.email as string | undefined;
    const type  = event.event as string | undefined;

    if (!email || !type) continue;
    const deliveryStatus = eventMap[type];
    if (!deliveryStatus) continue;

    return { email, deliveryStatus, providerEventType: type, rawPayload: raw };
  }

  return null;
}

// ─────────────────────────────────────────────
// ATUALIZAÇÃO NO FIRESTORE
// ─────────────────────────────────────────────

/**
 * Procura o utilizador pelo e-mail nas duas colecções e actualiza o emailStatus.
 * Ordem de pesquisa: `usuarios` → `usuarios_pre_registro`.
 */
async function updateEmailStatus(
  email: string,
  deliveryStatus: EmailDeliveryStatus,
): Promise<{ updated: boolean; collection?: string }> {
  const emailNorm = email.trim().toLowerCase();

  // 1. Tentar em `usuarios`
  const qActive = query(
    collection(db, 'usuarios'),
    where('email', '==', emailNorm),
  );
  const snapActive = await getDocs(qActive);

  if (!snapActive.empty) {
    const docRef = doc(db, 'usuarios', snapActive.docs[0].id);
    await updateDoc(docRef, {
      emailStatus: deliveryStatus,
      emailStatusUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { updated: true, collection: 'usuarios' };
  }

  // 2. Tentar em `usuarios_pre_registro`
  const qPre = query(
    collection(db, 'usuarios_pre_registro'),
    where('email', '==', emailNorm),
  );
  const snapPre = await getDocs(qPre);

  if (!snapPre.empty) {
    const docRef = doc(db, 'usuarios_pre_registro', snapPre.docs[0].id);
    await updateDoc(docRef, {
      emailStatus: deliveryStatus,
      emailStatusUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { updated: true, collection: 'usuarios_pre_registro' };
  }

  return { updated: false };
}

// ─────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    // Detecta o provedor pelo formato do payload:
    // - Resend envia um objecto com campo `type`
    // - SendGrid envia um array de eventos
    let normalized: NormalizedBounceEvent | null = null;

    if (Array.isArray(body)) {
      normalized = normalizeSendGridPayload(body);
    } else if (typeof body === 'object' && body !== null && 'type' in body) {
      normalized = normalizeResendPayload(body as Record<string, unknown>);
    }

    if (!normalized) {
      console.warn('[webhook/email-bounce] Payload não reconhecido:', body);
      // Retorna 200 para não forçar reenvio do provedor
      return NextResponse.json({ received: true, processed: false }, { status: 200 });
    }

    const { email, deliveryStatus, providerEventType } = normalized;

    const result = await updateEmailStatus(email, deliveryStatus);

    if (result.updated) {
      console.log(
        `[webhook/email-bounce] ${email} → ${deliveryStatus} (${providerEventType}) em ${result.collection}`,
      );
    } else {
      console.warn(
        `[webhook/email-bounce] Utilizador não encontrado para o e-mail: ${email}`,
      );
    }

    return NextResponse.json({ received: true, processed: result.updated }, { status: 200 });
  } catch (error) {
    console.error('[webhook/email-bounce] Erro interno:', error);
    // Retorna 500 para que o provedor reenvie o webhook
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}