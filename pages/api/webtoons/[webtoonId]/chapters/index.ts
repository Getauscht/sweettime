/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { isUserMemberOfGroup } from '@/lib/auth/groups'
import { z } from 'zod'

const createChapterSchema = z.object({
    number: z.number().int().positive(),
    title: z.string().min(1).max(200),
    content: z.array(z.string().url()).min(1),
    groupIds: z.array(z.string()).min(1),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { webtoonId } = req.query

    const userId = (req as any).auth?.userId

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!webtoonId || typeof webtoonId !== 'string') {
        return res.status(400).json({ error: 'Invalid webtoon ID' })
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST'])
        return res.status(405).end()
    }

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
            const isMember = await isUserMemberOfGroup(userId as string, groupId)
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

        // Ensure chapter number doesn't already exist for this webtoon
        const existingChapter = await prisma.chapter.findUnique({
            where: {
                webtoonId_number: {
                    webtoonId,
                    number: parsed.number,
                },
            },
        })

        if (existingChapter) {
            return res.status(400).json({ error: 'Chapter number already exists' })
        }

        // Create chapter for each group (one per group)
        const chapters: any[] = []

        for (const groupId of parsed.groupIds) {
            const chapter = await prisma.chapter.create({
                data: {
                    webtoonId,
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
    } catch (error: any) {
        console.error('Error creating chapter:', error)
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input' })
        }
        return res.status(500).json({ error: 'Failed to create chapter', details: error.message })
    }
}

export default withAuth(handler, authOptions)
