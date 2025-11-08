/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/auth/middleware'
import { authOptions } from '../../auth/[...nextauth]'
import { PERMISSIONS } from '@/lib/auth/permissions'

export const PATCH = withPermission(
    PERMISSIONS.WEBTOONS_EDIT,
    async (req: Request, { userId }: { userId: string }) => {
        try {
            const body = await req.json()
            const { novelId, genreIds, authorIds, artistIds, ...updates } = body

            if (!novelId) {
                return NextResponse.json({ error: 'Novel ID required' }, { status: 400 })
            }

            const existing = await prisma.novel.findUnique({ where: { id: novelId } })
            if (!existing) return NextResponse.json({ error: 'Novel not found' }, { status: 404 })

            const result = await prisma.$transaction(async (tx) => {
                const novel = await tx.novel.update({ where: { id: novelId }, data: updates })

                if (authorIds || artistIds) {
                    await tx.novelCredit.deleteMany({ where: { novelId } })
                    const creditsData: { novelId: string; authorId: string; role: string }[] = []
                    if (authorIds && authorIds.length > 0) {
                        authorIds.forEach((authorId: string) => creditsData.push({ novelId: novel.id, authorId, role: 'AUTHOR' }))
                    }
                    if (artistIds && artistIds.length > 0) {
                        artistIds.forEach((artistId: string) => creditsData.push({ novelId: novel.id, authorId: artistId, role: 'ARTIST' }))
                    }
                    if (creditsData.length > 0) await tx.novelCredit.createMany({ data: creditsData })
                }

                if (genreIds) {
                    await tx.novelGenre.deleteMany({ where: { novelId } })
                    if (genreIds.length > 0) {
                        await tx.novelGenre.createMany({ data: genreIds.map((genreId: string) => ({ novelId, genreId })) })
                    }
                }

                await tx.activityLog.create({
                    data: {
                        action: 'updated',
                        entityType: 'novel',
                        entityId: novel.id,
                        details: `Updated novel: '${novel.title}'`,
                        performedBy: userId
                    }
                })

                return novel
            })

            return NextResponse.json({ novel: result })
        } catch (error) {
            console.error('Error updating novel:', error)
            return NextResponse.json(
                { error: 'Failed to update novel' },
                { status: 500 }
            )
        }
    },
    authOptions
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const method = (req.method || 'GET').toUpperCase()
    const proto = req.headers['x-forwarded-proto'] || req.headers['referer']?.toString().split(':')[0] || 'http'
    const host = req.headers.host || 'localhost'
    const url = `${proto}://${host}${req.url}`

    let body: BodyInit | null = null
    if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
    }

    const webReq = new Request(url, {
        method,
        headers: req.headers as HeadersInit,
        body: body as BodyInit | null,
    })

    try {
        let response: Response | undefined
        const routeContext = { req, res }

        switch (method) {
            case 'PATCH':
                response = await PATCH(webReq as any, routeContext)
                break
            default:
                res.setHeader('Allow', ['PATCH'])
                return res.status(405).json({ error: 'Method Not Allowed' })
        }

        if (!response) {
            return res.status(500).json({ error: 'No response from handler' })
        }

        const resBody = await response.text()
        const contentType = response.headers.get('content-type') || ''

        if (contentType.includes('application/json')) {
            try {
                const json = JSON.parse(resBody)
                return res.status(response.status).json(json)
            } catch { }
        }

        res.status(response.status)
        if (contentType) res.setHeader('Content-Type', contentType)
        return res.send(resBody)
    } catch (error) {
        console.error('Pages API adapter error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
