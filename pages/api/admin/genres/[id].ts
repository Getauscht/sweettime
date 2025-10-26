import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { isAdminSession } from '@/lib/auth/middleware'
import { z } from 'zod'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session || !isAdminSession(session)) {
        return res.status(403).json({ error: 'Forbidden' })
    }

    const { id } = req.query

    if (req.method === 'GET') {
        try {
            const genre = await prisma.genre.findUnique({
                where: { id: id as string },
                include: {
                    _count: {
                        select: { webtoons: true }
                    }
                }
            })

            if (!genre) {
                return res.status(404).json({ error: 'Genre not found' })
            }

            return res.status(200).json({ genre })
        } catch (error) {
            console.error('Error fetching genre:', error)
            return res.status(500).json({ error: 'Failed to fetch genre' })
        }
    }

    if (req.method === 'PATCH') {
        try {
            const schema = z.object({ name: z.string().optional(), description: z.string().optional() })
            const parsed = schema.safeParse(req.body)
            if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })

            const { name, description } = parsed.data

            const updated = await prisma.$transaction(async (tx) => {
                const genre = await tx.genre.update({ where: { id: id as string }, data: { ...(name && { name }), ...(description !== undefined && { description }) } })
                await tx.activityLog.create({ data: { performedBy: session.user.id, action: 'update_genre', entityType: 'Genre', entityId: genre.id, details: `Updated genre: ${genre.name}` } })
                return genre
            })

            return res.status(200).json({ genre: updated })
        } catch (error) {
            console.error('Error updating genre:', error)
            return res.status(500).json({ error: 'Failed to update genre' })
        }
    }

    if (req.method === 'DELETE') {
        try {
            const genre = await prisma.genre.findUnique({
                where: { id: id as string },
                include: {
                    _count: {
                        select: { webtoons: true }
                    }
                }
            })

            if (!genre) {
                return res.status(404).json({ error: 'Genre not found' })
            }

            // Prevent deleting genres with webtoons
            if (genre._count.webtoons > 0) {
                return res.status(400).json({ error: 'Cannot delete genre with associated webtoons' })
            }

            await prisma.genre.delete({
                where: { id: id as string }
            })

            // Log activity
            await prisma.activityLog.create({
                data: {
                    performedBy: session.user.id,
                    action: 'delete_genre',
                    entityType: 'Genre',
                    entityId: id as string,
                    details: `Gênero excluído: ${genre.name}`
                }
            })

            return res.status(200).json({ success: true })
        } catch (error) {
            console.error('Error deleting genre:', error)
            return res.status(500).json({ error: 'Failed to delete genre' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
