'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Plus, Edit, Trash2, Upload } from 'lucide-react'
import dynamic from 'next/dynamic'

const DynamicMarkdownEditor = dynamic(() => import('@/components/MarkdownEditor'), { ssr: false })

interface Chapter {
    id: string
    number: number
    title: string
    views: number
    publishedAt: string
}

export default function EditWebtoonPage() {
    const router = useRouter()
    const params = useParams()
    const id = params?.id as string | undefined
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [webtoon, setWebtoon] = useState<any>(null)
    const [genres, setGenres] = useState<{ id: string; name: string }[]>([])
    const [authorsList, setAuthorsList] = useState<{ id: string; name: string }[]>([])
    const [form, setForm] = useState({
        title: '',
        slug: '',
        description: '',
        coverImage: '',
        bannerImage: '',
        status: 'ongoing',
        genreIds: [] as string[],
        authorIds: [] as string[],
        artistIds: [] as string[],
    })
    const [chapters, setChapters] = useState<Chapter[]>([])
    const [showChapterModal, setShowChapterModal] = useState(false)
    const [showClaimModal, setShowClaimModal] = useState(false)
    const [groupsForClaim, setGroupsForClaim] = useState<{ id: string; name: string }[]>([])
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
    const [claiming, setClaiming] = useState(false)
    const [newChapter, setNewChapter] = useState<any>({
        number: '',
        title: '',
        content: [] as string[],
        markdown: '',
    })
    const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
    const [editingChapter, setEditingChapter] = useState<any>({ number: '', title: '', content: [] as string[], markdown: '' })
    const [editorMode, setEditorMode] = useState<'images' | 'markdown'>('images')
    const [uploadingChapter, setUploadingChapter] = useState(false)

    // Simple local toast helper (project doesn't expose global toast in codebase)
    const [toasts, setToasts] = useState<{ id: string; message: string; type?: 'success' | 'error' }[]>([])
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        const tid = String(Date.now())
        setToasts(prev => [...prev, { id: tid, message, type }])
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 4000)
    }

    useEffect(() => {
        if (!id) return
        fetchWebtoon()
        fetchGenres()
        fetchAuthors()
        fetchChapters()
    }, [id])

    const fetchWebtoon = async () => {
        try {
            const response = await fetch(`/api/admin/webtoons?id=${id}`)
            if (response.ok) {
                const data = await response.json()
                setWebtoon(data.webtoon)
                // populate form
                setForm(prev => ({
                    ...prev,
                    title: data.webtoon.title || '',
                    slug: data.webtoon.slug || '',
                    description: data.webtoon.description || '',
                    coverImage: data.webtoon.coverImage || '',
                    bannerImage: data.webtoon.bannerImage || '',
                    status: data.webtoon.status || 'ongoing',
                    genreIds: (data.webtoon.genres || []).map((g: any) => g.id),
                    authorIds: (data.webtoon.credits || []).filter((c: any) => c.role === 'AUTHOR').map((c: any) => c.authorId),
                    artistIds: (data.webtoon.credits || []).filter((c: any) => c.role === 'ARTIST').map((c: any) => c.authorId),
                }))
            }
        } catch (error) {
            console.error('Error fetching webtoon:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchGenres = async () => {
        try {
            const res = await fetch('/api/admin/genres')
            if (res.ok) {
                const data = await res.json()
                setGenres(data.genres || [])
            }
        } catch (err) {
            console.error('Error fetching genres', err)
        }
    }

    const fetchAuthors = async () => {
        try {
            const res = await fetch('/api/admin/authors')
            if (res.ok) {
                const data = await res.json()
                setAuthorsList(data.authors || [])
            }
        } catch (err) {
            console.error('Error fetching authors', err)
        }
    }

    const fetchChapters = async () => {
        try {
            const response = await fetch(`/api/admin/chapters?webtoonId=${id}`)
            if (response.ok) {
                const data = await response.json()
                setChapters(data.chapters)
            }
        } catch (error) {
            console.error('Error fetching chapters:', error)
        }
    }

    const handleUpdate = async (updates: any) => {
        setSaving(true)
        try {
            const payload = { webtoonId: id, ...updates }
            const response = await fetch('/api/admin/webtoons', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (response.ok) {
                fetchWebtoon()
            } else {
                const err = await response.json().catch(() => ({}))
                showToast(err.error || 'Failed to update webtoon', 'error')
            }
        } catch (error) {
            console.error('Error updating webtoon:', error)
            showToast('Failed to update webtoon', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleSave = async () => {
        // prepare body from form
        const updates: any = {
            title: form.title,
            slug: form.slug,
            description: form.description,
            coverImage: form.coverImage,
            bannerImage: form.bannerImage,
            status: form.status,
            genreIds: form.genreIds,
            authorIds: form.authorIds,
            artistIds: form.artistIds,
        }

        await handleUpdate(updates)
        // optionally navigate back or show toast
        showToast('Saved', 'success')
    }

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setSaving(true)
        const fd = new FormData()
        fd.append('file', file)
        fd.append('type', 'cover')

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            if (res.ok) {
                const data = await res.json()
                setForm(prev => ({ ...prev, coverImage: data.url }))
            } else {
                showToast('Upload failed', 'error')
            }
        } catch (err) {
            console.error('Upload error', err)
            showToast('Upload failed', 'error')
        } finally {
            setSaving(false)
        }
    }

    // Banner upload state and handlers
    const [bannerFile, setBannerFile] = useState<File | null>(null)
    const [bannerPreview, setBannerPreview] = useState<string | null>(null)
    const [uploadingBanner, setUploadingBanner] = useState(false)

    useEffect(() => {
        return () => {
            if (bannerPreview) {
                try { URL.revokeObjectURL(bannerPreview) } catch { }
            }
        }
    }, [bannerPreview])

    const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null
        setBannerFile(f)
        if (f) setBannerPreview(URL.createObjectURL(f))
    }

    const uploadAndSaveBanner = async () => {
        if (!bannerFile) return showToast('Select a banner file first', 'error')
        setUploadingBanner(true)
        try {
            const fd = new FormData()
            fd.append('file', bannerFile)
            fd.append('type', 'banner')

            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            if (!res.ok) throw new Error('Failed to upload banner')
            const data = await res.json()

            // save via existing update flow
            await handleUpdate({ bannerImage: data.url })
            setBannerFile(null)
            setBannerPreview(null)
        } catch (err) {
            console.error(err)
            showToast(err instanceof Error ? err.message : 'Failed to upload banner', 'error')
        } finally {
            setUploadingBanner(false)
        }
    }

    const toggleGenre = (id: string) => {
        setForm(prev => ({
            ...prev,
            genreIds: prev.genreIds.includes(id) ? prev.genreIds.filter(g => g !== id) : [...prev.genreIds, id],
        }))
    }

    const toggleAuthor = (id: string) => {
        setForm(prev => ({
            ...prev,
            authorIds: prev.authorIds.includes(id) ? prev.authorIds.filter(a => a !== id) : [...prev.authorIds, id],
        }))
    }

    const toggleArtist = (id: string) => {
        setForm(prev => ({
            ...prev,
            artistIds: prev.artistIds.includes(id) ? prev.artistIds.filter(a => a !== id) : [...prev.artistIds, id],
        }))
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this series? This cannot be undone.')) return
        try {
            const res = await fetch(`/api/admin/webtoons?webtoonId=${id}`, { method: 'DELETE' })
            if (res.ok) {
                router.push('/admin/webtoons')
            } else {
                const err = await res.json().catch(() => ({}))
                showToast(err.error || 'Failed to delete', 'error')
            }
        } catch (err) {
            console.error('Delete error', err)
            showToast('Failed to delete', 'error')
        }
    }

    const handleChapterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploadingChapter(true)
        const uploadedUrls: string[] = []

        for (const file of Array.from(files)) {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', 'chapter')
            // include webtoonId so server can validate chapter uploads against this webtoon
            if (id) formData.append('webtoonId', id)

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                })

                if (response.ok) {
                    const data = await response.json()
                    uploadedUrls.push(data.url)
                }
            } catch (error) {
                console.error('Upload error:', error)
            }
        }

        setNewChapter((prev: any) => ({
            ...prev,
            content: [...prev.content, ...uploadedUrls],
        }))
        setUploadingChapter(false)
    }

    const handleEditChapterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploadingChapter(true)
        const uploadedUrls: string[] = []

        for (const file of Array.from(files)) {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', 'chapter')
            // include webtoonId so server can validate chapter uploads against this webtoon
            if (id) formData.append('webtoonId', id)

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                })

                if (response.ok) {
                    const data = await response.json()
                    uploadedUrls.push(data.url)
                }
            } catch (error) {
                console.error('Upload error:', error)
            }
        }

        setEditingChapter((prev: any) => ({
            ...prev,
            content: [...(prev.content || []), ...uploadedUrls],
        }))
        setUploadingChapter(false)
    }

    const handleCreateChapter = async () => {
        if (!newChapter.number) {
            showToast('Please fill in chapter number', 'error')
            return
        }

        try {
            // When in markdown mode, send the markdown as the chapter "content" so the reader will render it as text.
            const payload = {
                webtoonId: id,
                number: typeof newChapter.number === 'string' ? parseInt(newChapter.number) : newChapter.number,
                title: newChapter.title,
                // If editorMode is markdown, place the markdown string into `content` (Chapter.content is JSON column,
                // but the reader treats string content as markdown). Otherwise send the array of image URLs.
                content: editorMode === 'markdown' ? (newChapter.markdown || '') : (newChapter.content || []),
            }

            const response = await fetch('/api/admin/chapters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (response.ok) {
                setShowChapterModal(false)
                setNewChapter({ number: '', title: '', content: [], markdown: '' })
                fetchChapters()
            } else {
                const error = await response.json()
                showToast(error.error || 'Failed to create chapter', 'error')
            }
        } catch (error) {
            console.error('Error creating chapter:', error)
            showToast('Failed to create chapter', 'error')
        }
    }

    const handleDeleteChapter = async (chapterId: string) => {
        if (!confirm('Are you sure you want to delete this chapter?')) return

        try {
            const response = await fetch(`/api/admin/chapters?chapterId=${chapterId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                fetchChapters()
            }
        } catch (error) {
            console.error('Error deleting chapter:', error)
        }
    }

    const openEditModal = (chapter: any) => {
        setEditingChapterId(chapter.id)
        // Pre-fill editing state with available chapter data
        setEditingChapter({
            number: chapter.number?.toString?.() ?? chapter.number ?? '',
            title: chapter.title ?? '',
            content: chapter.content ?? [],
            markdown: chapter.markdown ?? '',
        })
    }

    const handleSaveEditedChapter = async () => {
        if (!editingChapterId) return
        if (!editingChapter.number) { showToast('Please fill in chapter number', 'error'); return }

        try {
            const payload: any = {
                chapterId: editingChapterId,
                number: typeof editingChapter.number === 'string' ? parseInt(editingChapter.number) : editingChapter.number,
                title: editingChapter.title,
                content: editingChapter.content,
                markdown: editingChapter.markdown,
            }

            const res = await fetch('/api/admin/chapters', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                setEditingChapterId(null)
                setEditingChapter({ number: '', title: '', content: [], markdown: '' })
                fetchChapters()
            } else {
                const err = await res.json().catch(() => ({}))
                showToast(err.error || 'Failed to update chapter', 'error')
            }
        } catch (err) {
            console.error('Error updating chapter', err)
            showToast('Failed to update chapter', 'error')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-white/60">Loading...</div>
            </div>
        )
    }

    if (!webtoon) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-white/60">Webtoon not found</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toasts */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(t => (
                    <div key={t.id} className={`px-4 py-2 rounded shadow ${t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                        {t.message}
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/admin/webtoons')}
                        className="text-white hover:bg-white/10"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-3xl font-bold text-white">{webtoon.title}</h1>
                </div>
                <Button
                    onClick={() => setShowChapterModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Chapter
                </Button>
                <Button
                    variant="outline"
                    onClick={async () => {
                        // open claim modal and fetch groups
                        setShowClaimModal(true)
                        try {
                            const res = await fetch('/api/groups')
                            if (res.ok) {
                                const data = await res.json()
                                setGroupsForClaim(data.groups || [])
                            }
                        } catch (e) {
                            console.error('Failed to load groups for claim', e)
                            showToast('Failed to load groups', 'error')
                        }
                    }}
                    className="ml-2 text-white border-white/20 hover:bg-white/5"
                >
                    Claim to Group
                </Button>
            </div>

            {/* Webtoon Info */}
            <Card className="bg-[#0f0b14] border-white/10 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Series Information</h2>
                <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="title" className="text-white">Series Title</Label>
                            <Input
                                id="title"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="mt-2 bg-white/5 border-white/10 text-white"
                            />
                        </div>
                        <div>
                            <Label htmlFor="slug" className="text-white">Slug</Label>
                            <Input
                                id="slug"
                                value={form.slug}
                                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                className="mt-2 bg-white/5 border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="description" className="text-white">Synopsis</Label>
                        <textarea
                            id="description"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label className="text-white/60 text-sm">Status</Label>
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                className="w-full mt-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                            >
                                <option value="ongoing">Em Andamento</option>
                                <option value="completed">Concluído</option>
                                <option value="hiatus">Hiato</option>
                                <option value="cancelled">Cancelado</option>
                            </select>
                        </div>

                        <div>
                            <Label className="text-white/60 text-sm">Views</Label>
                            <p className="text-white text-2xl mt-2">{(webtoon.views ?? 0).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Cover image */}
                    <div>
                        <Label className="text-white">Imagem de Capa</Label>
                        <div className="border-2 border-dashed border-white/10 rounded-lg p-6 mt-2">
                            {form.coverImage ? (
                                <div className="relative">
                                    <img src={form.coverImage} alt="Cover" className="w-48 h-64 object-cover rounded-lg" />
                                    <div className="mt-3 flex gap-2">
                                        <label className="cursor-pointer px-4 py-2 bg-white/5 rounded text-white">
                                            Alterar
                                            <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                                        </label>
                                        <Button variant="ghost" onClick={() => setForm({ ...form, coverImage: '' })} className="text-white hover:bg-white/10">Remover</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <label className="cursor-pointer px-4 py-2 bg-white/5 rounded text-purple-400">
                                        Fazer upload da capa
                                        <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Banner image */}
                    <div>
                        <Label className="text-white">Banner (16:9) - usado como background público</Label>
                        <div className="border-2 border-dashed border-white/10 rounded-lg p-6 mt-2">
                            {form.bannerImage || bannerPreview ? (
                                <div className="relative">
                                    <img src={bannerPreview || form.bannerImage} alt="Banner" className="w-full max-h-44 object-cover rounded-lg" />
                                    <div className="mt-3 flex gap-2">
                                        <label className="cursor-pointer px-4 py-2 bg-white/5 rounded text-white">
                                            Alterar
                                            <input type="file" accept="image/*" onChange={handleBannerFileChange} className="hidden" />
                                        </label>
                                        <Button variant="ghost" onClick={async () => { if (!confirm('Remove banner?')) return; await handleUpdate({ bannerImage: null }); showToast('Banner removido', 'success') }} className="text-white hover:bg-white/10">Remover</Button>
                                        <Button onClick={uploadAndSaveBanner} disabled={!bannerFile || uploadingBanner} className="bg-purple-600 hover:bg-purple-700 text-white">{uploadingBanner ? 'Enviando...' : 'Upload & Salvar'}</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Upload className="h-12 w-12 text-white/40 mx-auto mb-4" />
                                    <label className="cursor-pointer">
                                        <span className="text-purple-400 hover:text-purple-300">Escolher banner</span>
                                        <input type="file" accept="image/*" onChange={handleBannerFileChange} className="hidden" />
                                    </label>
                                    <p className="text-white/40 text-sm mt-2">PNG, JPG up to 10MB (recommended 16:9)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Genres */}
                    <div>
                        <Label className="text-white">Gêneros</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {genres.map((g) => (
                                <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => toggleGenre(g.id)}
                                    className={`px-3 py-1 rounded ${form.genreIds.includes(g.id) ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                                >
                                    {g.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Credits */}
                    <div>
                        <Label className="text-white">Créditos</Label>
                        <div className="mt-2">
                            <div className="text-white/60 text-sm mb-2">Autores</div>
                            <div className="flex flex-wrap gap-2">
                                {authorsList.map((a) => (
                                    <button
                                        key={a.id}
                                        type="button"
                                        onClick={() => toggleAuthor(a.id)}
                                        className={`px-3 py-1 rounded ${form.authorIds.includes(a.id) ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                                    >
                                        {a.name}
                                    </button>
                                ))}
                            </div>

                            <div className="text-white/60 text-sm mt-4 mb-2">Artistas</div>
                            <div className="flex flex-wrap gap-2">
                                {authorsList.map((a) => (
                                    <button
                                        key={`artist-${a.id}`}
                                        type="button"
                                        onClick={() => toggleArtist(a.id)}
                                        className={`px-3 py-1 rounded ${form.artistIds.includes(a.id) ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                                    >
                                        {a.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <Button variant="ghost" onClick={() => router.push('/admin/webtoons')} className="text-white hover:bg-white/15">Cancelar</Button>
                        <Button onClick={handleDelete} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">Excluir</Button>
                        <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">{saving ? 'Salvando...' : 'Salvar Alterações'}</Button>
                    </div>
                </div>
            </Card>

            {/* Chapters List */}
            <Card className="bg-[#0f0b14] border-white/10">
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-white">Capítulos</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Capítulo</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Título</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Visualizações</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Publicado</th>
                                <th className="px-6 py-4 text-right text-sm font-medium text-white/60">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {chapters.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-white/40">
                                        Nenhum capítulo ainda. Adicione seu primeiro capítulo!
                                    </td>
                                </tr>
                            ) : (
                                chapters.map((chapter) => (
                                    <tr key={chapter.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="px-6 py-4 text-white">Capítulo {chapter.number}</td>
                                        <td className="px-6 py-4 text-white">{chapter.title}</td>
                                        <td className="px-6 py-4 text-white/60">{(chapter.views ?? 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-white/60">
                                            {new Date(chapter.publishedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditModal(chapter)}
                                                    className="text-white hover:bg-white/10"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteChapter(chapter.id)}
                                                    className="text-white hover:bg-white/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Add Chapter Modal */}
            {showChapterModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="bg-[#0f0b14] border-white/10 w-full max-w-2xl p-6">
                        <h2 className="text-2xl font-bold text-white mb-6">Adicionar Novo Capítulo</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="chapterNumber" className="text-white">Número do Capítulo</Label>
                                    <Input
                                        id="chapterNumber"
                                        type="number"
                                        value={newChapter.number}
                                        onChange={(e) => setNewChapter({ ...newChapter, number: e.target.value })}
                                        className="bg-white/5 border-white/10 text-white mt-2"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="chapterTitle" className="text-white">Título do Capítulo</Label>
                                    <Input
                                        id="chapterTitle"
                                        value={newChapter.title}
                                        onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                                        className="bg-white/5 border-white/10 text-white mt-2"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="text-white">Content</Label>
                                <div className="mt-2">
                                    <div className="flex gap-2 mb-3">
                                        <button type="button" onClick={() => setEditorMode('images')} className={`px-3 py-1 rounded ${editorMode === 'images' ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60'}`}>Images</button>
                                        <button type="button" onClick={() => setEditorMode('markdown')} className={`px-3 py-1 rounded ${editorMode === 'markdown' ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60'}`}>Markdown</button>
                                    </div>

                                    {editorMode === 'images' ? (
                                        <div className="border-2 border-dashed border-white/10 rounded-lg p-6">
                                            <div className="text-center">
                                                <Upload className="h-12 w-12 text-white/40 mx-auto mb-4" />
                                                <label className="cursor-pointer">
                                                    <span className="text-purple-400 hover:text-purple-300">
                                                        {uploadingChapter ? 'Enviando...' : 'Fazer upload das páginas do capítulo'}
                                                    </span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        onChange={handleChapterUpload}
                                                        disabled={uploadingChapter}
                                                        className="hidden"
                                                    />
                                                </label>
                                                <p className="text-white/40 text-sm mt-2">
                                                    {newChapter.content.length} páginas enviadas
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-white/10 rounded-lg p-4">
                                            {/* Lazy load editor to avoid SSR issues */}
                                            <React.Suspense fallback={<div className="text-white/60">Loading editor...</div>}>
                                                {/* Dynamically import component to avoid SSR errors */}
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <DynamicMarkdownEditor value={newChapter.markdown} onChange={(v: string) => setNewChapter((prev: any) => ({ ...prev, markdown: v }))} placeholder="Write chapter content in Markdown..." />
                                            </React.Suspense>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 justify-end pt-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setShowChapterModal(false)
                                        setNewChapter({ number: '', title: '', content: [], markdown: '' })
                                    }}
                                    className="text-white hover:bg-white/10"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleCreateChapter}
                                    disabled={uploadingChapter}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    Criar Capítulo
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
            {/* Edit Chapter Modal */}
            {editingChapterId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="bg-[#0f0b14] border-white/10 w-full max-w-2xl p-6">
                        <h2 className="text-2xl font-bold text-white mb-6">Editar Capítulo</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="editChapterNumber" className="text-white">Número do Capítulo</Label>
                                    <Input
                                        id="editChapterNumber"
                                        type="number"
                                        value={editingChapter.number}
                                        onChange={(e) => setEditingChapter({ ...editingChapter, number: e.target.value })}
                                        className="bg-white/5 border-white/10 text-white mt-2"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="editChapterTitle" className="text-white">Título do Capítulo</Label>
                                    <Input
                                        id="editChapterTitle"
                                        value={editingChapter.title}
                                        onChange={(e) => setEditingChapter({ ...editingChapter, title: e.target.value })}
                                        className="bg-white/5 border-white/10 text-white mt-2"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="text-white">Content</Label>
                                <div className="mt-2">
                                    <div className="flex gap-2 mb-3">
                                        <button type="button" onClick={() => setEditorMode('images')} className={`px-3 py-1 rounded ${editorMode === 'images' ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60'}`}>Images</button>
                                        <button type="button" onClick={() => setEditorMode('markdown')} className={`px-3 py-1 rounded ${editorMode === 'markdown' ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60'}`}>Markdown</button>
                                    </div>

                                    {editorMode === 'images' ? (
                                        <div className="border-2 border-dashed border-white/10 rounded-lg p-6">
                                            <div className="text-center">
                                                <Upload className="h-12 w-12 text-white/40 mx-auto mb-4" />
                                                <label className="cursor-pointer">
                                                    <span className="text-purple-400 hover:text-purple-300">
                                                        {uploadingChapter ? 'Enviando...' : 'Fazer upload das páginas do capítulo'}
                                                    </span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        onChange={handleEditChapterUpload}
                                                        disabled={uploadingChapter}
                                                        className="hidden"
                                                    />
                                                </label>
                                                <p className="text-white/40 text-sm mt-2">
                                                    {editingChapter.content?.length ?? 0} páginas enviadas
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-white/10 rounded-lg p-4">
                                            <React.Suspense fallback={<div className="text-white/60">Loading editor...</div>}>
                                                <DynamicMarkdownEditor value={editingChapter.markdown} onChange={(v: string) => setEditingChapter((prev: any) => ({ ...prev, markdown: v }))} placeholder="Write chapter content in Markdown..." />
                                            </React.Suspense>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 justify-end pt-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setEditingChapterId(null)
                                        setEditingChapter({ number: '', title: '', content: [], markdown: '' })
                                    }}
                                    className="text-white hover:bg-white/10"
                                >
                                    Cancelar
                                </Button>
                                <Button onClick={handleSaveEditedChapter} className="bg-purple-600 hover:bg-purple-700 text-white">Salvar Alterações</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
            {/* Claim Modal */}
            {showClaimModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="bg-[#0f0b14] border-white/10 w-full max-w-md p-6">
                        <h2 className="text-2xl font-bold text-white mb-4">Claim Webtoon to Group</h2>
                        <p className="text-white/60 mb-4">Pick the group that should claim/manage this webtoon. Only group leaders or users with permissions can perform this action.</p>
                        <div className="space-y-4">
                            <div>
                                <Label className="text-white">Select Group</Label>
                                <select value={selectedGroupId || ''} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full mt-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                                    <option value="">-- Select a group --</option>
                                    {groupsForClaim.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-4 justify-end pt-2">
                                <Button variant="ghost" onClick={() => { setShowClaimModal(false); setSelectedGroupId(null) }} className="text-white hover:bg-white/10">Cancel</Button>
                                <Button onClick={async () => {
                                    if (!selectedGroupId) { showToast('Select a group first', 'error'); return }
                                    setClaiming(true)
                                    try {
                                        const res = await fetch('/api/admin/webtoons/claim', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ webtoonId: id, groupId: selectedGroupId }),
                                        })
                                        if (res.ok) {
                                            const data = await res.json()
                                            showToast('Webtoon claimed successfully', 'success')
                                            setShowClaimModal(false)
                                            setSelectedGroupId(null)
                                            fetchWebtoon()
                                        } else {
                                            const err = await res.json().catch(() => ({}))
                                            showToast(err.error || 'Failed to claim webtoon', 'error')
                                        }
                                    } catch (err) {
                                        console.error('Claim error', err)
                                        showToast('Failed to claim webtoon', 'error')
                                    } finally {
                                        setClaiming(false)
                                    }
                                }} className="bg-purple-600 hover:bg-purple-700 text-white">{claiming ? 'Claiming...' : 'Claim'}</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
