/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './[...nextauth]'
import { prisma } from '@/lib/prisma'
import { generateTOTPSecret, generateQRCode, verifyTOTP } from '@/lib/auth/totp'
import { encryptSecret, decryptSecret } from '@/lib/crypto'
import { verifyPassword } from '@/lib/auth/password'
import { consumeRateLimit } from '@/lib/rateLimit'
import { isTOTPKeyConfigured } from '@/lib/crypto'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const session = await getServerSession(req, res, authOptions)

    if (!session || !session.user) {
        return res.status(401).json({ message: 'Não autorizado' })
    }

    if (req.method === 'GET') {
        // Gerar novo TOTP secret e QR code
        try {
            if (!isTOTPKeyConfigured()) {
                return res.status(503).json({ message: 'TOTP não disponível: chave de criptografia não configurada' })
            }
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
            const rlIp = await consumeRateLimit(String(ip))
            if (!rlIp.ok) return res.status(429).json({ message: 'Too many requests' })
            const secret = generateTOTPSecret()
            const qrCode = await generateQRCode(session.user.email!, secret)

            // Criptografar e salvar temporariamente (expira em 10 minutos)
            const encrypted = encryptSecret(secret)
            const expires = new Date(Date.now() + 10 * 60 * 1000)

            await prisma.user.update({
                where: { id: session.user.id },
                data: { totpTempSecretEncrypted: encrypted, totpTempExpires: expires } as any,
            })

            // Do not expose the raw secret to clients in production. QR code is sufficient.
            if (process.env.NODE_ENV === 'development') {
                return res.status(200).json({ secret, qrCode, expiresAt: expires.toISOString() })
            }

            return res.status(200).json({ qrCode, expiresAt: expires.toISOString() })
        } catch (error) {
            console.error('Erro ao gerar TOTP:', error)
            return res.status(500).json({ message: 'Erro interno do servidor' })
        }
    }

    if (req.method === 'POST') {
        // Habilitar TOTP
        try {
            const user = await prisma.user.findUnique({ where: { id: session.user.id } })
            const u = user as any
            if (!user || !u.totpTempSecretEncrypted || !u.totpTempExpires) {
                return res.status(400).json({ message: 'Nenhum secret temporário encontrado' })
            }

            if (u.totpTempExpires < new Date()) {
                // Limpar temp
                await prisma.user.update({ where: { id: user.id }, data: { totpTempSecretEncrypted: null, totpTempExpires: null } as any })
                return res.status(400).json({ message: 'Secret temporário expirado' })
            }

            // Promover para permanente
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    totpSecretEncrypted: u.totpTempSecretEncrypted,
                    totpTempSecretEncrypted: null,
                    totpTempExpires: null,
                    totpEnabled: true,
                } as any,
            })

            await prisma.activityLog.create({ data: { action: 'enable_2fa', entityType: 'user', entityId: user.id, performedBy: user.id, details: 'Usuário habilitou TOTP' } })

            return res.status(200).json({ message: 'TOTP habilitado com sucesso' })
        } catch (error) {
            console.error('Erro ao habilitar TOTP:', error)
            return res.status(500).json({ message: 'Erro interno do servidor' })
        }
    }

    if (req.method === 'DELETE') {
        // Desabilitar TOTP
        try {
            if (!isTOTPKeyConfigured()) {
                return res.status(503).json({ message: 'TOTP não disponível: chave de criptografia não configurada' })
            }
            // Expect body containing either { password } or { token }

            const body = req.body || {}
            const user = await prisma.user.findUnique({ where: { id: session.user.id } })
            if (!user) return res.status(404).json({ message: 'Usuário não encontrado' })

            // rate-limit by user to prevent targeted attacks
            const rlUser = await consumeRateLimit(`disable-totp:user:${user.id}`)
            if (!rlUser.ok) return res.status(429).json({ message: 'Too many attempts' })

            let authorized = false

            if (body.password) {
                authorized = await verifyPassword(body.password, user.password || '')
            }

            if (!authorized && body.token) {
                // verify token against permanent secret (decrypt safely)
                const uu = user as any
                if (uu.totpSecretEncrypted) {
                    try {
                        const secret = decryptSecret(uu.totpSecretEncrypted)
                        authorized = verifyTOTP(body.token, secret)
                    } catch (e) {
                        console.error('Failed to decrypt permanent TOTP secret for user', user.id, e)
                        // do not authorize if decrypt fails
                    }
                }
            }

            if (!authorized) {
                return res.status(400).json({ message: 'Prova de identidade necessária (senha ou TOTP)' })
            }

            await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecretEncrypted: null } as any })
            await prisma.activityLog.create({ data: { action: 'disable_2fa', entityType: 'user', entityId: user.id, performedBy: user.id, details: 'Usuário desabilitou TOTP' } })

            return res.status(200).json({ message: 'TOTP desabilitado com sucesso' })
        } catch (error) {
            console.error('Erro ao desabilitar TOTP:', error)
            return res.status(500).json({ message: 'Erro interno do servidor' })
        }
    }

    return res.status(405).json({ message: 'Método não permitido' })
}
