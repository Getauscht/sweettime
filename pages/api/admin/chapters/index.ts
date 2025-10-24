import { NextResponse } from 'next/server'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/middleware'
import { authOptions } from '../../auth/[...nextauth]'
import { PERMISSIONS } from '@/lib/auth/permissions'

export const GET = withPermission(
    PERMISSIONS.WEBTOONS_VIEW,
    async (req: Request) => {
        try {
            const { searchParams } = new URL(req.url)
            const webtoonId = searchParams.get('webtoonId')

            if (!webtoonId) {
                return NextResponse.json(
                    { error: 'Webtoon ID required' },
                    { status: 400 }
                )
            }

            const chapters = await prisma.chapter.findMany({
                where: { webtoonId },
                orderBy: { number: 'asc' },
            })

            return NextResponse.json({ chapters })
        } catch (error) {
            console.error('Error fetching chapters:', error)
            return NextResponse.json(
                { error: 'Failed to fetch chapters' },
                { status: 500 }
            )
        }
    },
    authOptions
)

export const POST = withPermission(
    PERMISSIONS.WEBTOONS_EDIT,
    async (req: Request, { userId }) => {
        try {
            const body = await req.json()
            const schema = z.object({ webtoonId: z.string().min(1), number: z.number().int().positive(), title: z.string().optional(), content: z.any().optional() })
            const parsed = schema.safeParse({ ...body, number: typeof body.number === 'string' ? parseInt(body.number) : body.number })
            if (!parsed.success) return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 })

            const { webtoonId, number, title, content } = parsed.data

            // Check if chapter number already exists
            const existing = await prisma.chapter.findUnique({ where: { webtoonId_number: { webtoonId, number } } })
            if (existing) return NextResponse.json({ error: 'Chapter number already exists' }, { status: 400 })

            const created = await prisma.$transaction(async (tx) => {
                const chapter = await tx.chapter.create({ data: { webtoonId, number, title: title || `Chapter ${number}`, content: content || [] } })
                await tx.activityLog.create({ data: { action: 'created', entityType: 'chapter', entityId: chapter.id, details: `Added chapter ${number}: '${title || ''}'`, performedBy: userId } })
                return chapter
            })

            return NextResponse.json({ chapter: created })
        } catch (error) {
            console.error('Error creating chapter:', error)
            return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 })
        }
    },
    authOptions
)

export const PATCH = withPermission(
    PERMISSIONS.WEBTOONS_EDIT,
    async (req: Request, { userId }) => {
        try {
            const body = await req.json()
            const schema = z.object({ chapterId: z.string().min(1), updates: z.record(z.string(), z.any()).optional() })
            const { chapterId, ...updates } = body

            if (!chapterId) return NextResponse.json({ error: 'Chapter ID required' }, { status: 400 })

            const updated = await prisma.$transaction(async (tx) => {
                const chapter = await tx.chapter.update({ where: { id: chapterId }, data: updates })
                await tx.activityLog.create({ data: { action: 'updated', entityType: 'chapter', entityId: chapter.id, details: `Updated chapter: '${chapter.title}'`, performedBy: userId } })
                return chapter
            })

            return NextResponse.json({ chapter: updated })
        } catch (error) {
            console.error('Error updating chapter:', error)
            return NextResponse.json({ error: 'Failed to update chapter' }, { status: 500 })
        }
    },
    authOptions
)

export const DELETE = withPermission(
    PERMISSIONS.WEBTOONS_DELETE,
    async (req: Request, { userId }) => {
        try {
            const { searchParams } = new URL(req.url)
            const chapterId = searchParams.get('chapterId')

            if (!chapterId) {
                return NextResponse.json(
                    { error: 'Chapter ID required' },
                    { status: 400 }
                )
            }

            const chapter = await prisma.chapter.findUnique({
                where: { id: chapterId },
            })

            await prisma.chapter.delete({
                where: { id: chapterId },
            })

            // Log activity
            await prisma.activityLog.create({
                data: {
                    action: 'deleted',
                    entityType: 'chapter',
                    entityId: chapterId,
                    details: `Deleted chapter: '${chapter?.title}'`,
                    performedBy: userId,
                },
            })

            return NextResponse.json({ success: true })
        } catch (error) {
            console.error('Error deleting chapter:', error)
            return NextResponse.json(
                { error: 'Failed to delete chapter' },
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
            case 'POST':
                response = await POST(webReq as any, routeContext)
                break
            case 'PATCH':
                response = await PATCH(webReq as any, routeContext)
                break
            case 'DELETE':
                response = await DELETE(webReq as any, routeContext)
                break
            default:
                res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
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
