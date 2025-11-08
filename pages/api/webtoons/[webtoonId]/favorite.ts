/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { webtoonId } = req.query

    if (typeof webtoonId !== 'string') {
        return res.status(400).json({ error: 'Invalid webtoon ID' })
    }

    // GET - Check if user has favorited (optional auth)
    if (req.method === 'GET') {
        // optional session for GET-only behavior
        const { getServerSession } = await import('next-auth')
        const session = (await getServerSession(req as any, res as any, authOptions as any)) as any

        if (!(session as any)?.user?.id) {
            return res.status(200).json({ isFavorited: false })
        }

        try {
            const favorite = await prisma.favorite.findUnique({
                where: {
                    userId_webtoonId: {
                        userId: (session as any).user.id,
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

    // Protected handlers (POST/DELETE)
    const protectedHandler = withAuth(async (req: NextApiRequest, res: NextApiResponse) => {
        const auth = (req as any).auth
        const userId = auth?.userId

        if (req.method === 'POST') {
            try {
                const [favorite] = await prisma.$transaction([
                    prisma.favorite.create({ data: { userId, webtoonId } as any }),
                    prisma.webtoon.update({ where: { id: webtoonId as string }, data: { likes: { increment: 1 } } }),
                ])

                return res.status(201).json({ favorite, isFavorited: true })
            } catch (error: any) {
                if (error.code === 'P2002') return res.status(400).json({ error: 'Already favorited' })
                console.error('Error adding favorite:', error)
                return res.status(500).json({ error: 'Failed to add favorite' })
            }
        }

        if (req.method === 'DELETE') {
            try {
                await prisma.$transaction([
                    prisma.favorite.delete({ where: { userId_webtoonId: { userId, webtoonId } as any } }),
                    prisma.webtoon.update({ where: { id: webtoonId as string }, data: { likes: { decrement: 1 } } }),
                ])

                return res.status(200).json({ isFavorited: false })
            } catch (error) {
                console.error('Error removing favorite:', error)
                return res.status(500).json({ error: 'Failed to remove favorite' })
            }
        }

        return res.status(405).json({ error: 'Method not allowed' })
    }, authOptions)

    return protectedHandler(req, res)

    return res.status(405).json({ error: 'Method not allowed' })
}
