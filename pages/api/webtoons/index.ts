import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { isUserInAnyGroup } from '@/lib/auth/groups'
import { z } from 'zod'
import { authOptions } from '../auth/[...nextauth]';

const createWebtoonSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  coverImage: z.string().optional().nullable(),
  bannerImage: z.string().optional().nullable(),
  status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']).default('ongoing'),
  genreIds: z.array(z.string()).min(1),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Check if user is a member of at least one group
  const isGroupMember = await isUserInAnyGroup(session.user.id)
  if (!isGroupMember) {
    return res.status(403).json({ error: 'You must be a member of a group to manage webtoons' })
  }

  if (req.method === 'GET') {
    try {
      // Get all webtoons created by this user
      // (We'll track creator via chapters - if user has created any chapters for a webtoon, they can edit it)
      const webtoons = await prisma.webtoon.findMany({
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          coverImage: true,
          status: true,
          views: true,
          likes: true,
          rating: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { chapters: true } },
        },
        orderBy: { updatedAt: 'desc' },
      })

      return res.status(200).json({ webtoons })
    } catch (error: any) {
      console.error('Error fetching webtoons:', error)
      return res.status(500).json({ error: 'Failed to fetch webtoons', details: error.message })
    }
  } else if (req.method === 'POST') {
    try {
      const parsed = createWebtoonSchema.parse(req.body)

      // Verify genres exist
      const genresCount = await prisma.genre.count({
        where: { id: { in: parsed.genreIds } },
      })

      if (genresCount !== parsed.genreIds.length) {
        return res.status(400).json({ error: 'Invalid genres' })
      }

      // Generate slug
      const slug = parsed.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50)

      // Check slug uniqueness
      const existingSlug = await prisma.webtoon.findUnique({ where: { slug } })
      if (existingSlug) {
        return res.status(400).json({ error: 'Title already exists' })
      }

      // Create webtoon
      const webtoon = await prisma.webtoon.create({
        data: {
          title: parsed.title,
          slug,
          description: parsed.description || null,
          coverImage: parsed.coverImage || null,
          bannerImage: parsed.bannerImage || null,
          status: parsed.status,
          genres: {
            create: parsed.genreIds.map((genreId) => ({
              genreId,
            })),
          },
        },
        include: {
          genres: { include: { genre: true } },
          _count: { select: { chapters: true } },
        },
      })

      return res.status(201).json({ webtoon })
    } catch (error: any) {
      console.error('Error creating webtoon:', error)
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input' })
      }
      return res.status(500).json({ error: 'Failed to create webtoon', details: error.message })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end()
  }
}
