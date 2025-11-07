'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ThumbsUp, MessageCircle, Share2, MoreVertical, Bold, Italic, Strikethrough, AtSign, Trash2, Flag, Eye, EyeOff, Underline } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'

interface Mention {
    id: string
    user: {
        id: string
        name: string | null
    }
}

interface Comment {
    id: string
    content: string
    likes: number
    createdAt: string
    user: {
        id: string
        name: string | null
        image: string | null
    }
    mentions: Mention[]
    replyCount?: number
    liked?: boolean
    replies?: Comment[]
    deletedAt?: string | null
    deletedBy?: string | null
}

interface Props {
    webtoonId?: string
    chapterId?: string
    novelId?: string
    novelChapterId?: string
}

/**
 * CommentsSection
 * - Supports fetching comments filtered by webtoonId or chapterId
 * - Allows authenticated users to post comments (mentions optional)
 * - Designed to be used on both webtoon page (webtoon-level comments) and chapter page (chapter-level comments)
 */
export default function CommentsSection({ webtoonId, chapterId, novelId, novelChapterId }: Props) {
    const { data: session } = useSession()
    const currentUser = session?.user as { id?: string; name?: string | null; image?: string | null } | undefined
    const isCurrentUser = (userId?: string | null) => {
        try {
            return !!(userId && currentUser?.id && String(userId) === String(currentUser.id))
        } catch { return false }
    }

    // Recursive renderer for comments up to level 3
    const renderComment = (comment: Comment, level: number = 0) => {
        const isDeleted = !!comment.deletedAt
        const formatCommentTime = (dateString: string) => {
            try {
                const now = new Date()
                const date = new Date(dateString)
                const diffMs = now.getTime() - date.getTime()

                if (isNaN(date.getTime())) return ''

                // future date fallback
                if (diffMs < 0) {
                    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                }

                const seconds = Math.floor(diffMs / 1000)
                if (seconds < 60) return `há ${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`

                const minutes = Math.floor(seconds / 60)
                if (minutes < 60) return `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`

                const hours = Math.floor(minutes / 60)
                if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`

                const days = Math.floor(hours / 24)
                // exactly 1 day -> show "há 1 dia"; greater than 1 day -> show date + hour:minute (no seconds)
                if (days === 1) return 'há 1 dia'

                return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            } catch {
                return new Date(dateString).toLocaleString()
            }
        }

        const createdAt = formatCommentTime(comment.createdAt)

        // Determine children depending on level
        let children: Comment[] | undefined = undefined
        if (level === 0) {
            // top-level comment already includes immediate replies from the list API, or fetched replies
            children = comment.replies || nestedReplies[comment.id]
        } else if (level === 1) {
            // replies to a level-1 comment are fetched and stored in nestedNestedReplies
            children = nestedNestedReplies[comment.id]
        } else if (level === 2) {
            // replies to a level-2 comment are fetched and stored in nestedNestedNestedReplies
            children = nestedNestedNestedReplies[comment.id]
        }

        // expanded mapping by level
        const expanded = level === 0 ? !!expandedReplies[comment.id]
            : level === 1 ? !!expandedNestedReplies[comment.id]
                : level === 2 ? !!expandedNestedNestedReplies[comment.id]
                    : false

        // helper to fetch replies for a given comment at a specific depth (1..3)
        const fetchRepliesFor = async (parentId: string, depth: number) => {
            try {
                const res = await fetch(`/api/comments/${parentId}/replies`)
                if (!res.ok) return
                const data = await res.json()
                if (depth === 1) setNestedReplies(prev => ({ ...prev, [parentId]: data.replies || [] }))
                if (depth === 2) setNestedNestedReplies(prev => ({ ...prev, [parentId]: data.replies || [] }))
                if (depth === 3) setNestedNestedNestedReplies(prev => ({ ...prev, [parentId]: data.replies || [] }))
            } catch (e) { /* ignore */ }
        }

        // UI size variations by level
        const avatarClass = level === 0 ? 'h-10 w-10' : level === 1 ? 'h-8 w-8' : level === 2 ? 'h-7 w-7' : 'h-6 w-6'
        const containerBg = level === 0 ? 'bg-[#1a1625]' : level === 1 ? 'bg-[#161124]' : 'bg-[#14101a]'
        const containerPad = level === 0 ? 'p-4' : level === 1 ? 'p-4' : 'p-3'

        const connectorColor = level === 0 ? 'bg-purple-600/30' : level === 1 ? 'bg-purple-500/30' : level === 2 ? 'bg-purple-400/30' : 'bg-purple-300/30'

        // detect if children are already loaded in the nested maps
        const childrenLoaded = (level === 0 && comment.replies && comment.replies.length > 0) ||
            (level === 1 && nestedReplies[comment.id] && nestedReplies[comment.id].length > 0) ||
            (level === 2 && nestedNestedReplies[comment.id] && nestedNestedReplies[comment.id].length > 0) ||
            (level === 3 && nestedNestedNestedReplies[comment.id] && nestedNestedNestedReplies[comment.id].length > 0)

        const hasReplies = childrenLoaded || (!!comment.replyCount && comment.replyCount > 0)

        return (
            <div key={comment.id} id={`comment-${comment.id}`} className={`space-y-2 ${highlightedComment === comment.id ? 'ring-2 ring-purple-500 animate-pulse rounded-lg' : ''}`}>
                <div className={`${containerPad} ${containerBg} rounded-lg border border-purple-600/20`}>
                    <div className="flex items-start gap-3">
                        <button onClick={() => setUserPreview({ id: comment.user.id, name: comment.user.name || 'Usuário', image: comment.user.image })} className="rounded-full focus:outline-none focus:ring-2 focus:ring-purple-600/50">
                            <Avatar className={`${avatarClass} flex-shrink-0`}>
                                <AvatarImage src={comment.user.image || ''} />
                                <AvatarFallback className="bg-purple-600">
                                    {comment.user.name?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <button className={`font-medium ${level === 0 ? '' : level === 1 ? 'text-sm' : 'text-xs'} hover:text-purple-300 ${isCurrentUser(comment.user.id) ? 'text-purple-400' : 'text-gray-100'}`} onClick={() => setUserPreview({ id: comment.user.id, name: comment.user.name || 'Usuário', image: comment.user.image })}>
                                    {comment.user.name || 'Usuário'}
                                </button>
                                <span className={`text-${level === 0 ? 'xs' : 'xs'} text-gray-500`}>{createdAt}</span>
                            </div>
                            <MarkdownRenderer
                                content={isDeleted ? (comment.deletedBy === 'moderator' ? 'comentário excluído por um moderador' : 'comentário deletado pelo próprio usuário') : comment.content}
                                className={level === 0 ? 'text-gray-300 text-sm' : level === 1 ? 'text-gray-300 text-xs' : 'text-gray-300 text-[12px]'}
                                mentions={comment.mentions?.map(m => m.user ? ({ id: m.user.id, name: m.user.name || '' }) : null).filter(Boolean) as { id: string, name: string }[]}
                                currentUserId={currentUser?.id}
                                onMentionClick={(userId, username) => setUserPreview({ id: userId, name: username })}
                            />

                            {!isDeleted && (
                                <div className={`flex items-center gap-4 mt-${level === 0 ? '3' : '2'}`}>
                                    <button
                                        onClick={() => handleLike(comment.id)}
                                        className={`flex items-center gap-1 ${level === 0 ? 'text-sm' : 'text-xs'} hover:text-white transition-colors ${comment.liked ? 'text-purple-400' : 'text-white/60'}`}
                                        disabled={!session}
                                    >
                                        <ThumbsUp className={`h-${level === 0 ? '4' : '3'} w-${level === 0 ? '4' : '3'} ${comment.liked ? 'fill-current' : ''}`} />
                                        {comment.likes > 0 && comment.likes}
                                    </button>

                                    {level < 2 && session && (
                                        <button
                                            onClick={() => setReplyingTo(comment.id)}
                                            className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
                                        >
                                            <MessageCircle className={`h-4 w-4`} />
                                            Responder
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleShare(comment.id)}
                                        className={`flex items-center gap-1 ${level === 0 ? 'text-sm' : 'text-xs'} text-white/60 hover:text-white transition-colors`}
                                    >
                                        <Share2 className={`h-${level === 0 ? '4' : '3'} w-${level === 0 ? '4' : '3'}`} />
                                        Compartilhar
                                    </button>

                                    {session && currentUser?.id === comment.user.id && (
                                        <div className="ml-auto relative">
                                            <button
                                                onClick={() => setOptionsOpen(optionsOpen === comment.id ? null : comment.id)}
                                                className="p-1 text-white/60 hover:text-white transition-colors"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                            {optionsOpen === comment.id && (
                                                <div className="absolute right-0 mt-2 w-48 bg-[#0f0b14] border border-purple-600/20 rounded-lg shadow-lg z-10">
                                                    <button
                                                        onClick={() => handleDelete(comment.id)}
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors rounded-lg"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Excluir
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reply input (shown when replyingTo matches) */}
                {replyingTo === comment.id && session && !isDeleted && (
                    <div className="mt-4 space-y-2">
                        <div className="flex gap-1 p-2 bg-[#0a0710] border border-white/10 rounded-lg">
                            <button
                                onClick={() => insertFormatting('**', '**', 'texto em negrito', true)}
                                className="p-1.5 hover:bg-purple-600/10 rounded transition-colors"
                                title="Negrito"
                            >
                                <Bold className="h-4 w-4 text-white/80" />
                            </button>
                            <button
                                onClick={() => insertFormatting('*', '*', 'texto em itálico', true)}
                                className="p-1.5 hover:bg-purple-600/10 rounded transition-colors"
                                title="Itálico"
                            >
                                <Italic className="h-4 w-4 text-white/80" />
                            </button>
                            <button
                                onClick={() => insertFormatting('~~', '~~', 'texto riscado', true)}
                                className="p-1.5 hover:bg-purple-600/10 rounded transition-colors"
                                title="Riscado"
                            >
                                <Strikethrough className="h-4 w-4 text-white/80" />
                            </button>
                            <button
                                onClick={() => insertFormatting('__', '__', 'texto sublinhado', true)}
                                className="p-1.5 hover:bg-purple-600/10 rounded transition-colors"
                                title="Sublinhado"
                            >
                                <Underline className="h-4 w-4 text-white/80" />
                            </button>
                            <button
                                onClick={() => insertFormatting('||', '||', 'spoiler', true)}
                                className="p-1.5 hover:bg-purple-600/10 rounded transition-colors"
                                title="Spoiler"
                            >
                                {showReplyPreview ? <EyeOff className="h-4 w-4 text-white/80" /> : <Eye className="h-4 w-4 text-white/80" />}
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={() => setShowReplyPreview(!showReplyPreview)}
                                className={`px-3 py-1.5 text-xs rounded transition-colors ${showReplyPreview ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                            >
                                {showReplyPreview ? 'Editar' : 'Visualizar'}
                            </button>
                        </div>

                        {showReplyPreview ? (
                            <div className="bg-[#0f0b14] border border-white/10 rounded-lg px-3 py-2 min-h-[60px]">
                                <MarkdownRenderer content={replyContent || '*Pré-visualização aparecerá aqui...*'} />
                            </div>
                        ) : (
                            <div className="flex items-start gap-2">
                                <textarea
                                    ref={replyTextareaRef}
                                    value={replyContent}
                                    onChange={(e) => handleTextareaChange(e, true)}
                                    placeholder="Escreva sua resposta... Use @ para mencionar usuários"
                                    className="flex-1 bg-[#0f0b14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[60px] resize-none"
                                />
                            </div>
                        )}

                        {showMentions && mentionResults.length > 0 && (
                            <div className="absolute z-10 mt-1 bg-[#0f0b14] border border-white/20 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {mentionResults.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => insertMention({ id: user.id, name: user.name || 'Desconhecido' }, true)}
                                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={user.image || undefined} alt={user.name || 'Usuário'} />
                                            <AvatarFallback className="bg-purple-600 text-white text-xs">
                                                {user.name?.charAt(0).toUpperCase() || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm text-white">{user.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setReplyingTo(null)
                                    setReplyContent('')
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleReply(comment.id)}
                                disabled={!replyContent.trim()}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                Responder
                            </Button>
                        </div>
                    </div>
                )}

                {/* Replies shown below the main comment with a left connector */}
                {hasReplies && level < 2 && (
                    <div className={`mt-2 ${level === 0 ? 'ml-0' : 'ml-4'}`}>
                        {!expanded ? (
                            <button
                                className={`text-${level === 0 ? 'sm' : 'xs'} text-purple-400 hover:text-purple-300`}
                                onClick={async () => {
                                    // always attempt to fetch child replies for this comment's children level (level+1)
                                    const childDepth = Math.min(level + 1, 3)
                                    const childrenExist = childDepth === 1 ? ((comment.replies && comment.replies.length > 0) || (nestedReplies[comment.id] && nestedReplies[comment.id].length > 0)) :
                                        childDepth === 2 ? (nestedNestedReplies[comment.id] && nestedNestedReplies[comment.id].length > 0) :
                                            childDepth === 3 ? (nestedNestedNestedReplies[comment.id] && nestedNestedNestedReplies[comment.id].length > 0) : false

                                    if (!childrenExist) {
                                        await fetchRepliesFor(comment.id, childDepth)
                                    }

                                    // set appropriate expanded flag for this parent comment (by its level)
                                    if (level === 0) {
                                        setExpandedReplies(prev => ({ ...prev, [comment.id]: true }))
                                    } else if (level === 1) {
                                        setExpandedNestedReplies(prev => ({ ...prev, [comment.id]: true }))
                                    } else if (level === 2) {
                                        setExpandedNestedNestedReplies(prev => ({ ...prev, [comment.id]: true }))
                                    }
                                }}
                            >
                                Ver respostas ({comment.replyCount})
                            </button>
                        ) : (
                            <div className="flex">
                                <div className="w-6 flex flex-col items-center mr-3">
                                    {/* top connector circle */}
                                    <div className={`w-3 h-3 rounded-br-full -mt-1 ${connectorColor}`} />
                                    {/* vertical line */}
                                    <div className={`w-px flex-1 ${connectorColor}`} />
                                </div>
                                <div className="flex-1 space-y-2">
                                    {(children || []).slice(0, visibleCount[comment.id] ?? 3).map(child => (
                                        <div key={child.id} className="">
                                            {renderComment(child, level >= 3 ? 3 : level + 1)}
                                        </div>
                                    ))}
                                    {(children || []).length > (visibleCount[comment.id] ?? 3) && (
                                        <button className="text-xs text-purple-400 hover:text-purple-300" onClick={() => setVisibleCount(prev => ({ ...prev, [comment.id]: (prev[comment.id] ?? 3) + 5 }))}>
                                            Exibir mais
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }
    const [comments, setComments] = useState<Comment[]>([])
    const [loading, setLoading] = useState(true)
    const [newComment, setNewComment] = useState('')
    const [mentions, setMentions] = useState<string[]>([])
    const [showFormatting, setShowFormatting] = useState(false)
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [replyContent, setReplyContent] = useState('')
    const [optionsOpen, setOptionsOpen] = useState<string | null>(null)
    const [showPreview, setShowPreview] = useState(false)
    const [showReplyPreview, setShowReplyPreview] = useState(false)
    const [reportingComment, setReportingComment] = useState<string | null>(null)
    const [reportReason, setReportReason] = useState<string>('spam')
    const [reportDetails, setReportDetails] = useState('')
    const [mentionSearch, setMentionSearch] = useState('')
    const [mentionResults, setMentionResults] = useState<Array<{ id: string; name: string; image: string | null }>>([])
    const [showMentions, setShowMentions] = useState(false)
    const [mentionCursorPosition, setMentionCursorPosition] = useState(0)
    const [highlightedComment, setHighlightedComment] = useState<string | null>(null)
    const [userPreview, setUserPreview] = useState<{ id: string | null; name: string; image?: string | null } | null>(null)
    const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})
    // nested replies for level 1 and level 2 (fetched on demand)
    const [nestedReplies, setNestedReplies] = useState<Record<string, Comment[]>>({})
    const [nestedNestedReplies, setNestedNestedReplies] = useState<Record<string, Comment[]>>({})
    const [expandedNestedReplies, setExpandedNestedReplies] = useState<Record<string, boolean>>({})
    // level 3 replies (rendered at same visual level as level 3 comments)
    const [nestedNestedNestedReplies, setNestedNestedNestedReplies] = useState<Record<string, Comment[]>>({})
    const [expandedNestedNestedReplies, setExpandedNestedNestedReplies] = useState<Record<string, boolean>>({})
    const [visibleCount, setVisibleCount] = useState<Record<string, number>>({})
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null)

    const buildQuery = () => {
        const params = new URLSearchParams()
        if (chapterId) params.set('chapterId', chapterId)
        else if (webtoonId) params.set('webtoonId', webtoonId)
        if (novelChapterId) params.set('novelChapterId', novelChapterId)
        else if (novelId) params.set('novelId', novelId)
        return params.toString() ? `?${params.toString()}` : ''
    }

    const fetchComments = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/comments${buildQuery()}`)
            if (!res.ok) throw new Error('Failed to fetch comments')
            const data = await res.json()
            setComments(data.comments || [])
        } catch (error) {
            console.error('Error fetching comments:', error)
            setComments([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchComments()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [webtoonId, chapterId])

    // Scroll to a shared comment and apply a temporary highlight. Also handle afterLogin redirect.
    useEffect(() => {
        if (!comments.length) return
        const params = new URLSearchParams(window.location.search)

        const commentId = params.get('comment')
        if (commentId) {
            const el = document.getElementById(`comment-${commentId}`)
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                setHighlightedComment(commentId)
                const clear = () => setHighlightedComment(null)
                window.addEventListener('click', clear, { once: true })
                window.addEventListener('keydown', clear, { once: true })
                window.addEventListener('scroll', clear, { once: true })
            }
        }

        const after = params.get('afterLogin')
        if (after === 'comments') {
            const el = document.getElementById('comments')
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            // remove the afterLogin param from the URL without reloading
            params.delete('afterLogin')
            const newSearch = params.toString()
            const newUrl = window.location.origin + window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash
            window.history.replaceState({}, document.title, newUrl)
        }
    }, [comments])

    // Focus the reply textarea when replyingTo changes to a non-null value
    useEffect(() => {
        if (replyingTo) {
            // use requestAnimationFrame to wait for the textarea to be rendered
            requestAnimationFrame(() => {
                replyTextareaRef.current?.focus()
            })
        }
    }, [replyingTo])

    // Search for users when @ is typed
    useEffect(() => {
        const searchUsers = async () => {
            if (mentionSearch.length < 2) {
                setMentionResults([])
                return
            }

            try {
                const res = await fetch(`/api/users/search?query=${encodeURIComponent(mentionSearch)}`)
                if (res.ok) {
                    const data = await res.json()
                    setMentionResults(data.users || [])
                }
            } catch (error) {
                console.error('Error searching users:', error)
            }
        }

        const debounce = setTimeout(searchUsers, 300)
        return () => clearTimeout(debounce)
    }, [mentionSearch])

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>, isReply: boolean = false) => {
        const text = e.target.value
        const cursorPos = e.target.selectionStart

        if (isReply) {
            setReplyContent(text)
        } else {
            setNewComment(text)
        }

        // Check for @ mention
        const beforeCursor = text.substring(0, cursorPos)
        const lastAtIndex = beforeCursor.lastIndexOf('@')

        if (lastAtIndex !== -1) {
            const afterAt = beforeCursor.substring(lastAtIndex + 1)
            // Check if there's a space after @
            if (!afterAt.includes(' ') && afterAt.length > 0) {
                setMentionSearch(afterAt)
                setShowMentions(true)
                setMentionCursorPosition(cursorPos)
            } else if (afterAt.length === 0) {
                setMentionSearch('')
                setShowMentions(true)
                setMentionCursorPosition(cursorPos)
            } else {
                setShowMentions(false)
            }
        } else {
            setShowMentions(false)
        }
    }

    const insertMention = (user: { id: string; name: string }, isReply: boolean = false) => {
        const textarea = isReply ? replyTextareaRef.current : textareaRef.current
        if (!textarea) return

        const text = isReply ? replyContent : newComment
        const beforeCursor = text.substring(0, mentionCursorPosition)
        const afterCursor = text.substring(mentionCursorPosition)
        const lastAtIndex = beforeCursor.lastIndexOf('@')

        const newText = text.substring(0, lastAtIndex) + `@${user.name} ` + afterCursor

        if (isReply) {
            setReplyContent(newText)
        } else {
            setNewComment(newText)
        }

        // Add user to mentions array (always update mentions regardless of reply or main comment)
        setMentions(prev => {
            if (!prev.includes(user.id)) {
                return [...prev, user.id]
            }
            return prev
        })

        setShowMentions(false)
        setMentionSearch('')
        textarea.focus()
    }

    const insertFormatting = (prefix: string, suffix: string, placeholder: string = '', isReply: boolean = false) => {
        const textarea = isReply ? replyTextareaRef.current : textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = isReply ? replyContent : newComment
        const before = text.substring(0, start)
        const selection = text.substring(start, end) || placeholder
        const after = text.substring(end)

        const formatted = `${before}${prefix}${selection}${suffix}${after}`

        if (isReply) {
            setReplyContent(formatted)
        } else {
            setNewComment(formatted)
        }

        // Restore focus and selection
        requestAnimationFrame(() => {
            textarea.focus()
            const newPos = start + prefix.length + selection.length + suffix.length
            textarea.setSelectionRange(newPos, newPos)
        })
    }

    const handleSubmit = async () => {
        if (!newComment.trim()) return

        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    webtoonId: webtoonId || undefined,
                    chapterId: chapterId || undefined,
                    novelId: novelId || undefined,
                    novelChapterId: novelChapterId || undefined,
                    content: newComment,
                    mentions
                })
            })

            if (!res.ok) {
                console.error('Failed to post comment', await res.text())
                return
            }

            const data = await res.json()
            // Prepend new comment returned from backend
            setComments(prev => [data.comment, ...prev])
            setNewComment('')
            setMentions([])
        } catch (error) {
            console.error('Error posting comment:', error)
        }
    }

    const handleLike = async (commentId: string) => {
        if (!session) return

        try {
            const res = await fetch(`/api/comments/${commentId}/like`, {
                method: 'POST',
            })

            if (!res.ok) {
                console.error('Failed to toggle like')
                return
            }

            const data = await res.json()

            // Helper function to update a comment recursively
            const updateLikeInTree = (comments: Comment[]): Comment[] => {
                return comments.map(c => {
                    if (c.id === commentId) {
                        return { ...c, likes: data.likes, liked: data.liked }
                    }
                    if (c.replies && c.replies.length > 0) {
                        return {
                            ...c,
                            replies: updateLikeInTree(c.replies)
                        }
                    }
                    return c
                })
            }

            // Update comment in main list and nested replies
            setComments(prev => updateLikeInTree(prev))

            // Also update in nested state maps
            setNestedReplies(prev => {
                const updated = { ...prev }
                Object.keys(prev).forEach(key => {
                    updated[key] = updateLikeInTree(prev[key])
                })
                return updated
            })

            setNestedNestedReplies(prev => {
                const updated = { ...prev }
                Object.keys(prev).forEach(key => {
                    updated[key] = updateLikeInTree(prev[key])
                })
                return updated
            })

            setNestedNestedNestedReplies(prev => {
                const updated = { ...prev }
                Object.keys(prev).forEach(key => {
                    updated[key] = updateLikeInTree(prev[key])
                })
                return updated
            })
        } catch (error) {
            console.error('Error toggling like:', error)
        }
    }

    const handleReply = async (commentId: string) => {
        if (!replyContent.trim()) return

        try {
            const res = await fetch(`/api/comments/${commentId}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: replyContent,
                    mentions
                })
            })

            if (!res.ok) {
                console.error('Failed to post reply')
                return
            }

            const data = await res.json()

            // Helper function to find and update a comment recursively
            const updateCommentTree = (comments: Comment[]): Comment[] => {
                return comments.map(c => {
                    if (c.id === commentId) {
                        return {
                            ...c,
                            replyCount: (c.replyCount || 0) + 1,
                            replies: [...(c.replies || []), data.reply]
                        }
                    }
                    if (c.replies && c.replies.length > 0) {
                        return {
                            ...c,
                            replies: updateCommentTree(c.replies)
                        }
                    }
                    return c
                })
            }

            // Update the main comments array
            setComments(prev => updateCommentTree(prev))

            // Also update nested replies state if the parent is in those maps
            setNestedReplies(prev => {
                if (prev[commentId]) {
                    return {
                        ...prev,
                        [commentId]: [...prev[commentId], data.reply]
                    }
                }
                // Check if we need to update a nested comment's children
                const updated = { ...prev }
                Object.keys(prev).forEach(key => {
                    const updatedChildren = updateCommentTree(prev[key])
                    if (updatedChildren !== prev[key]) {
                        updated[key] = updatedChildren
                    }
                })
                return updated
            })

            setNestedNestedReplies(prev => {
                if (prev[commentId]) {
                    return {
                        ...prev,
                        [commentId]: [...prev[commentId], data.reply]
                    }
                }
                // Check if we need to update a nested comment's children
                const updated = { ...prev }
                Object.keys(prev).forEach(key => {
                    const updatedChildren = updateCommentTree(prev[key])
                    if (updatedChildren !== prev[key]) {
                        updated[key] = updatedChildren
                    }
                })
                return updated
            })

            setNestedNestedNestedReplies(prev => {
                if (prev[commentId]) {
                    return {
                        ...prev,
                        [commentId]: [...prev[commentId], data.reply]
                    }
                }
                return prev
            })

            setReplyContent('')
            setReplyingTo(null)
            setMentions([])
        } catch (error) {
            console.error('Error posting reply:', error)
        }
    }

    const handleShare = async (commentId: string) => {
        const url = `${window.location.origin}${window.location.pathname}?comment=${commentId}`

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Compartilhar comentário',
                    url: url
                })
            } catch (error) {
                console.error('Error sharing:', error)
            }
        } else {
            try {
                await navigator.clipboard.writeText(url)
                alert('Link copiado para área de transferência!')
            } catch (error) {
                console.error('Error copying to clipboard:', error)
            }
        }
    }

    const handleDelete = async (commentId: string) => {
        if (!confirm('Tem certeza que deseja excluir este comentário?')) return

        try {
            const res = await fetch(`/api/comments/${commentId}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                console.error('Failed to delete comment')
                return
            }

            // Helper function to mark comment as deleted recursively
            const markDeletedInTree = (comments: Comment[]): Comment[] => {
                return comments.map(c => {
                    if (c.id === commentId) {
                        return { ...c, deletedAt: new Date().toISOString(), deletedBy: 'owner' } as Comment
                    }
                    if (c.replies && c.replies.length > 0) {
                        return {
                            ...c,
                            replies: markDeletedInTree(c.replies)
                        }
                    }
                    return c
                })
            }

            // Soft-delete in UI: mark as deleted instead of removing
            setComments(prev => markDeletedInTree(prev))

            // Also update in nested state maps
            setNestedReplies(prev => {
                const updated = { ...prev }
                Object.keys(prev).forEach(key => {
                    updated[key] = markDeletedInTree(prev[key])
                })
                return updated
            })

            setNestedNestedReplies(prev => {
                const updated = { ...prev }
                Object.keys(prev).forEach(key => {
                    updated[key] = markDeletedInTree(prev[key])
                })
                return updated
            })

            setNestedNestedNestedReplies(prev => {
                const updated = { ...prev }
                Object.keys(prev).forEach(key => {
                    updated[key] = markDeletedInTree(prev[key])
                })
                return updated
            })

            setOptionsOpen(null)
        } catch (error) {
            console.error('Error deleting comment:', error)
        }
    }

    const handleReport = async (commentId: string) => {
        if (!reportReason) return

        try {
            const res = await fetch(`/api/comments/${commentId}/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason: reportReason,
                    details: reportDetails || undefined
                })
            })

            if (!res.ok) {
                const data = await res.json()
                alert(data.error || 'Falha ao enviar denúncia')
                return
            }

            const data = await res.json()
            alert(data.message || 'Denúncia enviada com sucesso!')
            setReportingComment(null)
            setReportReason('spam')
            setReportDetails('')
            setOptionsOpen(null)
        } catch (error) {
            console.error('Error reporting comment:', error)
            alert('Erro ao enviar denúncia')
        }
    }

    if (loading) {
        return (
            <div className="p-6 bg-[#1a1625] rounded-lg border border-purple-600/20 text-center text-gray-400">
                Carregando comentários...
            </div>
        )
    }

    return (
        <div id="comments" className="space-y-6">
            <div className="bg-[#0f0b14] rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-100">Comentários</h3>
                    <div className="text-sm text-white/60">{comments.length} comentários</div>
                </div>

                {session ? (
                    <div className="mb-4">
                        <div className="flex gap-3 mb-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={currentUser?.image || ''} />
                                <AvatarFallback className="bg-purple-600">
                                    {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <textarea
                                    ref={textareaRef}
                                    value={newComment}
                                    onChange={(e) => handleTextareaChange(e)}
                                    placeholder="Escreva um comentário... Suporta Markdown."
                                    className="w-full bg-[#1a1625] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] resize-none"
                                    onFocus={() => setShowFormatting(true)}
                                />

                                {/* Mention autocomplete */}
                                {showMentions && mentionResults.length > 0 && (
                                    <div className="absolute z-10 mt-1 bg-[#0f0b14] border border-purple-600/20 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {mentionResults.map((user) => (
                                            <button
                                                key={user.id}
                                                onClick={() => insertMention(user)}
                                                className="flex items-center gap-2 w-full px-4 py-2 hover:bg-purple-600/10 transition-colors text-left"
                                            >
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={user.image || ''} />
                                                    <AvatarFallback className="bg-purple-600 text-xs">
                                                        {user.name?.[0]?.toUpperCase() || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm text-white">{user.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {showFormatting && (
                                    <>
                                        <div className="flex items-center justify-between mt-2 gap-2">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <button onClick={() => insertFormatting('**', '**', 'texto em negrito')} className="p-2 hover:bg-purple-600/10 rounded transition-colors" title="Negrito (**texto**)">
                                                    <Bold className="h-4 w-4 text-white/80" />
                                                </button>
                                                <button onClick={() => insertFormatting('*', '*', 'texto em itálico')} className="p-2 hover:bg-purple-600/10 rounded transition-colors" title="Itálico (*texto*)">
                                                    <Italic className="h-4 w-4 text-white/80" />
                                                </button>
                                                <button onClick={() => insertFormatting('~~', '~~', 'texto riscado')} className="p-2 hover:bg-purple-600/10 rounded transition-colors" title="Riscado (~~texto~~)">
                                                    <Strikethrough className="h-4 w-4 text-white/80" />
                                                </button>
                                                <button onClick={() => insertFormatting('__', '__', 'texto sublinhado')} className="p-2 hover:bg-purple-600/10 rounded transition-colors" title="Sublinhado (__texto__)">
                                                    <Underline className="h-4 w-4 text-white/80" />
                                                </button>
                                                <button onClick={() => insertFormatting('||', '||', 'spoiler')} className="p-2 hover:bg-purple-600/10 rounded transition-colors" title="Spoiler (||texto||)">
                                                    {showPreview ? <Eye className="h-4 w-4 text-white/80" /> : <EyeOff className="h-4 w-4 text-white/80" />}
                                                </button>
                                                <button onClick={() => insertFormatting('@', '', 'usuário')} className="p-2 hover:bg-purple-600/10 rounded transition-colors" title="Mencionar (@usuário)">
                                                    <AtSign className="h-4 w-4 text-white/80" />
                                                </button>
                                                <div className="h-4 w-px bg-white/10 mx-1" />
                                                <button
                                                    onClick={() => setShowPreview(!showPreview)}
                                                    className="px-3 py-1 text-xs hover:bg-white/5 rounded transition-colors"
                                                    title="Alternar pré-visualização"
                                                >
                                                    {showPreview ? 'Editar' : 'Visualizar'}
                                                </button>
                                            </div>
                                            <Button onClick={handleSubmit} disabled={!newComment.trim()} className="bg-purple-600 hover:bg-purple-700 rounded-full px-6">
                                                Comentar
                                            </Button>
                                        </div>

                                        {/* Preview */}
                                        {showPreview && newComment && (
                                            <div className="mt-2 p-4 bg-[#0f0b14] border border-white/10 rounded-lg">
                                                <div className="text-xs text-gray-400 mb-2">Pré-visualização:</div>
                                                <MarkdownRenderer content={newComment} className="text-gray-300 text-sm" />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 p-4 bg-[#1a1625] rounded-lg border border-purple-600/20 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-sm text-white/70">Faça login para comentar</div>
                            <Button
                                onClick={() => {
                                    if (typeof window === 'undefined') return signIn()
                                    // build a callbackUrl that includes a query param (hashes are lost in OAuth redirects)
                                    const base = window.location.origin + window.location.pathname + window.location.search
                                    const sep = base.includes('?') ? '&' : '?'
                                    const callback = `${base}${sep}afterLogin=comments`
                                    signIn(undefined, { callbackUrl: callback })
                                }}
                                className="bg-purple-600 hover:bg-purple-700 mt-2"
                            >
                                Entrar
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {comments.map(c => renderComment(c, 0))}
                    {comments.length === 0 && (
                        <div className="text-center text-gray-400 py-8">
                            Nenhum comentário ainda. Seja o primeiro!
                        </div>
                    )}
                </div>
                {userPreview && (
                    <Dialog open={!!userPreview} onOpenChange={(o) => !o && setUserPreview(null)}>
                        <DialogContent className="bg-[#1a1625] border border-purple-600/20">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={userPreview.image || ''} />
                                    <AvatarFallback className="bg-purple-600 text-white">
                                        {userPreview.name?.[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="text-white font-medium">{userPreview.name}</div>
                                    <div className="text-white/60 text-sm">Leitor ativo</div>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <a
                                    href={`/profile/${userPreview.id}`}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
                                    onClick={() => setUserPreview(null)}
                                >
                                    Ver perfil
                                </a>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </div>
    )
}
