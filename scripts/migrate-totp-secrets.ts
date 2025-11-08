#!/usr/bin/env tsx
import 'dotenv/config'

async function main() {
    const key = process.env.APP_TOTP_KEY
    if (!key) {
        console.error('APP_TOTP_KEY is not set. Aborting migration.')
        process.exit(1)
    }

    console.log('Starting TOTP secret migration...')

    console.log('Legacy plain `totpSecret` field has been removed from the schema. If you had existing plaintext secrets they should have been migrated earlier.')
    console.log('This script is now a no-op. If you need to decrypt any legacy backups, restore a DB backup into a temporary instance and run the old migration tool against it.')
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Migration error:', err)
        process.exit(1)
    })
