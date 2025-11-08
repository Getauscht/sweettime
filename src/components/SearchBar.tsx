/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Result types returned by the new /api/search endpoint
type WebtoonResult = {
    type: 'webtoon'
    id: string
    title: string
    slug: string
    coverImage?: string | null
    authors?: { id: string; name: string; slug: string; avatar?: string | null }[]
    genres?: string[]
}

type AuthorResult = {
    type: 'author'
    id: string
    name: string
    slug: string
    avatar?: string | null
}

type GenreResult = {
    type: 'genre'
    id: string
    name: string
    slug: string
}

type UserResult = {
    type: 'user'
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
}

type GroupResult = {
    type: 'group'
    id: string
    name: string
    slug?: string
    description?: string | null
    _count?: { members?: number; webtoonGroups?: number }
}

type ResultItem = WebtoonResult | AuthorResult | GenreResult | UserResult | GroupResult

interface SearchBarProps {
    onClose?: () => void
    autoFocus?: boolean
}

export default function SearchBar({ onClose, autoFocus = false }: SearchBarProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<ResultItem[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const router = useRouter()
    const searchRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus()
        }
    }, [autoFocus])

    useEffect(() => {
        if (query.length < 2) {
            setResults([])
            setIsOpen(false)
            return
        }

        const controller = new AbortController()
        const id = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`, { signal: controller.signal })
                if (!res.ok) return
                const data = await res.json()

                const combined: ResultItem[] = []

                if (Array.isArray(data.webtoons)) {
                    combined.push(...data.webtoons.map((w: any) => ({ ...w, type: 'webtoon' })))
                }
                if (Array.isArray(data.authors)) {
                    combined.push(...data.authors.map((a: any) => ({ ...a, type: 'author' })))
                }
                if (Array.isArray(data.genres)) {
                    combined.push(...data.genres.map((g: any) => ({ ...g, type: 'genre' })))
                }
                if (Array.isArray(data.users)) {
                    combined.push(...data.users.map((u: any) => ({ ...u, type: 'user' })))
                }
                if (Array.isArray(data.groups)) {
                    combined.push(...data.groups.map((g: any) => ({ ...g, type: 'group' })))
                }

                setResults(combined)
                setIsOpen(true)
                setSelectedIndex(-1)
            } catch (err) {
                if ((err as any).name === 'AbortError') return
                console.error('Search error', err)
            }
        }, 200)

        return () => {
            clearTimeout(id)
            controller.abort()
        }
    }, [query])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex(prev =>
                    prev < results.length - 1 ? prev + 1 : prev
                )
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
                break
            case 'Enter':
                e.preventDefault()
                if (selectedIndex >= 0) {
                    handleSelectResult(results[selectedIndex])
                } else if (query.trim()) {
                    router.push(`/search?q=${encodeURIComponent(query)}`)
                    setIsOpen(false)
                    if (onClose) onClose()
                }
                break
            case 'Escape':
                setIsOpen(false)
                break
        }
    }

    const handleSelectResult = (result: ResultItem) => {
        if ((result as WebtoonResult).type === 'webtoon') {
            router.push(`/obra/${(result as WebtoonResult).slug}`)
        } else if ((result as AuthorResult).type === 'author') {
            router.push(`/author/${(result as AuthorResult).slug}`)
        } else if ((result as GenreResult).type === 'genre') {
            // route to search filtered by genre
            router.push(`/search?q=${encodeURIComponent((result as GenreResult).name)}`)
        } else if ((result as UserResult).type === 'user') {
            router.push(`/profile/${(result as UserResult).id}`)
        } else if ((result as GroupResult).type === 'group') {
            router.push(`/groups/${(result as GroupResult).id}`)
        }

        setIsOpen(false)
        setQuery('')
        if (onClose) onClose()
    }

    const handleClear = () => {
        setQuery('')
        setResults([])
        setIsOpen(false)
        inputRef.current?.focus()
    }

    return (
        <div ref={searchRef} className="relative w-full">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" suppressHydrationWarning={true} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Buscar"
                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {query && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="h-4 w-4 text-white/60" suppressHydrationWarning={true} />
                    </button>
                )}
            </div>

            {/* Autocomplete Dropdown */}
            {isOpen && results.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-[#0f0b14] border border-white/10 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-50">
                    {results.map((result, index) => {
                        const isSelected = index === selectedIndex
                        return (
                            <div
                                key={(result as any).id || (result as any).slug || index}
                                onClick={() => handleSelectResult(result)}
                                className={`flex items-center gap-3 p-3 cursor-pointer border-b border-white/5 last:border-0 transition-colors ${isSelected ? 'bg-purple-600/20' : 'hover:bg-white/5'}`}
                            >
                                <div className="w-10 h-14 rounded bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0 text-2xl">
                                    {result.type === 'webtoon' ? '📚' : result.type === 'author' ? '👤' : result.type === 'user' ? '🧑' : result.type === 'group' ? '🛡️' : '#'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {result.type === 'webtoon' && (
                                        <>
                                            <div className="font-medium truncate text-white">{(result as WebtoonResult).title}</div>
                                            <div className="text-xs text-white/60">
                                                Por {(result as WebtoonResult).authors?.map(a => a.name).join(', ') || 'Desconhecido'} • {(result as WebtoonResult).genres?.join(', ') || ''}
                                            </div>
                                        </>
                                    )}

                                    {result.type === 'user' && (
                                        <>
                                            <div className="font-medium truncate text-white">{(result as UserResult).name || (result as UserResult).email || 'Usuário'}</div>
                                            <div className="text-xs text-white/60">Usuário</div>
                                        </>
                                    )}

                                    {result.type === 'group' && (
                                        <>
                                            <div className="font-medium truncate text-white">{(result as GroupResult).name}</div>
                                            <div className="text-xs text-white/60">Grupo • {(result as GroupResult)._count?.members || 0} membros</div>
                                        </>
                                    )}

                                    {result.type === 'author' && (
                                        <>
                                            <div className="font-medium truncate text-white">{(result as AuthorResult).name}</div>
                                            <div className="text-xs text-white/60">Autor</div>
                                        </>
                                    )}

                                    {result.type === 'genre' && (
                                        <>
                                            <div className="font-medium truncate text-white">{(result as GenreResult).name}</div>
                                            <div className="text-xs text-white/60">Gênero</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {/* Search for all */}
                    {query && (
                        <div
                            onClick={() => {
                                router.push(`/search?q=${encodeURIComponent(query)}`)
                                setIsOpen(false)
                                if (onClose) onClose()
                            }}
                            className="flex items-center gap-2 p-3 cursor-pointer bg-white/5 hover:bg-white/10 transition-colors border-t border-white/10"
                        >
                            <Search className="h-4 w-4 text-white/80" suppressHydrationWarning={true} />
                            <span className="text-sm text-white/80">
                                Buscar por &quot;<span className="text-purple-400">{query}</span>&quot;
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
