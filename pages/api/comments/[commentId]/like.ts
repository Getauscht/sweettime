import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    const { commentId } = req.query

    if (typeof commentId !== 'string') {
        return res.status(400).json({ error: 'Invalid comment ID' })
    }

    // POST - Like/Unlike comment
    if (req.method === 'POST') {
        try {
            // Check if comment exists
            const comment = await prisma.comment.findUnique({
                where: { id: commentId },
                include: {
                    webtoon: { select: { slug: true } },
                    chapter: { select: { number: true, webtoon: { select: { slug: true } } } }
                }
            })

            if (!comment) {
                return res.status(404).json({ error: 'Comment not found' })
            }

            // Check if user already liked this comment
            const existingLike = await prisma.commentLike.findUnique({
                where: {
                    userId_commentId: {
                        userId: session.user.id,
                        commentId
                    }
                }
            })

            if (existingLike) {
                // Unlike: remove the like
                await prisma.commentLike.delete({
                    where: {
                        userId_commentId: {
                            userId: session.user.id,
                            commentId
                        }
                    }
                })

                const updatedCount = await prisma.commentLike.count({
                    where: { commentId }
                })

                return res.status(200).json({
                    liked: false,
                    likes: updatedCount
                })
            } else {
                // Like: create the like
                await prisma.commentLike.create({
                    data: {
                        userId: session.user.id,
                        commentId
                    }
                })

                const updatedCount = await prisma.commentLike.count({
                    where: { commentId }
                })

                // Create notification for comment author (if not self-like)
                if (comment.userId !== session.user.id) {
                    let link: string | undefined
                    if (comment.chapter && comment.chapter.webtoon) {
                        link = `/webtoon/${comment.chapter.webtoon.slug}/chapter/${comment.chapter.number}?comment=${comment.id}`
                    } else if (comment.webtoon) {
                        link = `/webtoon/${(comment as any).webtoon.slug}?comment=${comment.id}`
                    }
                    await (await import('@/lib/notifications')).createNotificationAndPush({
                        userId: comment.userId,
                        type: 'like',
                        title: 'Novo like no seu comentário',
                        message: `${session.user.name} curtiu seu comentário`,
                        link,
                    })
                }

                return res.status(200).json({
                    liked: true,
                    likes: updatedCount
                })
            }
        } catch (error) {
            console.error('Error toggling comment like:', error)
            return res.status(500).json({ error: 'Failed to toggle like' })
        }
    }

    // GET - Check if user liked this comment and get like count
    if (req.method === 'GET') {
        try {
            const [liked, count] = await Promise.all([
                prisma.commentLike.findUnique({
                    where: {
                        userId_commentId: {
                            userId: session.user.id,
                            commentId
                        }
                    }
                }),
                prisma.commentLike.count({
                    where: { commentId }
                })
            ])

            return res.status(200).json({
                liked: !!liked,
                likes: count
            })
        } catch (error) {
            console.error('Error fetching like status:', error)
            return res.status(500).json({ error: 'Failed to fetch like status' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
