import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { logAudit } from '@/lib/firebase/auditLog';

// ─────────────────────────────────────────────
// TRANSPORTER — Gmail com App Password
// ─────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,   // ex: seuemail@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD, // App Password de 16 dígitos do Google
  },
});

export async function POST(request: Request) {
  try {
    const { email, nome, username, password, role, actorId, actorNome, actorRole, condominioId, targetUserId } = await request.json();

    if (!email || !username || !password) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    // Validar configuração do Gmail
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD ||
        process.env.GMAIL_USER === 'seuemail@gmail.com' ||
        process.env.GMAIL_APP_PASSWORD === 'abcdabcdabcdabcd') {
      console.error('[send-invite] ❌ Gmail não configurado no .env');
      return NextResponse.json(
        { error: 'Email não configurado. Preenche GMAIL_USER e GMAIL_APP_PASSWORD no .env.' },
        { status: 500 },
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const roleLabel: Record<string, string> = {
      admin:       'Administrador',
      gestor:      'Gestor de Portfólio',
      sindico:     'Síndico',
      funcionario: 'Funcionário',
      morador:     'Morador',
    };

    await transporter.sendMail({
      from:    `"CONDO." <${process.env.GMAIL_USER}>`,
      to:      email,
      subject: 'O seu acesso ao CONDO. — Credenciais de entrada',
      html:    buildEmailHtml({
        nome,
        email,
        username,
        password,
        role: roleLabel[role] ?? role,
        appUrl,
      }),
    });

    console.log(`[send-invite] Email enviado para ${email}`);

    if (actorId) {
      void logAudit({
        actorId,
        actorNome:    actorNome ?? 'Sistema',
        actorRole:    actorRole ?? 'sistema',
        accao:        'convite_enviado',
        categoria:    'utilizadores',
        descricao:    `Convite enviado para "${nome ?? email}" (${role})`,
        condominioId: condominioId ?? undefined,
        entidadeId:   targetUserId ?? email,
        entidadeTipo: 'usuario',
        meta:         { email, role },
      });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[send-invite]  Nodemailer erro de node:', {
      message: err.message,
      code:    err.code,
    });
    return NextResponse.json(
      { error: err.message ?? 'Erro interno ao enviar email.' },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────
// TEMPLATE HTML
// ─────────────────────────────────────────────

function buildEmailHtml(p: {
  nome: string;
  email: string;
  username: string;
  password: string;
  role: string
  appUrl: string;
}) {
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Acesso ao CONDO.</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- Header laranja -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:28px 40px;text-align:center;">
              <img src="data:image/png;base64,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" alt="CONDO." width="220" height="55" style="display:block;margin:0 auto;" />
              <p style="margin:10px 0 0;color:#fed7aa;font-size:13px;">
                Sistema de Gestão de Condomínios
              </p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 8px;color:#09090b;font-size:20px;font-weight:700;">
                Bem-vindo${p.nome ? `, ${p.nome.split(' ')[0]}` : ''}! 
              </h2>
              <p style="margin:0 0 24px;color:#71717a;font-size:14px;line-height:1.6;">
                A sua conta foi criada com o perfil de
                <strong style="color:#09090b;">${p.role}</strong>.
                Use as credenciais abaixo para fazer o seu primeiro acesso.
              </p>

              <!-- Caixa de credenciais -->
              <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:12px;padding:20px 24px;margin-bottom:24px;">

                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">
                  Email de acesso
                </p>
                <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#09090b;word-break:break-all;">
                  ${p.email}
                </p>

                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">
                  Nome de utilizador temporário
                </p>
                <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#09090b;">
                  ${p.username}
                </p>

                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">
                  Senha temporária
                </p>
                <p style="margin:0;font-size:20px;font-weight:800;color:#f97316;letter-spacing:0.12em;font-family:'Courier New',monospace;">
                  ${p.password}
                </p>
              </div>

              <!-- Aviso -->
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
                <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.5;">
                  <strong>Importante:</strong> Após o primeiro login ser-lhe-á pedido
                  que defina o seu nome e uma senha pessoal. As credenciais acima são temporárias.
                </p>
              </div>

              <!-- Botão CTA -->
              <div style="text-align:center;">
                <a href="${p.appUrl}/autenticacao"
                   style="display:inline-block;background:#09090b;color:#ffffff;text-decoration:none;
                          padding:14px 36px;border-radius:10px;font-size:14px;font-weight:700;
                          letter-spacing:0.02em;">
                  Fazer primeiro acesso →
                </a>
              </div>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f4f4f5;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                Se não esperava este email, pode ignorá-lo com segurança.
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:#d4d4d8;">
                © ${new Date().getFullYear()} NETSUL CONDO. — Sistema de Gestão de Condomínios
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
