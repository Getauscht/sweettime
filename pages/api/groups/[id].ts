import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { isUserMemberOfGroup } from '@/lib/auth/groups'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)
    const { id } = req.query
    if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid group id' })

    if (req.method === 'GET') {
        try {
            const group = await prisma.scanlationGroup.findUnique({
                where: { id },
                include: { members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } }, webtoons: { take: 20 } },
            })
            if (!group) return res.status(404).json({ error: 'Group not found' })
            return res.status(200).json({ group })
        } catch (err) {
            console.error('Error fetching group:', err)
            return res.status(500).json({ error: 'Failed to fetch group' })
        }
    }

    // For modifications, require authentication
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' })
    const userId = (session.user as any).id

    if (req.method === 'PATCH') {
        try {
            // Allow if user is group leader or has admin permission
            const isMember = await isUserMemberOfGroup(userId, id)
            const hasAdmin = await hasPermission(userId, PERMISSIONS.ROLES_VIEW as any).catch(() => false)
            // Using ROLES_VIEW as proxy for admin; adjust to ADMIN check if needed

            let isLeader = false
            if (isMember) {
                const member = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId: id } } })
                isLeader = member?.role === 'LEADER'
            }

            if (!isLeader && !hasAdmin) return res.status(403).json({ error: 'Forbidden' })

            const { name, description, slug } = req.body as { name?: string; description?: string; slug?: string }
            const data: any = {}
            if (name) data.name = name
            if (description !== undefined) data.description = description
            if (slug) data.slug = slug

            const updated = await prisma.scanlationGroup.update({ where: { id }, data })
            return res.status(200).json({ group: updated })
        } catch (err) {
            console.error('Error updating group:', err)
            return res.status(500).json({ error: 'Failed to update group' })
        }
    }

    if (req.method === 'DELETE') {
        try {
            // Allow delete only by leader or admin
            const isMember = await isUserMemberOfGroup(userId, id)
            const member = isMember ? await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId: id } } }) : null
            const isLeader = member?.role === 'LEADER'
            const hasAdmin = await hasPermission(userId, PERMISSIONS.ROLES_DELETE as any).catch(() => false)

            if (!isLeader && !hasAdmin) return res.status(403).json({ error: 'Forbidden' })

            await prisma.scanlationGroup.delete({ where: { id } })
            return res.status(200).json({ success: true })
        } catch (err) {
            console.error('Error deleting group:', err)
            return res.status(500).json({ error: 'Failed to delete group' })
        }
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
}
