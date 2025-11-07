'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, Users, BookOpen, User } from 'lucide-react'

interface Statistics {
    totalWebtoons: number
    totalNovels: number
    totalWorks: number
    totalAuthors: number
    totalUsers: number
    activeUsers: number
}

interface Activity {
    id: string
    action: string
    entityType: string
    details: string | null
    createdAt: string
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Statistics | null>(null)
    const [activity, setActivity] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    // Test notification form
    const [testUserId, setTestUserId] = useState('')
    const [testTitle, setTestTitle] = useState('Teste de Notificação')
    const [testBody, setTestBody] = useState('Esta é uma notificação de teste enviada pelo painel admin.')
    const [testUrl, setTestUrl] = useState('/')
    const [sendingTest, setSendingTest] = useState(false)
    const [sendResult, setSendResult] = useState<any | null>(null)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/admin/dashboard/stats')
            if (response.ok) {
                const data = await response.json()
                setStats(data.statistics)
                setActivity(data.recentActivity)
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        })
    }

    const sendTestNotification = async () => {
        setSendingTest(true)
        setSendResult(null)
        try {
            const payload = { userId: testUserId, title: testTitle, body: testBody, data: { url: testUrl } }
            const res = await fetch('/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Falha ao enviar')
            setSendResult({ ok: true, data })
        } catch (e: any) {
            setSendResult({ ok: false, error: e?.message || String(e) })
        } finally {
            setSendingTest(false)
        }
    }

    const getActivityIcon = (entityType: string) => {
        switch (entityType) {
            case 'webtoon':
                return '📖'
            case 'novel':
                return '📚'
            case 'author':
                return '👤'
            case 'user':
                return '👥'
            case 'genre':
                return '🏷️'
            default:
                return '•'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-white/60">Carregando...</div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Painel Administrativo</h1>
                <p className="text-white/60 mt-2">Gerencie obras, usuários e configurações da plataforma</p>
            </div>

            {/* Search */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Pesquisar obras, autores ou usuários"
                    className="w-full px-4 py-3 bg-[#0f0b14] border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                />
            </div>

            {/* Statistics */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Estatísticas Resumidas</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-[#0f0b14] border-white/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white/60 text-sm">Total de Obras</h3>
                            <BookOpen className="h-5 w-5 text-purple-400" />
                        </div>
                        <p className="text-4xl font-bold text-white">
                            {stats?.totalWorks?.toLocaleString() || '0'}
                        </p>
                        <p className="text-xs text-white/40 mt-2">
                            {stats?.totalWebtoons || 0} webtoons • {stats?.totalNovels || 0} novels
                        </p>
                    </Card>

                    <Card className="bg-[#0f0b14] border-white/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white/60 text-sm">Webtoons</h3>
                            <BookOpen className="h-5 w-5 text-purple-400" />
                        </div>
                        <p className="text-4xl font-bold text-white">
                            {stats?.totalWebtoons.toLocaleString() || '0'}
                        </p>
                    </Card>

                    <Card className="bg-[#0f0b14] border-white/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white/60 text-sm">Novels</h3>
                            <BookOpen className="h-5 w-5 text-blue-400" />
                        </div>
                        <p className="text-4xl font-bold text-white">
                            {stats?.totalNovels?.toLocaleString() || '0'}
                        </p>
                    </Card>

                    <Card className="bg-[#0f0b14] border-white/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white/60 text-sm">Usuários Ativos</h3>
                            <Users className="h-5 w-5 text-green-400" />
                        </div>
                        <p className="text-4xl font-bold text-white">
                            {stats?.activeUsers.toLocaleString() || '0'}
                        </p>
                    </Card>
                </div>
            </div>

            {/* Test Notifications (Admin) */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Testar Notificações Push</h2>
                <Card className="bg-[#0f0b14] border-white/10 p-6">
                    <div className="space-y-3">
                        <p className="text-white/60">Envie uma notificação de teste para um usuário específico (informe o <code>userId</code> do usuário).</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input value={testUserId} onChange={(e) => setTestUserId(e.target.value)} placeholder="User ID" className="w-full px-3 py-2 bg-[#0f0b14] border border-white/10 rounded text-white" />
                            <input value={testUrl} onChange={(e) => setTestUrl(e.target.value)} placeholder="URL ao clicar (ex: /profile)" className="w-full px-3 py-2 bg-[#0f0b14] border border-white/10 rounded text-white" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input value={testTitle} onChange={(e) => setTestTitle(e.target.value)} placeholder="Título" className="w-full px-3 py-2 bg-[#0f0b14] border border-white/10 rounded text-white" />
                            <input value={testBody} onChange={(e) => setTestBody(e.target.value)} placeholder="Corpo da notificação" className="w-full px-3 py-2 bg-[#0f0b14] border border-white/10 rounded text-white" />
                        </div>

                        <div className="flex items-center gap-3">
                            <button onClick={sendTestNotification} disabled={sendingTest || !testUserId} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">{sendingTest ? 'Enviando...' : 'Enviar Teste'}</button>
                            <button onClick={() => { setTestUserId(''); setTestTitle('Teste de Notificação'); setTestBody('Esta é uma notificação de teste enviada pelo painel admin.'); setTestUrl('/') }} className="text-sm text-white/60">Limpar</button>
                        </div>

                        {sendResult && (
                            <div className={`mt-3 p-3 rounded ${sendResult.ok ? 'bg-green-800/30 border border-green-500/30' : 'bg-red-800/30 border border-red-500/30'}`}>
                                <pre className="text-xs text-white/80 overflow-auto">{JSON.stringify(sendResult, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Recent Activity */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Atividade Recente</h2>
                <Card className="bg-[#0f0b14] border-white/10">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="px-6 py-4 text-left text-sm font-medium text-white/60">
                                        ATIVIDADE
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-white/60">
                                        DETALHES
                                    </th>
                                    <th className="px-6 py-4 text-right text-sm font-medium text-white/60">
                                        DATA
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {activity.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-white/40">
                                            Nenhuma atividade recente
                                        </td>
                                    </tr>
                                ) : (
                                    activity.map((item) => (
                                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{getActivityIcon(item.entityType)}</span>
                                                    <span className="text-white capitalize">{item.action.replace('_', ' ')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-white/60">
                                                {item.details || `${item.entityType} ${item.action}`}
                                            </td>
                                            <td className="px-6 py-4 text-right text-white/60">
                                                {formatDate(item.createdAt)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    )
} 