'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Upload, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/Toast'

// Define interfaces for our data structures
interface Genre {
    id: string
    name: string
}

interface Author {
    id: string
    name: string
}

// A simple multi-select component for authors/artists
function MultiSelectAuthors({ title, allAuthors, selectedIds, onToggle }: {
    title: string,
    allAuthors: Author[],
    selectedIds: string[],
    onToggle: (id: string) => void
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedAuthors = allAuthors.filter(a => selectedIds.includes(a.id));

    return (
        <div className="space-y-2">
            <Label className="text-white">{title}</Label>
            <div className="relative">
                <div
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white flex flex-wrap gap-2 cursor-pointer min-h-[48px] items-center"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {selectedAuthors.length > 0
                        ? selectedAuthors.map(author => (
                            <span key={author.id} className="px-2 py-1 bg-purple-600/50 rounded-md text-sm">
                                {author.name}
                            </span>
                        ))
                        : <span className="text-white/40">Selecionar {title}</span>
                    }
                </div>
                {isOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-[#0f0b14] border border-white/10 rounded-lg max-h-60 overflow-y-auto">
                        {allAuthors.map(author => (
                            <div
                                key={author.id}
                                onClick={() => { onToggle(author.id); }}
                                className={`px-4 py-2 cursor-pointer hover:bg-white/10 ${selectedIds.includes(author.id) ? 'bg-white/5' : ''}`}
                            >
                                {author.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CreateSeriesPage() {
    const router = useRouter()
    const { toast, ToastContainer } = useToast()
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [genres, setGenres] = useState<Genre[]>([])
    const [allAuthors, setAllAuthors] = useState<Author[]>([])
    const [currentUserAuthor, setCurrentUserAuthor] = useState<Author | null>(null)

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        genreIds: [] as string[],
        authorIds: [] as string[],
        artistIds: [] as string[],
        coverImage: '',
        status: 'ongoing',
    })

    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Fetch genres, all authors, and current user's author info in parallel
            const [genresRes, authorsRes, currentUserAuthorRes] = await Promise.all([
                fetch('/api/admin/genres'),
                fetch('/api/authors'),
                fetch(`/api/creator/webtoons?time=${new Date().getTime()}`)
            ]);

            if (genresRes.ok) {
                const data = await genresRes.json();
                setGenres(data.genres || []);
            }

            if (authorsRes.ok) {
                const data = await authorsRes.json();
                setAllAuthors(data.authors || []);
            }

            if (currentUserAuthorRes.ok) {
                const data = await currentUserAuthorRes.json();
                setCurrentUserAuthor(data.author);
                // Default the author to the current user
                if (data.author) {
                    setFormData(prev => ({ ...prev, authorIds: [data.author.id] }));
                }
            } else {
                // Handle case where user might not have an author profile yet
                const errorData = await currentUserAuthorRes.json();
                const errorMessage = errorData.details || errorData.error || 'Please try again.';
                toast(`Falha ao verificar perfil de autor: ${errorMessage}`, 'error');
            }

        } catch (error) {
            console.error('Error fetching initial data:', error)
            toast('Ocorreu um erro ao carregar os dados da página de criação.', 'error')
        } finally {
            setLoading(false);
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const fd = new FormData()
        fd.append('file', file)
        fd.append('type', 'cover')

        try {
            const response = await fetch('/api/upload', { method: 'POST', body: fd })
            if (response.ok) {
                const data = await response.json()
                setFormData(prev => ({ ...prev, coverImage: data.url }))
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
        if (formData.authorIds.length === 0) {
            toast('É necessário selecionar pelo menos um autor.', 'error')
            return;
        }

        setLoading(true)
        try {
            const response = await fetch('/api/admin/webtoons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (response.ok) {
                const data = await response.json()
                router.push(`/creator/series/${data.webtoon.id}/edit`)
            } else {
                const error = await response.json()
                toast(error.error || 'Falha ao criar série', 'error')
            }
        } catch (error) {
            console.error('Error creating series:', error)
            toast('Falha ao criar série', 'error')
        } finally {
            setLoading(false)
        }
    }

    const toggleGenre = (genreId: string) => {
        setFormData(prev => ({
            ...prev,
            genreIds: prev.genreIds.includes(genreId)
                ? prev.genreIds.filter(id => id !== genreId)
                : [...prev.genreIds, genreId]
        }))
    }

    const toggleAuthor = (authorId: string) => {
        setFormData(prev => ({
            ...prev,
            authorIds: prev.authorIds.includes(authorId)
                ? prev.authorIds.filter(id => id !== authorId)
                : [...prev.authorIds, authorId]
        }));
    };

    const toggleArtist = (artistId: string) => {
        setFormData(prev => ({
            ...prev,
            artistIds: prev.artistIds.includes(artistId)
                ? prev.artistIds.filter(id => id !== artistId)
                : [...prev.artistIds, artistId]
        }));
    };

    if (!currentUserAuthor && !loading) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <Card className="bg-[#0f0b14] border-white/10 p-8">
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-bold text-white mb-4">Perfil de autor não encontrado</h2>
                        <p className="text-white/60 mb-4">Você precisa definir seu nome de perfil nas configurações da conta antes de criar uma série.</p>
                        <div className="flex justify-center gap-4">
                            <Link href="/profile">
                                <Button variant="default" className="bg-purple-600 hover:bg-purple-700 text-white">Ir para Configurações da Conta</Button>
                            </Link>
                            <Button variant="outline" onClick={fetchInitialData} className="border-white/10 text-white hover:bg-white/5">Tentar Verificação Novamente</Button>
                        </div>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()} className="text-white hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
            </div>

            <div>
                <h1 className="text-3xl font-bold text-white">Criar Nova Série</h1>
                <p className="text-white/60 mt-2">Vamos levar sua história adiante. Preencha os detalhes abaixo para criar sua nova série de webtoon.</p>
            </div>

            <Card className="bg-[#0f0b14] border-white/10 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-white">Título da Série</Label>
                        <Input id="title" placeholder="ex.: O Cavaleiro Carmesim" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-white">Gênero</Label>
                        <div className="flex flex-wrap gap-2">
                            {genres.map((genre) => (
                                <button key={genre.id} type="button" onClick={() => toggleGenre(genre.id)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${formData.genreIds.includes(genre.id) ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                                    {genre.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-white">Sinopse</Label>
                        <textarea id="description" placeholder="Escreva uma breve e envolvente descrição da sua série." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 resize-none" />
                    </div>

                    <MultiSelectAuthors title="Autores" allAuthors={allAuthors} selectedIds={formData.authorIds} onToggle={toggleAuthor} />

                    <MultiSelectAuthors title="Artistas" allAuthors={allAuthors} selectedIds={formData.artistIds} onToggle={toggleArtist} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-white">Status da Série</Label>
                            <select id="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500">
                                <option value="ongoing">Em andamento</option>
                                <option value="completed">Concluído</option>
                                <option value="hiatus">Hiato</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="language" className="text-white">Idioma</Label>
                            <select id="language" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500">
                                <option value="en">Inglês</option>
                                <option value="pt">Português</option>
                                <option value="es">Espanhol</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-white">Imagem de Capa</Label>
                        <div className="border-2 border-dashed border-white/10 rounded-lg p-8">
                            {formData.coverImage ? (
                                <div className="relative">
                                    <img src={formData.coverImage} alt="Cover preview" className="w-48 h-64 object-cover rounded-lg mx-auto" />
                                    <Button type="button" variant="ghost" onClick={() => setFormData({ ...formData, coverImage: '' })} className="mt-4 text-white hover:bg-white/10 mx-auto block">Remover Imagem</Button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Upload className="h-12 w-12 text-white/40 mx-auto mb-4" />
                                    <label className="cursor-pointer">
                                        <span className="text-purple-400 hover:text-purple-300">{uploading ? 'Enviando...' : 'Fazer upload de um arquivo'}</span>
                                        <span className="text-white/60"> ou arrastar e soltar</span>
                                        <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                                    </label>
                                    <p className="text-white/40 text-sm mt-2">PNG, JPG, GIF até 10MB</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 justify-end pt-4">
                        <Button type="button" variant="ghost" onClick={() => router.back()} className="text-white hover:bg-white/10">Salvar Rascunho</Button>
                        <Button type="submit" disabled={loading || uploading} className="bg-purple-600 hover:bg-purple-700 text-white">{loading ? 'Criando...' : 'Enviar Série'}</Button>
                    </div>
                </form>
            </Card>
            <ToastContainer />
        </div>
    )
} 