import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(redisUrl)

redis.on('error', (err) => {
    console.error('Redis error', err)
})

export async function shutdownRedis() {
    try {
        await redis.quit()
    } catch (err) {
        try { await redis.disconnect() } catch (e) { }
    }
}
