'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

interface Webtoon {
    id: string
    title: string
    slug?: string
    coverImage?: string | null
    authors?: { id: string; name: string; slug: string }[]
    genres?: string[]
    rating?: number
    latestChapter?: number
}

const trendingSearches = ['#Romance', '#Ação', '#mxhkl', '#Torre', '#Reencarnação', '#Vilã']

const filters = [
    { label: 'Gênero', options: ['Todos', 'Fantasia', 'Romance', 'Ação', 'Comédia', 'Drama'] },
    { label: 'Autor', options: ['Todos', 'Popular', 'Novo'] },
    { label: 'Status', options: ['Todos', 'Em Andamento', 'Concluído'] }
]

export default function SearchPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const initialQuery = searchParams?.get('q') || ''

    const [query, setQuery] = useState(initialQuery)
    const [results, setResults] = useState<Webtoon[]>([])
    const [popular, setPopular] = useState<Webtoon[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedFilters, setSelectedFilters] = useState({
        genre: 'Todos',
        author: 'Todos',
        status: 'Todos'
    })

    useEffect(() => {
        let controller = new AbortController()

        const fetchResults = async () => {
            if (!query || query.length < 1) {
                setResults([])
                return
            }
            setLoading(true)
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=50`, { signal: controller.signal })
                if (!res.ok) {
                    setResults([])
                    setLoading(false)
                    return
                }
                const data = await res.json()
                setResults(data.webtoons || [])
            } catch (err) {
                if ((err as any).name === 'AbortError') return
                console.error('Search page fetch error', err)
            } finally {
                setLoading(false)
            }
        }

        const id = setTimeout(fetchResults, 200)
        return () => {
            clearTimeout(id)
            controller.abort()
            controller = new AbortController()
        }
    }, [query])

    useEffect(() => {
        // Load popular webtoons when there's no query
        const controller = new AbortController()
        const fetchPopular = async () => {
            try {
                const res = await fetch('/api/webtoons/featured?limit=12', { signal: controller.signal })
                if (!res.ok) return
                const data = await res.json()
                setPopular(data.webtoons || [])
            } catch (err) {
                // ignore
            }
        }
        fetchPopular()
        return () => controller.abort()
    }, [])

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
                        Encontre Sua Próxima História Favorita
                    </h1>

                    {/* Large Search Bar */}
                    <div className="max-w-2xl mx-auto mb-8">
                        <div className="relative">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar webtoons"
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
                            <span className="text-sm text-purple-400">📈 Buscas em Alta</span>
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
                            Resultados da Busca {results.length > 0 && `(${results.length})`}
                        </h2>

                        {results.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {results.map((webtoon) => (
                                    <div
                                        key={webtoon.id}
                                        className="group cursor-pointer"
                                        onClick={() => router.push(`/webtoon/${webtoon.slug || webtoon.id}`)}
                                    >
                                        <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-2">
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition-all" />
                                            <div className="absolute inset-0 flex items-center justify-center text-6xl">
                                                📚
                                            </div>
                                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="bg-black/60 px-2 py-1 rounded">⭐ {webtoon.rating || '—'}</span>
                                                <span className="bg-black/60 px-2 py-1 rounded">{webtoon.latestChapter || ''} cap</span>
                                            </div>
                                        </div>
                                        <h4 className="text-sm font-medium truncate mb-1 group-hover:text-purple-400 transition-colors">
                                            {webtoon.title}
                                        </h4>
                                        <p className="text-xs text-white/60 truncate">
                                            {(webtoon.authors && webtoon.authors.map(a => a.name).join(', ')) || ''} • {(webtoon.genres && webtoon.genres.join(', ')) || ''}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <div className="text-6xl mb-4">🔍</div>
                                <p className="text-white/60 mb-2">Nenhum resultado encontrado para "{query}"</p>
                                <p className="text-sm text-white/40">Tente palavras-chave diferentes ou verifique a ortografia</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Popular Webtoons (when no search) */}
                {!query && (
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Webtoons Populares</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {popular.map((webtoon) => (
                                <div
                                    key={webtoon.id}
                                    className="group cursor-pointer"
                                    onClick={() => router.push(`/webtoon/${webtoon.slug || webtoon.id}`)}
                                >
                                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-2">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition-all" />
                                        <div className="absolute inset-0 flex items-center justify-center text-6xl">📚</div>
                                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="bg-black/60 px-2 py-1 rounded">⭐ {webtoon.rating || '—'}</span>
                                            <span className="bg-black/60 px-2 py-1 rounded">{webtoon.latestChapter || ''} cap</span>
                                        </div>
                                    </div>
                                    <h4 className="text-sm font-medium truncate mb-1 group-hover:text-purple-400 transition-colors">
                                        {webtoon.title}
                                    </h4>
                                    <p className="text-xs text-white/60 truncate">
                                        {(webtoon.authors && webtoon.authors.map(a => a.name).join(', ')) || ''} • {(webtoon.genres && webtoon.genres.join(', ')) || ''}
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
