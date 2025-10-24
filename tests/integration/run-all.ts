import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { generateTOTPSecret, generateQRCode, verifyTOTP } from '@/lib/auth/totp'
import { encryptSecret, decryptSecret, sha256hex } from '@/lib/crypto'
import { authenticator } from 'otplib'
import { randomBytes } from 'crypto'
import { runConcurrencyTest } from './reading-history-concurrency'

async function run() {
    console.log('Starting integration tests (TOTP + reset)')

    // create test user
    const email = `test+${Date.now()}@example.com`
    const user = await prisma.user.create({ data: { email, password: null } })
    console.log('Created user', user.id)

    try {
        // TOTP setup: generate secret, save temp encrypted
        const secret = generateTOTPSecret()
        const encrypted = encryptSecret(secret)
        const expires = new Date(Date.now() + 10 * 60 * 1000)

        await prisma.user.update({ where: { id: user.id }, data: { totpTempSecretEncrypted: encrypted, totpTempExpires: expires } })

        // decrypt and generate token
        const plain = decryptSecret(encrypted)
        const token = authenticator.generate(plain)

        // verify using verifyTOTP (should be true)
        const ok = verifyTOTP(token, plain)
        if (!ok) throw new Error('TOTP verification failed in integration test')
        console.log('TOTP verification OK')

        // promote to permanent
        await prisma.user.update({ where: { id: user.id }, data: { totpSecretEncrypted: encrypted, totpTempSecretEncrypted: null, totpTempExpires: null, totpEnabled: true } as any })

        const u2 = await prisma.user.findUnique({ where: { id: user.id } })
        if (!u2 || !u2.totpEnabled) throw new Error('TOTP not enabled after promote')
        console.log('TOTP promoted and enabled')

        // Password reset flow: create token, store hash, simulate reset lookup
        const tokenReset = randomBytes(32).toString('hex')
        const tokenHash = sha256hex(tokenReset)
        const expiresAt = new Date(Date.now() + 3600 * 1000)

        const pr = await prisma.passwordReset.create({ data: { userId: user.id, tokenHash, expires: expiresAt } })
        console.log('Created password reset entry', pr.id)

        // simulate lookup
        const lookup = await prisma.passwordReset.findFirst({ where: { tokenHash, userId: user.id } })
        if (!lookup) throw new Error('PasswordReset lookup failed')
        console.log('PasswordReset lookup OK')

        // cleanup password reset
        await prisma.passwordReset.deleteMany({ where: { userId: user.id } })

        console.log('Integration tests passed')
        // Run concurrency test for reading-history
        await runConcurrencyTest()
        console.log('Reading-history concurrency test passed')
    } finally {
        // cleanup user
        await prisma.user.deleteMany({ where: { email } })
    }
}

run().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1) })
