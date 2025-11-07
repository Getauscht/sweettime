'use client'

import { useEffect, useRef, useState } from 'react'

interface EditorProps {
    data?: any
    onChange?: (data: any) => void
    placeholder?: string
    maxHeight?: string
}

export default function Editor({ data, onChange, placeholder = "Comece a escrever...", maxHeight = "400px" }: EditorProps) {
    const editorRef = useRef<any>(null)
    const holderRef = useRef<HTMLDivElement>(null)
    const [isReady, setIsReady] = useState(false)
    const initialDataUsedRef = useRef<boolean>(false)

    // Creates a fresh EditorJS instance and assigns it to editorRef. This is
    // extracted so we can re-create the editor safely when incoming `data`
    // changes, avoiding render/clear races that can produce errors like
    // "Can't find a Block to remove".
    const createEditor = async (initialData: any) => {
      if (!holderRef.current) return
      try {
        const EditorJS = (await import('@editorjs/editorjs')).default
        const Header = (await import('@editorjs/header')).default
        const List = (await import('@editorjs/list')).default
        const Quote = (await import('@editorjs/quote')).default
        const Code = (await import('@editorjs/code')).default
        const Checklist = (await import('@editorjs/checklist')).default
        const Embed = (await import('@editorjs/embed')).default

        // Ensure any previous instance is destroyed first
        if (editorRef.current && editorRef.current.destroy) {
          try {
            const maybe = editorRef.current.destroy()
            if (maybe && typeof maybe.then === 'function') await maybe
          } catch (e) {
            // ignore
          }
          editorRef.current = null
        }

        const instance = new EditorJS({
          holder: holderRef.current,
          data: initialData,
          placeholder,
          hideToolbar: true,
          minHeight: 0,
          autofocus: false,
          tools: {
            header: { class: Header, inlineToolbar: true, config: { placeholder: 'Digite o título...', levels: [1, 2, 3, 4, 5, 6], defaultLevel: 3 } },
            list: { class: List, inlineToolbar: true, config: { defaultStyle: 'unordered' } },
            quote: { class: Quote, inlineToolbar: true, config: { quotePlaceholder: 'Digite a citação...', captionPlaceholder: 'Autor da citação...' } },
            code: { class: Code, inlineToolbar: true },
            checklist: { class: Checklist, inlineToolbar: true },
            embed: { class: Embed, inlineToolbar: false, config: { services: { youtube: true, vimeo: true, twitter: true, instagram: true, facebook: true, codepen: true, github: true } } }
          },
          onChange: async () => {
            if (onChange && instance) {
              try {
                const outputData = await instance.save()
                onChange(outputData)
              } catch (error) {
                console.error('Saving failed: ', error)
              }
            }
          },
          onReady: () => {
            setIsReady(true)
          }
        })

        editorRef.current = instance
      } catch (e) {
        console.error('Failed to load EditorJS dynamically', e)
      }
    }

    useEffect(() => {
      const initialData = data || { blocks: [{ type: 'paragraph', data: { text: '' } }] }
      initialDataUsedRef.current = !!data
      setIsReady(false)
      // create initial editor instance
      createEditor(initialData)

      return () => {
        if (editorRef.current && editorRef.current.destroy) {
          try {
            const maybe = editorRef.current.destroy()
            if (maybe && typeof maybe.then === 'function') maybe.catch(() => {})
          } catch (_) {}
          editorRef.current = null
        }
      }
    }, [])

    useEffect(() => {
        // When incoming `data` changes after mount, re-create the editor with
        // the new data to avoid calling render/clear on an active instance
        // which can trigger EditorJS internal races (e.g. "Can't find a Block to remove").
        if (!editorRef.current) return
        if (!data) return

        if (initialDataUsedRef.current) {
            initialDataUsedRef.current = false
            return
        }

        // Recreate editor with new data
        (async () => {
            try {
                setIsReady(false)
                await createEditor(data)
            } catch (err) {
                console.error('Failed to recreate editor with new data:', err)
            }
        })()
    }, [data])

    const saveData = async () => {
        if (editorRef.current) {
            try {
                return await editorRef.current.save()
            } catch (error) {
                console.error('Saving failed: ', error)
                return null
            }
        }
        return null
    }

    const clearData = () => {
        if (editorRef.current) {
            editorRef.current.clear()
        }
    }

    // Expose methods via ref if needed
    useEffect(() => {
        if (holderRef.current) {
            (holderRef.current as any).saveData = saveData
        }
    }, [])

    return (
        <div className="editor-container">
            <div
                ref={holderRef}
                className="min-h-[300px] p-4 border border-white/10 rounded-lg bg-[#0f0b14] text-white focus-within:border-purple-500/50 overflow-y-auto"
                style={{ outline: 'none', maxHeight }}
            />
            <style jsx global>{`
        .codex-editor {
          color: white;
        }
        .codex-editor__redactor {
          padding-bottom: 10px !important;
        }
        .ce-block__content,
        .ce-toolbar__content {
          max-width: none;
        }
        .ce-paragraph[data-placeholder]:empty::before {
          color: #666;
        }
        .ce-header {
          color: white;
        }
        .ce-header h1, .ce-header h2, .ce-header h3,
        .ce-header h4, .ce-header h5, .ce-header h6 {
          color: white;
        }
        .ce-list {
          color: white;
        }
        .ce-list__item {
          color: white;
        }
        .ce-quote {
          color: white;
          border-left: 4px solid #666;
        }
        .ce-quote__text {
          color: white;
        }
        .ce-quote__caption {
          color: #ccc;
        }
        .ce-code {
          background: #1a1a1a;
          color: #e6e6e6;
        }
        .ce-checklist {
          color: white;
        }
        .ce-checklist__item {
          color: white;
        }
        .ce-embed {
          color: white;
        }
        .ce-toolbar__plus,
        .ce-toolbar__settings-btn {
          color: white;
        }
        .ce-toolbox {
          background: #2a2a2a;
          color: white;
        }
        .ce-toolbox__toggler {
          color: white;
        }
        .ce-popover {
          background: #2a2a2a;
          color: white;
        }
        .ce-popover__item {
          color: white;
        }
        .ce-popover__item:hover {
          background: #3a3a3a;
        }
      `}</style>
        </div>
    )
} 