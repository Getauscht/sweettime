/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { authorId } = req.query

    if (typeof authorId !== 'string') {
        return res.status(400).json({ error: 'Invalid author ID' })
    }

    // GET - Check if user is following (optional auth)
    if (req.method === 'GET') {
        // lazy session
        let session: any = null
        try {
            const { getServerSession } = await import('next-auth')
            const { authOptions } = await import('../../auth/[...nextauth]')
            session = await getServerSession(req as any, res as any, authOptions as any) as any
        } catch {
            session = null
        }

        if (!session?.user?.id) {
            return res.status(200).json({ isFollowing: false })
        }

        try {
            const follow = await prisma.follow.findUnique({
                where: {
                    userId_authorId: {
                        userId: session.user.id,
                        authorId
                    }
                }
            })

            return res.status(200).json({ isFollowing: !!follow })
        } catch (error) {
            console.error('Error checking follow:', error)
            return res.status(500).json({ error: 'Failed to check follow' })
        }
    }

    // Protected handlers (POST/DELETE)
    const protectedHandler = async (req: NextApiRequest, res: NextApiResponse) => {
        const userId = (req as any).auth?.userId
        if (!userId) return res.status(401).json({ error: 'Unauthorized' })

        // POST - Follow author
        if (req.method === 'POST') {
            try {
                const follow = await prisma.follow.create({
                    data: {
                        userId,
                        authorId
                    }
                })

                return res.status(201).json({ follow, isFollowing: true })
            } catch (error: any) {
                if (error.code === 'P2002') {
                    return res.status(400).json({ error: 'Already following' })
                }
                console.error('Error following author:', error)
                return res.status(500).json({ error: 'Failed to follow author' })
            }
        }

        // DELETE - Unfollow author
        if (req.method === 'DELETE') {
            try {
                await prisma.follow.delete({
                    where: {
                        userId_authorId: {
                            userId,
                            authorId
                        }
                    }
                })

                return res.status(200).json({ isFollowing: false })
            } catch (error) {
                console.error('Error unfollowing author:', error)
                return res.status(500).json({ error: 'Failed to unfollow author' })
            }
        }

        return res.status(405).json({ error: 'Method not allowed' })
    }

    return withAuth(protectedHandler, authOptions)(req, res)
}
