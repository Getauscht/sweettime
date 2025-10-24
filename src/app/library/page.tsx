'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Heart, Clock, BookOpen, User } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Favorite {
    id: string
    createdAt: string
    webtoon: {
        id: string
        title: string
        slug: string
        description: string
        coverImage: string | null
        status: string
        views: number
        likes: number
        rating: number | null
        totalChapters: number
        // author can be an object (legacy), a string, or an array of authors
        author: { name: string; slug?: string } | string | Array<{ name: string; slug?: string }>
        genres: Array<{
            name: string
            slug: string
        }>
    }
}

interface Follow {
    id: string
    createdAt: string
    author: {
        id: string
        name: string
        slug: string
        bio: string | null
        avatar: string | null
        totalWebtoons: number
    }
}

interface ReadingHistory {
    id: string
    progress: number
    lastReadAt: string
    webtoon: {
        id: string
        title: string
        slug: string
        coverImage: string | null
        // author shapes vary across API responses
        author: { name: string } | string | Array<{ name: string }>
    }
    chapter: {
        id: string
        number: number
        title: string
    }
}

export default function LibraryPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    const [activeTab, setActiveTab] = useState<'reading' | 'favorites' | 'following'>('reading')
    const [favorites, setFavorites] = useState<Favorite[]>([])
    const [follows, setFollows] = useState<Follow[]>([])
    const [readingHistory, setReadingHistory] = useState<ReadingHistory[]>([])
    const [loading, setLoading] = useState(true)
    const [sessionId, setSessionId] = useState<string | null>(null)

    const formatAuthor = (authorField: any) => {
        if (!authorField) return ''
        if (typeof authorField === 'string') return authorField
        if (Array.isArray(authorField)) return authorField.map((a) => a.name).join(', ')
        if (typeof authorField === 'object' && 'name' in authorField) return authorField.name
        return ''
    }

    useEffect(() => {
        // Get session ID for anonymous users
        if (!session?.user?.id) {
            const id = localStorage.getItem('reading_session_id')
            setSessionId(id)
        }
    }, [session])

    useEffect(() => {
        if (status === 'loading') return

        const fetchData = async () => {
            try {
                // Always fetch reading history (works for anonymous users too)
                const historyRes = await fetch(
                    `/api/reading-history${sessionId ? `?sessionId=${sessionId}` : ''}`
                )
                if (historyRes.ok) {
                    const historyData = await historyRes.json()
                    setReadingHistory(historyData.history || [])
                }

                // Only fetch favorites and follows if authenticated
                if (session?.user?.id) {
                    const [favRes, followRes] = await Promise.all([
                        fetch('/api/favorites'),
                        fetch('/api/following')
                    ])

                    if (favRes.ok) {
                        const favData = await favRes.json()
                        setFavorites(favData.favorites || [])
                    }

                    if (followRes.ok) {
                        const followData = await followRes.json()
                        setFollows(followData.follows || [])
                    }
                }
            } catch (error) {
                console.error('Error fetching library data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [status, session, sessionId])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f0b14]">
                <Header />
                <main className="container mx-auto px-4 py-12">
                    <div className="text-center text-gray-400">Carregando...</div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0f0b14]">
            <Header />

            <main className="container mx-auto px-4 py-12">
                <h1 className="text-4xl font-bold text-gray-100 mb-8">Minha Biblioteca</h1>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-purple-600/20">
                    <button
                        onClick={() => setActiveTab('reading')}
                        className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'reading'
                            ? 'text-purple-400 border-purple-400'
                            : 'text-gray-400 border-transparent hover:text-gray-300'
                            }`}
                    >
                        <Clock className="inline h-4 w-4 mr-2" />
                        Continue Lendo
                    </button>
                    {session?.user?.id && (
                        <>
                            <button
                                onClick={() => setActiveTab('favorites')}
                                className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'favorites'
                                    ? 'text-purple-400 border-purple-400'
                                    : 'text-gray-400 border-transparent hover:text-gray-300'
                                    }`}
                            >
                                <Heart className="inline h-4 w-4 mr-2" />
                                Favoritos
                            </button>
                            <button
                                onClick={() => setActiveTab('following')}
                                className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'following'
                                    ? 'text-purple-400 border-purple-400'
                                    : 'text-gray-400 border-transparent hover:text-gray-300'
                                    }`}
                            >
                                <User className="inline h-4 w-4 mr-2" />
                                Seguindo
                            </button>
                        </>
                    )}
                </div>

                {/* Reading History */}
                {activeTab === 'reading' && (
                    <div className="space-y-4">
                        {readingHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400 mb-4">Nenhum histórico de leitura</p>
                                <Link href="/browse">
                                    <Button>Explorar Webtoons</Button>
                                </Link>
                            </div>
                        ) : (
                            readingHistory.map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/webtoon/${item.webtoon.slug}/chapter/${item.chapter.number}`}
                                    className="block p-4 bg-[#1a1625] hover:bg-purple-600/10 rounded-lg transition-colors border border-purple-600/20"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-16 h-24 rounded overflow-hidden flex-shrink-0">
                                            {item.webtoon.coverImage ? (
                                                <Image
                                                    src={item.webtoon.coverImage}
                                                    alt={item.webtoon.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-purple-600/20 flex items-center justify-center">
                                                    <BookOpen className="h-8 w-8 text-purple-600/50" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-lg text-gray-100 truncate">
                                                {item.webtoon.title}
                                            </h3>
                                            <p className="text-sm text-gray-400 mb-2">
                                                Capítulo {item.chapter.number}: {item.chapter.title}
                                            </p>
                                            <div className="w-full bg-purple-600/20 rounded-full h-2 mb-1">
                                                <div
                                                    className="bg-purple-600 h-2 rounded-full transition-all"
                                                    style={{ width: `${item.progress}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {item.progress}% • {format(new Date(item.lastReadAt), "d 'de' MMMM", { locale: ptBR })}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {/* Favorites */}
                {activeTab === 'favorites' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favorites.length === 0 ? (
                            <div className="col-span-full text-center py-12">
                                <Heart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400 mb-4">Nenhum favorito ainda</p>
                                <Link href="/browse">
                                    <Button>Explorar Webtoons</Button>
                                </Link>
                            </div>
                        ) : (
                            favorites.map((fav) => (
                                <Link
                                    key={fav.id}
                                    href={`/webtoon/${fav.webtoon.slug}`}
                                    className="group"
                                >
                                    <div className="bg-[#1a1625] rounded-lg overflow-hidden border border-purple-600/20 hover:border-purple-600/50 transition-all">
                                        <div className="relative aspect-[3/4]">
                                            {fav.webtoon.coverImage ? (
                                                <Image
                                                    src={fav.webtoon.coverImage}
                                                    alt={fav.webtoon.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-purple-600/20 flex items-center justify-center">
                                                    <BookOpen className="h-16 w-16 text-purple-600/50" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-semibold text-gray-100 mb-1 truncate">
                                                {fav.webtoon.title}
                                            </h3>
                                            <p className="text-sm text-gray-400 mb-2">{formatAuthor(fav.webtoon.author)}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{fav.webtoon.totalChapters} capítulos</span>
                                                <span>•</span>
                                                <span>{fav.webtoon.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {/* Following */}
                {activeTab === 'following' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {follows.length === 0 ? (
                            <div className="col-span-full text-center py-12">
                                <User className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400 mb-4">Não está seguindo nenhum autor</p>
                                <Link href="/browse">
                                    <Button>Explorar Webtoons</Button>
                                </Link>
                            </div>
                        ) : (
                            follows.map((follow) => (
                                <Link
                                    key={follow.id}
                                    href={`/author/${follow.author.slug}`}
                                    className="block p-6 bg-[#1a1625] hover:bg-purple-600/10 rounded-lg transition-colors border border-purple-600/20"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-purple-600/30 flex items-center justify-center text-2xl font-bold text-gray-100">
                                            {follow.author.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-lg text-gray-100 truncate">
                                                {follow.author.name}
                                            </h3>
                                            <p className="text-sm text-gray-400 mb-1">
                                                {follow.author.totalWebtoons} obra{follow.author.totalWebtoons !== 1 ? 's' : ''}
                                            </p>
                                            {follow.author.bio && (
                                                <p className="text-xs text-gray-500 line-clamp-2">{follow.author.bio}</p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
