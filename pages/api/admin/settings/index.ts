import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/auth/middleware'
import { authOptions } from '../../auth/[...nextauth]'
import { PERMISSIONS } from '@/lib/auth/permissions'

const urlOrPath = z.string().regex(/^(https?:\/\/.*|\/.*)$/)

const updateSettingsSchema = z.object({
    siteName: z.string().min(1, 'Nome do site é obrigatório'),
    fromName: z.string().min(1, 'Nome do remetente é obrigatório'),
    fromEmail: z.string().email('Email inválido'),
    // Accept either absolute URLs (http/https) or site-root relative paths (/uploads/...)
    logoUrl: urlOrPath.optional().nullable(),
    faviconUrl: urlOrPath.optional().nullable(),
    magicLinkTtlMinutes: z.number().int().min(5).max(1440), // 5 minutes to 24 hours
    magicLinkEnabled: z.boolean(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            // Get settings (or create default if doesn't exist)
            let settings = await prisma.settings.findFirst()

            if (!settings) {
                settings = await prisma.settings.create({
                    data: {
                        id: 'default',
                        siteName: 'Sweettime',
                        fromName: 'Sweettime',
                        fromEmail: 'no-reply@sweettime.com',
                        logoUrl: null,
                        faviconUrl: null,
                        magicLinkTtlMinutes: 60,
                        magicLinkEnabled: true,
                    },
                })
            }

            return res.status(200).json(settings)
        } catch (error) {
            console.error('Get settings error:', error)
            return res.status(500).json({ error: 'Erro ao buscar configurações' })
        }
    } else if (req.method === 'PUT') {
        try {
            // Validate request body
            const validation = updateSettingsSchema.safeParse(req.body)
            if (!validation.success) {
                return res.status(400).json({
                    error: 'Dados inválidos',
                    details: validation.error.issues,
                })
            }

            const data = validation.data

            // Get existing settings
            let settings = await prisma.settings.findFirst()

            if (!settings) {
                // Create if doesn't exist
                settings = await prisma.settings.create({
                    data: {
                        id: 'default',
                        ...data,
                    },
                })
            } else {
                // Update existing
                settings = await prisma.settings.update({
                    where: { id: settings.id },
                    data,
                })
            }

            return res.status(200).json(settings)
        } catch (error) {
            console.error('Update settings error:', error)
            return res.status(500).json({ error: 'Erro ao atualizar configurações' })
        }
    } else {
        return res.status(405).json({ error: 'Método não permitido' })
    }
}

export default withPermission(PERMISSIONS.SETTINGS_MANAGE, handler, authOptions)
