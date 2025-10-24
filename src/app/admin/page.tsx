'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, Users, BookOpen, User } from 'lucide-react'

interface Statistics {
    totalWebtoons: number
    totalAuthors: number
    totalUsers: number
    activeUsers: number
}

interface Activity {
    id: string
    action: string
    entityType: string
    details: string | null
    createdAt: string
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Statistics | null>(null)
    const [activity, setActivity] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/admin/dashboard/stats')
            if (response.ok) {
                const data = await response.json()
                setStats(data.statistics)
                setActivity(data.recentActivity)
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        })
    }

    const getActivityIcon = (entityType: string) => {
        switch (entityType) {
            case 'webtoon':
                return '📖'
            case 'author':
                return '👤'
            case 'user':
                return '👥'
            case 'genre':
                return '🏷️'
            default:
                return '•'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-white/60">Loading...</div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-white/60 mt-2">Manage your webtoon content and users</p>
            </div>

            {/* Search */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search webtoons, authors, or users"
                    className="w-full px-4 py-3 bg-[#0f0b14] border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                />
            </div>

            {/* Statistics */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Summary Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-[#0f0b14] border-white/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white/60 text-sm">Total Webtoons</h3>
                            <BookOpen className="h-5 w-5 text-purple-400" />
                        </div>
                        <p className="text-4xl font-bold text-white">
                            {stats?.totalWebtoons.toLocaleString() || '0'}
                        </p>
                    </Card>

                    <Card className="bg-[#0f0b14] border-white/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white/60 text-sm">Active Users</h3>
                            <Users className="h-5 w-5 text-purple-400" />
                        </div>
                        <p className="text-4xl font-bold text-white">
                            {stats?.activeUsers.toLocaleString() || '0'}
                        </p>
                    </Card>

                    <Card className="bg-[#0f0b14] border-white/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white/60 text-sm">Total Authors</h3>
                            <User className="h-5 w-5 text-purple-400" />
                        </div>
                        <p className="text-4xl font-bold text-white">
                            {stats?.totalAuthors.toLocaleString() || '0'}
                        </p>
                    </Card>
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
                <Card className="bg-[#0f0b14] border-white/10">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="px-6 py-4 text-left text-sm font-medium text-white/60">
                                        ACTIVITY
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-white/60">
                                        DETAILS
                                    </th>
                                    <th className="px-6 py-4 text-right text-sm font-medium text-white/60">
                                        DATE
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {activity.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-white/40">
                                            No recent activity
                                        </td>
                                    </tr>
                                ) : (
                                    activity.map((item) => (
                                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{getActivityIcon(item.entityType)}</span>
                                                    <span className="text-white capitalize">{item.action.replace('_', ' ')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-white/60">
                                                {item.details || `${item.entityType} ${item.action}`}
                                            </td>
                                            <td className="px-6 py-4 text-right text-white/60">
                                                {formatDate(item.createdAt)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    )
}
