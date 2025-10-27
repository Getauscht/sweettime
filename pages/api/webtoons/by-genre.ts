import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { genre, limit = '10' } = req.query

        if (!genre || typeof genre !== 'string') {
            return res.status(400).json({ error: 'Genre parameter is required' })
        }

        const webtoons = await prisma.webtoon.findMany({
            take: parseInt(limit as string),
            orderBy: { views: 'desc' },
            where: {
                status: {
                    in: ['ongoing', 'completed']
                },
                genres: {
                    some: {
                        genre: {
                            slug: genre
                        }
                    }
                }
            },
            select: {
                id: true,
                title: true,
                slug: true,
                coverImage: true,
                views: true,
                likes: true,
                rating: true,
                status: true,
                credits: {
                    select: {
                        role: true,
                        author: {
                            select: {
                                name: true,
                                avatar: true,
                                slug: true,
                                id: true
                            }
                        }
                    },
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
            coverImage: webtoon.coverImage,
            // standardized authors array
            authors: webtoon.credits?.map(c => c.author) || [],
            // legacy single-author fields for compatibility
            author: webtoon.credits.find(c => c.role === 'AUTHOR')?.author.name || 'Unknown',
            authorAvatar: webtoon.credits.find(c => c.role === 'AUTHOR')?.author.avatar || null,
            genres: webtoon.genres.map(wg => wg.genre.name),
            views: webtoon.views,
            likes: webtoon.likes,
            rating: webtoon.rating,
            status: webtoon.status
        }))

        return res.status(200).json({ webtoons: formattedWebtoons })
    } catch (error) {
        console.error('Error fetching webtoons by genre:', error)
        return res.status(500).json({ error: 'Failed to fetch webtoons by genre' })
    }
}
