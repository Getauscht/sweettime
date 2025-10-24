import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { webtoonId, chapterId } = req.query

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (typeof webtoonId !== 'string' || typeof chapterId !== 'string') {
        return res.status(400).json({ error: 'Invalid parameters' })
    }

    try {
        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
            include: {
                webtoon: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        coverImage: true,
                        // webtoon.author is an array of Author
                        author: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                avatar: true
                            }
                        }
                    }
                }
            }
        })

        if (!chapter) {
            return res.status(404).json({ error: 'Chapter not found' })
        }

        if (chapter.webtoonId !== webtoonId) {
            return res.status(400).json({ error: 'Chapter does not belong to this webtoon' })
        }

        // Increment view count
        await prisma.chapter.update({
            where: { id: chapterId },
            data: { views: { increment: 1 } }
        })

        // Also increment webtoon views
        await prisma.webtoon.update({
            where: { id: webtoonId },
            data: { views: { increment: 1 } }
        })

        // Get next and previous chapters
        const [nextChapter, prevChapter] = await Promise.all([
            prisma.chapter.findFirst({
                where: {
                    webtoonId,
                    number: { gt: chapter.number }
                },
                orderBy: { number: 'asc' },
                select: {
                    id: true,
                    number: true,
                    title: true
                }
            }),
            prisma.chapter.findFirst({
                where: {
                    webtoonId,
                    number: { lt: chapter.number }
                },
                orderBy: { number: 'desc' },
                select: {
                    id: true,
                    number: true,
                    title: true
                }
            })
        ])

        return res.status(200).json({
            chapter: {
                id: chapter.id,
                number: chapter.number,
                title: chapter.title,
                content: chapter.content,
                views: chapter.views + 1,
                likes: chapter.likes,
                publishedAt: chapter.publishedAt,
                webtoon: {
                    ...chapter.webtoon,
                    // standardized authors array
                    authors: chapter.webtoon.author || [],
                    // legacy `author` kept for backward compatibility
                    author: chapter.webtoon.author || [],
                }
            },
            navigation: {
                next: nextChapter,
                prev: prevChapter
            }
        })
    } catch (error) {
        console.error('Error fetching chapter:', error)
        return res.status(500).json({ error: 'Failed to fetch chapter' })
    }
}
