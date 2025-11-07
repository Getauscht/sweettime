import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../../auth/[...nextauth]';
import { getServerSession } from 'next-auth';
import { isUserMemberOfGroup } from '@/lib/auth/groups';
import z from 'zod';

const createChapterSchema = z.object({
    number: z.number().int().positive(),
    title: z.string().min(1).max(200),
    content: z.array(z.string().url()).min(1),
    groupIds: z.array(z.string()).min(1),
})

const updateWebtoonSchema = z.object({
    status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']).optional(),
    description: z.string().max(500).optional().nullable(),
    title: z.string().min(1).max(100).optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const session = await getServerSession(req, res, authOptions)

    const { webtoonId } = req.query

    if (typeof webtoonId !== 'string') {
        return res.status(400).json({ error: 'Invalid webtoon identifier' })
    }

    if (!session?.user) {
        return res.status(401).json({ error: 'Unauthorized' })
    }
    
    if (req.method == 'GET') {
        try {
            // Try to find by slug first, then by ID
            const webtoon = await prisma.webtoon.findFirst({
                where: {
                    OR: [
                        { slug: webtoonId },
                        { id: webtoonId }
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
                    genres: {
                        include: {
                            genre: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true
                                }
                            }
                        }
                    },
                    credits: {
                        select: {
                            author: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true
                                }
                            },
                        }
                    },
                    chapters: {
                        select: {
                            id: true,
                            number: true,
                            title: true,
                            views: true,
                            likes: true,
                            publishedAt: true,
                            scanlationGroup: { select: { id: true, name: true } }
                        },
                        orderBy: { number: 'desc' },
                        take: 5 // Latest 5 chapters for preview
                    },
                    _count: {
                        select: {
                            chapters: true
                        }
                    }
                }
            })

            if (!webtoon) {
                return res.status(404).json({ error: 'Webtoon not found' })
            }

            console.log("credits", webtoon.credits)

            // Get total chapters count
            const totalChapters = webtoon._count.chapters

            // Get all chapters for chapter list
            const allChapters = await prisma.chapter.findMany({
                where: { webtoonId: webtoon.id },
                select: {
                    id: true,
                    number: true,
                    title: true,
                    publishedAt: true,
                    scanlationGroup: { select: { id: true, name: true } },
                    views: true,
                },
                orderBy: { number: 'asc' }
            })

            // Format response
            const authors = webtoon.credits?.map(c => c.author) || []
            const response = {
                id: webtoon.id,
                title: webtoon.title,
                slug: webtoon.slug,
                description: webtoon.description,
                coverImage: webtoon.coverImage,
                bannerImage: webtoon.bannerImage,
                // Legacy key (array) kept for backward compatibility
                author: authors,
                // Standardized authors array
                authors,
                status: webtoon.status,
                views: webtoon.views,
                likes: webtoon.likes,
                rating: webtoon.rating,
                createdAt: webtoon.createdAt,
                updatedAt: webtoon.updatedAt,
                genres: webtoon.genres.map(wg => wg.genre),
                latestChapters: webtoon.chapters,
                totalChapters,
                allChapters
            }

            return res.status(200).json({ webtoon: response })
        } catch (error) {
            console.error('Error fetching webtoon:', error)
            return res.status(500).json({ error: 'Failed to fetch webtoon' })
        }
    } else if (req.method === 'POST') {
        try {
            const parsed = createChapterSchema.parse(req.body)

            // Verify webtoon exists
            const webtoon = await prisma.webtoon.findUnique({ where: { id: webtoonId } })
            if (!webtoon) {
                return res.status(404).json({ error: 'Webtoon not found' })
            }

            // Verify user is member of at least one selected group
            let userCanCreateIn = false
            for (const groupId of parsed.groupIds) {
                const isMember = await isUserMemberOfGroup(session.user.id, groupId)
                if (isMember) {
                    userCanCreateIn = true
                    break
                }
            }

            if (!userCanCreateIn) {
                return res.status(403).json({ error: 'You must be a member of at least one of the selected groups' })
            }

            // Verify all groups exist
            const groupsCount = await prisma.scanlationGroup.count({
                where: { id: { in: parsed.groupIds } },
            })

            if (groupsCount !== parsed.groupIds.length) {
                return res.status(400).json({ error: 'Invalid groups' })
            }

            // Check if chapter number already exists
            const existingChapter = await prisma.chapter.findUnique({
                where: {
                    webtoonId_number: {
                        webtoonId: webtoonId,
                        number: parsed.number,
                    },
                },
            })

            if (existingChapter) {
                return res.status(400).json({ error: 'Chapter number already exists' })
            }

            // Create chapter for each group (one per group)
            // This way each group has their own version/translation of the chapter
            const chapters: any[] = []

            for (const groupId of parsed.groupIds) {
                const chapter = await prisma.chapter.create({
                    data: {
                        webtoonId: webtoonId,
                        number: parsed.number,
                        title: parsed.title,
                        content: parsed.content,
                        scanlationGroupId: groupId,
                    },
                    include: {
                        scanlationGroup: { select: { id: true, name: true } },
                    },
                })
                chapters.push(chapter)
            }

            return res.status(201).json({ chapters })
        } catch (error: any) {
            console.error('Error creating chapter:', error)
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Invalid input' })
            }
            return res.status(500).json({ error: 'Failed to create chapter', details: error.message })
        }
    } else if (req.method === 'PATCH') {
        try {
            const parsed = updateWebtoonSchema.parse(req.body)

            // Verify webtoon exists
            const webtoon = await prisma.webtoon.findUnique({ where: { id: webtoonId } })
            if (!webtoon) {
                return res.status(404).json({ error: 'Webtoon not found' })
            }

            // Update webtoon
            const updated = await prisma.webtoon.update({
                where: { id: webtoonId },
                data: {
                    ...(parsed.status && { status: parsed.status }),
                    ...(parsed.description !== undefined && { description: parsed.description }),
                    ...(parsed.title && { title: parsed.title }),
                },
                include: {
                    chapters: {
                        include: { scanlationGroup: { select: { id: true, name: true } } },
                        orderBy: { number: 'desc' },
                    },
                    _count: { select: { chapters: true } },
                },
            })

            return res.status(200).json({ webtoon: updated })
        } catch (error: any) {
            console.error('Error updating webtoon:', error)
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Invalid input' })
            }
            return res.status(500).json({ error: 'Failed to update webtoon' })
        }
    } else if (req.method === 'DELETE') {
        try {
            const webtoon = await prisma.webtoon.findUnique({ where: { id: webtoonId } })
            if (!webtoon) {
                return res.status(404).json({ error: 'Webtoon not found' })
            }

            await prisma.webtoon.delete({ where: { id: webtoon.id } })
            return res.status(200).json({ message: 'Webtoon deleted' })
        } catch (error: any) {
            console.error('Error deleting webtoon:', error)
            return res.status(500).json({ error: 'Failed to delete webtoon' })
        }
    }
}
