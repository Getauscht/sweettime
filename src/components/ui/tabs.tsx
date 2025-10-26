"use client"

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'

type TabKey = string

export type TabItem = { key: TabKey; label: React.ReactNode }

type TabsProps = {
    items: TabItem[]
    value: TabKey
    onChange: (key: TabKey) => void
    panels: Record<TabKey, React.ReactNode>
    className?: string
}

export default function Tabs({ items, value, onChange, panels, className }: TabsProps) {
    const tabListRef = useRef<HTMLDivElement | null>(null)
    const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({})
    const [indicator, setIndicator] = useState({ left: 0, width: 0 })
    const [reducedMotion, setReducedMotion] = useState(false)

    // respect prefers-reduced-motion
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        const update = () => setReducedMotion(mq.matches)
        update()
        try { mq.addEventListener('change', update) } catch (e) { mq.addListener(update) }
        return () => { try { mq.removeEventListener('change', update) } catch (e) { mq.removeListener(update) } }
    }, [])

    // compute indicator position
    useLayoutEffect(() => {
        const updateIndicator = () => {
            const parent = tabListRef.current
            const ref = tabRefs.current[value]
            if (parent && ref) {
                const parentRect = parent.getBoundingClientRect()
                const rect = ref.getBoundingClientRect()
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    setIndicator({ left: rect.left - parentRect.left, width: rect.width })
                }))
            }
        }

        updateIndicator()
        const onResize = () => updateIndicator()
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [value, items])

    const focusAndSet = (key: TabKey) => {
        onChange(key)
        const el = tabRefs.current[key]
        if (el) {
            el.focus()
            try { el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }) } catch (e) { }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent, key: TabKey) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            const idx = items.findIndex(i => i.key === key)
            const next = items[(idx + 1) % items.length]
            focusAndSet(next.key)
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            const idx = items.findIndex(i => i.key === key)
            const prev = items[(idx - 1 + items.length) % items.length]
            focusAndSet(prev.key)
        } else if (e.key === 'Home') {
            e.preventDefault(); focusAndSet(items[0].key)
        } else if (e.key === 'End') {
            e.preventDefault(); focusAndSet(items[items.length - 1].key)
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); onChange(key)
        }
    }

    return (
        <div className={className}>
            <div ref={tabListRef} role="tablist" aria-label="Seções" className="relative">
                <div className="flex justify-center gap-8 border-b border-white/5">
                    {items.map(item => (
                        <button
                            key={item.key}
                            role="tab"
                            aria-selected={value === item.key}
                            tabIndex={value === item.key ? 0 : -1}
                            ref={(el) => { tabRefs.current[item.key] = el }}
                            onKeyDown={(e) => handleKeyDown(e, item.key)}
                            onClick={() => focusAndSet(item.key)}
                            className={"pb-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded transition-colors duration-150 " + (value === item.key ? 'text-white' : 'text-white/60')}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div aria-hidden className="absolute bottom-0 left-0 w-full h-0 pointer-events-none">
                    <div
                        style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width, transition: reducedMotion ? 'none' : 'transform 220ms cubic-bezier(.2,.9,.2,1), width 220ms cubic-bezier(.2,.9,.2,1)', willChange: 'transform, width' }}
                        className="absolute h-0.5 bg-purple-600 rounded"
                    />
                </div>
            </div>

            <div className="mt-6">
                {items.map(item => {
                    const isActive = item.key === value
                    return (
                        <div
                            key={item.key}
                            role="region"
                            aria-hidden={!isActive}
                            aria-label={`${item.label} painel`}
                            className={`transition-opacity duration-220 transform ${reducedMotion ? '' : 'transition-transform'} ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} ${isActive ? 'block' : 'hidden'}`}
                        >
                            {panels[item.key]}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
