import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { isAdminSession } from '@/lib/auth/middleware'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session || !isAdminSession(session)) {
        return res.status(403).json({ error: 'Forbidden' })
    }

    if (req.method === 'GET') {
        try {
            const permissions = await prisma.permission.findMany({
                orderBy: { name: 'asc' }
            })

            // Group permissions by category
            const grouped = permissions.reduce(
                (acc: Record<string, { name: string }[]>, permission: { name: string }) => {
                    const category = permission.name.split('.')[0]
                    if (!acc[category]) acc[category] = []
                    acc[category].push(permission)
                    return acc
                },
                {} as Record<string, { name: string }[]>
            )

            return res.status(200).json({ permissions, grouped })
        } catch (error) {
            console.error('Error fetching permissions:', error)
            return res.status(500).json({ error: 'Failed to fetch permissions' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
