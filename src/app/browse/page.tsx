'use client'

import Header from '@/components/Header'
import { useRouter } from 'next/navigation'

const browseWebtoons = [
    { id: 1, title: 'The Crimson Corsair', emoji: '🏴‍☠️', rating: '4.8', chapters: 45 },
    { id: 2, title: 'Starfall Saga', emoji: '⭐', rating: '4.9', chapters: 38 },
    { id: 3, title: 'Whispers of the Woods', emoji: '🌲', rating: '4.7', chapters: 52 },
    { id: 4, title: 'Echoes of the Past', emoji: '🏛️', rating: '4.6', chapters: 28 },
    { id: 5, title: 'Ocean Tales', emoji: '🌊', rating: '4.8', chapters: 41 },
    { id: 6, title: 'Mountain Quest', emoji: '⛰️', rating: '4.5', chapters: 33 },
    { id: 7, title: 'City Lights', emoji: '🌃', rating: '4.9', chapters: 47 },
    { id: 8, title: 'Desert Winds', emoji: '🏜️', rating: '4.7', chapters: 29 },
    { id: 9, title: 'Frozen Hearts', emoji: '❄️', rating: '4.8', chapters: 36 },
    { id: 10, title: 'Tropical Paradise', emoji: '🏝️', rating: '4.6', chapters: 42 },
    { id: 11, title: 'Space Odyssey', emoji: '🚀', rating: '4.9', chapters: 31 },
    { id: 12, title: 'Medieval Times', emoji: '🏰', rating: '4.7', chapters: 48 }
]

export default function BrowsePage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-[#1a1625] text-white">
            <Header />

            <div className="container mx-auto px-4 py-12">
                <h1 className="text-4xl font-bold mb-8">Browse All Webtoons</h1>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {browseWebtoons.map((webtoon) => (
                        <div
                            key={webtoon.id}
                            className="group cursor-pointer"
                            onClick={() => router.push(`/webtoon/${webtoon.id}`)}
                        >
                            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-2">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition-all" />
                                <div className="absolute inset-0 flex items-center justify-center text-6xl">
                                    {webtoon.emoji}
                                </div>
                                <div className="absolute bottom-2 left-2 right-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="bg-black/60 px-2 py-1 rounded">⭐ {webtoon.rating}</span>
                                        <span className="bg-black/60 px-2 py-1 rounded">{webtoon.chapters} ch</span>
                                    </div>
                                </div>
                            </div>
                            <h4 className="text-sm font-medium truncate group-hover:text-purple-400 transition-colors">
                                {webtoon.title}
                            </h4>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
