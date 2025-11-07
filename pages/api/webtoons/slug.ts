import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { slug } = req.query

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (typeof slug !== 'string') {
        return res.status(400).json({ error: 'Invalid slug' })
    }

    try {
        const webtoon = await prisma.webtoon.findUnique({
            where: { slug },
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                coverImage: true,
                bannerImage: true,
                status: true,
                views: true,
                likes: true,
                rating: true,
                createdAt: true,
                updatedAt: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        bio: true,
                        avatar: true,
                        socialLinks: true
                    }
                },
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
                views: true
            },
            orderBy: { number: 'asc' }
        })

        // Format response
        const response = {
            id: webtoon.id,
            title: webtoon.title,
            slug: webtoon.slug,
            description: webtoon.description,
            coverImage: webtoon.coverImage,
            bannerImage: webtoon.bannerImage,
            status: webtoon.status,
            views: webtoon.views,
            likes: webtoon.likes,
            rating: webtoon.rating,
            createdAt: webtoon.createdAt,
            updatedAt: webtoon.updatedAt,
            // Keep legacy `author` field (array) for backward compatibility
            author: webtoon.author,
            // Standardized `authors` array (same data as `author`)
            authors: webtoon.author,
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
