'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/Toast'
import { Plus, Edit, Trash2, X, Tag } from 'lucide-react'

interface Genre {
    id: string
    name: string
    description: string | null
    _count: { webtoons: number }
}

export default function GenresPage() {
    const { toast, ToastContainer } = useToast()
    const [genres, setGenres] = useState<Genre[]>([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState<Genre | null>(null)
    const [creating, setCreating] = useState(false)
    const [form, setForm] = useState({ name: '', description: '' })

    useEffect(() => {
        fetchGenres()
    }, [])

    const fetchGenres = async () => {
        try {
            const response = await fetch('/api/admin/genres')
            if (response.ok) {
                const data = await response.json()
                setGenres(data.genres)
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            const url = editing ? `/api/admin/genres/${editing.id}` : '/api/admin/genres'
            const response = await fetch(url, {
                method: editing ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })

            if (response.ok) {
                setEditing(null)
                setCreating(false)
                fetchGenres()
            } else {
                const error = await response.json()
                toast(error.error, 'error')
            }
        } catch (error) {
            toast('Failed to save genre', 'error')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this genre?')) return

        try {
            const response = await fetch(`/api/admin/genres/${id}`, { method: 'DELETE' })
            if (response.ok) fetchGenres()
            else toast((await response.json()).error, 'error')
        } catch (error) {
            toast('Failed to delete', 'error')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <ToastContainer />
                    <h1 className="text-3xl font-bold text-white">Gêneros</h1>
                    <p className="text-white/60 mt-2">Gerencie os gêneros de webtoons</p>
                </div>

                <Button onClick={() => { setCreating(true); setForm({ name: '', description: '' }); }} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Gênero
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {loading ? (
                    <div className="text-white/40">Carregando...</div>
                ) : genres.length === 0 ? (
                    <div className="col-span-full text-white/40 text-center py-12">Nenhum gênero encontrado</div>
                ) : (
                    genres.map((genre) => (
                        <Card key={genre.id} className="bg-[#0f0b14] border-white/10 p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="p-2 bg-purple-500/10 rounded">
                                        <Tag className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-medium truncate">{genre.name}</h3>
                                        <p className="text-white/40 text-sm">{genre._count.webtoons} séries</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => { setEditing(genre); setForm({ name: genre.name, description: genre.description || '' }); }} className="p-1 text-white/60 hover:text-purple-400 hover:bg-white/5 rounded">
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(genre.id)} className="p-1 text-white/60 hover:text-red-400 hover:bg-white/5 rounded">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            {genre.description && (
                                <p className="text-white/60 text-sm mt-3 line-clamp-2">{genre.description}</p>
                            )}
                        </Card>
                    ))
                )}
            </div>

            {
                (editing || creating) && (
                    <Dialog open={true} onOpenChange={() => { setEditing(null); setCreating(false); }}>
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                            <Card className="bg-[#0f0b14] border-white/10 p-6 max-w-md w-full">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-bold text-white">{editing ? 'Editar' : 'Nova'} Gênero</h3>
                                    <button onClick={() => { setEditing(null); setCreating(false); }} className="text-white/60 hover:text-white"><X className="h-5 w-5" /></button>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-white">Nome do Gênero</Label>
                                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex.: Fantasia" className="bg-white/5 border-white/10 text-white" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-white">Descrição</Label>
                                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição opcional..." rows={3} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white resize-none focus:outline-none focus:border-purple-500" />
                                    </div>
                                </div>

                                <div className="flex gap-4 justify-end mt-6">
                                    <Button variant="ghost" onClick={() => { setEditing(null); setCreating(false); }} className="text-white hover:bg-white/15">Cancelar</Button>
                                    <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">{editing ? 'Salvar' : 'Criar'}</Button>
                                </div>
                            </Card>
                        </div>
                    </Dialog>
                )
            }
        </div >
    )
}
