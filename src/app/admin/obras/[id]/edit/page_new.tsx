'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Save, Plus, Edit, Trash2, FileText, BookOpen } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { AuthorSelector } from '@/components/AuthorSelector'

interface Chapter {
    id: string
    number: number
    title: string
    createdAt: string
}

function EditObraForm() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const { toast, ToastContainer } = useToast()
    const id = params?.id as string | undefined
    const typeParam = searchParams?.get('type') as 'webtoon' | 'novel' | null

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [workType, setWorkType] = useState<'webtoon' | 'novel'>(typeParam || 'webtoon')
    const [genres, setGenres] = useState<{ id: string; name: string }[]>([])
    const [activeTab, setActiveTab] = useState<'info' | 'chapters'>('info')
    const [chapters, setChapters] = useState<Chapter[]>([])
    const [loadingChapters, setLoadingChapters] = useState(false)

    const [formData, setFormData] = useState({
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

    useEffect(() => {
        if (!id) return
        fetchWork()
        fetchGenres()
    }, [id])

    useEffect(() => {
        if (activeTab === 'chapters' && id) {
            fetchChapters()
        }
    }, [activeTab, id])

    const fetchWork = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/admin/obras?id=${id}`)
            if (response.ok) {
                const data = await response.json()
                const work = data.work
                
                setWorkType(data.type || work.type || 'webtoon')
                setFormData({
                    title: work.title || '',
                    slug: work.slug || '',
                    description: work.description || '',
                    coverImage: work.coverImage || '',
                    bannerImage: work.bannerImage || '',
                    status: work.status || 'ongoing',
                    genreIds: (work.genres || []).map((g: any) => g.id),
                    authorIds: (work.authors || []).map((a: any) => a.id),
                    artistIds: (work.artists || []).map((a: any) => a.id),
                })
            } else {
                toast('Obra não encontrada', 'error')
                router.push('/admin/obras')
            }
        } catch (error) {
            console.error('Error fetching work:', error)
            toast('Erro ao carregar obra', 'error')
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

    const fetchChapters = async () => {
        setLoadingChapters(true)
        try {
            const apiPath = workType === 'webtoon' 
                ? `/api/webtoons/${id}/chapters` 
                : `/api/novels/${id}/chapters`
            
            const res = await fetch(apiPath)
            if (res.ok) {
                const data = await res.json()
                setChapters(data.chapters || [])
            }
        } catch (err) {
            console.error('Error fetching chapters', err)
        } finally {
            setLoadingChapters(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'banner') => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formDataUpload = new FormData()
        formDataUpload.append('file', file)
        formDataUpload.append('type', type)

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formDataUpload,
            })

            if (response.ok) {
                const data = await response.json()
                if (type === 'cover') {
                    setFormData(prev => ({ ...prev, coverImage: data.url }))
                    toast('Capa atualizada', 'success')
                } else {
                    setFormData(prev => ({ ...prev, bannerImage: data.url }))
                    toast('Banner atualizado', 'success')
                }
            } else {
                toast('Falha ao enviar imagem', 'error')
            }
        } catch (error) {
            console.error('Upload error:', error)
            toast('Falha ao enviar imagem', 'error')
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const apiPath = workType === 'webtoon' ? '/api/admin/webtoons' : '/api/admin/novels'
            const idField = workType === 'webtoon' ? 'webtoonId' : 'novelId'

            const payload = {
                [idField]: id,
                title: formData.title,
                slug: formData.slug,
                description: formData.description,
                coverImage: formData.coverImage,
                bannerImage: formData.bannerImage,
                status: formData.status,
                genreIds: formData.genreIds,
                authorIds: formData.authorIds,
                artistIds: formData.artistIds,
            }

            const response = await fetch(apiPath, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            if (response.ok) {
                toast('Obra atualizada com sucesso!', 'success')
                setTimeout(() => {
                    router.push('/admin/obras')
                }, 1500)
            } else {
                const errorData = await response.json()
                toast(errorData.error || 'Falha ao atualizar obra', 'error')
            }
        } catch (error) {
            console.error('Error updating work:', error)
            toast('Falha ao atualizar obra', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleGenreToggle = (genreId: string) => {
        setFormData(prev => ({
            ...prev,
            genreIds: prev.genreIds.includes(genreId)
                ? prev.genreIds.filter(id => id !== genreId)
                : [...prev.genreIds, genreId]
        }))
    }

    const handleDeleteChapter = async (chapterId: string) => {
        if (!confirm('Tem certeza que deseja excluir este capítulo?')) return

        try {
            const apiPath = workType === 'webtoon' 
                ? `/api/admin/webtoons/${id}/chapters/${chapterId}` 
                : `/api/admin/novels/${id}/chapters/${chapterId}`

            const res = await fetch(apiPath, { method: 'DELETE' })
            if (res.ok) {
                toast('Capítulo excluído', 'success')
                fetchChapters()
            } else {
                toast('Erro ao excluir capítulo', 'error')
            }
        } catch (err) {
            console.error('Error deleting chapter', err)
            toast('Erro ao excluir capítulo', 'error')
        }
    }

    const handleNewChapter = () => {
        const basePath = workType === 'webtoon' ? `/painel/webtoons/${id}` : `/painel/novels/${id}`
        router.push(`${basePath}/chapters/new`)
    }

    const handleEditChapter = (chapterId: string) => {
        const basePath = workType === 'webtoon' ? `/painel/webtoons/${id}` : `/painel/novels/${id}`
        router.push(`${basePath}/chapters/${chapterId}/edit`)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-white text-xl">Carregando obra...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/admin/obras')}
                    className="text-white hover:bg-white/10"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        Editar {workType === 'webtoon' ? 'Webtoon' : 'Novel'}
                    </h1>
                    <p className="text-white/60 mt-2">{formData.title}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('info')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'info'
                            ? 'text-purple-400 border-b-2 border-purple-400'
                            : 'text-white/60 hover:text-white'
                        }`}
                >
                    <FileText className="inline h-4 w-4 mr-2" />
                    Informações
                </button>
                <button
                    onClick={() => setActiveTab('chapters')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'chapters'
                            ? 'text-purple-400 border-b-2 border-purple-400'
                            : 'text-white/60 hover:text-white'
                        }`}
                >
                    <BookOpen className="inline h-4 w-4 mr-2" />
                    Capítulos
                </button>
            </div>

            {/* Tab Content: Informações */}
            {activeTab === 'info' && (
                <Card className="bg-[#0f0b14] border-white/10 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Título */}
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-white">Título *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                className="bg-[#1a1625] border-white/10 text-white"
                                required
                            />
                        </div>

                        {/* Slug */}
                        <div className="space-y-2">
                            <Label htmlFor="slug" className="text-white">Slug</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                className="bg-[#1a1625] border-white/10 text-white"
                            />
                        </div>

                        {/* Descrição */}
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-white">Descrição</Label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full min-h-[120px] px-3 py-2 bg-[#1a1625] border border-white/10 rounded-md text-white resize-none"
                                placeholder="Descreva a obra..."
                            />
                        </div>

                        {/* Autor */}
                        <AuthorSelector
                            label="Autor(es)"
                            selectedIds={formData.authorIds}
                            onChange={(ids) => setFormData(prev => ({ ...prev, authorIds: ids }))}
                            multiple={true}
                            required={true}
                        />

                        {/* Artista */}
                        <AuthorSelector
                            label="Artista(s)"
                            selectedIds={formData.artistIds}
                            onChange={(ids) => setFormData(prev => ({ ...prev, artistIds: ids }))}
                            multiple={true}
                            required={false}
                        />

                        {/* Gêneros */}
                        <div className="space-y-2">
                            <Label className="text-white">Gêneros</Label>
                            <div className="flex flex-wrap gap-2">
                                {genres.map(genre => (
                                    <Button
                                        key={genre.id}
                                        type="button"
                                        variant={formData.genreIds.includes(genre.id) ? 'default' : 'ghost'}
                                        onClick={() => handleGenreToggle(genre.id)}
                                        className={formData.genreIds.includes(genre.id)
                                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                            : 'border-white/10 text-white hover:bg-purple-600 hover:text-white'
                                        }
                                        size="sm"
                                    >
                                        {genre.name}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-white">Status</Label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full px-3 py-2 bg-[#1a1625] border border-white/10 rounded-md text-white"
                            >
                                <option value="ongoing">Em Andamento</option>
                                <option value="completed">Completo</option>
                                <option value="hiatus">Em Pausa</option>
                                <option value="cancelled">Cancelado</option>
                            </select>
                        </div>

                        {/* Cover Image */}
                        <div className="space-y-2">
                            <Label className="text-white">Imagem de Capa</Label>
                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, 'cover')}
                                        className="bg-[#1a1625] border-white/10 text-white file:text-white file:bg-white/5 file:border-white/10"
                                        disabled={uploading}
                                    />
                                </div>
                                {formData.coverImage && (
                                    <div className="relative w-20 h-28 rounded overflow-hidden border border-white/10">
                                        <img
                                            src={formData.coverImage}
                                            alt="Cover preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Banner Image */}
                        <div className="space-y-2">
                            <Label className="text-white">Banner</Label>
                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, 'banner')}
                                        className="bg-[#1a1625] border-white/10 text-white file:text-white file:bg-white/5 file:border-white/10"
                                        disabled={uploading}
                                    />
                                </div>
                                {formData.bannerImage && (
                                    <div className="relative w-32 h-16 rounded overflow-hidden border border-white/10">
                                        <img
                                            src={formData.bannerImage}
                                            alt="Banner preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-4">
                            <Button
                                type="submit"
                                disabled={saving || uploading}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => router.push('/admin/obras')}
                                className="text-white hover:bg-white/10"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Tab Content: Capítulos */}
            {activeTab === 'chapters' && (
                <Card className="bg-[#0f0b14] border-white/10 p-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">
                                Capítulos ({chapters.length})
                            </h2>
                            <Button
                                onClick={handleNewChapter}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Capítulo
                            </Button>
                        </div>

                        {loadingChapters ? (
                            <div className="text-white/60 text-center py-8">Carregando capítulos...</div>
                        ) : chapters.length === 0 ? (
                            <div className="text-white/60 text-center py-8">
                                Nenhum capítulo cadastrado
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {chapters.map(chapter => (
                                    <div
                                        key={chapter.id}
                                        className="flex items-center justify-between p-4 bg-[#1a1625] border border-white/10 rounded-md"
                                    >
                                        <div>
                                            <p className="text-white font-medium">
                                                Cap. {chapter.number} - {chapter.title}
                                            </p>
                                            <p className="text-white/60 text-sm">
                                                {new Date(chapter.createdAt).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleEditChapter(chapter.id)}
                                                className="text-white hover:bg-white/10"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteChapter(chapter.id)}
                                                className="text-red-400 hover:bg-red-400/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            <ToastContainer />
        </div>
    )
}

export default function EditObraPage() {
    return (
        <Suspense fallback={<div className="text-white">Carregando...</div>}>
            <EditObraForm />
        </Suspense>
    )
}
