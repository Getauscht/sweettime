/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { authOptions } from '../../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'

async function getRepliesHandler(req: NextApiRequest, res: NextApiResponse) {
    const { commentId } = req.query

    if (typeof commentId !== 'string') {
        return res.status(400).json({ error: 'Invalid comment ID' })
    }

    try {
        const sessionUserId = (await (async () => {
            try {
                const { getServerSession } = await import('next-auth')
                const session = await getServerSession(req as any, res as any, authOptions as any)
                return (session as any)?.user?.id
            } catch {
                return null
            }
        })())

        const replies = await prisma.comment.findMany({
            where: {
                parentId: commentId,
                deletedAt: null
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
                mentions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        likedBy: true,
                        replies: true
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        })

        // Transform to include like count and liked status
        const repliesWithLikes = await Promise.all(replies.map(async (reply) => {
            const liked = sessionUserId ? await prisma.commentLike.findUnique({
                where: {
                    userId_commentId: {
                        userId: sessionUserId,
                        commentId: reply.id
                    }
                }
            }) : null

            return {
                ...reply,
                likes: reply._count.likedBy,
                replyCount: reply._count.replies,
                liked: !!liked,
                _count: undefined
            }
        }))

        return res.status(200).json({ replies: repliesWithLikes })
    } catch (error) {
        console.error('Error fetching replies:', error)
        return res.status(500).json({ error: 'Failed to fetch replies' })
    }
}

async function postReplyHandler(req: NextApiRequest, res: NextApiResponse) {
    const { commentId } = req.query

    if (typeof commentId !== 'string') {
        return res.status(400).json({ error: 'Invalid comment ID' })
    }

    const bodySchema = z.object({
        content: z.string().min(1, 'Content is required'),
        mentions: z.array(z.string()).optional(),
    })

    const parsed = bodySchema.safeParse(req.body)

    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })
    }

    const { content, mentions } = parsed.data

    try {
        // Verify parent comment exists
        const parentComment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                chapter: { select: { number: true, webtoon: { select: { slug: true } } } },
                webtoon: { select: { slug: true } }
            }
        })

        if (!parentComment) {
            return res.status(404).json({ error: 'Parent comment not found' })
        }

        const userId = (req as any).auth?.userId

        // Create reply
        const reply = await prisma.comment.create({
            data: {
                userId,
                webtoonId: parentComment.webtoonId,
                chapterId: parentComment.chapterId,
                parentId: commentId,
                content,
                mentions: mentions?.length
                    ? {
                        create: mentions.map((userId: string) => ({
                            userId,
                        })),
                    }
                    : undefined,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
                webtoon: { select: { slug: true } },
                chapter: { select: { number: true, webtoon: { select: { slug: true } } } },
                mentions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        likedBy: true,
                        replies: true
                    }
                }
            },
        })

        // Create notification for parent comment author (if not replying to self)
        if (parentComment.userId !== userId) {
            let link: string | undefined
            if (reply.chapter && reply.chapter.webtoon) {
                link = `/webtoon/${reply.chapter.webtoon.slug}/chapter/${reply.chapter.number}?comment=${reply.id}`
            } else if (reply.webtoon) {
                link = `/webtoon/${reply.webtoon.slug}?comment=${reply.id}`
            }
            await (await import('@/lib/notifications')).createNotificationAndPush({
                userId: parentComment.userId,
                type: 'reply',
                title: 'Nova resposta ao seu comentário',
                message: `${(req as any).auth?.session?.user?.name || 'Um usuário'} respondeu ao seu comentário`,
                link,
            })
        }

        // Create notifications for mentioned users
        if (mentions?.length) {
            let link: string | undefined
            if (reply.chapter && reply.chapter.webtoon) {
                link = `/webtoon/${reply.chapter.webtoon.slug}/chapter/${reply.chapter.number}?comment=${reply.id}`
            } else if (reply.webtoon) {
                link = `/webtoon/${reply.webtoon.slug}?comment=${reply.id}`
            }
            const items = mentions.map((userId: string) => ({
                userId,
                type: 'mention',
                title: 'Você foi mencionado',
                message: `${(req as any).auth?.session?.user?.name || 'Um usuário'} mencionou você em uma resposta`,
                link,
            }))
            await (await import('@/lib/notifications')).createNotificationsAndPushMany(items)
        }

        // Transform reply to include like count
        const replyWithLikes = {
            ...reply,
            likes: reply._count.likedBy,
            replyCount: reply._count.replies,
            _count: undefined
        }

        return res.status(201).json({ reply: replyWithLikes })
    } catch (error) {
        console.error('Error creating reply:', error)
        return res.status(500).json({ error: 'Failed to create reply' })
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') return getRepliesHandler(req, res)
    if (req.method === 'POST') return withAuth(postReplyHandler, authOptions)(req, res)
    return res.status(405).json({ error: 'Method not allowed' })
}
