/**
 * POST /api/scheduler/gerar-quotas
 *
 * Gera automaticamente as quotas mensais para todos os condomínios activos.
 * Deve ser chamado por um cron job externo (Vercel Cron, GitHub Actions, etc.)
 * no 1º dia de cada mês.
 *
 * Autenticação: Bearer token via SCHEDULER_SECRET no .env
 *
 * Exemplo de chamada (cron):
 *   curl -X POST https://seu-dominio.com/api/scheduler/gerar-quotas \
 *     -H "Authorization: Bearer SEU_SCHEDULER_SECRET"
 */

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { gerarQuotasMensais, quotasJaGeradas } from '@/lib/firebase/quotas';
import { logAudit } from '@/lib/firebase/auditLog';

// ─────────────────────────────────────────────
// AUTENTICAÇÃO DO SCHEDULER
// ─────────────────────────────────────────────

function autenticarScheduler(request: Request): boolean {
  const secret = process.env.SCHEDULER_SECRET;
  if (!secret) return false; // sem secret configurado = bloqueado

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '').trim();
  return token === secret;
}

// ─────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────

export async function POST(request: Request) {
  // Verificar autenticação
  if (!autenticarScheduler(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const agora = new Date();
  const mes   = agora.getMonth() + 1; // mês actual (1-12)
  const ano   = agora.getFullYear();

  const resultados: {
    condominioId: string;
    nome: string;
    status: 'gerado' | 'ja_existia' | 'erro';
    total?: number;
    erro?: string;
  }[] = [];

  try {
    // Buscar todos os condomínios activos via Admin SDK
    const condosSnap = await adminDb
      .collection('condominios')
      .where('status', '==', 'active')
      .get();

    if (condosSnap.empty) {
      return NextResponse.json({
        sucesso: true,
        mensagem: 'Nenhum condomínio activo encontrado.',
        resultados: [],
      });
    }

    for (const condoDoc of condosSnap.docs) {
      const condoId   = condoDoc.id;
      const condoData = condoDoc.data();
      const nome      = condoData.nome ?? condoId;

      try {
        // Verificar se já foram geradas (evitar duplicados)
        const jaExistem = await quotasJaGeradas(condoId, mes, ano);

        if (jaExistem) {
          resultados.push({ condominioId: condoId, nome, status: 'ja_existia' });
          continue;
        }

        const diaVencimento = condoData.diaVencimento ?? 5;

        const total = await gerarQuotasMensais({
          condominioId:    condoId,
          mes,
          ano,
          diaVencimento,
          criadoPor:       'sistema',
          criadoPorNome:   'Scheduler Automático',
          criadoPorRole:   'sistema',
        });

        resultados.push({ condominioId: condoId, nome, status: 'gerado', total });

      } catch (err: any) {
        resultados.push({
          condominioId: condoId,
          nome,
          status: 'erro',
          erro: err.message ?? 'Erro desconhecido',
        });
      }
    }

    // Registar no log do scheduler
    await adminDb.collection('scheduler_logs').add({
      job:         'gerar-quotas',
      status:      resultados.some(r => r.status === 'erro') ? 'parcial' : 'sucesso',
      detalhes:    `${resultados.filter(r => r.status === 'gerado').length} condomínios processados`,
      meta:        { mes, ano, resultados },
      executadoEm: new Date(),
    });

    // Audit log
    void logAudit({
      actorId:   'sistema',
      actorNome: 'Scheduler Automático',
      actorRole: 'sistema',
      accao:     'quotas_geradas_automatico',
      categoria: 'financeiro',
      descricao: `Geração automática de quotas ${mes}/${ano}: ${resultados.filter(r => r.status === 'gerado').length} condomínios`,
      meta:      { mes, ano, total: resultados.length },
    });

    return NextResponse.json({
      sucesso:    true,
      mes,
      ano,
      processados: resultados.length,
      gerados:     resultados.filter(r => r.status === 'gerado').length,
      jaExistiam:  resultados.filter(r => r.status === 'ja_existia').length,
      erros:       resultados.filter(r => r.status === 'erro').length,
      resultados,
    });

  } catch (err: any) {
    console.error('[scheduler/gerar-quotas]', err);

    await adminDb.collection('scheduler_logs').add({
      job:         'gerar-quotas',
      status:      'erro',
      detalhes:    err.message ?? 'Erro crítico',
      executadoEm: new Date(),
    }).catch(() => {});

    return NextResponse.json(
      { error: err.message ?? 'Erro interno do servidor.' },
      { status: 500 },
    );
  }
}

// GET para verificar estado (útil para monitorização)
export async function GET(request: Request) {
  if (!autenticarScheduler(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const agora = new Date();
  const mes   = agora.getMonth() + 1;
  const ano   = agora.getFullYear();

  try {
    const logsSnap = await adminDb
      .collection('scheduler_logs')
      .where('job', '==', 'gerar-quotas')
      .orderBy('executadoEm', 'desc')
      .limit(5)
      .get();

    const logs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return NextResponse.json({
      status:    'online',
      mesActual: `${mes}/${ano}`,
      ultimosLogs: logs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
