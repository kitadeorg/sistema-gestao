/**
 * POST /api/scheduler/atualizar-atrasos
 *
 * Actualiza diariamente o status das quotas pendentes para "atrasado"
 * quando a data de vencimento já passou, aplicando multa e juros.
 *
 * Cron: todos os dias às 07:00 UTC
 * Autenticação: Bearer token via SCHEDULER_SECRET no .env
 */

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { actualizarQuotasAtrasadas } from '@/lib/firebase/quotas';

function autenticarScheduler(request: Request): boolean {
  const secret = process.env.SCHEDULER_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  return authHeader.replace('Bearer ', '').trim() === secret;
}

export async function POST(request: Request) {
  if (!autenticarScheduler(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const resultados: {
    condominioId: string;
    nome: string;
    actualizadas: number;
    erro?: string;
  }[] = [];

  try {
    const condosSnap = await adminDb
      .collection('condominios')
      .where('status', '==', 'active')
      .get();

    for (const condoDoc of condosSnap.docs) {
      const condoId = condoDoc.id;
      const nome    = condoDoc.data().nome ?? condoId;

      try {
        const actualizadas = await actualizarQuotasAtrasadas(condoId);
        resultados.push({ condominioId: condoId, nome, actualizadas });
      } catch (err: any) {
        resultados.push({ condominioId: condoId, nome, actualizadas: 0, erro: err.message });
      }
    }

    const totalActualizadas = resultados.reduce((s, r) => s + r.actualizadas, 0);

    await adminDb.collection('scheduler_logs').add({
      job:         'atualizar-atrasos',
      status:      resultados.some(r => r.erro) ? 'parcial' : 'sucesso',
      detalhes:    `${totalActualizadas} quotas actualizadas para "atrasado"`,
      meta:        { resultados },
      executadoEm: new Date(),
    });

    return NextResponse.json({
      sucesso:          true,
      totalActualizadas,
      condominios:      resultados.length,
      resultados,
    });

  } catch (err: any) {
    console.error('[scheduler/atualizar-atrasos]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
