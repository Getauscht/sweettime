"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import AuthorProfile from '@/components/AuthorProfile'
import AuthorWebtoonsList from '@/components/AuthorWebtoonsList'

interface Webtoon {
    id: string
    title: string
    slug: string
    coverImage: string | null
    views: number
}

interface Author {
    id: string
    name: string
    bio?: string | null
    avatar?: string | null
    webtoon?: Webtoon[]
    _count?: { webtoonCredits?: number }
}

export default function AuthorByIdPage() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string

    const [author, setAuthor] = useState<Author | null>(null)
    const [loading, setLoading] = useState(true)
    const [isFollowing, setIsFollowing] = useState(false)

    useEffect(() => {
        if (!id) return

        console.log('Fetching author with id:', id)

        const fetchAuthor = async () => {
            try {
                const res = await fetch(`/api/authors/${id}`)
                if (!res.ok) {
                    console.error('Fetch failed with status:', res.status)
                    throw new Error('Failed to fetch')
                }
                const data = await res.json()
                setAuthor(data.author)
            } catch (error) {
                console.error('Error fetching author:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchAuthor()
    }, [id])

    useEffect(() => {
        if (!author) return

        const checkFollow = async () => {
            try {
                const res = await fetch(`/api/authors/${author.id}/follow`)
                if (!res.ok) throw new Error('Failed to check follow')
                const data = await res.json()
                setIsFollowing(data.isFollowing)
            } catch (error) {
                console.error('Error checking follow:', error)
            }
        }

        checkFollow()
    }, [author])

    const toggleFollow = async () => {
        if (!author) return

        try {
            const method = isFollowing ? 'DELETE' : 'POST'
            const res = await fetch(`/api/authors/${author.id}/follow`, { method })
            const data = await res.json()
            setIsFollowing(data.isFollowing)
        } catch (error) {
            console.error('Error toggling follow:', error)
            router.push('/auth/login')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f0b14]">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center text-gray-400">Carregando autor...</div>
                </main>
            </div>
        )
    }

    if (!author) {
        return (
            <div className="min-h-screen bg-[#0f0b14]">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center text-gray-400">Autor não encontrado</div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0f0b14]">
            <Header />

            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 items-start">
                    <div className="md:col-span-1">
                        <AuthorProfile author={{ id: author.id, name: author.name, avatar: author.avatar, webtoonCount: author._count?.webtoonCredits ?? 0 }} isFollowing={isFollowing} onToggleFollow={toggleFollow} />
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        {author.bio && (
                            <div className="prose prose-invert text-gray-200">
                                <p>{author.bio}</p>
                            </div>
                        )}

                        <div className="flex items-center gap-6 text-gray-400 text-sm">
                            <div className="flex items-center gap-2">
                                <span>{author.webtoon?.reduce((acc, w) => acc + (w.views || 0), 0).toLocaleString()} visualizações</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>{author._count?.webtoonCredits ?? 0} obras</span>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-gray-100 mb-6">Obras do autor</h2>

                            <AuthorWebtoonsList webtoons={author.webtoon} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
