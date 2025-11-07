import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sha256hex } from '@/lib/crypto'
import { sendMagicLinkEmail } from '@/lib/auth/email'
import crypto from 'crypto'
import { getRateLimiter, consumeRateLimit } from '@/lib/rateLimit'

const requestSchema = z.object({
    email: z.string().email('Email inválido'),
})

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' })
    }

    try {
        // Rate limiting to prevent abuse
        const identifier = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
        // create a limiter specific for magic links: 5 requests per 15 minutes
        const limiter = getRateLimiter('magic-link', 999, 60 * 15)
        const rlResult = await consumeRateLimit(identifier as string, 1, limiter)

        if (!rlResult.ok) {
            const retryAfterSeconds = Math.ceil((rlResult.msBeforeNext ?? 0) / 1000)
            return res.status(429).json({
                error: 'Muitas tentativas. Tente novamente mais tarde.',
                retryAfter: retryAfterSeconds,
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

        const { email } = validation.data

        // Get settings for email configuration
        const settings = await prisma.settings.findFirst()
        if (!settings || !settings.magicLinkEnabled) {
            return res.status(200).json({
                message: 'Se o email existir em nosso sistema, você receberá instruções em breve.',
            })
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        })

        // Always return success to prevent email enumeration
        if (!user) {
            return res.status(200).json({
                message: 'Se o email existir em nosso sistema, você receberá instruções em breve.',
            })
        }

        // Generate magic link token
        const token = crypto.randomBytes(32).toString('hex')
        const tokenHash = sha256hex(token)
        const expiresAt = new Date(Date.now() + settings.magicLinkTtlMinutes * 60 * 1000)

        // Create magic link record
        await prisma.magicLink.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
            },
        })

        // Send email
        try {
            await sendMagicLinkEmail(email, token, user.name, {
                siteName: settings.siteName,
                fromName: settings.fromName,
                fromEmail: settings.fromEmail,
            })
        } catch (emailError) {
            console.error('Failed to send magic link email:', emailError)
            // Don't reveal the error to the user
        }

        return res.status(200).json({
            message: 'Se o email existir em nosso sistema, você receberá instruções em breve.',
        })
    } catch (error) {
        console.error('Magic link error:', error)
        return res.status(500).json({
            error: 'Erro ao processar solicitação',
        })
    }
} 