import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { id } = req.query

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid user ID' })
    }

    try {
        const favorites = await prisma.favorite.findMany({
            where: { userId: id },
            include: {
                webtoon: {
                    select: {
                        id: true,
                        title: true,
                        coverImage: true,
                        slug: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 20 // Limit to 20 public favorites
        })

        return res.status(200).json({ favorites })
    } catch (error) {
        console.error('Error fetching user favorites:', error)
        return res.status(500).json({ error: 'Failed to fetch favorites' })
    }
}