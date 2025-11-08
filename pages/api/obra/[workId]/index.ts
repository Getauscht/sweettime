/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { z } from 'zod'

const updateSchema = z.object({
    status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']).optional(),
    description: z.string().max(2000).optional().nullable(),
    title: z.string().min(1).max(200).optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { workId } = req.query

    if (typeof workId !== 'string') {
        return res.status(400).json({ error: 'Invalid work identifier' })
    }

    if (req.method === 'GET') {
        try {
            // Try to find by slug first, then by ID in both tables
            let work: any = null
            let type: 'webtoon' | 'novel' | null = null

            // Try webtoon
            const webtoon = await prisma.webtoon.findFirst({
                where: {
                    OR: [
                        { slug: workId },
                        { id: workId }
                    ]
                },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    description: true,
                    coverImage: true,
                    bannerImage: true,
                    status: true,
                    views: true,
                    likes: true,
                    rating: true,
                    createdAt: true,
                    updatedAt: true,
                    genres: {
                        include: {
                            genre: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true
                                }
                            }
                        }
                    },
                    credits: {
                        select: {
                            author: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true
                                }
                            },
                        }
                    },
                    chapters: {
                        select: {
                            id: true,
                            number: true,
                            title: true,
                            views: true,
                            likes: true,
                            publishedAt: true,
                            scanlationGroup: { select: { id: true, name: true } }
                        },
                        orderBy: { number: 'desc' },
                        take: 5
                    },
                    _count: {
                        select: { chapters: true }
                    }
                }
            })

            if (webtoon) {
                work = webtoon
                type = 'webtoon'
            } else {
                // Try novel
                const novel = await prisma.novel.findFirst({
                    where: {
                        OR: [
                            { slug: workId },
                            { id: workId }
                        ]
                    },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        description: true,
                        coverImage: true,
                        bannerImage: true,
                        status: true,
                        views: true,
                        likes: true,
                        rating: true,
                        createdAt: true,
                        updatedAt: true,
                        chapters: {
                            select: {
                                id: true,
                                number: true,
                                title: true,
                                views: true,
                                likes: true,
                                publishedAt: true,
                            },
                            orderBy: { number: 'desc' },
                            take: 10,
                        },
                        _count: {
                            select: { chapters: true }
                        }
                    }
                })

                if (novel) {
                    work = novel
                    type = 'novel'
                }
            }

            if (!work) {
                return res.status(404).json({ error: 'Work not found' })
            }

            // Get all chapters
            const allChapters = type === 'webtoon'
                ? await prisma.chapter.findMany({
                    where: { webtoonId: work.id },
                    select: {
                        id: true,
                        number: true,
                        title: true,
                        publishedAt: true,
                        scanlationGroup: { select: { id: true, name: true } },
                        views: true,
                    },
                    orderBy: { number: 'asc' }
                })
                : await prisma.novelChapter.findMany({
                    where: { novelId: work.id },
                    select: {
                        id: true,
                        number: true,
                        title: true,
                        publishedAt: true,
                        views: true,
                    },
                    orderBy: { number: 'asc' }
                })

            // Normalize response
            const authors = type === 'webtoon'
                ? (work.credits?.map((c: any) => c.author) || [])
                : []

            const response = {
                id: work.id,
                title: work.title,
                slug: work.slug,
                description: work.description,
                coverImage: work.coverImage,
                bannerImage: work.bannerImage,
                status: work.status,
                views: work.views,
                likes: work.likes,
                rating: work.rating,
                createdAt: work.createdAt,
                updatedAt: work.updatedAt,
                type,
                authors,
                author: authors, // Legacy compatibility
                genres: type === 'webtoon' ? work.genres.map((wg: any) => wg.genre) : undefined,
                latestChapters: work.chapters,
                totalChapters: work._count?.chapters || 0,
                allChapters,
            }

            return res.status(200).json({ work: response })
        } catch (error: any) {
            console.error('Error fetching work:', error)
            return res.status(500).json({ error: 'Failed to fetch work', details: error.message })
        }
    } else if (req.method === 'PATCH') {
        return withAuth(async (req2: NextApiRequest, res2: NextApiResponse) => {
            try {
                const parsed = updateSchema.parse(req2.body)

                // Determine type by checking both tables
                const webtoon = await prisma.webtoon.findUnique({ where: { id: workId } })
                const novel = await prisma.novel.findUnique({ where: { id: workId } })

                if (!webtoon && !novel) {
                    return res2.status(404).json({ error: 'Work not found' })
                }

                const type = webtoon ? 'webtoon' : 'novel'

                const updateData: any = {}
                if (parsed.status !== undefined) updateData.status = parsed.status
                if (parsed.description !== undefined) updateData.description = parsed.description
                if (parsed.title !== undefined) updateData.title = parsed.title

                const updated = type === 'webtoon'
                    ? await prisma.webtoon.update({ where: { id: workId }, data: updateData })
                    : await prisma.novel.update({ where: { id: workId }, data: updateData })

                return res2.status(200).json({ work: { ...updated, type } })
            } catch (error: any) {
                console.error('Error updating work:', error)
                if (error instanceof z.ZodError) {
                    return res2.status(400).json({ error: 'Invalid input' })
                }
                return res2.status(500).json({ error: 'Failed to update work' })
            }
        }, authOptions)(req, res)
    } else if (req.method === 'DELETE') {
        return withAuth(async (req2: NextApiRequest, res2: NextApiResponse) => {
            try {
                // Determine type
                const webtoon = await prisma.webtoon.findUnique({ where: { id: workId } })
                const novel = await prisma.novel.findUnique({ where: { id: workId } })

                if (!webtoon && !novel) {
                    return res2.status(404).json({ error: 'Work not found' })
                }

                if (webtoon) {
                    await prisma.webtoon.delete({ where: { id: workId } })
                } else {
                    await prisma.novel.delete({ where: { id: workId } })
                }

                return res2.status(200).json({ message: 'Work deleted' })
            } catch (error: any) {
                console.error('Error deleting work:', error)
                return res2.status(500).json({ error: 'Failed to delete work' })
            }
        }, authOptions)(req, res)
    } else {
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
        return res.status(405).end()
    }
}
