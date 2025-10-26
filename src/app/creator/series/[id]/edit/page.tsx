'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { ArrowLeft, Plus, Edit, Trash2, Upload } from 'lucide-react'
import { useToast } from '@/components/Toast'

interface Chapter {
    id: string
    number: number
    title: string
    content: string[]
    publishedAt: Date | null
    createdAt: Date
}

interface Webtoon {
    id: string
    title: string
    slug: string
    description: string
    coverImage: string | null
    status: string
    authorId: string
    genres: { id: string; name: string }[]
    chapters: Chapter[]
}

export default function EditSeriesPage() {
    const router = useRouter()
    const params = useParams() as { id?: string } | null
    const webtoonId = params?.id
    const { toast, ToastContainer } = useToast()

    const [loading, setLoading] = useState(true)
    const [webtoon, setWebtoon] = useState<Webtoon | null>(null)
    const [chapters, setChapters] = useState<Chapter[]>([])
    const [showAddChapter, setShowAddChapter] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Chapter form state
    const [chapterForm, setChapterForm] = useState({
        number: 1,
        title: '',
        pages: [] as string[],
    })

    useEffect(() => {
        if (!webtoonId) {
            // No id in route params — show not found and stop loading
            setLoading(false)
            return
        }

        fetchWebtoon()
        fetchChapters()
    }, [webtoonId])

    const fetchWebtoon = async () => {
        try {
            const response = await fetch(`/api/admin/webtoons?id=${webtoonId}`)
            if (response.ok) {
                const data = await response.json()
                setWebtoon(data.webtoon)
            }
        } catch (error) {
            console.error('Error fetching webtoon:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchChapters = async () => {
        try {
            const response = await fetch(`/api/admin/chapters?webtoonId=${webtoonId}`)
            if (response.ok) {
                const data = await response.json()
                setChapters(data.chapters || [])

                // Set next chapter number
                if (data.chapters?.length > 0) {
                    const maxNumber = Math.max(...data.chapters.map((c: Chapter) => c.number))
                    setChapterForm(prev => ({ ...prev, number: maxNumber + 1 }))
                }
            }
        } catch (error) {
            console.error('Error fetching chapters:', error)
        }
    }

    const handleStatusChange = async (newStatus: string) => {
        try {
            const response = await fetch('/api/admin/webtoons', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: webtoonId,
                    status: newStatus,
                }),
            })

            if (response.ok) {
                setWebtoon(prev => prev ? { ...prev, status: newStatus } : null)
            }
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploading(true)
        const uploadedUrls: string[] = []

        try {
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData()
                formData.append('file', files[i])
                formData.append('type', 'chapter')

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                })

                if (response.ok) {
                    const data = await response.json()
                    uploadedUrls.push(data.url)
                }
            }

            setChapterForm(prev => ({
                ...prev,
                pages: [...prev.pages, ...uploadedUrls]
            }))
        } catch (error) {
            console.error('Upload error:', error)
            toast('Falha ao enviar imagens', 'error')
        } finally {
            setUploading(false)
        }
    }

    const handleAddChapter = async () => {
        if (chapterForm.pages.length === 0) {
            toast('Por favor, envie ao menos uma página', 'error')
            return
        }

        try {
            const response = await fetch('/api/admin/chapters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    webtoonId,
                    number: chapterForm.number,
                    title: chapterForm.title,
                    content: chapterForm.pages,
                }),
            })

            if (response.ok) {
                setShowAddChapter(false)
                setChapterForm({ number: chapterForm.number + 1, title: '', pages: [] })
                fetchChapters()
            } else {
                const error = await response.json()
                toast(error.error || 'Falha ao criar capítulo', 'error')
            }
        } catch (error) {
            console.error('Error creating chapter:', error)
            toast('Falha ao criar capítulo', 'error')
        }
    }

    const handleDeleteChapter = async (chapterId: string) => {
        if (!confirm('Tem certeza que deseja excluir este capítulo?')) return

        try {
            const response = await fetch('/api/admin/chapters', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: chapterId }),
            })

            if (response.ok) {
                fetchChapters()
            }
        } catch (error) {
            console.error('Error deleting chapter:', error)
            toast('Falha ao excluir capítulo', 'error')
        }
    }

    const removePage = (index: number) => {
        setChapterForm(prev => ({
            ...prev,
            pages: prev.pages.filter((_, i) => i !== index)
        }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-white">Carregando...</div>
            </div>
        )
    }

    if (!webtoon) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="text-white text-xl mb-4">Série não encontrada</div>
                <Button onClick={() => router.back()}>Voltar</Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/creator/series')}
                        className="text-white hover:bg-white/10"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar para Minhas Séries
                    </Button>
                </div>
            </div>

            <div className="flex items-start gap-6">
                {webtoon.coverImage && (
                    <img
                        src={webtoon.coverImage}
                        alt={webtoon.title}
                        className="w-48 h-64 object-cover rounded-lg"
                    />
                )}
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-white">{webtoon.title}</h1>
                    <p className="text-white/60 mt-2">{webtoon.description}</p>
                    <div className="flex items-center gap-4 mt-4">
                        <Label className="text-white">Status:</Label>
                        <select
                            value={webtoon.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                            <option value="draft">Rascunho</option>
                            <option value="ongoing">Em andamento</option>
                            <option value="completed">Concluído</option>
                            <option value="hiatus">Hiato</option>
                        </select>
                    </div>
                </div>
            </div>

            <Card className="bg-[#0f0b14] border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Capítulos</h2>
                    <Button
                        onClick={() => setShowAddChapter(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Capítulo
                    </Button>
                </div>

                {chapters.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-white/40 mb-4">Nenhum capítulo ainda</p>
                        <Button
                            onClick={() => setShowAddChapter(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            Adicione seu primeiro capítulo
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {chapters.map((chapter) => (
                            <div
                                key={chapter.id}
                                className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <div>
                                    <div className="text-white font-medium">
                                        Capítulo {chapter.number}: {chapter.title}
                                    </div>
                                    <div className="text-white/60 text-sm">
                                        {chapter.content.length} páginas
                                        {chapter.publishedAt && ` • Publicado em ${new Date(chapter.publishedAt).toLocaleDateString('pt-BR')}`}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white hover:bg-white/10"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteChapter(chapter.id)}
                                        className="text-red-400 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Add Chapter Modal */}
            {showAddChapter && (
                <Dialog open={showAddChapter} onOpenChange={setShowAddChapter}>
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <Card className="bg-[#0f0b14] border-white/10 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <h3 className="text-2xl font-bold text-white mb-6">Adicionar novo capítulo</h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-white">Número do capítulo</Label>
                                        <Input
                                            type="number"
                                            value={chapterForm.number}
                                            onChange={(e) => setChapterForm({ ...chapterForm, number: parseInt(e.target.value) })}
                                            className="bg-white/5 border-white/10 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-white">Título do capítulo</Label>
                                        <Input
                                            placeholder="ex.: O Início"
                                            value={chapterForm.title}
                                            onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                                            className="bg-white/5 border-white/10 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-white">Páginas do capítulo</Label>
                                    <div className="border-2 border-dashed border-white/10 rounded-lg p-6">
                                        <div className="text-center">
                                            <Upload className="h-12 w-12 text-white/40 mx-auto mb-4" />
                                            <label className="cursor-pointer">
                                                <span className="text-purple-400 hover:text-purple-300">
                                                    {uploading ? 'Enviando...' : 'Enviar páginas'}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={handleFileUpload}
                                                    disabled={uploading}
                                                    className="hidden"
                                                />
                                            </label>
                                            <p className="text-white/40 text-sm mt-2">Selecione múltiplas imagens na ordem de leitura</p>
                                        </div>
                                    </div>

                                    {chapterForm.pages.length > 0 && (
                                        <div className="grid grid-cols-4 gap-2 mt-4">
                                            {chapterForm.pages.map((page, index) => (
                                                <div key={index} className="relative group">
                                                    <img
                                                        src={page}
                                                        alt={`Página ${index + 1}`}
                                                        className="w-full h-32 object-cover rounded"
                                                    />
                                                    <button
                                                        onClick={() => removePage(index)}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                                        {index + 1}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 justify-end mt-6">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setShowAddChapter(false)
                                        setChapterForm(prev => ({ ...prev, title: '', pages: [] }))
                                    }}
                                    className="text-white hover:bg-white/10"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleAddChapter}
                                    disabled={uploading}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    Adicionar Capítulo
                                </Button>
                            </div>
                        </Card>
                    </div>
                </Dialog>
            )}
            <ToastContainer />
        </div>
    )
}
