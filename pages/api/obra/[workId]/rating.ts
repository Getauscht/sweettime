import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/obra/[workId]/rating - Get user's rating and average rating
 * POST /api/obra/[workId]/rating - Rate a work (webtoon or novel)
 * DELETE /api/obra/[workId]/rating - Remove user's rating
 * 
 * Detects work type automatically and delegates to appropriate table
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    const { workId } = req.query
    if (!workId || typeof workId !== 'string') {
        return res.status(400).json({ error: 'Work ID is required' })
    }

    try {
        // Detect work type
        const webtoon = await prisma.webtoon.findFirst({
            where: {
                OR: [
                    { id: workId },
                    { slug: workId }
                ]
            },
            select: { id: true, rating: true }
        })

        const novel = !webtoon ? await prisma.novel.findFirst({
            where: {
                OR: [
                    { id: workId },
                    { slug: workId }
                ]
            },
            select: { id: true, rating: true }
        }) : null

        if (!webtoon && !novel) {
            return res.status(404).json({ error: 'Work not found' })
        }

        const workDbId = webtoon?.id || novel?.id
        const isWebtoon = !!webtoon
        const currentAverage = webtoon?.rating || novel?.rating || 0

        if (req.method === 'GET') {
            const userRating = isWebtoon
                ? await prisma.webtoonRating.findUnique({
                    where: { userId_webtoonId: { userId: session.user.id, webtoonId: workDbId! } }
                })
                : await prisma.novelRating.findUnique({
                    where: { userId_novelId: { userId: session.user.id, novelId: workDbId! } }
                })

            return res.status(200).json({
                userRating: userRating?.rating || null,
                averageRating: currentAverage,
                type: isWebtoon ? 'webtoon' : 'novel'
            })
        }

        if (req.method === 'POST') {
            const { rating } = req.body

            if (typeof rating !== 'number' || rating < 0.5 || rating > 5 || rating % 0.5 !== 0) {
                return res.status(400).json({ error: 'Rating must be between 0.5 and 5.0 with 0.5 increments' })
            }

            // Upsert user rating
            if (isWebtoon) {
                await prisma.webtoonRating.upsert({
                    where: { userId_webtoonId: { userId: session.user.id, webtoonId: workDbId! } },
                    create: {
                        userId: session.user.id,
                        webtoonId: workDbId!,
                        rating
                    },
                    update: { rating }
                })
            } else {
                await prisma.novelRating.upsert({
                    where: { userId_novelId: { userId: session.user.id, novelId: workDbId! } },
                    create: {
                        userId: session.user.id,
                        novelId: workDbId!,
                        rating
                    },
                    update: { rating }
                })
            }

            // Recalculate average rating
            const ratings = isWebtoon
                ? await prisma.webtoonRating.findMany({ where: { webtoonId: workDbId! }, select: { rating: true } })
                : await prisma.novelRating.findMany({ where: { novelId: workDbId! }, select: { rating: true } })

            const newAverage = ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                : 0

            // Update work's average rating
            if (isWebtoon) {
                await prisma.webtoon.update({
                    where: { id: workDbId! },
                    data: { rating: newAverage }
                })
            } else {
                await prisma.novel.update({
                    where: { id: workDbId! },
                    data: { rating: newAverage }
                })
            }

            return res.status(200).json({
                userRating: rating,
                averageRating: newAverage,
                type: isWebtoon ? 'webtoon' : 'novel'
            })
        }

        if (req.method === 'DELETE') {
            // Delete user rating
            if (isWebtoon) {
                await prisma.webtoonRating.deleteMany({
                    where: { userId: session.user.id, webtoonId: workDbId! }
                })
            } else {
                await prisma.novelRating.deleteMany({
                    where: { userId: session.user.id, novelId: workDbId! }
                })
            }

            // Recalculate average rating
            const ratings = isWebtoon
                ? await prisma.webtoonRating.findMany({ where: { webtoonId: workDbId! }, select: { rating: true } })
                : await prisma.novelRating.findMany({ where: { novelId: workDbId! }, select: { rating: true } })

            const newAverage = ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                : 0

            // Update work's average rating
            if (isWebtoon) {
                await prisma.webtoon.update({
                    where: { id: workDbId! },
                    data: { rating: newAverage }
                })
            } else {
                await prisma.novel.update({
                    where: { id: workDbId! },
                    data: { rating: newAverage }
                })
            }

            return res.status(200).json({
                userRating: null,
                averageRating: newAverage,
                type: isWebtoon ? 'webtoon' : 'novel'
            })
        }

        return res.status(405).json({ error: 'Method not allowed' })
    } catch (error) {
        console.error('Rating operation error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
