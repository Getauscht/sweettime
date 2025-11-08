/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { isAdminSession } from '@/lib/auth/middleware'
import { z } from 'zod'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    if (req.method === 'GET') {
        try {
            const genres = await prisma.genre.findMany({
                orderBy: { name: 'asc' },
                include: {
                    _count: {
                        select: { webtoons: true }
                    }
                }
            })

            return res.status(200).json({ genres })
        } catch (error) {
            console.error('Error fetching genres:', error)
            return res.status(500).json({ error: 'Failed to fetch genres' })
        }
    }

    if (req.method === 'POST') {
        // Only admins can create genres
        if (!(await isAdminSession(session))) {
            return res.status(403).json({ error: 'Forbidden' })
        }

        try {
            const schema = z.object({ name: z.string().min(1), description: z.string().optional() })
            const parsed = schema.safeParse(req.body)
            if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })

            const { name, description } = parsed.data

            // Attempt to create; handle unique constraint in case of races
            try {
                const created = await prisma.$transaction(async (tx) => {
                    // generate slug from name
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                    const genre = await tx.genre.create({ data: { name, description, slug } })
                    await tx.activityLog.create({ data: { performedBy: session.user.id, action: 'create_genre', entityType: 'Genre', entityId: genre.id, details: `Created genre: ${name}` } })
                    return genre
                })

                return res.status(201).json({ genre: created })
            } catch (e: any) {
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                    // Another request likely created the genre concurrently
                    const existing = await prisma.genre.findFirst({ where: { name } })
                    if (existing) return res.status(400).json({ error: 'Genre already exists', genre: existing })
                }

                console.error('Error creating genre:', e)
                return res.status(500).json({ error: 'Failed to create genre' })
            }
        } catch (error) {
            console.error('Error creating genre:', error)
            return res.status(500).json({ error: 'Failed to create genre' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
