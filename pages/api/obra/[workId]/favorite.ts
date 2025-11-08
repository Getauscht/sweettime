/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/obra/[workId]/favorite - Check if work is favorited
 * POST /api/obra/[workId]/favorite - Add to favorites
 * DELETE /api/obra/[workId]/favorite - Remove from favorites
 * 
 * Detects work type automatically and delegates to appropriate table
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = (req as any).auth?.userId

    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

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
            select: { id: true }
        })

        const novel = !webtoon ? await prisma.novel.findFirst({
            where: {
                OR: [
                    { id: workId },
                    { slug: workId }
                ]
            },
            select: { id: true }
        }) : null

        if (!webtoon && !novel) {
            return res.status(404).json({ error: 'Work not found' })
        }

        const workDbId = webtoon?.id || novel?.id
        const isWebtoon = !!webtoon

        if (req.method === 'GET') {
            const favorite = await prisma.favorite.findFirst({
                where: {
                    userId,
                    ...(isWebtoon ? { webtoonId: workDbId } : { novelId: workDbId })
                }
            })

            return res.status(200).json({
                isFavorited: !!favorite,
                type: isWebtoon ? 'webtoon' : 'novel'
            })
        }

        if (req.method === 'POST') {
            // Check if already favorited
            const existing = await prisma.favorite.findFirst({
                where: {
                    userId,
                    ...(isWebtoon ? { webtoonId: workDbId } : { novelId: workDbId })
                }
            })

            if (existing) {
                return res.status(200).json({
                    isFavorited: true,
                    type: isWebtoon ? 'webtoon' : 'novel',
                    message: 'Already favorited'
                })
            }

            await prisma.favorite.create({
                data: {
                    userId,
                    ...(isWebtoon ? { webtoonId: workDbId } : { novelId: workDbId })
                }
            })

            return res.status(201).json({
                isFavorited: true,
                type: isWebtoon ? 'webtoon' : 'novel'
            })
        }

        if (req.method === 'DELETE') {
            await prisma.favorite.deleteMany({
                where: {
                    userId,
                    ...(isWebtoon ? { webtoonId: workDbId } : { novelId: workDbId })
                }
            })

            return res.status(200).json({
                isFavorited: false,
                type: isWebtoon ? 'webtoon' : 'novel'
            })
        }

        return res.status(405).json({ error: 'Method not allowed' })
    } catch (error) {
        console.error('Favorite operation error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

export default withAuth(handler, authOptions)
