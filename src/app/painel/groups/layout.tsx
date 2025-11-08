'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Plus, BookOpen, Home, Menu, X, ArrowLeft, User } from 'lucide-react'

export default function GroupsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { data: session, status } = useSession()
    const [sidebarOpen, setSidebarOpen] = useState(true)

    const isActive = (path: string) => pathname === path

    const navItems = [
        {
            href: '/groups',
            label: 'All Groups',
            icon: Home,
        },
        {
            href: '/groups/webtoons',
            label: 'Group Webtoons',
            icon: BookOpen,
        },
        {
            href: '/groups/new',
            label: 'Create Group',
            icon: Plus,
        },
    ]

    return (
        <div className="min-h-screen bg-[#0f0b14]">
            {/* Header */}
            <header className="border-b border-white/10 bg-[#1a1625]/95 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        {/* Left Side */}
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="text-white/70 hover:text-white lg:hidden"
                            >
                                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </Button>

                            <Link href="/" className="flex items-center gap-2 text-white hover:text-purple-300 transition-colors">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden sm:block">Back to Home</span>
                            </Link>

                            <div className="hidden sm:block h-6 w-px bg-white/20"></div>

                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-purple-400" />
                                <span className="text-white font-medium">Groups Management</span>
                            </div>
                        </div>

                        {/* Right Side - User Info */}
                        <div className="flex items-center gap-4">
                            {status === 'authenticated' && session?.user ? (
                                <div className="flex items-center gap-3">
                                    <div className="hidden sm:block text-right">
                                        <div className="text-white text-sm font-medium">
                                            {session.user.name || 'User'}
                                        </div>
                                        <div className="text-white/60 text-xs">
                                            {session.user.email}
                                        </div>
                                    </div>
                                    <Avatar className="h-8 w-8 border-2 border-transparent hover:border-purple-500 transition-colors">
                                        <AvatarImage src={session.user.image || ''} />
                                        <AvatarFallback className="bg-purple-600 text-white">
                                            {session.user.name?.[0]?.toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            ) : (
                                <Link href="/auth/login">
                                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 rounded-full gap-2">
                                        <User className="h-4 w-4" />
                                        <span className="hidden sm:block">Login</span>
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="flex gap-8">
                    {/* Sidebar */}
                    <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 lg:w-64 lg:opacity-100'
                        } overflow-hidden flex-shrink-0 lg:sticky lg:top-24 lg:self-start`}>
                        <Card className="p-6 bg-[#1a1625] border-white/10">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Users className="h-6 w-6 text-purple-400" />
                                    Groups
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSidebarOpen(false)}
                                    className="text-white/70 hover:text-white lg:hidden"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <nav className="space-y-2">
                                {navItems.map((item) => {
                                    const Icon = item.icon
                                    return (
                                        <Link key={item.href} href={item.href}>
                                            <Button
                                                variant={isActive(item.href) ? "secondary" : "ghost"}
                                                className={`w-full justify-start gap-3 ${isActive(item.href)
                                                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                                    : 'text-white/70 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {item.label}
                                            </Button>
                                        </Link>
                                    )
                                })}
                            </nav>

                            <div className="mt-8 pt-6 border-t border-white/10">
                                <div className="text-white/60 text-sm">
                                    <p className="font-medium text-white mb-2">Group Management</p>
                                    <p className="text-xs leading-relaxed">
                                        Create and manage scanlation groups, invite members, and organize your webtoon projects.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'
                        }`}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
} 