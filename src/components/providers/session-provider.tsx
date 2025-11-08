/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { SessionProvider as NextAuthSessionProvider, useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

function MustChangeRedirect({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        if (status === 'loading') return

        const mustChange = (session as any)?.user?.mustChangePassword === true

        const isAuthPath = pathname?.startsWith('/auth')

        if (mustChange && !isAuthPath) {
            // Redirect to change-password and replace history so back doesn't bypass
            router.replace('/auth/change-password')
        }
    }, [session, status, pathname, router])

    return <>{children}</>
}

export default function SessionProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextAuthSessionProvider>
            <MustChangeRedirect>{children}</MustChangeRedirect>
        </NextAuthSessionProvider>
    )
}
