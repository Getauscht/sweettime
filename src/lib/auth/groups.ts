import { prisma } from '@/lib/prisma'

export async function isUserInAnyGroup(userId: string): Promise<boolean> {
    try {
        const count = await prisma.groupMember.count({ where: { userId } })
        return count > 0
    } catch (err) {
        console.error('Error checking user groups:', err)
        return false
    }
}

export async function isUserMemberOfGroup(userId: string, groupId: string): Promise<boolean> {
    try {
        const gm = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
        return !!gm
    } catch (err) {
        console.error('Error checking membership:', err)
        return false
    }
}
