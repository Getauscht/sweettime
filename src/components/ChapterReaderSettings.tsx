'use client'

import { useState } from 'react'
import { Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ReaderSettings {
    // Image adjustment
    fitWidth: boolean
    fitHeight: boolean
    stretchSmallPages: boolean
    grayscale: boolean
    dimmed: boolean

    // Reading style
    pageMode: 'single' | 'double' | 'vertical-scroll' | 'horizontal-scroll'
    pageSpacing: number
    readingDirection: 'ltr' | 'rtl'

    // Header visibility
    headerVisibility: 'hidden' | 'fixed' | 'auto-hide'

    // Progress bar
    progressBarStyle: 'hidden' | 'light' | 'progress-bar'
    progressBarPosition: 'bottom' | 'left' | 'right'
    showPageNumberWhenHidden: boolean

    // Behavior
    autoAdvanceChapter: boolean
    doubleClickFullscreen: boolean

    // Keyboard shortcuts
    keyboardShortcuts: {
        scrollLeft: string[]
        scrollRight: string[]
        scrollUp: string[]
        scrollDown: string[]
    }
}

export const defaultSettings: ReaderSettings = {
    fitWidth: true,
    fitHeight: false,
    stretchSmallPages: false,
    grayscale: false,
    dimmed: false,
    pageMode: 'vertical-scroll',
    pageSpacing: 10,
    readingDirection: 'ltr',
    headerVisibility: 'auto-hide',
    progressBarStyle: 'progress-bar',
    progressBarPosition: 'bottom',
    showPageNumberWhenHidden: true,
    autoAdvanceChapter: true,
    doubleClickFullscreen: true,
    keyboardShortcuts: {
        scrollLeft: ['ArrowLeft', 'a', 'Numpad4'],
        scrollRight: ['ArrowRight', 'd', 'Numpad6'],
        scrollUp: ['ArrowUp', 'w', 'Numpad8'],
        scrollDown: ['ArrowDown', 's', 'Numpad2']
    }
}

interface Props {
    webtoonTitle: string
    chapterNumber: number
    chapterTitle: string
    uploaderId: string
    uploaderName: string
    totalPages?: number
    currentPage?: number
    chapters: Array<{ id: string; number: number; title: string }>
    onChapterChange: (chapterId: string) => void
    onPageChange: (page: number) => void
    settings: ReaderSettings
    onSettingsChange: (settings: ReaderSettings) => void
}

export default function ChapterReaderSettings({
    webtoonTitle,
    chapterNumber,
    chapterTitle,
    uploaderName,
    totalPages = 0,
    currentPage = 1,
    chapters,
    onChapterChange,
    onPageChange,
    settings,
    onSettingsChange
}: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
    const [editingShortcut, setEditingShortcut] = useState<string | null>(null)

    const updateSetting = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
        onSettingsChange({ ...settings, [key]: value })
    }

    const handleKeyPress = (e: React.KeyboardEvent, action: string) => {
        if (e.key === 'Escape') {
            setEditingShortcut(null)
            return
        }

        const key = e.key
        const shortcuts = { ...settings.keyboardShortcuts }

        // Remove key from all actions
        Object.keys(shortcuts).forEach(k => {
            shortcuts[k as keyof typeof shortcuts] = shortcuts[k as keyof typeof shortcuts].filter(s => s !== key)
        })

        // Add to current action
        if (action === 'scrollLeft') shortcuts.scrollLeft = [...shortcuts.scrollLeft, key]
        else if (action === 'scrollRight') shortcuts.scrollRight = [...shortcuts.scrollRight, key]
        else if (action === 'scrollUp') shortcuts.scrollUp = [...shortcuts.scrollUp, key]
        else if (action === 'scrollDown') shortcuts.scrollDown = [...shortcuts.scrollDown, key]

        updateSetting('keyboardShortcuts', shortcuts)
        setEditingShortcut(null)
    }

    const removeShortcut = (action: string, key: string) => {
        const shortcuts = { ...settings.keyboardShortcuts }
        if (action === 'scrollLeft') shortcuts.scrollLeft = shortcuts.scrollLeft.filter(k => k !== key)
        else if (action === 'scrollRight') shortcuts.scrollRight = shortcuts.scrollRight.filter(k => k !== key)
        else if (action === 'scrollUp') shortcuts.scrollUp = shortcuts.scrollUp.filter(k => k !== key)
        else if (action === 'scrollDown') shortcuts.scrollDown = shortcuts.scrollDown.filter(k => k !== key)

        updateSetting('keyboardShortcuts', shortcuts)
    }

    const resetShortcuts = (action: string) => {
        const shortcuts = { ...settings.keyboardShortcuts }
        if (action === 'scrollLeft') shortcuts.scrollLeft = defaultSettings.keyboardShortcuts.scrollLeft
        else if (action === 'scrollRight') shortcuts.scrollRight = defaultSettings.keyboardShortcuts.scrollRight
        else if (action === 'scrollUp') shortcuts.scrollUp = defaultSettings.keyboardShortcuts.scrollUp
        else if (action === 'scrollDown') shortcuts.scrollDown = defaultSettings.keyboardShortcuts.scrollDown

        updateSetting('keyboardShortcuts', shortcuts)
    }

    return (
        <>
            {/* Settings Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="ghost"
                size="icon"
                className="fixed top-20 right-4 z-40 bg-purple-600/90 hover:bg-purple-700 text-white"
            >
                <Settings className="h-5 w-5" />
            </Button>

            {/* Settings Sidebar */}
            <div
                className={`fixed top-0 right-0 h-full w-96 bg-[#1a1625] border-l border-purple-600/20 transform transition-transform duration-300 z-50 overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Configurações do Leitor</h2>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/5 rounded transition-colors"
                        >
                            <X className="h-5 w-5 text-white" />
                        </button>
                    </div>

                    {/* Webtoon Info */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-purple-400">Obra</h3>
                        <p className="text-white">{webtoonTitle}</p>
                    </div>

                    {/* Chapter Info */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-purple-400">Capítulo</h3>
                        <p className="text-white">Capítulo {chapterNumber}: {chapterTitle}</p>
                    </div>

                    {/* Page Selector */}
                    {totalPages > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-purple-400">Página</h3>
                            <select
                                value={currentPage}
                                onChange={(e) => onPageChange(parseInt(e.target.value))}
                                className="w-full bg-[#0f0b14] border border-white/10 rounded px-3 py-2 text-white"
                            >
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <option key={page} value={page}>Página {page}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Chapter Selector */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-purple-400">Capítulos</h3>
                        <select
                            value={chapters.find(c => c.number === chapterNumber)?.id}
                            onChange={(e) => onChapterChange(e.target.value)}
                            className="w-full bg-[#0f0b14] border border-white/10 rounded px-3 py-2 text-white"
                        >
                            {chapters.map(chapter => (
                                <option key={chapter.id} value={chapter.id}>
                                    Cap. {chapter.number}: {chapter.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Uploader */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-purple-400">Uploader</h3>
                        <p className="text-white/80">{uploaderName}</p>
                    </div>

                    {/* Reading Style */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-purple-400">Estilo de Leitura</h3>
                        <select
                            value={settings.pageMode}
                            onChange={(e) => updateSetting('pageMode', e.target.value as ReaderSettings['pageMode'])}
                            className="w-full bg-[#0f0b14] border border-white/10 rounded px-3 py-2 text-white"
                        >
                            <option value="single">Página Única</option>
                            <option value="double">Página Dupla</option>
                            <option value="vertical-scroll">Rolagem Vertical</option>
                            <option value="horizontal-scroll">Rolagem Horizontal</option>
                        </select>
                    </div>

                    {/* Image Fit */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-purple-400">Ajustar Página</h3>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.fitWidth}
                                    onChange={(e) => updateSetting('fitWidth', e.target.checked)}
                                    className="w-4 h-4 rounded border-white/10 bg-[#0f0b14] text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-white text-sm">Largura Total</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.fitHeight}
                                    onChange={(e) => updateSetting('fitHeight', e.target.checked)}
                                    className="w-4 h-4 rounded border-white/10 bg-[#0f0b14] text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-white text-sm">Altura Total</span>
                            </label>
                        </div>
                    </div>

                    {/* More Settings Button */}
                    <Button
                        onClick={() => setShowAdvancedSettings(true)}
                        variant="outline"
                        className="w-full"
                    >
                        Mais Configurações
                    </Button>
                </div>
            </div>

            {/* Advanced Settings Modal */}
            {showAdvancedSettings && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                    <div className="bg-[#1a1625] rounded-lg border border-purple-600/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-white">Configurações Avançadas</h2>
                                <button
                                    onClick={() => setShowAdvancedSettings(false)}
                                    className="p-2 hover:bg-white/5 rounded transition-colors"
                                >
                                    <X className="h-5 w-5 text-white" />
                                </button>
                            </div>

                            {/* Page Style Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-purple-400">Estilo da Página</h3>

                                <div className="space-y-2">
                                    <label className="text-sm text-white/80">Espaçamento entre páginas (px)</label>
                                    <input
                                        type="number"
                                        value={settings.pageSpacing}
                                        onChange={(e) => updateSetting('pageSpacing', parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#0f0b14] border border-white/10 rounded px-3 py-2 text-white"
                                        min="0"
                                        max="100"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-white/80">Direção de Leitura</label>
                                    <select
                                        value={settings.readingDirection}
                                        onChange={(e) => updateSetting('readingDirection', e.target.value as 'ltr' | 'rtl')}
                                        className="w-full bg-[#0f0b14] border border-white/10 rounded px-3 py-2 text-white"
                                    >
                                        <option value="ltr">Esquerda → Direita</option>
                                        <option value="rtl">Direita → Esquerda</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-white/80">Visibilidade do Header</label>
                                    <select
                                        value={settings.headerVisibility}
                                        onChange={(e) => updateSetting('headerVisibility', e.target.value as ReaderSettings['headerVisibility'])}
                                        className="w-full bg-[#0f0b14] border border-white/10 rounded px-3 py-2 text-white"
                                    >
                                        <option value="hidden">Escondido</option>
                                        <option value="fixed">Fixo</option>
                                        <option value="auto-hide">Escondido até rolar para baixo</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-white/80">Estilo da Barra de Progresso</label>
                                    <select
                                        value={settings.progressBarStyle}
                                        onChange={(e) => updateSetting('progressBarStyle', e.target.value as ReaderSettings['progressBarStyle'])}
                                        className="w-full bg-[#0f0b14] border border-white/10 rounded px-3 py-2 text-white"
                                    >
                                        <option value="hidden">Escondido</option>
                                        <option value="light">Luz</option>
                                        <option value="progress-bar">Progresso Lateral</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-white/80">Posição da Barra de Progresso</label>
                                    <select
                                        value={settings.progressBarPosition}
                                        onChange={(e) => updateSetting('progressBarPosition', e.target.value as 'bottom' | 'left' | 'right')}
                                        className="w-full bg-[#0f0b14] border border-white/10 rounded px-3 py-2 text-white"
                                    >
                                        <option value="bottom">Inferior</option>
                                        <option value="left">Esquerda</option>
                                        <option value="right">Direita</option>
                                    </select>
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.showPageNumberWhenHidden}
                                        onChange={(e) => updateSetting('showPageNumberWhenHidden', e.target.checked)}
                                        className="w-4 h-4 rounded border-white/10 bg-[#0f0b14] text-purple-600"
                                    />
                                    <span className="text-white text-sm">Mostrar número da página quando barra oculta</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.grayscale}
                                        onChange={(e) => updateSetting('grayscale', e.target.checked)}
                                        className="w-4 h-4 rounded border-white/10 bg-[#0f0b14] text-purple-600"
                                    />
                                    <span className="text-white text-sm">Páginas em escala de cinza</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.dimmed}
                                        onChange={(e) => updateSetting('dimmed', e.target.checked)}
                                        className="w-4 h-4 rounded border-white/10 bg-[#0f0b14] text-purple-600"
                                    />
                                    <span className="text-white text-sm">Páginas esmaecidas</span>
                                </label>
                            </div>

                            {/* Image Adjustment Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-purple-400">Ajuste da Imagem</h3>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.fitWidth}
                                        onChange={(e) => updateSetting('fitWidth', e.target.checked)}
                                        className="w-4 h-4 rounded border-white/10 bg-[#0f0b14] text-purple-600"
                                    />
                                    <span className="text-white text-sm">Conter na largura</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.fitHeight}
                                        onChange={(e) => updateSetting('fitHeight', e.target.checked)}
                                        className="w-4 h-4 rounded border-white/10 bg-[#0f0b14] text-purple-600"
                                    />
                                    <span className="text-white text-sm">Conter à altura</span>
                                </label>

                                {(settings.fitWidth || settings.fitHeight) && (
                                    <label className="flex items-center gap-2 cursor-pointer ml-6">
                                        <input
                                            type="checkbox"
                                            checked={settings.stretchSmallPages}
                                            onChange={(e) => updateSetting('stretchSmallPages', e.target.checked)}
                                            className="w-4 h-4 rounded border-white/10 bg-[#0f0b14] text-purple-600"
                                        />
                                        <span className="text-white text-sm">Esticar páginas pequenas</span>
                                    </label>
                                )}
                            </div>

                            {/* Keyboard Shortcuts Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-purple-400">Atalhos do Teclado</h3>
                                <p className="text-sm text-white/60">
                                    Adicione um novo atalho de teclado a uma ação clicando no botão e pressionando qualquer tecla (pressione Esc para cancelar).
                                    Uma chave só pode ser vinculada a uma ação. Remova um atalho de teclado clicando nele.
                                    Redefina os atalhos de teclado de uma ação para seus padrões com o botão.
                                </p>

                                {/* Scroll Actions */}
                                {['scrollLeft', 'scrollRight', 'scrollUp', 'scrollDown'].map(action => (
                                    <div key={action} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-white/80">
                                                {action === 'scrollLeft' && 'Rolar para Esquerda'}
                                                {action === 'scrollRight' && 'Rolar para Direita'}
                                                {action === 'scrollUp' && 'Rolar para Cima'}
                                                {action === 'scrollDown' && 'Rolar para Baixo'}
                                            </label>
                                            <Button
                                                onClick={() => resetShortcuts(action)}
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs"
                                            >
                                                Redefinir
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {settings.keyboardShortcuts[action as keyof ReaderSettings['keyboardShortcuts']].map(key => (
                                                <button
                                                    key={key}
                                                    onClick={() => removeShortcut(action, key)}
                                                    className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded text-sm hover:bg-purple-600/30 transition-colors"
                                                >
                                                    {key}
                                                </button>
                                            ))}
                                            {editingShortcut === action ? (
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder="Pressione uma tecla..."
                                                    onKeyDown={(e) => handleKeyPress(e, action)}
                                                    className="px-3 py-1 bg-[#0f0b14] border border-purple-600/50 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => setEditingShortcut(action)}
                                                    className="px-3 py-1 border border-white/10 rounded text-sm text-white/60 hover:bg-white/5 transition-colors"
                                                >
                                                    + Adicionar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Behavior Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-purple-400">Comportamento</h3>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.autoAdvanceChapter}
                                        onChange={(e) => updateSetting('autoAdvanceChapter', e.target.checked)}
                                        className="w-4 h-4 rounded border-white/10 bg-[#0f0b14] text-purple-600"
                                    />
                                    <span className="text-white text-sm">Avançar automaticamente o capítulo na última página</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.doubleClickFullscreen}
                                        onChange={(e) => updateSetting('doubleClickFullscreen', e.target.checked)}
                                        className="w-4 h-4 rounded border-white/10 bg-[#0f0b14] text-purple-600"
                                    />
                                    <span className="text-white text-sm">Clique duas vezes para alternar para tela cheia</span>
                                </label>
                            </div>

                            {/* Close Button */}
                            <div className="flex justify-end pt-4 border-t border-white/10">
                                <Button
                                    onClick={() => setShowAdvancedSettings(false)}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
