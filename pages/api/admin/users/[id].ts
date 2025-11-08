import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
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
            const user = await prisma.user.findUnique({
                where: { id: id as string },
                include: {
                    role: {
                        include: {
                            rolePermissions: {
                                include: { permission: true }
                            }
                        }
                    }
                }
            })

            if (!user) {
                return res.status(404).json({ error: 'User not found' })
            }

            return res.status(200).json({ user })
        } catch (error) {
            console.error('Error fetching user:', error)
            return res.status(500).json({ error: 'Failed to fetch user' })
        }
    }

    if (req.method === 'PATCH') {
        try {
            const schema = z.object({ name: z.string().optional(), email: z.string().email().optional(), roleId: z.string().optional(), status: z.string().optional() })
            const parsed = schema.safeParse(req.body)
            if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })

            const { name, email, roleId, status } = parsed.data

            const updated = await prisma.$transaction(async (tx) => {
                const user = await tx.user.update({ where: { id: id as string }, data: { ...(name && { name }), ...(email && { email }), ...(roleId && { roleId }), ...(status && { status }) }, include: { role: true } })
                await tx.activityLog.create({ data: { performedBy: session.user.id, action: 'update_user', entityType: 'User', entityId: user.id, details: `Updated user: ${user.email}` } })
                return user
            })

            return res.status(200).json({ user: updated })
        } catch (error) {
            console.error('Error updating user:', error)
            return res.status(500).json({ error: 'Failed to update user' })
        }
    }

    if (req.method === 'DELETE') {
        try {
            // Prevent deleting self
            if (id === session.user.id) {
                return res.status(400).json({ error: 'Cannot delete yourself' })
            }

            await prisma.user.delete({
                where: { id: id as string }
            })

            // Log activity
            await prisma.activityLog.create({
                data: {
                    performedBy: session.user.id,
                    action: 'delete_user',
                    entityType: 'User',
                    entityId: id as string,
                    details: `Usuário deletado`
                }
            })

            return res.status(200).json({ success: true })
        } catch (error) {
            console.error('Error deleting user:', error)
            return res.status(500).json({ error: 'Failed to delete user' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
