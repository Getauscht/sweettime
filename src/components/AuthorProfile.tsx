import React from 'react'
import { Button } from '@/components/ui/button'
import { Users, Share2 } from 'lucide-react'

interface AuthorSummary {
    id: string
    name: string
    avatar?: string | null
    bio?: string | null
    webtoonCount?: number
}

export default function AuthorProfile({ author, isFollowing, onToggleFollow }: { author: AuthorSummary, isFollowing: boolean, onToggleFollow: () => void }) {
    return (
        <div className="flex flex-col items-center md:items-start">
            <div className="w-40 h-40 rounded-full overflow-hidden bg-[#1a1625] flex items-center justify-center mb-4">
                {author.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={author.avatar} alt={author.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-4xl text-purple-400">{author.name.charAt(0)}</div>
                )}
            </div>

            <h1 className="text-3xl font-bold text-gray-100 mb-1">{author.name}</h1>
            <p className="text-sm text-gray-400 mb-3">{author.webtoonCount ?? 0} obra{(author.webtoonCount ?? 0) !== 1 ? 's' : ''}</p>

            <div className="flex gap-3">
                <Button onClick={onToggleFollow} variant={isFollowing ? 'default' : 'outline'}>
                    <Users className="h-4 w-4 mr-2" />
                    {isFollowing ? 'Seguindo' : 'Seguir'}
                </Button>
                <Button onClick={() => navigator.clipboard?.writeText(window.location.href)} variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                </Button>
            </div>
        </div>
    )
}
