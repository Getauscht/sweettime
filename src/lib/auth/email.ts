/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
})

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<any> {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Recuperação de Senha - SweetTime',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Recuperação de Senha</h1>
        <p>Você solicitou a recuperação de senha para sua conta no SweetTime.</p>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Redefinir Senha
        </a>
        <p>Este link expira em 1 hora.</p>
        <p>Se você não solicitou a recuperação de senha, ignore este email.</p>
      </div>
    `,
  })


  return info
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<any> {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verificação de Email - SweetTime',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Bem-vindo ao SweetTime!</h1>
        <p>Por favor, verifique seu endereço de email clicando no link abaixo:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Verificar Email
        </a>
        <p>Este link expira em 24 horas.</p>
      </div>
    `,
  })

  return info
}

export async function sendMagicLinkEmail(
  email: string,
  token: string,
  userName: string | null,
  settings: {
    siteName: string
    fromName: string
    fromEmail: string
  }
): Promise<any> {
  const magicLinkUrl = `${process.env.NEXTAUTH_URL}/auth/verify-magic-link?token=${token}`
  const displayName = userName || 'Usuário'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperação de Acesso - ${settings.siteName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">${settings.siteName}</h1>
          <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 14px;">Recuperação de Acesso</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Olá, ${displayName}!</h2>
          
          <p style="color: #555555; line-height: 1.6; margin: 0 0 15px 0;">
            Importamos sua conta a partir do sistema anterior (WordPress). Para garantir sua segurança, 
            solicitamos que você confirme seu acesso e escolha uma nova senha.
          </p>
          
          <p style="color: #555555; line-height: 1.6; margin: 0 0 25px 0;">
            Clique no botão abaixo para acessar o site temporariamente e realizar a troca de senha. 
            <strong>Este link expira em 1 hora</strong> e só pode ser usado uma vez.
          </p>
          
          <!-- Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLinkUrl}" 
               style="display: inline-block; 
                      padding: 14px 32px; 
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: #ffffff; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      font-weight: bold;
                      font-size: 16px;
                      box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              Entrar e Trocar Minha Senha
            </a>
          </div>
          
          <!-- Alternative link -->
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
            <p style="color: #666666; font-size: 13px; margin: 0 0 10px 0;">
              Caso o botão não funcione, copie e cole este link no seu navegador:
            </p>
            <p style="color: #667eea; word-break: break-all; font-size: 12px; margin: 0;">
              ${magicLinkUrl}
            </p>
          </div>
          
          <!-- What happens next -->
          <div style="margin: 25px 0;">
            <h3 style="color: #333333; font-size: 16px; margin: 0 0 15px 0;">O que acontecerá depois:</h3>
            <ul style="color: #555555; line-height: 1.8; padding-left: 20px; margin: 0;">
              <li>Você será autenticado temporariamente ao abrir o link.</li>
              <li>Será solicitado que crie uma nova senha.</li>
              <li>Após a troca, seu acesso ficará permanente com a nova senha.</li>
            </ul>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0;">
              Se você não solicitou essa ação ou acredita ter recebido este e‑mail por engano, 
              ignore-o com segurança.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="color: #999999; font-size: 12px; margin: 0;">
            Atenciosamente,<br>
            Equipe ${settings.siteName}
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const textContent = `
Olá, ${displayName}!

Importamos sua conta a partir do sistema anterior (WordPress). Para garantir sua segurança, solicitamos que você confirme seu acesso e escolha uma nova senha.

Clique no link abaixo para acessar o site temporariamente e realizar a troca de senha. Este link expira em 1 hora e só pode ser usado uma vez.

${magicLinkUrl}

O que acontecerá depois:
- Você será autenticado temporariamente ao abrir o link.
- Será solicitado que crie uma nova senha.
- Após a troca, seu acesso ficará permanente com a nova senha.

Se você não solicitou essa ação ou acredita ter recebido este e‑mail por engano, ignore-o com segurança.

Atenciosamente,
Equipe ${settings.siteName}
  `.trim()

  const info = await transporter.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: email,
    subject: `Recuperação de acesso — primeiro login (troca de senha obrigatória)`,
    text: textContent,
    html: htmlContent,
  })

  return info
}
