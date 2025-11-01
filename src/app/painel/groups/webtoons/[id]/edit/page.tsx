'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Edit2, Upload, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface Chapter {
    id: string
    number: number
    title?: string
    views: number
    likes: number
    publishedAt: string
    createdAt: string
    scanlationGroupId: string
    scanlationGroup: {
        id: string
        name: string
    }
}

interface Webtoon {
    id: string
    title: string
    slug: string
    description?: string
    coverImage?: string
    status: string
    views: number
    likes: number
    rating: number
    chapters?: Chapter[]
    _count?: { chapters: number }
}

interface Group {
    id: string
    name: string
    slug: string
}

export default function EditWebtoonPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session, status } = useSession()
    const id = params?.id as string

    const [webtoon, setWebtoon] = useState<Webtoon | null>(null)
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [updatingStatus, setUpdatingStatus] = useState(false)
    const [webtoonStatus, setWebtoonStatus] = useState('ongoing')

    // Modal state
    const [showChapterModal, setShowChapterModal] = useState(false)
    const [chapterTitle, setChapterTitle] = useState('')
    const [chapterNumber, setChapterNumber] = useState<number>(1)
    const [chapterPages, setChapterPages] = useState<File[]>([])
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])
    const [creatingChapter, setCreatingChapter] = useState(false)

    useEffect(() => {
        if (status === 'loading') return

        if (!session?.user) {
            router.push('/auth/login')
            return
        }

        if (id) {
            loadWebtoon()
            loadGroups()
        }
    }, [session, status, id, router])

    async function loadWebtoon() {
        try {
            setLoading(true)
            const res = await fetch(`/api/webtoons/${id}`)
            if (!res.ok) {
                if (res.status === 404) {
                    setError('Webtoon not found')
                    return
                }
                throw new Error('Failed to load webtoon')
            }
            const data = await res.json()
            setWebtoon(data.webtoon)
            setWebtoonStatus(data.webtoon.status)
        } catch (err) {
            console.error('Failed to load webtoon:', err)
            setError(err instanceof Error ? err.message : 'Failed to load webtoon')
        } finally {
            setLoading(false)
        }
    }

    async function loadGroups() {
        try {
            const res = await fetch('/api/groups?own=true')
            if (res.ok) {
                const data = await res.json()
                setGroups(data.groups || [])
            }
        } catch (err) {
            console.error('Failed to load groups:', err)
        }
    }

    async function handleStatusChange(newStatus: string) {
        setUpdatingStatus(true)
        try {
            const res = await fetch(`/api/webtoons/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })

            if (!res.ok) {
                throw new Error('Failed to update status')
            }

            const data = await res.json()
            setWebtoon(data.webtoon)
            setWebtoonStatus(data.webtoon.status)
        } catch (err) {
            console.error('Failed to update status:', err)
            setError(err instanceof Error ? err.message : 'Failed to update status')
        } finally {
            setUpdatingStatus(false)
        }
    }

    async function handleCreateChapter(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (!chapterTitle.trim()) {
            setError('Chapter title is required')
            return
        }

        if (selectedGroups.length === 0) {
            setError('Select at least one group')
            return
        }

        if (chapterPages.length === 0) {
            setError('Upload at least one page')
            return
        }

        setCreatingChapter(true)

        try {
            // Upload pages
            const pageUrls: string[] = []

            for (const file of chapterPages) {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('type', 'chapter')

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                })

                if (!uploadRes.ok) {
                    throw new Error('Failed to upload page')
                }

                const uploadData = await uploadRes.json()
                pageUrls.push(uploadData.url)
            }

            // Create chapter
            const res = await fetch(`/api/webtoons/${id}/chapters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number: chapterNumber,
                    title: chapterTitle.trim(),
                    content: pageUrls,
                    groupIds: selectedGroups,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to create chapter')
            }

            // Reload webtoon
            loadWebtoon()

            // Reset modal
            setShowChapterModal(false)
            setChapterTitle('')
            setChapterPages([])
            setSelectedGroups([])
            setChapterNumber((webtoon?._count?.chapters || 0) + 1)
        } catch (err) {
            console.error('Failed to create chapter:', err)
            setError(err instanceof Error ? err.message : 'Failed to create chapter')
        } finally {
            setCreatingChapter(false)
        }
    }

    async function handleDeleteChapter(chapterId: string) {
        if (!confirm('Delete this chapter?')) return

        try {
            const res = await fetch(`/api/webtoons/${id}/chapters/${chapterId}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                throw new Error('Failed to delete chapter')
            }

            loadWebtoon()
        } catch (err) {
            console.error('Failed to delete chapter:', err)
            setError(err instanceof Error ? err.message : 'Failed to delete chapter')
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="space-y-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-white/10 rounded w-1/3"></div>
                    <div className="h-64 bg-white/10 rounded"></div>
                </div>
            </div>
        )
    }

    if (!webtoon) {
        return (
            <div className="space-y-8">
                <div className="text-center py-12">
                    <p className="text-white/60">{error || 'Webtoon not found'}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Edit Webtoon</h1>
                    <p className="text-white/60">Manage chapters and settings</p>
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

            {/* Webtoon Info */}
            <Card className="p-6 bg-[#1a1625] border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Cover */}
                    <div className="aspect-[3/4] bg-white/5 rounded flex items-center justify-center overflow-hidden">
                        {webtoon.coverImage ? (
                            <img
                                src={webtoon.coverImage}
                                alt={webtoon.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-white/20">No Cover</div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">{webtoon.title}</h1>
                            <p className="text-white/60">{webtoon.description}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-white/60">Chapters</p>
                                <p className="text-2xl font-bold text-white">{webtoon._count?.chapters || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm text-white/60">Views</p>
                                <p className="text-2xl font-bold text-white">{webtoon.views}</p>
                            </div>
                            <div>
                                <p className="text-sm text-white/60">Rating</p>
                                <p className="text-2xl font-bold text-white">{webtoon.rating.toFixed(1)}</p>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Status</label>
                            <select
                                value={webtoonStatus}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                disabled={updatingStatus}
                                className="w-full px-3 py-2 bg-[#0f0b14] border border-white/10 rounded text-white disabled:opacity-50"
                            >
                                <option value="ongoing">Ongoing</option>
                                <option value="completed">Completed</option>
                                <option value="hiatus">Hiatus</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Chapters */}
            <Card className="p-6 bg-[#1a1625] border-white/10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white">
                        Chapters ({webtoon._count?.chapters || 0})
                    </h3>
                    <Button
                        onClick={() => setShowChapterModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Chapter
                    </Button>
                </div>

                <div className="space-y-2">
                    {webtoon.chapters && webtoon.chapters.length > 0 ? (
                        webtoon.chapters
                            .sort((a, b) => b.number - a.number)
                            .map((chapter) => (
                                <div
                                    key={chapter.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-[#0f0b14] border border-white/5 hover:border-white/10"
                                >
                                    <div className="flex-1">
                                        <p className="text-white font-medium">
                                            Chapter {chapter.number}
                                            {chapter.title && `: ${chapter.title}`}
                                        </p>
                                        <p className="text-xs text-white/60">
                                            by {chapter.scanlationGroup.name}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 mr-4 text-sm text-white/60">
                                        <span>{chapter.views} views</span>
                                        <span>{chapter.likes} likes</span>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteChapter(chapter.id)}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                    ) : (
                        <div className="text-center py-8 text-white/60">
                            No chapters yet. Add one to get started!
                        </div>
                    )}
                </div>
            </Card>

            {/* Add Chapter Modal */}
            {showChapterModal && (
                <Dialog open={showChapterModal} onOpenChange={setShowChapterModal}>
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                        <Card className="w-full max-w-2xl bg-[#1a1625] border-white/10 p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white">Add Chapter</h2>
                                <button
                                    onClick={() => setShowChapterModal(false)}
                                    className="text-white/60 hover:text-white"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateChapter} className="space-y-6">
                                {/* Chapter Number */}
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Chapter Number *
                                    </label>
                                    <Input
                                        type="number"
                                        value={chapterNumber}
                                        onChange={(e) => setChapterNumber(parseInt(e.target.value))}
                                        min={1}
                                        className="bg-[#0f0b14] border-white/10 text-white"
                                    />
                                </div>

                                {/* Chapter Title */}
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Chapter Title *
                                    </label>
                                    <Input
                                        type="text"
                                        value={chapterTitle}
                                        onChange={(e) => setChapterTitle(e.target.value)}
                                        placeholder="Chapter title"
                                        className="bg-[#0f0b14] border-white/10 text-white placeholder:text-white/40"
                                    />
                                </div>

                                {/* Groups */}
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Groups * (Select at least your group)
                                    </label>
                                    <div className="space-y-2">
                                        {groups.length === 0 ? (
                                            <p className="text-white/60 text-sm">You're not a member of any groups</p>
                                        ) : (
                                            groups.map((group) => (
                                                <label key={group.id} className="flex items-center gap-2 text-white cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedGroups.includes(group.id)}
                                                        onChange={(e) => {
                                                            setSelectedGroups((prev) =>
                                                                e.target.checked
                                                                    ? [...prev, group.id]
                                                                    : prev.filter((id) => id !== group.id)
                                                            )
                                                        }}
                                                        className="w-4 h-4"
                                                    />
                                                    <span>{group.name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Pages Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Pages * {chapterPages.length > 0 && <span className="text-white/60">({chapterPages.length})</span>}
                                    </label>
                                    <label className="block">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => setChapterPages(Array.from(e.target.files || []))}
                                            className="hidden"
                                        />
                                        <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500/50 transition-colors">
                                            {chapterPages.length > 0 ? (
                                                <div className="space-y-2">
                                                    <Upload className="h-8 w-8 text-purple-400 mx-auto" />
                                                    <p className="text-white">{chapterPages.length} pages selected</p>
                                                    <p className="text-xs text-white/60">Click to change</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Upload className="h-8 w-8 text-white/40 mx-auto" />
                                                    <p className="text-white/60">Upload pages in reading order</p>
                                                    <p className="text-sm text-white/40">PNG, JPG up to 50MB total</p>
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4 pt-4">
                                    <Button
                                        type="submit"
                                        disabled={
                                            creatingChapter ||
                                            !chapterTitle.trim() ||
                                            selectedGroups.length === 0 ||
                                            chapterPages.length === 0
                                        }
                                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex-1"
                                    >
                                        {creatingChapter ? 'Creating...' : 'Create Chapter'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowChapterModal(false)}
                                        className="text-white/70 hover:text-white flex-1"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                </Dialog>
            )}
        </div>
    )
}
