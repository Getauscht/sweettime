"use client"

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'

interface CommentItem {
    id: string
    content: string
    createdAt: string
    deletedAt?: string | null
    deletedBy?: string | null
    likes?: number
    replyCount?: number
    user: { id: string; name: string | null; image: string | null }
    webtoon?: { id: string; title: string; slug: string } | null
    chapter?: { id: string; number: number; webtoon: { slug: string; title: string } } | null
}

export default function AdminCommentsPage() {
    const [items, setItems] = useState<CommentItem[]>([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [onlyDeleted, setOnlyDeleted] = useState(false)

    const load = async (p = page) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(p), limit: '20' })
            if (search) params.set('search', search)
            if (onlyDeleted) params.set('onlyDeleted', 'true')
            const res = await fetch(`/api/admin/comments?${params.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setItems(data.comments)
                setTotalPages(data.pagination?.totalPages || 1)
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load(1) }, [])

    const act = async (commentId: string, action: 'disable' | 'restore') => {
        const res = await fetch('/api/admin/comments', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commentId, action })
        })
        if (res.ok) load(page)
    }

    return (
        <>
            <Header />
            <div className="min-h-screen bg-[#100b14] text-white">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-semibold">Moderação de Comentários</h1>
                    </div>

                    <div className="mt-6 flex gap-2 items-center">
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por conteúdo ou autor" className="bg-white/5 border border-white/10 rounded px-3 py-2" />
                        <label className="text-sm flex items-center gap-2">
                            <input type="checkbox" checked={onlyDeleted} onChange={(e) => setOnlyDeleted(e.target.checked)} /> Somente excluídos
                        </label>
                        <Button onClick={() => load(1)} className="bg-purple-600 hover:bg-purple-700">Buscar</Button>
                    </div>

                    <div className="mt-6 bg-[#0f0b14] border border-white/10 rounded-lg divide-y divide-white/5">
                        {loading && <div className="p-6 text-white/60">Carregando...</div>}
                        {!loading && items.length === 0 && <div className="p-6 text-white/60">Sem resultados</div>}
                        {!loading && items.map((c) => (
                            <div key={c.id} className="p-4 flex items-start gap-4">
                                <div className="flex-1">
                                    <div className="text-white/80 text-sm">
                                        <span className="font-medium">{c.user?.name || 'Usuário'}</span>
                                        <span className="text-white/40"> • {new Date(c.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="mt-1 text-white/70 text-sm">
                                        {c.deletedAt ? (
                                            <span className="italic text-white/50">{c.deletedBy === 'moderator' ? 'comentário excluído por um moderador' : 'comentário deletado pelo próprio usuário'}</span>
                                        ) : (
                                            c.content
                                        )}
                                    </div>
                                    <div className="text-xs text-white/40 mt-1">Curtidas: {c.likes ?? 0} • Respostas: {c.replyCount ?? 0}</div>
                                    <div className="text-xs text-white/40 mt-1">
                                        {c.chapter ? (
                                            <span>Capítulo: {c.chapter.number} de {c.chapter.webtoon.title}</span>
                                        ) : c.webtoon ? (
                                            <span>Obra: {c.webtoon.title}</span>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {!c.deletedAt ? (
                                        <Button onClick={() => act(c.id, 'disable')} className="bg-red-600 hover:bg-red-700">Desabilitar</Button>
                                    ) : (
                                        <Button onClick={() => act(c.id, 'restore')} variant="outline">Restaurar</Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                        <Button disabled={page <= 1} onClick={() => { setPage(p => p - 1); load(page - 1) }} variant="outline">Anterior</Button>
                        <span className="text-white/60 text-sm">Página {page} de {totalPages}</span>
                        <Button disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); load(page + 1) }} variant="outline">Próxima</Button>
                    </div>
                </div>
            </div>
        </>
    )
}
