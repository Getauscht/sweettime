import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './[...nextauth]'
import { prisma } from '@/lib/prisma'
import { verifyTOTP } from '@/lib/auth/totp'
import { decryptSecret } from '@/lib/crypto'
import { consumeRateLimit } from '@/lib/rateLimit'
import { isTOTPKeyConfigured } from '@/lib/crypto'
import { z } from 'zod'

const verifyTOTPSchema = z.object({
    token: z.string().length(6, 'Código deve ter 6 dígitos'),
})

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido' })
    }

    const session = await getServerSession(req, res, authOptions)

    if (!session || !session.user) {
        return res.status(401).json({ message: 'Não autorizado' })
    }

    try {
        if (!isTOTPKeyConfigured()) {
            return res.status(503).json({ message: 'TOTP não disponível: chave de criptografia não configurada' })
        }
        const { token } = verifyTOTPSchema.parse(req.body)

        // rate-limit by user/ip
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
        const rlIp = await consumeRateLimit(String(ip))
        if (!rlIp.ok) return res.status(429).json({ message: 'Too many attempts from this IP' })

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        })

        if (!user) {
            return res.status(400).json({ message: 'TOTP não configurado' })
        }

        let secretPlain: string | null = null

        // Check temporary secret first (if present and not expired)
        if (user.totpTempSecretEncrypted && user.totpTempExpires && user.totpTempExpires > new Date()) {
            try {
                secretPlain = decryptSecret(user.totpTempSecretEncrypted)
            } catch {
                // ignore decrypt errors
            }
        }

        // If not using temp, try permanent
        if (!secretPlain && user.totpSecretEncrypted) {
            try {
                secretPlain = decryptSecret(user.totpSecretEncrypted)
            } catch {
                // ignore
            }
        }

        if (!secretPlain) {
            return res.status(400).json({ message: 'TOTP não configurado' })
        }

        // additional rate limit per user id
        const rlUser = await consumeRateLimit(`verify-totp:user:${user?.id}`)
        if (!rlUser.ok) return res.status(429).json({ message: 'Too many attempts for this user' })

        const isValid = verifyTOTP(token, secretPlain)

        if (!isValid) {
            return res.status(400).json({ message: 'Código inválido' })
        }

        return res.status(200).json({ valid: true })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.issues?.[0]?.message ?? 'Invalid input' })
        }

        console.error('Erro ao verificar TOTP:', error)
        return res.status(500).json({ message: 'Erro interno do servidor' })
    }
}
