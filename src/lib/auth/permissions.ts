import { prisma } from '@/lib/prisma'

// Predefined system permissions
export const PERMISSIONS = {
    // Webtoons
    WEBTOONS_VIEW: 'webtoons.view',
    WEBTOONS_CREATE: 'webtoons.create',
    WEBTOONS_EDIT: 'webtoons.edit',
    WEBTOONS_DELETE: 'webtoons.delete',
    WEBTOONS_PUBLISH: 'webtoons.publish',

    // Authors
    AUTHORS_VIEW: 'authors.view',
    AUTHORS_CREATE: 'authors.create',
    AUTHORS_EDIT: 'authors.edit',
    AUTHORS_DELETE: 'authors.delete',

    // Genres
    GENRES_VIEW: 'genres.view',
    GENRES_CREATE: 'genres.create',
    GENRES_EDIT: 'genres.edit',
    GENRES_DELETE: 'genres.delete',

    // Users
    USERS_VIEW: 'users.view',
    USERS_CREATE: 'users.create',
    USERS_EDIT: 'users.edit',
    USERS_DELETE: 'users.delete',
    USERS_SUSPEND: 'users.suspend',
    USERS_MANAGE_ROLES: 'users.manage_roles',

    // Roles & Permissions
    ROLES_VIEW: 'roles.view',
    ROLES_CREATE: 'roles.create',
    ROLES_EDIT: 'roles.edit',
    ROLES_DELETE: 'roles.delete',
    PERMISSIONS_MANAGE: 'permissions.manage',

    // Analytics
    ANALYTICS_VIEW: 'analytics.view',
    ANALYTICS_EXPORT: 'analytics.export',

    // System
    SYSTEM_SETTINGS: 'system.settings',
    SYSTEM_LOGS: 'system.logs',
} as const

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Default roles configuration
export const DEFAULT_ROLES = {
    ADMIN: {
        name: 'admin',
        description: 'Full system access',
        permissions: Object.values(PERMISSIONS),
    },
    MODERATOR: {
        name: 'moderator',
        description: 'Can manage content and users',
        permissions: [
            PERMISSIONS.WEBTOONS_VIEW,
            PERMISSIONS.WEBTOONS_EDIT,
            PERMISSIONS.WEBTOONS_DELETE,
            PERMISSIONS.AUTHORS_VIEW,
            PERMISSIONS.AUTHORS_EDIT,
            PERMISSIONS.GENRES_VIEW,
            PERMISSIONS.GENRES_EDIT,
            PERMISSIONS.USERS_VIEW,
            PERMISSIONS.USERS_SUSPEND,
            PERMISSIONS.ANALYTICS_VIEW,
        ],
    },
    AUTHOR: {
        name: 'author',
        description: 'Can create and manage own webtoons',
        permissions: [
            PERMISSIONS.WEBTOONS_VIEW,
            PERMISSIONS.WEBTOONS_CREATE,
            PERMISSIONS.WEBTOONS_EDIT,
            PERMISSIONS.AUTHORS_VIEW,
            PERMISSIONS.GENRES_VIEW,
        ],
    },
    READER: {
        name: 'reader',
        description: 'Basic reading access',
        permissions: [
            PERMISSIONS.WEBTOONS_VIEW,
            PERMISSIONS.AUTHORS_VIEW,
            PERMISSIONS.GENRES_VIEW,
        ],
    },
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
    userId: string,
    permissionName: PermissionName
): Promise<boolean> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        })

        if (!user || !user.role) return false

        const userPermissions = user.role.rolePermissions.map(
            (rp) => rp.permission.name
        )

        return userPermissions.includes(permissionName)
    } catch (error) {
        console.error('Error checking permission:', error)
        return false
    }
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
    userId: string,
    permissions: PermissionName[]
): Promise<boolean> {
    for (const permission of permissions) {
        if (await hasPermission(userId, permission)) {
            return true
        }
    }
    return false
}

/**
 * Check if user has all specified permissions
 */
export async function hasAllPermissions(
    userId: string,
    permissions: PermissionName[]
): Promise<boolean> {
    for (const permission of permissions) {
        if (!(await hasPermission(userId, permission))) {
            return false
        }
    }
    return true
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(
    userId: string
): Promise<PermissionName[]> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        })

        if (!user || !user.role) return []

        return user.role.rolePermissions.map(
            (rp) => rp.permission.name as PermissionName
        )
    } catch (error) {
        console.error('Error getting user permissions:', error)
        return []
    }
}

/**
 * Check if user has a specific role
 */
export async function hasRole(userId: string, roleName: string): Promise<boolean> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        })

        return user?.role?.name === roleName
    } catch (error) {
        console.error('Error checking role:', error)
        return false
    }
}

/**
 * Initialize default roles and permissions in database
 */
export async function initializeRBAC() {
    try {
        // Create all permissions
        const permissionEntries = Object.entries(PERMISSIONS).map(([key, value]) => {
            const category = value.split('.')[0]
            return {
                name: value,
                category,
                description: key.replace(/_/g, ' ').toLowerCase(),
            }
        })

        for (const perm of permissionEntries) {
            await prisma.permission.upsert({
                where: { name: perm.name },
                update: {},
                create: perm,
            })
        }

        // Create default roles
        for (const [key, roleConfig] of Object.entries(DEFAULT_ROLES)) {
            const role = await prisma.role.upsert({
                where: { name: roleConfig.name },
                update: {
                    description: roleConfig.description,
                },
                create: {
                    name: roleConfig.name,
                    description: roleConfig.description,
                    isSystem: true,
                },
            })

            // Assign permissions to role
            for (const permName of roleConfig.permissions) {
                const permission = await prisma.permission.findUnique({
                    where: { name: permName },
                })

                if (permission) {
                    await prisma.rolePermission.upsert({
                        where: {
                            roleId_permissionId: {
                                roleId: role.id,
                                permissionId: permission.id,
                            },
                        },
                        update: {},
                        create: {
                            roleId: role.id,
                            permissionId: permission.id,
                        },
                    })
                }
            }
        }

        console.log('✅ RBAC system initialized successfully')
    } catch (error) {
        console.error('❌ Error initializing RBAC:', error)
        throw error
    }
}
