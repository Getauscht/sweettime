'use server'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import AdminShell from '@/components/AdminShell'
import { authOptions } from '../../../pages/api/auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Server-side session check (SSR) with proper typing
    const session = (await getServerSession(authOptions as any)) as Session | null

    // Not authenticated -> redirect to login
    if (!session?.user?.id) {
        redirect('/auth/login')
    }

    const getUserData = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { role: true }
    })

    // Not admin -> display error page

    const roleName = getUserData?.role?.name
    if (!roleName || roleName.toLowerCase() !== 'admin') {
        // Authenticated but not admin -> show 404
        notFound()
    }

    return <AdminShell>{children}</AdminShell>
}
