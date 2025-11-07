'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Edit2, Upload, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import Editor from '@/components/Editor'

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

interface Work {
    id: string
    title: string
    slug: string
    description?: string
    coverImage?: string
    bannerImage?: string
    status: string
    views: number
    likes: number
    rating: number
    chapters?: Chapter[]
    allChapters?: Chapter[]
    _count?: { chapters: number }
    type: 'webtoon' | 'novel'
}

interface Group {
    id: string
    name: string
    slug: string
}

export default function EditWorkPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const { data: session, status } = useSession()
    const id = params?.id as string
    const type = searchParams?.get('type') as 'webtoon' | 'novel' | null

    const [work, setWork] = useState<Work | null>(null)
    const [bannerFile, setBannerFile] = useState<File | null>(null)
    const [bannerPreview, setBannerPreview] = useState<string | null>(null)
    const [uploadingBanner, setUploadingBanner] = useState(false)
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [updatingStatus, setUpdatingStatus] = useState(false)
    const [workStatus, setWorkStatus] = useState('ongoing')

    // Modal state
    const [showChapterModal, setShowChapterModal] = useState(false)
    const [chapterTitle, setChapterTitle] = useState('')
    const [chapterNumber, setChapterNumber] = useState<number>(1)
    const [chapterPages, setChapterPages] = useState<File[]>([])
    const [chapterContent, setChapterContent] = useState('')
    const [chapterEditorData, setChapterEditorData] = useState<any>(null)
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])
    const [creatingChapter, setCreatingChapter] = useState(false)
    // Edit chapter modal state
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editEditorData, setEditEditorData] = useState<any>(null)
    const [editNumber, setEditNumber] = useState<number>(1)
    const [editScanlationGroupId, setEditScanlationGroupId] = useState<string | null>(null)
    const [savingEdit, setSavingEdit] = useState(false)

    useEffect(() => {
        if (status === 'loading') return

        if (!session?.user) {
            router.push('/auth/login')
            return
        }

        if (id && type) {
            loadWork()
            loadGroups()
        }
    }, [session, status, id, router])

    // Cleanup object URL used for preview
    useEffect(() => {
        return () => {
            if (bannerPreview) {
                try {
                    URL.revokeObjectURL(bannerPreview)
                } catch (_) { }
            }
        }
    }, [bannerPreview])

    // Control body scroll when modal is open
    useEffect(() => {
        if (showChapterModal) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [showChapterModal])

    async function loadWork() {
        if (!type) return
        try {
            setLoading(true)
            const apiEndpoint = type === 'webtoon' ? `/api/webtoons/${id}` : `/api/novels/${id}`
            const res = await fetch(apiEndpoint)
            if (!res.ok) {
                if (res.status === 404) {
                    setError(`${type === 'webtoon' ? 'Webtoon' : 'Novel'} not found`)
                    return
                }
                throw new Error(`Failed to load ${type}`)
            }
            const data = await res.json()
            setWork({ ...data[type], type })
            setWorkStatus(data[type].status)
        } catch (err) {
            console.error(`Failed to load ${type}:`, err)
            setError(err instanceof Error ? err.message : `Failed to load ${type}`)
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
        if (!type) return
        setUpdatingStatus(true)
        try {
            const apiEndpoint = type === 'webtoon' ? `/api/webtoons/${id}` : `/api/novels/${id}`
            const res = await fetch(apiEndpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })

            if (!res.ok) {
                throw new Error('Failed to update status')
            }

            const data = await res.json()
            setWork({ ...data[type], type })
            setWorkStatus(data[type].status)
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

        if (type === 'webtoon' && chapterPages.length === 0) {
            setError('Upload at least one page')
            return
        }

        if (type === 'novel' && !chapterEditorData) {
            setError('Chapter content is required')
            return
        }

        setCreatingChapter(true)

        try {
            let content: any
            if (type === 'webtoon') {
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
                content = pageUrls
            } else {
                // For novels, save Editor.js data as JSON
                content = JSON.stringify(chapterEditorData)
            }

            // Create chapter
            const apiEndpoint = type === 'webtoon' ? `/api/webtoons/${id}/chapters` : `/api/novels/${id}/chapters`
            const res = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number: chapterNumber,
                    title: chapterTitle.trim(),
                    content,
                    groupIds: selectedGroups,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to create chapter')
            }

            // Reload work
            loadWork()

            // Reset modal
            setShowChapterModal(false)
            setChapterTitle('')
            setChapterPages([])
            setChapterContent('')
            setChapterEditorData(null)
            setSelectedGroups([])
            setChapterNumber((work?.allChapters?.length || 0) + 1)
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
            const apiEndpoint = type === 'webtoon' ? `/api/webtoons/${id}/chapters/${chapterId}` : `/api/novels/${id}/chapters/${chapterId}`
            const res = await fetch(apiEndpoint, {
                method: 'DELETE',
            })

            if (!res.ok) {
                throw new Error('Failed to delete chapter')
            }

            loadWork()
        } catch (err) {
            console.error('Failed to delete chapter:', err)
            setError(err instanceof Error ? err.message : 'Failed to delete chapter')
        }
    }

    function handleEditChapter(chapterId: string) {
        // Open edit modal and prefill fields from loaded work
        if (!work) return
        const chapter = (work.allChapters || []).find(c => c.id === chapterId)
        if (!chapter) return
        setEditingChapterId(chapterId)
        setEditTitle(chapter.title || '')
        setEditNumber(chapter.number || 1)
        setEditScanlationGroupId(chapter.scanlationGroup?.id || chapter.scanlationGroupId || null)
        // For novels we may want to load content; fetch full chapter if needed
        if (type === 'novel') {
            ;(async () => {
                try {
                    const res = await fetch(`/api/obra/${id}/chapters/${chapterId}`)
                    if (!res.ok) {
                        console.warn('Failed to fetch chapter content for edit')
                        setEditEditorData(null)
                        return
                    }
                    const data = await res.json()
                    const ch = data.chapter
                    if (!ch || !ch.content) {
                        setEditEditorData(null)
                        return
                    }

                    // Try to parse JSON content (Editor.js format or object)
                    try {
                        const parsed = JSON.parse(ch.content)
                        // If it's editorjs data (blocks) or object with markdown, normalize
                        if (parsed && parsed.blocks) {
                            setEditEditorData(parsed)
                        } else if (parsed && typeof parsed.markdown === 'string') {
                            setEditEditorData({ blocks: [{ type: 'paragraph', data: { text: parsed.markdown } }] })
                        } else {
                            // Fallback: store as single paragraph
                            setEditEditorData({ blocks: [{ type: 'paragraph', data: { text: String(ch.content) } }] })
                        }
                    } catch (e) {
                        // content is plain string (markdown/plaintext)
                        setEditEditorData({ blocks: [{ type: 'paragraph', data: { text: String(ch.content) } }] })
                    }
                } catch (err) {
                    console.error('Failed to load chapter content for editing:', err)
                    setEditEditorData(null)
                }
            })()
        } else {
            setEditEditorData(null)
        }
        setShowEditModal(true)
    }

    async function handleSaveEdit(e: React.FormEvent) {
        e.preventDefault()
        if (!editingChapterId) return
        setSavingEdit(true)
        try {
            const apiEndpoint = type === 'webtoon' ? `/api/webtoons/${id}/chapters/${editingChapterId}` : `/api/novels/${id}/chapters/${editingChapterId}`
            const payload: any = { title: editTitle }
            // include number and group if changed
            if (typeof editNumber === 'number') payload.number = editNumber
            if (editScanlationGroupId) payload.scanlationGroupId = editScanlationGroupId
            if (type === 'novel' && editEditorData) payload.content = JSON.stringify(editEditorData)

            const res = await fetch(apiEndpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Failed to save chapter')
            }

            // Refresh work and close modal
            await loadWork()
            setShowEditModal(false)
            setEditingChapterId(null)
            setEditTitle('')
            setEditEditorData(null)
            setEditNumber(1)
            setEditScanlationGroupId(null)
        } catch (err) {
            console.error('Failed to save chapter edits:', err)
            setError(err instanceof Error ? err.message : 'Failed to save chapter')
        } finally {
            setSavingEdit(false)
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

    if (!work) {
        return (
            <div className="space-y-8">
                <div className="text-center py-12">
                    <p className="text-white/60">{error || `${type === 'webtoon' ? 'Webtoon' : 'Novel'} not found`}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Edit {type === 'webtoon' ? 'Webtoon' : 'Novel'}</h1>
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
                {/* Banner is not displayed here; banner image is used only as the background of the public webtoon detail page. */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Cover */}
                    <div className="aspect-[3/4] bg-white/5 rounded flex items-center justify-center overflow-hidden">
                        {work.coverImage ? (
                            <img
                                src={work.coverImage}
                                alt={work.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-white/20">No Cover</div>
                        )}
                    </div>

                    {/* Banner controls */}
                    <div className="md:col-span-2">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-white mb-2">Banner (used as public page background)</label>
                            <div className="flex items-start gap-4">
                                <div className="w-56 h-20 bg-white/5 rounded overflow-hidden flex items-center justify-center">
                                    {bannerPreview || work.bannerImage ? (
                                        <img src={bannerPreview || work.bannerImage || ''} alt="banner preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-white/30 text-sm p-2">No banner</div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-2">
                                    <input
                                        id="banner-file-input"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0] ?? null
                                            setBannerFile(f)
                                            if (f) setBannerPreview(URL.createObjectURL(f))
                                        }}
                                    />

                                    <div className="flex gap-2">
                                        <label htmlFor="banner-file-input">
                                            <Button variant="outline" className="gap-2">
                                                <Upload className="h-4 w-4" />
                                                {bannerPreview ? 'Change file' : 'Choose file'}
                                            </Button>
                                        </label>

                                        <Button
                                            onClick={async () => {
                                                if (!bannerFile) return alert('Select a banner file first')
                                                setUploadingBanner(true)
                                                try {
                                                    const formData = new FormData()
                                                    formData.append('file', bannerFile)
                                                    formData.append('type', 'banner')

                                                    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
                                                    if (!uploadRes.ok) throw new Error('Failed to upload banner')
                                                    const uploadData = await uploadRes.json()

                                                    // Save banner URL to work
                                                    const patchRes = await fetch(type === 'webtoon' ? `/api/webtoons/${id}` : `/api/novels/${id}`, {
                                                        method: 'PATCH',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ bannerImage: uploadData.url }),
                                                    })
                                                    if (!patchRes.ok) throw new Error('Failed to save banner')

                                                    // reload
                                                    await loadWork()
                                                    setBannerFile(null)
                                                    setBannerPreview(null)
                                                } catch (err) {
                                                    console.error(err)
                                                    alert(err instanceof Error ? err.message : 'Failed')
                                                } finally {
                                                    setUploadingBanner(false)
                                                }
                                            }}
                                            disabled={!bannerFile || uploadingBanner}
                                            className="gap-2"
                                        >
                                            {uploadingBanner ? 'Uploading...' : 'Upload & Save'}
                                        </Button>

                                        {work.bannerImage && (
                                            <Button
                                                variant="ghost"
                                                onClick={async () => {
                                                    if (!confirm('Remove banner?')) return
                                                    try {
                                                        const res = await fetch(type === 'webtoon' ? `/api/webtoons/${id}` : `/api/novels/${id}`, {
                                                            method: 'PATCH',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ bannerImage: null }),
                                                        })
                                                        if (!res.ok) throw new Error('Failed to remove banner')
                                                        await loadWork()
                                                    } catch (err) {
                                                        console.error(err)
                                                        alert('Failed to remove banner')
                                                    }
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>

                                    <p className="text-xs text-white/60">Recommended aspect ratio: 16:9. It will be cropped/resized server-side.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">{work.title}</h1>
                            <p className="text-white/60">{work.description}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-white/60">Chapters</p>
                                <p className="text-2xl font-bold text-white">{work._count?.chapters || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm text-white/60">Views</p>
                                <p className="text-2xl font-bold text-white">{work.views}</p>
                            </div>
                            <div>
                                <p className="text-sm text-white/60">Rating</p>
                                <p className="text-2xl font-bold text-white">{typeof work.rating === 'number' ? work.rating.toFixed(1) : '—'}</p>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Status</label>
                            <select
                                value={workStatus}
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
                        Chapters ({work._count?.chapters || 0})
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
                    {work.allChapters && work.allChapters.length > 0 ? (
                        work.allChapters
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
                                            by {chapter.scanlationGroup?.name || groups.find(g => g.id === chapter.scanlationGroupId)?.name || 'Unknown Group'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 mr-4 text-sm text-white/60">
                                        <span>{chapter.views} views</span>
                                        <span>{chapter.likes} likes</span>
                                    </div>

                                    {/* If the chapter belongs to one of the user's groups, show edit button */}
                                    {(() => {
                                        const chapterGroupId = chapter.scanlationGroup?.id || chapter.scanlationGroupId
                                        return groups.some(g => g.id === chapterGroupId)
                                    })() && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEditChapter(chapter.id)}
                                            className="text-white hover:bg-white/10 mr-2"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    )}
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
                        <Card className="w-full max-w-2xl bg-[#1a1625] border-white/10 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
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

                                {/* Content */}
                                {type === 'novel' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Chapter Content *
                                        </label>
                                        <Editor
                                            data={chapterEditorData}
                                            onChange={setChapterEditorData}
                                            placeholder="Escreva o conteúdo do capítulo..."
                                            maxHeight="300px"
                                        />
                                    </div>
                                ) : (
                                    /* Pages Upload */
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
                                )}

                                {/* Actions */}
                                <div className="flex gap-4 pt-4">
                                    <Button
                                        type="submit"
                                        disabled={
                                            creatingChapter ||
                                            !chapterTitle.trim() ||
                                            selectedGroups.length === 0 ||
                                            (type === 'webtoon' && chapterPages.length === 0) ||
                                            (type === 'novel' && !chapterEditorData)
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
            {/* Edit Chapter Modal */}
            {showEditModal && (
                <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                        <Card className="w-full max-w-2xl bg-[#1a1625] border-white/10 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white">Edit Chapter</h2>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="text-white/60 hover:text-white"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">Chapter Title</label>
                                    <Input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="Chapter title"
                                        className="bg-[#0f0b14] border-white/10 text-white placeholder:text-white/40"
                                    />
                                </div>

                                {/* Number & Group */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Chapter Number</label>
                                        <Input
                                            type="number"
                                            value={editNumber}
                                            onChange={(e) => setEditNumber(parseInt(e.target.value || '1'))}
                                            min={1}
                                            className="bg-[#0f0b14] border-white/10 text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Producer Group</label>
                                        <div className="space-y-2">
                                            {groups.length === 0 ? (
                                                <p className="text-white/60 text-sm">You're not a member of any groups</p>
                                            ) : (
                                                groups.map((group) => (
                                                    <label key={group.id} className="flex items-center gap-2 text-white cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="edit-scanlation-group"
                                                            checked={editScanlationGroupId === group.id}
                                                            onChange={() => setEditScanlationGroupId(group.id)}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>{group.name}</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {type === 'novel' && (
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Chapter Content</label>
                                        <Editor
                                            data={editEditorData}
                                            onChange={setEditEditorData}
                                            placeholder="Edit chapter content..."
                                            maxHeight="300px"
                                        />
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <Button
                                        type="submit"
                                        disabled={savingEdit}
                                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex-1"
                                    >
                                        {savingEdit ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowEditModal(false)}
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
