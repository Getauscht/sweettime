import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (req.method === 'GET') {
        try {
            // If user is authenticated, return groups they belong to; otherwise return recent public groups
            const userId = (session?.user as any)?.id
            const ownOnly = req.query.own === 'true'

            if (userId) {
                const groups = await prisma.scanlationGroup.findMany({
                    where: { members: { some: { userId } } },
                    include: { 
                        _count: { 
                            select: { 
                                members: true, 
                                webtoonGroups: true,
                                novelGroups: true 
                            } 
                        } 
                    },
                    orderBy: { createdAt: 'desc' },
                })
                return res.status(200).json({ groups })
            }

            if (ownOnly && !userId) {
                return res.status(401).json({ error: 'Unauthorized' })
            }

            const groups = await prisma.scanlationGroup.findMany({
                take: 50,
                orderBy: { createdAt: 'desc' },
                include: { 
                    _count: { 
                        select: { 
                            members: true, 
                            webtoonGroups: true,
                            novelGroups: true 
                        } 
                    } 
                },
            })

            return res.status(200).json({ groups })
        } catch (err) {
            console.error('Error listing groups:', err)
            return res.status(500).json({ error: 'Failed to list groups' })
        }
    }

    if (req.method === 'POST') {
        const userId = (session?.user as any)?.id
        if (!userId) return res.status(401).json({ error: 'Unauthorized' })

        try {
            const { name, slug, description, socialLinks } = req.body as { name?: string; slug?: string; description?: string; socialLinks?: any }
            if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Name is required' })

            const safeSlug = slug && typeof slug === 'string' && slug.trim() !== '' ? slug.trim() : `${name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 8)}`

            const createData: any = {
                name: name.trim(),
                slug: safeSlug,
                description: description ?? undefined,
                members: { create: { userId, role: 'LEADER' } },
            }
            if (socialLinks && typeof socialLinks === 'object') createData.socialLinks = socialLinks

            const group = await prisma.scanlationGroup.create({ data: createData })

            return res.status(201).json({ group })
        } catch (err: any) {
            console.error('Error creating group:', err)
            if (err?.code === 'P2002') return res.status(409).json({ error: 'Group with this slug already exists' })
            return res.status(500).json({ error: 'Failed to create group' })
        }
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
}
