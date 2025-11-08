/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import type { NextApiRequest, NextApiResponse } from 'next'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/auth/middleware'
import { authOptions } from '../../auth/[...nextauth]'
import { PERMISSIONS } from '@/lib/auth/permissions'

// GET: list comments with pagination and optional search
export const GET = withPermission(
    PERMISSIONS.WEBTOONS_EDIT,
    async (req: Request) => {
        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const search = searchParams.get('search') || ''
        const onlyDeleted = searchParams.get('onlyDeleted') === 'true'

        const where: any = {}
        if (onlyDeleted) {
            where.deletedAt = { not: null }
        }
        if (search) {
            where.OR = [
                { content: { contains: search } },
                { user: { name: { contains: search } } },
            ]
        }

        const [items, total] = await Promise.all([
            prisma.comment.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, image: true } },
                    webtoon: { select: { id: true, title: true, slug: true } },
                    chapter: { select: { id: true, number: true, webtoon: { select: { slug: true, title: true } } } },
                    _count: { select: { likedBy: true, replies: true } },
                },
            }),
            prisma.comment.count({ where }),
        ])

        return NextResponse.json({
            comments: items.map((c: any) => ({
                ...c,
                likes: c._count?.likedBy ?? 0,
                replyCount: c._count?.replies ?? 0,
                _count: undefined,
            })),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        })
    },
    authOptions
)

// PATCH: moderate (soft-delete/restore) a comment
export const PATCH = withPermission(
    PERMISSIONS.WEBTOONS_EDIT,
    async (req: Request) => {
        const body = await req.json().catch(() => ({})) as { commentId?: string; action?: 'disable' | 'restore' }
        const { commentId, action } = body
        if (!commentId || !action) return NextResponse.json({ error: 'commentId and action required' }, { status: 400 })

        if (action === 'disable') {
            const updated = await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date(), deletedBy: 'moderator' } as any })
            return NextResponse.json({ success: true, comment: updated })
        }
        if (action === 'restore') {
            const updated = await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: null, deletedBy: null } as any })
            return NextResponse.json({ success: true, comment: updated })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    },
    authOptions
)

// Pages adapter
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const method = (req.method || 'GET').toUpperCase()
    const proto = (req.headers['x-forwarded-proto'] as string) || req.headers['referer']?.toString().split(':')[0] || 'http'
    const host = req.headers.host || 'localhost'
    const url = `${proto}://${host}${req.url}`
    let body: BodyInit | null = null
    if (method !== 'GET' && method !== 'HEAD') body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
    const webReq = new Request(url, { method, headers: req.headers as HeadersInit, body })

    try {
        let response: Response | undefined
        switch (method) {
            case 'GET': response = await GET(webReq as any, { req, res }); break
            case 'PATCH': response = await PATCH(webReq as any, { req, res }); break
            default:
                res.setHeader('Allow', ['GET', 'PATCH'])
                return res.status(405).json({ error: 'Method Not Allowed' })
        }
        if (!response) return res.status(500).json({ error: 'No response from handler' })
        const resBody = await response.text()
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
            try { return res.status(response.status).json(JSON.parse(resBody)) } catch { }
        }
        if (contentType) res.setHeader('Content-Type', contentType)
        res.status(response.status)
        return res.send(resBody)
    } catch (e) {
        console.error('admin/comments handler error', e)
        return res.status(500).json({ error: 'Internal Server Error' })
    }
}
