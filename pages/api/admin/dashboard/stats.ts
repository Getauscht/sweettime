import { NextResponse } from 'next/server'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/auth/middleware'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { authOptions } from '../../auth/[...nextauth]'

export const GET = withPermission(
    PERMISSIONS.ANALYTICS_VIEW,
    async (req: Request) => {
        try {
            // Get statistics
            const [
                totalWebtoons,
                totalAuthors,
                totalUsers,
                activeUsers,
                totalGenres,
                totalChapters,
                totalViews,
            ] = await Promise.all([
                prisma.webtoon.count(),
                prisma.author.count(),
                prisma.user.count(),
                prisma.user.count({
                    where: {
                        lastActive: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                        },
                    },
                }),
                prisma.genre.count(),
                prisma.chapter.count(),
                prisma.chapter.aggregate({
                    _sum: {
                        views: true,
                    },
                }),
            ])

            // Get recent activity
            const recentActivity = await prisma.activityLog.findMany({
                take: 10,
                orderBy: {
                    createdAt: 'desc',
                },
            })

            // Get top webtoons by views (select explicit fields to avoid referencing DB columns
            // that may not exist yet during progressive migrations)
            const topWebtoons = await prisma.webtoon.findMany({
                take: 5,
                orderBy: { views: 'desc' },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    coverImage: true,
                    views: true,
                    // include minimal author info
                    author: {
                        select: { id: true, name: true, slug: true },
                    },
                },
            })

            return NextResponse.json({
                statistics: {
                    totalWebtoons,
                    totalAuthors,
                    totalUsers,
                    activeUsers,
                    totalGenres,
                    totalChapters,
                    totalViews: totalViews._sum.views || 0,
                },
                recentActivity,
                topWebtoons,
            })
        } catch (error) {
            console.error('Error fetching dashboard stats:', error)
            return NextResponse.json(
                { error: 'Failed to fetch statistics' },
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

    const webReq = new Request(url, { method, headers: req.headers as HeadersInit })
    const routeContext = { req, res }

    try {
        const response = await GET(webReq as any, routeContext)
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
