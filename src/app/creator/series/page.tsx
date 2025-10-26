'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Edit } from 'lucide-react'

interface Webtoon {
    id: string
    title: string
    status: string
    views: number
    likes: number
    coverImage: string | null
    _count: {
        chapters: number
    }
    updatedAt: string
}

export default function MySeriesPage() {
    const router = useRouter()
    const [webtoons, setWebtoons] = useState<Webtoon[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('published')

    useEffect(() => {
        fetchWebtoons()
    }, [])

    const fetchWebtoons = async () => {
        try {
            const response = await fetch('/api/creator/webtoons')
            if (response.ok) {
                const data = await response.json()
                setWebtoons(data.webtoons || [])
            }
        } catch (error) {
            console.error('Error fetching webtoons:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredWebtoons = webtoons.filter(w => {
        if (activeTab === 'published') return w.status !== 'draft'
        return w.status === 'draft'
    })

    const statusLabel = (status: string) => {
        switch (status) {
            case 'draft':
                return 'Rascunho'
            case 'ongoing':
                return 'Em andamento'
            case 'completed':
                return 'Concluído'
            case 'hiatus':
                return 'Hiato'
            default:
                return status
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Minhas Séries</h1>
                <Button
                    onClick={() => router.push('/creator/series/new')}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Série
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('published')}
                    className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'published'
                        ? 'text-purple-400'
                        : 'text-white/60 hover:text-white'
                        }`}
                >
                    Publicadas
                    {activeTab === 'published' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('drafts')}
                    className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'drafts'
                        ? 'text-purple-400'
                        : 'text-white/60 hover:text-white'
                        }`}
                >
                    Rascunhos
                    {activeTab === 'drafts' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400" />
                    )}
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-white/60">Carregando...</div>
                </div>
            ) : filteredWebtoons.length === 0 ? (
                <Card className="bg-[#0f0b14] border-white/10 p-12 text-center">
                    <p className="text-white/60 mb-4">Nenhuma série encontrada</p>
                    <Button
                        onClick={() => router.push('/creator/series/new')}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Crie sua primeira série
                    </Button>
                </Card>
            ) : (
                <Card className="bg-[#0f0b14] border-white/10">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/60">TÍTULO</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/60">STATUS</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/60">ÚLTIMA ATUALIZAÇÃO</th>
                                <th className="px-6 py-4 text-right text-sm font-medium text-white/60">AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWebtoons.map((webtoon) => (
                                <tr key={webtoon.id} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {webtoon.coverImage ? (
                                                <img
                                                    src={webtoon.coverImage}
                                                    alt={webtoon.title}
                                                    className="w-12 h-16 object-cover rounded"
                                                />
                                            ) : (
                                                <div className="w-12 h-16 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded" />
                                            )}
                                            <span className="text-white font-medium">{webtoon.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm capitalize">
                                            {statusLabel(webtoon.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-white/60">
                                        {new Date(webtoon.updatedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => router.push(`/creator/series/${webtoon.id}/edit`)}
                                            className="text-purple-400 hover:text-purple-300 hover:bg-white/10"
                                        >
                                            Editar
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    )
}
