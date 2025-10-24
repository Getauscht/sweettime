import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    const { commentId } = req.query

    if (typeof commentId !== 'string') {
        return res.status(400).json({ error: 'Invalid comment ID' })
    }

    // POST - Report a comment
    if (req.method === 'POST') {
        const bodySchema = z.object({
            reason: z.enum(['harassment', 'spam', 'inappropriate', 'other']),
            details: z.string().optional(),
        })

        const parsed = bodySchema.safeParse(req.body)

        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })
        }

        const { reason, details } = parsed.data

        try {
            // Check if comment exists
            const comment = await prisma.comment.findUnique({
                where: { id: commentId }
            })

            if (!comment) {
                return res.status(404).json({ error: 'Comment not found' })
            }

            // Check if user already reported this comment
            const existingReport = await prisma.commentReport.findUnique({
                where: {
                    userId_commentId: {
                        userId: session.user.id,
                        commentId
                    }
                }
            })

            if (existingReport) {
                return res.status(400).json({ error: 'You have already reported this comment' })
            }

            // Create report
            const report = await prisma.commentReport.create({
                data: {
                    userId: session.user.id,
                    commentId,
                    reason,
                    details: details || null,
                    status: 'pending'
                }
            })

            // TODO: Notify moderators/admins about new report

            return res.status(201).json({
                success: true,
                message: 'Report submitted successfully. Our team will review it shortly.',
                report: {
                    id: report.id,
                    reason: report.reason,
                    createdAt: report.createdAt
                }
            })
        } catch (error) {
            console.error('Error creating report:', error)
            return res.status(500).json({ error: 'Failed to submit report' })
        }
    }

    // GET - Check if user has reported this comment
    if (req.method === 'GET') {
        try {
            const report = await prisma.commentReport.findUnique({
                where: {
                    userId_commentId: {
                        userId: session.user.id,
                        commentId
                    }
                }
            })

            return res.status(200).json({
                reported: !!report,
                report: report ? {
                    id: report.id,
                    reason: report.reason,
                    status: report.status,
                    createdAt: report.createdAt
                } : null
            })
        } catch (error) {
            console.error('Error checking report:', error)
            return res.status(500).json({ error: 'Failed to check report status' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
