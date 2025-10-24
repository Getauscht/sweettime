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
