import crypto from 'crypto'

const KEY_ENV = process.env.APP_TOTP_KEY || ''
if (!KEY_ENV) {
    // Don't throw at import time in all environments; use helper to check in handlers.
    // Console.warn intentionally omitted to avoid noisy logs during tests.
}

export function isTOTPKeyConfigured() {
    return Boolean(KEY_ENV)
}

export function encryptSecret(plaintext: string): string {
    if (!KEY_ENV) throw new Error('APP_TOTP_KEY not configured')
    const key = Buffer.from(KEY_ENV, 'base64')
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    // store as base64 parts: iv:ciphertext:tag
    return `${iv.toString('base64')}:${ciphertext.toString('base64')}:${authTag.toString('base64')}`
}

export function decryptSecret(payload: string): string {
    if (!KEY_ENV) throw new Error('APP_TOTP_KEY not configured')
    const key = Buffer.from(KEY_ENV, 'base64')
    const [ivB64, ctB64, tagB64] = payload.split(':')
    if (!ivB64 || !ctB64 || !tagB64) throw new Error('Invalid payload')
    const iv = Buffer.from(ivB64, 'base64')
    const ciphertext = Buffer.from(ctB64, 'base64')
    const authTag = Buffer.from(tagB64, 'base64')

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString('utf8')
}

export function sha256hex(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex')
}
