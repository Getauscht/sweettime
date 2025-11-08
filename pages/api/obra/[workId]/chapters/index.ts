/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { isUserMemberOfGroup } from '@/lib/auth/groups'
import { z } from 'zod'

const createWebtoonChapterSchema = z.object({
    number: z.number().int().positive(),
    title: z.string().min(1).max(200),
    content: z.array(z.string().url()).min(1),
    groupIds: z.array(z.string()).min(1),
})

const createNovelChapterSchema = z.object({
    number: z.number().int().positive(),
    title: z.string().min(1).max(200).optional().nullable(),
    content: z.union([z.string(), z.object({}).passthrough()]),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { workId } = req.query

    if (!workId || typeof workId !== 'string') {
        return res.status(400).json({ error: 'Invalid work ID' })
    }

    if (req.method === 'GET') {
        try {
            // Determine type
            const webtoon = await prisma.webtoon.findUnique({ where: { id: workId } })
            const novel = await prisma.novel.findUnique({ where: { id: workId } })

            if (!webtoon && !novel) {
                return res.status(404).json({ error: 'Work not found' })
            }

            const type = webtoon ? 'webtoon' : 'novel'

            const chapters = type === 'webtoon'
                ? await prisma.chapter.findMany({
                    where: { webtoonId: workId },
                    orderBy: { number: 'asc' },
                    include: {
                        scanlationGroup: { select: { id: true, name: true } }
                    }
                })
                : await prisma.novelChapter.findMany({
                    where: { novelId: workId },
                    orderBy: { number: 'asc' }
                })

            return res.status(200).json({ chapters })
        } catch (error: any) {
            console.error('Error fetching chapters:', error)
            return res.status(500).json({ error: 'Failed to fetch chapters', details: error.message })
        }
    } else if (req.method === 'POST') {
        // Protected: only authenticated creators (members of groups) can create chapters
        const protectedHandler = async (req: NextApiRequest, res: NextApiResponse) => {
            try {
                // Determine work type
                const webtoon = await prisma.webtoon.findUnique({ where: { id: workId } })
                const novel = await prisma.novel.findUnique({ where: { id: workId } })

                if (!webtoon && !novel) {
                    return res.status(404).json({ error: 'Work not found' })
                }

                const type = webtoon ? 'webtoon' : 'novel'

                if (type === 'webtoon') {
                    const parsed = createWebtoonChapterSchema.parse(req.body)

                    // Verify user is member of at least one selected group
                    const userId = (req as any).auth?.userId
                    let userCanCreateIn = false
                    for (const groupId of parsed.groupIds) {
                        const isMember = await isUserMemberOfGroup(userId, groupId)
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
                                webtoonId: workId,
                                number: parsed.number,
                            },
                        },
                    })

                    if (existingChapter) {
                        return res.status(400).json({ error: 'Chapter number already exists' })
                    }

                    // Create chapter for each group
                    const chapters: any[] = []

                    for (const groupId of parsed.groupIds) {
                        const chapter = await prisma.chapter.create({
                            data: {
                                webtoonId: workId,
                                number: parsed.number,
                                title: parsed.title,
                                content: parsed.content,
                                scanlationGroupId: groupId,
                            },
                            include: { scanlationGroup: { select: { id: true, name: true } } },
                        })
                        chapters.push(chapter)
                    }

                    return res.status(201).json({ chapters })
                } else {
                    // Novel chapter
                    const parsed = createNovelChapterSchema.parse(req.body)

                    // Check if chapter number already exists
                    const existingChapter = await prisma.novelChapter.findUnique({
                        where: {
                            novelId_number: {
                                novelId: workId,
                                number: parsed.number,
                            },
                        },
                    })

                    if (existingChapter) {
                        return res.status(400).json({ error: 'Chapter number already exists' })
                    }

                    // Determine scanlation group for novel chapter: prefer user's group membership
                    const userId = (req as any).auth?.userId
                    const member = await prisma.groupMember.findFirst({ where: { userId } })
                    if (!member) {
                        return res.status(403).json({ error: 'Creators must belong to a ScanlationGroup to create chapters' })
                    }

                    const chapter = await prisma.novelChapter.create({
                        data: {
                            novelId: workId,
                            number: parsed.number,
                            title: parsed.title || null,
                            content: typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content),
                            scanlationGroupId: member.groupId,
                        },
                    })

                    return res.status(201).json({ chapter })
                }
            } catch (error: any) {
                console.error('Error creating chapter:', error)
                if (error instanceof z.ZodError) {
                    return res.status(400).json({ error: 'Invalid input' })
                }
                return res.status(500).json({ error: 'Failed to create chapter', details: error.message })
            }
        }

        return withAuth(protectedHandler, authOptions)(req, res)
    } else {
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).end()
    }
}
