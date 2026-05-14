/**
 * notificacaoService.ts
 * Serviço central de notificações — orquestra WhatsApp, SMS e Email.
 *
 * Estratégia de fallback:
 *   1. Tenta WhatsApp (se Twilio configurado e morador tem telefone)
 *   2. Fallback para SMS (se WhatsApp falhar)
 *   3. Fallback para Email (se SMS falhar ou sem telefone)
 *
 * Regista cada tentativa na coleção `notificacoes` do Firestore.
 */

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { enviarWhatsApp, enviarSMS, twilioConfigurado } from './twilioClient';
import { whatsappTemplates, smsTemplates, nomeMes } from './templates';
import type {
  CanalNotificacao,
  TipoNotificacao,
} from '@/types/firestore';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface EnviarNotificacaoInput {
  condominioId: string;
  condominioNome: string;
  destinatarioId?: string;
  destinatarioNome: string;
  destinatarioTelefone?: string;
  destinatarioEmail?: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagemWhatsApp: string;
  mensagemSMS: string;
  meta?: Record<string, unknown>;
}

export interface ResultadoNotificacao {
  canal: CanalNotificacao | 'nenhum';
  sucesso: boolean;
  notificacaoId?: string;
  erro?: string;
}

// ─────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Envia uma notificação com fallback automático:
 * WhatsApp → SMS → (sem canal disponível)
 * Regista o resultado no Firestore.
 */
export async function enviarNotificacao(
  input: EnviarNotificacaoInput,
): Promise<ResultadoNotificacao> {
  const {
    condominioId, condominioNome,
    destinatarioId, destinatarioNome,
    destinatarioTelefone, destinatarioEmail,
    tipo, titulo, mensagemWhatsApp, mensagemSMS, meta,
  } = input;

  // Criar registo pendente no Firestore
  const notifRef = await addDoc(collection(db, 'notificacoes'), {
    condominioId,
    destinatarioId:      destinatarioId ?? null,
    destinatarioNome,
    destinatarioTelefone: destinatarioTelefone ?? null,
    destinatarioEmail:   destinatarioEmail ?? null,
    canal:               'pendente',
    tipo,
    titulo,
    mensagem:            mensagemWhatsApp,
    status:              'pendente',
    meta:                meta ?? null,
    createdAt:           serverTimestamp(),
  });

  const notificacaoId = notifRef.id;

  // ── Tentativa 1: WhatsApp ──────────────────
  if (twilioConfigurado() && destinatarioTelefone) {
    const resultado = await enviarWhatsApp(destinatarioTelefone, mensagemWhatsApp);

    if (resultado.sucesso) {
      await updateDoc(doc(db, 'notificacoes', notificacaoId), {
        canal:      'whatsapp',
        status:     'enviada',
        externalId: resultado.sid ?? null,
        enviadoEm:  serverTimestamp(),
      });
      return { canal: 'whatsapp', sucesso: true, notificacaoId };
    }

    // WhatsApp falhou — tentar SMS
    const resultadoSMS = await enviarSMS(destinatarioTelefone, mensagemSMS);

    if (resultadoSMS.sucesso) {
      await updateDoc(doc(db, 'notificacoes', notificacaoId), {
        canal:      'sms',
        status:     'enviada',
        externalId: resultadoSMS.sid ?? null,
        enviadoEm:  serverTimestamp(),
        meta:       { ...meta, whatsappErro: resultado.erro },
      });
      return { canal: 'sms', sucesso: true, notificacaoId };
    }

    // Ambos falharam
    await updateDoc(doc(db, 'notificacoes', notificacaoId), {
      canal:  'sms',
      status: 'falhou',
      erro:   `WhatsApp: ${resultado.erro} | SMS: ${resultadoSMS.erro}`,
    });
    return {
      canal: 'sms',
      sucesso: false,
      notificacaoId,
      erro: `WhatsApp: ${resultado.erro} | SMS: ${resultadoSMS.erro}`,
    };
  }

  // ── Tentativa 2: Só SMS (sem WhatsApp configurado) ──
  if (twilioConfigurado() && destinatarioTelefone) {
    const resultado = await enviarSMS(destinatarioTelefone, mensagemSMS);

    await updateDoc(doc(db, 'notificacoes', notificacaoId), {
      canal:      'sms',
      status:     resultado.sucesso ? 'enviada' : 'falhou',
      externalId: resultado.sid ?? null,
      erro:       resultado.erro ?? null,
      enviadoEm:  resultado.sucesso ? serverTimestamp() : null,
    });

    return {
      canal: 'sms',
      sucesso: resultado.sucesso,
      notificacaoId,
      erro: resultado.erro,
    };
  }

  // ── Sem canal disponível ──────────────────
  await updateDoc(doc(db, 'notificacoes', notificacaoId), {
    canal:  'nenhum',
    status: 'falhou',
    erro:   'Twilio não configurado e sem telefone do destinatário.',
  });

  return {
    canal: 'nenhum',
    sucesso: false,
    notificacaoId,
    erro: 'Sem canal de notificação disponível.',
  };
}

// ─────────────────────────────────────────────
// NOTIFICAÇÕES ESPECÍFICAS
// ─────────────────────────────────────────────

/** Envia lembrete de quota a vencer. */
export async function notificarLembreteQuota(params: {
  condominioId: string;
  condominioNome: string;
  moradorId?: string;
  moradorNome: string;
  moradorTelefone?: string;
  moradorEmail?: string;
  unidadeNumero: string;
  valor: number;
  dataVencimento: string;
  diasRestantes: number;
}): Promise<ResultadoNotificacao> {
  const templateData = {
    moradorNome:     params.moradorNome,
    condominioNome:  params.condominioNome,
    unidadeNumero:   params.unidadeNumero,
    valor:           params.valor,
    dataVencimento:  params.dataVencimento,
    diasRestantes:   params.diasRestantes,
  };

  return enviarNotificacao({
    condominioId:         params.condominioId,
    condominioNome:       params.condominioNome,
    destinatarioId:       params.moradorId,
    destinatarioNome:     params.moradorNome,
    destinatarioTelefone: params.moradorTelefone,
    destinatarioEmail:    params.moradorEmail,
    tipo:                 'lembrete_quota',
    titulo:               `Lembrete: Quota vence em ${params.diasRestantes} dia(s)`,
    mensagemWhatsApp:     whatsappTemplates.lembreteQuota(templateData),
    mensagemSMS:          smsTemplates.lembreteQuota(templateData),
    meta: {
      unidadeNumero:  params.unidadeNumero,
      valor:          params.valor,
      dataVencimento: params.dataVencimento,
      diasRestantes:  params.diasRestantes,
    },
  });
}

/** Envia alerta de quota em atraso. */
export async function notificarQuotaAtrasada(params: {
  condominioId: string;
  condominioNome: string;
  moradorId?: string;
  moradorNome: string;
  moradorTelefone?: string;
  moradorEmail?: string;
  unidadeNumero: string;
  valor: number;
  dataVencimento: string;
  mesesAtraso: number;
}): Promise<ResultadoNotificacao> {
  const templateData = {
    moradorNome:    params.moradorNome,
    condominioNome: params.condominioNome,
    unidadeNumero:  params.unidadeNumero,
    valor:          params.valor,
    dataVencimento: params.dataVencimento,
    mesesAtraso:    params.mesesAtraso,
  };

  return enviarNotificacao({
    condominioId:         params.condominioId,
    condominioNome:       params.condominioNome,
    destinatarioId:       params.moradorId,
    destinatarioNome:     params.moradorNome,
    destinatarioTelefone: params.moradorTelefone,
    destinatarioEmail:    params.moradorEmail,
    tipo:                 'quota_atrasada',
    titulo:               `Quota em atraso — ${params.mesesAtraso} mês(es)`,
    mensagemWhatsApp:     whatsappTemplates.quotaAtrasada(templateData),
    mensagemSMS:          smsTemplates.quotaAtrasada(templateData),
    meta: {
      unidadeNumero:  params.unidadeNumero,
      valor:          params.valor,
      dataVencimento: params.dataVencimento,
      mesesAtraso:    params.mesesAtraso,
    },
  });
}

/** Envia aviso geral ou urgente a todos os moradores de um condomínio. */
export async function notificarAvisoMoradores(params: {
  condominioId: string;
  condominioNome: string;
  titulo: string;
  conteudo: string;
  urgente?: boolean;
}): Promise<{ enviados: number; falhados: number }> {
  // Buscar todos os moradores activos com telefone
  const snap = await getDocs(
    query(
      collection(db, 'moradores'),
      where('condominioId', '==', params.condominioId),
      where('status', '==', 'ativo'),
    ),
  );

  let enviados = 0;
  let falhados = 0;

  const templateData = {
    moradorNome:    '',
    condominioNome: params.condominioNome,
    titulo:         params.titulo,
    conteudo:       params.conteudo,
  };

  for (const moradorDoc of snap.docs) {
    const morador = moradorDoc.data();
    if (!morador.telefone) continue;

    templateData.moradorNome = morador.nome ?? 'Morador';

    const fn = params.urgente
      ? whatsappTemplates.avisoUrgente
      : whatsappTemplates.avisoGeral;

    const resultado = await enviarNotificacao({
      condominioId:         params.condominioId,
      condominioNome:       params.condominioNome,
      destinatarioId:       moradorDoc.id,
      destinatarioNome:     morador.nome ?? 'Morador',
      destinatarioTelefone: morador.telefone,
      destinatarioEmail:    morador.email,
      tipo:                 params.urgente ? 'aviso_urgente' : 'aviso_geral',
      titulo:               params.titulo,
      mensagemWhatsApp:     fn({ ...templateData, moradorNome: morador.nome ?? 'Morador' }),
      mensagemSMS:          smsTemplates.avisoGeral({ ...templateData, moradorNome: morador.nome ?? 'Morador' }),
      meta: { titulo: params.titulo, urgente: params.urgente ?? false },
    });

    if (resultado.sucesso) enviados++;
    else falhados++;
  }

  return { enviados, falhados };
}

/** Envia confirmação de pagamento ao morador. */
export async function notificarPagamentoConfirmado(params: {
  condominioId: string;
  condominioNome: string;
  moradorId?: string;
  moradorNome: string;
  moradorTelefone?: string;
  moradorEmail?: string;
  unidadeNumero: string;
  valor: number;
  mes: number;
  ano: number;
}): Promise<ResultadoNotificacao> {
  const templateData = {
    moradorNome:    params.moradorNome,
    condominioNome: params.condominioNome,
    unidadeNumero:  params.unidadeNumero,
    valor:          params.valor,
    mes:            params.mes,
    ano:            params.ano,
  };

  return enviarNotificacao({
    condominioId:         params.condominioId,
    condominioNome:       params.condominioNome,
    destinatarioId:       params.moradorId,
    destinatarioNome:     params.moradorNome,
    destinatarioTelefone: params.moradorTelefone,
    destinatarioEmail:    params.moradorEmail,
    tipo:                 'pagamento_confirmado',
    titulo:               `Pagamento confirmado — ${nomeMes(params.mes)}/${params.ano}`,
    mensagemWhatsApp:     whatsappTemplates.pagamentoConfirmado(templateData),
    mensagemSMS:          smsTemplates.pagamentoConfirmado(templateData),
    meta: {
      unidadeNumero: params.unidadeNumero,
      valor:         params.valor,
      mes:           params.mes,
      ano:           params.ano,
    },
  });
}

/** Envia convocatória de assembleia a todos os moradores. */
export async function notificarAssembleia(params: {
  condominioId: string;
  condominioNome: string;
  titulo: string;
  data: string;
  local?: string;
}): Promise<{ enviados: number; falhados: number }> {
  const snap = await getDocs(
    query(
      collection(db, 'moradores'),
      where('condominioId', '==', params.condominioId),
      where('status', '==', 'ativo'),
    ),
  );

  let enviados = 0;
  let falhados = 0;

  for (const moradorDoc of snap.docs) {
    const morador = moradorDoc.data();
    if (!morador.telefone) continue;

    const templateData = {
      moradorNome:    morador.nome ?? 'Morador',
      condominioNome: params.condominioNome,
      titulo:         params.titulo,
      data:           params.data,
      local:          params.local,
    };

    const resultado = await enviarNotificacao({
      condominioId:         params.condominioId,
      condominioNome:       params.condominioNome,
      destinatarioId:       moradorDoc.id,
      destinatarioNome:     morador.nome ?? 'Morador',
      destinatarioTelefone: morador.telefone,
      destinatarioEmail:    morador.email,
      tipo:                 'assembleia_convocatoria',
      titulo:               `Convocatória: ${params.titulo}`,
      mensagemWhatsApp:     whatsappTemplates.assembleiaConvocatoria(templateData),
      mensagemSMS:          smsTemplates.assembleiaConvocatoria(templateData),
      meta: { titulo: params.titulo, data: params.data, local: params.local },
    });

    if (resultado.sucesso) enviados++;
    else falhados++;
  }

  return { enviados, falhados };
}

// ─────────────────────────────────────────────
// HISTÓRICO
// ─────────────────────────────────────────────

export interface NotificacaoHistorico {
  id: string;
  condominioId: string;
  destinatarioNome: string;
  canal: string;
  tipo: string;
  titulo: string;
  status: string;
  erro?: string;
  createdAt: Timestamp;
  enviadoEm?: Timestamp;
}

export async function getHistoricoNotificacoes(
  condominioId: string,
  limite = 50,
): Promise<NotificacaoHistorico[]> {
  const snap = await getDocs(
    query(
      collection(db, 'notificacoes'),
      where('condominioId', '==', condominioId),
    ),
  );

  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as NotificacaoHistorico))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    })
    .slice(0, limite);
}
