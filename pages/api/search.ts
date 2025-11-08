/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

// Generic search endpoint that looks for webtoons, novels, authors and genres
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { q, limit = '20', type } = req.query

    if (!q || typeof q !== 'string' || q.length < 2) {
        return res.status(200).json({ webtoons: [], novels: [], authors: [], genres: [] })
    }

    try {
        const take = Math.min(100, parseInt(limit as string, 10) || 20)
        const searchType = type as string | undefined

        let webtoons: any[] = []
        let novels: any[] = []

        // Search webtoons by title or slug or description
        if (!searchType || searchType === 'webtoon' || searchType === 'all') {
            webtoons = await prisma.webtoon.findMany({
                where: {
                    OR: [
                        { title: { contains: q } },
                        { slug: { contains: q } },
                        { description: { contains: q } }
                    ],
                    status: { in: ['ongoing', 'completed'] }
                },
                take: Math.min(20, take),
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    description: true,
                    coverImage: true,
                    rating: true,
                    views: true,
                    credits: {
                        select: {
                            role: true,
                            author: {
                                select: { id: true, name: true, slug: true, avatar: true }
                            }
                        }
                    },
                    genres: {
                        include: { genre: { select: { name: true, slug: true } } },
                        take: 3
                    }
                }
            })
        }

        // Search novels by title or slug or description
        if (!searchType || searchType === 'novel' || searchType === 'all') {
            novels = await prisma.novel.findMany({
                where: {
                    OR: [
                        { title: { contains: q } },
                        { slug: { contains: q } },
                        { description: { contains: q } }
                    ],
                    status: { in: ['ongoing', 'completed'] }
                },
                take: Math.min(20, take),
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    description: true,
                    coverImage: true,
                    rating: true,
                    views: true,
                    credits: {
                        select: {
                            role: true,
                            author: {
                                select: { id: true, name: true, slug: true, avatar: true }
                            }
                        }
                    },
                    genres: {
                        include: { genre: { select: { name: true, slug: true } } },
                        take: 3
                    }
                }
            })
        }

        // Search authors
        const authors: any[] = await prisma.author.findMany({
            where: {
                OR: [
                    { name: { contains: q } },
                    { slug: { contains: q } }
                ]
            },
            take: Math.min(10, take)
        })

        // Search genres
        const genres: any[] = await prisma.genre.findMany({
            where: { name: { contains: q } },
            take: Math.min(10, take)
        })

        // Search users (by name or email)
        const users: any[] = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: q } },
                    { email: { contains: q } }
                ]
            },
            take: Math.min(10, take),
            select: { id: true, name: true, email: true, image: true }
        })

        // Search scanlation groups (scans)
        const groups: any[] = await prisma.scanlationGroup.findMany({
            where: {
                OR: [
                    { name: { contains: q } },
                    { slug: { contains: q } },
                    { description: { contains: q } }
                ]
            },
            take: Math.min(10, take),
            include: { _count: { select: { members: true, webtoonGroups: true, novelGroups: true } } }
        })

        const formattedWebtoons = webtoons.map((w: any) => ({
            id: w.id,
            title: w.title,
            slug: w.slug,
            coverImage: w.coverImage,
            authors: w.credits?.map((c: any) => c.author) || [],
            author: w.credits?.find((c: any) => c.role === 'AUTHOR')?.author?.name || null,
            genres: (w.genres || []).map((g: any) => g.genre?.name).filter(Boolean),
            rating: w.rating,
            views: w.views,
            type: 'webtoon' as const
        }))

        const formattedNovels = novels.map((n: any) => ({
            id: n.id,
            title: n.title,
            slug: n.slug,
            coverImage: n.coverImage,
            authors: n.credits?.map((c: any) => c.author) || [],
            author: n.credits?.find((c: any) => c.role === 'AUTHOR')?.author?.name || null,
            genres: (n.genres || []).map((g: any) => g.genre?.name).filter(Boolean),
            rating: n.rating,
            views: n.views,
            type: 'novel' as const
        }))

        // Combine webtoons and novels for unified results
        const works = [...formattedWebtoons, ...formattedNovels]
            .sort((a, b) => (b.views || 0) - (a.views || 0))

        return res.status(200).json({ 
            webtoons: formattedWebtoons, // Keep for backward compatibility
            novels: formattedNovels,
            works, // Unified results
            authors, 
            genres, 
            users, 
            groups 
        })
    } catch (error) {
        console.error('Error performing search:', error)
        return res.status(500).json({ error: 'Failed to perform search' })
    }
}
