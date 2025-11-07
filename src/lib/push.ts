// web-push has its own types; if not installed, allow ts to continue
// @ts-ignore
import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

if (VAPID_PUBLIC && VAPID_PRIVATE) {
    try {
        webpush.setVapidDetails(
            `mailto:${process.env.EMAIL_FROM || 'no-reply@example.com'}`,
            VAPID_PUBLIC,
            VAPID_PRIVATE
        )
    } catch (e) {
        console.warn('Failed to set VAPID details for web-push:', e)
    }
}

export const getVapidPublicKey = () => VAPID_PUBLIC

export async function sendPushToSubscription(subscription: any, payload: any) {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
        throw new Error('VAPID keys are not configured')
    }

    return webpush.sendNotification(subscription, JSON.stringify(payload)).catch((err: any) => {
        // The web-push library throws on 410/404; let the caller handle cleanup
        throw err
    })
}

export async function sendPushToUser(userId: string, payload: any) {
    const subs = await (prisma as any).pushSubscription.findMany({ where: { userId } })
    const results: Array<{ id: string; ok: boolean; error?: string }> = []

    for (const s of subs) {
        try {
            await sendPushToSubscription({ endpoint: s.endpoint, keys: s.keys }, payload)
            results.push({ id: s.id, ok: true })
        } catch (err: any) {
            // If subscription is gone, remove it
            const status = err?.statusCode || err?.status || (err && err.name) || 'error'
            results.push({ id: s.id, ok: false, error: String(status) })
            if (err?.statusCode === 410 || err?.statusCode === 404) {
                try { await (prisma as any).pushSubscription.delete({ where: { id: s.id } }) } catch (e) { }
            }
        }
    }

    return results
}
