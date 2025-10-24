import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { webtoonId } = req.query

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (typeof webtoonId !== 'string') {
        return res.status(400).json({ error: 'Invalid webtoon identifier' })
    }

    try {
        // Try to find by slug first, then by ID
        const webtoon = await prisma.webtoon.findFirst({
            where: {
                OR: [
                    { slug: webtoonId },
                    { id: webtoonId }
                ]
            },
            include: {
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
                        publishedAt: true
                    },
                    orderBy: { number: 'desc' },
                    take: 5 // Latest 5 chapters for preview
                },
                _count: {
                    select: {
                        chapters: true
                    }
                }
            }
        })

        if (!webtoon) {
            return res.status(404).json({ error: 'Webtoon not found' })
        }

        console.log("credits", webtoon.credits)

        // Get total chapters count
        const totalChapters = webtoon._count.chapters

        // Get all chapters for chapter list
        const allChapters = await prisma.chapter.findMany({
            where: { webtoonId: webtoon.id },
            select: {
                id: true,
                number: true,
                title: true,
                publishedAt: true,
                views: true,
            },
            orderBy: { number: 'asc' }
        })

        // Format response
        const authors = webtoon.credits?.map(c => c.author) || []
        const response = {
            id: webtoon.id,
            title: webtoon.title,
            slug: webtoon.slug,
            description: webtoon.description,
            coverImage: webtoon.coverImage,
            // Legacy key (array) kept for backward compatibility
            author: authors,
            // Standardized authors array
            authors,
            status: webtoon.status,
            views: webtoon.views,
            likes: webtoon.likes,
            rating: webtoon.rating,
            createdAt: webtoon.createdAt,
            updatedAt: webtoon.updatedAt,
            genres: webtoon.genres.map(wg => wg.genre),
            latestChapters: webtoon.chapters,
            totalChapters,
            allChapters
        }

        return res.status(200).json({ webtoon: response })
    } catch (error) {
        console.error('Error fetching webtoon:', error)
        return res.status(500).json({ error: 'Failed to fetch webtoon' })
    }
}
