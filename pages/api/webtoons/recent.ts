import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { limit = '10' } = req.query

        const webtoons = await prisma.webtoon.findMany({
            take: parseInt(limit as string),
            orderBy: { updatedAt: 'desc' },
            include: {
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
                },
                chapters: {
                    select: {
                        id: true,
                        number: true,
                        title: true,
                        publishedAt: true
                    },
                    orderBy: { publishedAt: 'desc' },
                    take: 1
                }
            },
            where: {
                status: {
                    in: ['ongoing', 'completed']
                }
            }
        })

        const formattedWebtoons = webtoons.map(webtoon => ({
            id: webtoon.id,
            title: webtoon.title,
            slug: webtoon.slug,
            coverImage: webtoon.coverImage,
            // provide both legacy author string and standardized authors array when available
            authors: webtoon.credits?.map(c => c.author) || [],
            author: webtoon.credits?.find(c => c.role === 'AUTHOR')?.author.name || null,
            genres: webtoon.genres.map(wg => wg.genre.name),
            views: webtoon.views,
            likes: webtoon.likes,
            rating: webtoon.rating,
            status: webtoon.status,
            latestChapter: webtoon.chapters[0]?.number || 0,
            latestChapterTitle: webtoon.chapters[0]?.title || '',
            updatedAt: webtoon.updatedAt
        }))

        return res.status(200).json({ webtoons: formattedWebtoons })
    } catch (error) {
        console.error('Error fetching recent webtoons:', error)
        return res.status(500).json({ error: 'Failed to fetch recent webtoons' })
    }
}
