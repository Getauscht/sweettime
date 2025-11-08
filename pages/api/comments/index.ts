/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // GET - List comments (public). We lazily load session only to compute user-specific liked state.
    if (req.method === 'GET') {
        const { webtoonId, chapterId, novelId, novelChapterId, sort } = req.query

        try {
            const where: Prisma.CommentWhereInput = {
                deletedAt: null
            }
            if (webtoonId) where.webtoonId = webtoonId as string
            if (chapterId) where.chapterId = chapterId as string
            if (novelId) where.novelId = novelId as string
            if (novelChapterId) where.novelChapterId = novelChapterId as string

            // Only fetch top-level comments (no parent)
            where.parentId = null

            // Determine ordering: 'top' => by likes desc, then newest; 'new' or default => newest first
            let orderBy: Prisma.CommentOrderByWithRelationInput | Prisma.CommentOrderByWithRelationInput[] = { createdAt: 'desc' }
            if (sort === 'top') {
                orderBy = [{ likes: 'desc' }, { createdAt: 'desc' }]
            } else if (sort === 'new') {
                orderBy = { createdAt: 'desc' }
            }

            const comments = await prisma.comment.findMany({
                where,
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
                    replies: {
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
                                    replies: {
                                        where: {
                                            deletedAt: null
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: {
                            createdAt: 'asc'
                        }
                    },
                    _count: {
                        select: {
                            likedBy: true,
                            replies: true
                        }
                    }
                },
                orderBy,
                take: 50,
            })

            // Transform comments to include like information
            // Lazily obtain session to check liked status for the current user (if any)
            let userId: string | undefined | null = null
            try {
                const { getServerSession } = await import('next-auth')
                const { authOptions } = await import('../auth/[...nextauth]')
                const session = await getServerSession(req as any, res as any, authOptions as any) as any
                userId = session?.user?.id
            } catch {
                userId = null
            }
            const transformedComments = await Promise.all(comments.map(async (comment) => {
                const liked = userId ? await prisma.commentLike.findUnique({
                    where: {
                        userId_commentId: {
                            userId,
                            commentId: comment.id
                        }
                    }
                }) : null

                // Transform replies
                const transformedReplies = await Promise.all(comment.replies.map(async (reply) => {
                    const replyLiked = userId ? await prisma.commentLike.findUnique({
                        where: {
                            userId_commentId: {
                                userId,
                                commentId: reply.id
                            }
                        }
                    }) : null

                    return {
                        ...reply,
                        likes: reply._count.likedBy,
                        replyCount: reply._count.replies,
                        liked: !!replyLiked,
                        _count: undefined
                    }
                }))

                return {
                    ...comment,
                    likes: comment._count.likedBy,
                    replyCount: comment._count.replies,
                    liked: !!liked,
                    replies: transformedReplies,
                    _count: undefined
                }
            }))

            return res.status(200).json({ comments: transformedComments })
        } catch (error) {
            console.error('Error fetching comments:', error)
            return res.status(500).json({ error: 'Failed to fetch comments' })
        }
    }
    // POST - Create comment (requires auth)
    if (req.method === 'POST') {
        // Delegate to protected handler which will attach req.auth
        const postHandler = async (req: NextApiRequest, res: NextApiResponse) => {
            const bodySchema = z.object({
                webtoonId: z.string().optional(),
                chapterId: z.string().optional(),
                novelId: z.string().optional(),
                novelChapterId: z.string().optional(),
                content: z.string().min(1, 'Content is required'),
                mentions: z.array(z.string()).optional(),
            })

            const parsed = bodySchema.safeParse(req.body)

            if (!parsed.success) {
                return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })
            }

            const { webtoonId, chapterId, novelId, novelChapterId, content, mentions } = parsed.data

            if (!webtoonId && !chapterId && !novelId && !novelChapterId) {
                return res.status(400).json({ error: 'Either webtoonId/chapterId or novelId/novelChapterId must be provided' })
            }

            try {
                const userId = (req as any).auth?.userId

                const comment = await prisma.comment.create({
                    data: {
                        userId,
                        webtoonId: webtoonId || null,
                        chapterId: chapterId || null,
                        novelId: novelId || null,
                        novelChapterId: novelChapterId || null,
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
                        novel: { select: { slug: true } },
                        novelChapter: { select: { number: true, novel: { select: { slug: true } } } },
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
                    },
                })

                // Create notifications for mentioned users
                if (mentions?.length) {
                    // Build deep link to comment
                    let link: string | undefined
                    if (comment.chapter && comment.chapter.webtoon) {
                        link = `/webtoon/${comment.chapter.webtoon.slug}/chapter/${comment.chapter.number}?comment=${comment.id}`
                    } else if (comment.webtoon) {
                        link = `/webtoon/${comment.webtoon.slug}?comment=${comment.id}`
                    } else if (comment.novelChapter && comment.novelChapter.novel) {
                        link = `/novel/${comment.novelChapter.novel.slug}/chapter/${comment.novelChapter.number}?comment=${comment.id}`
                    } else if (comment.novel) {
                        link = `/novel/${comment.novel.slug}?comment=${comment.id}`
                    }

                    const actorName = (req as any).auth?.session?.user?.name || 'Alguém'

                    const items = mentions.map((userId: string) => ({
                        userId,
                        type: 'mention',
                        title: 'Você foi mencionado',
                        message: `${actorName} mencionou você em um comentário`,
                        link,
                    }))
                    // create notifications and send web push
                    await (await import('@/lib/notifications')).createNotificationsAndPushMany(items)
                }

                return res.status(201).json({ comment })
            } catch (error) {
                console.error('Error creating comment:', error)
                return res.status(500).json({ error: 'Failed to create comment' })
            }
        }

        return withAuth(postHandler, authOptions)(req, res)
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
