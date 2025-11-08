/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = (req as any).auth?.userId

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    if (req.method === 'GET') {
        try {
            const { unreadOnly } = req.query

            const where: any = {
                userId,
                ...(unreadOnly === 'true' && { isRead: false })
            }

            const notifications = await prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 50,
            })

            const unreadCount = await prisma.notification.count({
                where: {
                    userId,
                    isRead: false
                }
            })

            return res.status(200).json({ notifications, unreadCount })
        } catch (error) {
            console.error('Error fetching notifications:', error)
            return res.status(500).json({ error: 'Failed to fetch notifications' })
        }
    }

    if (req.method === 'PATCH') {
        try {
            const patchSchema = z.object({
                notificationId: z.string().optional(),
                markAllAsRead: z.boolean().optional(),
            })

            const parsed = patchSchema.safeParse(req.body)
            if (!parsed.success) {
                return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })
            }

            const { notificationId, markAllAsRead } = parsed.data

            if (markAllAsRead) {
                await prisma.notification.updateMany({
                    where: {
                        userId,
                        isRead: false
                    },
                    data: { isRead: true }
                })

                return res.status(200).json({ success: true })
            }

            if (notificationId) {
                // updateMany used because Prisma update/delete require a unique identifier in `where`.
                // Using updateMany ensures we only affect notifications owned by the user without
                // relying on a composite unique constraint that doesn't exist in the schema.
                await prisma.notification.updateMany({
                    where: {
                        id: notificationId,
                        userId,
                    },
                    data: { isRead: true }
                })

                return res.status(200).json({ success: true })
            }

            return res.status(400).json({ error: 'Invalid request' })
        } catch (error) {
            console.error('Error updating notification:', error)
            return res.status(500).json({ error: 'Failed to update notification' })
        }
    }

    if (req.method === 'DELETE') {
        try {
            const deleteSchema = z.object({
                notificationId: z.string().optional(),
                clearAll: z.boolean().optional(),
            })

            const parsed = deleteSchema.safeParse(req.body)
            if (!parsed.success) {
                return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })
            }

            const { notificationId, clearAll } = parsed.data

            if (clearAll) {
                await prisma.notification.deleteMany({ where: { userId } })
                return res.status(200).json({ success: true })
            }

            if (!notificationId) {
                return res.status(400).json({ error: 'notificationId or clearAll required' })
            }

            // Use deleteMany to safely delete notification by id and user ownership.
            await prisma.notification.deleteMany({
                where: {
                    id: notificationId,
                    userId,
                }
            })

            return res.status(200).json({ success: true })
        } catch (error) {
            console.error('Error deleting notification:', error)
            return res.status(500).json({ error: 'Failed to delete notification' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler, authOptions)
