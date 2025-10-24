import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = session.user.id
    if (req.method === 'GET') {
        try {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    emailVerified: true,
                    role: {
                        select: {
                            name: true
                        }
                    },
                    createdAt: true,
                    lastActive: true
                }
            })

            if (!user) {
                return res.status(404).json({ error: 'User not found' })
            }

            return res.status(200).json({ user })
        } catch (error) {
            console.error('Error fetching user profile:', error)
            return res.status(500).json({ error: 'Failed to fetch user profile' })
        }
    }

    if (req.method === 'PATCH') {
        try {
            const bodySchema = z.object({
                name: z.string().min(1).max(256),
                email: z.string().email().max(320)
            })

            const parsed = bodySchema.safeParse(req.body)

            if (!parsed.success) {
                return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })
            }

            const { name, email } = parsed.data

            try {
                const user = await prisma.user.update({
                    where: { id: userId },
                    data: {
                        name,
                        email,
                        updatedAt: new Date()
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                })

                // Log activity
                await prisma.activityLog.create({
                    data: {
                        action: 'update_profile',
                        entityType: 'User',
                        entityId: userId,
                        details: `User updated profile: ${email}`,
                        performedBy: userId
                    }
                })

                return res.status(200).json({ user })
            } catch (err: any) {
                if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                    return res.status(400).json({ error: 'Email already in use' })
                }
                throw err
            }


        } catch (error) {
            console.error('Error updating user profile:', error)
            return res.status(500).json({ error: 'Failed to update user profile' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
