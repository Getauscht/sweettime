/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../../../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { novelId, chapterId } = req.query as { novelId: string; chapterId: string }

    if (req.method === 'GET') {
        try {
            const chapter = await (prisma as any).novelChapter.findUnique({ where: { id: chapterId } })
            if (!chapter || chapter.novelId !== novelId) return res.status(404).json({ error: 'Chapter not found' })
            return res.status(200).json({ chapter })
        } catch (error: any) {
            console.error('Error fetching novel chapter:', error)
            return res.status(500).json({ error: 'Failed to fetch chapter', details: error.message })
        }
    }

    if (req.method === 'PATCH') {
        const protectedHandler = async (req: NextApiRequest, res: NextApiResponse) => {
            try {
                const { title, content, number, scanlationGroupId } = req.body as any

                const chapter = await prisma.novelChapter.findUnique({ where: { id: chapterId } })
                if (!chapter || chapter.novelId !== novelId) return res.status(404).json({ error: 'Chapter not found' })

                const userId = (req as any).auth?.userId
                const dbUser = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } })
                const userIsAdmin = dbUser?.role?.name === 'admin'

                if (!userIsAdmin) {
                    const allowedGroupIds: string[] = []
                    if (chapter.scanlationGroupId) allowedGroupIds.push(chapter.scanlationGroupId)
                    if (scanlationGroupId) allowedGroupIds.push(scanlationGroupId)

                    if (allowedGroupIds.length === 0) {
                        return res.status(403).json({ error: 'Not allowed to edit this chapter' })
                    }

                    const member = await prisma.groupMember.findFirst({ where: { userId, groupId: { in: allowedGroupIds } } })
                    if (!member) {
                        return res.status(403).json({ error: 'Not allowed to edit this chapter' })
                    }
                }

                if (typeof number === 'number') {
                    const existing = await prisma.novelChapter.findFirst({ where: { novelId, number, id: { not: chapterId } } })
                    if (existing) {
                        return res.status(400).json({ error: 'Another chapter with this number already exists' })
                    }
                }

                const data: any = {}
                if (title !== undefined) data.title = title || null
                if (typeof number === 'number') data.number = number
                if (scanlationGroupId !== undefined) data.scanlationGroupId = scanlationGroupId
                if (content !== undefined) data.content = content

                const updated = await prisma.novelChapter.update({ where: { id: chapterId }, data })
                return res.status(200).json({ chapter: updated })
            } catch (error: any) {
                console.error('Error updating novel chapter:', error)
                return res.status(500).json({ error: 'Failed to update chapter', details: error.message })
            }
        }

        return withAuth(protectedHandler, authOptions)(req, res)
    }

    if (req.method === 'DELETE') {
        const protectedHandler = async (req: NextApiRequest, res: NextApiResponse) => {
            try {
                await (prisma as any).novelChapter.delete({ where: { id: chapterId } })
                return res.status(204).end()
            } catch (error: any) {
                console.error('Error deleting novel chapter:', error)
                return res.status(500).json({ error: 'Failed to delete chapter', details: error.message })
            }
        }

        return withAuth(protectedHandler, authOptions)(req, res)
    }

    res.setHeader('Allow', ['GET', 'DELETE'])
    return res.status(405).end()
}
