/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function handler(req: NextApiRequest, res: NextApiResponse) {
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

            const userId = (req as any).auth?.userId

            // Check if user already reported this comment
            const existingReport = await prisma.commentReport.findUnique({
                where: {
                    userId_commentId: {
                        userId,
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
                    userId,
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
            const sessionReport = await prisma.commentReport.findUnique({
                where: {
                    userId_commentId: {
                        userId: (req as any).auth?.userId,
                        commentId
                    }
                }
            })

            // If no session (not authenticated) this will return false/null
            return res.status(200).json({
                reported: !!sessionReport,
                report: sessionReport ? {
                    id: sessionReport.id,
                    reason: sessionReport.reason,
                    status: sessionReport.status,
                    createdAt: sessionReport.createdAt
                } : null
            })
        } catch (error) {
            console.error('Error checking report:', error)
            return res.status(500).json({ error: 'Failed to check report status' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler, authOptions)
