import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
        const favorites = await prisma.favorite.findMany({
            where: { userId: session.user.id },
            include: {
                webtoon: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        description: true,
                        coverImage: true,
                        status: true,
                        views: true,
                        likes: true,
                        rating: true,
                        author: {
                            select: {
                                name: true,
                                slug: true
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
                            }
                        },
                        _count: {
                            select: {
                                chapters: true
                            }
                        }
                    }
                },
                novel: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        description: true,
                        coverImage: true,
                        status: true,
                        views: true,
                        likes: true,
                        rating: true,
                        _count: { select: { chapters: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return res.status(200).json({
            favorites: favorites.map(f => ({
                id: f.id,
                createdAt: f.createdAt,
                item: f.webtoon ? {
                    type: 'webtoon',
                    data: {
                        ...f.webtoon,
                        totalChapters: f.webtoon._count?.chapters ?? 0,
                        genres: (f.webtoon.genres || []).map(wg => wg.genre)
                    }
                } : f.novel ? {
                    type: 'novel',
                    data: {
                        ...f.novel,
                        totalChapters: f.novel._count?.chapters ?? 0,
                    }
                } : null
            }))
        })
    } catch (error) {
        console.error('Error fetching favorites:', error)
        return res.status(500).json({ error: 'Failed to fetch favorites' })
    }
}
