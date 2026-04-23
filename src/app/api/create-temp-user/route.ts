import { NextResponse } from 'next/server';

/**
 * Cria um utilizador no Firebase Auth usando a REST API pública.
 * Não precisa de Firebase Admin SDK nem de conta de serviço.
 * Usa apenas a NEXT_PUBLIC_FIREBASE_API_KEY que já está no .env.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios.' },
        { status: 400 },
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_FIREBASE_API_KEY não configurada.' },
        { status: 500 },
      );
    }

    // Firebase Auth REST API — criar utilizador com email/senha
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: false,
        }),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      const code = data?.error?.message ?? 'UNKNOWN_ERROR';

      // Mensagens amigáveis para erros comuns
      const friendly: Record<string, string> = {
        EMAIL_EXISTS:          'Já existe uma conta com este email.',
        WEAK_PASSWORD:         'A senha é demasiado fraca (mínimo 6 caracteres).',
        INVALID_EMAIL:         'Email inválido.',
        OPERATION_NOT_ALLOWED: 'Autenticação por email/senha não está activada no Firebase.',
        TOO_MANY_ATTEMPTS_TRY_LATER: 'Demasiadas tentativas. Tente mais tarde.',
      };

      const msg = friendly[code] ?? `Erro Firebase: ${code}`;
      console.error('[create-temp-user] Firebase REST error:', code);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const uid: string = data.localId;
    console.log(`[create-temp-user] ✅ Utilizador criado: ${uid} (${email})`);
    return NextResponse.json({ success: true, uid });

  } catch (err: any) {
    console.error('[create-temp-user] ❌ Erro inesperado:', err.message);
    return NextResponse.json(
      { error: err.message ?? 'Erro interno.' },
      { status: 500 },
    );
  }
}
