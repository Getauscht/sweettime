import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)
    const { authorId } = req.query

    if (typeof authorId !== 'string') {
        return res.status(400).json({ error: 'Invalid author ID' })
    }

    // GET - Check if user is following
    if (req.method === 'GET') {
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

    // POST - Follow author
    if (req.method === 'POST') {
        if (!session?.user?.id) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        try {
            const follow = await prisma.follow.create({
                data: {
                    userId: session.user.id,
                    authorId
                }
            })

            // Create notification for author if they have a user account
            // (Assuming authors might have associated user accounts)

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
        if (!session?.user?.id) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        try {
            await prisma.follow.delete({
                where: {
                    userId_authorId: {
                        userId: session.user.id,
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
