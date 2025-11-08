/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, BookOpen } from 'lucide-react'
import { GenericMarkdownRenderer } from '@/components/GenericMarkdownRenderer'

export default function GroupPublicView() {
    const params = useParams()
    const id = params?.id as string
    const [group, setGroup] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    const { data: session } = useSession()
    const [editingSocials, setEditingSocials] = useState(false)
    const [socialForm, setSocialForm] = useState<any>({ x: '', discord: '', facebook: '', instagram: '', website: '' })
    const [savingSocials, setSavingSocials] = useState(false)

    useEffect(() => {
        if (!id) return
        setLoading(true)
        fetch(`/api/groups/${id}`)
            .then(res => res.ok ? res.json() : Promise.reject('failed'))
            .then(data => {
                const g = data.group
                if (g && g.webtoonGroups) {
                    const webtoons = g.webtoonGroups.map((wg: any) => wg.webtoon).filter(Boolean)
                    g.webtoons = webtoons
                    g._count = g._count || {}
                    g._count.webtoons = g._count.webtoons || webtoons.length
                }
                setGroup(g)
            })
            .catch(err => console.error('Failed to load group', err))
            .finally(() => setLoading(false))
    }, [id])

    if (!id) return <div className="text-white">Grupo inválido</div>

    if (loading) return (
        <div className="min-h-screen bg-[#0f0b14]">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="text-center text-white">Carregando...</div>
            </main>
        </div>
    )

    if (!group) return (
        <div className="min-h-screen bg-[#0f0b14]">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="text-center text-white">Grupo não encontrado</div>
            </main>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#0f0b14]">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">{group.name}</h1>
                            <p className="text-white/60">Perfil público do grupo</p>
                        </div>
                        <div>
                            <Link href="/groups">
                                <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                                    Voltar para Grupos
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {group.description && (
                            <GenericMarkdownRenderer content={group.description} className="text-white/60 text-lg" />
                        )}

                        {/* Social links */}
                        {group.socialLinks && Object.keys(group.socialLinks).length > 0 && (
                            <div className="mt-4 flex items-center gap-3">
                                {group.socialLinks.x && (
                                    <a href={group.socialLinks.x} target="_blank" rel="noreferrer" className="text-white/80 hover:text-white">X</a>
                                )}
                                {group.socialLinks.discord && (
                                    <a href={group.socialLinks.discord} target="_blank" rel="noreferrer" className="text-white/80 hover:text-white">💬 Discord</a>
                                )}
                                {group.socialLinks.facebook && (
                                    <a href={group.socialLinks.facebook} target="_blank" rel="noreferrer" className="text-white/80 hover:text-white">📘 Facebook</a>
                                )}
                                {group.socialLinks.instagram && (
                                    <a href={group.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-white/80 hover:text-white">📸 Instagram</a>
                                )}
                                {group.socialLinks.website && (
                                    <a href={group.socialLinks.website} target="_blank" rel="noreferrer" className="text-white/80 hover:text-white">🔗 Site</a>
                                )}
                            </div>
                        )}

                        {/* Edit socials (owners) */}
                        {session?.user && group.members && (
                            (() => {
                                const me = group.members.find((m: any) => m.user?.id === (session.user as any).id)
                                const isLeader = me?.role === 'LEADER'
                                return isLeader ? (
                                    <div className="mt-4">
                                        {!editingSocials ? (
                                            <Button variant="outline" size="sm" onClick={() => { setSocialForm(group.socialLinks || { x: '', discord: '', facebook: '', instagram: '', website: '' }); setEditingSocials(true) }}>Editar redes sociais</Button>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <Input placeholder="X (https://x.com/...)" value={socialForm.x || ''} onChange={(e: any) => setSocialForm((s: any) => ({ ...s, x: e.target.value }))} />
                                                    <Input placeholder="Discord (link de convite)" value={socialForm.discord || ''} onChange={(e: any) => setSocialForm((s: any) => ({ ...s, discord: e.target.value }))} />
                                                    <Input placeholder="Facebook" value={socialForm.facebook || ''} onChange={(e: any) => setSocialForm((s: any) => ({ ...s, facebook: e.target.value }))} />
                                                    <Input placeholder="Instagram" value={socialForm.instagram || ''} onChange={(e: any) => setSocialForm((s: any) => ({ ...s, instagram: e.target.value }))} />
                                                    <Input className="col-span-full" placeholder="Site" value={socialForm.website || ''} onChange={(e: any) => setSocialForm((s: any) => ({ ...s, website: e.target.value }))} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" onClick={async () => {
                                                        setSavingSocials(true)
                                                        try {
                                                            const res = await fetch(`/api/groups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ socialLinks: socialForm }) })
                                                            if (!res.ok) throw new Error('Failed')
                                                            const data = await res.json()
                                                            setGroup((g: any) => ({ ...g, socialLinks: data.group.socialLinks }))
                                                            setEditingSocials(false)
                                                        } catch (err) {
                                                            console.error('Failed to save socials', err)
                                                            alert('Falha ao salvar redes sociais')
                                                        } finally {
                                                            setSavingSocials(false)
                                                        }
                                                    }}>{savingSocials ? 'Salvando...' : 'Salvar'}</Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setEditingSocials(false)}>Cancelar</Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : null
                            })()
                        )}

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-white/60">
                                <Users className="h-5 w-5" />
                                <span>{group._count?.members || 0} membros</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/60">
                                <BookOpen className="h-5 w-5" />
                                <span>{group._count?.webtoons || 0} webtoons</span>
                            </div>
                        </div>
                    </div>

                    <Card className="p-6 bg-[#1a1625] border-white/10">
                        <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                            <Users className="h-5 w-5 text-purple-400" />
                            Membros
                        </h3>

                        <div className="space-y-4">
                            {group.members && group.members.length > 0 ? (
                                group.members.slice(0, 12).map((m: any) => (
                                    <div key={m.user.id} className="flex items-center justify-between p-3 rounded-lg bg-[#0f0b14] border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={m.user.image || ''} />
                                                <AvatarFallback className="bg-purple-600 text-white">
                                                    {m.user.name?.[0]?.toUpperCase() || m.user.email?.[0]?.toUpperCase() || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="text-white font-medium">
                                                    {m.user.name || m.user.email}
                                                </div>
                                            </div>
                                        </div>
                                        <Link href={`/profile/${m.user.id}`}>
                                            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                                                Ver Perfil
                                            </Button>
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-white/60">Nenhum membro ainda</div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6 bg-[#1a1625] border-white/10">
                        <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                            <BookOpen className="h-5 w-5 text-purple-400" />
                            Webtoons
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.webtoons && group.webtoons.length > 0 ? (
                                group.webtoons.map((w: any) => (
                                    <Link key={w.id} href={`/obra/${w.slug}`}>
                                        <Card className="p-4 bg-[#0f0b14] border-white/5 hover:border-purple-500/30 transition-colors group cursor-pointer">
                                            <div className="aspect-[3/4] bg-white/5 rounded mb-3 flex items-center justify-center">
                                                {w.cover ? (
                                                    <img src={w.cover} alt={w.title} className="w-full h-full object-cover rounded" />
                                                ) : (
                                                    <BookOpen className="h-8 w-8 text-white/20" />
                                                )}
                                            </div>
                                            <h4 className="text-white font-medium group-hover:text-purple-300 transition-colors line-clamp-2">
                                                {w.title}
                                            </h4>
                                        </Card>
                                    </Link>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-8 text-white/60">Nenhum webtoon ainda</div>
                            )}
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    )
}
