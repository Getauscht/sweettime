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

/**
 * Check if user is a member of at least one ScanlationGroup
 * This permission replaces the old "AUTHOR" role for creating content
 */
export async function isGroupMember(userId: string): Promise<boolean> {
    return isUserInAnyGroup(userId)
}

/**
 * Get all groups a user belongs to
 */
export async function getUserGroups(userId: string) {
    try {
        const memberships = await prisma.groupMember.findMany({
            where: { userId },
            include: { group: true },
        })
        return memberships.map((m) => m.group)
    } catch (err) {
        console.error('Error fetching user groups:', err)
        return []
    }
}
