'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Heart, Bell, Clock, Eye, Star, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MentionInput } from '@/components/ui/mention-input'

interface Webtoon {
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
    author: Array<{
        id: string
        name: string
        slug: string
        bio: string | null
        avatar: string | null
        socialLinks: Record<string, unknown>
    }>
    genres: Array<{
        id: string
        name: string
        slug: string
    }>
    latestChapters: Array<{
        id: string
        number: number
        title: string
        views: number
        likes: number
        publishedAt: string
    }>
    totalChapters: number
    allChapters: Array<{
        id: string
        number: number
        title: string
        publishedAt: string
        views: number
    }>
}

interface Comment {
    id: string
    content: string
    likes: number
    createdAt: string
    user: {
        id: string
        name: string | null
        image: string | null
    }
    mentions: Array<{
        user: {
            id: string
            name: string | null
        }
    }>
}

export default function WebtoonPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session } = useSession()
    const slug = params?.slug as string

    const [webtoon, setWebtoon] = useState<Webtoon | null>(null)

    const [isFavorited, setIsFavorited] = useState(false)
    const [isFollowing, setIsFollowing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [comments, setComments] = useState<Comment[]>([])
    const [commentText, setCommentText] = useState('')
    const [commentMentions, setCommentMentions] = useState<string[]>([])

    useEffect(() => {
        if (!slug) return

        const fetchWebtoon = async () => {
            try {
                const res = await fetch(`/api/webtoons/${slug}`)
                if (!res.ok) throw new Error('Failed to fetch')
                const data = await res.json()
                console.log('Fetched webtoon data:', data) // Debug log
                setWebtoon(data.webtoon)
            } catch (error) {
                console.error('Error:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchWebtoon()
    }, [slug])

    useEffect(() => {
        if (!webtoon || !session) return

        const fetchStatus = async () => {
            try {
                const [favRes, followRes] = await Promise.all([
                    fetch(`/api/webtoons/${webtoon.id}/favorite`),
                    // support standardized `authors` array or legacy `author` array
                    fetch(`/api/authors/${(webtoon as any).authors?.[0]?.id || webtoon.author[0].id}/follow`)
                ])
                const favData = await favRes.json()
                const followData = await followRes.json()
                setIsFavorited(favData.isFavorited)
                setIsFollowing(followData.isFollowing)
            } catch (error) {
                console.error('Error:', error)
            }
        }

        fetchStatus()
    }, [webtoon, session])

    // Comments are now handled by the CommentsSection component.

    const toggleFavorite = async () => {
        if (!session || !webtoon) {
            router.push('/auth/login')
            return
        }

        try {
            const method = isFavorited ? 'DELETE' : 'POST'
            const res = await fetch(`/api/webtoons/${webtoon.id}/favorite`, { method })
            const data = await res.json()
            setIsFavorited(data.isFavorited)
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const toggleFollow = async () => {
        if (!session || !webtoon) {
            router.push('/auth/login')
            return
        }

        try {
            const method = isFollowing ? 'DELETE' : 'POST'
            const firstAuthorId = (webtoon as any).authors?.[0]?.id || webtoon.author?.[0]?.id
            const res = await fetch(`/api/authors/${firstAuthorId}/follow`, { method })
            const data = await res.json()
            setIsFollowing(data.isFollowing)
        } catch (error) {
            console.error('Error:', error)
        }
    }

    // handleCommentSubmit is no longer used because CommentsSection handles posting; keep for backward compatibility
    const handleCommentSubmit = async () => {
        if (!session || !webtoon || !commentText.trim()) return

        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    webtoonId: webtoon.id,
                    content: commentText,
                    mentions: commentMentions
                })
            })

            if (res.ok) {
                const data = await res.json()
                setComments([data.comment, ...comments])
                setCommentText('')
                setCommentMentions([])
            }
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

    if (!webtoon) {
        return (
            <div className="min-h-screen bg-[#0f0b14]">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center text-gray-400">Webtoon não encontrado</div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0f0b14]">
            <Header />

            <main className="container mx-auto px-4 py-8">
                {/* Hero Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="md:col-span-1">
                        <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                            {webtoon.coverImage ? (
                                <Image
                                    src={webtoon.coverImage}
                                    alt={webtoon.title}
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
                            <h1 className="text-4xl font-bold text-gray-100 mb-2">{webtoon.title}</h1>
                            <span
                                className="text-sm text-gray-500">
                                por{' '}
                            </span>
                            <div className="inline space-x-2">
                                {((webtoon as any).authors ?? webtoon.author).map((author: any, index: number) => (
                                    <Link
                                        key={author.id}
                                        href={`/author/${author.slug}`}
                                        className="text-purple-400 hover:text-purple-300 transition-colors"
                                    >
                                        {author.name}{index < ((webtoon as any).authors ?? webtoon.author).length - 1 ? ',' : ''}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {webtoon.genres.map((genre) => (
                                <Link
                                    key={genre.id}
                                    href={`/browse?genre=${genre.slug}`}
                                    className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm hover:bg-purple-600/30 transition-colors"
                                >
                                    {genre.name}
                                </Link>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-6 text-gray-400 text-sm">
                            <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                <span>{webtoon.views.toLocaleString()} visualizações</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Heart className="h-4 w-4" />
                                <span>{webtoon.likes.toLocaleString()} favoritos</span>
                            </div>
                            {webtoon.rating && (
                                <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                    <span>{webtoon.rating.toFixed(1)}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                <span>{webtoon.totalChapters} capítulos</span>
                            </div>
                            <div className="px-3 py-1 bg-green-600/20 text-green-300 rounded-full text-xs">
                                {webtoon.status}
                            </div>
                        </div>

                        <p className="text-gray-300 leading-relaxed">{webtoon.description}</p>

                        <div className="flex gap-4">
                            <Button
                                onClick={toggleFavorite}
                                variant={isFavorited ? "default" : "outline"}
                                className={isFavorited ? "bg-pink-600 hover:bg-pink-700" : ""}
                            >
                                <Heart className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current' : ''}`} />
                                {isFavorited ? 'Favoritado' : 'Favoritar'}
                            </Button>
                            <Button
                                onClick={toggleFollow}
                                variant={isFollowing ? "default" : "outline"}
                            >
                                <Bell className={`h-4 w-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                                {isFollowing ? 'Seguindo' : 'Seguir Autor'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Latest Chapters */}
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-100 mb-6">Capítulos Recentes</h2>
                    <div className="space-y-3">
                        {webtoon.latestChapters.map((chapter) => (
                            <Link
                                key={chapter.id}
                                href={`/webtoon/${webtoon.slug}/chapter/${chapter.number}`}
                                className="block p-4 bg-[#1a1625] hover:bg-purple-600/10 rounded-lg transition-colors border border-purple-600/20"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-gray-100 font-medium">
                                            Capítulo {chapter.number}: {chapter.title}
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
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                    {webtoon.totalChapters > 5 && (
                        <Button variant="outline" className="w-full mt-4">
                            Ver todos os {webtoon.totalChapters} capítulos
                        </Button>
                    )}
                </div>
            </main >
        </div >
    )
}
