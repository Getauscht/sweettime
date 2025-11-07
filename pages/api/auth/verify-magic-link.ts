import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { sha256hex } from '@/lib/crypto'
import { encode } from 'next-auth/jwt'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' })
    }

    try {
        const token = req.query.token as string

        if (!token) {
            return res.status(400).json({ error: 'Token não fornecido' })
        }

        // Hash the token to find it in the database
        const tokenHash = sha256hex(token)

        // Find the magic link
        const magicLink = await prisma.magicLink.findUnique({
            where: { tokenHash },
            include: { user: true },
        })

        if (!magicLink) {
            return res.status(400).json({ error: 'Link inválido ou expirado' })
        }

        // Check if already used
        if (magicLink.used) {
            return res.status(410).json({ error: 'Este link já foi utilizado' })
        }

        // Check if expired
        if (new Date() > magicLink.expiresAt) {
            return res.status(410).json({ error: 'Este link expirou' })
        }

        // Mark as used
        await prisma.magicLink.update({
            where: { id: magicLink.id },
            data: { used: true },
        })

        // Create a temporary token compatible with NextAuth's JWT session
        const jwtSecret = process.env.NEXTAUTH_SECRET
        if (!jwtSecret) {
            console.error('NEXTAUTH_SECRET is not configured')
            return res.status(500).json({ error: 'Configuração do servidor inválida' })
        }

        const tokenPayload = {
            id: magicLink.user.id,
            email: magicLink.user.email,
            mustChangePassword: true,
            magicLinkAuth: true,
        }

        // Encode token using NextAuth's helper to produce a JWE compatible value
        const maxAge = 60 * 60 // 1 hour
        const sessionToken = await encode({ token: tokenPayload as any, secret: jwtSecret, maxAge })

        // Set the session cookie in the same shape NextAuth expects
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

        // Redirect to change password page
        if (req.method === 'GET') {
            return res.redirect(302, '/auth/change-password')
        } else {
            return res.status(200).json({
                success: true,
                redirect: '/auth/change-password',
            })
        }
    } catch (error) {
        console.error('Verify magic link error:', error)
        return res.status(500).json({
            error: 'Erro ao processar solicitação',
        })
    }
}
