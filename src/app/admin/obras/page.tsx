/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit, Trash2, Eye, BookOpen, FileText } from 'lucide-react'
import { useToast } from '@/components/Toast'

export default function ObrasManagement() {
    const router = useRouter()
    const { toast, ToastContainer } = useToast()
    const [search, setSearch] = useState('')
    const [works, setWorks] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [limit] = useState(12)
    const [totalPages, setTotalPages] = useState(1)
    const [typeFilter, setTypeFilter] = useState<'all' | 'webtoon' | 'novel'>('all')

    useEffect(() => {
        fetchList()
    }, [search, page, typeFilter])

    const fetchList = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.set('search', search)
            params.set('page', String(page))
            params.set('limit', String(limit))
            if (typeFilter !== 'all') params.set('type', typeFilter)

            const res = await fetch(`/api/admin/obras?${params.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setWorks(data.works || [])
                setTotalPages(data.pagination?.totalPages || 1)
            } else {
                console.error('Failed to fetch works list')
            }
        } catch (err) {
            console.error('Error fetching works', err)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (work: any) => {
        if (!confirm(`Tem certeza que deseja excluir ${work.type === 'webtoon' ? 'este webtoon' : 'esta novel'}?`)) return
        try {
            const res = await fetch(`/api/admin/obras?workId=${work.id}&type=${work.type}`, { method: 'DELETE' })
            if (res.ok) {
                fetchList()
                toast(`${work.type === 'webtoon' ? 'Webtoon' : 'Novel'} excluído com sucesso`, 'success')
            } else {
                const err = await res.json().catch(() => ({}))
                toast(err.error || 'Falha ao excluir obra', 'error')
            }
        } catch (err) {
            console.error('Delete error', err)
            toast('Falha ao excluir obra', 'error')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Obras</h1>
                    <p className="text-white/60 mt-2">Gerencie todos os webtoons e novels do sistema</p>
                </div>
                <Button 
                    className="bg-purple-600 hover:bg-purple-700 text-white" 
                    onClick={() => router.push('/admin/obras/new')}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Obra
                </Button>
            </div>

            <div className="flex gap-4">
                <Input
                    type="text"
                    placeholder="Buscar obras..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-[#0f0b14] border-white/10 text-white placeholder:text-white/40"
                />
                <div className="flex gap-2">
                    <Button
                        variant={typeFilter === 'all' ? 'default' : 'ghost'}
                        onClick={() => setTypeFilter('all')}
                        className={typeFilter === 'all' ? 'bg-purple-600 text-white' : 'text-white hover:bg-white/10'}
                    >
                        Todos
                    </Button>
                    <Button
                        variant={typeFilter === 'webtoon' ? 'default' : 'ghost'}
                        onClick={() => setTypeFilter('webtoon')}
                        className={typeFilter === 'webtoon' ? 'bg-purple-600 text-white' : 'text-white hover:bg-white/10'}
                    >
                        Webtoons
                    </Button>
                    <Button
                        variant={typeFilter === 'novel' ? 'default' : 'ghost'}
                        onClick={() => setTypeFilter('novel')}
                        className={typeFilter === 'novel' ? 'bg-blue-600 text-white' : 'text-white hover:bg-white/10'}
                    >
                        Novels
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="text-white/60">Carregando obras...</div>
                    </div>
                )}
                {!loading && works.length === 0 && (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="text-white/60">Nenhuma obra encontrada</div>
                    </div>
                )}
                {works.map((work) => (
                    <Card key={work.id} className="bg-[#0f0b14] border-white/10 p-6">
                        <div className="aspect-[2/3] bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                            {work.coverImage ? (
                                <img 
                                    src={work.coverImage} 
                                    alt={work.title} 
                                    className="w-full h-full object-cover"
                                />
                            ) : work.type === 'webtoon' ? (
                                <BookOpen className="h-12 w-12 text-white/40" />
                            ) : (
                                <FileText className="h-12 w-12 text-white/40" />
                            )}
                            <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${work.type === 'webtoon' 
                                ? 'bg-purple-500/20 text-purple-300' 
                                : 'bg-blue-500/20 text-blue-300'
                                }`}>
                                {work.type === 'webtoon' ? 'Webtoon' : 'Novel'}
                            </div>
                        </div>
                        <h3 className="text-white font-semibold text-lg mb-2">{work.title}</h3>
                        <p className="text-white/60 text-sm mb-4">
                            por {work.authors?.map((a: any) => a.name).join(', ') || 'Autor desconhecido'}
                        </p>
                        <div className="flex items-center justify-between text-sm mb-4">
                            <span className="text-white/60">{work._count?.chapters || 0} capítulos</span>
                            <span className="text-white/60">{(work.views || 0).toLocaleString()} visualizações</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="flex-1 text-white hover:bg-white/10" 
                                onClick={() => router.push(`/obra/${work.slug}`)}
                            >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-white hover:bg-white/10" 
                                onClick={() => router.push(`/admin/obras/${work.id}/edit?type=${work.type}`)}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-white hover:bg-white/10" 
                                onClick={() => handleDelete(work)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                    <Button 
                        variant="ghost" 
                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                        disabled={page <= 1} 
                        className="text-white"
                    >
                        Anterior
                    </Button>
                    <div className="text-white/60">Página {page} / {totalPages}</div>
                    <Button 
                        variant="ghost" 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                        disabled={page >= totalPages} 
                        className="text-white"
                    >
                        Próximo
                    </Button>
                </div>
            )}
            <ToastContainer />
        </div>
    )
}
