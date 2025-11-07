import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { novelId } = req.query as { novelId: string }

    if (req.method === 'POST') {
        try {
            const { number, title, content, groupIds } = req.body
            if (typeof number !== 'number' || !content) return res.status(400).json({ error: 'Invalid payload' })

            // Prevent duplicate chapter numbers for the same novel
            const existing = await (prisma as any).novelChapter.findUnique({
                where: { novelId_number: { novelId, number } },
            })

            if (existing) {
                return res.status(400).json({ error: 'Chapter number already exists' })
            }

            // Build create data. Use scalar foreign keys to avoid Prisma's nested relation input requirement
            const createData: any = {
                novelId,
                number,
                title: title || null,
                content,
            }

            // If a scanlation group was provided, use the first one (model supports a single scanlationGroupId)
            if (Array.isArray(groupIds) && groupIds.length > 0 && typeof groupIds[0] === 'string') {
                // Validate group exists
                const groupsCount = await (prisma as any).scanlationGroup.count({ where: { id: { in: groupIds } } })
                if (groupsCount !== groupIds.length) return res.status(400).json({ error: 'Invalid groups' })
                createData.scanlationGroupId = groupIds[0]
            }

            const chapter = await (prisma as any).novelChapter.create({ data: createData })

            return res.status(201).json({ chapter })
        } catch (error: any) {
            console.error('Error creating novel chapter:', error)
            // Handle Prisma unique constraint (race conditions or missed pre-check)
            if (error?.code === 'P2002') {
                return res.status(400).json({ error: 'Chapter number already exists' })
            }
            return res.status(500).json({ error: 'Failed to create chapter', details: error.message })
        }
    }

    if (req.method === 'GET') {
        try {
            const chapters = await (prisma as any).novelChapter.findMany({ where: { novelId }, orderBy: { number: 'asc' } })
            return res.status(200).json({ chapters })
        } catch (error: any) {
            console.error('Error fetching novel chapters:', error)
            return res.status(500).json({ error: 'Failed to fetch chapters', details: error.message })
        }
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end()
}
