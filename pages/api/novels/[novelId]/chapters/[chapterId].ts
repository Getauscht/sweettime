import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

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

    if (req.method === 'DELETE') {
        try {
            await (prisma as any).novelChapter.delete({ where: { id: chapterId } })
            return res.status(204).end()
        } catch (error: any) {
            console.error('Error deleting novel chapter:', error)
            return res.status(500).json({ error: 'Failed to delete chapter', details: error.message })
        }
    }

    res.setHeader('Allow', ['GET', 'DELETE'])
    return res.status(405).end()
}
