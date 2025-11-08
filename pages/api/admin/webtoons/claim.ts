/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS, hasAnyPermission } from '@/lib/auth/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST'])
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
    }

    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' })
    const userId = session.user.id

    const { webtoonId, groupId } = req.body || {}
    if (!webtoonId || !groupId) return res.status(400).json({ error: 'webtoonId and groupId are required' })

    try {
        const webtoon = await prisma.webtoon.findUnique({ where: { id: webtoonId } })
        if (!webtoon) return res.status(404).json({ error: 'Webtoon not found' })

        const group = await prisma.scanlationGroup.findUnique({ where: { id: groupId } })
        if (!group) return res.status(404).json({ error: 'Group not found' })

        // Authorization: allow if user has GROUPS_ASSIGN or WEBTOONS_MANAGE, or is LEADER of the group
        const canAssign = await hasAnyPermission(userId, [PERMISSIONS.GROUPS_ASSIGN, PERMISSIONS.WEBTOONS_MANAGE])

        if (!canAssign) {
            const gm = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
            if (!gm || gm.role !== 'LEADER') {
                return res.status(403).json({ error: 'Forbidden: must be group leader or have assign/manage permissions' })
            }
        }

        try {
            const wg = await prisma.webtoonGroup.create({ data: { webtoonId, groupId } })

            // Activity log
            await prisma.activityLog.create({ data: { action: 'claimed', entityType: 'webtoon', entityId: webtoonId, details: `Group '${group.name}' claimed webtoon '${webtoon.title}'`, performedBy: userId } })

            return res.status(200).json({ success: true, webtoonGroup: wg })
        } catch (e: any) {
            // If already claimed, return success with message
            if (e?.code === 'P2002') {
                return res.status(200).json({ success: true, message: 'Webtoon already claimed by this group' })
            }
            console.error('Error creating webtoonGroup:', e)
            return res.status(500).json({ error: 'Failed to claim webtoon' })
        }
    } catch (err) {
        console.error('Error in claim handler:', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
