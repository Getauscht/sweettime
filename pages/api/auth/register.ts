/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import { z } from 'zod'

const registerSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
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
        const { name, email, password } = registerSchema.parse(req.body)

        // Try to create user directly and handle unique constraint races (P2002)
        const hashedPassword = await hashPassword(password)

        let user
        try {
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                },
            })
        } catch (e: any) {
            // Prisma unique constraint on email
            if (e?.code === 'P2002' || (e instanceof Error && /unique constraint/.test(e.message))) {
                return res.status(400).json({ message: 'Email já cadastrado' })
            }
            throw e
        }

        return res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.issues?.[0]?.message ?? 'Invalid input' })
        }

        console.error('Erro ao criar usuário:', error)
        return res.status(500).json({ message: 'Erro interno do servidor' })
    }
}
