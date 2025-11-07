import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { limit = '10' } = req.query
    try {
        const novels = await (prisma as any).novel.findMany({ take: Number(limit), orderBy: { likes: 'desc' }, select: { id: true, title: true, slug: true, coverImage: true } })
        return res.status(200).json({ novels })
    } catch (error: any) {
        console.error('Error fetching featured novels:', error)
        return res.status(500).json({ error: 'Failed to fetch featured novels', details: error.message })
    }
}
