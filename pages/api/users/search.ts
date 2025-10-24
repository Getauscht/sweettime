import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { query } = req.query

    if (!query || typeof query !== 'string' || query.length < 2) {
        return res.status(200).json({ users: [] })
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { email: { contains: query } }
                ]
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true
            },
            take: 10
        })

        return res.status(200).json({ users })
    } catch (error) {
        console.error('Error searching users:', error)
        return res.status(500).json({ error: 'Failed to search users' })
    }
}
