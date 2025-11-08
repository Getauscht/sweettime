/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { novelId } = req.query as { novelId: string }

    if (req.method === 'GET') {
        try {
            // Try to find by slug first, then by ID (similar to webtoon endpoint)
            const novel = await prisma.novel.findFirst({
                where: {
                    OR: [
                        { slug: novelId },
                        { id: novelId }
                    ]
                },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    description: true,
                    coverImage: true,
                    bannerImage: true,
                    status: true,
                    views: true,
                    likes: true,
                    rating: true,
                    createdAt: true,
                    updatedAt: true,
                    chapters: {
                        select: {
                            id: true,
                            number: true,
                            title: true,
                            views: true,
                            likes: true,
                            publishedAt: true,
                        },
                        orderBy: { number: 'desc' },
                        take: 10,
                    },
                    // include groups associated with this novel so we can attach a representative
                    // scanlation group name to each novel chapter in the response
                    novelGroups: {
                        select: {
                            group: {
                                select: {
                                    id: true,
                                    name: true,
                                }
                            }
                        }
                    },
                    _count: {
                        select: { chapters: true }
                    }
                }
            })

            if (!novel) {
                return res.status(404).json({ error: 'Novel not found' })
            }

            // Get all chapters for the chapter list (ascending)
            const allChapters = await prisma.novelChapter.findMany({
                where: { novelId: novel.id },
                select: {
                    id: true,
                    number: true,
                    title: true,
                    publishedAt: true,
                    views: true,
                },
                orderBy: { number: 'asc' }
            })

            // Determine a representative group for this novel (if any).
            // Use an explicit query to ensure we fetch any NovelGroup rows even if the
            // initial select didn't return them for some reason.
            const novelGroups = await prisma.novelGroup.findMany({
                where: { novelId: novel.id },
                select: {
                    group: {
                        select: { id: true, name: true }
                    }
                },
                take: 1
            })

            const representativeGroup = (novelGroups && novelGroups.length > 0) ? novelGroups[0].group : null

            const mapChapter = (ch: any) => ({
                ...ch,
                // return null explicitly when no group exists so the key is present in JSON
                scanlationGroup: representativeGroup ? { id: representativeGroup.id, name: representativeGroup.name } : null,
            })

            const response = {
                id: novel.id,
                title: novel.title,
                slug: novel.slug,
                description: novel.description,
                coverImage: novel.coverImage,
                bannerImage: novel.bannerImage,
                status: novel.status,
                views: novel.views,
                likes: novel.likes,
                rating: novel.rating,
                createdAt: novel.createdAt,
                updatedAt: novel.updatedAt,
                latestChapters: (novel.chapters || []).map(mapChapter),
                totalChapters: novel._count?.chapters || 0,
                allChapters: allChapters.map(mapChapter),
            }

            return res.status(200).json({ novel: response })
        } catch (error: any) {
            console.error('Error fetching novel:', error)
            return res.status(500).json({ error: 'Failed to fetch novel', details: error.message })
        }
    }

    if (req.method === 'PATCH') {
        try {
            const data = req.body
            const updated = await (prisma as any).novel.update({ where: { id: novelId }, data })
            return res.status(200).json({ novel: updated })
        } catch (error: any) {
            console.error('Error updating novel:', error)
            return res.status(500).json({ error: 'Failed to update novel', details: error.message })
        }
    }

    if (req.method === 'DELETE') {
        try {
            await (prisma as any).novel.delete({ where: { id: novelId } })
            return res.status(204).end()
        } catch (error: any) {
            console.error('Error deleting novel:', error)
            return res.status(500).json({ error: 'Failed to delete novel', details: error.message })
        }
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
    return res.status(405).end()
}
