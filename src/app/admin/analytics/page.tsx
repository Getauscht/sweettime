'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, Users, Eye, Heart, Download } from 'lucide-react'

export default function AnalyticsPage() {
    const metrics = [
        { label: 'Total Views', value: '2.4M', change: '+12.5%', icon: Eye },
        { label: 'Active Users', value: '85K', change: '+8.2%', icon: Users },
        { label: 'Total Likes', value: '456K', change: '+15.3%', icon: Heart },
        { label: 'New Subscribers', value: '12.3K', change: '+5.7%', icon: TrendingUp },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Reporting & Analytics</h1>
                    <p className="text-white/60 mt-2">Detailed insights and performance metrics</p>
                </div>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                </Button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric) => {
                    const Icon = metric.icon
                    return (
                        <Card key={metric.label} className="bg-[#0f0b14] border-white/10 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white/60 text-sm">{metric.label}</h3>
                                <Icon className="h-5 w-5 text-purple-400" />
                            </div>
                            <p className="text-3xl font-bold text-white mb-2">{metric.value}</p>
                            <span className="text-green-400 text-sm">{metric.change}</span>
                        </Card>
                    )
                })}
            </div>

            {/* Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[#0f0b14] border-white/10 p-6">
                    <h3 className="text-white font-semibold text-lg mb-4">Views Over Time</h3>
                    <div className="h-64 bg-white/5 rounded-lg flex items-center justify-center">
                        <span className="text-white/40">Chart visualization would go here</span>
                    </div>
                </Card>

                <Card className="bg-[#0f0b14] border-white/10 p-6">
                    <h3 className="text-white font-semibold text-lg mb-4">Top Performing Webtoons</h3>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-white/60">#{i}</span>
                                    <div>
                                        <div className="text-white font-medium">Webtoon Title {i}</div>
                                        <div className="text-white/60 text-sm">{(Math.random() * 100).toFixed(1)}K views</div>
                                    </div>
                                </div>
                                <TrendingUp className="h-4 w-4 text-green-400" />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Additional Stats */}
            <Card className="bg-[#0f0b14] border-white/10 p-6">
                <h3 className="text-white font-semibold text-lg mb-4">User Demographics</h3>
                <div className="h-48 bg-white/5 rounded-lg flex items-center justify-center">
                    <span className="text-white/40">Demographics chart would go here</span>
                </div>
            </Card>
        </div>
    )
}
