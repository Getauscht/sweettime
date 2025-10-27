import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { isUserMemberOfGroup } from '@/lib/auth/groups'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)
    const groupId = (req.query.id as string) || (req.query['id[]'] as any)
    if (!groupId || typeof groupId !== 'string') return res.status(400).json({ error: 'Invalid group id' })

    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' })
    const userId = (session.user as any).id

    // only leader or admin can manage members
    const isMember = await isUserMemberOfGroup(userId, groupId)
    const selfMember = isMember ? await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } }) : null
    const isLeader = selfMember?.role === 'LEADER'
    const isAdmin = await hasPermission(userId, PERMISSIONS.ROLES_VIEW as any).catch(() => false)
    if (!isLeader && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

    if (req.method === 'GET') {
        try {
            const members = await prisma.groupMember.findMany({ where: { groupId }, include: { user: { select: { id: true, name: true, email: true, image: true } } } })
            return res.status(200).json({ members })
        } catch (err) {
            console.error('Error listing members:', err)
            return res.status(500).json({ error: 'Failed to list members' })
        }
    }

    if (req.method === 'POST') {
        try {
            const { userId: newUserId, role } = req.body as { userId: string; role?: string }
            if (!newUserId) return res.status(400).json({ error: 'userId is required' })
            const validRole = role && ['LEADER', 'MEMBER', 'UPLOADER'].includes(role) ? role : 'MEMBER'

            const gm = await prisma.groupMember.upsert({
                where: { userId_groupId: { userId: newUserId, groupId } },
                create: { userId: newUserId, groupId, role: validRole as any },
                update: { role: validRole as any },
            })
            return res.status(200).json({ member: gm })
        } catch (err) {
            console.error('Error adding/updating member:', err)
            return res.status(500).json({ error: 'Failed to add/update member' })
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { userId: deleteUserId } = req.body as { userId: string }
            if (!deleteUserId) return res.status(400).json({ error: 'userId is required' })
            await prisma.groupMember.delete({ where: { userId_groupId: { userId: deleteUserId, groupId } } })
            return res.status(200).json({ success: true })
        } catch (err) {
            console.error('Error removing member:', err)
            return res.status(500).json({ error: 'Failed to remove member' })
        }
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
}
