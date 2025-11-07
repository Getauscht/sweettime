import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)
    const { workId, chapterId } = req.query

    if (typeof workId !== 'string' || typeof chapterId !== 'string') {
        return res.status(400).json({ error: 'Invalid parameters' })
    }

    if (!session?.user) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    if (req.method === 'GET') {
        try {
            // Determine work type
            const webtoon = await prisma.webtoon.findUnique({ where: { id: workId } })
            const novel = await prisma.novel.findUnique({ where: { id: workId } })

            if (!webtoon && !novel) {
                return res.status(404).json({ error: 'Work not found' })
            }

            const type = webtoon ? 'webtoon' : 'novel'

            if (type === 'webtoon') {
                const chapter = await prisma.chapter.findUnique({
                    where: { id: chapterId },
                    include: {
                        webtoon: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                coverImage: true,
                                credits: {
                                    select: {
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
                        },
                        scanlationGroup: { select: { id: true, name: true } }
                    }
                })

                if (!chapter) {
                    return res.status(404).json({ error: 'Chapter not found' })
                }

                if (chapter.webtoonId !== workId) {
                    return res.status(400).json({ error: 'Chapter does not belong to this work' })
                }

                // Increment view count
                await Promise.all([
                    prisma.chapter.update({
                        where: { id: chapterId },
                        data: { views: { increment: 1 } }
                    }),
                    prisma.webtoon.update({
                        where: { id: workId },
                        data: { views: { increment: 1 } }
                    })
                ])

                // Get next and previous chapters
                const [nextChapter, prevChapter] = await Promise.all([
                    prisma.chapter.findFirst({
                        where: {
                            webtoonId: workId,
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
                            webtoonId: workId,
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

                const authors = chapter.webtoon.credits?.map((c: any) => c.author) || []

                return res.status(200).json({
                    chapter: {
                        id: chapter.id,
                        number: chapter.number,
                        title: chapter.title,
                        content: chapter.content,
                        contentType: 'panels',
                        views: chapter.views + 1,
                        likes: chapter.likes,
                        publishedAt: chapter.publishedAt,
                        work: {
                            id: chapter.webtoon.id,
                            title: chapter.webtoon.title,
                            slug: chapter.webtoon.slug,
                            coverImage: chapter.webtoon.coverImage,
                            type: 'webtoon',
                            authors,
                            author: authors, // Legacy
                        },
                        scanlationGroup: chapter.scanlationGroup
                    },
                    navigation: {
                        next: nextChapter,
                        prev: prevChapter
                    }
                })
            } else {
                // Novel chapter
                const chapter = await prisma.novelChapter.findUnique({
                    where: { id: chapterId },
                    include: {
                        novel: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                coverImage: true,
                            }
                        }
                    }
                })

                if (!chapter) {
                    return res.status(404).json({ error: 'Chapter not found' })
                }

                if (chapter.novelId !== workId) {
                    return res.status(400).json({ error: 'Chapter does not belong to this work' })
                }

                // Increment view count
                await Promise.all([
                    prisma.novelChapter.update({
                        where: { id: chapterId },
                        data: { views: { increment: 1 } }
                    }),
                    prisma.novel.update({
                        where: { id: workId },
                        data: { views: { increment: 1 } }
                    })
                ])

                // Get next and previous chapters
                const [nextChapter, prevChapter] = await Promise.all([
                    prisma.novelChapter.findFirst({
                        where: {
                            novelId: workId,
                            number: { gt: chapter.number }
                        },
                        orderBy: { number: 'asc' },
                        select: {
                            id: true,
                            number: true,
                            title: true
                        }
                    }),
                    prisma.novelChapter.findFirst({
                        where: {
                            novelId: workId,
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

                // Determine content type
                let contentType = 'markdown'
                try {
                    const parsed = JSON.parse(chapter.content)
                    if (parsed.blocks) contentType = 'editorjs'
                    else if (parsed.markdown) contentType = 'object'
                } catch (e) {
                    contentType = 'markdown'
                }

                return res.status(200).json({
                    chapter: {
                        id: chapter.id,
                        number: chapter.number,
                        title: chapter.title,
                        content: chapter.content,
                        contentType,
                        views: chapter.views + 1,
                        likes: chapter.likes,
                        publishedAt: chapter.publishedAt,
                        work: {
                            id: chapter.novel.id,
                            title: chapter.novel.title,
                            slug: chapter.novel.slug,
                            coverImage: chapter.novel.coverImage,
                            type: 'novel',
                            authors: [],
                            author: [],
                        }
                    },
                    navigation: {
                        next: nextChapter,
                        prev: prevChapter
                    }
                })
            }
        } catch (error: any) {
            console.error('Error fetching chapter:', error)
            return res.status(500).json({ error: 'Failed to fetch chapter' })
        }
    } else if (req.method === 'PATCH') {
        try {
            const { title, content, number, scanlationGroupId } = req.body as any

            // Determine work type
            const webtoon = await prisma.webtoon.findUnique({ where: { id: workId } })
            const novel = await prisma.novel.findUnique({ where: { id: workId } })

            if (!webtoon && !novel) {
                return res.status(404).json({ error: 'Work not found' })
            }

            const type = webtoon ? 'webtoon' : 'novel'

            // Load chapter for validation
            let chapter: any
            if (type === 'webtoon') {
                chapter = await prisma.chapter.findUnique({ where: { id: chapterId } })
                if (!chapter || chapter.webtoonId !== workId) return res.status(404).json({ error: 'Chapter not found' })
            } else {
                chapter = await prisma.novelChapter.findUnique({ where: { id: chapterId } })
                if (!chapter || chapter.novelId !== workId) return res.status(404).json({ error: 'Chapter not found' })
            }

            const userId = (session.user as any)?.id
            const dbUser = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } })
            const userIsAdmin = dbUser?.role?.name === 'admin'

            // Authorization: allow admins or members of the chapter's group (or the target group when reassigning)
            if (!userIsAdmin) {
                const allowedGroupIds: string[] = []
                if (chapter.scanlationGroupId) allowedGroupIds.push(chapter.scanlationGroupId)
                if (scanlationGroupId) allowedGroupIds.push(scanlationGroupId)

                if (allowedGroupIds.length === 0) {
                    return res.status(403).json({ error: 'Not allowed to edit this chapter' })
                }

                const member = await prisma.groupMember.findFirst({ where: { userId, groupId: { in: allowedGroupIds } } })
                if (!member) {
                    return res.status(403).json({ error: 'Not allowed to edit this chapter' })
                }
            }

            // Ensure number uniqueness if changing
            if (typeof number === 'number') {
                const existing = type === 'webtoon'
                    ? await prisma.chapter.findFirst({ where: { webtoonId: workId, number, id: { not: chapterId } } })
                    : await prisma.novelChapter.findFirst({ where: { novelId: workId, number, id: { not: chapterId } } })

                if (existing) {
                    return res.status(400).json({ error: 'Another chapter with this number already exists' })
                }
            }

            const data: any = {}
            if (title !== undefined) data.title = title || null
            if (typeof number === 'number') data.number = number
            if (scanlationGroupId !== undefined) data.scanlationGroupId = scanlationGroupId
            if (content !== undefined) data.content = content

            let updated: any
            if (type === 'webtoon') {
                updated = await prisma.chapter.update({ where: { id: chapterId }, data })
            } else {
                updated = await prisma.novelChapter.update({ where: { id: chapterId }, data })
            }

            return res.status(200).json({ chapter: updated })
        } catch (error: any) {
            console.error('Error updating chapter:', error)
            return res.status(500).json({ error: 'Failed to update chapter', details: error.message })
        }
    } else if (req.method === 'DELETE') {
        try {
            // Check admin permission
            const userId = (session.user as any)?.id
            const dbUser = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } })
            const userIsAdmin = dbUser?.role?.name === 'admin'
            
            if (!userIsAdmin) {
                return res.status(403).json({ error: 'Only admins can delete chapters' })
            }

            // Determine type and delete
            const webtoon = await prisma.webtoon.findUnique({ where: { id: workId } })
            const novel = await prisma.novel.findUnique({ where: { id: workId } })

            if (!webtoon && !novel) {
                return res.status(404).json({ error: 'Work not found' })
            }

            const type = webtoon ? 'webtoon' : 'novel'

            if (type === 'webtoon') {
                const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } })
                if (!chapter || chapter.webtoonId !== workId) {
                    return res.status(404).json({ error: 'Chapter not found' })
                }
                await prisma.chapter.delete({ where: { id: chapterId } })
            } else {
                const chapter = await prisma.novelChapter.findUnique({ where: { id: chapterId } })
                if (!chapter || chapter.novelId !== workId) {
                    return res.status(404).json({ error: 'Chapter not found' })
                }
                await prisma.novelChapter.delete({ where: { id: chapterId } })
            }

            return res.status(200).json({ message: 'Chapter deleted' })
        } catch (error: any) {
            console.error('Error deleting chapter:', error)
            return res.status(500).json({ error: 'Failed to delete chapter' })
        }
    } else {
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
        return res.status(405).end()
    }
}
