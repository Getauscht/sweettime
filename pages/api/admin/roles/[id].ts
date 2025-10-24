import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { isAdminSession } from '@/lib/auth/middleware'
import { z } from 'zod'

const DEFAULT_ROLES = ['Admin', 'Moderator', 'Author', 'Reader']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session || !isAdminSession(session)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { id } = req.query

  if (req.method === 'GET') {
    try {
      const role = await prisma.role.findUnique({
        where: { id: id as string },
        include: {
          rolePermissions: { include: { permission: true } },
          _count: {
            select: { users: true }
          }
        }
      })

      if (!role) {
        return res.status(404).json({ error: 'Role not found' })
      }

      return res.status(200).json({ role })
    } catch (error) {
      console.error('Error fetching role:', error)
      return res.status(500).json({ error: 'Failed to fetch role' })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const schema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        permissionIds: z.array(z.string()).optional(),
      })

      const parsed = schema.safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })

      const { name, description, permissionIds } = parsed.data

      // Check if role exists
      const role = await prisma.role.findUnique({ where: { id: id as string } })
      if (!role) return res.status(404).json({ error: 'Role not found' })

      // Prevent editing system roles' names
      if (role.isSystem && name && name !== role.name) {
        return res.status(400).json({ error: 'Cannot rename system roles' })
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updatedRole = await tx.role.update({ where: { id: id as string }, data: { ...(name && { name }), ...(description !== undefined && { description }) } })

        if (permissionIds !== undefined) {
          await tx.rolePermission.deleteMany({ where: { roleId: id as string } })
          if (permissionIds.length > 0) await tx.rolePermission.createMany({ data: permissionIds.map((permissionId: string) => ({ roleId: id as string, permissionId })) })
        }

        await tx.activityLog.create({ data: { performedBy: session.user.id, action: 'update_role', entityType: 'Role', entityId: updatedRole.id, details: `Updated role: ${updatedRole.name}` } })

        const completeRole = await tx.role.findUnique({ where: { id: id as string }, include: { rolePermissions: { include: { permission: true } } } })
        return completeRole
      })

      return res.status(200).json({ role: updated })
    } catch (error) {
      console.error('Error updating role:', error)
      return res.status(500).json({ error: 'Failed to update role' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const role = await prisma.role.findUnique({
        where: { id: id as string },
        include: {
          _count: {
            select: { users: true }
          }
        }
      })

      if (!role) {
        return res.status(404).json({ error: 'Role not found' })
      }

      // Prevent deleting system roles
      if (role.isSystem) {
        return res.status(400).json({ error: 'Cannot delete system roles' })
      }

      // Prevent deleting roles with users
      if (role._count.users > 0) {
        return res.status(400).json({ error: 'Cannot delete role with assigned users' })
      }

      // Delete role permissions first
      await prisma.rolePermission.deleteMany({
        where: { roleId: id as string }
      })

      // Delete role
      await prisma.role.delete({
        where: { id: id as string }
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          performedBy: session.user.id,
          action: 'delete_role',
          entityType: 'Role',
          entityId: id as string,
          details: `Deleted role: ${role.name}`,
        }
      })

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error deleting role:', error)
      return res.status(500).json({ error: 'Failed to delete role' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
