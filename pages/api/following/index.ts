import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
        const follows = await prisma.follow.findMany({
            where: { userId: session.user.id },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        bio: true,
                        avatar: true,
                        _count: {
                            select: {
                                webtoon: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return res.status(200).json({
            follows: follows.map(f => ({
                id: f.id,
                createdAt: f.createdAt,
                author: f.author ? ({
                    ...f.author,
                    totalWebtoons: f.author._count.webtoon
                }) : null
            }))
        })
    } catch (error) {
        console.error('Error fetching follows:', error)
        return res.status(500).json({ error: 'Failed to fetch follows' })
    }
}
