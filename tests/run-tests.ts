import assert from 'assert'
import { encryptSecret, decryptSecret, sha256hex } from '@/lib/crypto'

async function run() {
    const keyEnv = process.env.APP_TOTP_KEY
    if (!keyEnv) {
        console.log('Skipping tests that require APP_TOTP_KEY. Set APP_TOTP_KEY to run.')
        return
    }

    const plain = 'my-test-secret-12345'
    const cipher = encryptSecret(plain)
    const dec = decryptSecret(cipher)
    assert.strictEqual(dec, plain, 'decrypt should return original')

    const token = 'randomtoken'
    const h = sha256hex(token)
    assert.strictEqual(h.length, 64)

    console.log('All tests passed')
}

run().catch((err) => {
    console.error(err)
    process.exit(1)
})
