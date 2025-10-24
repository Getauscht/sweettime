'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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
}

interface Props {
    webtoonId?: string
    chapterId?: string
}

/**
 * CommentsSection
 * - Supports fetching comments filtered by webtoonId or chapterId
 * - Allows authenticated users to post comments (mentions optional)
 * - Designed to be used on both webtoon page (webtoon-level comments) and chapter page (chapter-level comments)
 */
export default function CommentsSection({ webtoonId, chapterId }: Props) {
    const { data: session } = useSession()
    const currentUser = session?.user as { id?: string; name?: string | null; image?: string | null } | undefined
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
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null)

    const buildQuery = () => {
        const params = new URLSearchParams()
        if (chapterId) params.set('chapterId', chapterId)
        else if (webtoonId) params.set('webtoonId', webtoonId)
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

        // Add user to mentions array
        if (!mentions.includes(user.id)) {
            setMentions([...mentions, user.id])
        }

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

        // Update comment in main list and nested replies
        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                return { ...c, likes: data.likes, liked: data.liked }
            }
            // Update in nested replies if present
            if (c.replies) {
                return {
                    ...c,
                    replies: c.replies.map(r =>
                        r.id === commentId
                            ? { ...r, likes: data.likes, liked: data.liked }
                            : r
                    )
                }
            }
            return c
        }))
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
                mentions: []
            })
        })

        if (!res.ok) {
            console.error('Failed to post reply')
            return
        }

        const data = await res.json()

        // Add reply to the comment's replies array
        setComments(prev => prev.map(c =>
            c.id === commentId
                ? {
                    ...c,
                    replyCount: (c.replyCount || 0) + 1,
                    replies: [...(c.replies || []), data.reply]
                }
                : c
        ))

        setReplyContent('')
        setReplyingTo(null)
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

        // Remove comment from main list or from nested replies
        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                return null as any // Will be filtered out
            }
            if (c.replies) {
                return {
                    ...c,
                    replies: c.replies.filter(r => r.id !== commentId)
                }
            }
            return c
        }).filter(Boolean))

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
    <div className="space-y-6">
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
                                placeholder="Escreva um comentário... Suporta Markdown (@menções, **negrito**, *itálico*, ~~riscado__, __sublinhado__, ||spoiler||)"
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
                                            <button onClick={() => insertFormatting('**', '**', 'texto em negrito')} className="p-2 hover:bg-white/5 rounded transition-colors" title="Negrito (**texto**)">
                                                <Bold className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => insertFormatting('*', '*', 'texto em itálico')} className="p-2 hover:bg-white/5 rounded transition-colors" title="Itálico (*texto*)">
                                                <Italic className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => insertFormatting('~~', '~~', 'texto riscado')} className="p-2 hover:bg-white/5 rounded transition-colors" title="Riscado (~~texto~~)">
                                                <Strikethrough className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => insertFormatting('__', '__', 'texto sublinhado')} className="p-2 hover:bg-white/5 rounded transition-colors" title="Sublinhado (__texto__)">
                                                <Underline className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => insertFormatting('||', '||', 'spoiler')} className="p-2 hover:bg-white/5 rounded transition-colors" title="Spoiler (||texto||)">
                                                {showPreview ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                            </button>
                                            <button onClick={() => insertFormatting('@', '', 'usuário')} className="p-2 hover:bg-white/5 rounded transition-colors" title="Mencionar (@usuário)">
                                                <AtSign className="h-4 w-4" />
                                            </button>
                                            <div className="h-4 w-px bg-white/10 mx-1" />
                                            <button
                                                onClick={() => setShowPreview(!showPreview)}
                                                className="px-3 py-1 text-xs hover:bg-white/5 rounded transition-colors"
                                                title="Toggle Preview"
                                            >
                                                {showPreview ? 'Editar' : 'Preview'}
                                            </button>
                                        </div>
                                        <Button onClick={handleSubmit} disabled={!newComment.trim()} className="bg-purple-600 hover:bg-purple-700 rounded-full px-6">
                                            Comentar
                                        </Button>
                                    </div>

                                    {/* Preview */}
                                    {showPreview && newComment && (
                                        <div className="mt-2 p-4 bg-[#0f0b14] border border-white/10 rounded-lg">
                                            <div className="text-xs text-gray-400 mb-2">Preview:</div>
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
                    Faça login para comentar
                </div>
            )}

            <div className="space-y-4">
                {comments.map((c) => (
                    <div key={c.id} className="space-y-2">
                        <div className="p-4 bg-[#1a1625] rounded-lg border border-purple-600/20">
                            <div className="flex items-start gap-3">
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                    <AvatarImage src={c.user.image || ''} />
                                    <AvatarFallback className="bg-purple-600">
                                        {c.user.name?.[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-gray-100">{c.user.name || 'Usuário'}</span>
                                        <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</span>
                                    </div>
                                    <MarkdownRenderer content={c.content} className="text-gray-300 text-sm" />
                                    {c.mentions?.length > 0 && (
                                        <div className="mt-2 text-xs text-purple-400">
                                            Mencionou: {c.mentions.map(m => m.user.name).join(', ')}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 mt-3">
                                        <button
                                            onClick={() => handleLike(c.id)}
                                            className={`flex items-center gap-1 text-sm hover:text-white transition-colors ${c.liked ? 'text-purple-400' : 'text-white/60'}`}
                                            disabled={!session}
                                        >
                                            <ThumbsUp className={`h-4 w-4 ${c.liked ? 'fill-current' : ''}`} />
                                            {c.likes > 0 && c.likes}
                                        </button>
                                        <button
                                            onClick={() => setReplyingTo(c.id)}
                                            className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
                                            disabled={!session}
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            Responder
                                        </button>
                                        <button
                                            onClick={() => handleShare(c.id)}
                                            className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
                                        >
                                            <Share2 className="h-4 w-4" />
                                            Compartilhar
                                        </button>
                                        {session && currentUser?.id === c.user.id && (
                                            <div className="ml-auto relative">
                                                <button
                                                    onClick={() => setOptionsOpen(optionsOpen === c.id ? null : c.id)}
                                                    className="p-1 text-white/60 hover:text-white transition-colors"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                                {optionsOpen === c.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-[#0f0b14] border border-purple-600/20 rounded-lg shadow-lg z-10">
                                                        <button
                                                            onClick={() => handleDelete(c.id)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors rounded-lg"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Excluir
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {session && currentUser?.id !== c.user.id && (
                                            <div className="ml-auto relative">
                                                <button
                                                    onClick={() => setReportingComment(reportingComment === c.id ? null : c.id)}
                                                    className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
                                                    title="Denunciar comentário"
                                                >
                                                    <Flag className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Report dialog */}
                                    {reportingComment === c.id && (
                                        <div className="mt-4 p-4 bg-[#0f0b14] border border-yellow-600/20 rounded-lg">
                                            <h4 className="text-sm font-semibold text-yellow-400 mb-3">Denunciar comentário</h4>
                                            <select
                                                value={reportReason}
                                                onChange={(e) => setReportReason(e.target.value)}
                                                className="w-full bg-[#1a1625] border border-white/10 rounded px-3 py-2 text-sm text-white mb-3"
                                            >
                                                <option value="spam">Spam</option>
                                                <option value="harassment">Assédio ou bullying</option>
                                                <option value="inappropriate">Conteúdo inadequado</option>
                                                <option value="other">Outro</option>
                                            </select>
                                            <textarea
                                                value={reportDetails}
                                                onChange={(e) => setReportDetails(e.target.value)}
                                                placeholder="Detalhes adicionais (opcional)..."
                                                className="w-full bg-[#1a1625] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-white/40 min-h-[60px] resize-none mb-3"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setReportingComment(null)
                                                        setReportReason('spam')
                                                        setReportDetails('')
                                                    }}
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleReport(c.id)}
                                                    className="bg-yellow-600 hover:bg-yellow-700"
                                                >
                                                    Enviar denúncia
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {replyingTo === c.id && session && (
                                        <div className="mt-4 space-y-2">
                                            {/* Formatting Toolbar for Reply */}
                                            <div className="flex gap-1 p-2 bg-[#0a0710] border border-white/10 rounded-lg">
                                                <button
                                                    onClick={() => insertFormatting('**', '**', 'texto em negrito', true)}
                                                    className="p-1.5 hover:bg-white/5 rounded transition-colors"
                                                    title="Negrito"
                                                >
                                                    <Bold className="h-4 w-4 text-white/60" />
                                                </button>
                                                <button
                                                    onClick={() => insertFormatting('*', '*', 'texto em itálico', true)}
                                                    className="p-1.5 hover:bg-white/5 rounded transition-colors"
                                                    title="Itálico"
                                                >
                                                    <Italic className="h-4 w-4 text-white/60" />
                                                </button>
                                                <button
                                                    onClick={() => insertFormatting('~~', '~~', 'texto riscado', true)}
                                                    className="p-1.5 hover:bg-white/5 rounded transition-colors"
                                                    title="Riscado"
                                                >
                                                    <Strikethrough className="h-4 w-4 text-white/60" />
                                                </button>
                                                <button
                                                    onClick={() => insertFormatting('__', '__', 'texto sublinhado', true)}
                                                    className="p-1.5 hover:bg-white/5 rounded transition-colors"
                                                    title="Sublinhado"
                                                >
                                                    <Underline className="h-4 w-4 text-white/60" />
                                                </button>
                                                <button
                                                    onClick={() => insertFormatting('||', '||', 'spoiler', true)}
                                                    className="p-1.5 hover:bg-white/5 rounded transition-colors"
                                                    title="Spoiler"
                                                >
                                                    {showReplyPreview ? <EyeOff className="h-4 w-4 text-white/60" /> : <Eye className="h-4 w-4 text-white/60" />}
                                                </button>
                                                <div className="flex-1" />
                                                <button
                                                    onClick={() => setShowReplyPreview(!showReplyPreview)}
                                                    className={`px-3 py-1.5 text-xs rounded transition-colors ${showReplyPreview ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {showReplyPreview ? 'Editar' : 'Preview'}
                                                </button>
                                            </div>

                                            {/* Preview or Textarea */}
                                            {showReplyPreview ? (
                                                <div className="bg-[#0f0b14] border border-white/10 rounded-lg px-3 py-2 min-h-[60px]">
                                                    <MarkdownRenderer content={replyContent || '*Preview aparecerá aqui...*'} />
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

                                            {/* Mention Autocomplete for Reply */}
                                            {showMentions && mentionResults.length > 0 && (
                                                <div className="absolute z-10 mt-1 bg-[#0f0b14] border border-white/20 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    {mentionResults.map((user) => (
                                                        <button
                                                            key={user.id}
                                                            onClick={() => insertMention({ id: user.id, name: user.name || 'Unknown' }, true)}
                                                            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/5 transition-colors text-left"
                                                        >
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
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
                                                    onClick={() => handleReply(c.id)}
                                                    disabled={!replyContent.trim()}
                                                    className="bg-purple-600 hover:bg-purple-700"
                                                >
                                                    Responder
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Replies - Now using embedded replies from API */}
                        {c.replies && c.replies.length > 0 && (
                            <div className="space-y-2 ml-12">
                                {c.replies.map(reply => (
                                    <div key={reply.id} className="p-4 bg-[#1a1625] rounded-lg border border-purple-600/20">
                                        <div className="flex items-start gap-3">
                                            <Avatar className="h-8 w-8 flex-shrink-0">
                                                <AvatarImage src={reply.user.image || ''} />
                                                <AvatarFallback className="bg-purple-600 text-xs">
                                                    {reply.user.name?.[0]?.toUpperCase() || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-gray-100 text-sm">{reply.user.name || 'Usuário'}</span>
                                                    <span className="text-xs text-gray-500">{new Date(reply.createdAt).toLocaleString()}</span>
                                                </div>
                                                <MarkdownRenderer content={reply.content} className="text-gray-300 text-xs" />
                                                <div className="flex items-center gap-4 mt-2">
                                                    <button
                                                        onClick={() => handleLike(reply.id)}
                                                        className={`flex items-center gap-1 text-xs hover:text-white transition-colors ${reply.liked ? 'text-purple-400' : 'text-white/60'}`}
                                                        disabled={!session}
                                                    >
                                                        <ThumbsUp className={`h-3 w-3 ${reply.liked ? 'fill-current' : ''}`} />
                                                        {reply.likes > 0 && reply.likes}
                                                    </button>
                                                    <button
                                                        onClick={() => handleShare(reply.id)}
                                                        className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
                                                    >
                                                        <Share2 className="h-3 w-3" />
                                                        Compartilhar
                                                    </button>
                                                    {session && currentUser?.id === reply.user.id && (
                                                        <button
                                                            onClick={() => handleDelete(reply.id)}
                                                            className="ml-auto text-xs text-red-400 hover:text-red-300 transition-colors"
                                                        >
                                                            Excluir
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {comments.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                        Nenhum comentário ainda. Seja o primeiro!
                    </div>
                )}
            </div>
        </div>
    </div>
)
}
