/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { sendPushToUser } from '@/lib/push'
import { z } from 'zod'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const auth = (req as any).auth
    if (!auth?.userId) return res.status(401).json({ error: 'Unauthorized' })

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const bodySchema = z.object({ userId: z.string().optional(), title: z.string(), body: z.string(), data: z.any().optional() })
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })

    try {
        const { userId, title, body, data } = parsed.data
        if (!userId) return res.status(400).json({ error: 'userId required' })

        const results = await sendPushToUser(userId, { title, body, data })
        return res.status(200).json({ results })
    } catch (err) {
        console.error('Error sending push', err)
        return res.status(500).json({ error: 'Failed to send push' })
    }
}

export default withAuth(handler, authOptions)
