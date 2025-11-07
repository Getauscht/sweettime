import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { isGroupMember } from '@/lib/auth/groups'
import { Prisma } from '@prisma/client'
import { generateSlug } from '@/lib/slug'
import { z } from 'zod'

// Validation schema for author creation
const createAuthorSchema = z.object({
    name: z.string().min(1).max(255),
    bio: z.string().max(2000).optional().nullable(),
    avatar: z.string().url().optional().nullable(),
    socialLinks: z.record(z.string(), z.string()).optional().nullable(),
})

type CreateAuthorInput = z.infer<typeof createAuthorSchema>

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    // Only POST is allowed for creation
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST'])
        return res.status(405).json({ error: `Method ${req.method} not allowed` })
    }

    // Require authentication
    if (!session?.user) {
        return res.status(401).json({ error: 'Unauthorized - login required' })
    }

    // Check if user is a member of at least one group (required for author creation)
    const isMember = await isGroupMember(session.user.id)
    if (!isMember) {
        return res.status(403).json({
            error: 'Forbidden - only members of ScanlationGroups can create authors',
        })
    }

    try {
        // Validate request body
        const validatedData = createAuthorSchema.parse(req.body)

        // Generate slug server-side (ignore any slug supplied by client)
        const maxCreateAttempts = 6
        let lastError: any = null
        for (let attempt = 0; attempt < maxCreateAttempts; attempt++) {
            try {
                const slug = await generateSlug(prisma, validatedData.name)
                const author = await prisma.author.create({
                    data: {
                        name: validatedData.name,
                        slug,
                        bio: validatedData.bio,
                        avatar: validatedData.avatar,
                        socialLinks: validatedData.socialLinks as any,
                    },
                })

                return res.status(201).json({ message: 'Author created successfully', author })
            } catch (err: any) {
                lastError = err
                // If unique constraint error (possible race), retry
                if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                    // retry
                    continue
                }
                // other errors -> break and return 500
                console.error('Error creating author (non-retry):', err)
                return res.status(500).json({ error: 'Failed to create author' })
            }
        }

        console.error('Error creating author after retries:', lastError)
        return res.status(500).json({ error: 'Failed to create author after retries' })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.issues,
            })
        }

        console.error('Error creating author:', error)
        return res.status(500).json({
            error: 'Failed to create author',
        })
    }
}
