import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { token, novaSenha } = await request.json();

    if (!token || !novaSenha) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    if (novaSenha.length < 8) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
    }

    // 1. Verificar token
    const tokenDoc = await adminDb.collection('password_reset_tokens').doc(token).get();

    if (!tokenDoc.exists) {
      return NextResponse.json({ error: 'Link inválido ou já utilizado.' }, { status: 400 });
    }

    const tokenData = tokenDoc.data()!;

    if (tokenData.usado) {
      return NextResponse.json({ error: 'Este link já foi utilizado.' }, { status: 400 });
    }

    if (Date.now() > tokenData.expiraEm) {
      return NextResponse.json({ error: 'Este link expirou. Solicite um novo.' }, { status: 400 });
    }

    // 2. Atualizar senha no Firebase Auth
    await adminAuth.updateUser(tokenData.uid, { password: novaSenha });

    // 3. Marcar token como usado
    await adminDb.collection('password_reset_tokens').doc(token).update({
      usado:     true,
      usadoEm:   FieldValue.serverTimestamp(),
    });

    // 4. Garantir que loginProvider é email
    await adminDb.collection('usuarios').doc(tokenData.uid).update({
      loginProvider: 'email',
      updatedAt:     FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[reset-password/confirmar]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
