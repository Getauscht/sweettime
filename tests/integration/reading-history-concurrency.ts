import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { Prisma } from '@prisma/client'

export async function runConcurrencyTest() {
    console.log('Starting reading-history concurrency test')

    // Setup: create webtoon, chapter
    const webtoon = await prisma.webtoon.create({ data: { title: `test-webtoon-${Date.now()}`, slug: `test-webtoon-${Date.now()}-${Math.random().toString(36).substring(2, 8)}` } })
    const chapter = await prisma.chapter.create({ data: { webtoonId: webtoon.id, number: 1, content: [] as any } })

    const sessionId = uuidv4()
    const userId = null

    // Helper emulates the server handler: try create then handle P2002 by finding existing and updating
    async function createOrUpdate(progress: number) {
        const where = userId ? { userId, webtoonId: webtoon.id, chapterId: chapter.id } : { sessionId, webtoonId: webtoon.id, chapterId: chapter.id }
        const createData: any = {
            userId,
            sessionId: userId ? null : sessionId,
            webtoonId: webtoon.id,
            chapterId: chapter.id,
            progress,
            lastReadAt: new Date(),
        }

        try {
            return await prisma.readingHistory.create({ data: createData })
        } catch (err: any) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                const existing = await prisma.readingHistory.findFirst({ where })
                if (existing) {
                    return await prisma.readingHistory.update({ where: { id: existing.id }, data: { progress, lastReadAt: new Date() } })
                }
                // fallback: try create again
                return await prisma.readingHistory.create({ data: createData })
            }
            throw err
        }
    }

    // Fire many concurrent requests
    const tasks = [] as Promise<any>[]
    for (let i = 0; i < 16; i++) {
        tasks.push(createOrUpdate(Math.floor(Math.random() * 100)))
    }

    const results = await Promise.allSettled(tasks)

    const rejected = results.filter(r => r.status === 'rejected')
    if (rejected.length > 0) {
        console.error('Some concurrent tasks failed', rejected)
        throw new Error('Concurrency test failed: some tasks rejected')
    }

    const rows = await prisma.readingHistory.findMany({ where: { webtoonId: webtoon.id, chapterId: chapter.id } })
    if (rows.length !== 1) {
        console.error('Expected single readingHistory row, got', rows.length)
        throw new Error('Concurrency test failed: unexpected number of rows')
    }

    console.log('Concurrency test passed: single readingHistory row created and updated')

    // cleanup
    await prisma.readingHistory.deleteMany({ where: { webtoonId: webtoon.id } })
    await prisma.chapter.delete({ where: { id: chapter.id } })
    await prisma.webtoon.delete({ where: { id: webtoon.id } })
}

if (require.main === module) {
    runConcurrencyTest().then(() => { console.log('Done'); process.exit(0) }).catch(err => { console.error(err); process.exit(1) })
}
