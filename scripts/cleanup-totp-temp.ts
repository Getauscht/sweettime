#!/usr/bin/env tsx
import 'dotenv/config'
import { prisma } from '@/lib/prisma'

async function main() {
    const res = await (prisma.user as any).updateMany({
        where: { totpTempExpires: { lt: new Date() } },
        data: { totpTempSecretEncrypted: null, totpTempExpires: null },
    })
    console.log('Cleared expired temp TOTP for', res.count, 'users')
}

main().catch((e) => { console.error(e); process.exit(1) })
