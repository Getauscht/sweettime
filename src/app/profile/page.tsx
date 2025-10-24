"use client"

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Tabs from '@/components/ui/tabs'

interface ProfileData {
    id: string
    name: string | null
    email: string | null
    image: string | null
    role: { name: string } | null
    createdAt: string
}

export default function ProfilePage() {
    const { data: session, status, update } = useSession()
    const router = useRouter()
    const [profileData, setProfileData] = useState<ProfileData | null>(null)
    const [isFetchingProfile, setIsFetchingProfile] = useState(true)

    const [isEditOpen, setIsEditOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'favorites' | 'history' | 'lists' | 'notifications'>('favorites')
    const [notifications, setNotifications] = useState<any[]>([])
    const [favorites, setFavorites] = useState<any[]>([])
    const [history, setHistory] = useState<any[]>([])
    const [notificationsLoading, setNotificationsLoading] = useState(false)
    const [favoritesLoading, setFavoritesLoading] = useState(false)
    const [historyLoading, setHistoryLoading] = useState(false)

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login')
            return
        }

        const fetchProfile = async () => {
            if (status === 'authenticated') {
                setIsFetchingProfile(true)
                try {
                    const res = await fetch('/api/user/profile')
                    if (res.ok) {
                        const data = await res.json()
                        setProfileData(data.user)
                        setName(data.user.name || '')
                        setEmail(data.user.email || '')
                    } else {
                        setError('Falha ao carregar o perfil.')
                    }
                } catch (e) {
                    setError('Erro ao carregar o perfil.')
                } finally {
                    setIsFetchingProfile(false)
                }
            }
        }

        fetchProfile()
    }, [status, router])

    useEffect(() => {
        if (status !== 'authenticated') return

        const loadNotifications = async () => {
            setNotificationsLoading(true)
            try {
                const res = await fetch('/api/notifications')
                if (res.ok) {
                    const data = await res.json()
                    setNotifications(data.notifications || [])
                }
            } catch (e) { }
            setNotificationsLoading(false)
        }

        const loadFavorites = async () => {
            setFavoritesLoading(true)
            try {
                const res = await fetch('/api/favorites')
                if (res.ok) {
                    const data = await res.json()
                    setFavorites(data.favorites || [])
                }
            } catch (e) { }
            setFavoritesLoading(false)
        }

        const loadHistory = async () => {
            setHistoryLoading(true)
            try {
                const res = await fetch('/api/reading-history')
                if (res.ok) {
                    const data = await res.json()
                    setHistory(data.history || [])
                }
            } catch (e) { }
            setHistoryLoading(false)
        }

        loadNotifications()
        loadFavorites()
        loadHistory()
    }, [status])

    const handleEditProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Erro ao atualizar perfil')
            } else {
                setSuccess('Perfil atualizado com sucesso!')
                await update()
                setProfileData(data.user)
                setTimeout(() => {
                    setIsEditOpen(false)
                    setSuccess('')
                }, 1200)
            }
        } catch (err) {
            setError('Erro ao atualizar perfil')
        } finally {
            setLoading(false)
        }
    }

    if (status === 'loading' || isFetchingProfile) {
        return (
            <>
                <Header />
                <div className="min-h-screen bg-[#1a1625] flex items-center justify-center">
                    <div className="text-white text-xl">Carregando...</div>
                </div>
            </>
        )
    }

    if (!session?.user || !profileData) return null

    return (
        <>
            <Header />
            <div className="min-h-screen bg-[#100b14] pb-16">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="pt-12 flex flex-col items-center text-center">
                        <Avatar className="h-36 w-36 border-2 border-purple-600/40">
                            <AvatarImage src={profileData.image || ''} alt={profileData.name ? `${profileData.name} avatar` : 'User avatar'} />
                            <AvatarFallback aria-hidden="true" className="bg-purple-600 text-white text-4xl">
                                {profileData.name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>

                        <h1 className="text-4xl font-bold text-white mt-6">{profileData.name || 'Usuário'}</h1>
                        <p className="text-white/60 mt-2">Avid reader and webtoon enthusiast. Always on the lookout for new stories to dive into.</p>
                        <p className="text-white/40 mt-1">Joined {new Date(profileData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>

                        <div className="mt-6">
                            <Button onClick={() => setIsEditOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2">
                                Edit Profile
                            </Button>
                        </div>
                    </div>

                    <div className="mt-10">
                        <Tabs
                            items={[
                                { key: 'favorites', label: 'Favorites' },
                                { key: 'history', label: 'Reading History' },
                                { key: 'lists', label: 'Reading Lists' },
                                { key: 'notifications', label: 'Notifications' },
                            ]}
                            value={activeTab}
                            onChange={(k) => setActiveTab(k as any)}
                            panels={{
                                notifications: (
                                    <div role="region" aria-live="polite" aria-label="Notifications list">
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-xl font-semibold text-white">Notifications</h2>
                                            <div className="text-sm text-white/60">
                                                <button onClick={async () => {
                                                    try {
                                                        const res = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllAsRead: true }) })
                                                        if (res.ok) {
                                                            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
                                                        }
                                                    } catch (e) { }
                                                }} className="mr-4">Mark all as read</button>
                                                <button onClick={async () => {
                                                    try {
                                                        const res = await fetch('/api/notifications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearAll: true }) })
                                                        if (res.ok) {
                                                            setNotifications([])
                                                        }
                                                    } catch (e) { }
                                                }}>Clear all</button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {notificationsLoading && Array.from({ length: 3 }).map((_, i) => (
                                                <div key={i} className="flex items-start justify-between bg-[#0f0b14] border border-white/5 rounded-lg p-4">
                                                    <div className="flex items-start gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-white/6 animate-pulse" />
                                                        <div className="flex-1">
                                                            <div className="h-4 bg-white/6 rounded w-3/4 animate-pulse" />
                                                            <div className="h-3 bg-white/6 rounded w-1/2 mt-2 animate-pulse" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {!notificationsLoading && notifications.length === 0 && (
                                                <p className="text-white/60">No notifications</p>
                                            )}

                                            {!notificationsLoading && notifications.map((n) => (
                                                <div key={n.id} className="flex items-start justify-between bg-[#0f0b14] border border-white/5 rounded-lg p-4">
                                                    <div className="flex items-start gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-white">{/* icon placeholder */}</div>
                                                        <div>
                                                            <p className="text-white font-medium">{n.title}</p>
                                                            <p className="text-white/60 text-sm">{n.message}</p>
                                                            <p className="text-white/40 text-xs mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {!n.isRead && <button aria-label={`Mark notification ${n.title} as read`} onClick={async () => {
                                                            try {
                                                                await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: n.id }) })
                                                                setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x))
                                                            } catch (e) { }
                                                        }} className="text-white/60">✓</button>}
                                                        <button aria-label={`Delete notification ${n.title}`} onClick={async () => {
                                                            try {
                                                                await fetch('/api/notifications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: n.id }) })
                                                                setNotifications(prev => prev.filter(x => x.id !== n.id))
                                                            } catch (e) { }
                                                        }} className="text-white/60">✕</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ),

                                favorites: (
                                    <div>
                                        <h2 className="text-xl font-semibold text-white mb-4">Favorites</h2>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {favoritesLoading && Array.from({ length: 4 }).map((_, i) => (
                                                <div key={i} className="flex flex-col items-start">
                                                    <div className="w-full h-40 bg-white/6 rounded-lg animate-pulse" />
                                                    <div className="h-3 w-3/4 bg-white/6 rounded mt-2 animate-pulse" />
                                                </div>
                                            ))}

                                            {!favoritesLoading && favorites.length === 0 && <p className="text-white/60">No favorites yet</p>}
                                            {!favoritesLoading && favorites.map(f => (
                                                <div key={f.id} className="flex flex-col items-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500" tabIndex={0}>
                                                    <div className="w-full h-40 bg-white/5 rounded-lg overflow-hidden">
                                                        <img src={f.webtoon.coverImage} alt={f.webtoon.title} className="w-full h-full object-cover" />
                                                    </div>
                                                    <p className="text-white/80 text-sm mt-2">{f.webtoon.title}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ),

                                history: (
                                    <div>
                                        <h2 className="text-xl font-semibold text-white mb-4">Reading History</h2>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {historyLoading && Array.from({ length: 4 }).map((_, i) => (
                                                <div key={i} className="flex flex-col items-start">
                                                    <div className="w-full h-40 bg-white/6 rounded-lg animate-pulse" />
                                                    <div className="h-3 w-3/4 bg-white/6 rounded mt-2 animate-pulse" />
                                                </div>
                                            ))}

                                            {!historyLoading && history.length === 0 && <p className="text-white/60">No history yet</p>}
                                            {!historyLoading && history.map(h => (
                                                <div key={h.id} className="flex flex-col items-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500" tabIndex={0}>
                                                    <div className="w-full h-40 bg-white/5 rounded-lg overflow-hidden">
                                                        <img src={h.webtoon.coverImage} alt={h.webtoon.title} className="w-full h-full object-cover" />
                                                    </div>
                                                    <p className="text-white/80 text-sm mt-2">{h.webtoon.title}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ),

                                lists: (
                                    <div>
                                        <h2 className="text-xl font-semibold text-white mb-4">Reading Lists</h2>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <div className="w-full h-40 bg-white/5 rounded-lg" />
                                            <div className="w-full h-40 bg-white/5 rounded-lg" />
                                            <div className="w-full h-40 bg-white/5 rounded-lg" />
                                            <div className="w-full h-40 bg-white/5 rounded-lg" />
                                        </div>
                                    </div>
                                ),
                            }}
                        />
                    </div>
                </div>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-[#0f0b14] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Editar Perfil</DialogTitle>
                        <DialogDescription className="text-white/60">Atualize suas informações pessoais</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEditProfile} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {success && (
                            <Alert className="bg-green-500/10 border-green-500/20 text-green-400">
                                <AlertDescription>{success}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="edit-name" className="text-white">Nome</Label>
                            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="bg-white/5 border-white/10 text-white placeholder:text-white/40" required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-email" className="text-white">Email</Label>
                            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/40" required />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="border-white/10 text-white hover:bg-white/5">Cancelar</Button>
                            <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">{loading ? 'Salvando...' : 'Salvar Alterações'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
