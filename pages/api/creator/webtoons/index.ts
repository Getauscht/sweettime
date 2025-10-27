import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { isUserInAnyGroup } from '@/lib/auth/groups'
import { Prisma } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        let author = await prisma.author.findFirst({
            where: {
                OR: [
                    { slug: user?.name?.toLowerCase().replace(/\s+/g, '-') || '' },
                    { name: user?.name || '' },
                ],
            },
        });

        if (!author && user?.name) {
            // Try to create an author record. If a concurrent request creates the same
            // slug we may get a P2002 unique constraint error; handle that by
            // fetching the existing author.
            // Only allow auto-creation of an Author if the user belongs to at least one ScanlationGroup
            const member = await isUserInAnyGroup(userId)
            if (!member) {
                // User is not in any group - do not auto-create author
                return res.status(200).json({ webtoons: [], author: null })
            }

            const slug = `${user.name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`
            try {
                author = await prisma.author.create({
                    data: { name: user.name, slug, // associate to one of user's groups if desired
                        // Note: we could assign scanlationGroupId here but user may belong to many groups;
                        // leaving scanlationGroupId null to let user set explicit group via UI/admin later.
                    },
                })
            } catch (e: any) {
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                    // Find the existing author that caused the conflict
                    author = await prisma.author.findFirst({
                        where: {
                            OR: [
                                { slug: user?.name?.toLowerCase().replace(/\s+/g, '-') || '' },
                                { name: user?.name || '' },
                            ],
                        },
                    })
                } else {
                    console.error('Failed to auto-create author:', e)
                    return res.status(500).json({ error: 'Failed to create author profile', details: e?.message })
                }
            }
        }

        if (!author) {
            return res.status(200).json({ webtoons: [], author: null });
        }

        const webtoons = await prisma.webtoon.findMany({
            where: { credits: { some: { id: author.id } } },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                coverImage: true,
                views: true,
                likes: true,
                rating: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                credits: { select: { role: true, author: { select: { id: true, name: true, slug: true, avatar: true } } } },
                genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
                _count: { select: { chapters: true } }
            },
        });

        // Attach standardized authors array for each webtoon
        const webtoonsWithAuthors = webtoons.map(w => ({
            ...w,
            authors: w.credits?.filter(c => c.role === 'AUTHOR').map(c => c.author) || []
        }))

        return res.status(200).json({ webtoons: webtoonsWithAuthors, author });

    } catch (error: any) {
        console.error('Error fetching creator webtoons:', error);
        return res.status(500).json({ error: 'Failed to fetch webtoons', details: error.message });
    }
} 