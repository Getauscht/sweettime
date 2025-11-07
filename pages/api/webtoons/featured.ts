import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { limit = '5' } = req.query

        // Get featured webtoons (highest rated with good view count)
        const webtoons = await prisma.webtoon.findMany({
            take: parseInt(limit as string),
            orderBy: [
                { rating: 'desc' },
                { views: 'desc' }
            ],
            where: {
                status: {
                    in: ['ongoing', 'completed']
                },
                rating: {
                    gte: 4.0 // Only feature highly rated webtoons
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

        const formattedWebtoons = webtoons.map(webtoon => ({
            id: webtoon.id,
            title: webtoon.title,
            slug: webtoon.slug,
            description: webtoon.description,
            coverImage: webtoon.coverImage,
            bannerImage: webtoon.bannerImage,
            // include standardized authors array and legacy author string (first author)
            authors: webtoon.credits?.map(c => c.author) || [],
            author: webtoon.credits?.find(c => c.role === 'AUTHOR')?.author.name || null,
            genres: webtoon.genres.map(wg => wg.genre.name),
            views: webtoon.views,
            likes: webtoon.likes,
            rating: webtoon.rating,
            status: webtoon.status
        }))

        return res.status(200).json({ webtoons: formattedWebtoons })
    } catch (error) {
        console.error('Error fetching featured webtoons:', error)
        return res.status(500).json({ error: 'Failed to fetch featured webtoons' })
    }
}
