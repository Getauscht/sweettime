/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { BookOpen, Plus, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface Work {
    type: 'webtoon' | 'novel'
    id: string
    title: string
    slug: string
    description?: string
    coverImage?: string
    status: string
    views: number
    likes: number
    rating?: number | null
    createdAt: string
    updatedAt: string
    _count?: { chapters: number }
}

export default function WorksListPage() {
    const router = useRouter()
    const { data: session, status } = useSession()
    const [works, setWorks] = useState<Work[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (status === 'loading') return

        if (!session?.user) {
            router.push('/auth/login')
            return
        }

        loadWorks()
    }, [session, status, router])

    async function loadWorks() {
        setLoading(true)
        setError(null)
        try {
            const [webtoonsRes, novelsRes] = await Promise.all([
                fetch('/api/webtoons'),
                fetch('/api/novels')
            ])

            const webtoonsData = webtoonsRes.ok ? await webtoonsRes.json() : { webtoons: [] }
            const novelsData = novelsRes.ok ? await novelsRes.json() : { novels: [] }

            const works: Work[] = [
                ...webtoonsData.webtoons.map((w: any) => ({ ...w, type: 'webtoon' as const })),
                ...novelsData.novels.map((n: any) => ({ ...n, type: 'novel' as const }))
            ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

            setWorks(works)
        } catch (err) {
            console.error('Failed to load works:', err)
            setError(err instanceof Error ? err.message : 'Failed to load works')
        } finally {
            setLoading(false)
        }
    }

    const filteredWorks = works.filter(work =>
        work.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (work.description && work.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
                    <h1 className="text-3xl font-bold text-white mb-2">Group Works</h1>
                    <p className="text-white/60">Webtoons and novels created by scanlation groups</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/painel/groups/obras/new?type=webtoon">
                        <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                            <Plus className="h-4 w-4" />
                            Create Webtoon
                        </Button>
                    </Link>
                    <Link href="/painel/groups/obras/new?type=novel">
                        <Button variant="outline" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Novel
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                    placeholder="Search works..."
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

            {/* Works Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="text-white/60">Loading works...</div>
                    </div>
                )}
                {!loading && filteredWorks.length === 0 && searchQuery && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                        <div className="text-white/60 mb-2">No works found</div>
                        <div className="text-white/40 text-sm">Try adjusting your search terms</div>
                    </div>
                )}
                {!loading && filteredWorks.length === 0 && !searchQuery && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                        <BookOpen className="h-12 w-12 text-white/20 mb-4" />
                        <div className="text-white/60 mb-2">No works yet</div>
                        <div className="text-white/40 text-sm mb-4">Create your first webtoon or novel to get started</div>
                        <div className="flex gap-2">
                            <Link href="/groups/webtoons/new">
                                <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                                    <Plus className="h-4 w-4" />
                                    Create Webtoon
                                </Button>
                            </Link>
                            <Link href="/groups/novels/new">
                                <Button variant="outline" className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Create Novel
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
                {filteredWorks.map((work) => (
                    <Link key={work.id} href={`/painel/groups/obras/${work.id}/edit?type=${work.type}`} className="h-full">
                        <Card className="p-4 bg-[#1a1625] border-white/10 hover:border-purple-500/30 transition-colors group cursor-pointer h-full flex flex-col">
                            {/* Cover Image */}
                            <div className="aspect-[3/4] bg-white/5 rounded mb-4 flex items-center justify-center overflow-hidden">
                                {work.coverImage ? (
                                    <img
                                        src={work.coverImage}
                                        alt={work.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                ) : (
                                    <BookOpen className="h-12 w-12 text-white/20" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-2">
                                <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                                    {work.title}
                                </h3>

                                <p className="text-sm text-white/60 line-clamp-2">
                                    {work.description || 'No description'}
                                </p>

                                {/* Type and Status */}
                                <div className="flex items-center gap-2 pt-2">
                                    <Badge className={`text-xs ${work.type === 'webtoon' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'}`}>
                                        {work.type === 'webtoon' ? 'Webtoon' : 'Novel'}
                                    </Badge>
                                    <Badge className={`text-xs ${getStatusColor(work.status)}`}>
                                        {work.status}
                                    </Badge>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10 mt-4">
                                <div className="text-center">
                                    <div className="text-sm font-semibold text-white">{work._count?.chapters || 0}</div>
                                    <div className="text-xs text-white/60">Chapters</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-semibold text-white">{typeof work.views === 'number' ? work.views : '—'}</div>
                                    <div className="text-xs text-white/60">Views</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-semibold text-white">{typeof work.rating === 'number' ? work.rating.toFixed(1) : '—'}</div>
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
