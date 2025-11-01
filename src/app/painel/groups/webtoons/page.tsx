'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Plus, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface Webtoon {
    id: string
    title: string
    slug: string
    description?: string
    coverImage?: string
    status: string
    views: number
    likes: number
    rating: number
    createdAt: string
    updatedAt: string
    _count?: { chapters: number }
}

export default function WebtoonsListPage() {
    const router = useRouter()
    const { data: session, status } = useSession()
    const [webtoons, setWebtoons] = useState<Webtoon[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (status === 'loading') return

        if (!session?.user) {
            router.push('/auth/login')
            return
        }

        loadWebtoons()
    }, [session, status, router])

    async function loadWebtoons() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/webtoons')
            if (!res.ok) {
                if (res.status === 401) {
                    router.push('/auth/login')
                    return
                }
                throw new Error('Failed to load webtoons')
            }
            const data = await res.json()
            setWebtoons(data.webtoons || [])
        } catch (err) {
            console.error('Failed to load webtoons:', err)
            setError(err instanceof Error ? err.message : 'Failed to load webtoons')
        } finally {
            setLoading(false)
        }
    }

    const filteredWebtoons = webtoons.filter(webtoon =>
        webtoon.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (webtoon.description && webtoon.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ongoing':
                return 'bg-green-500/20 text-green-300 border-green-500/30'
            case 'completed':
                return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            case 'hiatus':
                return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
            case 'cancelled':
                return 'bg-red-500/20 text-red-300 border-red-500/30'
            default:
                return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="space-y-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-white/10 rounded w-1/3"></div>
                    <div className="h-64 bg-white/10 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Group Webtoons</h1>
                    <p className="text-white/60">Webtoons created by scanlation groups</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/groups/webtoons/new">
                        <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                            <Plus className="h-4 w-4" />
                            Create Webtoon
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                    placeholder="Search webtoons..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#1a1625] border-white/10 text-white placeholder:text-white/40"
                />
            </div>

            {/* Error State */}
            {error && (
                <Card className="p-4 bg-red-500/10 border-red-500/30">
                    <p className="text-red-300">{error}</p>
                </Card>
            )}

            {/* Webtoons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="text-white/60">Loading webtoons...</div>
                    </div>
                )}
                {!loading && filteredWebtoons.length === 0 && searchQuery && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                        <div className="text-white/60 mb-2">No webtoons found</div>
                        <div className="text-white/40 text-sm">Try adjusting your search terms</div>
                    </div>
                )}
                {!loading && filteredWebtoons.length === 0 && !searchQuery && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                        <BookOpen className="h-12 w-12 text-white/20 mb-4" />
                        <div className="text-white/60 mb-2">No webtoons yet</div>
                        <div className="text-white/40 text-sm mb-4">Create your first webtoon to get started</div>
                        <Link href="/groups/webtoons/new">
                            <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                                <Plus className="h-4 w-4" />
                                Create Webtoon
                            </Button>
                        </Link>
                    </div>
                )}
                {filteredWebtoons.map((webtoon) => (
                    <Link key={webtoon.id} href={`/groups/webtoons/${webtoon.id}/edit`}>
                        <Card className="p-4 bg-[#1a1625] border-white/10 hover:border-purple-500/30 transition-colors group cursor-pointer h-full flex flex-col">
                            {/* Cover Image */}
                            <div className="aspect-[3/4] bg-white/5 rounded mb-4 flex items-center justify-center overflow-hidden">
                                {webtoon.coverImage ? (
                                    <img
                                        src={webtoon.coverImage}
                                        alt={webtoon.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                ) : (
                                    <BookOpen className="h-12 w-12 text-white/20" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-2">
                                <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                                    {webtoon.title}
                                </h3>

                                <p className="text-sm text-white/60 line-clamp-2">
                                    {webtoon.description || 'No description'}
                                </p>

                                {/* Status */}
                                <div className="flex items-center gap-2 pt-2">
                                    <Badge className={`text-xs ${getStatusColor(webtoon.status)}`}>
                                        {webtoon.status}
                                    </Badge>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10 mt-4">
                                <div className="text-center">
                                    <div className="text-sm font-semibold text-white">{webtoon._count?.chapters || 0}</div>
                                    <div className="text-xs text-white/60">Chapters</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-semibold text-white">{webtoon.views}</div>
                                    <div className="text-xs text-white/60">Views</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-semibold text-white">{webtoon.rating.toFixed(1)}</div>
                                    <div className="text-xs text-white/60">Rating</div>
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
