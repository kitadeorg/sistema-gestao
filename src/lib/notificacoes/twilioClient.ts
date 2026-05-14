/**
 * twilioClient.ts
 * Cliente Twilio para envio de WhatsApp e SMS.
 *
 * Configuração necessária no .env:
 *   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   (sandbox ou número aprovado)
 *   TWILIO_SMS_FROM=+14155238886                 (número SMS Twilio)
 */

export interface TwilioEnvioResult {
  sucesso: boolean;
  sid?: string;
  erro?: string;
}

function getTwilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio não configurado. Adiciona TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN ao .env');
  }

  return { accountSid, authToken };
}

/**
 * Envia uma mensagem WhatsApp via Twilio.
 * O número de destino deve estar no formato internacional: +244912345678
 */
export async function enviarWhatsApp(
  para: string,
  mensagem: string,
): Promise<TwilioEnvioResult> {
  try {
    const { accountSid, authToken } = getTwilioCredentials();
    const from = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';

    // Normalizar número de destino
    const paraFormatado = para.startsWith('whatsapp:') ? para : `whatsapp:${para}`;

    const body = new URLSearchParams({
      From: from,
      To:   paraFormatado,
      Body: mensagem,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        body: body.toString(),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return { sucesso: false, erro: data.message ?? `HTTP ${response.status}` };
    }

    return { sucesso: true, sid: data.sid };
  } catch (err: any) {
    return { sucesso: false, erro: err.message ?? 'Erro desconhecido' };
  }
}

/**
 * Envia um SMS via Twilio.
 * O número de destino deve estar no formato internacional: +244912345678
 */
export async function enviarSMS(
  para: string,
  mensagem: string,
): Promise<TwilioEnvioResult> {
  try {
    const { accountSid, authToken } = getTwilioCredentials();
    const from = process.env.TWILIO_SMS_FROM;

    if (!from) {
      return { sucesso: false, erro: 'TWILIO_SMS_FROM não configurado no .env' };
    }

    const body = new URLSearchParams({
      From: from,
      To:   para,
      Body: mensagem,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        body: body.toString(),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return { sucesso: false, erro: data.message ?? `HTTP ${response.status}` };
    }

    return { sucesso: true, sid: data.sid };
  } catch (err: any) {
    return { sucesso: false, erro: err.message ?? 'Erro desconhecido' };
  }
}

/** Verifica se o Twilio está configurado no ambiente. */
export function twilioConfigurado(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  );
}
