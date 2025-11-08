/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeRaw from 'rehype-raw'

interface GenericMarkdownRendererProps {
    content: string
    className?: string
}

export function GenericMarkdownRenderer({ content, className = '' }: GenericMarkdownRendererProps) {
    // extend the default rehype-sanitize schema to allow details/summary (spoilers)
    // and allow some attributes/classes on table elements so they render correctly
    const schema = {
        ...defaultSchema,
        tagNames: Array.from(new Set([...(defaultSchema.tagNames || []), 'details', 'summary', 'br'])),
        attributes: {
            ...defaultSchema.attributes,
            // allow class on generic span so our spoiler HTML is preserved
            span: [...(defaultSchema.attributes?.span || []), 'className'],
            table: [...(defaultSchema.attributes?.table || []), 'className'],
            thead: [...(defaultSchema.attributes?.thead || []), 'className'],
            tbody: [...(defaultSchema.attributes?.tbody || []), 'className'],
            tr: [...(defaultSchema.attributes?.tr || []), 'className'],
            th: [...(defaultSchema.attributes?.th || []), 'className', 'align'],
            td: [...(defaultSchema.attributes?.td || []), 'className', 'align'],
            details: [...(defaultSchema.attributes?.details || []), 'open', 'className'],
            summary: [...(defaultSchema.attributes?.summary || []), 'className']
        }
    }

    // remark plugin to convert inline ||spoiler|| syntax into HTML span.spoiler
    function remarkSpoilers() {
        return (tree: any) => {
            const visit = (node: any, parent?: any) => {
                if (!node) return
                if (node.type === 'text') {
                    const value: string = node.value || ''
                    const regex = /\|\|((?:\\\||[^\|])+?)\|\|/g
                    let match
                    let lastIndex = 0
                    const nodes: any[] = []
                    while ((match = regex.exec(value)) !== null) {
                        if (match.index > lastIndex) {
                            nodes.push({ type: 'text', value: value.slice(lastIndex, match.index) })
                        }
                        const inner = match[1]
                        // produce an HTML node that will be parsed by rehype-raw
                        nodes.push({ type: 'html', value: `<span class="spoiler">${inner}</span>` })
                        lastIndex = regex.lastIndex
                    }
                    if (nodes.length) {
                        if (lastIndex < value.length) nodes.push({ type: 'text', value: value.slice(lastIndex) })
                        if (parent && parent.children) {
                            const idx = parent.children.indexOf(node)
                            if (idx !== -1) {
                                parent.children.splice(idx, 1, ...nodes)
                            }
                        }
                    }
                } else if (node.children && Array.isArray(node.children)) {
                    for (let i = 0; i < node.children.length; i++) visit(node.children[i], node)
                }
            }

            visit(tree)
        }
    }

    // we will use the official remark-breaks plugin to convert single newlines to <br />

    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                // add remarkSpoilers and remarkBreaks after remark-gfm so we convert ||x|| into inline HTML and single newlines into <br />
                remarkPlugins={[[remarkGfm, { singleTilde: true }], remarkSpoilers, remarkBreaks]}
                // allow raw HTML (so HTML details/tables are parsed) then sanitize
                rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
                components={{
                    code: ({ children, className }) => {
                        const isInline = !className
                        if (isInline) return <code className="bg-gray-800 px-1 py-0.5 rounded text-sm">{children}</code>
                        return <code className={`${className} block bg-gray-800 p-2 rounded text-sm overflow-x-auto`}>{children}</code>
                    },
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-600 pl-4 italic text-gray-400">{children}</blockquote>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,

                    // table rendering with Tailwind-friendly classes
                    table: ({ children }) => (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                    tbody: ({ children }) => <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>,
                    tr: ({ children }) => <tr>{children}</tr>,
                    th: ({ children }) => <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>,
                    td: ({ children }) => <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{children}</td>,

                    // support HTML details/summary for spoilers
                    details: ({ children, ...props }) => (
                        // props may include 'open'
                         
                        <details {...props} className={`mt-2 mb-2 ${props.className || ''}`}>
                            {children}
                        </details>
                    ),
                    summary: ({ children }) => <summary className="cursor-pointer font-medium text-sm">{children}</summary>,

                    // inline spoilers created by remarkSpoilers -> <span class="spoiler">text</span>
                    span: ({ children, node, ...props }) => {
                        const className = props.className || ''
                        if (!className.toString().includes('spoiler')) return <span {...props}>{children}</span>
                        // interactive spoiler: blurred until toggled
                        return <InlineSpoiler>{children}</InlineSpoiler>
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
} 

function InlineSpoiler({ children }: { children: React.ReactNode }) {
    const [revealed, setRevealed] = useState(false)
    return (
        <span
            role="button"
            tabIndex={0}
            onClick={() => setRevealed((r) => !r)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setRevealed((r) => !r)
                }
            }}
            className={`inline-block rounded px-1 ${revealed ? 'filter-none' : 'filter blur-sm'} cursor-pointer`}
            aria-pressed={revealed}
        >
            {children}
        </span>
    )
} 