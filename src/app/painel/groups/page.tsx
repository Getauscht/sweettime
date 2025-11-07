'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, BookOpen, Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { GenericMarkdownRenderer } from '@/components/GenericMarkdownRenderer'

export default function GroupsPage() {
    const [groups, setGroups] = useState<{ id: string; name: string; description?: string; _count?: { members?: number; webtoons?: number; novels?: number; totalObras?: number } }[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        load()
    }, [])

    async function load() {
        setLoading(true)
        try {
            const res = await fetch('/api/groups')
            if (res.ok) {
                const data = await res.json()
                const groupsRaw = data.groups || []
                // normalize webtoonGroups and novelGroups junction shape to expected counts
                const normalized = groupsRaw.map((g: any) => {
                    const webtoonCount = g.webtoonGroups?.length || g._count?.webtoons || g._count?.webtoonGroups || 0
                    const novelCount = g.novelGroups?.length || g._count?.novels || g._count?.novelGroups || 0
                    
                    if (g.webtoonGroups) {
                        const webtoons = g.webtoonGroups.map((wg: any) => wg.webtoon).filter(Boolean)
                        g.webtoons = webtoons
                    }
                    if (g.novelGroups) {
                        const novels = g.novelGroups.map((ng: any) => ng.novel).filter(Boolean)
                        g.novels = novels
                    }
                    
                    g._count = g._count || {}
                    g._count.webtoons = webtoonCount
                    g._count.novels = novelCount
                    g._count.totalObras = webtoonCount + novelCount
                    
                    return g
                })
                setGroups(normalized)
            }
        } catch (e) {
            console.error('Failed to load groups', e)
        } finally {
            setLoading(false)
        }
    }

    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="space-y-8">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Grupos de Scanlation</h1>
                    <p className="text-white/60">Descubra e participe de comunidades de scanlation</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/painel/groups/obras">
                        <Button variant="outline" className="gap-2 border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                            <BookOpen className="h-4 w-4" />
                            Explorar Obras
                        </Button>
                    </Link>
                    <Link href="/groups/new">
                        <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                            <Plus className="h-4 w-4" />
                            Criar Grupo
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Barra de busca */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                    placeholder="Buscar grupos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#1a1625] border-white/10 text-white placeholder:text-white/40"
                />
            </div>

            {/* Grid de grupos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="text-white/60">Carregando grupos...</div>
                    </div>
                )}
                {!loading && filteredGroups.length === 0 && searchQuery && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                        <div className="text-white/60 mb-2">Nenhum grupo encontrado</div>
                        <div className="text-white/40 text-sm">Tente ajustar os termos da busca</div>
                    </div>
                )}
                {!loading && filteredGroups.length === 0 && !searchQuery && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                        <Users className="h-12 w-12 text-white/20 mb-4" />
                        <div className="text-white/60 mb-2">Nenhum grupo ainda</div>
                        <div className="text-white/40 text-sm mb-4">Seja o primeiro a criar um grupo de scanlation</div>
                        <Link href="/groups/new">
                            <Button className="bg-purple-600 hover:bg-purple-700">
                                <Plus className="h-4 w-4 mr-2" />
                                Criar Primeiro Grupo
                            </Button>
                        </Link>
                    </div>
                )}
                {filteredGroups.map((g) => (
                    <Card key={g.id} className="p-6 bg-[#1a1625] border-white/10 hover:border-purple-500/30 transition-colors group">
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors mb-2">
                                    {g.name}
                                </h2>
                                {g.description && (
                                    <GenericMarkdownRenderer content={g.description} className="text-white/60 text-sm line-clamp-2" />
                                )}
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-white/60">
                                    <Users className="h-4 w-4" />
                                    <span>{g._count?.members || 0} membros</span>
                                </div>
                                <div className="flex items-center gap-1 text-white/60">
                                    <BookOpen className="h-4 w-4" />
                                    <span>{g._count?.totalObras || 0} obras</span>
                                </div>
                                {(g._count?.webtoons || 0) > 0 && (
                                    <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300">
                                        {g._count?.webtoons}W
                                    </Badge>
                                )}
                                {(g._count?.novels || 0) > 0 && (
                                    <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300">
                                        {g._count?.novels}N
                                    </Badge>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Link href={`/groups/${g.id}`} className="flex-1">
                                    <Button
                                        variant="ghost"
                                        className="w-full text-white/70 hover:text-white hover:bg-white/5"
                                    >
                                        Ver Detalhes
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
