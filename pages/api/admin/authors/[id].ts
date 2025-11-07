import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { isAdminSession } from '@/lib/auth/middleware'
import { z } from 'zod'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session || !(await isAdminSession(session))) {
        return res.status(403).json({ error: 'Forbidden' })
    }

    const { id } = req.query

    if (req.method === 'GET') {
        try {
            const author = await prisma.author.findUnique({
                where: { id: id as string },
                include: {
                    webtoon: {
                        include: {
                            _count: {
                                select: { chapters: true }
                            }
                        }
                    }
                }
            })

            if (!author) {
                return res.status(404).json({ error: 'Author not found' })
            }

            return res.status(200).json({ author })
        } catch (error) {
            console.error('Error fetching author:', error)
            return res.status(500).json({ error: 'Failed to fetch author' })
        }
    }

    if (req.method === 'PATCH') {
        try {
            const schema = z.object({ name: z.string().optional(), slug: z.string().optional(), bio: z.string().optional(), avatar: z.string().optional() })
            const parsed = schema.safeParse(req.body)
            if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })

            const { name, slug, bio, avatar } = parsed.data

            // If slug is being changed, attempt the update and handle unique constraint errors
            try {
                const updated = await prisma.$transaction(async (tx) => {
                    const author = await tx.author.update({ where: { id: id as string }, data: { ...(name && { name }), ...(slug && { slug }), ...(bio !== undefined && { bio }), ...(avatar !== undefined && { avatar }) } })
                    await tx.activityLog.create({ data: { performedBy: session.user.id, action: 'update_author', entityType: 'Author', entityId: author.id, details: `Updated author: ${author.name}` } })
                    return author
                })

                return res.status(200).json({ author: updated })
            } catch (e: any) {
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                    return res.status(400).json({ error: 'Slug already taken' })
                }

                console.error('Error updating author:', e)
                return res.status(500).json({ error: 'Failed to update author' })
            }
        } catch (error) {
            console.error('Error updating author:', error)
            return res.status(500).json({ error: 'Failed to update author' })
        }
    }

    if (req.method === 'DELETE') {
        try {
            const author = await prisma.author.findUnique({
                where: { id: id as string },
                include: {
                    _count: {
                        select: { webtoon: true }
                    }
                }
            })

            if (!author) {
                return res.status(404).json({ error: 'Author not found' })
            }

            // Prevent deleting authors with webtoons
            if (author._count.webtoon > 0) {
                return res.status(400).json({ error: 'Cannot delete author with published webtoons' })
            }

            await prisma.author.delete({
                where: { id: id as string }
            })

            // Log activity
            await prisma.activityLog.create({
                data: {
                    performedBy: session.user.id,
                    action: 'delete_author',
                    entityType: 'Author',
                    entityId: id as string,
                    details: `Autor deletado: ${author.name}`,
                }
            })

            return res.status(200).json({ success: true })
        } catch (error) {
            console.error('Error deleting author:', error)
            return res.status(500).json({ error: 'Failed to delete author' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
