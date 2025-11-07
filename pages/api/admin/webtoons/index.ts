import { NextResponse } from 'next/server'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/middleware'
import { authOptions } from '../../auth/[...nextauth]'
import { PERMISSIONS, hasAnyPermission } from '@/lib/auth/permissions'
import { isUserMemberOfGroup } from '@/lib/auth/groups'

export const GET = withPermission(
    PERMISSIONS.WEBTOONS_VIEW,
    async (req: Request) => {
        try {
            const { searchParams } = new URL(req.url)
            const singleId = searchParams.get('id')
            if (singleId) {
                // Return a single webtoon (by id or slug)
                const webtoon = await prisma.webtoon.findFirst({
                    where: { OR: [{ id: singleId }, { slug: singleId }] },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        description: true,
                        coverImage: true,
                        bannerImage: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true,
                        credits: { select: { role: true, author: { select: { id: true, name: true, slug: true } } } },
                        genres: { include: { genre: { select: { id: true, name: true } } } },
                        chapters: {
                            select: {
                                id: true,
                                number: true,
                                title: true,
                                publishedAt: true,
                                content: true,
                            },
                            orderBy: { number: 'asc' },
                        },
                        webtoonGroups: { include: { group: { select: { id: true, name: true } } } },
                        _count: { select: { chapters: true } },
                    },
                })

                if (!webtoon) {
                    return NextResponse.json({ error: 'Webtoon not found' }, { status: 404 })
                }

                const authors = webtoon.credits?.filter(c => c.role === 'AUTHOR').map(c => c.author) || []

                const response = {
                    id: webtoon.id,
                    title: webtoon.title,
                    slug: webtoon.slug,
                    description: webtoon.description,
                    coverImage: webtoon.coverImage,
                    bannerImage: webtoon.bannerImage,
                    status: webtoon.status,
                    credits: webtoon.credits,
                    authors,
                    genres: webtoon.genres.map(wg => ({ id: wg.genre.id, name: wg.genre.name })),
                    chapters: webtoon.chapters.map(c => ({
                        id: c.id,
                        number: c.number,
                        title: c.title,
                        content: c.content,
                        publishedAt: c.publishedAt,
                        createdAt: (c as any).createdAt || new Date(),
                    })),
                    webtoonGroups: webtoon.webtoonGroups || [],
                }

                return NextResponse.json({ webtoon: response })
            }
            const page = parseInt(searchParams.get('page') || '1')
            const limit = parseInt(searchParams.get('limit') || '12')
            const status = searchParams.get('status')
            const authorId = searchParams.get('authorId')
            const search = searchParams.get('search')

            const where: any = {}
            if (status) where.status = status
            if (authorId) where.credits = { some: { authorId: authorId } };
            if (search) {
                where.OR = [
                    { title: { contains: search } },
                    { description: { contains: search } },
                ]
            }

            const [webtoons, total] = await Promise.all([
                prisma.webtoon.findMany({
                    where,
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        description: true,
                        coverImage: true,
                        bannerImage: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true,
                        credits: { select: { role: true, author: { select: { id: true, name: true, slug: true } } } },
                        genres: { include: { genre: { select: { id: true, name: true } } } },
                        _count: { select: { chapters: true } },
                    },
                }),
                prisma.webtoon.count({ where }),
            ])

            // Attach authors array derived from credits for each webtoon
            const webtoonsWithAuthors = webtoons.map(w => ({
                ...w,
                authors: w.credits?.filter(c => c.role === 'AUTHOR').map(c => c.author) || []
            }))

            return NextResponse.json({
                webtoons: webtoonsWithAuthors,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            })
        } catch (error) {
            console.error('Error fetching webtoons:', error)
            return NextResponse.json(
                { error: 'Failed to fetch webtoons' },
                { status: 500 }
            )
        }
    },
    authOptions
)

export const POST = withPermission(
    PERMISSIONS.WEBTOONS_CREATE,
    async (req: Request, { userId }: { userId: string }) => {
        try {
            const body = await req.json()

            const bodySchema = z.object({
                scanlationGroupId: z.string().optional(),
                title: z.string().min(1),
                description: z.string().optional(),
                authorIds: z.array(z.string()).min(1),
                artistIds: z.array(z.string()).optional(),
                genreIds: z.array(z.string()).optional(),
                coverImage: z.string().optional(),
                bannerImage: z.string().optional(),
                status: z.string().optional(),
            })

            const parsed = bodySchema.safeParse(body)
            if (!parsed.success) {
                return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 })
            }

            const { title, description, authorIds, artistIds, genreIds, coverImage, status } = parsed.data
            const { scanlationGroupId } = parsed.data as { scanlationGroupId?: string }

            // Generate slug
            const slug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')

            // Use interactive transaction so we can create related records using the created webtoon id
            try {
                // Determine which group (if any) should be associated with this webtoon.
                // We no longer store a direct `scanlationGroupId` on Webtoon; instead we create a WebtoonGroup entry.
                let assignGroupId: string | null = null
                if (scanlationGroupId) {
                    const canAssign = await hasAnyPermission(userId, [PERMISSIONS.GROUPS_ASSIGN])
                    if (!canAssign) {
                        const isMember = await isUserMemberOfGroup(userId, scanlationGroupId)
                        if (!isMember) return NextResponse.json({ error: 'Forbidden: not a member of the target group' }, { status: 403 })
                    }
                    assignGroupId = scanlationGroupId
                } else {
                    // If none provided, try to pick the user's first group membership
                    const member = await prisma.groupMember.findFirst({ where: { userId } })
                    if (member) assignGroupId = member.groupId
                    else {
                        const canAssign = await hasAnyPermission(userId, [PERMISSIONS.GROUPS_ASSIGN])
                        if (!canAssign) {
                            // Authors can create webtoons without a group
                            assignGroupId = null
                        } else {
                            assignGroupId = null
                        }
                    }
                }

                const created = await prisma.$transaction(async (tx) => {
                    const webtoon = await tx.webtoon.create({
                        data: {
                            title,
                            slug,
                            description,
                            coverImage,
                            bannerImage: parsed.data.bannerImage,
                            status: status || 'ongoing',
                        },
                    })

                    const creditsData: { webtoonId: string; authorId: string; role: string }[] = []
                    authorIds.forEach((authorId: string) => creditsData.push({ webtoonId: webtoon.id, authorId, role: 'AUTHOR' }))
                    if (artistIds && artistIds.length > 0) {
                        artistIds.forEach((artistId: string) => creditsData.push({ webtoonId: webtoon.id, authorId: artistId, role: 'ARTIST' }))
                    }

                    if (creditsData.length > 0) {
                        await tx.webtoonCredit.createMany({ data: creditsData })
                    }

                    if (genreIds && genreIds.length > 0) {
                        await tx.webtoonGenre.createMany({ data: genreIds.map((genreId: string) => ({ webtoonId: webtoon.id, genreId })) })
                    }

                    // If a group assignment was requested, create the WebtoonGroup link
                    if (assignGroupId) {
                        try {
                            await tx.webtoonGroup.create({ data: { webtoonId: webtoon.id, groupId: assignGroupId } })
                        } catch (e) {
                            // ignore duplicate or other errors here; conflict will be surfaced if needed
                        }
                    }

                    await tx.activityLog.create({
                        data: {
                            action: 'created',
                            entityType: 'webtoon',
                            entityId: webtoon.id,
                            details: `Title: '${webtoon.title}'`,
                            performedBy: userId,
                        },
                    })

                    return webtoon
                })

                return NextResponse.json({ webtoon: created })
            } catch (e: any) {
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                    // slug conflict: a webtoon with same slug was likely created concurrently
                    return NextResponse.json({ error: 'A webtoon with this title already exists' }, { status: 400 })
                }

                console.error('Error creating webtoon:', e)
                return NextResponse.json(
                    { error: 'Failed to create webtoon' },
                    { status: 500 }
                )
            }
        } catch (error) {
            console.error('Error creating webtoon:', error)
            return NextResponse.json(
                { error: 'Failed to create webtoon' },
                { status: 500 }
            )
        }
    },
    authOptions
)

export const PATCH = withPermission(
    PERMISSIONS.WEBTOONS_EDIT,
    async (req: Request, { userId }: { userId: string }) => {
        try {
            const body = await req.json()
            const patchSchema = z.object({
                webtoonId: z.string(),
                genreIds: z.array(z.string()).optional(),
                authorIds: z.array(z.string()).optional(),
                artistIds: z.array(z.string()).optional(),
                updates: z.record(z.string(), z.any()).optional(),
            })

            const parsed = await (async () => {
                try {
                    return { success: true, data: body }
                } catch (e) {
                    return { success: false }
                }
            })()

            const { webtoonId, genreIds, authorIds, artistIds, ...updates } = body

            if (!webtoonId) {
                return NextResponse.json({ error: 'Webtoon ID required' }, { status: 400 })
            }

            // Authorization: ensure user may edit this webtoon in the context of any group that has claimed it
            const existing = await prisma.webtoon.findUnique({ where: { id: webtoonId }, include: { webtoonGroups: true } })
            if (!existing) return NextResponse.json({ error: 'Webtoon not found' }, { status: 404 })
            const userCanAssign = await hasAnyPermission(userId, [PERMISSIONS.GROUPS_ASSIGN])
            if ((existing.webtoonGroups || []).length > 0 && !userCanAssign) {
                // require membership in at least one of the groups that claimed this webtoon
                let allowed = false
                for (const wg of existing.webtoonGroups) {
                    if (await isUserMemberOfGroup(userId, wg.groupId)) {
                        allowed = true
                        break
                    }
                }
                if (!allowed) return NextResponse.json({ error: 'Forbidden: not a member of any group managing this webtoon' }, { status: 403 })
            }

            // If attempting to change assignment, require special permission
            if (typeof updates.scanlationGroupId !== 'undefined' && !userCanAssign) {
                return NextResponse.json({ error: 'Forbidden: cannot change scanlation group' }, { status: 403 })
            }

            // Use interactive transaction to update webtoon and related records atomically
            const result = await prisma.$transaction(async (tx) => {
                const webtoon = await tx.webtoon.update({ where: { id: webtoonId }, data: updates })

                if (authorIds || artistIds) {
                    await tx.webtoonCredit.deleteMany({ where: { webtoonId } })
                    const creditsData: { webtoonId: string; authorId: string; role: string }[] = []
                    if (authorIds && authorIds.length > 0) authorIds.forEach((authorId: string) => creditsData.push({ webtoonId: webtoon.id, authorId, role: 'AUTHOR' }))
                    if (artistIds && artistIds.length > 0) artistIds.forEach((artistId: string) => creditsData.push({ webtoonId: webtoon.id, authorId: artistId, role: 'ARTIST' }))
                    if (creditsData.length > 0) await tx.webtoonCredit.createMany({ data: creditsData })
                }

                if (genreIds) {
                    await tx.webtoonGenre.deleteMany({ where: { webtoonId } })
                    if (genreIds.length > 0) await tx.webtoonGenre.createMany({ data: genreIds.map((genreId: string) => ({ webtoonId, genreId })) })
                }

                await tx.activityLog.create({ data: { action: 'updated', entityType: 'webtoon', entityId: webtoon.id, details: `Updated webtoon: '${webtoon.title}'`, performedBy: userId } })

                return webtoon
            })

            return NextResponse.json({ webtoon: result })
        } catch (error) {
            console.error('Error updating webtoon:', error)
            return NextResponse.json(
                { error: 'Failed to update webtoon' },
                { status: 500 }
            )
        }
    },
    authOptions
)

export const DELETE = withPermission(
    PERMISSIONS.WEBTOONS_DELETE,
    async (req: Request, { userId }: { userId: string }) => {
        try {
            const { searchParams } = new URL(req.url)
            const webtoonId = searchParams.get('webtoonId')

            if (!webtoonId) {
                return NextResponse.json(
                    { error: 'Webtoon ID required' },
                    { status: 400 }
                )
            }

            // Deleting: ensure user belongs to at least one group that manages this webtoon unless they have assign permission
            const webtoon = await prisma.webtoon.findUnique({ where: { id: webtoonId }, include: { webtoonGroups: true } })
            if (!webtoon) return NextResponse.json({ error: 'Webtoon not found' }, { status: 404 })

            const canAssign = await hasAnyPermission(userId, [PERMISSIONS.GROUPS_ASSIGN])
            if ((webtoon.webtoonGroups || []).length > 0 && !canAssign) {
                let allowed = false
                for (const wg of webtoon.webtoonGroups) {
                    if (await isUserMemberOfGroup(userId, wg.groupId)) { allowed = true; break }
                }
                if (!allowed) return NextResponse.json({ error: 'Forbidden: not a member of any group managing this webtoon' }, { status: 403 })
            }

            await prisma.webtoon.delete({ where: { id: webtoonId } })

            // Log activity
            await prisma.activityLog.create({
                data: {
                    action: 'deleted',
                    entityType: 'webtoon',
                    entityId: webtoonId,
                    details: `Webtoon excluída: '${webtoon?.title || ''}'`,
                    performedBy: userId,
                },
            })

            return NextResponse.json({ success: true })
        } catch (error) {
            console.error('Error deleting webtoon:', error)
            return NextResponse.json(
                { error: 'Failed to delete webtoon' },
                { status: 500 }
            )
        }
    },
    authOptions
)

// Default export for Next.js Pages API compatibility.
// This file also exports edge-style handlers (GET/POST/etc.) used by the App Router.
// The default export below adapts incoming NextApiRequest to the exported handlers
// so pages/api consumers won't break.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const method = (req.method || 'GET').toUpperCase()

    // Build an absolute URL for the Request expected by the handlers.
    const proto = req.headers['x-forwarded-proto'] || req.headers['referer']?.toString().split(':')[0] || 'http'
    const host = req.headers.host || 'localhost'
    const url = `${proto}://${host}${req.url}`

    // Build a Web Request compatible object. If body exists, ensure it's a JSON string.
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

        if (!response) {
            return res.status(500).json({ error: 'No response from handler' })
        }

        const resBody = await response.text()
        const contentType = response.headers.get('content-type') || ''

        if (contentType.includes('application/json')) {
            try {
                const json = JSON.parse(resBody)
                return res.status(response.status).json(json)
            } catch (e) {
                // Fallback to raw text if JSON parsing fails
            }
        }

        res.status(response.status)
        if (contentType) res.setHeader('Content-Type', contentType)
        return res.send(resBody)
    } catch (error) {
        console.error('Pages API adapter error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
