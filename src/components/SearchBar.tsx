'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SearchResult {
    id: number
    title: string
    author: string
    genre: string
    emoji: string
}

const mockSearchResults: SearchResult[] = [
    { id: 1, title: 'The Crimson Corsair', author: 'Red-Beard', genre: 'Adventure', emoji: '🏴‍☠️' },
    { id: 2, title: 'The Lost Kingdom', author: 'Ancient Scribe', genre: 'Action', emoji: '🏛️' },
    { id: 3, title: 'The Silent Symphony', author: 'Quiet Quill', genre: 'Slice of Life', emoji: '🎵' },
    { id: 4, title: 'Theology of Time', author: 'Cosmic Writer', genre: 'Fantasy', emoji: '⏰' },
    { id: 5, title: 'The Dragon\'s Heart', author: 'Fire Pen', genre: 'Fantasy', emoji: '🐉' },
    { id: 6, title: 'Thunder Strike', author: 'Storm Master', genre: 'Action', emoji: '⚡' }
]

interface SearchBarProps {
    onClose?: () => void
    autoFocus?: boolean
}

export default function SearchBar({ onClose, autoFocus = false }: SearchBarProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
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

        // Simulate search
        const filtered = mockSearchResults.filter(item =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.author.toLowerCase().includes(query.toLowerCase())
        )
        setResults(filtered)
        setIsOpen(true)
        setSelectedIndex(-1)
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

    const handleSelectResult = (result: SearchResult) => {
        router.push(`/webtoon/${result.id}`)
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search"
                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {query && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="h-4 w-4 text-white/60" />
                    </button>
                )}
            </div>

            {/* Autocomplete Dropdown */}
            {isOpen && results.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-[#0f0b14] border border-white/10 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-50">
                    {results.map((result, index) => (
                        <div
                            key={result.id}
                            onClick={() => handleSelectResult(result)}
                            className={`flex items-center gap-3 p-3 cursor-pointer border-b border-white/5 last:border-0 transition-colors ${index === selectedIndex
                                ? 'bg-purple-600/20'
                                : 'hover:bg-white/5'
                                }`}
                        >
                            <div className="w-10 h-14 rounded bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0 text-2xl">
                                {result.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-white">{result.title}</div>
                                <div className="text-xs text-white/60">
                                    By {result.author} • {result.genre}
                                </div>
                            </div>
                        </div>
                    ))}

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
                            <Search className="h-4 w-4 text-white/80" />
                            <span className="text-sm text-white/80">
                                Search for &quot;<span className="text-purple-400">{query}</span>&quot;
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
