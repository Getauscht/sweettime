"use client"

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

interface MarkdownRendererProps {
    content: string
    className?: string
    mentions?: Array<{ id: string; name: string | null }>
    currentUserId?: string
    onMentionClick?: (userId: string | null, username: string) => void
}

export function MarkdownRenderer({ content, className = '', mentions = [], currentUserId, onMentionClick }: MarkdownRendererProps) {
    const renderParagraph = (props: any) => {
        const { children } = props
        const text = String(children)

        if (text.includes('||')) {
            const parts = text.split('||')
            return (
                <p>
                    {parts.map((part, i) =>
                        i % 2 === 0 ? part : (
                            <span
                                key={i}
                                className="spoiler bg-gray-800 text-gray-800 hover:text-white transition-colors cursor-pointer px-1 rounded"
                                onClick={(e) => e.currentTarget.classList.toggle('text-white')}
                            >
                                {part}
                            </span>
                        )
                    )}
                </p>
            )
        }

        const processMentions = (input: string) => {
            const out: React.ReactNode[] = []
            let idx = 0

            const known = (mentions || []).filter(m => !!m.name) as Array<{ id: string; name: string }>
            const names = known.map(m => m.name!).sort((a, b) => b.length - a.length)

            while (idx < input.length) {
                const at = input.indexOf('@', idx)
                if (at === -1) { out.push(input.slice(idx)); break }
                if (at > idx) out.push(input.slice(idx, at))

                let matched = false
                for (const name of names) {
                    const start = at + 1
                    if (input.substr(start, name.length) === name) {
                        const after = input.charAt(start + name.length)
                        if (!after || /[\s.,;:!?()\[\]{}]/.test(after)) {
                            const mentionText = input.slice(at, start + name.length)
                            const found = known.find(m => m.name === name)
                            const userId = found?.id || null
                            const isCurrentUser = currentUserId && userId && currentUserId === userId
                            const mentionClass = isCurrentUser
                                ? 'text-purple-400 bg-purple-500/10 hover:bg-purple-500/20'
                                : 'text-white/80 bg-white/10 hover:bg-white/15'

                            out.push(<span key={`${at}-${name}`} onClick={() => onMentionClick?.(userId, name)} className={`px-1 rounded cursor-pointer ${mentionClass}`}>{mentionText}</span>)
                            idx = start + name.length
                            matched = true
                            break
                        }
                    }
                }

                if (matched) continue

                const token = /^@([\w.\-]+)/.exec(input.slice(at))
                if (token) {
                    const mentionText = token[0]
                    const username = token[1]
                    const knownMention = known.find(m => m.name === username)
                    const userId = knownMention?.id || null
                    const isCurrentUser = currentUserId && userId && currentUserId === userId
                    const mentionClass = isCurrentUser
                        ? 'text-purple-400 bg-purple-500/10 hover:bg-purple-500/20'
                        : 'text-white/80 bg-white/10 hover:bg-white/15'

                    out.push(<span key={`${at}-${username}`} onClick={() => onMentionClick?.(userId, username)} className={`px-1 rounded cursor-pointer ${mentionClass}`}>{mentionText}</span>)
                    idx = at + mentionText.length
                    continue
                }

                out.push('@')
                idx = at + 1
            }

            return out
        }

        return <p>{processMentions(text)}</p>
    }

    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={{
                p: renderParagraph,
                code: ({ children, className }) => {
                    const isInline = !className
                    if (isInline) return <code className="bg-gray-800 px-1 py-0.5 rounded text-sm">{children}</code>
                    return <code className={`${className} block bg-gray-800 p-2 rounded text-sm overflow-x-auto`}>{children}</code>
                },
                blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-600 pl-4 italic text-gray-400">{children}</blockquote>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>
            }}>
                {content}
            </ReactMarkdown>
        </div>
    )
}
