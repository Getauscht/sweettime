/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Tabs from '@/components/ui/tabs'

interface PublicProfileData {
    id: string
    name: string | null
    image: string | null
    createdAt: string
    stats?: {
        favoritesCount: number
        commentsCount: number
        readingHistoryCount: number
    }
}

interface Favorite {
    id: string
    webtoon: {
        id: string
        title: string
        coverImage: string
        slug: string
    }
}

export default function PublicProfilePage() {
    const params = useParams()
    const userId = params?.id as string
    const [profileData, setProfileData] = useState<PublicProfileData | null>(null)
    const [isFetchingProfile, setIsFetchingProfile] = useState(true)
    const [activeTab, setActiveTab] = useState<'favorites' | 'about'>('about')
    const [favorites, setFavorites] = useState<Favorite[]>([])
    const [favoritesLoading, setFavoritesLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchProfile = async () => {
            setIsFetchingProfile(true)
            try {
                const res = await fetch(`/api/users/${userId}`)
                if (res.ok) {
                    const data = await res.json()
                    setProfileData(data.user)
                } else {
                    setError('Usuário não encontrado.')
                }
            } catch (e) {
                setError('Erro ao carregar o perfil.')
            } finally {
                setIsFetchingProfile(false)
            }
        }

        if (userId) {
            fetchProfile()
        }
    }, [userId])

    useEffect(() => {
        if (activeTab === 'favorites' && profileData && favorites.length === 0) {
            loadFavorites()
        }
    }, [activeTab, profileData])

    const loadFavorites = async () => {
        setFavoritesLoading(true)
        try {
            const res = await fetch(`/api/users/${userId}/favorites`)
            if (res.ok) {
                const data = await res.json()
                setFavorites(data.favorites || [])
            }
        } catch (e) {
            // Ignore errors for public profiles
        } finally {
            setFavoritesLoading(false)
        }
    }

    if (isFetchingProfile) {
        return (
            <div className="min-h-screen bg-[#0f0a1a]">
                <Header />
                <div className="container mx-auto px-4 py-8">
                    <div className="text-white">Carregando...</div>
                </div>
            </div>
        )
    }

    if (error || !profileData) {
        return (
            <div className="min-h-screen bg-[#0f0a1a]">
                <Header />
                <div className="container mx-auto px-4 py-8">
                    <div className="text-white">{error || 'Usuário não encontrado'}</div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#100b14] pb-16">
            <Header />
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="pt-12 flex flex-col items-center text-center">
                    <Avatar className="h-36 w-36 border-2 border-purple-600/40">
                        <AvatarImage src={profileData.image || ''} alt={profileData.name ? `${profileData.name} avatar` : 'User avatar'} />
                        <AvatarFallback className="bg-purple-600 text-white text-4xl">
                            {profileData.name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>

                    <h1 data-page-title={profileData.name || 'Usuário'} className="text-4xl font-bold text-white mt-6">{profileData.name || 'Usuário'}</h1>
                    <p className="text-white/60 mt-2">Leitor ativo e entusiasta de webtoons.</p>
                    <p className="text-white/40 mt-1">Membro desde {new Date(profileData.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                </div>

                <div className="mt-10">
                    <Tabs
                        items={[
                            { key: 'about', label: 'Sobre' },
                            { key: 'favorites', label: 'Favoritos' },
                        ]}
                        value={activeTab}
                        onChange={(k) => setActiveTab(k as any)}
                        panels={{
                            about: (
                                <div className="text-center">
                                    <h2 className="text-xl font-semibold text-white mb-4">Sobre {profileData.name || 'este usuário'}</h2>
                                    <p className="text-white/60">Este usuário faz parte da comunidade SweetTime e aprecia ler webtoons.</p>
                                    {profileData.stats && (
                                        <div className="mt-6 grid grid-cols-3 gap-4 max-w-md mx-auto">
                                            <div className="bg-[#0f0b14] border border-white/5 rounded-lg p-4">
                                                <div className="text-2xl font-bold text-purple-400">{profileData.stats.favoritesCount}</div>
                                                <div className="text-white/60 text-sm">Favoritos</div>
                                            </div>
                                            <div className="bg-[#0f0b14] border border-white/5 rounded-lg p-4">
                                                <div className="text-2xl font-bold text-purple-400">{profileData.stats.commentsCount}</div>
                                                <div className="text-white/60 text-sm">Comentários</div>
                                            </div>
                                            <div className="bg-[#0f0b14] border border-white/5 rounded-lg p-4">
                                                <div className="text-2xl font-bold text-purple-400">{profileData.stats.readingHistoryCount}</div>
                                                <div className="text-white/60 text-sm">Histórico</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ),

                            favorites: (
                                <div>
                                    <h2 className="text-xl font-semibold text-white mb-4">Favoritos de {profileData.name || 'Usuário'}</h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {favoritesLoading && Array.from({ length: 4 }).map((_, i) => (
                                            <div key={i} className="flex flex-col items-start">
                                                <div className="w-full h-40 bg-white/6 rounded-lg animate-pulse" />
                                                <div className="h-3 w-3/4 bg-white/6 rounded mt-2 animate-pulse" />
                                            </div>
                                        ))}

                                        {!favoritesLoading && favorites.length === 0 && <p className="text-white/60">Nenhum favorito público</p>}
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
                        }}
                    />
                </div>
            </div>
        </div>
    )
} 