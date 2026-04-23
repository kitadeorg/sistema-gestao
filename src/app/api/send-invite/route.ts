import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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
    const { email, nome, username, password, role } = await request.json();

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

    console.log(`[send-invite] ✅ Email enviado para ${email}`);
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[send-invite] ❌ Nodemailer error:', {
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
  role: string;
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
            <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:900;letter-spacing:-0.5px;">
                CONDO<span style="color:#fed7aa;">.</span>
              </h1>
              <p style="margin:8px 0 0;color:#fed7aa;font-size:13px;">
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
                © ${new Date().getFullYear()} CONDO. — Sistema de Gestão de Condomínios
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
