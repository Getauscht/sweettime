import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { authorId } = req.query

    const slugOrId = authorId as string

    if (typeof slugOrId !== 'string') {
        return res.status(400).json({ error: 'Invalid author ID' })
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Support both id and slug in the same dynamic route. First try by id, then by slug.
        let author = await prisma.author.findUnique({
            where: { id: slugOrId },
            include: {
                _count: { select: { webtoonCredits: true } },
                webtoonCredits: {
                    orderBy: {
                        webtoon: {
                            createdAt: 'desc'
                        }
                    },
                    include: {
                        webtoon: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                coverImage: true,
                                views: true
                            }
                        }
                    }
                }
            }
        })

        if (!author) {
            author = await prisma.author.findUnique({
                where: { slug: slugOrId },
                include: {
                    _count: { select: { webtoonCredits: true } },
                    webtoonCredits: {
                        orderBy: {
                            webtoon: {
                                createdAt: 'desc'
                            }
                        },
                        include: {
                            webtoon: {
                                select: {
                                    id: true,
                                    title: true,
                                    slug: true,
                                    coverImage: true,
                                    views: true
                                }
                            }
                        }
                    }
                }
            })
        }

        if (!author) {
            return res.status(404).json({ error: 'Author not found' })
        }

        // Map webtoonCredits to webtoon array for compatibility
        const webtoonAll = author.webtoonCredits.map(credit => credit.webtoon)

        // Deduplicate webtoons by id in case an author has multiple credits for the same webtoon
        const webtoonMap = new Map<string, typeof webtoonAll[0]>()
        for (const w of webtoonAll) {
            if (!webtoonMap.has(w.id)) webtoonMap.set(w.id, w)
        }
        const webtoon = Array.from(webtoonMap.values())

        return res.status(200).json({ author: { ...author, webtoon } })
    } catch (error) {
        console.error('Error fetching author:', error)
        return res.status(500).json({ error: 'Failed to fetch author' })
    }
}
