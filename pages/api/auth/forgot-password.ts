import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/auth/email'
import { randomBytes } from 'crypto'
import { sha256hex } from '@/lib/crypto'
import { consumeRateLimit } from '@/lib/rateLimit'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
    email: z.string().email('Email inválido'),
})

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido' })
    }

    try {
        const { email } = forgotPasswordSchema.parse(req.body)

        // Rate limit by IP to prevent abuse
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
        const rlRes = await consumeRateLimit(String(ip))
        if (!rlRes.ok) return res.status(429).json({ message: 'Too many requests' })

        // Additional rate limit by email to prevent targeted abuse
        const rlEmail = await consumeRateLimit(`forgot:email:${email}`)
        if (!rlEmail.ok) return res.status(429).json({ message: 'Too many requests for this email' })

        // Buscar usuário
        const user = await prisma.user.findUnique({
            where: { email },
        })

        // Sempre retornar sucesso por segurança (não revelar se o email existe)
        if (!user) {
            return res.status(200).json({
                message: 'Se o email existir, você receberá instruções de recuperação',
            })
        }

        // Criar token de reset
        const token = randomBytes(32).toString('hex')
        const tokenHash = sha256hex(token)
        const expires = new Date(Date.now() + 3600000) // 1 hora

        await prisma.passwordReset.create({
            data: {
                userId: user.id,
                tokenHash,
                expires,
            },
        })

        // Enviar email (token em claro no link)
        await sendPasswordResetEmail(email, token)

        return res.status(200).json({
            message: 'Se o email existir, você receberá instruções de recuperação',
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.issues?.[0]?.message ?? 'Invalid input' })
        }

        console.error('Erro ao processar recuperação de senha:', error)
        return res.status(500).json({ message: 'Erro interno do servidor' })
    }
}
