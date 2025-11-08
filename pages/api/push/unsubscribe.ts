/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const auth = (req as any).auth
    const userId = auth?.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    try {
        const { endpoint } = req.body
        if (!endpoint) return res.status(400).json({ error: 'Invalid payload' })
        // userId already extracted from auth at top
        const endpointHash = createHash('sha256').update(String(endpoint)).digest('hex')
        try {
            await prisma.pushSubscription.deleteMany({ where: { endpointHash, userId } })
        } catch (err: any) {
            // If column endpointHash doesn't exist yet in DB, fall back to deleting by raw endpoint
            if (err?.code === 'P2022') {
                try {
                    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } })
                } catch (innerErr) {
                    console.error('Fallback unsubscribe failed', innerErr)
                    throw innerErr
                }
            } else {
                console.error('Error removing subscription', err)
                throw err
            }
        }

        return res.status(200).json({ success: true })
    } catch (err) {
        console.error('Error removing subscription', err)
        return res.status(500).json({ error: 'Failed to remove subscription' })
    }
}

export default withAuth(handler, authOptions)
