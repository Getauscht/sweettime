import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/obra/featured?limit=10
 * Returns featured webtoons and novels combined, sorted by rating and views
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { limit = '5' } = req.query
        const parsedLimit = parseInt(limit as string, 10) || 5

        // Get featured webtoons (highest rated with good view count)
        const webtoons = await prisma.webtoon.findMany({
            take: parsedLimit,
            orderBy: [
                { rating: 'desc' },
                { views: 'desc' }
            ],
            where: {
                status: {
                    in: ['ongoing', 'completed']
                },
                rating: {
                    gte: 4.0
                }
            },
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                coverImage: true,
                bannerImage: true,
                views: true,
                likes: true,
                rating: true,
                status: true,
                credits: {
                    select: {
                        role: true,
                        author: {
                            select: { id: true, name: true, slug: true, avatar: true }
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
                }
            }
        })

        // Get featured novels (highest views)
        const novels = await prisma.novel.findMany({
            take: parsedLimit,
            orderBy: [
                { views: 'desc' }
            ],
            where: {
                status: {
                    in: ['ongoing', 'completed']
                }
            },
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                coverImage: true,
                bannerImage: true,
                views: true,
                status: true,
                credits: {
                    select: {
                        role: true,
                        author: {
                            select: { id: true, name: true, slug: true, avatar: true }
                        }
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
            bannerImage: webtoon.bannerImage,
            authors: webtoon.credits?.map(c => c.author) || [],
            author: webtoon.credits?.find(c => c.role === 'AUTHOR')?.author.name || null,
            genres: webtoon.genres.map(wg => wg.genre.name),
            views: webtoon.views,
            likes: webtoon.likes,
            rating: webtoon.rating,
            status: webtoon.status,
            type: 'webtoon' as const
        }))

        // Format novels
        const formattedNovels = novels.map(novel => ({
            id: novel.id,
            title: novel.title,
            slug: novel.slug,
            description: novel.description,
            coverImage: novel.coverImage,
            bannerImage: novel.bannerImage,
            authors: novel.credits?.map(c => c.author) || [],
            author: novel.credits?.find(c => c.role === 'AUTHOR')?.author.name || null,
            genres: [] as string[],
            views: novel.views,
            likes: 0,
            rating: null,
            status: novel.status,
            type: 'novel' as const
        }))

        // Combine and sort by rating/views
        const combined = [...formattedWebtoons, ...formattedNovels]
            .sort((a, b) => {
                // Prioritize rating if available
                if (a.rating && b.rating) return (b.rating - a.rating)
                if (a.rating) return -1
                if (b.rating) return 1
                // Fall back to views
                return (b.views || 0) - (a.views || 0)
            })
            .slice(0, parsedLimit)

        return res.status(200).json({ webtoons: combined })
    } catch (error) {
        console.error('Error fetching featured works:', error)
        return res.status(500).json({ error: 'Failed to fetch featured works' })
    }
}

