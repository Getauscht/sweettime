import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/auth/middleware'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { sha256hex } from '@/lib/crypto'
import { sendMagicLinkEmail } from '@/lib/auth/email'
import crypto from 'crypto'

const requestSchema = z.object({
    userId: z.string().cuid('ID de usuário inválido'),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' })
    }

    try {
        // Validate request body
        const validation = requestSchema.safeParse(req.body)
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validation.error.issues,
            })
        }

        const { userId } = validation.data

        // Get settings for email configuration
        const settings = await prisma.settings.findFirst()
        if (!settings || !settings.magicLinkEnabled) {
            return res.status(400).json({
                error: 'Envio de magic link está desabilitado nas configurações',
            })
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { id: userId },
        })

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' })
        }

        if (!user.email) {
            return res.status(400).json({
                error: 'Usuário não possui email cadastrado',
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
            await sendMagicLinkEmail(user.email, token, user.name, {
                siteName: settings.siteName,
                fromName: settings.fromName,
                fromEmail: settings.fromEmail,
            })

            return res.status(200).json({
                success: true,
                message: `Link mágico enviado para ${user.email}`,
            })
        } catch (emailError) {
            console.error('Failed to send magic link email:', emailError)
            return res.status(500).json({
                error: 'Erro ao enviar email. Verifique as configurações de SMTP.',
            })
        }
    } catch (error) {
        console.error('Admin send magic link error:', error)
        return res.status(500).json({
            error: 'Erro ao processar solicitação',
        })
    }
}

export default withPermission(PERMISSIONS.USERS_SEND_MAGIC_LINK, handler)
