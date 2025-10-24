import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import { sha256hex } from '@/lib/crypto'
import { z } from 'zod'

const resetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido' })
    }

    try {
        const { token, password } = resetPasswordSchema.parse(req.body)

        // Buscar token de reset válido pelo hash
        const tokenHash = sha256hex(token)
        const resetToken = await prisma.passwordReset.findFirst({
            where: { tokenHash },
            include: { user: true },
        })

        if (!resetToken || resetToken.used || resetToken.expires < new Date()) {
            return res.status(400).json({ message: 'Token inválido ou expirado' })
        }

        // Hash da nova senha
        const hashedPassword = await hashPassword(password)

        // Atualizar senha e marcar token como usado
        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetToken.userId },
                data: { password: hashedPassword },
            }),
            prisma.passwordReset.update({
                where: { id: resetToken.id },
                data: { used: true },
            }),
        ])

        return res.status(200).json({
            message: 'Senha alterada com sucesso',
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.issues?.[0]?.message ?? 'Invalid input' })
        }

        console.error('Erro ao redefinir senha:', error)
        return res.status(500).json({ message: 'Erro interno do servidor' })
    }
}
