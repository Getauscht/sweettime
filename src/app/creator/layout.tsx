
'use server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../pages/api/auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { LogOut, Home, BookOpen, BarChart3, Users, Settings, Menu, X } from 'lucide-react'

const navigation = [
    { name: 'Início', href: '/creator', icon: Home },
    { name: 'Minhas Séries', href: '/creator/series', icon: BookOpen },
    { name: 'Análises', href: '/creator/analytics', icon: BarChart3 },
    { name: 'Comunidade', href: '/creator/community', icon: Users },
    { name: 'Configurações', href: '/creator/settings', icon: Settings },
]

export default async function CreatorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Server-side session check
    const session = await getServerSession(authOptions as any)
    if (!session || !(session as any).user?.id) {
        redirect('/auth/login')
    }

    // Fetch user and role
    const user = await prisma.user.findUnique({
        where: { id: (session as any).user.id },
        include: { role: true },
    })

    const roleName = user?.role?.name?.toLowerCase()
    if (!roleName || (roleName !== 'author' && roleName !== 'admin')) {
        // Authenticated but not creator/admin -> show 404
        notFound()
    }

    // Render layout (same as before, but SSR)
    return (
        <div className="min-h-screen bg-[#1a1625]">
            {/* Sidebar */}
            <aside className="fixed top-0 left-0 h-full w-64 bg-[#0f0b14] border-r border-white/10 z-50 lg:translate-x-0">
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
                    <div>
                        <h1 className="text-white font-bold text-lg">Estúdio do Criador</h1>
                        <p className="text-white/60 text-xs">Gerencie seus webtoons</p>
                    </div>
                </div>
                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {navigation.map((item) => {
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-white/60 hover:bg-white/5 hover:text-white`}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>
                {/* Logout */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                    <form action="/api/auth/signout" method="post">
                        <button type="submit" className="flex items-center gap-3 px-4 py-3 text-white/60 hover:bg-white/5 hover:text-white rounded-lg transition-colors w-full">
                            <LogOut className="h-5 w-5" />
                            <span className="font-medium">Sair</span>
                        </button>
                    </form>
                </div>
            </aside>
            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top bar */}
                <header className="h-16 bg-[#0f0b14] border-b border-white/10 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4 ml-auto">
                        <Link
                            href="/"
                            className="text-sm text-purple-400 hover:text-purple-300"
                        >
                            Ver Site
                        </Link>
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">C</span>
                        </div>
                    </div>
                </header>
                {/* Page content */}
                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
