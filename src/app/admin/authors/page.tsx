'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/Toast'
import { Plus, Edit, Trash2, X, Upload } from 'lucide-react'

interface Author {
    id: string
    name: string
    slug: string
    bio: string | null
    avatar: string | null
    _count: { webtoons: number }
}

export default function AuthorsPage() {
    const { toast, ToastContainer } = useToast()
    const [authors, setAuthors] = useState<Author[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [editing, setEditing] = useState<Author | null>(null)
    const [creating, setCreating] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [form, setForm] = useState({ name: '', slug: '', bio: '', avatar: '' })

    useEffect(() => {
        fetchAuthors()
    }, [search])

    const fetchAuthors = async () => {
        try {
            const params = new URLSearchParams({ ...(search && { search }) })
            const response = await fetch(`/api/admin/authors?${params}`)
            if (response.ok) {
                const data = await response.json()
                setAuthors(data.authors)
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            const url = editing ? `/api/admin/authors/${editing.id}` : '/api/admin/authors'
            const response = await fetch(url, {
                method: editing ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })

            if (response.ok) {
                setEditing(null)
                setCreating(false)
                fetchAuthors()
            } else {
                const error = await response.json()
                toast(error.error, 'error')
            }
        } catch (error) {
            toast('Falha ao salvar autor', 'error')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this author?')) return
        if (!confirm('Tem certeza que deseja excluir este autor?')) return

        try {
            const response = await fetch(`/api/admin/authors/${id}`, { method: 'DELETE' })
            if (response.ok) fetchAuthors()
            else toast((await response.json()).error, 'error')
        } catch (error) {
            toast('Falha ao excluir autor', 'error')
        }
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'avatar')

        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData })
            if (response.ok) {
                const data = await response.json()
                setForm(prev => ({ ...prev, avatar: data.url }))
            }
        } catch (error) {
            toast('Falha ao enviar arquivo', 'error')
        } finally {
            setUploading(false)
        }
    }

    const generateSlug = (name: string) => {
        setForm(prev => ({ ...prev, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <ToastContainer />
                    <h1 className="text-3xl font-bold text-white">Autores</h1>
                    <p className="text-white/60 mt-2">Gerencie os autores de webtoons</p>
                </div>

                <Button onClick={() => { setCreating(true); setForm({ name: '', slug: '', bio: '', avatar: '' }); }} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Autor
                </Button>
            </div>

            <Input
                placeholder="Pesquisar autores..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#0f0b14] border-white/10 text-white"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="text-white/40">Carregando...</div>
                ) : authors.length === 0 ? (
                    <div className="col-span-full text-white/40 text-center py-12">Nenhum autor encontrado</div>
                ) : (
                    authors.map((author) => (
                        <Card key={author.id} className="bg-[#0f0b14] border-white/10 p-6">
                            <div className="flex items-start gap-4">
                                {author.avatar ? (
                                    <img src={author.avatar} alt={author.name} className="w-16 h-16 rounded-full object-cover" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-xl font-bold">
                                        {author.name[0]}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="text-white font-semibold">{author.name}</h3>
                                    <p className="text-white/60 text-sm">{author.slug}</p>
                                    <p className="text-white/40 text-sm mt-1">{author._count.webtoons} séries</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => { setEditing(author); setForm({ name: author.name, slug: author.slug, bio: author.bio || '', avatar: author.avatar || '' }); }} className="p-2 text-white/60 hover:text-purple-400 hover:bg-white/5 rounded">
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(author.id)} className="p-2 text-white/60 hover:text-red-400 hover:bg-white/5 rounded">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            {author.bio && <p className="text-white/60 text-sm mt-4 line-clamp-2">{author.bio}</p>}
                        </Card>
                    ))
                )}
            </div>

            {
                (editing || creating) && (
                    <Dialog open={true} onOpenChange={() => { setEditing(null); setCreating(false); }}>
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                            <Card className="bg-[#0f0b14] border-white/10 p-6 max-w-lg w-full">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-bold text-white">{editing ? 'Editar' : 'Novo'} Autor</h3>
                                    <button onClick={() => { setEditing(null); setCreating(false); }} className="text-white/60 hover:text-white"><X className="h-5 w-5" /></button>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-center">
                                        <label className="cursor-pointer">
                                            {form.avatar ? (
                                                <img src={form.avatar} alt="Avatar" className="w-24 h-24 rounded-full" />
                                            ) : (
                                                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border-2 border-dashed border-white/20">
                                                    <Upload className="h-8 w-8 text-white/40" />
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
                                        </label>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-white">Nome</Label>
                                        <Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); generateSlug(e.target.value); }} className="bg-white/5 border-white/10 text-white" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-white">Slug</Label>
                                        <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-white">Biografia</Label>
                                        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white resize-none focus:outline-none focus:border-purple-500" />
                                    </div>
                                </div>

                                <div className="flex gap-4 justify-end mt-6">
                                    <Button variant="ghost" onClick={() => { setEditing(null); setCreating(false); }} className="text-white hover:bg-white/15">Cancelar</Button>
                                    <Button onClick={handleSave} disabled={uploading} className="bg-purple-600 hover:bg-purple-700 text-white">{editing ? 'Salvar' : 'Criar'}</Button>
                                </div>
                            </Card>
                        </div>
                    </Dialog>
                )
            }
        </div >
    )
}
