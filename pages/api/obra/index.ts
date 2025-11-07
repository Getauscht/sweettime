import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { isUserInAnyGroup } from '@/lib/auth/groups'
import { z } from 'zod'
import { authOptions } from '../auth/[...nextauth]'

const createWebtoonSchema = z.object({
    type: z.literal('webtoon'),
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional().nullable(),
    coverImage: z.string().optional().nullable(),
    bannerImage: z.string().optional().nullable(),
    status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']).default('ongoing'),
    genreIds: z.array(z.string()).min(1),
})

const createNovelSchema = z.object({
    type: z.literal('novel'),
    title: z.string().min(1).max(150),
    description: z.string().max(2000).optional().nullable(),
    coverImage: z.string().optional().nullable(),
    bannerImage: z.string().optional().nullable(),
    status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']).default('ongoing'),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if user is a member of at least one group
    const isGroupMember = await isUserInAnyGroup(session.user.id)
    if (!isGroupMember) {
        return res.status(403).json({ error: 'You must be a member of a group to manage works' })
    }

    if (req.method === 'GET') {
        try {
            // Get all works (webtoons + novels)
            const [webtoons, novels] = await Promise.all([
                prisma.webtoon.findMany({
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        description: true,
                        coverImage: true,
                        status: true,
                        views: true,
                        likes: true,
                        rating: true,
                        createdAt: true,
                        updatedAt: true,
                        _count: { select: { chapters: true } },
                    },
                    orderBy: { updatedAt: 'desc' },
                }),
                prisma.novel.findMany({
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        description: true,
                        coverImage: true,
                        status: true,
                        views: true,
                        likes: true,
                        rating: true,
                        createdAt: true,
                        updatedAt: true,
                        _count: { select: { chapters: true } },
                    },
                    orderBy: { updatedAt: 'desc' },
                })
            ])

            const works = [
                ...webtoons.map(w => ({ ...w, type: 'webtoon' as const, totalChapters: w._count.chapters })),
                ...novels.map(n => ({ ...n, type: 'novel' as const, totalChapters: n._count.chapters }))
            ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

            return res.status(200).json({ works })
        } catch (error: any) {
            console.error('Error fetching works:', error)
            return res.status(500).json({ error: 'Failed to fetch works', details: error.message })
        }
    } else if (req.method === 'POST') {
        try {
            // Validate type first
            const bodyType = req.body?.type
            if (!bodyType || !['webtoon', 'novel'].includes(bodyType)) {
                return res.status(400).json({ error: 'Field "type" is required and must be "webtoon" or "novel"' })
            }

            let parsed: any
            if (bodyType === 'webtoon') {
                parsed = createWebtoonSchema.parse(req.body)
            } else {
                parsed = createNovelSchema.parse(req.body)
            }

            // Generate slug
            const slug = parsed.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
                .substring(0, bodyType === 'webtoon' ? 50 : 60)

            // Check global slug uniqueness
            const [webtoonExists, novelExists] = await Promise.all([
                prisma.webtoon.findUnique({ where: { slug } }),
                prisma.novel.findUnique({ where: { slug } })
            ])

            if (webtoonExists || novelExists) {
                return res.status(409).json({ error: 'Slug already exists. Please choose a different title.' })
            }

            if (bodyType === 'webtoon') {
                // Verify genres exist
                const genresCount = await prisma.genre.count({
                    where: { id: { in: parsed.genreIds } },
                })

                if (genresCount !== parsed.genreIds.length) {
                    return res.status(400).json({ error: 'Invalid genres' })
                }

                // Create webtoon
                const webtoon = await prisma.webtoon.create({
                    data: {
                        title: parsed.title,
                        slug,
                        description: parsed.description || null,
                        coverImage: parsed.coverImage || null,
                        bannerImage: parsed.bannerImage || null,
                        status: parsed.status,
                        genres: {
                            create: parsed.genreIds.map((genreId: string) => ({
                                genreId,
                            })),
                        },
                    },
                    include: {
                        genres: { include: { genre: true } },
                        _count: { select: { chapters: true } },
                    },
                })

                return res.status(201).json({ work: { ...webtoon, type: 'webtoon' } })
            } else {
                // Create novel
                const novel = await prisma.novel.create({
                    data: {
                        title: parsed.title,
                        slug,
                        description: parsed.description || null,
                        coverImage: parsed.coverImage || null,
                        bannerImage: parsed.bannerImage || null,
                        status: parsed.status,
                    },
                    include: {
                        _count: { select: { chapters: true } },
                    },
                })

                return res.status(201).json({ work: { ...novel, type: 'novel' } })
            }
        } catch (error: any) {
            console.error('Error creating work:', error)
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Invalid input' })
            }
            return res.status(500).json({ error: 'Failed to create work', details: error.message })
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).end()
    }
}
