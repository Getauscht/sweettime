import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    // GET - List comments
    if (req.method === 'GET') {
        const { webtoonId, chapterId, sort } = req.query

        try {
            const where: Prisma.CommentWhereInput = {
                deletedAt: null
            }
            if (webtoonId) where.webtoonId = webtoonId as string
            if (chapterId) where.chapterId = chapterId as string

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
            const userId = session?.user?.id
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

    // POST - Create comment
    if (req.method === 'POST') {
        if (!session?.user?.id) {
            return res.status(401).json({ error: 'Unauthorized' })
        }
        const bodySchema = z.object({
            webtoonId: z.string().optional(),
            chapterId: z.string().optional(),
            content: z.string().min(1, 'Content is required'),
            mentions: z.array(z.string()).optional(),
        })

        const parsed = bodySchema.safeParse(req.body)

        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })
        }

        const { webtoonId, chapterId, content, mentions } = parsed.data

        if (!webtoonId && !chapterId) {
            return res.status(400).json({ error: 'Either webtoonId or chapterId must be provided' })
        }

        try {
            const comment = await prisma.comment.create({
                data: {
                    userId: session.user.id,
                    webtoonId: webtoonId || null,
                    chapterId: chapterId || null,
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
                    webtoon: {
                        select: { slug: true }
                    },
                    chapter: {
                        select: {
                            number: true,
                            webtoon: { select: { slug: true } }
                        }
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
                }
                await prisma.notification.createMany({
                    data: mentions.map((userId: string) => ({
                        userId,
                        type: 'mention',
                        title: 'Você foi mencionado',
                        message: `${session.user.name} mencionou você em um comentário`,
                        link,
                    })),
                })
            }

            return res.status(201).json({ comment })
        } catch (error) {
            console.error('Error creating comment:', error)
            return res.status(500).json({ error: 'Failed to create comment' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
