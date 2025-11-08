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
            const type = searchParams.get('type') as 'webtoon' | 'novel' | 'all' | null
            
            if (singleId) {
                // Return a single work (webtoon or novel)
                // Try to detect type automatically
                let work = null
                let workType = null
                
                // Try webtoon first
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


                if (webtoon) {
                    work = {
                        ...webtoon,
                        type: 'webtoon',
                        authors: webtoon.credits?.filter((c: any) => c.role === 'AUTHOR').map((c: any) => c.author) || [],
                        artists: webtoon.credits?.filter((c: any) => c.role === 'ARTIST').map((c: any) => c.author) || [],
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
                    workType = 'webtoon'
                } else {
                    // Try novel
                    const novel = await prisma.novel.findFirst({
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
                            _count: { select: { chapters: true } },
                        },
                    })

                    if (novel) {
                        work = {
                            ...novel,
                            type: 'novel',
                            authors: novel.credits?.filter((c: any) => c.role === 'AUTHOR').map((c: any) => c.author) || [],
                            artists: novel.credits?.filter((c: any) => c.role === 'ARTIST').map((c: any) => c.author) || [],
                            genres: novel.genres.map(ng => ({ id: ng.genre.id, name: ng.genre.name })),
                            chapters: novel.chapters.map(c => ({
                                id: c.id,
                                number: c.number,
                                title: c.title,
                                content: c.content,
                                publishedAt: c.publishedAt,
                                createdAt: (c as any).createdAt || new Date(),
                            })),
                        }
                        workType = 'novel'
                    }
                }

                if (!work) {
                    return NextResponse.json({ error: 'Work not found' }, { status: 404 })
                }

                return NextResponse.json({ work, type: workType })
            }

            // List works
            const page = parseInt(searchParams.get('page') || '1')
            const limit = parseInt(searchParams.get('limit') || '12')
            const status = searchParams.get('status')
            const authorId = searchParams.get('authorId')
            const search = searchParams.get('search')

            const where: any = {}
            if (status) where.status = status
            if (authorId) where.credits = { some: { authorId: authorId } }
            if (search) {
                where.OR = [
                    { title: { contains: search } },
                    { description: { contains: search } },
                ]
            }

            let webtoons: any[] = []
            let novels: any[] = []
            let totalWebtoons = 0
            let totalNovels = 0

            if (!type || type === 'all' || type === 'webtoon') {
                [webtoons, totalWebtoons] = await Promise.all([
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
                            views: true,
                            createdAt: true,
                            updatedAt: true,
                            credits: { select: { role: true, author: { select: { id: true, name: true, slug: true } } } },
                            genres: { include: { genre: { select: { id: true, name: true } } } },
                            _count: { select: { chapters: true } },
                        },
                    }),
                    prisma.webtoon.count({ where }),
                ])

                webtoons = webtoons.map(w => ({
                    ...w,
                    type: 'webtoon',
                    authors: w.credits?.filter((c: any) => c.role === 'AUTHOR').map((c: any) => c.author) || []
                }))
            }

            if (!type || type === 'all' || type === 'novel') {
                [novels, totalNovels] = await Promise.all([
                    prisma.novel.findMany({
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
                            views: true,
                            createdAt: true,
                            updatedAt: true,
                            credits: { select: { role: true, author: { select: { id: true, name: true, slug: true } } } },
                            genres: { include: { genre: { select: { id: true, name: true } } } },
                            _count: { select: { chapters: true } },
                        },
                    }),
                    prisma.novel.count({ where }),
                ])

                novels = novels.map(n => ({
                    ...n,
                    type: 'novel',
                    authors: n.credits?.filter((c: any) => c.role === 'AUTHOR').map((c: any) => c.author) || []
                }))
            }

            const works = [...webtoons, ...novels].sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )

            const total = totalWebtoons + totalNovels

            return NextResponse.json({
                works,
                webtoons,
                novels,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            })
        } catch (error) {
            console.error('Error fetching works:', error)
            return NextResponse.json(
                { error: 'Failed to fetch works' },
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
                type: z.enum(['webtoon', 'novel']),
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

            const { type, title, description, authorIds, artistIds, genreIds, coverImage, status } = parsed.data
            const { scanlationGroupId } = parsed.data as { scanlationGroupId?: string }

            // Generate slug
            const slug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')

            try {
                let assignGroupId: string | null = null
                if (scanlationGroupId && type === 'webtoon') {
                    const canAssign = await hasAnyPermission(userId, [PERMISSIONS.GROUPS_ASSIGN])
                    if (!canAssign) {
                        const isMember = await isUserMemberOfGroup(userId, scanlationGroupId)
                        if (!isMember) return NextResponse.json({ error: 'Forbidden: not a member of the target group' }, { status: 403 })
                    }
                    assignGroupId = scanlationGroupId
                } else if (type === 'webtoon') {
                    const member = await prisma.groupMember.findFirst({ where: { userId } })
                    if (member) assignGroupId = member.groupId
                }

                const created = await prisma.$transaction(async (tx) => {
                    let work: any

                    if (type === 'webtoon') {
                        work = await tx.webtoon.create({
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
                        authorIds.forEach((authorId: string) => creditsData.push({ webtoonId: work.id, authorId, role: 'AUTHOR' }))
                        if (artistIds && artistIds.length > 0) {
                            artistIds.forEach((artistId: string) => creditsData.push({ webtoonId: work.id, authorId: artistId, role: 'ARTIST' }))
                        }

                        if (creditsData.length > 0) {
                            await tx.webtoonCredit.createMany({ data: creditsData })
                        }

                        if (genreIds && genreIds.length > 0) {
                            await tx.webtoonGenre.createMany({ data: genreIds.map((genreId: string) => ({ webtoonId: work.id, genreId })) })
                        }

                        if (assignGroupId) {
                            try {
                                await tx.webtoonGroup.create({ data: { webtoonId: work.id, groupId: assignGroupId } })
                            } catch (e) { }
                        }

                        await tx.activityLog.create({
                            data: {
                                action: 'created',
                                entityType: 'webtoon',
                                entityId: work.id,
                                details: `Title: '${work.title}'`,
                                performedBy: userId,
                            },
                        })
                    } else {
                        // Novel
                        work = await tx.novel.create({
                            data: {
                                title,
                                slug,
                                description,
                                coverImage,
                                bannerImage: parsed.data.bannerImage,
                                status: status || 'ongoing',
                            },
                        })

                        const creditsData: { novelId: string; authorId: string; role: string }[] = []
                        authorIds.forEach((authorId: string) => creditsData.push({ novelId: work.id, authorId, role: 'AUTHOR' }))
                        if (artistIds && artistIds.length > 0) {
                            artistIds.forEach((artistId: string) => creditsData.push({ novelId: work.id, authorId: artistId, role: 'ARTIST' }))
                        }

                        if (creditsData.length > 0) {
                            await tx.novelCredit.createMany({ data: creditsData })
                        }

                        if (genreIds && genreIds.length > 0) {
                            await tx.novelGenre.createMany({ data: genreIds.map((genreId: string) => ({ novelId: work.id, genreId })) })
                        }

                        await tx.activityLog.create({
                            data: {
                                action: 'created',
                                entityType: 'novel',
                                entityId: work.id,
                                details: `Title: '${work.title}'`,
                                performedBy: userId,
                            },
                        })
                    }

                    return { ...work, type }
                })

                return NextResponse.json({ work: created })
            } catch (e: any) {
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                    return NextResponse.json({ error: 'A work with this title already exists' }, { status: 400 })
                }

                console.error('Error creating work:', e)
                return NextResponse.json(
                    { error: 'Failed to create work' },
                    { status: 500 }
                )
            }
        } catch (error) {
            console.error('Error creating work:', error)
            return NextResponse.json(
                { error: 'Failed to create work' },
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
            const workId = searchParams.get('workId')
            const type = searchParams.get('type') as 'webtoon' | 'novel' | null

            if (!workId) {
                return NextResponse.json(
                    { error: 'Work ID required' },
                    { status: 400 }
                )
            }

            let workType = type
            if (!workType) {
                // Auto-detect type
                const webtoon = await prisma.webtoon.findUnique({ where: { id: workId } })
                if (webtoon) {
                    workType = 'webtoon'
                } else {
                    const novel = await prisma.novel.findUnique({ where: { id: workId } })
                    if (novel) workType = 'novel'
                }
            }

            if (!workType) {
                return NextResponse.json({ error: 'Work not found' }, { status: 404 })
            }

            if (workType === 'webtoon') {
                const webtoon = await prisma.webtoon.findUnique({ where: { id: workId }, include: { webtoonGroups: true } })
                if (!webtoon) return NextResponse.json({ error: 'Webtoon not found' }, { status: 404 })

                const canAssign = await hasAnyPermission(userId, [PERMISSIONS.GROUPS_ASSIGN])
                if ((webtoon.webtoonGroups || []).length > 0 && !canAssign) {
                    let allowed = false
                    for (const wg of webtoon.webtoonGroups) {
                        if (await isUserMemberOfGroup(userId, wg.groupId)) { allowed = true; break }
                    }
                    if (!allowed) return NextResponse.json({ error: 'Forbidden: not a member of any group managing this webtoon' }, { status: 403 })
                }

                await prisma.webtoon.delete({ where: { id: workId } })

                await prisma.activityLog.create({
                    data: {
                        action: 'deleted',
                        entityType: 'webtoon',
                        entityId: workId,
                        details: `Webtoon excluído: '${webtoon?.title || ''}'`,
                        performedBy: userId,
                    },
                })
            } else {
                const novel = await prisma.novel.findUnique({ where: { id: workId } })
                if (!novel) return NextResponse.json({ error: 'Novel not found' }, { status: 404 })

                await prisma.novel.delete({ where: { id: workId } })

                await prisma.activityLog.create({
                    data: {
                        action: 'deleted',
                        entityType: 'novel',
                        entityId: workId,
                        details: `Novel excluída: '${novel?.title || ''}'`,
                        performedBy: userId,
                    },
                })
            }

            return NextResponse.json({ success: true })
        } catch (error) {
            console.error('Error deleting work:', error)
            return NextResponse.json(
                { error: 'Failed to delete work' },
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
            case 'GET':
                response = await GET(webReq as any, routeContext)
                break
            case 'POST':
                response = await POST(webReq as any, routeContext)
                break
            case 'DELETE':
                response = await DELETE(webReq as any, routeContext)
                break
            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
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
            } catch (e) { }
        }

        res.status(response.status)
        if (contentType) res.setHeader('Content-Type', contentType)
        return res.send(resBody)
    } catch (error) {
        console.error('Pages API adapter error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
