import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)
    const { webtoonId } = req.query

    if (typeof webtoonId !== 'string') {
        return res.status(400).json({ error: 'Invalid webtoon ID' })
    }

    // GET - Check if user has favorited
    if (req.method === 'GET') {
        if (!session?.user?.id) {
            return res.status(200).json({ isFavorited: false })
        }

        try {
            const favorite = await prisma.favorite.findUnique({
                where: {
                    userId_webtoonId: {
                        userId: session.user.id,
                        webtoonId
                    }
                }
            })

            return res.status(200).json({ isFavorited: !!favorite })
        } catch (error) {
            console.error('Error checking favorite:', error)
            return res.status(500).json({ error: 'Failed to check favorite' })
        }
    }

    // POST - Add to favorites
    if (req.method === 'POST') {
        if (!session?.user?.id) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        try {
            // Use transaction to ensure atomicity: create favorite + increment likes
            const [favorite] = await prisma.$transaction([
                prisma.favorite.create({
                    data: { userId: session.user.id, webtoonId },
                }),
                prisma.webtoon.update({
                    where: { id: webtoonId },
                    data: { likes: { increment: 1 } },
                }),
            ])

            return res.status(201).json({ favorite, isFavorited: true })
        } catch (error: any) {
            if (error.code === 'P2002') {
                return res.status(400).json({ error: 'Already favorited' })
            }
            console.error('Error adding favorite:', error)
            return res.status(500).json({ error: 'Failed to add favorite' })
        }
    }

    // DELETE - Remove from favorites
    if (req.method === 'DELETE') {
        if (!session?.user?.id) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        try {
            // Use transaction to delete favorite and decrement likes atomically
            await prisma.$transaction([
                prisma.favorite.delete({
                    where: {
                        userId_webtoonId: {
                            userId: session.user.id,
                            webtoonId,
                        },
                    },
                }),
                prisma.webtoon.update({
                    where: { id: webtoonId },
                    data: { likes: { decrement: 1 } },
                }),
            ])

            return res.status(200).json({ isFavorited: false })
        } catch (error) {
            console.error('Error removing favorite:', error)
            return res.status(500).json({ error: 'Failed to remove favorite' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
