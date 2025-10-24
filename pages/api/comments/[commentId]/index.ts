import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    const { commentId } = req.query

    if (typeof commentId !== 'string') {
        return res.status(400).json({ error: 'Invalid comment ID' })
    }

    // DELETE - Delete comment
    if (req.method === 'DELETE') {
        try {
            // Check if comment exists and user owns it
            const comment = await prisma.comment.findUnique({
                where: { id: commentId }
            })

            if (!comment) {
                return res.status(404).json({ error: 'Comment not found' })
            }

            // Only the comment author can delete their own comment
            // TODO: Add admin/moderator permission check
            if (comment.userId !== session.user.id) {
                return res.status(403).json({ error: 'Forbidden: You can only delete your own comments' })
            }

            // Delete comment (cascade will handle related records)
            await prisma.comment.delete({
                where: { id: commentId }
            })

            return res.status(200).json({ success: true })
        } catch (error) {
            console.error('Error deleting comment:', error)
            return res.status(500).json({ error: 'Failed to delete comment' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
