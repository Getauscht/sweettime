'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

interface MarkdownRendererProps {
    content: string
    className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                    // Custom rendering for spoilers (||text||)
                    p: ({ children }) => {
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
                                                onClick={(e) => {
                                                    e.currentTarget.classList.toggle('text-white')
                                                }}
                                            >
                                                {part}
                                            </span>
                                        )
                                    )}
                                </p>
                            )
                        }
                        return <p>{children}</p>
                    },
                    // Style links
                    a: ({ href, children }) => (
                        <a href={href} className="text-purple-400 hover:text-purple-300 underline" target="_blank" rel="noopener noreferrer">
                            {children}
                        </a>
                    ),
                    // Style code blocks
                    code: ({ children, className }) => {
                        const isInline = !className
                        if (isInline) {
                            return <code className="bg-gray-800 px-1 py-0.5 rounded text-sm">{children}</code>
                        }
                        return <code className={`${className} block bg-gray-800 p-2 rounded text-sm overflow-x-auto`}>{children}</code>
                    },
                    // Style blockquotes
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-purple-600 pl-4 italic text-gray-400">
                            {children}
                        </blockquote>
                    ),
                    // Style lists
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}
