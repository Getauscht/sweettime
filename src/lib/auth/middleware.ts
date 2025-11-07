import { NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { hasPermission, hasAnyPermission, PermissionName } from './permissions'
import { prisma } from '../prisma'

/**
 * Middleware to require authentication
 */
export async function requireAuth(authOptions?: any) {
    const session = (await getServerSession(authOptions as any)) as Session | null

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: 'Unauthorized', message: 'You must be logged in' },
            { status: 401 }
        )
    }

    return { session, user: session.user }
}

/**
 * Middleware to require specific permission
 */
export async function requirePermission(
    userId: string,
    permission: PermissionName
) {
    const allowed = await hasPermission(userId, permission)

    if (!allowed) {
        return NextResponse.json(
            {
                error: 'Forbidden',
                message: `You don't have permission: ${permission}`
            },
            { status: 403 }
        )
    }

    return null // No error
}

/**
 * Middleware to require any of specified permissions
 */
export async function requireAnyPermission(
    userId: string,
    permissions: PermissionName[]
) {
    const allowed = await hasAnyPermission(userId, permissions)

    if (!allowed) {
        return NextResponse.json(
            {
                error: 'Forbidden',
                message: 'You don\'t have required permissions'
            },
            { status: 403 }
        )
    }

    return null // No error
}

/**
 * Helper to create protected API route handler
 */
export function withAuth(
    handler: any,
    authOptions?: unknown
) {
    return async (...args: any[]) => {
        // Detect Pages API invocation: (req, res)
        const isPagesAPI = args.length >= 2 && args[0] && args[1] && typeof args[0].headers === 'object' && typeof args[1].status === 'function'

        if (isPagesAPI) {
            const req = args[0]
            const res = args[1]
            const session = (await getServerSession(req as any, res as any, authOptions as any)) as Session | null

            if (!session?.user?.id) {
                return res.status(401).json({ error: 'Unauthorized' })
            }

            // If original handler is a Pages API handler (req,res), call it directly
            try {
                return await handler(req, res)
            } catch (err) {
                // propagate
                throw err
            }
        }

        // App Router / Edge-style Request
        const req = args[0] as Request
        const routeContext = args[1]

        const session = (routeContext?.req && routeContext?.res)
            ? ((await getServerSession(routeContext.req as any, routeContext.res as any, authOptions as any)) as Session | null)
            : ((await getServerSession(authOptions as any)) as Session | null)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        return handler(req, {
            userId: session.user.id,
            session,
            ...(routeContext as object | undefined)
        })
    }
}

/**
 * Helper to create permission-protected API route handler
 */
export function withPermission(
    permission: PermissionName | PermissionName[],
    handler: any,
    authOptions?: unknown
) {
    return async (...args: any[]) => {
        // Detect Pages API invocation: (req, res)
        const isPagesAPI = args.length >= 2 && args[0] && args[1] && typeof args[0].headers === 'object' && typeof args[1].status === 'function'

        if (isPagesAPI) {
            const req = args[0]
            const res = args[1]
            const session = (await getServerSession(req as any, res as any, authOptions as any)) as Session | null

            if (!session?.user?.id) {
                return res.status(401).json({ error: 'Unauthorized' })
            }

            const userId = session.user.id
            const permissions = Array.isArray(permission) ? permission : [permission]

            // Admin users bypass permission checks for administrative routes
            if (await isAdminSession(session)) {
                return handler(req, res)
            }

            const allowed = await hasAnyPermission(userId, permissions)

            if (!allowed) {
                return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' })
            }

            return handler(req, res)
        }

        // App Router / Edge-style Request
        const req = args[0] as Request
        const routeContext = args[1]

        const session = (routeContext?.req && routeContext?.res)
            ? ((await getServerSession(routeContext.req as any, routeContext.res as any, authOptions as any)) as Session | null)
            : ((await getServerSession(authOptions as any)) as Session | null)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userId = session.user.id
        const permissionsArr = Array.isArray(permission) ? permission : [permission]

        // Admin users bypass permission checks for administrative routes
        if (await isAdminSession(session)) {
            return handler(req, {
                userId,
                session,
                ...(routeContext as object | undefined)
            })
        }

        const allowed = await hasAnyPermission(userId, permissionsArr)

        if (!allowed) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Insufficient permissions' },
                { status: 403 }
            )
        }

        return handler(req, {
            userId,
            session,
            ...(routeContext as object | undefined)
        })
    }
}

/**
 * Helper to check if a server session belongs to an admin user.
 * Uses case-insensitive match so both "admin" and "Admin" are accepted.
 */
export async function isAdminSession(session: Session | null): Promise<boolean> {

    const userId = session?.user?.id

    if (!userId) return false

    const userData = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    })

    if (userData?.role?.name !== 'admin') return false

    return true
}
