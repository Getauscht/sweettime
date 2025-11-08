/* eslint-disable @typescript-eslint/no-explicit-any */
import { encode } from 'next-auth/jwt'

async function main() {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
        console.error('Please set NEXTAUTH_SECRET env var')
        process.exit(1)
    }

    const token = {
        id: 'test-user-id-123',
        email: 'test@example.com',
        mustChangePassword: true,
    }

    const encoded = await encode({ token: token as any, secret, maxAge: 60 * 60 })
    console.log(encoded)
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
