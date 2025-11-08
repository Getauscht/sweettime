/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Upload, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Genre {
    id: string
    name: string
    slug: string
}

export default function NewWeboonPage() {
    const router = useRouter()
    const { data: session, status } = useSession()

    const [genres, setGenres] = useState<Genre[]>([])
    const [selectedGenres, setSelectedGenres] = useState<string[]>([])
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [coverImage, setCoverImage] = useState<string | null>(null)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [bannerImage, setBannerImage] = useState<string | null>(null)
    const [bannerFile, setBannerFile] = useState<File | null>(null)
    const [webtonStatus, setWebtoonStatus] = useState('ongoing')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loadingGenres, setLoadingGenres] = useState(true)

    useEffect(() => {
        if (status === 'loading') return

        if (!session?.user) {
            router.push('/auth/login')
            return
        }

        loadGenres()
    }, [session, status, router])

    async function loadGenres() {
        try {
            const res = await fetch('/api/genres')
            if (res.ok) {
                const data = await res.json()
                setGenres(data.genres || [])
            }
        } catch (err) {
            console.error('Failed to load genres:', err)
        } finally {
            setLoadingGenres(false)
        }
    }

    async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        // Preview
        const reader = new FileReader()
        reader.onload = (event) => {
            setCoverImage(event.target?.result as string)
        }
        reader.readAsDataURL(file)
        setCoverFile(file)
    }

    async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        // Preview
        const reader = new FileReader()
        reader.onload = (event) => {
            setBannerImage(event.target?.result as string)
        }
        reader.readAsDataURL(file)
        setBannerFile(file)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (!title.trim()) {
            setError('Title is required')
            return
        }

        if (selectedGenres.length === 0) {
            setError('Select at least one genre')
            return
        }

        setLoading(true)

        try {
            let coverImageUrl = null
            let bannerImageUrl = null

            // Upload cover if provided
            if (coverFile) {
                const formData = new FormData()
                formData.append('file', coverFile)
                formData.append('type', 'cover')

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                })

                if (!uploadRes.ok) {
                    throw new Error('Failed to upload cover image')
                }

                const uploadData = await uploadRes.json()
                coverImageUrl = uploadData.url
            }

            // Upload banner if provided
            if (bannerFile) {
                const formData2 = new FormData()
                formData2.append('file', bannerFile)
                formData2.append('type', 'banner')

                const uploadRes2 = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData2,
                })

                if (!uploadRes2.ok) {
                    throw new Error('Failed to upload banner image')
                }

                const uploadData2 = await uploadRes2.json()
                bannerImageUrl = uploadData2.url
            }

            // Create webtoon
            const res = await fetch('/api/webtoons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || null,
                    coverImage: coverImageUrl,
                    bannerImage: bannerImageUrl,
                    status: webtonStatus,
                    genreIds: selectedGenres,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to create webtoon')
            }

            const data = await res.json()
            router.push(`/groups/webtoons/${data.webtoon.id}/edit`)
        } catch (err) {
            console.error('Failed to create webtoon:', err)
            setError(err instanceof Error ? err.message : 'Failed to create webtoon')
        } finally {
            setLoading(false)
        }
    }

    if (status === 'loading') {
        return (
            <div className="space-y-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-white/10 rounded w-1/3"></div>
                    <div className="h-64 bg-white/10 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Create New Webtoon</h1>
                    <p className="text-white/60">Set up your webtoon and add chapters</p>
                </div>
                <div className="flex gap-2">
                    {/* No buttons */}
                </div>
            </div>

            {error && (
                <Card className="p-4 bg-red-500/10 border-red-500/30">
                    <p className="text-red-300">{error}</p>
                </Card>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Banner Image */}
                <Card className="p-6 bg-[#1a1625] border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Banner Image (16:9)</h3>

                    <label className="block mb-4">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleBannerUpload}
                            className="hidden"
                        />
                        <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500/50 transition-colors">
                            {bannerImage ? (
                                <div className="space-y-4">
                                    <img
                                        src={bannerImage}
                                        alt="Banner preview"
                                        className="w-full max-h-48 mx-auto rounded object-cover"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            setBannerImage(null)
                                            setBannerFile(null)
                                        }}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Remove Banner
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Upload className="h-8 w-8 text-white/40 mx-auto" />
                                    <p className="text-white/60">Upload a banner (16:9)</p>
                                    <p className="text-sm text-white/40">PNG, JPG up to 10MB</p>
                                </div>
                            )}
                        </div>
                    </label>
                </Card>

                {/* Cover Image */}
                <Card className="p-6 bg-[#1a1625] border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Cover Image</h3>

                    <label className="block">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverUpload}
                            className="hidden"
                        />
                        <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500/50 transition-colors">
                            {coverImage ? (
                                <div className="space-y-4">
                                    <img
                                        src={coverImage}
                                        alt="Cover preview"
                                        className="max-h-64 mx-auto rounded"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            setCoverImage(null)
                                            setCoverFile(null)
                                        }}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Remove Image
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Upload className="h-8 w-8 text-white/40 mx-auto" />
                                    <p className="text-white/60">Drag and drop or click to upload</p>
                                    <p className="text-sm text-white/40">PNG, JPG up to 10MB</p>
                                </div>
                            )}
                        </div>
                    </label>
                </Card>

                {/* Basic Info */}
                <Card className="p-6 bg-[#1a1625] border-white/10 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Title *
                        </label>
                        <Input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter webtoon title"
                            className="bg-[#0f0b14] border-white/10 text-white placeholder:text-white/40"
                            maxLength={100}
                        />
                        <p className="text-xs text-white/40 mt-1">{title.length}/100</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Description
                        </label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell readers what your webtoon is about..."
                            className="bg-[#0f0b14] border-white/10 text-white placeholder:text-white/40 min-h-[120px]"
                            maxLength={500}
                        />
                        <p className="text-xs text-white/40 mt-1">{description.length}/500</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Status *
                        </label>
                        <select
                            value={webtonStatus}
                            onChange={(e) => setWebtoonStatus(e.target.value)}
                            className="w-full px-3 py-2 bg-[#0f0b14] border border-white/10 rounded text-white"
                        >
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                            <option value="hiatus">Hiatus</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </Card>

                {/* Genres */}
                <Card className="p-6 bg-[#1a1625] border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        Genres * {loadingGenres && <span className="text-sm text-white/60">(loading...)</span>}
                    </h3>

                    {loadingGenres ? (
                        <div className="text-white/60">Loading genres...</div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {genres.map((genre) => (
                                <Badge
                                    key={genre.id}
                                    onClick={() => {
                                        setSelectedGenres((prev) =>
                                            prev.includes(genre.id)
                                                ? prev.filter((id) => id !== genre.id)
                                                : [...prev, genre.id]
                                        )
                                    }}
                                    className={cn(
                                        'cursor-pointer px-3 py-1 border',
                                        selectedGenres.includes(genre.id)
                                            ? 'bg-purple-600 border-purple-500 text-white'
                                            : 'bg-transparent border-white/20 text-white/70 hover:border-purple-500'
                                    )}
                                >
                                    {genre.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Actions */}
                <div className="flex gap-4">
                    <Button
                        type="submit"
                        disabled={loading || !title.trim() || selectedGenres.length === 0}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Webtoon'}
                    </Button>
                    <Link href="/groups/webtoons">
                        <Button variant="ghost" className="text-white/70 hover:text-white">
                            Cancel
                        </Button>
                    </Link>
                </div>
            </form>
        </div>
    )
}
