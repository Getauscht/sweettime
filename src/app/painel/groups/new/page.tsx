'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/Toast'
import { Users, FileText } from 'lucide-react'
import Link from 'next/link'

export default function CreateGroupPage() {
    const router = useRouter()
    const { toast, ToastContainer } = useToast()
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) {
            toast('Group name is required', 'error')
            return
        }
        setLoading(true)
        try {
            const res = await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), slug: slug.trim() || undefined, description: description.trim() || undefined })
            })
            if (res.ok) {
                const data = await res.json()
                toast('Group created successfully!', 'success')
                router.push(`/groups/${data.group.id}`)
            } else {
                const err = await res.json()
                toast(err.error || 'Failed to create group', 'error')
            }
        } catch (e) {
            console.error('Failed to create group', e)
            toast('Failed to create group', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Create New Group</h1>
                    <p className="text-white/60">Start your own scanlation community</p>
                </div>
                <div className="flex gap-2">
                    {/* No buttons */}
                </div>
            </div>

            <Card className="p-8 bg-[#1a1625] border-white/10">
                <form onSubmit={handleCreate} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-white flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Group Name *
                        </Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter group name"
                            className="bg-[#0f0b14] border-white/10 text-white placeholder:text-white/40"
                            maxLength={100}
                        />
                        <p className="text-white/40 text-sm">Choose a clear, descriptive name for your group</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-white">Slug (optional)</Label>
                        <Input
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="group-slug"
                            className="bg-[#0f0b14] border-white/10 text-white placeholder:text-white/40"
                            maxLength={50}
                        />
                        <p className="text-white/40 text-sm">URL-friendly identifier. Auto-generated if left empty</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-white flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Description
                        </Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your group's focus, goals, or community..."
                            className="bg-[#0f0b14] border-white/10 text-white placeholder:text-white/40 min-h-[100px]"
                            maxLength={500}
                        />
                        <p className="text-white/40 text-sm">{description.length}/500 characters</p>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <Link href="/groups">
                            <Button type="button" variant="ghost" className="text-white hover:bg-white/15">
                                Cancel
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            className="bg-purple-600 hover:bg-purple-700 min-w-[120px]"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Group'}
                        </Button>
                    </div>
                </form>
            </Card>
            <ToastContainer />
        </div>
    )
}
