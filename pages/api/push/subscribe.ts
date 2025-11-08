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
        const subscription = req.body
        if (!subscription || !subscription.endpoint) return res.status(400).json({ error: 'Invalid subscription' })

        // Compute a stable hash for the endpoint (sha256) to use as a unique key.
        const endpointHash = createHash('sha256').update(String(subscription.endpoint)).digest('hex')

        // Upsert by endpointHash. If the DB hasn't been migrated yet (column missing), fall back to
        // find/update/create using the raw endpoint value to remain backward-compatible.
        try {
            await prisma.pushSubscription.upsert({
                where: { endpointHash },
                update: { keys: subscription.keys, userId, endpoint: subscription.endpoint, createdAt: new Date() },
                create: { endpoint: subscription.endpoint, endpointHash, keys: subscription.keys, userId }
            })
        } catch (err: any) {
            // If the database doesn't have endpointHash column yet (P2022), fall back.
            if (err?.code === 'P2022') {
                try {
                    const existing = await prisma.pushSubscription.findFirst({ where: { endpoint: subscription.endpoint } })
                    if (existing) {
                        await prisma.pushSubscription.update({ where: { id: existing.id }, data: { keys: subscription.keys, userId, endpoint: subscription.endpoint } })
                    } else {
                        // Use any cast to avoid strict Prisma create input checks in fallback path
                        await (prisma as any).pushSubscription.create({ data: { endpoint: subscription.endpoint, keys: subscription.keys, userId } })
                    }
                } catch (innerErr) {
                    console.error('Fallback save subscription failed', innerErr)
                    throw innerErr
                }
            } else {
                console.error('Error saving subscription', err)
                throw err
            }
        }

        return res.status(201).json({ success: true })
    } catch (err) {
        console.error('Error saving subscription', err)
        return res.status(500).json({ error: 'Failed to save subscription' })
    }
}

export default withAuth(handler, authOptions)
