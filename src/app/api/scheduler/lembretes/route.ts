/**
 * POST /api/scheduler/lembretes
 *
 * Envia lembretes inteligentes de quotas via WhatsApp/SMS:
 *   - 3 dias antes do vencimento (lembrete preventivo)
 *   - No dia do vencimento (lembrete final)
 *   - 7 dias após o vencimento (alerta de atraso)
 *   - Mensalmente para quotas com mais de 1 mês de atraso
 *
 * Deve ser chamado diariamente por um cron job.
 * Autenticação: Bearer token via SCHEDULER_SECRET no .env
 */

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import {
  notificarLembreteQuota,
  notificarQuotaAtrasada,
} from '@/lib/notificacoes/notificacaoService';

// ─────────────────────────────────────────────
// AUTENTICAÇÃO
// ─────────────────────────────────────────────

function autenticarScheduler(request: Request): boolean {
  const secret = process.env.SCHEDULER_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  return authHeader.replace('Bearer ', '').trim() === secret;
}

// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────

function formatarData(date: Date): string {
  return date.toLocaleDateString('pt-PT', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
}

function diasEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────

export async function POST(request: Request) {
  if (!autenticarScheduler(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const agora   = new Date();
  agora.setHours(0, 0, 0, 0);

  const stats = {
    lembretes3Dias:    0,
    lembretesVencendo: 0,
    alertas7Dias:      0,
    alertasMensais:    0,
    erros:             0,
  };

  try {
    // ── Buscar condomínios activos ──────────────
    const condosSnap = await adminDb
      .collection('condominios')
      .where('status', '==', 'active')
      .get();

    for (const condoDoc of condosSnap.docs) {
      const condoId   = condoDoc.id;
      const condoData = condoDoc.data();
      const condoNome = condoData.nome ?? condoId;

      // ── Buscar quotas pendentes e atrasadas ──
      const quotasSnap = await adminDb
        .collection('quotas')
        .where('condominioId', '==', condoId)
        .where('status', 'in', ['pendente', 'atrasado'])
        .get();

      for (const quotaDoc of quotasSnap.docs) {
        const quota    = quotaDoc.data();
        const quotaId  = quotaDoc.id;
        const vencimento = quota.dataVencimento?.toDate?.() ?? null;

        if (!vencimento) continue;

        // Buscar dados do morador para obter telefone
        let moradorTelefone: string | undefined;
        let moradorEmail: string | undefined;

        if (quota.moradorId) {
          const moradorSnap = await adminDb
            .collection('moradores')
            .where('uid', '==', quota.moradorId)
            .limit(1)
            .get();

          if (!moradorSnap.empty) {
            const m = moradorSnap.docs[0].data();
            moradorTelefone = m.telefone ?? undefined;
            moradorEmail    = m.email    ?? undefined;
          }
        }

        // Sem telefone nem email — saltar
        if (!moradorTelefone && !moradorEmail) continue;

        const diasParaVencer = diasEntre(agora, vencimento);
        const diasAtrasado   = diasEntre(vencimento, agora);

        try {
          // ── LEMBRETE 3 DIAS ANTES ──────────────
          if (
            diasParaVencer === 3 &&
            quota.status === 'pendente' &&
            !quota.lembrete3DiasEnviado
          ) {
            await notificarLembreteQuota({
              condominioId:     condoId,
              condominioNome:   condoNome,
              moradorId:        quota.moradorId,
              moradorNome:      quota.moradorNome ?? 'Morador',
              moradorTelefone,
              moradorEmail,
              unidadeNumero:    quota.unidadeNumero ?? '—',
              valor:            quota.valor,
              dataVencimento:   formatarData(vencimento),
              diasRestantes:    3,
            });

            await adminDb.collection('quotas').doc(quotaId).update({
              lembrete3DiasEnviado: true,
            });

            stats.lembretes3Dias++;
          }

          // ── LEMBRETE NO DIA DO VENCIMENTO ──────
          if (
            diasParaVencer === 0 &&
            quota.status === 'pendente' &&
            !quota.lembreteEnviado
          ) {
            await notificarLembreteQuota({
              condominioId:     condoId,
              condominioNome:   condoNome,
              moradorId:        quota.moradorId,
              moradorNome:      quota.moradorNome ?? 'Morador',
              moradorTelefone,
              moradorEmail,
              unidadeNumero:    quota.unidadeNumero ?? '—',
              valor:            quota.valor,
              dataVencimento:   formatarData(vencimento),
              diasRestantes:    0,
            });

            await adminDb.collection('quotas').doc(quotaId).update({
              lembreteEnviado: true,
            });

            stats.lembretesVencendo++;
          }

          // ── ALERTA 7 DIAS APÓS VENCIMENTO ──────
          if (
            diasAtrasado === 7 &&
            quota.status === 'atrasado' &&
            !quota.lembrete7DiasAtrasadoEnviado
          ) {
            await notificarQuotaAtrasada({
              condominioId:     condoId,
              condominioNome:   condoNome,
              moradorId:        quota.moradorId,
              moradorNome:      quota.moradorNome ?? 'Morador',
              moradorTelefone,
              moradorEmail,
              unidadeNumero:    quota.unidadeNumero ?? '—',
              valor:            quota.valor,
              dataVencimento:   formatarData(vencimento),
              mesesAtraso:      quota.mesesAtraso ?? 1,
            });

            await adminDb.collection('quotas').doc(quotaId).update({
              lembrete7DiasAtrasadoEnviado: true,
            });

            stats.alertas7Dias++;
          }

          // ── ALERTA MENSAL (quotas com 30+ dias de atraso) ──
          if (
            quota.status === 'atrasado' &&
            diasAtrasado >= 30 &&
            diasAtrasado % 30 < 2 // janela de 2 dias para não disparar múltiplas vezes
          ) {
            await notificarQuotaAtrasada({
              condominioId:     condoId,
              condominioNome:   condoNome,
              moradorId:        quota.moradorId,
              moradorNome:      quota.moradorNome ?? 'Morador',
              moradorTelefone,
              moradorEmail,
              unidadeNumero:    quota.unidadeNumero ?? '—',
              valor:            quota.valor,
              dataVencimento:   formatarData(vencimento),
              mesesAtraso:      quota.mesesAtraso ?? Math.floor(diasAtrasado / 30),
            });

            stats.alertasMensais++;
          }

        } catch (err: any) {
          console.error(`[lembretes] Erro na quota ${quotaId}:`, err.message);
          stats.erros++;
        }
      }
    }

    // Registar log do scheduler
    await adminDb.collection('scheduler_logs').add({
      job:         'lembretes',
      status:      stats.erros > 0 ? 'parcial' : 'sucesso',
      detalhes:    `Lembretes: ${stats.lembretes3Dias + stats.lembretesVencendo} | Alertas: ${stats.alertas7Dias + stats.alertasMensais} | Erros: ${stats.erros}`,
      meta:        stats,
      executadoEm: new Date(),
    });

    return NextResponse.json({
      sucesso: true,
      executadoEm: agora.toISOString(),
      ...stats,
    });

  } catch (err: any) {
    console.error('[scheduler/lembretes]', err);

    await adminDb.collection('scheduler_logs').add({
      job:         'lembretes',
      status:      'erro',
      detalhes:    err.message ?? 'Erro crítico',
      executadoEm: new Date(),
    }).catch(() => {});

    return NextResponse.json(
      { error: err.message ?? 'Erro interno.' },
      { status: 500 },
    );
  }
}
