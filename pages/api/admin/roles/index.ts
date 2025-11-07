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

    if (req.method === 'GET') {
        try {
            const roles = await prisma.role.findMany({
                include: {
                    rolePermissions: { include: { permission: true } },
                    _count: {
                        select: { users: true }
                    }
                },
                orderBy: { name: 'asc' }
            })

            return res.status(200).json({ roles })
        } catch (error) {
            console.error('Error fetching roles:', error)
            return res.status(500).json({ error: 'Failed to fetch roles' })
        }
    }

    if (req.method === 'POST') {
        try {
            const schema = z.object({
                name: z.string().min(1),
                description: z.string().optional(),
                permissionIds: z.array(z.string()).optional(),
            })

            const parsed = schema.safeParse(req.body)
            if (!parsed.success) {
                return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })
            }

            const { name, description, permissionIds } = parsed.data

            // Check if role already exists
            const existingRole = await prisma.role.findUnique({ where: { name } })
            if (existingRole) return res.status(400).json({ error: 'Role already exists' })

            const created = await prisma.$transaction(async (tx) => {
                const role = await tx.role.create({ data: { name, description, isSystem: false } })

                if (permissionIds && permissionIds.length > 0) {
                    await tx.rolePermission.createMany({ data: permissionIds.map((permissionId: string) => ({ roleId: role.id, permissionId })) })
                }

                await tx.activityLog.create({ data: { performedBy: session.user.id, action: 'create_role', entityType: 'Role', entityId: role.id, details: `Created role: ${name}` } })

                const completeRole = await tx.role.findUnique({ where: { id: role.id }, include: { rolePermissions: { include: { permission: true } } } })
                return completeRole
            })

            return res.status(201).json({ role: created })
        } catch (error) {
            console.error('Error creating role:', error)
            return res.status(500).json({ error: 'Failed to create role' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
