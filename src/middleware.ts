/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    const { pathname } = req.nextUrl

    // Allow access to auth pages, API routes, static files, and public assets
    const publicPaths = [
        '/auth/login',
        '/auth/register',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/verify-magic-link',
        '/auth/change-password',
        '/api/',
        '/_next/',
        '/favicon.ico',
        '/public/'
    ]

    const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

    // If user is not authenticated, allow access to public paths
    if (!token && !isPublicPath) {
        const url = req.nextUrl.clone()
        url.pathname = '/auth/login'
        return NextResponse.redirect(url)
    }

    // If user is authenticated and must change password
    if (token && (token as any).mustChangePassword === true) {
        // Allow access only to change-password page and logout
        if (pathname !== '/auth/change-password' && !pathname.startsWith('/api/auth/signout')) {
            const url = req.nextUrl.clone()
            url.pathname = '/auth/change-password'
            return NextResponse.redirect(url)
        }
    }

    return NextResponse.next()
}

export const config = {
    // Protect only the application areas that require authentication.
    // This prevents middleware from running on every public route and avoids
    // redirecting unauthenticated visitors away from public pages.
    matcher: [
        // Admin / management UI
        '/admin/:path*',
        '/painel/:path*',
        // User personal area
        '/profile/:path*',
        // Common frontend routes that should be private
        '/reading-history/:path*',
        '/favorites/:path*',
        '/notifications/:path*',
        // Private API endpoints (move sensitive APIs here)
        '/api/admin/:path*',
    ],
}
