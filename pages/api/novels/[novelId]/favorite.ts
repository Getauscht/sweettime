import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)
    const { novelId } = req.query

    if (typeof novelId !== 'string') {
        return res.status(400).json({ error: 'Invalid novel ID' })
    }

    if (req.method === 'GET') {
        if (!session?.user?.id) {
            return res.status(200).json({ isFavorited: false })
        }

        try {
            const favorite = await prisma.favorite.findUnique({
                where: {
                    userId_novelId: {
                        userId: session.user.id,
                        novelId
                    }
                }
            })

            return res.status(200).json({ isFavorited: !!favorite })
        } catch (error) {
            console.error('Error checking favorite:', error)
            return res.status(500).json({ error: 'Failed to check favorite' })
        }
    }

    if (req.method === 'POST') {
        if (!session?.user?.id) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        try {
            const [favorite] = await prisma.$transaction([
                prisma.favorite.create({ data: { userId: session.user.id, novelId } }),
                prisma.novel.update({ where: { id: novelId }, data: { likes: { increment: 1 } } })
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

    if (req.method === 'DELETE') {
        if (!session?.user?.id) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        try {
            await prisma.$transaction([
                prisma.favorite.delete({ where: { userId_novelId: { userId: session.user.id, novelId } } }),
                prisma.novel.update({ where: { id: novelId }, data: { likes: { decrement: 1 } } }),
            ])

            return res.status(200).json({ isFavorited: false })
        } catch (error) {
            console.error('Error removing favorite:', error)
            return res.status(500).json({ error: 'Failed to remove favorite' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
