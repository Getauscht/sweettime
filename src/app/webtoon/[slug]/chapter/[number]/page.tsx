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

interface Chapter {
    id: string
    number: number
    title: string
    content: unknown
    views: number
    likes: number
    publishedAt: string
    webtoon: {
        id: string
        title: string
        slug: string
        coverImage: string | null
        author: {
            name: string
            slug: string
        }
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
    const [isFullscreen, setIsFullscreen] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)

    // Get or create session ID for anonymous users
    useEffect(() => {
        if (session?.user?.id) return

        let sessionId = localStorage.getItem('reading_session_id')
        if (!sessionId) {
            sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            localStorage.setItem('reading_session_id', sessionId)
        }
        setReadingSessionId(sessionId)
    }, [session])

    // Fetch chapter data
    useEffect(() => {
        if (!slug || !chapterNumber) return

        const fetchChapter = async () => {
            try {
                // First get webtoon to get ID
                const webtoonRes = await fetch(`/api/webtoons/${slug}`)
                if (!webtoonRes.ok) throw new Error('Webtoon not found')
                const webtoonData = await webtoonRes.json()

                // Find chapter by number
                const chapterData = webtoonData.webtoon.allChapters.find(
                    (c: { number: number }) => c.number === parseInt(chapterNumber)
                )
                if (!chapterData) throw new Error('Chapter not found')

                // Fetch full chapter data
                const chapterRes = await fetch(
                    `/api/webtoons/${webtoonData.webtoon.id}/chapters/${chapterData.id}`
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

    // Track reading progress
    useEffect(() => {
        if (!chapter) return

        const handleScroll = () => {
            if (!contentRef.current) return

            const element = contentRef.current
            const scrollPercentage = (window.scrollY / (element.scrollHeight - window.innerHeight)) * 100

            // Update reading history every 10% progress
            if (scrollPercentage % 10 < 1) {
                updateReadingHistory(Math.min(scrollPercentage, 100))
            }
        }

        const updateReadingHistory = async (progress: number) => {
            try {
                await fetch('/api/reading-history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        webtoonId: chapter.webtoon.id,
                        chapterId: chapter.id,
                        progress: Math.round(progress),
                        sessionId: readingSessionId
                    })
                })
            } catch (error) {
                console.error('Error updating reading history:', error)
            }
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [chapter, readingSessionId])

    // Load settings from localStorage
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

    // Save settings to localStorage
    const handleSettingsChange = (newSettings: ReaderSettings) => {
        setReaderSettings(newSettings)
        localStorage.setItem('reader_settings', JSON.stringify(newSettings))
    }

    // Handle chapter change
    const handleChapterChange = (chapterId: string) => {
        if (!chapter) return
        const newChapter = chapter.webtoon.slug
        const targetChapter = navigation?.next?.id === chapterId ? navigation.next : navigation?.prev
        if (targetChapter) {
            router.push(`/webtoon/${chapter.webtoon.slug}/chapter/${targetChapter.number}`)
        }
    }

    // Handle page change (for image-based content)
    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        // Scroll to specific image if array-based content
        if (Array.isArray(chapter?.content) && contentRef.current) {
            const images = contentRef.current.querySelectorAll('img')
            if (images[page - 1]) {
                images[page - 1].scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        }
    }

    // Handle fullscreen toggle
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } else {
            document.exitFullscreen()
            setIsFullscreen(false)
        }
    }

    // Handle double-click for fullscreen
    useEffect(() => {
        if (!readerSettings.doubleClickFullscreen) return

        const handleDoubleClick = () => {
            toggleFullscreen()
        }

        const contentEl = contentRef.current
        if (contentEl) {
            contentEl.addEventListener('dblclick', handleDoubleClick)
            return () => contentEl.removeEventListener('dblclick', handleDoubleClick)
        }
    }, [readerSettings.doubleClickFullscreen])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            const { keyboardShortcuts } = readerSettings

            if (keyboardShortcuts.scrollLeft.includes(e.key)) {
                window.scrollBy({ left: -100, behavior: 'smooth' })
            } else if (keyboardShortcuts.scrollRight.includes(e.key)) {
                window.scrollBy({ left: 100, behavior: 'smooth' })
            } else if (keyboardShortcuts.scrollUp.includes(e.key)) {
                window.scrollBy({ top: -100, behavior: 'smooth' })
            } else if (keyboardShortcuts.scrollDown.includes(e.key)) {
                window.scrollBy({ top: 100, behavior: 'smooth' })
            }
        }

        window.addEventListener('keydown', handleKeyPress)
        return () => window.removeEventListener('keydown', handleKeyPress)
    }, [readerSettings.keyboardShortcuts])

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

    // Parse content - handle both string and JSON formats
    let content = ''
    if (typeof chapter.content === 'string') {
        content = chapter.content
    } else if (chapter.content && typeof chapter.content === 'object') {
        // Define a narrow shape for possible chapter content to avoid 'any' casts
        type ChapterContentShape = { markdown?: string; panels?: { text?: string; content?: string }[] }
        const contentObj = chapter.content as ChapterContentShape

        // If content is JSON, extract markdown text
        if (contentObj.markdown) {
            content = contentObj.markdown
        } else if (contentObj.panels) {
            // If it's panel-based content, concatenate text
            content = contentObj.panels
                .map((panel) => panel.text || panel.content || '')
                .join('\n\n')
        } else {
            content = JSON.stringify(chapter.content)
        }
    }

    return (
        <div className="min-h-screen bg-[#0f0b14]">
            {/* Reader Settings Component */}
            {chapter && (
                <ChapterReaderSettings
                    webtoonTitle={chapter.webtoon.title}
                    chapterNumber={chapter.number}
                    chapterTitle={chapter.title}
                    uploaderId={chapter.webtoon.author.slug}
                    uploaderName={chapter.webtoon.author.name}
                    totalPages={Array.isArray(chapter.content) ? chapter.content.length : 0}
                    currentPage={currentPage}
                    chapters={[]} // TODO: Load all chapters
                    onChapterChange={handleChapterChange}
                    onPageChange={handlePageChange}
                    settings={readerSettings}
                    onSettingsChange={handleSettingsChange}
                />
            )}

            {/* Fixed Header */}
            <header className={`fixed top-0 left-0 right-0 z-40 bg-[#1a1625]/95 backdrop-blur-sm border-b border-purple-600/20 transition-transform duration-300 ${
                readerSettings.headerVisibility === 'hidden' ? '-translate-y-full' : ''
            }`}>
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/">
                                <Button variant="ghost" size="icon" className="text-white hover:bg-purple-600/20 hover:text-purple-400">
                                    <Home className="h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href={`/webtoon/${chapter.webtoon.slug}`}>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-purple-600/20 hover:text-purple-400">
                                    <List className="h-5 w-5" />
                                </Button>
                            </Link>
                        </div>

                        <div className="flex-1 text-center">
                            <h1 className="text-lg font-semibold text-gray-100 truncate">
                                {chapter.webtoon.title}
                            </h1>
                            <p className="text-sm text-gray-400">
                                Capítulo {chapter.number}: {chapter.title}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {navigation?.prev && (
                                <Link href={`/webtoon/${chapter.webtoon.slug}/chapter/${navigation.prev.number}`}>
                                    <Button variant="ghost" size="icon" className="text-white hover:bg-purple-600/20 hover:text-purple-400">
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                </Link>
                            )}
                            {navigation?.next && (
                                <Link href={`/webtoon/${chapter.webtoon.slug}/chapter/${navigation.next.number}`}>
                                    <Button variant="ghost" size="icon" className="text-white hover:bg-purple-600/20 hover:text-purple-400">
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="pt-24 pb-12">
                <div className={`container mx-auto px-4 ${readerSettings.pageMode === 'vertical-scroll' ? 'max-w-4xl' : 'max-w-7xl'}`}>
                    <div 
                        ref={contentRef}
                        style={{ 
                            gap: `${readerSettings.pageSpacing}px`,
                            direction: readerSettings.readingDirection 
                        }}
                        className={`
                            ${readerSettings.grayscale ? 'grayscale' : ''}
                            ${readerSettings.dimmed ? 'opacity-70' : ''}
                        `}
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
                                        alt={`Page ${index + 1}`}
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
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        code: ({ node, inline, ...props }: any) => inline ? <code className="bg-purple-600/20 text-purple-300 px-1 py-0.5 rounded" {...props} /> : <code className="block bg-[#1a1625] text-gray-300 p-4 rounded-lg overflow-x-auto my-4" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-1" {...props} />,
                                        a: ({ node, ...props }) => <a className="text-purple-400 hover:text-purple-300 underline" target="_blank" rel="noopener noreferrer" {...props} />
                                    }}
                                >
                                    {typeof chapter.content === 'string' ? chapter.content : JSON.stringify(chapter.content)}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>

                    {/* Navigation Footer */}
                    <div className="mt-12 pt-8 border-t border-purple-600/20">
                        <div className="flex items-center justify-between">
                            {navigation?.prev ? (
                                <Link href={`/webtoon/${chapter.webtoon.slug}/chapter/${navigation.prev.number}`}>
                                    <Button variant="outline" className="gap-2 border-purple-600/20 text-white hover:bg-purple-600/20 hover:text-purple-400">
                                        <ChevronLeft className="h-4 w-4" />
                                        Capítulo Anterior
                                    </Button>
                                </Link>
                            ) : (
                                <div />
                            )}

                            <Link href={`/webtoon/${chapter.webtoon.slug}`}>
                                <Button variant="outline" className="border-purple-600/20 text-white hover:bg-purple-600/20 hover:text-purple-400">
                                    <List className="h-4 w-4 mr-2" />
                                    Todos os Capítulos
                                </Button>
                            </Link>

                            {navigation?.next ? (
                                <Link href={`/webtoon/${chapter.webtoon.slug}/chapter/${navigation.next.number}`}>
                                    <Button variant="outline" className="gap-2 border-purple-600/20 text-white hover:bg-purple-600/20 hover:text-purple-400">
                                        Próximo Capítulo
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            ) : (
                                <div />
                            )}
                        </div>
                    </div>

                    {/* Comments Section for this chapter */}
                    <div className="mt-8">
                        <CommentsSection chapterId={chapter.id} webtoonId={chapter.webtoon.id} />
                    </div>
                </div>
            </main>

            {/* Progress Bar */}
            {readerSettings.progressBarStyle !== 'hidden' && (
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

            {/* Page Number Indicator */}
            {readerSettings.progressBarStyle === 'hidden' && readerSettings.showPageNumberWhenHidden && Array.isArray(chapter.content) && (
                <div className="fixed bottom-4 right-4 bg-purple-600/90 text-white px-3 py-1 rounded-full text-sm z-30">
                    {currentPage} / {chapter.content.length}
                </div>
            )}
        </div>
    )
}
