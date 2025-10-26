import React from 'react'
import Link from 'next/link'

interface WebtoonCard {
    id: string
    title: string
    slug: string
    coverImage?: string | null
    views?: number
}

export default function AuthorWebtoonsList({ webtoons }: { webtoons?: WebtoonCard[] }) {
    // Deduplicate by id to avoid duplicate React keys if upstream data contains duplicate credits
    const uniqueWebtoons = webtoons
        ? Array.from(new Map(webtoons.map((w) => [w.id, w])).values())
        : []

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniqueWebtoons && uniqueWebtoons.length > 0 ? (
                uniqueWebtoons.map((w) => (
                    <Link key={`${w.id}-${w.slug}`} href={`/webtoon/${w.slug}`} className="block p-4 bg-[#1a1625] hover:bg-purple-600/10 rounded-lg transition-colors border border-purple-600/20">
                        <div className="flex gap-4">
                            <div className="w-20 h-28 rounded-md overflow-hidden bg-gray-800 flex-shrink-0">
                                {w.coverImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={w.coverImage} alt={w.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-purple-400">📚</div>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-gray-100 font-medium">{w.title}</h3>
                                <p className="text-sm text-gray-400 mt-2">{w.views?.toLocaleString() ?? 0} visualizações</p>
                            </div>
                        </div>
                    </Link>
                ))
            ) : (
                <div className="text-gray-400">Nenhuma obra encontrada</div>
            )}
        </div>
    )
}
