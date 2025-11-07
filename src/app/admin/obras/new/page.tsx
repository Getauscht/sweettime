'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Upload, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { AuthorSelector } from '@/components/AuthorSelector'

interface Genre {
    id: string
    name: string
}

interface Author {
    id: string
    name: string
}

function CreateObraForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast, ToastContainer } = useToast()
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [genres, setGenres] = useState<Genre[]>([])
    const [authors, setAuthors] = useState<Author[]>([])
    const [workType, setWorkType] = useState<'webtoon' | 'novel'>(
        (searchParams.get('type') as 'webtoon' | 'novel') || 'webtoon'
    )

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        authorIds: [] as string[],
        artistIds: [] as string[],
        genreIds: [] as string[],
        coverImage: '',
        bannerImage: '',
        status: 'ongoing',
    })

    useEffect(() => {
        fetchGenres()
        fetchAuthors()
    }, [])

    const fetchGenres = async () => {
        try {
            const response = await fetch('/api/admin/genres')
            if (response.ok) {
                const data = await response.json()
                setGenres(data.genres || [])
            }
        } catch (error) {
            console.error('Error fetching genres:', error)
        }
    }

    const fetchAuthors = async () => {
        try {
            const response = await fetch('/api/admin/authors', { credentials: 'include' })
            if (response.ok) {
                const data = await response.json()
                setAuthors(data.authors || [])
            }
        } catch (error) {
            console.error('Error fetching authors:', error)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formDataUpload = new FormData()
        formDataUpload.append('file', file)
        formDataUpload.append('type', 'cover')

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formDataUpload,
                credentials: 'include'
            })

            if (response.ok) {
                const data = await response.json()
                setFormData(prev => ({ ...prev, coverImage: data.url }))
                toast('Imagem de capa enviada com sucesso', 'success')
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

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formDataUpload = new FormData()
        formDataUpload.append('file', file)
        formDataUpload.append('type', 'banner')

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formDataUpload,
                credentials: 'include'
            })

            if (response.ok) {
                const data = await response.json()
                setFormData(prev => ({ ...prev, bannerImage: data.url }))
                toast('Banner enviado com sucesso', 'success')
            } else {
                toast('Falha ao enviar banner', 'error')
            }
        } catch (error) {
            console.error('Upload error:', error)
            toast('Falha ao enviar banner', 'error')
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (formData.authorIds.length === 0) {
                toast('Selecione pelo menos um autor', 'error')
                setLoading(false)
                return
            }

            const payload = {
                type: workType,
                title: formData.title,
                description: formData.description || undefined,
                authorIds: formData.authorIds,
                artistIds: formData.artistIds.length > 0 ? formData.artistIds : undefined,
                genreIds: formData.genreIds && formData.genreIds.length > 0 ? formData.genreIds : undefined,
                coverImage: formData.coverImage || undefined,
                bannerImage: formData.bannerImage || undefined,
                status: formData.status || undefined,
            }

            const response = await fetch('/api/admin/obras', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                credentials: 'include'
            })

            if (response.ok) {
                const data = await response.json()
                toast(`${workType === 'webtoon' ? 'Webtoon' : 'Novel'} criado com sucesso!`, 'success')
                setTimeout(() => {
                    router.push('/admin/obras')
                }, 1500)
            } else {
                const errorData = await response.json()
                toast(errorData.error || 'Falha ao criar obra', 'error')
            }
        } catch (error) {
            console.error('Error creating work:', error)
            toast('Falha ao criar obra', 'error')
        } finally {
            setLoading(false)
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
                        Criar Nova {workType === 'webtoon' ? 'Webtoon' : 'Novel'}
                    </h1>
                    <p className="text-white/60 mt-2">
                        Preencha os detalhes da obra
                    </p>
                </div>
            </div>

            <Card className="bg-[#0f0b14] border-white/10 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Tipo de Obra */}
                    <div className="space-y-2">
                        <Label className="text-white">Tipo de Obra</Label>
                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant={workType === 'webtoon' ? 'default' : 'outline'}
                                onClick={() => setWorkType('webtoon')}
                                className={workType === 'webtoon' ? 'bg-purple-600' : 'border-white/10 text-white hover:bg-white/10'}
                            >
                                Webtoon
                            </Button>
                            <Button
                                type="button"
                                variant={workType === 'novel' ? 'default' : 'outline'}
                                onClick={() => setWorkType('novel')}
                                className={workType === 'novel' ? 'bg-blue-600' : 'border-white/10 text-white hover:bg-white/10'}
                            >
                                Novel
                            </Button>
                        </div>
                    </div>

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
                        <div className="flex items-center gap-4">
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="bg-[#1a1625] border-white/10 text-white file:text-white file:bg-white/5 file:border-white/10"
                                disabled={uploading}
                            />
                            {formData.coverImage && (
                                <div className="relative w-20 h-28 rounded overflow-hidden">
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
                        <div className="flex items-center gap-4">
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleBannerUpload}
                                className="bg-[#1a1625] border-white/10 text-white file:text-white file:bg-white/5 file:border-white/10"
                                disabled={uploading}
                            />
                            {formData.bannerImage && (
                                <div className="relative w-32 h-16 rounded overflow-hidden">
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
                            disabled={loading || uploading}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {loading ? 'Criando...' : 'Criar Obra'}
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

            <ToastContainer />
        </div>
    )
}

export default function CreateObraPage() {
    return (
        <Suspense fallback={<div className="text-white">Carregando...</div>}>
            <CreateObraForm />
        </Suspense>
    )
}
