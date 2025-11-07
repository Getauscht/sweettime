import { NextResponse } from 'next/server'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/auth/middleware'
import { authOptions } from '../../auth/[...nextauth]'
import { PERMISSIONS } from '@/lib/auth/permissions'
/* Avoid importing generated Prisma model types in this environment.
   Use narrow, local shapes to satisfy typing and ESLint rules. */

/**
 * Local, minimal types to satisfy ESLint/TypeScript without
 * relying on generated Prisma types which may not be exported
 * consistently in this workspace environment.
 */
type UserWhereInput = {
    OR?: Array<Record<string, unknown>>
    roleId?: string
    status?: string
    [key: string]: any
}

type SortOrder = 'asc' | 'desc'

type UserUpdateInput = Partial<Record<string, unknown>> & Record<string, unknown>

export const GET = withPermission(
    PERMISSIONS.USERS_VIEW,
    async (req: Request) => {
        try {
            const { searchParams } = new URL(req.url)
            const page = parseInt(searchParams.get('page') || '1')
            const limit = parseInt(searchParams.get('limit') || '10')
            const role = searchParams.get('role')
            const status = searchParams.get('status')
            const search = searchParams.get('search')
            const sortBy = searchParams.get('sortBy') || 'createdAt'
            const sortOrder = searchParams.get('sortOrder') || 'desc'

            const skip = (page - 1) * limit

            // Build where clause
            const where: UserWhereInput = {}
            if (role) where.roleId = role
            if (status) where.status = status
            if (search) {
                where.OR = [
                    { name: { contains: search } },
                    { email: { contains: search } },
                ]
            }

            // Get users
            const [users, total] = await Promise.all([
                prisma.user.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: {
                        [sortBy]: sortOrder as SortOrder,
                    },
                    include: {
                        role: true,
                    },
                }),
                prisma.user.count({ where }),
            ])

            return NextResponse.json({
                users: users.map((user: Record<string, unknown>) => ({
                    ...user,
                    password: undefined,
                    totpSecretEncrypted: undefined,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            })
        } catch (error) {
            console.error('Error fetching users:', error)
            return NextResponse.json(
                { error: 'Failed to fetch users' },
                { status: 500 }
            )
        }
    },
    authOptions
)

export const PATCH = withPermission(
    PERMISSIONS.USERS_EDIT,
    async (req: Request, { userId: actorUserId }: { userId: string }) => {
        try {
            const body = (await req.json()) as Partial<Record<string, unknown>> & { userId?: string }
            const { userId, ...updates } = body

            // Validate
            const { z } = await import('zod')
            const schema = z.object({ userId: z.string().min(1), name: z.string().optional(), email: z.string().email().optional(), roleId: z.string().optional(), status: z.string().optional() })
            const parsed = schema.safeParse(body)
            if (!parsed.success) return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 })

            if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

            const updated = await prisma.$transaction(async (tx) => {
                const user = await tx.user.update({ where: { id: userId }, data: updates as UserUpdateInput, include: { role: true } })
                await tx.activityLog.create({ data: { performedBy: actorUserId || 'system', action: 'update_user', entityType: 'User', entityId: user.id, details: `Updated user: ${user.email}` } })
                return user
            })

            return NextResponse.json({ ...updated, password: undefined, totpSecretEncrypted: undefined })
        } catch (error) {
            console.error('Error updating user:', error)
            return NextResponse.json(
                { error: 'Failed to update user' },
                { status: 500 }
            )
        }
    },
    authOptions
)

export const DELETE = withPermission(
    PERMISSIONS.USERS_DELETE,
    async (req: Request) => {
        try {
            const { searchParams } = new URL(req.url)
            const userId = searchParams.get('userId')

            if (!userId) {
                return NextResponse.json(
                    { error: 'User ID required' },
                    { status: 400 }
                )
            }

            await prisma.user.delete({
                where: { id: userId },
            })

            return NextResponse.json({ success: true })
        } catch (error) {
            console.error('Error deleting user:', error)
            return NextResponse.json(
                { error: 'Failed to delete user' },
                { status: 500 }
            )
        }
    },
    authOptions
)

// Pages API adapter
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const method = (req.method || 'GET').toUpperCase()
    const proto = req.headers['x-forwarded-proto'] || req.headers['referer']?.toString().split(':')[0] || 'http'
    const host = req.headers.host || 'localhost'
    const url = `${proto}://${host}${req.url}`

    let body: BodyInit | null = null
    if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
    }

    const webReq = new Request(url, { method, headers: req.headers as HeadersInit, body: body as BodyInit | null })
    const routeContext = { req, res }

    try {
        let response: Response | undefined
        switch (method) {
            case 'GET':
                response = await GET(webReq as any, routeContext)
                break
            case 'PATCH':
                response = await PATCH(webReq as any, routeContext)
                break
            case 'DELETE':
                response = await DELETE(webReq as any, routeContext)
                break
            default:
                res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
                return res.status(405).json({ error: 'Method Not Allowed' })
        }

        if (!response) return res.status(500).json({ error: 'No response from handler' })

        const resBody = await response.text()
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
            try {
                return res.status(response.status).json(JSON.parse(resBody))
            } catch { }
        }

        if (contentType) res.setHeader('Content-Type', contentType)
        res.status(response.status)
        return res.send(resBody)
    } catch (error) {
        console.error('Pages API adapter error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
