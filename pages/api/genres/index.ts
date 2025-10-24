import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const genres = await prisma.genre.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { webtoons: true }
                }
            }
        })

        return res.status(200).json({ genres })
    } catch (error) {
        console.error('Error fetching genres:', error)
        return res.status(500).json({ error: 'Failed to fetch genres' })
    }
}
