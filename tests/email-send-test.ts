(async () => {
    // Simple test runner for sendPasswordResetEmail / sendVerificationEmail
    // - Creates an Ethereal account
    // - Monkeypatches nodemailer.createTransport so the module under test uses it
    // - Imports the email helper and calls the functions

    const nodemailer = await import('nodemailer')

    console.log('Creating Ethereal test account...')
    const testAccount = await nodemailer.createTestAccount()
    console.log('Ethereal account created:', testAccount.user)

    // Ensure NEXTAUTH_URL and EMAIL_FROM are set for the module under test
    process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    process.env.EMAIL_FROM = process.env.EMAIL_FROM || '"SweetTime Test" <no-reply@example.com>'

    // Set env vars so the email helper will create a transporter connected to Ethereal
    process.env.EMAIL_SERVER_HOST = testAccount.smtp.host
    process.env.EMAIL_SERVER_PORT = String(testAccount.smtp.port)
    process.env.EMAIL_SERVER_USER = testAccount.user
    process.env.EMAIL_SERVER_PASSWORD = testAccount.pass

    // Now dynamically import the email helper AFTER configuring env
    const emailModule = await import('@/lib/auth/email')
    if (!emailModule) {
        console.error('Failed to import email module')
        process.exit(1)
    }

    try {
        console.log('Sending password reset email (test)...')
        // call with a 20s timeout to avoid hanging indefinitely
        const sendWithTimeout = (fn: () => Promise<any>, ms = 20000) =>
            Promise.race([
                fn(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
            ])

        const info1 = await sendWithTimeout(() => emailModule.sendPasswordResetEmail('test+reset@example.com', 'test-token-123'))
        const url1 = nodemailer.getTestMessageUrl(info1)
        console.log('Password reset preview URL:', url1)

        console.log('Sending verification email (test)...')
        const info2 = await sendWithTimeout(() => emailModule.sendVerificationEmail('test+verify@example.com', 'verify-token-456'))
        const url2 = nodemailer.getTestMessageUrl(info2)
        console.log('Verification email preview URL:', url2)

        if (url1 && url2) {
            console.log('Email test succeeded. Open the preview URLs above to inspect messages.')
            process.exit(0)
        } else {
            console.error('Email test failed: could not obtain preview URLs')
            process.exit(2)
        }
    } catch (err) {
        console.error('Error during email send test:', err)
        process.exit(3)
    }
})()
