/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
    const { novelId } = req.query
    const userId = (req as any).auth?.userId

    if (typeof novelId !== 'string') {
        return res.status(400).json({ error: 'Invalid novel ID' })
    }

    try {
        const [favorite] = await prisma.$transaction([
            prisma.favorite.create({ data: { userId, novelId } }),
            prisma.novel.update({ where: { id: novelId }, data: { likes: { increment: 1 } } })
        ])

        return res.status(201).json({ favorite, isFavorited: true })
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Already favorited' })
        }
        console.error('Error adding favorite:', error)
        return res.status(500).json({ error: 'Failed to add favorite' })
    }
}

async function deleteHandler(req: NextApiRequest, res: NextApiResponse) {
    const { novelId } = req.query
    const userId = (req as any).auth?.userId

    if (typeof novelId !== 'string') {
        return res.status(400).json({ error: 'Invalid novel ID' })
    }

    try {
        await prisma.$transaction([
            prisma.favorite.delete({ where: { userId_novelId: { userId, novelId } } }),
            prisma.novel.update({ where: { id: novelId }, data: { likes: { decrement: 1 } } }),
        ])

        return res.status(200).json({ isFavorited: false })
    } catch (error) {
        console.error('Error removing favorite:', error)
        return res.status(500).json({ error: 'Failed to remove favorite' })
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { novelId } = req.query

    if (typeof novelId !== 'string') {
        return res.status(400).json({ error: 'Invalid novel ID' })
    }

    if (req.method === 'GET') {
        try {
            const { getServerSession } = await import('next-auth')
            const session = (await getServerSession(req as any, res as any, authOptions as any)) as any

            if (!session?.user?.id) {
                return res.status(200).json({ isFavorited: false })
            }

            const favorite = await prisma.favorite.findUnique({
                where: {
                    userId_novelId: {
                        userId: session.user.id,
                        novelId
                    }
                }
            })

            return res.status(200).json({ isFavorited: !!favorite })
        } catch (error) {
            console.error('Error checking favorite:', error)
            return res.status(500).json({ error: 'Failed to check favorite' })
        }
    }

    if (req.method === 'POST') {
        return withAuth(postHandler, authOptions)(req, res)
    }

    if (req.method === 'DELETE') {
        return withAuth(deleteHandler, authOptions)(req, res)
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
