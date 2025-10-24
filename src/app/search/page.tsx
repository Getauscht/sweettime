'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

interface Webtoon {
    id: number
    title: string
    author: string
    genre: string
    emoji: string
    rating: number
    chapters: number
}

const mockWebtoons: Webtoon[] = [
    { id: 1, title: 'The Crimson Corsair', author: 'Red-Beard', genre: 'Adventure', emoji: '🏴‍☠️', rating: 4.8, chapters: 45 },
    { id: 2, title: 'Echoes of the Past', author: 'Time Traveler', genre: 'Fantasy', emoji: '🏛️', rating: 4.7, chapters: 38 },
    { id: 3, title: 'Starlight Serenade', author: 'Melody Maker', genre: 'Romance', emoji: '⭐', rating: 4.9, chapters: 52 },
    { id: 4, title: 'Whispers of the Wind', author: 'Nature Writer', genre: 'Mystery', emoji: '🌲', rating: 4.6, chapters: 41 },
    { id: 5, title: 'The Lost Kingdom', author: 'Ancient Scribe', genre: 'Action', emoji: '👑', rating: 4.8, chapters: 35 },
    { id: 6, title: 'Eternal Bloom', author: 'Garden Poet', genre: 'Drama', emoji: '🌸', rating: 4.7, chapters: 29 },
    { id: 7, title: 'Shadows of Destiny', author: 'Dark Chronicler', genre: 'Thriller', emoji: '🌑', rating: 4.9, chapters: 47 },
    { id: 8, title: 'The Silent Symphony', author: 'Quiet Quill', genre: 'Slice of Life', emoji: '🎵', rating: 4.5, chapters: 33 },
    { id: 9, title: 'Chronicles of the Cosmos', author: 'Star Gazer', genre: 'Sci-Fi', emoji: '🪐', rating: 4.8, chapters: 42 },
    { id: 10, title: "Serendipity's Embrace", author: 'Love Spinner', genre: 'Comedy', emoji: '💕', rating: 4.6, chapters: 28 }
]

const trendingSearches = ['#Romance', '#Action', '#mxhkl', '#Tower', '#Reincarnation', '#Villainess']

const filters = [
    { label: 'Genre', options: ['All', 'Fantasy', 'Romance', 'Action', 'Comedy', 'Drama'] },
    { label: 'Author', options: ['All', 'Popular', 'New'] },
    { label: 'Status', options: ['All', 'Ongoing', 'Completed'] }
]

export default function SearchPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const initialQuery = searchParams?.get('q') || ''

    const [query, setQuery] = useState(initialQuery)
    const [results, setResults] = useState<Webtoon[]>([])
    const [selectedFilters, setSelectedFilters] = useState({
        genre: 'All',
        author: 'All',
        status: 'All'
    })

    useEffect(() => {
        if (query.length > 0) {
            const filtered = mockWebtoons.filter(webtoon =>
                webtoon.title.toLowerCase().includes(query.toLowerCase()) ||
                webtoon.author.toLowerCase().includes(query.toLowerCase()) ||
                webtoon.genre.toLowerCase().includes(query.toLowerCase())
            )
            setResults(filtered)
        } else {
            setResults([])
        }
    }, [query])

    const handleTrendingClick = (trend: string) => {
        const cleanTrend = trend.replace('#', '')
        setQuery(cleanTrend)
        router.push(`/search?q=${encodeURIComponent(cleanTrend)}`)
    }

    return (
        <div className="min-h-screen bg-[#1a1625] text-white">
            <Header />

            <div className="container mx-auto px-4 py-12 max-w-6xl">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        Find Your Next Favorite Story
                    </h1>

                    {/* Large Search Bar */}
                    <div className="max-w-2xl mx-auto mb-8">
                        <div className="relative">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search for webtoons"
                                className="w-full bg-[#0f0b14] border border-white/20 rounded-full py-4 px-6 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Trending Searches */}
                    <div className="mb-8">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <span className="text-sm text-purple-400">📈 Trending Searches</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {trendingSearches.map((trend) => (
                                <button
                                    key={trend}
                                    onClick={() => handleTrendingClick(trend)}
                                    className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-full text-sm text-purple-300 border border-purple-500/30 transition-colors"
                                >
                                    {trend}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {filters.map((filter) => (
                            <div key={filter.label} className="relative">
                                <select
                                    value={selectedFilters[filter.label.toLowerCase() as keyof typeof selectedFilters]}
                                    onChange={(e) => setSelectedFilters({
                                        ...selectedFilters,
                                        [filter.label.toLowerCase()]: e.target.value
                                    })}
                                    className="appearance-none bg-[#0f0b14] border border-white/20 rounded-full px-4 py-2 pr-10 text-sm text-white cursor-pointer hover:bg-white/5 transition-colors"
                                >
                                    {filter.options.map((option) => (
                                        <option key={option} value={option}>
                                            {filter.label}: {option}
                                        </option>
                                    ))}
                                </select>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    ▼
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Results */}
                {query && (
                    <div>
                        <h2 className="text-2xl font-bold mb-6">
                            Search Results {results.length > 0 && `(${results.length})`}
                        </h2>

                        {results.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {results.map((webtoon) => (
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
                                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="bg-black/60 px-2 py-1 rounded">⭐ {webtoon.rating}</span>
                                                <span className="bg-black/60 px-2 py-1 rounded">{webtoon.chapters} ch</span>
                                            </div>
                                        </div>
                                        <h4 className="text-sm font-medium truncate mb-1 group-hover:text-purple-400 transition-colors">
                                            {webtoon.title}
                                        </h4>
                                        <p className="text-xs text-white/60 truncate">
                                            {webtoon.author} • {webtoon.genre}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <div className="text-6xl mb-4">🔍</div>
                                <p className="text-white/60 mb-2">No results found for "{query}"</p>
                                <p className="text-sm text-white/40">Try different keywords or check the spelling</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Popular Webtoons (when no search) */}
                {!query && (
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Popular Webtoons</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {mockWebtoons.map((webtoon) => (
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
                                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="bg-black/60 px-2 py-1 rounded">⭐ {webtoon.rating}</span>
                                            <span className="bg-black/60 px-2 py-1 rounded">{webtoon.chapters} ch</span>
                                        </div>
                                    </div>
                                    <h4 className="text-sm font-medium truncate mb-1 group-hover:text-purple-400 transition-colors">
                                        {webtoon.title}
                                    </h4>
                                    <p className="text-xs text-white/60 truncate">
                                        {webtoon.author} • {webtoon.genre}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
