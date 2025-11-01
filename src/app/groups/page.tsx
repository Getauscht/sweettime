"use client"

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users } from 'lucide-react'

export default function GroupsIndexPage() {
    const [groups, setGroups] = useState<any[]>([])
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true
        setLoading(true)
        fetch('/api/groups')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch')
                return res.json()
            })
            .then((data) => {
                if (!mounted) return
                setGroups(Array.isArray(data.groups) ? data.groups : [])
            })
            .catch((err) => {
                console.error('Failed to load groups', err)
                if (!mounted) return
                setError('Failed to load groups')
            })
            .finally(() => mounted && setLoading(false))

        return () => { mounted = false }
    }, [])

    const filtered = useMemo(() => {
        if (!query.trim()) return groups
        const q = query.trim().toLowerCase()
        return groups.filter(g => (g.name || '').toLowerCase().includes(q) || (g.slug || '').toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q))
    }, [groups, query])

    return (
        <div className="min-h-screen bg-[#0f0b14]">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Grupos</h1>
                        <p className="text-white/60">Explore grupos de scanlation e comunidades</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Input
                            value={query}
                            onChange={(e: any) => setQuery(e.target.value)}
                            placeholder="Pesquisar grupos"
                            className="w-64"
                        />
                        <Link href="/groups">
                            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">Limpar</Button>
                        </Link>
                    </div>
                </div>

                {loading && <div className="text-white">Carregando...</div>}
                {error && <div className="text-red-400">{error}</div>}

                {!loading && !error && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.length === 0 ? (
                            <div className="col-span-full text-center py-8 text-white/60">Nenhum grupo encontrado</div>
                        ) : (
                            filtered.map(g => (
                                <Link key={g.id} href={`/groups/${g.id}`}>
                                    <Card className="p-4 bg-[#1a1625] border-white/10 hover:border-purple-500/30 transition-colors cursor-pointer">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl">📚</div>
                                                <div>
                                                    <div className="text-white font-medium">{g.name}</div>
                                                    <div className="text-sm text-white/60">{g._count?.members || 0} membros • {g._count?.webtoonGroups || 0} webtoons</div>
                                                </div>
                                            </div>
                                            <div>
                                                <Button variant="outline" size="sm">Ver</Button>
                                            </div>
                                        </div>
                                        {g.description && <p className="mt-3 text-sm text-white/60 line-clamp-3">{g.description}</p>}
                                    </Card>
                                </Link>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
