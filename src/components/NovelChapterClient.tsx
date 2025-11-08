/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useEffect, useState } from 'react'
import CommentsSection from './CommentsSection'

export default function NovelChapterClient({ novelId, chapterId, chapterNumber }: { novelId: string; chapterId: string; chapterNumber: number }) {
    const [readingSessionId, setReadingSessionId] = useState<string | null>(null)

    useEffect(() => {
        let sessionId = localStorage.getItem('reading_session_id')
        if (!sessionId) {
            sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            localStorage.setItem('reading_session_id', sessionId)
        }
        setReadingSessionId(sessionId)
    }, [])

    useEffect(() => {
        const contentEl = document.getElementById('novel-content')
        if (!contentEl) return

        let lastProgress = 0

        const handleScroll = () => {
            const element = contentEl
            const scrollPercentage = (window.scrollY / (element.scrollHeight - window.innerHeight)) * 100
            const rounded = Math.min(100, Math.max(0, Math.round(scrollPercentage)))
            if (Math.abs(rounded - lastProgress) >= 5) {
                lastProgress = rounded
                updateReadingHistory(rounded)
            }
        }

        const updateReadingHistory = async (progress: number) => {
            try {
                await fetch('/api/reading-history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        novelId,
                        novelChapterId: chapterId,
                        progress,
                        sessionId: readingSessionId
                    })
                })
            } catch (e) {
                console.error('Error updating reading history for novel:', e)
            }
        }

        window.addEventListener('scroll', handleScroll)
        // initial ping
        updateReadingHistory(0)

        return () => window.removeEventListener('scroll', handleScroll)
    }, [novelId, chapterId, readingSessionId])

    return (
        <div>
            <div id="novel-comments" className="mt-8">
                <CommentsSection novelId={novelId} novelChapterId={chapterId} />
            </div>
        </div>
    )
}
