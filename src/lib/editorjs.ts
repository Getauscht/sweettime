export function blocksToMarkdown(blocks: any[] = []) {
  let md = ''
  for (const b of blocks) {
    const t = b.type
    const d = b.data || {}
    switch (t) {
      case 'paragraph':
        md += `${d.text}\n\n`
        break
      case 'header':
        md += `${'#'.repeat(d.level || 1)} ${d.text}\n\n`
        break
      case 'list':
        if (d.style === 'ordered') {
          d.items.forEach((it: string, i: number) => { md += `${i + 1}. ${it}\n` })
        } else {
          d.items.forEach((it: string) => { md += `- ${it}\n` })
        }
        md += '\n'
        break
      case 'quote':
        md += `> ${d.text}\n\n`
        break
      case 'code':
        md += `\`\`\`${d.language || ''}\n${d.code}\n\`\`\`\n\n`
        break
      case 'checklist':
        d.items.forEach((it: any) => { md += `${it.checked ? '- [x] ' : '- [ ] '}${it.text}\n` })
        md += '\n'
        break
      case 'embed':
        md += `${d.caption || ''} ${d.embed || ''}\n\n`
        break
      default:
        try { md += `${JSON.stringify(d)}\n\n` } catch { md += '\n' }
    }
  }
  return md.trim()
}

export function isEditorJsData(obj: any) {
    if (!obj) return false
    if (typeof obj === 'string') {
        const s = obj.trim()
        return s.startsWith('{') && s.includes('blocks')
    }
    if (typeof obj === 'object') {
        return Array.isArray(obj.blocks) || Array.isArray(obj?.blocks)
    }
    return false
}

// Very small Markdown -> Editor.js blocks converter.
// It uses simple heuristics to split by blank lines and detect headings, lists,
// code fences, blockquotes and checklists. Not a full parser but good for
// large-chapter usability (so the editor doesn't receive a single giant paragraph).
export function markdownToBlocks(markdown: string) {
    if (!markdown) return []
    const lines = markdown.replace(/\r\n/g, '\n').split('\n')
    const blocks: any[] = []

    let i = 0
    function peek(n = 0) { return lines[i + n] }

    while (i < lines.length) {
        const line = peek().trimEnd()

        // skip consecutive blank lines
        if (line.trim() === '') {
            i++
            continue
        }

        // Code fence
        if (line.startsWith('```')) {
            const lang = line.slice(3).trim()
            i++
            const codeLines: string[] = []
            while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i])
                i++
            }
            // skip closing fence
            if (i < lines.length && lines[i].startsWith('```')) i++
            blocks.push({ type: 'code', data: { code: codeLines.join('\n'), language: lang } })
            continue
        }

        // Header
        const headerMatch = line.match(/^(#{1,6})\s+(.*)$/)
        if (headerMatch) {
            const level = headerMatch[1].length
            const text = headerMatch[2]
            blocks.push({ type: 'header', data: { level, text } })
            i++
            continue
        }

        // Blockquote
        if (line.startsWith('>')) {
            const quoteLines: string[] = []
            while (i < lines.length && lines[i].trim().startsWith('>')) {
                quoteLines.push(lines[i].replace(/^>\s?/, ''))
                i++
            }
            blocks.push({ type: 'quote', data: { text: quoteLines.join('\n') } })
            continue
        }

        // Checklist or unordered list or ordered list
        if (/^(-|\*|\d+\.)\s+/.test(line) || /^- \[.(?:\])? /.test(line)) {
            // gather consecutive list lines
            const items: string[] = []
            let ordered = false
            let checklist = false
            while (i < lines.length) {
                const l = lines[i]
                if (l.trim() === '') break
                const m = l.match(/^\s*(\d+)\.\s+(.*)$/)
                const c = l.match(/^\s*- \[( |x|X)\]\s+(.*)$/)
                const u = l.match(/^\s*[-\*]\s+(.*)$/)
                if (m) {
                    ordered = true
                    items.push(m[2])
                    i++
                    continue
                } else if (c) {
                    checklist = true
                    items.push(JSON.stringify({ checked: c[1].toLowerCase() === 'x', text: c[2] }))
                    i++
                    continue
                } else if (u) {
                    items.push(u[1])
                    i++
                    continue
                }
                break
            }
            if (checklist) {
                // convert back into objects
                const parsed = items.map((j) => { try { return JSON.parse(j) } catch { return { checked: false, text: j } } })
                blocks.push({ type: 'checklist', data: { items: parsed } })
            } else {
                blocks.push({ type: 'list', data: { style: ordered ? 'ordered' : 'unordered', items } })
            }
            continue
        }

        // Paragraph (gather consecutive lines into a paragraph until blank)
        const paraLines: string[] = []
        while (i < lines.length && lines[i].trim() !== '') {
            paraLines.push(lines[i])
            i++
        }
        blocks.push({ type: 'paragraph', data: { text: paraLines.join('\n') } })
    }

    return blocks
}
