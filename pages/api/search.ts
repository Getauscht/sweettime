import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

// Generic search endpoint that looks for webtoons, authors and genres
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { q, limit = '20' } = req.query

    if (!q || typeof q !== 'string' || q.length < 2) {
        return res.status(200).json({ webtoons: [], authors: [], genres: [] })
    }

    try {
        const take = Math.min(100, parseInt(limit as string, 10) || 20)

        // Search webtoons by title or slug or description
        const webtoons: any[] = await prisma.webtoon.findMany({
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

        const formattedWebtoons = webtoons.map((w: any) => ({
            id: w.id,
            title: w.title,
            slug: w.slug,
            coverImage: w.coverImage,
            authors: w.credits?.map((c: any) => c.author) || [],
            author: w.credits?.find((c: any) => c.role === 'AUTHOR')?.author?.name || null,
            genres: (w.genres || []).map((g: any) => g.genre?.name).filter(Boolean),
            rating: w.rating,
            views: w.views
        }))

        return res.status(200).json({ webtoons: formattedWebtoons, authors, genres })
    } catch (error) {
        console.error('Error performing search:', error)
        return res.status(500).json({ error: 'Failed to perform search' })
    }
}
