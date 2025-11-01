import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const session = await getServerSession(req, res, authOptions)

    const { webtoonId, chapterId } = req.query

    if (typeof webtoonId !== 'string' || typeof chapterId !== 'string') {
        return res.status(400).json({ error: 'Invalid parameters' })
    }

    if (!session?.user) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    if (req.method == 'GET') {

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
        } catch (error: any) {
            console.error('Error fetching chapter:', error)
            return res.status(500).json({ error: 'Failed to fetch chapter' })
        }
    } else if (req.method === 'DELETE') {
        try {
            // Get chapter
            const chapter = await prisma.chapter.findUnique({
                where: { id: chapterId },
                include: { scanlationGroup: true },
            })

            if (!chapter) {
                return res.status(404).json({ error: 'Chapter not found' })
            }

            // Verify webtoon matches
            if (chapter.webtoonId !== webtoonId) {
                return res.status(400).json({ error: 'Chapter does not belong to this webtoon' })
            }

            // Check if user is an admin. Deletion of chapters is restricted to admins.
            const userId = (session.user as any)?.id
            const dbUser = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } })
            const userIsAdmin = dbUser?.role?.name === 'admin'
            if (!userIsAdmin) {
                return res.status(403).json({
                    error: 'Only admins can delete chapters',
                })
            }

            // Delete chapter
            await prisma.chapter.delete({ where: { id: chapterId } })

            return res.status(200).json({ message: 'Chapter deleted' })
        } catch (error: any) {
            console.error('Error deleting chapter:', error)
            return res.status(500).json({ error: 'Failed to delete chapter' })
        }
    } else {
        res.setHeader('Allow', ['GET', 'DELETE'])
        return res.status(405).end()
    }
}
