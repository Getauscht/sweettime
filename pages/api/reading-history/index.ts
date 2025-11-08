import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (req.method === 'GET') {
        // Get reading history
        const { userId, sessionId } = req.query

        try {
            const where: any = {}

            if (session?.user?.id) {
                where.userId = session.user.id
            } else if (typeof sessionId === 'string') {
                where.sessionId = sessionId
                where.userId = null
            } else {
                return res.status(200).json({ history: [] })
            }

            const history = await prisma.readingHistory.findMany({
                where,
                include: {
                    webtoon: {
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            coverImage: true,
                            author: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    },
                    chapter: {
                        select: {
                            id: true,
                            number: true,
                            title: true
                        }
                    }
                },
                orderBy: { lastReadAt: 'desc' },
                take: 50
            })

            return res.status(200).json({ history })
        } catch (error) {
            console.error('Error fetching reading history:', error)
            return res.status(500).json({ error: 'Failed to fetch reading history' })
        }
    }

    if (req.method === 'POST') {
        // Update reading history - supports both legacy and unified formats
        const bodySchema = z.object({
            // Unified format
            workId: z.string().optional(),
            workType: z.enum(['WEBTOON', 'NOVEL']).optional(),
            chapterNumber: z.number().optional(),
            
            // Legacy format
            webtoonId: z.string().optional(),
            chapterId: z.string().optional(),
            novelId: z.string().optional(),
            novelChapterId: z.string().optional(),
            
            progress: z.number().min(0).max(100).optional(),
            sessionId: z.string().optional()
        })

        const parsed = bodySchema.safeParse(req.body)

        if (!parsed.success) {
            return res.status(400).json({ error: 'Missing or invalid required fields', details: parsed.error.format() })
        }

        const { workId, workType, chapterNumber, webtoonId, chapterId, novelId, novelChapterId, progress, sessionId: bodySessionId } = parsed.data

        try {
            const userId = session?.user?.id || null
            const sessionId = userId ? null : (bodySessionId || uuidv4())

            // Determine if using unified or legacy format
            const isUnified = workId && workType
            
            if (isUnified) {
                // Unified format: workId + workType
                const where: any = userId 
                    ? { userId, workId, workType }
                    : { sessionId, workId, workType }

                const createData: any = {
                    userId,
                    sessionId: userId ? null : sessionId,
                    workId,
                    workType,
                    progress: progress ?? 0,
                    lastReadAt: new Date(),
                }

                // Upsert by unique compound keys isn't possible for the unified workId/workType
                // because the schema doesn't define a unique constraint for workId. Use findFirst + update/create.
                const existing = await prisma.readingHistory.findFirst({ where })
                let history
                if (existing) {
                    history = await prisma.readingHistory.update({
                        where: { id: existing.id },
                        data: { progress: progress ?? 0, lastReadAt: new Date() }
                    })
                } else {
                    history = await prisma.readingHistory.create({ data: createData })
                }

                return res.status(200).json({ history, sessionId })
            } else {
                // Legacy format: separate webtoonId/novelId + chapterId
                let where: any = {}
                if (userId) {
                    if (webtoonId && chapterId) where = { userId: userId, webtoonId, chapterId }
                    else if (novelId && novelChapterId) where = { userId: userId, novelId, novelChapterId }
                    else return res.status(400).json({ error: 'Either webtoonId+chapterId or novelId+novelChapterId required' })
                } else {
                    if (webtoonId && chapterId) where = { sessionId: sessionId, webtoonId, chapterId }
                    else if (novelId && novelChapterId) where = { sessionId: sessionId, novelId, novelChapterId }
                    else return res.status(400).json({ error: 'Either webtoonId+chapterId or novelId+novelChapterId required' })
                }

                let history

                const createData: any = {
                    userId,
                    sessionId: userId ? null : sessionId,
                    webtoonId: webtoonId || null,
                    chapterId: chapterId || null,
                    novelId: novelId || null,
                    novelChapterId: novelChapterId || null,
                    progress: progress ?? 0,
                    lastReadAt: new Date(),
                }

                try {
                    history = await prisma.readingHistory.create({ data: createData })
                } catch (err: any) {
                    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                        const existing = await prisma.readingHistory.findFirst({ where })
                        if (existing) {
                            history = await prisma.readingHistory.update({
                                where: { id: existing.id },
                                data: { progress: progress ?? 0, lastReadAt: new Date() },
                            })
                        } else {
                            history = await prisma.readingHistory.create({ data: createData })
                        }
                    } else {
                        throw err
                    }
                }

                return res.status(200).json({ history, sessionId })
            }
        } catch (error) {
            console.error('Error updating reading history:', error)
            return res.status(500).json({ error: 'Failed to update reading history' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
