/**
 * POST /api/notificacoes/enviar
 *
 * Envia uma notificação manual via WhatsApp/SMS.
 * Usado pela UI quando o gestor/síndico cria um aviso e quer notificar os moradores.
 *
 * Body:
 *   tipo: 'aviso_geral' | 'aviso_urgente' | 'assembleia_convocatoria' | 'quota_atrasada'
 *   condominioId: string
 *   condominioNome: string
 *   titulo: string
 *   conteudo: string
 *   urgente?: boolean
 *   destinatarios?: 'todos' | string[]  (IDs de moradores; 'todos' = broadcast)
 */

import { NextResponse } from 'next/server';
import {
  notificarAvisoMoradores,
  notificarAssembleia,
  enviarNotificacao,
} from '@/lib/notificacoes/notificacaoService';
import { whatsappTemplates, smsTemplates } from '@/lib/notificacoes/templates';
import { adminDb } from '@/lib/firebase/admin';
import { logAudit } from '@/lib/firebase/auditLog';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tipo,
      condominioId,
      condominioNome,
      titulo,
      conteudo,
      urgente = false,
      destinatarios = 'todos',
      actorId,
      actorNome,
      actorRole,
      // Para assembleias
      dataAssembleia,
      localAssembleia,
    } = body;

    if (!condominioId || !titulo) {
      return NextResponse.json(
        { error: 'condominioId e titulo são obrigatórios.' },
        { status: 400 },
      );
    }

    let resultado: { enviados: number; falhados: number } = { enviados: 0, falhados: 0 };

    // ── Broadcast para todos os moradores ──────────────────────────────────
    if (destinatarios === 'todos') {

      if (tipo === 'assembleia_convocatoria') {
        resultado = await notificarAssembleia({
          condominioId,
          condominioNome,
          titulo,
          data:  dataAssembleia ?? '—',
          local: localAssembleia,
        });
      } else {
        resultado = await notificarAvisoMoradores({
          condominioId,
          condominioNome,
          titulo,
          conteudo: conteudo ?? '',
          urgente,
        });
      }

    // ── Envio para destinatários específicos ───────────────────────────────
    } else if (Array.isArray(destinatarios) && destinatarios.length > 0) {

      for (const moradorId of destinatarios) {
        try {
          const moradorSnap = await adminDb
            .collection('moradores')
            .doc(moradorId)
            .get();

          if (!moradorSnap.exists) continue;

          const morador = moradorSnap.data()!;
          if (!morador.telefone) continue;

          const templateData = {
            moradorNome:    morador.nome ?? 'Morador',
            condominioNome,
            titulo,
            conteudo:       conteudo ?? '',
          };

          const fn = urgente
            ? whatsappTemplates.avisoUrgente
            : whatsappTemplates.avisoGeral;

          const res = await enviarNotificacao({
            condominioId,
            condominioNome,
            destinatarioId:       moradorId,
            destinatarioNome:     morador.nome ?? 'Morador',
            destinatarioTelefone: morador.telefone,
            destinatarioEmail:    morador.email,
            tipo:                 urgente ? 'aviso_urgente' : 'aviso_geral',
            titulo,
            mensagemWhatsApp:     fn(templateData),
            mensagemSMS:          smsTemplates.avisoGeral(templateData),
            meta: { titulo, urgente },
          });

          if (res.sucesso) resultado.enviados++;
          else resultado.falhados++;

        } catch {
          resultado.falhados++;
        }
      }
    }

    // Audit log
    if (actorId) {
      void logAudit({
        actorId,
        actorNome:    actorNome ?? 'Sistema',
        actorRole:    actorRole ?? 'sistema',
        accao:        'notificacao_enviada',
        categoria:    'notificacoes',
        descricao:    `Notificação "${titulo}" enviada: ${resultado.enviados} entregues, ${resultado.falhados} falhados`,
        condominioId,
        meta:         { tipo, titulo, ...resultado },
      });
    }

    return NextResponse.json({
      sucesso:  true,
      enviados: resultado.enviados,
      falhados: resultado.falhados,
    });

  } catch (err: any) {
    console.error('[notificacoes/enviar]', err);
    return NextResponse.json(
      { error: err.message ?? 'Erro interno.' },
      { status: 500 },
    );
  }
}
