'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { useRouter } from 'next/navigation'

const allGenres = [
    { name: 'Fantasy', emoji: '✨', count: 145 },
    { name: 'Romance', emoji: '💕', count: 203 },
    { name: 'Action', emoji: '⚔️', count: 187 },
    { name: 'Comedy', emoji: '😄', count: 164 },
    { name: 'Drama', emoji: '🎭', count: 156 },
    { name: 'Slice of Life', emoji: '🌸', count: 142 },
    { name: 'Sci-Fi', emoji: '🚀', count: 98 },
    { name: 'Horror', emoji: '👻', count: 76 },
    { name: 'Mystery', emoji: '🔍', count: 112 },
    { name: 'Thriller', emoji: '😱', count: 89 },
    { name: 'Historical', emoji: '📜', count: 67 },
    { name: 'Sports', emoji: '⚽', count: 54 }
]

const genreWebtoons: { [key: string]: any[] } = {
    Fantasy: [
        { id: 1, title: "The Dragon's Legacy", emoji: '🐉' },
        { id: 2, title: 'Magic Academy', emoji: '🪄' },
        { id: 3, title: 'Sword of Destiny', emoji: '⚔️' },
        { id: 4, title: 'Elven Kingdom', emoji: '🧝' },
        { id: 5, title: 'Wizard Chronicles', emoji: '🔮' },
        { id: 6, title: 'Mythical Beasts', emoji: '🦄' }
    ],
    Romance: [
        { id: 7, title: 'First Love', emoji: '💘' },
        { id: 8, title: 'Love Letters', emoji: '💌' },
        { id: 9, title: 'Heartstrings', emoji: '💝' },
        { id: 10, title: 'Sweet Moments', emoji: '🌹' },
        { id: 11, title: 'Cupid Arrow', emoji: '💖' },
        { id: 12, title: 'True Love', emoji: '💗' }
    ]
}

export default function GenresPage() {
    const router = useRouter()
    const [selectedGenre, setSelectedGenre] = useState('Fantasy')

    return (
        <div className="min-h-screen bg-[#1a1625] text-white">
            <Header />

            <div className="container mx-auto px-4 py-12">
                <h1 className="text-4xl font-bold mb-8">Genres</h1>

                {/* Genre Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-12">
                    {allGenres.map((genre) => (
                        <button
                            key={genre.name}
                            onClick={() => setSelectedGenre(genre.name)}
                            className={`p-6 rounded-xl transition-all ${selectedGenre === genre.name
                                    ? 'bg-purple-600 scale-105'
                                    : 'bg-white/5 hover:bg-white/10'
                                }`}
                        >
                            <div className="text-4xl mb-2">{genre.emoji}</div>
                            <div className="font-semibold mb-1">{genre.name}</div>
                            <div className="text-xs text-white/60">{genre.count} stories</div>
                        </button>
                    ))}
                </div>

                {/* Genre Webtoons */}
                <div>
                    <h2 className="text-2xl font-bold mb-6">{selectedGenre}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                        {(genreWebtoons[selectedGenre] || []).map((webtoon) => (
                            <div
                                key={webtoon.id}
                                className="group cursor-pointer"
                                onClick={() => router.push(`/webtoon/${webtoon.id}`)}
                            >
                                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-2">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 flex items-center justify-center text-5xl">
                                        {webtoon.emoji}
                                    </div>
                                </div>
                                <h4 className="text-sm font-medium truncate">{webtoon.title}</h4>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
