import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

/**
 * API Route para deletar um usuário do Firebase Authentication
 * Requer Firebase Admin SDK
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Deletar o usuário do Firebase Authentication
    await adminAuth.deleteUser(userId);

    return NextResponse.json({
      success: true,
      message: 'Usuário deletado do Firebase Authentication',
    });
  } catch (error: any) {
    console.error('[delete-auth-user] Erro:', error);

    // Se o usuário não existir no Auth, não é um erro crítico
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({
        success: true,
        message: 'Usuário não encontrado no Authentication (já foi deletado)',
      });
    }

    return NextResponse.json(
      {
        error: 'Erro ao deletar usuário do Authentication',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
