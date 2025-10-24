'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Settings, ChevronLeft, ChevronRight, Maximize, BookOpen, List, Columns2, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReaderConfig {
    readingMode: 'book' | 'list'
    pagesPerView: 1 | 2
    listDirection: 'vertical' | 'horizontal'
    readingDirection: 'ltr' | 'rtl'
    menuPosition: 'right' | 'left' | 'bottom'
    grayscale: boolean
    spacing: boolean
    fullscreen: boolean
}

interface ChapterReaderProps {
    chapterNumber: number
    totalPages: number
    onPrevious: () => void
    onNext: () => void
    canGoPrevious: boolean
    canGoNext: boolean
}

export default function ChapterReader({
    chapterNumber,
    totalPages,
    onPrevious,
    onNext,
    canGoPrevious,
    canGoNext
}: ChapterReaderProps) {
    const [currentPage, setCurrentPage] = useState(1)
    const [showControls, setShowControls] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [config, setConfig] = useState<ReaderConfig>({
        readingMode: 'list',
        pagesPerView: 1,
        listDirection: 'vertical',
        readingDirection: 'ltr',
        menuPosition: 'bottom',
        grayscale: false,
        spacing: true,
        fullscreen: false
    })

    const readerRef = useRef<HTMLDivElement>(null)
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (config.fullscreen && readerRef.current) {
            readerRef.current.requestFullscreen?.()
        } else if (!config.fullscreen && document.fullscreenElement) {
            document.exitFullscreen?.()
        }
    }, [config.fullscreen])

    const handleReaderClick = () => {
        setShowControls(true)
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current)
        }
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false)
            controlsTimeoutRef.current = null
        }, 3000)
    }

    const goToNextPage = () => {
        if (config.readingMode === 'book') {
            const nextPage = currentPage + config.pagesPerView
            if (nextPage <= totalPages) {
                setCurrentPage(nextPage)
            } else if (canGoNext) {
                onNext()
            }
        } else if (canGoNext) {
            onNext()
        }
    }

    const goToPreviousPage = () => {
        if (config.readingMode === 'book') {
            const prevPage = currentPage - config.pagesPerView
            if (prevPage >= 1) {
                setCurrentPage(prevPage)
            } else if (canGoPrevious) {
                onPrevious()
            }
        } else if (canGoPrevious) {
            onPrevious()
        }
    }

    const updateConfig = <K extends keyof ReaderConfig>(key: K, value: ReaderConfig[K]) => {
        setConfig(prev => ({ ...prev, [key]: value }))
    }

    const progress = config.readingMode === 'book'
        ? (currentPage / totalPages) * 100
        : 0

    const renderPages = () => {
        const pages = []
        for (let i = 1; i <= totalPages; i++) {
            pages.push(
                <div
                    key={i}
                    className={`flex-shrink-0 flex items-center justify-center ${config.grayscale ? 'grayscale' : ''
                        } ${config.readingMode === 'book'
                            ? config.pagesPerView === 2
                                ? 'w-1/2'
                                : 'w-full'
                            : config.listDirection === 'vertical'
                                ? 'w-full'
                                : 'w-full'
                        }`}
                    style={{
                        aspectRatio: config.readingMode === 'list' ? '9/16' : undefined,
                        marginBottom: config.readingMode === 'list' && config.listDirection === 'vertical' && config.spacing ? '1rem' : 0,
                        marginRight: config.readingMode === 'list' && config.listDirection === 'horizontal' && config.spacing ? '1rem' : 0
                    }}
                >
                    <div className="w-full h-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg flex items-center justify-center">
                        <div className="text-6xl">📖</div>
                        <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded text-sm">
                            Page {i}
                        </div>
                    </div>
                </div>
            )
        }
        return pages
    }

    const getContainerClasses = () => {
        if (config.readingMode === 'book') {
            return `flex ${config.readingDirection === 'rtl' ? 'flex-row-reverse' : 'flex-row'} items-center justify-center h-full`
        }
        if (config.listDirection === 'vertical') {
            return 'flex flex-col items-center overflow-y-auto h-full'
        }
        return `flex ${config.readingDirection === 'rtl' ? 'flex-row-reverse' : 'flex-row'} items-center overflow-x-auto h-full`
    }

    const SettingsPanel = () => (
        <div className={`fixed ${config.menuPosition === 'right' ? 'right-4 top-20' :
            config.menuPosition === 'left' ? 'left-4 top-20' :
                'bottom-24 left-1/2 -translate-x-1/2'
            } bg-[#0f0b14] border border-white/10 rounded-lg p-4 w-80 z-[60] shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Configurações do Leitor</h3>
                <button onClick={() => setShowSettings(false)} className="text-white/60 hover:text-white">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="space-y-4">
                {/* Modo de Leitura */}
                <div>
                    <label className="text-sm text-white/80 mb-2 block">Modo de Leitura</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => updateConfig('readingMode', 'book')}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${config.readingMode === 'book'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            <BookOpen className="h-4 w-4" />
                            Livro
                        </button>
                        <button
                            onClick={() => updateConfig('readingMode', 'list')}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${config.readingMode === 'list'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            <List className="h-4 w-4" />
                            Lista
                        </button>
                    </div>
                </div>

                {/* Páginas por Visualização */}
                {config.readingMode === 'book' && (
                    <div>
                        <label className="text-sm text-white/80 mb-2 block">Páginas por Tela</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => updateConfig('pagesPerView', 1)}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${config.pagesPerView === 1
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                1 Página
                            </button>
                            <button
                                onClick={() => updateConfig('pagesPerView', 2)}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${config.pagesPerView === 2
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                <Columns2 className="h-4 w-4" />
                                2 Páginas
                            </button>
                        </div>
                    </div>
                )}

                {/* Direção da Lista */}
                {config.readingMode === 'list' && (
                    <div>
                        <label className="text-sm text-white/80 mb-2 block">Direção da Lista</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => updateConfig('listDirection', 'vertical')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${config.listDirection === 'vertical'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                Vertical
                            </button>
                            <button
                                onClick={() => updateConfig('listDirection', 'horizontal')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${config.listDirection === 'horizontal'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                Horizontal
                            </button>
                        </div>
                    </div>
                )}

                {/* Sentido de Leitura */}
                <div>
                    <label className="text-sm text-white/80 mb-2 block">Sentido de Leitura</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => updateConfig('readingDirection', 'ltr')}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${config.readingDirection === 'ltr'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            <ArrowRight className="h-4 w-4" />
                            Esquerda → Direita
                        </button>
                        <button
                            onClick={() => updateConfig('readingDirection', 'rtl')}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${config.readingDirection === 'rtl'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Direita → Esquerda
                        </button>
                    </div>
                </div>

                {/* Posição do Menu */}
                <div>
                    <label className="text-sm text-white/80 mb-2 block">Posição do Menu</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => updateConfig('menuPosition', 'left')}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${config.menuPosition === 'left'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            Esquerda
                        </button>
                        <button
                            onClick={() => updateConfig('menuPosition', 'bottom')}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${config.menuPosition === 'bottom'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            Inferior
                        </button>
                        <button
                            onClick={() => updateConfig('menuPosition', 'right')}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${config.menuPosition === 'right'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            Direita
                        </button>
                    </div>
                </div>

                {/* Opções Adicionais */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.grayscale}
                            onChange={(e) => updateConfig('grayscale', e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5"
                        />
                        Escala de Cinza
                    </label>

                    {config.readingMode === 'list' && (
                        <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.spacing}
                                onChange={(e) => updateConfig('spacing', e.target.checked)}
                                className="w-4 h-4 rounded border-white/20 bg-white/5"
                            />
                            Espaço entre Imagens
                        </label>
                    )}

                    <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.fullscreen}
                            onChange={(e) => updateConfig('fullscreen', e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5"
                        />
                        <Maximize className="h-4 w-4" />
                        Modo Tela Cheia
                    </label>
                </div>
            </div>
        </div>
    )

    return (
        <div ref={readerRef} className="relative h-full bg-[#1a1625] overflow-hidden">
            {/* Reader Content */}
            <div
                onClick={handleReaderClick}
                className={`h-full ${getContainerClasses()} p-4 cursor-pointer`}
            >
                {config.readingMode === 'book' ? (
                    <div className="flex items-center justify-center gap-4 h-full w-full max-w-6xl mx-auto">
                        {renderPages().slice(currentPage - 1, currentPage - 1 + config.pagesPerView)}
                    </div>
                ) : (
                    renderPages()
                )}
            </div>

            {/* Bottom Controls Bar */}
            <div
                className={`fixed bottom-0 left-0 right-0 bg-[#0f0b14]/95 backdrop-blur-sm border-t border-white/10 transition-transform duration-300 z-50 ${showControls ? 'translate-y-0' : 'translate-y-full'
                    }`}
            >
                {/* Progress Bar */}
                {config.readingMode === 'book' && (
                    <div className="h-1 bg-white/10">
                        <div
                            className="h-full bg-purple-600 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center justify-between px-4 py-3">
                    <Button
                        onClick={goToPreviousPage}
                        disabled={config.readingMode === 'book' ? (currentPage === 1 && !canGoPrevious) : !canGoPrevious}
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/10 disabled:opacity-30"
                    >
                        <ChevronLeft className="h-5 w-5 mr-1" />
                        Anterior
                    </Button>

                    <div className="flex items-center gap-4">
                        {config.readingMode === 'book' && (
                            <span className="text-white/80 text-sm">
                                {currentPage} / {totalPages}
                            </span>
                        )}
                        <span className="text-white/60 text-sm">
                            Capítulo {chapterNumber}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setShowSettings(!showSettings)}
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/10"
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                        <Button
                            onClick={goToNextPage}
                            disabled={config.readingMode === 'book' ? (currentPage >= totalPages && !canGoNext) : !canGoNext}
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/10 disabled:opacity-30"
                        >
                            Próximo
                            <ChevronRight className="h-5 w-5 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && <SettingsPanel />}
        </div>
    )
}
