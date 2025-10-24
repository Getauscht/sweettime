'use client'

import { Card } from '@/components/ui/card'
import { Users, MessageSquare, TrendingUp, Award } from 'lucide-react'

export default function CreatorCommunityPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white">Community</h1>
                <p className="text-white/60 mt-2">
                    Connect with other creators and your audience
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-[#0f0b14] border-white/10 p-8">
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-purple-500/10 rounded-full mb-4">
                            <Users className="h-8 w-8 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Creator Forum</h3>
                        <p className="text-white/60 mb-4">
                            Connect with fellow creators, share tips, and get feedback
                        </p>
                        <p className="text-white/40 text-sm">Coming Soon</p>
                    </div>
                </Card>

                <Card className="bg-[#0f0b14] border-white/10 p-8">
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-pink-500/10 rounded-full mb-4">
                            <MessageSquare className="h-8 w-8 text-pink-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Reader Comments</h3>
                        <p className="text-white/60 mb-4">
                            Read and respond to comments from your audience
                        </p>
                        <p className="text-white/40 text-sm">Coming Soon</p>
                    </div>
                </Card>

                <Card className="bg-[#0f0b14] border-white/10 p-8">
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-blue-500/10 rounded-full mb-4">
                            <TrendingUp className="h-8 w-8 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Trending Topics</h3>
                        <p className="text-white/60 mb-4">
                            Stay updated with trending genres and popular themes
                        </p>
                        <p className="text-white/40 text-sm">Coming Soon</p>
                    </div>
                </Card>

                <Card className="bg-[#0f0b14] border-white/10 p-8">
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-green-500/10 rounded-full mb-4">
                            <Award className="h-8 w-8 text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Contests & Events</h3>
                        <p className="text-white/60 mb-4">
                            Participate in community contests and special events
                        </p>
                        <p className="text-white/40 text-sm">Coming Soon</p>
                    </div>
                </Card>
            </div>

            <Card className="bg-[#0f0b14] border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Recent Discussions</h2>
                <div className="text-white/40 text-center py-12">
                    Community features will be available soon
                </div>
            </Card>
        </div>
    )
}
