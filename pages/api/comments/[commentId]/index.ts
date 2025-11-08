/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS } from '@/lib/auth/permissions'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { commentId } = req.query

    if (typeof commentId !== 'string') {
        return res.status(400).json({ error: 'Invalid comment ID' })
    }

    // DELETE - Soft delete comment
    if (req.method === 'DELETE') {
        try {
            // Check if comment exists and user owns it
            const comment = await prisma.comment.findUnique({
                where: { id: commentId }
            })

            if (!comment) {
                return res.status(404).json({ error: 'Comment not found' })
            }

            const userId = (req as any).auth?.userId

            // Check if user has permission to moderate
            const userWithPermissions = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    role: {
                        select: {
                            rolePermissions: {
                                select: {
                                    permission: {
                                        select: { name: true }
                                    }
                                }
                            }
                        }
                    }
                }
            })

            const canModerate = userWithPermissions?.role?.rolePermissions?.some(rp => rp.permission.name === PERMISSIONS.WEBTOONS_EDIT)

            // Only the comment author can delete their own comment, or moderators can disable any comment
            if (comment.userId !== userId && !canModerate) {
                return res.status(403).json({ error: 'Forbidden: You can only delete your own comments' })
            }

            // Soft delete comment: mark as deleted by owner or moderator
            const deletedBy = comment.userId === userId ? 'owner' : 'moderator'
            await prisma.comment.update({
                where: { id: commentId },
                data: { deletedAt: new Date(), deletedBy: deletedBy } as any
            })

            return res.status(200).json({ success: true })
        } catch (error) {
            console.error('Error deleting comment:', error)
            return res.status(500).json({ error: 'Failed to delete comment' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler, authOptions)
