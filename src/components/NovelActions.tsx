'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Heart, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * NovelActions component for novel-specific actions
 * Note: This component is kept for backward compatibility
 * It uses the legacy /api/novels endpoint for favorites
 */
export default function NovelActions({ novelId }: { novelId: string }) {
    const { data: session } = useSession()
    const router = useRouter()
    const [isFavorited, setIsFavorited] = useState(false)

    useEffect(() => {
        let mounted = true
        const fetchFav = async () => {
            try {
                const res = await fetch(`/api/novels/${novelId}/favorite`)
                if (!res.ok) return
                const data = await res.json()
                if (mounted) setIsFavorited(data.isFavorited)
            } catch (e) { }
        }
        fetchFav()
        return () => { mounted = false }
    }, [novelId])

    const toggleFavorite = async () => {
        if (!session) {
            router.push('/auth/login')
            return
        }

        try {
            const method = isFavorited ? 'DELETE' : 'POST'
            const res = await fetch(`/api/novels/${novelId}/favorite`, { method })
            if (!res.ok) throw new Error('Failed')
            const data = await res.json()
            setIsFavorited(data.isFavorited)
        } catch (e) {
            console.error('Error toggling favorite', e)
        }
    }

    return (
        <div className="flex gap-4">
            <Button onClick={toggleFavorite} variant={isFavorited ? 'default' : 'outline'}>
                <Heart className="h-4 w-4 mr-2" />
                {isFavorited ? 'Favoritado' : 'Favoritar'}
            </Button>
            <Button variant="outline">
                <Bell className="h-4 w-4 mr-2" />
                Seguir Autor
            </Button>
        </div>
    )
}
