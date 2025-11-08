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

    // Helper: check for prisma model presence (in case client wasn't regenerated after schema change)
    const hasWebtoonRating = typeof (prisma as any).webtoonRating !== 'undefined'

    // GET - return current user's rating (if any)
    if (req.method === 'GET') {
        const { getServerSession } = await import('next-auth')
        const session = (await getServerSession(req as any, res as any, authOptions as any)) as any
        const userId = (session as any)?.user?.id
        if (!userId) {
            return res.status(200).json({ rating: null })
        }

        if (!hasWebtoonRating) {
            console.error('Prisma client missing model `webtoonRating`. Did you run `prisma generate`/apply migrations?')
            // degrade gracefully: return null so UI doesn't break; client should run migrations to enable full feature
            return res.status(200).json({ rating: null })
        }

        try {
            const r = await (prisma as any).webtoonRating.findUnique({
                where: { userId_webtoonId: { userId, webtoonId } }
            })
            return res.status(200).json({ rating: r?.rating ?? null })
        } catch (error) {
            console.error('Error fetching rating:', error)
            return res.status(500).json({ error: 'Failed to fetch rating' })
        }
    }

    // POST - create or update rating
    if (req.method === 'POST') {
        // protected
        const protectedHandler = withAuth(async (req: NextApiRequest, res: NextApiResponse) => {
            const auth = (req as any).auth
            const userId = auth?.userId

            const { rating } = req.body as { rating?: number }
            if (typeof rating !== 'number' || rating < 0.5 || rating > 5) {
                return res.status(400).json({ error: 'Invalid rating value' })
            }
            if (!hasWebtoonRating) {
                console.error('Prisma client missing model `webtoonRating`. Did you run `prisma generate`/apply migrations?')
                return res.status(500).json({ error: 'Rating feature not available: prisma client not generated for WebtoonRating. Run prisma generate/migrate.' })
            }

            if (typeof rating !== 'number' || rating < 0.5 || rating > 5) {
                return res.status(400).json({ error: 'Invalid rating value' })
            }
            if (!hasWebtoonRating) {
                console.error('Prisma client missing model `webtoonRating`. Did you run `prisma generate`/apply migrations?')
                return res.status(500).json({ error: 'Rating feature not available: prisma client not generated for WebtoonRating. Run prisma generate/migrate.' })
            }

            try {
                // Upsert user's rating
                await (prisma as any).webtoonRating.upsert({
                    where: { userId_webtoonId: { userId, webtoonId } },
                    create: { userId, webtoonId, rating },
                    update: { rating }
                })

                // Recalculate average for webtoon
                const agg = await (prisma as any).webtoonRating.aggregate({ where: { webtoonId }, _avg: { rating: true } })
                const avg = agg._avg.rating ?? 0
                await prisma.webtoon.update({ where: { id: webtoonId as string }, data: { rating: avg } })

                return res.status(200).json({ rating: rating, average: avg })
            } catch (error) {
                console.error('Error saving rating:', error)
                return res.status(500).json({ error: 'Failed to save rating' })
            }
        }, authOptions)

        return protectedHandler(req, res)
    }

    // DELETE - remove user's rating
    if (req.method === 'DELETE') {
        const protectedHandler = withAuth(async (req: NextApiRequest, res: NextApiResponse) => {
            const auth = (req as any).auth
            const userId = auth?.userId

            if (!hasWebtoonRating) {
                console.error('Prisma client missing model `webtoonRating`. Did you run `prisma generate`/apply migrations?')
                return res.status(500).json({ error: 'Rating feature not available: prisma client not generated for WebtoonRating. Run prisma generate/migrate.' })
            }

            try {
                await (prisma as any).webtoonRating.delete({ where: { userId_webtoonId: { userId, webtoonId } } })
                const agg = await (prisma as any).webtoonRating.aggregate({ where: { webtoonId }, _avg: { rating: true } })
                const avg = agg._avg.rating ?? 0
                await prisma.webtoon.update({ where: { id: webtoonId as string }, data: { rating: avg } })

                return res.status(200).json({ rating: null, average: avg })
            } catch (error) {
                console.error('Error deleting rating:', error)
                return res.status(500).json({ error: 'Failed to delete rating' })
            }
        }, authOptions)

        return protectedHandler(req, res)
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
