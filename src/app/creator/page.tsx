'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, TrendingUp, Eye, Users, Plus } from 'lucide-react'

interface DashboardStats {
    totalSeries: number
    totalChapters: number
    totalViews: number
    totalFollowers: number
}

export default function CreatorHomePage() {
    const [stats, setStats] = useState<DashboardStats>({
        totalSeries: 0,
        totalChapters: 0,
        totalViews: 0,
        totalFollowers: 0,
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/creator/webtoons')
            if (response.ok) {
                const data = await response.json()
                const webtoons = data.webtoons || []

                const totalChapters = webtoons.reduce((sum: number, w: any) => sum + (w._count?.chapters || 0), 0)

                setStats({
                    totalSeries: webtoons.length,
                    totalChapters,
                    totalViews: 0, // TODO: implement views tracking
                    totalFollowers: 0, // TODO: implement followers tracking
                })
            }
        } catch (error) {
            console.error('Error fetching stats:', error)
        } finally {
            setLoading(false)
        }
    }

    const statCards = [
        {
            title: 'Total Series',
            value: stats.totalSeries,
            icon: BookOpen,
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/10',
        },
        {
            title: 'Total Chapters',
            value: stats.totalChapters,
            icon: TrendingUp,
            color: 'text-pink-400',
            bgColor: 'bg-pink-500/10',
        },
        {
            title: 'Total Views',
            value: stats.totalViews.toLocaleString(),
            icon: Eye,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
        },
        {
            title: 'Followers',
            value: stats.totalFollowers.toLocaleString(),
            icon: Users,
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
        },
    ]

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Creator Studio</h1>
                    <p className="text-white/60 mt-2">
                        Welcome back! Here's an overview of your creative journey.
                    </p>
                </div>
                <Link href="/creator/series/new">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        New Series
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => (
                    <Card key={stat.title} className="bg-[#0f0b14] border-white/10 p-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                            <div>
                                <div className="text-white/60 text-sm">{stat.title}</div>
                                <div className="text-white text-2xl font-bold">
                                    {loading ? '...' : stat.value}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <Card className="bg-[#0f0b14] border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/creator/series/new">
                        <div className="p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                            <Plus className="h-8 w-8 text-purple-400 mb-3" />
                            <h3 className="text-white font-semibold mb-2">Create New Series</h3>
                            <p className="text-white/60 text-sm">
                                Start a new webtoon series and share your story with the world
                            </p>
                        </div>
                    </Link>

                    <Link href="/creator/series">
                        <div className="p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                            <BookOpen className="h-8 w-8 text-pink-400 mb-3" />
                            <h3 className="text-white font-semibold mb-2">Manage Series</h3>
                            <p className="text-white/60 text-sm">
                                Edit your existing series, add chapters, and update details
                            </p>
                        </div>
                    </Link>

                    <Link href="/creator/analytics">
                        <div className="p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                            <TrendingUp className="h-8 w-8 text-blue-400 mb-3" />
                            <h3 className="text-white font-semibold mb-2">View Analytics</h3>
                            <p className="text-white/60 text-sm">
                                Track your series performance and audience engagement
                            </p>
                        </div>
                    </Link>
                </div>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-[#0f0b14] border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
                <div className="text-white/40 text-center py-8">
                    No recent activity to show
                </div>
            </Card>
        </div>
    )
}
