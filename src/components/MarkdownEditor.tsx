/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useRef } from 'react'

type Props = {
    value?: string
    onChange?: (v: string) => void
    placeholder?: string
}


import { blocksToMarkdown, markdownToBlocks } from '@/lib/editorjs'

export default function MarkdownEditor({ value = '', onChange, placeholder }: Props) {
    const holderRef = useRef<HTMLDivElement | null>(null)
    const editorRef = useRef<any>(null)
    const saveTimer = useRef<number | null>(null)
    const styleElRef = useRef<HTMLStyleElement | null>(null)
    const holderIdRef = useRef<string>(`editorjs-holder-${Date.now().toString(36)}`)

    useEffect(() => {
        let mounted = true
        let editorInstance: any = null

        // scoped CSS to ensure readability in dark UI and allow scrolling
        const css = `#${holderIdRef.current} { max-height: 75vh; overflow-y: auto; }
        #${holderIdRef.current} .codex-editor, #${holderIdRef.current} .ce-block, #${holderIdRef.current} .ce-paragraph p, #${holderIdRef.current} .cdx-input, #${holderIdRef.current} .ce-block__content, #${holderIdRef.current} .cdx-block { color: #e6e6e6 !important; }
        #${holderIdRef.current} .codex-editor { background: transparent; }
        #${holderIdRef.current} .ce-block { padding: 0.35rem 0; }
        #${holderIdRef.current} .ce-paragraph p, #${holderIdRef.current} .ce-block__content p { white-space: pre-wrap; word-break: break-word; }
        #${holderIdRef.current} .cdx-input, #${holderIdRef.current} .ce-paragraph, #${holderIdRef.current} .ce-block__content { caret-color: #ffffff !important; }
        #${holderIdRef.current} .cdx-toolbar, #${holderIdRef.current} .ce-inline-tool, #${holderIdRef.current} .ce-popover { background: rgba(0,0,0,0.6) !important; color: #fff !important }
        `;
        const styleEl = document.createElement('style')
        styleEl.setAttribute('data-editorjs-theme', holderIdRef.current)
        styleEl.appendChild(document.createTextNode(css))
        document.head.appendChild(styleEl)
        styleElRef.current = styleEl

        async function init() {
            const EditorJS = (await import('@editorjs/editorjs')).default
            const Header = (await import('@editorjs/header')).default
            const List = (await import('@editorjs/list')).default
            const Quote = (await import('@editorjs/quote')).default
            const CodeTool = (await import('@editorjs/code')).default
            const Checklist = (await import('@editorjs/checklist')).default
            const Embed = (await import('@editorjs/embed')).default

            if (!mounted) return

            editorInstance = new EditorJS({
                holder: holderRef.current as any,
                placeholder: placeholder || 'Write chapter content...',
                autofocus: true,
                data: value ? { blocks: markdownToBlocks(value) } : undefined,
                tools: {
                    header: Header,
                    list: List,
                    quote: Quote,
                    code: CodeTool,
                    checklist: Checklist,
                    embed: Embed,
                },
                onChange: () => {
                    if (saveTimer.current) window.clearTimeout(saveTimer.current)
                    saveTimer.current = window.setTimeout(async () => {
                        try {
                            const output = await editorInstance.save()
                            const md = blocksToMarkdown(output.blocks)
                            onChange && onChange(md)
                        } catch (e) {
                            console.error('EditorJS save error', e)
                        }
                    }, 600)
                },
            })

            editorRef.current = editorInstance
        }

        init()

        return () => {
            mounted = false
            if (saveTimer.current) {
                window.clearTimeout(saveTimer.current)
                saveTimer.current = null
            }
            if (editorRef.current && editorRef.current.destroy) {
                editorRef.current.destroy()
                editorRef.current = null
            }
            if (styleElRef.current && styleElRef.current.parentNode) {
                styleElRef.current.parentNode.removeChild(styleElRef.current)
                styleElRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="editorjs-wrapper">
            <div ref={holderRef} id={holderIdRef.current} />
        </div>
    )
} 