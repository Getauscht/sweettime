import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/obra/recent?limit=10
 * Returns recently updated webtoons and novels combined
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { limit = '10' } = req.query
        const parsedLimit = parseInt(limit as string, 10) || 10

        // Get recently updated webtoons
        const webtoons = await prisma.webtoon.findMany({
            take: parsedLimit,
            orderBy: {
                updatedAt: 'desc'
            },
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                coverImage: true,
                views: true,
                likes: true,
                rating: true,
                status: true,
                updatedAt: true,
                credits: {
                    select: {
                        role: true,
                        author: {
                            select: { id: true, name: true, slug: true }
                        }
                    }
                },
                genres: {
                    include: {
                        genre: {
                            select: {
                                name: true,
                                slug: true
                            }
                        }
                    },
                    take: 3
                },
                chapters: {
                    orderBy: {
                        number: 'desc'
                    },
                    take: 1,
                    select: {
                        number: true
                    }
                }
            }
        })

        // Get recently updated novels
        const novels = await prisma.novel.findMany({
            take: parsedLimit,
            orderBy: {
                updatedAt: 'desc'
            },
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                coverImage: true,
                views: true,
                status: true,
                updatedAt: true,
                credits: {
                    select: {
                        role: true,
                        author: {
                            select: { id: true, name: true, slug: true }
                        }
                    }
                },
                chapters: {
                    orderBy: {
                        number: 'desc'
                    },
                    take: 1,
                    select: {
                        number: true
                    }
                }
            }
        })

        // Format webtoons
        const formattedWebtoons = webtoons.map(webtoon => ({
            id: webtoon.id,
            title: webtoon.title,
            slug: webtoon.slug,
            description: webtoon.description,
            coverImage: webtoon.coverImage,
            authors: webtoon.credits?.map(c => c.author) || [],
            author: webtoon.credits?.find(c => c.role === 'AUTHOR')?.author.name || null,
            genres: webtoon.genres.map(wg => wg.genre.name),
            views: webtoon.views,
            likes: webtoon.likes,
            rating: webtoon.rating,
            status: webtoon.status,
            updatedAt: webtoon.updatedAt,
            latestChapter: webtoon.chapters[0]?.number || null,
            type: 'webtoon' as const
        }))

        // Format novels
        const formattedNovels = novels.map(novel => ({
            id: novel.id,
            title: novel.title,
            slug: novel.slug,
            description: novel.description,
            coverImage: novel.coverImage,
            authors: novel.credits?.map(c => c.author) || [],
            author: novel.credits?.find(c => c.role === 'AUTHOR')?.author.name || null,
            genres: [] as string[],
            views: novel.views,
            likes: 0,
            rating: null,
            status: novel.status,
            updatedAt: novel.updatedAt,
            latestChapter: novel.chapters[0]?.number || null,
            type: 'novel' as const
        }))

        // Combine and sort by updatedAt
        const combined = [...formattedWebtoons, ...formattedNovels]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, parsedLimit)

        return res.status(200).json({ webtoons: combined })
    } catch (error) {
        console.error('Error fetching recent works:', error)
        return res.status(500).json({ error: 'Failed to fetch recent works' })
    }
}
