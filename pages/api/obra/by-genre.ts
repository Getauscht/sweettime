import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/obra/by-genre?genre=Action&limit=10
 * Returns webtoons by genre (novels don't have genres in the current schema)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { genre, limit = '10' } = req.query
        const parsedLimit = parseInt(limit as string, 10) || 10

        if (!genre || typeof genre !== 'string') {
            return res.status(400).json({ error: 'Genre parameter is required' })
        }

        // Find the genre
        const genreRecord = await prisma.genre.findFirst({
            where: {
                OR: [
                    { slug: genre.toLowerCase() },
                    { name: { equals: genre } }
                ]
            }
        })

        if (!genreRecord) {
            return res.status(404).json({ error: 'Genre not found' })
        }

        // Get webtoons by genre
        const webtoons = await prisma.webtoon.findMany({
            take: parsedLimit,
            where: {
                genres: {
                    some: {
                        genreId: genreRecord.id
                    }
                }
            },
            orderBy: {
                views: 'desc'
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
                }
            }
        })

        // Get novels by genre
        const novels = await prisma.novel.findMany({
            take: parsedLimit,
            where: {
                genres: {
                    some: {
                        genreId: genreRecord.id
                    }
                }
            },
            orderBy: {
                views: 'desc'
            },
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                coverImage: true,
                views: true,
                status: true,
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
                }
            }
        })

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
            type: 'webtoon' as const
        }))

        const formattedNovels = novels.map(novel => ({
            id: novel.id,
            title: novel.title,
            slug: novel.slug,
            description: novel.description,
            coverImage: novel.coverImage,
            authors: novel.credits?.map(c => c.author) || [],
            author: novel.credits?.find(c => c.role === 'AUTHOR')?.author.name || null,
            genres: novel.genres.map(ng => ng.genre.name),
            views: novel.views,
            likes: 0,
            rating: null,
            status: novel.status,
            type: 'novel' as const
        }))

        // Combine and sort by views
        const combined = [...formattedWebtoons, ...formattedNovels]
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, parsedLimit)

        return res.status(200).json({ webtoons: combined })
    } catch (error) {
        console.error('Error fetching webtoons by genre:', error)
        return res.status(500).json({ error: 'Failed to fetch webtoons by genre' })
    }
}
