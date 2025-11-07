'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, User, Tag, Users, BarChart3, Settings, Menu, X, Shield, FileText } from 'lucide-react'

const navigation = [
    { name: 'Painel de Controle', href: '/admin', icon: Home },
    { name: 'Obras', href: '/admin/obras', icon: BookOpen },
    { name: 'Autores', href: '/admin/authors', icon: User },
    { name: 'Gêneros', href: '/admin/genres', icon: Tag },
    { name: 'Usuários', href: '/admin/users', icon: Users },
    { name: 'Funções', href: '/admin/roles', icon: Shield },
    { name: 'Relatórios e Análises', href: '/admin/analytics', icon: BarChart3 },
]

export default function AdminShell({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="min-h-screen bg-[#1a1625]">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-[#0f0b14] border-r border-white/10 z-50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0`}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-lg font-bold">📖</span>
                        </div>
                        <span className="text-white font-semibold">Administração de Webtoon</span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-white/60 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-purple-600 text-white'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                    <Link
                        href="/admin/settings"
                        className="flex items-center gap-3 px-4 py-3 text-white/60 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                    >
                        <Settings className="h-5 w-5" />
                        <span className="font-medium">Configurações</span>
                    </Link>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top bar */}
                <header className="h-16 bg-[#0f0b14] border-b border-white/10 flex items-center justify-between px-6">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden text-white/60 hover:text-white"
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        <Link
                            href="/"
                            className="text-sm text-purple-400 hover:text-purple-300"
                        >
                            Ver Site
                        </Link>
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">A</span>
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