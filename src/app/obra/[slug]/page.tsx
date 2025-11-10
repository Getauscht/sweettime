/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Heart, Bell, Clock, Eye, Star, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import CommentsSection from '@/components/CommentsSection'

interface Work {
    id: string
    title: string
    slug: string
    description: string
    coverImage: string | null
    status: string
    views: number
    likes: number
    rating: number | null
    createdAt: string
    updatedAt: string
    type: 'webtoon' | 'novel'
    authors: Array<{
        id: string
        name: string
        slug: string
        bio: string | null
        avatar: string | null
        socialLinks: Record<string, unknown>
    }>
    genres?: Array<{
        id: string
        name: string
        slug: string
    }>
    bannerImage?: string | null
    latestChapters: Array<{
        id: string
        number: number
        title: string
        views: number
        likes: number
        publishedAt: string
        scanlationGroup?: {
            id: string
            name: string
        }
    }>
    totalChapters: number
    allChapters: Array<{
        id: string
        number: number
        title: string
        publishedAt: string
        views: number
        scanlationGroup?: {
            id: string
            name: string
        }
    }>
}

export default function WorkPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session } = useSession()
    const slug = params?.slug as string

    const [work, setWork] = useState<Work | null>(null)
    const [isFavorited, setIsFavorited] = useState(false)
    const [isFollowing, setIsFollowing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [userRating, setUserRating] = useState<number | null>(null)
    const [hoverRating, setHoverRating] = useState<number | null>(null)
    const [showRatingSelector, setShowRatingSelector] = useState(false)
    const [showAllChapters, setShowAllChapters] = useState(false)
    const [showFullDescription, setShowFullDescription] = useState(false)
    const descRef = useRef<HTMLParagraphElement | null>(null)
    const ratingRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!slug) return

        const fetchWork = async () => {
            try {
                const res = await fetch(`/api/obra/${slug}`)
                if (!res.ok) throw new Error('Failed to fetch')
                const data = await res.json()
                setWork(data.work)
            } catch (error) {
                console.error('Error:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchWork()
    }, [slug])

    useEffect(() => {
        if (!work || !session) return

        const fetchStatus = async () => {
            try {
                const endpoints = work.type === 'webtoon'
                    ? [`/api/obra/${work.slug}/favorite`, `/api/authors/${work.authors?.[0]?.id}/follow`]
                    : [`/api/obra/${work.slug}/favorite`]
                
                const responses = await Promise.all(endpoints.map(url => fetch(url)))
                const [favData, followData] = await Promise.all(responses.map(r => r.json()))
                
                setIsFavorited(favData.isFavorited)
                if (followData) setIsFollowing(followData.isFollowing)
            } catch (error) {
                console.error('Error:', error)
            }
        }

        fetchStatus()
    }, [work, session])

    useEffect(() => {
        if (!showRatingSelector) return

        const onDocClick = (e: MouseEvent) => {
            const maybeComposed = (e as any).composedPath
            const path = (typeof maybeComposed === 'function' ? maybeComposed.call(e) : (e as any).path) || []
            if (ratingRef.current && !path.includes(ratingRef.current)) {
                setShowRatingSelector(false)
            }
        }

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowRatingSelector(false)
        }

        document.addEventListener('click', onDocClick)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('click', onDocClick)
            document.removeEventListener('keydown', onKey)
        }
    }, [showRatingSelector])

    useEffect(() => {
        if (!work || !session) return

        const fetchRating = async () => {
            try {
                const res = await fetch(`/api/obra/${work.slug}/rating`)
                if (!res.ok) return
                const data = await res.json()
                setUserRating(data.userRating ?? null)
            } catch (err) {
                console.error('Failed to fetch user rating', err)
            }
        }

        fetchRating()
    }, [work, session])

    const toggleFavorite = async () => {
        if (!session || !work) {
            router.push('/auth/login')
            return
        }

        try {
            const method = isFavorited ? 'DELETE' : 'POST'
            const res = await fetch(`/api/obra/${work.slug}/favorite`, { method })
            const data = await res.json()
            setIsFavorited(data.isFavorited)
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const toggleFollow = async () => {
        if (!session || !work || !work.authors?.[0]) {
            router.push('/auth/login')
            return
        }

        try {
            const method = isFollowing ? 'DELETE' : 'POST'
            const res = await fetch(`/api/authors/${work.authors[0].id}/follow`, { method })
            const data = await res.json()
            setIsFollowing(data.isFollowing)
        } catch (error) {
            console.error('Error:', error)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f0b14]">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center text-gray-400">Carregando...</div>
                </main>
            </div>
        )
    }

    if (!work) {
        return (
            <div className="min-h-screen bg-[#0f0b14]">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center text-gray-400">Obra não encontrada</div>
                </main>
            </div>
        )
    }

    const authors = work.authors || []
    const shouldTruncate = work.description && work.description.length > 320

    return (
        <div className="min-h-screen bg-[#0f0b14] relative">
            <Header />

            {work?.bannerImage && (
                <div aria-hidden className="absolute inset-x-0 top-0 h-56 md:h-80 overflow-hidden z-0">
                    <div
                        className="w-full h-full bg-center bg-cover"
                        style={{ backgroundImage: `url(${work.bannerImage})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent" />
                </div>
            )}

            <main className="container mx-auto px-4 py-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="md:col-span-1">
                        <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                            {work.coverImage ? (
                                <Image
                                    src={work.coverImage}
                                    alt={work.title}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-purple-600/20 flex items-center justify-center">
                                    <BookOpen className="h-16 w-16 text-purple-600/50" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        <div>
                            <h1 data-page-title={work.title} className="text-4xl font-bold text-gray-100 mb-2">{work.title}</h1>
                            {authors.length > 0 && (
                                <>
                                    <span className="text-sm text-gray-500">por </span>
                                    <div className="inline space-x-2">
                                        {authors.map((author: any, index: number) => (
                                            <Link
                                                key={author.id ?? `${author.slug}-${index}`}
                                                href={`/author/${author.slug}`}
                                                className="text-purple-400 hover:text-purple-300 transition-colors"
                                            >
                                                {author.name}{index < authors.length - 1 ? ',' : ''}
                                            </Link>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-6 text-gray-400 text-sm">
                            <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                <span>{work.views.toLocaleString()} visualizações</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Heart className="h-4 w-4" />
                                <span>{work.likes.toLocaleString()} favoritos</span>
                            </div>
                            <div ref={ratingRef} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!session) {
                                            router.push('/auth/login')
                                            return
                                        }
                                        setShowRatingSelector((s) => !s)
                                    }}
                                    className="flex items-center gap-2 bg-transparent p-0 border-0"
                                    aria-expanded={showRatingSelector}
                                >
                                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                    <span>{work.rating !== null ? work.rating.toFixed(1) : '—'}</span>
                                </button>

                                {showRatingSelector && (
                                    <div className="ml-3 flex items-center gap-1">
                                        <div className="flex items-center select-none" aria-label="Avaliar obra">
                                            {Array.from({ length: 5 }).map((_, i) => {
                                                const displayValue = hoverRating ?? userRating ?? null
                                                const fill = (displayValue !== null)
                                                    ? (displayValue >= i + 1 ? 1 : displayValue >= i + 0.5 ? 0.5 : 0)
                                                    : 0

                                                return (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onMouseMove={(e) => {
                                                            const rect = (e.target as HTMLElement).getBoundingClientRect()
                                                            const relativeX = e.clientX - rect.left
                                                            const half = relativeX < rect.width / 2
                                                            setHoverRating(i + (half ? 0.5 : 1))
                                                        }}
                                                        onMouseLeave={() => setHoverRating(null)}
                                                        onClick={async (e) => {
                                                            e.preventDefault()
                                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                                            const relativeX = (e.nativeEvent as any).clientX - rect.left
                                                            const half = relativeX < rect.width / 2
                                                            const selected = i + (half ? 0.5 : 1)

                                                            try {
                                                                const res = await fetch(`/api/obra/${work.slug}/rating`, {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ rating: selected })
                                                                })
                                                                if (res.ok) {
                                                                    const data = await res.json()
                                                                    setUserRating(selected)
                                                                    setShowRatingSelector(false)
                                                                    if (data.averageRating !== undefined) {
                                                                        setWork((w) => w ? { ...w, rating: data.averageRating } as Work : w)
                                                                    }
                                                                }
                                                            } catch (err) {
                                                                console.error('Failed to submit rating', err)
                                                            }
                                                        }}
                                                        className="relative p-0 m-0 bg-transparent border-0 cursor-pointer"
                                                        style={{ width: 20, height: 20 }}
                                                        aria-label={`Dar ${i + 1} estrelas`}
                                                    >
                                                        <Star className={`h-5 w-5 ${fill === 1 ? 'text-yellow-400 fill-yellow-400' : fill === 0.5 ? 'text-yellow-400/60' : 'text-gray-600'}`} />
                                                    </button>
                                                )
                                            })}
                                            {userRating !== null && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch(`/api/obra/${work.slug}/rating`, { method: 'DELETE' })
                                                            if (res.ok) {
                                                                const data = await res.json()
                                                                setUserRating(null)
                                                                setShowRatingSelector(false)
                                                                if (data.averageRating !== undefined) {
                                                                    setWork((w) => w ? { ...w, rating: data.averageRating } as Work : w)
                                                                }
                                                            }
                                                        } catch (err) {
                                                            console.error('Failed to delete rating', err)
                                                        }
                                                    }}
                                                    className="ml-2 text-xs text-gray-400 hover:text-gray-200"
                                                >
                                                    Remover
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                <span>{work.totalChapters} capítulos</span>
                            </div>
                            <div className="px-3 py-1 bg-green-600/20 text-green-300 rounded-full text-xs">
                                {work.status}
                            </div>
                        </div>

                        {work.description && (
                            <div>
                                <div className="relative">
                                    <p
                                        ref={descRef}
                                        className="text-gray-300 leading-relaxed relative z-10"
                                        style={(!showFullDescription && shouldTruncate) ? {
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        } : { transition: 'max-height 300ms ease' }}
                                        aria-expanded={showFullDescription}
                                    >
                                        {work.description}
                                    </p>

                                    {shouldTruncate && !showFullDescription && (
                                        <div
                                            aria-hidden
                                            className="pointer-events-none absolute left-0 right-0 bottom-0 h-12 rounded-b-md"
                                            style={{ isolation: 'isolate' }}
                                        >
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    top: 0,
                                                    borderBottomLeftRadius: 6,
                                                    borderBottomRightRadius: 6,
                                                    background: 'linear-gradient(to top, rgba(128,90,213,0.6), rgba(128,90,213,0.35) 30%, rgba(128,90,213,0))',
                                                    filter: 'blur(10px)',
                                                    WebkitFilter: 'blur(10px)',
                                                    opacity: 0.95,
                                                    pointerEvents: 'none',
                                                    zIndex: 20
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {shouldTruncate && (
                                    <div className="mt-2">
                                        <div className="flex items-center w-full">
                                            <span className="flex-1 h-px bg-purple-600/20" aria-hidden />
                                            <button
                                                type="button"
                                                onClick={() => setShowFullDescription(s => !s)}
                                                className="mx-4 text-sm font-medium text-purple-300 hover:text-purple-400 focus:outline-none"
                                                aria-expanded={showFullDescription}
                                            >
                                                {showFullDescription ? 'Esconder sinopse' : 'Mostrar sinopse completa'}
                                            </button>
                                            <span className="flex-1 h-px bg-purple-600/20" aria-hidden />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <Button
                                onClick={toggleFavorite}
                                variant={isFavorited ? "default" : "outline"}
                                className={isFavorited ? "bg-pink-600 hover:bg-pink-700" : ""}
                            >
                                <Heart className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current' : ''}`} />
                                {isFavorited ? 'Favoritado' : 'Favoritar'}
                            </Button>
                            {authors.length > 0 && (
                                <Button
                                    onClick={toggleFollow}
                                    variant={isFollowing ? "default" : "outline"}
                                >
                                    <Bell className={`h-4 w-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                                    {isFollowing ? 'Seguindo' : 'Seguir Autor'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-100 mb-6">Capítulos Recentes</h2>
                    <div className="space-y-3">
                        {(showAllChapters ? work.allChapters : work.latestChapters).map((chapter) => (
                            <Link
                                key={chapter.id}
                                href={`/obra/${work.slug}/chapter/${chapter.number}`}
                                className="block p-4 bg-[#1a1625] hover:bg-purple-600/10 rounded-lg transition-colors border border-purple-600/20"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-gray-100 font-medium">
                                            Capítulo {chapter.number}{chapter.title ? `: ${chapter.title}` : ''}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {format(new Date(chapter.publishedAt), "d 'de' MMMM, yyyy", { locale: ptBR })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Eye className="h-3 w-3" />
                                                {chapter.views.toLocaleString()}
                                            </span>
                                            {chapter.scanlationGroup && (
                                                <span className="flex items-center gap-1">
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-sm text-gray-300">
                                                        {chapter.scanlationGroup.name}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                    {work.totalChapters > 5 && (
                        <Button variant="outline" className="w-full mt-4" onClick={() => setShowAllChapters(s => !s)}>
                            {showAllChapters ? 'Esconder capítulos' : `Ver todos os ${work.totalChapters} capítulos`}
                        </Button>
                    )}
                </div>

                <div className="mt-8">
                    {work.type === 'webtoon' ? (
                        <CommentsSection webtoonId={work.id} />
                    ) : (
                        <CommentsSection novelId={work.id} />
                    )}
                </div>
            </main>
        </div>
    )
}
