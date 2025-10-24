import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
    email: z.string().email(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })

    try {
        const { email } = querySchema.parse(req.query)

        const user = await prisma.user.findUnique({ where: { email } })

        return res.status(200).json({ hasTotp: !!(user && user.totpEnabled) })
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.issues?.[0]?.message ?? 'Invalid query' })
        }
        console.error('has-totp error', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}
