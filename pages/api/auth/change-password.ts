import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from './[...nextauth]'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

// Strong password policy (same as client-side):
// - at least 8 characters
// - at least one lowercase letter
// - at least one uppercase letter
// - at least one digit
// - at least one special character
// - no whitespace
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])(?!.*\s).{8,}$/

const requestSchema = z.object({
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres').regex(strongPasswordRegex, 'A senha deve conter letras maiúsculas e minúsculas, um número e um caractere especial, sem espaços'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
})

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' })
    }

    try {
        // Get session
        const session = await getServerSession(req, res, authOptions)

        if (!session || !session.user?.email) {
            return res.status(401).json({ error: 'Não autenticado' })
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        })

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' })
        }

        // Check if user must change password
        if (!user.mustChangePassword) {
            return res.status(400).json({
                error: 'Você não precisa trocar sua senha',
            })
        }

        // Validate request body
        const validation = requestSchema.safeParse(req.body)
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validation.error.issues,
            })
        }

        const { password } = validation.data

        // Hash new password
        const hashedPassword = await hash(password, 10)

        // Update user password and remove mustChangePassword flag
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                mustChangePassword: false,
            },
        })

        // Generate a new NextAuth-compatible session token without mustChangePassword
        const jwtSecret = process.env.NEXTAUTH_SECRET
        if (!jwtSecret) {
            console.error('NEXTAUTH_SECRET is not configured')
            return res.status(500).json({ error: 'Configuração do servidor inválida' })
        }

        const tokenPayload = {
            id: user.id,
            email: user.email,
            // preserve emailVerified if present
            emailVerified: user.emailVerified,
            mustChangePassword: false,
        }

        const maxAge = 60 * 60 * 24 * 30 // 30 days
        const sessionToken = await encode({ token: tokenPayload as any, secret: jwtSecret, maxAge })

        const isProd = process.env.NODE_ENV === 'production'
        const cookieParts = [
            `next-auth.session-token=${sessionToken}`,
            'Path=/',
            'HttpOnly',
            'SameSite=Lax',
            `Max-Age=${maxAge}`,
        ]
        if (isProd) cookieParts.push('Secure')

        res.setHeader('Set-Cookie', cookieParts.join('; '))

        return res.status(200).json({
            success: true,
            message: 'Senha atualizada com sucesso',
        })
    } catch (error) {
        console.error('Change password error:', error)
        return res.status(500).json({
            error: 'Erro ao processar solicitação',
        })
    }
}
