/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { Button } from '@/components/ui/button'
import CommentsSection from '@/components/CommentsSection'
import ChapterReaderSettings, { ReaderSettings, defaultSettings } from '@/components/ChapterReaderSettings'
import { ChevronLeft, ChevronRight, Home, List } from 'lucide-react'
import { isEditorJsData, blocksToMarkdown } from '@/lib/editorjs'

interface Chapter {
    id: string
    number: number
    title: string
    content: unknown
    contentType: string
    views: number
    likes: number
    publishedAt: string
    work: {
        id: string
        title: string
        slug: string
        coverImage: string | null
        type: 'webtoon' | 'novel'
        authors: Array<{
            name: string
            slug: string
        }>
    }
    scanlationGroup?: {
        id: string
        name: string
    }
}

interface Navigation {
    next: {
        id: string
        number: number
        title: string
    } | null
    prev: {
        id: string
        number: number
        title: string
    } | null
}

export default function ChapterPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session } = useSession()
    const slug = params?.slug as string
    const chapterNumber = params?.number as string

    const [chapter, setChapter] = useState<Chapter | null>(null)
    const [navigation, setNavigation] = useState<Navigation | null>(null)
    const [loading, setLoading] = useState(true)
    const [readingSessionId, setReadingSessionId] = useState<string | null>(null)
    const [readerSettings, setReaderSettings] = useState<ReaderSettings>(defaultSettings)
    const [currentPage, setCurrentPage] = useState(1)
    const contentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (session?.user?.id) return

        let sessionId = localStorage.getItem('reading_session_id')
        if (!sessionId) {
            sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            localStorage.setItem('reading_session_id', sessionId)
        }
        setReadingSessionId(sessionId)
    }, [session])

    useEffect(() => {
        if (!slug || !chapterNumber) return

        const fetchChapter = async () => {
            try {
                const workRes = await fetch(`/api/obra/${slug}`)
                if (!workRes.ok) throw new Error('Work not found')
                const workData = await workRes.json()
                const work = workData.work

                const chapterData = work.allChapters.find(
                    (c: { number: number }) => c.number === parseInt(chapterNumber)
                )
                if (!chapterData) throw new Error('Chapter not found')

                const chapterRes = await fetch(
                    `/api/obra/${work.id}/chapters/${chapterData.id}`
                )
                if (!chapterRes.ok) throw new Error('Failed to fetch chapter')
                const data = await chapterRes.json()

                setChapter(data.chapter)
                setNavigation(data.navigation)
            } catch (error) {
                console.error('Error:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchChapter()
    }, [slug, chapterNumber])

    useEffect(() => {
        if (!chapter) return

        const handleScroll = () => {
            if (!contentRef.current) return

            const element = contentRef.current
            const scrollPercentage = (window.scrollY / (element.scrollHeight - window.innerHeight)) * 100

            if (scrollPercentage % 10 < 1) {
                updateReadingHistory(Math.min(scrollPercentage, 100))
            }
        }

        const updateReadingHistory = async (progress: number) => {
            try {
                const body = chapter.work.type === 'webtoon'
                    ? {
                        webtoonId: chapter.work.id,
                        chapterId: chapter.id,
                        progress: Math.round(progress),
                        sessionId: readingSessionId
                    }
                    : {
                        novelId: chapter.work.id,
                        novelChapterId: chapter.id,
                        progress: Math.round(progress),
                        sessionId: readingSessionId
                    }

                await fetch('/api/reading-history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                })
            } catch (error) {
                console.error('Error updating reading history:', error)
            }
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [chapter, readingSessionId])

    useEffect(() => {
        const savedSettings = localStorage.getItem('reader_settings')
        if (savedSettings) {
            try {
                setReaderSettings(JSON.parse(savedSettings))
            } catch (e) {
                console.error('Error loading reader settings:', e)
            }
        }
    }, [])

    const handleSettingsChange = (newSettings: ReaderSettings) => {
        setReaderSettings(newSettings)
        localStorage.setItem('reader_settings', JSON.stringify(newSettings))
    }

    const handleChapterChange = (chapterId: string) => {
        if (!chapter) return
        const targetChapter = navigation?.next?.id === chapterId ? navigation.next : navigation?.prev
        if (targetChapter) {
            router.push(`/obra/${chapter.work.slug}/chapter/${targetChapter.number}`)
        }
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        if (Array.isArray(chapter?.content) && contentRef.current) {
            const images = contentRef.current.querySelectorAll('img')
            if (images[page - 1]) {
                images[page - 1].scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f0b14] flex items-center justify-center">
                <div className="text-gray-400">Carregando...</div>
            </div>
        )
    }

    if (!chapter) {
        return (
            <div className="min-h-screen bg-[#0f0b14] flex items-center justify-center">
                <div className="text-gray-400">Capítulo não encontrado</div>
            </div>
        )
    }

    let markdownContent = ''
    const raw = chapter.content

    if (Array.isArray(raw)) {
        markdownContent = ''
    } else if (typeof raw === 'string') {
        const s = raw.trim()
        if (isEditorJsData(s)) {
            try {
                const parsed = JSON.parse(s)
                markdownContent = blocksToMarkdown(parsed.blocks || [])
            } catch (e) {
                markdownContent = raw
            }
        } else {
            markdownContent = raw
        }
    } else if (raw && typeof raw === 'object') {
        if ((raw as any).markdown) {
            markdownContent = (raw as any).markdown
        } else if ((raw as any).blocks) {
            markdownContent = blocksToMarkdown((raw as any).blocks || [])
        } else {
            markdownContent = JSON.stringify(raw)
        }
    }

    return (
        <div className="min-h-screen bg-[#0f0b14]">
            {chapter && chapter.work.type === 'webtoon' && (
                <ChapterReaderSettings
                    webtoonTitle={chapter.work.title}
                    chapterNumber={chapter.number}
                    chapterTitle={chapter.title || ''}
                    uploaderId={chapter.work.authors?.[0]?.slug || ''}
                    uploaderName={chapter.work.authors?.[0]?.name || 'Desconhecido'}
                    totalPages={Array.isArray(chapter.content) ? chapter.content.length : 0}
                    currentPage={currentPage}
                    chapters={[]}
                    onChapterChange={handleChapterChange}
                    onPageChange={handlePageChange}
                    settings={readerSettings}
                    onSettingsChange={handleSettingsChange}
                />
            )}

            <header className={`fixed top-0 left-0 right-0 z-40 bg-[#1a1625]/95 backdrop-blur-sm border-b border-purple-600/20 transition-transform duration-300 ${chapter.work.type === 'webtoon' && readerSettings.headerVisibility === 'hidden' ? '-translate-y-full' : ''
                }`}>
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/">
                                <Button variant="ghost" size="icon" className="text-white hover:bg-purple-600/20 hover:text-purple-400">
                                    <Home className="h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href={`/obra/${chapter.work.slug}`}>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-purple-600/20 hover:text-purple-400">
                                    <List className="h-5 w-5" />
                                </Button>
                            </Link>
                        </div>

                        <div className="flex-1 text-center">
                            <h1
                                data-page-title={chapter ? `${chapter.work.title} - Capítulo ${chapter.number}${chapter.title ? `: ${chapter.title}` : ''}` : undefined}
                                className="text-lg font-semibold text-gray-100 truncate"
                            >
                                {chapter.work.title}
                            </h1>
                            <p className="text-sm text-gray-400">
                                Capítulo {chapter.number}{chapter.title ? `: ${chapter.title}` : ''}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {navigation?.prev && (
                                <Link href={`/obra/${chapter.work.slug}/chapter/${navigation.prev.number}`}>
                                    <Button variant="ghost" size="icon" className="text-white hover:bg-purple-600/20 hover:text-purple-400">
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                </Link>
                            )}
                            {navigation?.next && (
                                <Link href={`/obra/${chapter.work.slug}/chapter/${navigation.next.number}`}>
                                    <Button variant="ghost" size="icon" className="text-white hover:bg-purple-600/20 hover:text-purple-400">
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-12">
                <div className={`container mx-auto px-4 ${chapter.work.type === 'webtoon' && readerSettings.pageMode === 'vertical-scroll' ? 'max-w-4xl' : 'max-w-7xl'
                    }`}>
                    <div
                        ref={contentRef}
                        style={{
                            gap: chapter.work.type === 'webtoon' ? `${readerSettings.pageSpacing}px` : undefined,
                            direction: chapter.work.type === 'webtoon' ? readerSettings.readingDirection : undefined
                        }}
                        className={
                            chapter.work.type === 'webtoon' ? `
                                ${readerSettings.grayscale ? 'grayscale' : ''}
                                ${readerSettings.dimmed ? 'opacity-70' : ''}
                            ` : ''
                        }
                    >
                        {Array.isArray(chapter.content) ? (
                            <div
                                className={`
                                    ${readerSettings.pageMode === 'vertical-scroll' ? 'flex flex-col' : ''}
                                    ${readerSettings.pageMode === 'horizontal-scroll' ? 'flex flex-row overflow-x-auto' : ''}
                                    ${readerSettings.pageMode === 'single' ? 'grid grid-cols-1' : ''}
                                    ${readerSettings.pageMode === 'double' ? 'grid grid-cols-2' : ''}
                                `}
                                style={{ gap: `${readerSettings.pageSpacing}px` }}
                            >
                                {chapter.content.map((url, index) => (
                                    <img
                                        key={index}
                                        src={url}
                                        alt={`Página ${index + 1}`}
                                        className={`
                                            rounded-lg mx-auto block
                                            ${readerSettings.fitWidth && readerSettings.fitHeight ? 'w-full h-screen object-contain' : ''}
                                            ${readerSettings.fitWidth && !readerSettings.fitHeight ? 'w-full h-auto' : ''}
                                            ${!readerSettings.fitWidth && readerSettings.fitHeight ? 'h-screen w-auto' : ''}
                                            ${!readerSettings.fitWidth && !readerSettings.fitHeight ? 'max-w-full h-auto' : ''}
                                            ${readerSettings.stretchSmallPages ? 'min-w-full' : ''}
                                        `}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="prose prose-invert prose-purple max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-gray-100 mb-4" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-gray-100 mb-3" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-gray-100 mb-2" {...props} />,
                                        p: ({ node, ...props }) => <p className="text-gray-300 mb-4 leading-relaxed" {...props} />,
                                        img: ({ node, ...props }) => <img className="w-full h-auto rounded-lg my-6" {...props} alt={props.alt || ''} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-purple-600 pl-4 italic text-gray-400 my-4" {...props} />,
                                        code: ({ node, inline, ...props }: any) => inline ? <code className="bg-purple-600/20 text-purple-300 px-1 py-0.5 rounded" {...props} /> : <code className="block bg-[#1a1625] text-gray-300 p-4 rounded-lg overflow-x-auto my-4" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-1" {...props} />,
                                        a: ({ node, ...props }) => <a className="text-purple-400 hover:text-purple-300 underline" target="_blank" rel="noopener noreferrer" {...props} />
                                    }}
                                >
                                    {markdownContent}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>

                    <div className="mt-12 pt-8 border-t border-purple-600/20">
                        <div className="flex items-center justify-between">
                            {navigation?.prev ? (
                                <Link href={`/obra/${chapter.work.slug}/chapter/${navigation.prev.number}`}>
                                    <Button variant="ghost" className="gap-2 bg-white/5 text-white hover:bg-purple-600/20 hover:text-purple-400">
                                        <ChevronLeft className="h-4 w-4" />
                                        Capítulo Anterior
                                    </Button>
                                </Link>
                            ) : (
                                <div />
                            )}

                            <Link href={`/obra/${chapter.work.slug}`}>
                                <Button variant="ghost" className="bg-white/5 text-white hover:bg-purple-600/20 hover:text-purple-400">
                                    <List className="h-4 w-4 mr-2" />
                                    Todos os Capítulos
                                </Button>
                            </Link>

                            {navigation?.next ? (
                                <Link href={`/obra/${chapter.work.slug}/chapter/${navigation.next.number}`}>
                                    <Button variant="ghost" className="gap-2 bg-white/5 text-white hover:bg-purple-600/20 hover:text-purple-400">
                                        Próximo Capítulo
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            ) : (
                                <div />
                            )}
                        </div>
                    </div>

                    <div className="mt-8">
                        {chapter.work.type === 'webtoon' ? (
                            <CommentsSection chapterId={chapter.id} webtoonId={chapter.work.id} />
                        ) : (
                            <CommentsSection novelChapterId={chapter.id} novelId={chapter.work.id} />
                        )}
                    </div>
                </div>
            </main>

            {chapter.work.type === 'webtoon' && readerSettings.progressBarStyle !== 'hidden' && (
                <div
                    className={`
                        fixed z-30
                        ${readerSettings.progressBarPosition === 'bottom' ? 'bottom-0 left-0 right-0 h-1' : ''}
                        ${readerSettings.progressBarPosition === 'left' ? 'left-0 top-0 bottom-0 w-1' : ''}
                        ${readerSettings.progressBarPosition === 'right' ? 'right-0 top-0 bottom-0 w-1' : ''}
                        ${readerSettings.progressBarStyle === 'light' ? 'bg-purple-600/30' : 'bg-purple-600'}
                    `}
                    style={{
                        [readerSettings.progressBarPosition === 'bottom' ? 'width' : 'height']:
                            `${((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100) || 0}%`
                    }}
                />
            )}

            {chapter.work.type === 'webtoon' && readerSettings.progressBarStyle === 'hidden' && readerSettings.showPageNumberWhenHidden && Array.isArray(chapter.content) && (
                <div className="fixed bottom-4 right-4 bg-purple-600/90 text-white px-3 py-1 rounded-full text-sm z-30">
                    {currentPage} / {chapter.content.length}
                </div>
            )}
        </div>
    )
}
