import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { isAdminSession } from '@/lib/auth/middleware'
import { z } from 'zod'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session || !isAdminSession(session)) {
        return res.status(403).json({ error: 'Forbidden' })
    }


    if (req.method === 'GET') {
        try {
            const { search } = req.query

            const where: Prisma.AuthorWhereInput = {}

            if (search) {
                where.OR = [
                    { name: { contains: search as string } },
                    { bio: { contains: search as string } },
                ]
            }

            const authors = await prisma.author.findMany({
                where,
                include: {
                    _count: {
                        select: { webtoon: true }
                    }
                },
                orderBy: { name: 'asc' }
            })

            return res.status(200).json({ authors })
        } catch (error) {
            console.error('Error fetching authors:', error)
            return res.status(500).json({ error: 'Failed to fetch authors' })
        }
    }

    if (req.method === 'POST') {
        try {
            const schema = z.object({ name: z.string().min(1), slug: z.string().min(1), bio: z.string().optional(), avatar: z.string().optional() })
            const parsed = schema.safeParse(req.body)
            if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })

            const { name, slug, bio, avatar } = parsed.data

            // Check if slug already exists
            const existingAuthor = await prisma.author.findUnique({ where: { slug } })
            if (existingAuthor) return res.status(400).json({ error: 'Author with this slug already exists' })

            const created = await prisma.$transaction(async (tx) => {
                const author = await tx.author.create({ data: { name, slug, bio, avatar } })
                await tx.activityLog.create({ data: { performedBy: session.user.id, action: 'create_author', entityType: 'Author', entityId: author.id, details: `Created author: ${name}` } })
                return author
            })

            return res.status(201).json({ author: created })
        } catch (error) {
            console.error('Error creating author:', error)
            return res.status(500).json({ error: 'Failed to create author' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
