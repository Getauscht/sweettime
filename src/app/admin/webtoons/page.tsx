/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit, Trash2, Eye, BookOpen } from 'lucide-react'
import { useToast } from '@/components/Toast'

export default function WebtoonsManagement() {
    const router = useRouter()
    const { toast, ToastContainer } = useToast()
    const [search, setSearch] = useState('')
    const [webtoons, setWebtoons] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [limit] = useState(12)
    const [totalPages, setTotalPages] = useState(1)

    useEffect(() => {
        fetchList()
    }, [search, page])

    const fetchList = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.set('search', search)
            params.set('page', String(page))
            params.set('limit', String(limit))

            const res = await fetch(`/api/admin/webtoons?${params.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setWebtoons(data.webtoons || [])
                setTotalPages(data.pagination?.totalPages || 1)
            } else {
                console.error('Failed to fetch webtoons list')
            }
        } catch (err) {
            console.error('Error fetching webtoons', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Webtoons</h1>
                    <p className="text-white/60 mt-2">Gerencie todos os webtoons do sistema</p>
                </div>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => router.push('/admin/webtoons/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Webtoon
                </Button>
            </div>

            <Input
                type="text"
                placeholder="Buscar webtoons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#0f0b14] border-white/10 text-white placeholder:text-white/40"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {webtoons.map((webtoon) => (
                    <Card key={webtoon.id} className="bg-[#0f0b14] border-white/10 p-6">
                        <div className="aspect-[2/3] bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg mb-4 flex items-center justify-center">
                            <BookOpen className="h-12 w-12 text-white/40" />
                        </div>
                        <h3 className="text-white font-semibold text-lg mb-2">{webtoon.title}</h3>
                        <p className="text-white/60 text-sm mb-4">por {webtoon.credits?.map((c: any) => c.author?.name).join(', ')}</p>
                        <div className="flex items-center justify-between text-sm mb-4">
                            <span className="text-white/60">{webtoon._count?.chapters || webtoon.chapters} capítulos</span>
                            <span className="text-white/60">{(webtoon.views || 0).toLocaleString()} visualizações</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="flex-1 text-white hover:bg-white/10" onClick={() => router.push(`/obra/${webtoon.slug}`)}>
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                            </Button>
                            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => router.push(`/admin/webtoons/${webtoon.id}/edit`)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={async () => {
                                if (!confirm('Tem certeza que deseja excluir este webtoon?')) return
                                try {
                                    const res = await fetch(`/api/admin/webtoons?webtoonId=${webtoon.id}`, { method: 'DELETE' })
                                    if (res.ok) {
                                        fetchList()
                                        toast('Webtoon excluído com sucesso', 'success')
                                    } else {
                                        const err = await res.json().catch(() => ({}))
                                        toast(err.error || 'Falha ao excluir webtoon', 'error')
                                    }
                                } catch (err) {
                                    console.error('Delete error', err)
                                    toast('Falha ao excluir webtoon', 'error')
                                }
                            }}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
                <Button variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="text-white">Anterior</Button>
                <div className="text-white/60">Página {page} / {totalPages}</div>
                <Button variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="text-white">Próximo</Button>
            </div>
            <ToastContainer />
        </div>
    )
}
