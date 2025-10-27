'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { ArrowLeft, Users, BookOpen, Settings, Crown, Shield, Upload } from 'lucide-react'
import { GenericMarkdownRenderer } from '@/components/GenericMarkdownRenderer'

export default function GroupDetailPage() {
    const params = useParams()
    const { data: session } = useSession()
    const id = params?.id as string
    const [group, setGroup] = useState<{
        id: string;
        name: string;
        description?: string;
        members?: Array<{ user: { id: string; name?: string; email?: string; image?: string }; role: string }>;
        webtoons?: Array<{ id: string; title: string; slug: string; cover?: string }>;
        _count?: { members?: number; webtoons?: number }
    } | null>(null)
    const [loading, setLoading] = useState(true)
    const [editingDescription, setEditingDescription] = useState(false)
    const [newDescription, setNewDescription] = useState('')

    useEffect(() => {
        if (id) load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    async function load() {
        setLoading(true)
        try {
            const res = await fetch(`/api/groups/${id}`)
            if (res.ok) {
                const data = await res.json()
                setGroup(data.group)
            }
        } catch (e) {
            console.error('Failed to load group', e)
        } finally {
            setLoading(false)
        }
    }

    async function saveDescription() {
        try {
            const res = await fetch(`/api/groups/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: newDescription.trim() || null })
            })
            if (res.ok) {
                const data = await res.json()
                setGroup(prev => prev ? { ...prev, description: data.group.description } : null)
                setEditingDescription(false)
            } else {
                console.error('Failed to update description')
            }
        } catch (e) {
            console.error('Failed to update description', e)
        }
    }

    function cancelEdit() {
        setNewDescription(group?.description || '')
        setEditingDescription(false)
    }

    if (!id) return <div className="text-white">Invalid group</div>

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/groups">
                        <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Groups
                        </Button>
                    </Link>
                </div>
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-white/10 rounded w-1/3"></div>
                    <div className="h-32 bg-white/10 rounded"></div>
                    <div className="h-64 bg-white/10 rounded"></div>
                </div>
            </div>
        )
    }

    if (!group) {
        return (
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/groups">
                        <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Groups
                        </Button>
                    </Link>
                </div>
                <div className="text-center py-12">
                    <div className="text-white/60">Group not found</div>
                </div>
            </div>
        )
    }

    const userRole = group.members?.find(m => m.user.id === session?.user?.id)?.role

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'LEADER': return <Crown className="h-4 w-4 text-yellow-500" />
            case 'UPLOADER': return <Upload className="h-4 w-4 text-blue-500" />
            default: return <Shield className="h-4 w-4 text-gray-500" />
        }
    }

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'LEADER': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
            case 'UPLOADER': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/groups">
                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Groups
                    </Button>
                </Link>
            </div>

            {/* Group Header */}
            <div className="space-y-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{group.name}</h1>
                    {editingDescription ? (
                        <div className="space-y-2">
                            <Textarea
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="Describe your group's focus, goals, or community..."
                                className="bg-[#0f0b14] border-white/10 text-white placeholder:text-white/40 min-h-[100px]"
                                maxLength={500}
                            />
                            <div className="flex gap-2">
                                <Button onClick={saveDescription} className="bg-purple-600 hover:bg-purple-700">
                                    Save
                                </Button>
                                <Button variant="ghost" onClick={cancelEdit} className="text-white/70 hover:bg-white/15">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {group.description && (
                                <GenericMarkdownRenderer content={group.description} className="text-white/60 text-lg" />
                            )}
                            {userRole === 'LEADER' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setNewDescription(group.description || '')
                                        setEditingDescription(true)
                                    }}
                                    className="text-purple-400 hover:text-purple-300"
                                >
                                    {group.description ? 'Edit Description' : 'Add Description'}
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-white/60">
                        <Users className="h-5 w-5" />
                        <span>{group._count?.members || 0} members</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                        <BookOpen className="h-5 w-5" />
                        <span>{group._count?.webtoons || 0} webtoons</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    {userRole === 'LEADER' && (
                        <Link href={`/groups/${id}/members`}>
                            <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                                <Settings className="h-4 w-4" />
                                Manage Members
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Members Section */}
            <Card className="p-6 bg-[#1a1625] border-white/10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-400" />
                        Members ({group._count?.members || 0})
                    </h3>
                    {userRole === 'LEADER' && (
                        <Link href={`/groups/${id}/members`}>
                            <Button variant="ghost" size="sm" className="border border-white/20 text-white hover:bg-white/5">
                                Manage
                            </Button>
                        </Link>
                    )}
                </div>

                <div className="space-y-4">
                    {group.members && group.members.length > 0 ? (
                        group.members.slice(0, 6).map((m) => (
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
                                        <Badge className={`text-xs ${getRoleColor(m.role)}`}>
                                            <div className="flex items-center gap-1">
                                                {getRoleIcon(m.role)}
                                                {m.role.toLowerCase()}
                                            </div>
                                        </Badge>
                                    </div>
                                </div>
                                <Link href={`/profile/${m.user.id}`}>
                                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                                        View Profile
                                    </Button>
                                </Link>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-white/60">
                            No members yet
                        </div>
                    )}

                    {group.members && group.members.length > 6 && (
                        <div className="text-center">
                            <Link href={`/groups/${id}/members`}>
                                <Button variant="ghost" className="text-purple-400 hover:text-purple-300">
                                    View all {group._count?.members} members
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </Card>

            {/* Webtoons Section */}
            <Card className="p-6 bg-[#1a1625] border-white/10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-purple-400" />
                        Webtoons ({group._count?.webtoons || 0})
                    </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.webtoons && group.webtoons.length > 0 ? (
                        group.webtoons.map((w) => (
                            <Link key={w.id} href={`/webtoon/${w.slug}`}>
                                <Card className="p-4 bg-[#0f0b14] border-white/5 hover:border-purple-500/30 transition-colors group cursor-pointer">
                                    <div className="aspect-[3/4] bg-white/5 rounded mb-3 flex items-center justify-center">
                                        {w.cover ? (
                                            <img
                                                src={w.cover}
                                                alt={w.title}
                                                className="w-full h-full object-cover rounded"
                                            />
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
                        <div className="col-span-full text-center py-8 text-white/60">
                            No webtoons yet
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
