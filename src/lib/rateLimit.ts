import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible'
import { redis } from './redis'

let redisLimiter: any | null = null

export function getRateLimiter(keyPrefix = 'rl', points = 5, duration = 60 * 10) {
    if (process.env.REDIS_URL) {
        if (!redisLimiter) redisLimiter = new RateLimiterRedis({ storeClient: redis as any, points, duration, keyPrefix })
        return redisLimiter
    }

    return new RateLimiterMemory({ points, duration })
}

export async function consumeRateLimit(key: string, points = 1, limiter = getRateLimiter()) {
    try {
        await limiter.consume(key, points)
        return { ok: true }
    } catch (err: any) {
        return { ok: false, msBeforeNext: err.msBeforeNext }
    }
}

