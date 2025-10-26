'use client'

import { useState, useRef, useEffect } from 'react'
import { Textarea } from './textarea'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'

interface User {
    id: string
    name: string | null
    email: string
    image: string | null
}

interface MentionInputProps {
    value: string
    onChange: (value: string, mentions: string[]) => void
    placeholder?: string
    className?: string
}

export function MentionInput({ value, onChange, placeholder, className }: MentionInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [suggestions, setSuggestions] = useState<User[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [mentionSearch, setMentionSearch] = useState('')
    const [cursorPosition, setCursorPosition] = useState(0)
    const [mentions, setMentions] = useState<string[]>([])
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)

    // Fetch user suggestions
    useEffect(() => {
        if (mentionSearch.length < 2) {
            setSuggestions([])
            setShowSuggestions(false)
            return
        }

        const fetchUsers = async () => {
            try {
                const res = await fetch(`/api/users/search?query=${encodeURIComponent(mentionSearch)}`)
                const data = await res.json()
                setSuggestions(data.users || [])
                setShowSuggestions(data.users?.length > 0)
                setSelectedIndex(0)
            } catch (error) {
                console.error('Error fetching users:', error)
            }
        }

        const debounce = setTimeout(fetchUsers, 300)
        return () => clearTimeout(debounce)
    }, [mentionSearch])

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value
        const cursorPos = e.target.selectionStart

        // Check if user is typing @ mention
        const textBeforeCursor = newValue.substring(0, cursorPos)
        const lastAtSymbol = textBeforeCursor.lastIndexOf('@')

        if (lastAtSymbol !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1)
            if (!textAfterAt.includes(' ') && textAfterAt.length > 0) {
                setMentionSearch(textAfterAt)
                setCursorPosition(cursorPos)
            } else if (textAfterAt.length === 0) {
                setMentionSearch('')
                setShowSuggestions(false)
            }
        } else {
            setMentionSearch('')
            setShowSuggestions(false)
        }

        onChange(newValue, mentions)
    }

    const insertMention = (user: User) => {
        const textBeforeCursor = value.substring(0, cursorPosition)
        const textAfterCursor = value.substring(cursorPosition)
        const lastAtSymbol = textBeforeCursor.lastIndexOf('@')

        if (lastAtSymbol !== -1) {
            const newValue =
                textBeforeCursor.substring(0, lastAtSymbol) +
                `@${user.name} ` +
                textAfterCursor

            const newMentions = [...mentions, user.id]
            setMentions(newMentions)
            onChange(newValue, newMentions)
            setShowSuggestions(false)
            setMentionSearch('')

            // Focus back on textarea
            setTimeout(() => {
                textareaRef.current?.focus()
                const newCursorPos = lastAtSymbol + (user.name?.length || 0) + 2
                textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
            }, 0)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showSuggestions) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex((prev) => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter' && suggestions.length > 0) {
            e.preventDefault()
            insertMention(suggestions[selectedIndex])
        } else if (e.key === 'Escape') {
            setShowSuggestions(false)
        }
    }

    return (
        <div className="relative">
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || 'Escreva um comentário... Suporta Markdown.'}
                className={className}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
            />

            {showSuggestions && suggestions.length > 0 && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-2 bg-[#1a1625] border border-purple-600/30 rounded-lg shadow-lg overflow-hidden"
                >
                    <div className="py-1">
                        {suggestions.map((user, index) => (
                            <button
                                key={user.id}
                                onClick={() => insertMention(user)}
                                className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-purple-600/20 transition-colors ${index === selectedIndex ? 'bg-purple-600/20' : ''
                                    }`}
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.image || undefined} />
                                    <AvatarFallback className="bg-purple-600/30 text-sm">
                                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-medium text-gray-100">
                                        {user.name || 'Sem nome'}
                                    </span>
                                    <span className="text-xs text-gray-400">{user.email}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
