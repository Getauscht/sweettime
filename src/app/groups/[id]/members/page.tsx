'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/Toast'
import { ArrowLeft, Search, Users, Crown, Shield, Upload, UserPlus, UserMinus } from 'lucide-react'
import Link from 'next/link'

export default function GroupMembersPage() {
    const params = useParams()
    const { data: session } = useSession()
    const id = params?.id as string
    const [members, setMembers] = useState<Array<{ user: { id: string; name?: string; email?: string; image?: string }; role: string }>>([])
    const [loading, setLoading] = useState(false)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [newUserId, setNewUserId] = useState('')
    const [newRole, setNewRole] = useState('MEMBER')
    const [query, setQuery] = useState('')
    const [suggestions, setSuggestions] = useState<Array<{ id: string; name?: string; email?: string; image?: string }>>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [debounceTimer, setDebounceTimer] = useState<number | null>(null)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [pendingAdd, setPendingAdd] = useState<{ userId: string; role: string } | null>(null)
    const [inviteOpen, setInviteOpen] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const { toast, ToastContainer } = useToast()

    useEffect(() => {
        if (id) load() // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    async function load() {
        setLoading(true)
        try {
            const res = await fetch(`/api/groups/${id}/members`)
            if (res.ok) {
                const data = await res.json()
                setMembers(data.members || [])
                setUserRole(data.members?.find((m: any) => m.user.id === session?.user?.id)?.role || null)
            } else {
                const err = await res.json()
                console.error('Failed to load members', err)
            }
        } catch (e) {
            console.error('Failed to load members', e)
        } finally { setLoading(false) }
    }

    async function addMember() {
        if (!newUserId) {
            // If no user selected but query looks like email, try to search and auto-select
            if (query && query.includes('@') && query.length >= 3) {
                try {
                    const res = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`)
                    if (res.ok) {
                        const data = await res.json()
                        if (data.users && data.users.length > 0) {
                            setNewUserId(data.users[0].id)
                        } else {
                            // Offer to invite by email
                            setInviteEmail(query)
                            setInviteOpen(true)
                            return
                        }
                    }
                } catch (err) {
                    console.error('Search by email failed', err)
                    toast('Failed searching for user', 'error')
                    return
                }
            } else {
                toast('Please select a user or enter an email to invite', 'info')
                return
            }
        }
        try {
            // Open confirmation modal
            setPendingAdd({ userId: newUserId, role: newRole })
            setConfirmOpen(true)
            return
        } catch (e) {
            console.error('Failed to add member', e)
            toast('Failed to add member', 'error')
        }
    }

    async function confirmAdd() {
        if (!pendingAdd) return
        try {
            const res = await fetch(`/api/groups/${id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: pendingAdd.userId, role: pendingAdd.role }) })
            if (res.ok) {
                await load()
                setNewUserId('')
                setQuery('')
                setSuggestions([])
                setShowSuggestions(false)
                toast('Member added', 'success')
                setConfirmOpen(false)
                setPendingAdd(null)
            } else {
                const err = await res.json()
                console.error('Failed to add member', err)
                toast(err.error || 'Failed to add member', 'error')
            }
        } catch (e) {
            console.error('Failed to add member', e)
            toast('Failed to add member', 'error')
        }
    }

    // Search users by query (debounced)
    function scheduleSearch(q: string) {
        setQuery(q)
        if (debounceTimer) window.clearTimeout(debounceTimer)
        const t = window.setTimeout(async () => {
            if (!q || q.length < 2) {
                setSuggestions([])
                setShowSuggestions(false)
                return
            }
            try {
                const res = await fetch(`/api/users/search?query=${encodeURIComponent(q)}`)
                if (res.ok) {
                    const data = await res.json()
                    setSuggestions(data.users || [])
                    setShowSuggestions(true)
                }
            } catch (err) {
                console.error('User search failed', err)
            }
        }, 300)
        setDebounceTimer(t)
    }

    async function removeMember(userId: string) {
        try {
            const res = await fetch(`/api/groups/${id}/members`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
            if (res.ok) await load()
            else {
                const err = await res.json()
                console.error('Failed to remove member', err)
            }
        } catch (e) { console.error('Failed to remove member', e) }
    }

    if (!id) return <div className="text-white">Invalid group</div>

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
                <Link href={`/groups/${id}`}>
                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Group
                    </Button>
                </Link>
            </div>

            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Manage Members</h1>
                <p className="text-white/60">Add or remove members from this scanlation group</p>
            </div>

            {/* Add Member Section */}
            {userRole === 'LEADER' && (
                <Card className="p-6 bg-[#1a1625] border-white/10">
                    <div className="flex items-center gap-2 mb-6">
                        <UserPlus className="h-5 w-5 text-purple-400" />
                        <h3 className="text-xl font-semibold text-white">Add Member</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2 relative">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                                <Input
                                    placeholder="Search user by name or email"
                                    value={query || newUserId}
                                    onChange={(e) => scheduleSearch(e.target.value)}
                                    onFocus={() => setShowSuggestions(suggestions.length > 0)}
                                    className="pl-10 bg-[#0f0b14] border-white/10 text-white placeholder:text-white/40"
                                />
                            </div>
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute z-20 left-0 right-0 mt-1 bg-[#1a1625] border border-white/10 rounded-md max-h-48 overflow-y-auto">
                                    {suggestions.map(u => (
                                        <div key={u.id} className="px-3 py-2 hover:bg-white/5 cursor-pointer flex items-center gap-3" onClick={() => { setNewUserId(u.id); setQuery(''); setShowSuggestions(false); setSuggestions([]) }}>
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={u.image || ''} />
                                                <AvatarFallback className="bg-purple-600 text-white text-xs">
                                                    {u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="text-white text-sm">{u.name || u.email}</div>
                                                <div className="text-white/60 text-xs">{u.email}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="px-3 py-2 bg-[#0f0b14] border border-white/10 rounded-lg text-white"
                        >
                            <option value="LEADER">Leader</option>
                            <option value="MEMBER">Member</option>
                            <option value="UPLOADER">Uploader</option>
                        </select>
                        <Button onClick={addMember} className="bg-purple-600 hover:bg-purple-700">
                            Add Member
                        </Button>
                    </div>
                </Card>
            )}

            {/* Members List */}
            <Card className="p-6 bg-[#1a1625] border-white/10">
                <div className="flex items-center gap-2 mb-6">
                    <Users className="h-5 w-5 text-purple-400" />
                    <h3 className="text-xl font-semibold text-white">Current Members ({members.length})</h3>
                </div>

                <div className="space-y-4">
                    {loading && <div className="text-white/60">Loading...</div>}
                    {!loading && members.length === 0 && (
                        <div className="text-center py-8 text-white/60">
                            No members yet
                        </div>
                    )}
                    {members.map(m => (
                        <div key={m.user.id} className="flex items-center justify-between p-4 rounded-lg bg-[#0f0b14] border border-white/5">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={m.user.image || ''} />
                                    <AvatarFallback className="bg-purple-600 text-white">
                                        {m.user.name?.[0]?.toUpperCase() || m.user.email?.[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="text-white font-medium">
                                        {m.user.name || m.user.email}
                                    </div>
                                    <Badge className={`text-xs mt-1 ${getRoleColor(m.role)}`}>
                                        <div className="flex items-center gap-1">
                                            {getRoleIcon(m.role)}
                                            {m.role.toLowerCase()}
                                        </div>
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href={`/profile/${m.user.id}`}>
                                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                                        View Profile
                                    </Button>
                                </Link>
                                {userRole === 'LEADER' && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeMember(m.user.id)}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    >
                                        <UserMinus className="h-4 w-4 mr-2" />
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <ToastContainer />

            {/* Confirm add dialog */}
            <Dialog open={confirmOpen} onOpenChange={(open) => { if (!open) { setConfirmOpen(false); setPendingAdd(null) } }}>
                <DialogContent className="bg-[#1a1625] border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white">Confirm add member</DialogTitle>
                    </DialogHeader>
                    <p className="text-white/70">Are you sure you want to add this user as {pendingAdd?.role.toLowerCase()}?</p>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setConfirmOpen(false); setPendingAdd(null) }} className="text-white/70 hover:bg-white/15">
                            Cancel
                        </Button>
                        <Button onClick={confirmAdd} className="bg-purple-600 hover:bg-purple-700">
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Invite dialog */}
            <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) setInviteOpen(false) }}>
                <DialogContent className="bg-[#1a1625] border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white">Invite by email</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="email@example.com"
                            className="bg-[#0f0b14] border-white/10 text-white placeholder:text-white/40"
                        />
                        <p className="text-white/70 text-sm">An invite will be sent to this email with a link to join the group.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setInviteOpen(false)} className="text-white/70 hover:bg-white/15">
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                try {
                                    const res = await fetch(`/api/groups/${id}/invites`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) })
                                    if (res.ok) {
                                        toast('Invite sent', 'success')
                                        setInviteOpen(false)
                                        setInviteEmail('')
                                    } else {
                                        const err = await res.json()
                                        toast(err.error || 'Failed to create invite', 'error')
                                    }
                                } catch (err) {
                                    console.error('Invite failed', err)
                                    toast('Invite failed', 'error')
                                }
                            }}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            Send Invite
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
