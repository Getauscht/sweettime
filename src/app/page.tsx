/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Play, Eye, Star, Clock } from 'lucide-react'

interface Webtoon {
  id: string
  title: string
  slug: string
  description?: string
  coverImage?: string
  // API may return a single author string (legacy) or an array of author objects.
  // Keep compatibility by accepting both shapes here.
  author: string | Array<{ id?: string; name: string; slug?: string }>
  authorAvatar?: string
  genres: string[]
  views: number
  likes: number
  rating?: number | null
  status: string
  latestChapter?: number
  latestChapterTitle?: string
  updatedAt?: string
}

interface Genre {
  id: string
  name: string
  slug: string
  _count: {
    webtoons: number
  }
}

export default function Home() {
  const router = useRouter()
  const [featuredWebtoons, setFeaturedWebtoons] = useState<Webtoon[]>([])
  const [recentlyUpdated, setRecentlyUpdated] = useState<Webtoon[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [selectedGenre, setSelectedGenre] = useState<string>('')
  const [genreWebtoons, setGenreWebtoons] = useState<Webtoon[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedGenre) {
      loadGenreWebtoons(selectedGenre)
    }
  }, [selectedGenre])

  const loadData = async () => {
    try {
      setLoading(true)

      const [featuredRes, recentRes, genresRes] = await Promise.all([
        fetch('/api/obra/featured?limit=5'),
        fetch('/api/obra/recent?limit=10'),
        fetch('/api/genres')
      ])

      if (featuredRes.ok) {
        const data = await featuredRes.json()
        setFeaturedWebtoons(data.webtoons || [])
      }

      if (recentRes.ok) {
        const data = await recentRes.json()
        setRecentlyUpdated(data.webtoons || [])
      }

      if (genresRes.ok) {
        const data = await genresRes.json()
        setGenres(data.genres || [])
        if (data.genres && data.genres.length > 0) {
          setSelectedGenre(data.genres[0].slug)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatAuthors = (authorField: Webtoon['author']) => {
    if (!authorField) return ''
    if (typeof authorField === 'string') return authorField
    if (Array.isArray(authorField)) return authorField.map((a) => a.name).join(', ')
    return ''
  }

  const loadGenreWebtoons = async (genre: string) => {
    try {
      const res = await fetch(`/api/obra/by-genre?genre=${genre}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setGenreWebtoons(data.webtoons || [])
      }
    } catch (error) {
      console.error('Error loading genre webtoons:', error)
    }
  }

  const normalizeImageSrc = (src?: string) => {
    if (!src) return null
    let s = src.toString().trim()
    if (!s) return null
    if (s === 'null' || s === 'undefined') return null

    // replace backslashes and encode spaces
    s = s.replace(/\\/g, '/').replace(/\s+/g, '%20')

    // data URLs are fine
    if (s.startsWith('data:')) return s

    // absolute protocol-relative or absolute
    if (/^(https?:)?\/\//i.test(s)) return s.startsWith('//') ? window.location.protocol + s : s

    // paths in the `public/` folder were stored as `public/...` by the importer; serve them from root '/'
    if (s.startsWith('public/')) return '/' + s.replace(/^public\//, '')

    // already root-relative
    if (s.startsWith('/')) return s

    // relative path like uploads/..., prefix with '/'
    if (/^uploads\//i.test(s) || /^public_uploads\//i.test(s)) return '/' + s

    // fallback: try constructing a URL to validate; if succeeds return as-is (will be resolved by browser)
    try {
      const url = typeof window !== 'undefined' ? new URL(s, window.location.href) : new URL(s, 'http://localhost')
      // return pathname+search+hash if it's same origin and we want relative
      if (url.origin === window.location.origin) return url.pathname + url.search + url.hash
      return url.toString()
    } catch (e) {
      return null
    }
  }

  // Auto-rotate carousel
  useEffect(() => {
    if (featuredWebtoons.length === 0) return

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredWebtoons.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [featuredWebtoons.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredWebtoons.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredWebtoons.length) % featuredWebtoons.length)
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#1a1625] flex items-center justify-center">
          <div className="text-white text-xl">Carregando...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#1a1625]">
        {/* Carrossel de Destaques */}
        {featuredWebtoons.length > 0 && (
          <div className="relative h-[500px] overflow-hidden">
            {featuredWebtoons.map((webtoon, index) => {
              const imgSrc = normalizeImageSrc(webtoon.coverImage)
              return (
                <div
                  key={webtoon.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1a1625] via-[#1a1625]/80 to-transparent z-10" />
                  {imgSrc ? (
                    <Image
                      src={imgSrc}
                      alt={webtoon.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-pink-600/30" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1625] via-transparent to-transparent z-10" />

                  <div className="relative z-20 container mx-auto px-4 h-full flex items-center">
                    <div className="max-w-2xl">
                      <div className="flex gap-2 mb-4">
                        {webtoon.genres.slice(0, 2).map((genre, i) => (
                          <span key={i} className="px-3 py-1 bg-purple-600/30 text-purple-300 rounded-full text-sm">
                            {genre}
                          </span>
                        ))}
                      </div>
                      <h1 className="text-5xl font-bold text-white mb-4">{webtoon.title}</h1>
                      <p className="text-xl text-white/80 mb-2">{formatAuthors(webtoon.author)}</p>
                      <p className="text-lg text-white/70 mb-6 line-clamp-3">{webtoon.description}</p>
                      <div className="flex gap-4 items-center mb-6">
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                          <span className="text-white font-medium">{typeof webtoon.rating === 'number' ? webtoon.rating.toFixed(1) : '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="h-5 w-5 text-white/60" />
                          <span className="text-white/80">{typeof webtoon.views === 'number' ? (webtoon.views / 1000000).toFixed(1) + 'M' : '—'}</span>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Button
                          onClick={() => router.push(`/obra/${webtoon.slug}`)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                        >
                          <Play className="h-5 w-5 mr-2" />
                          Ler Agora
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/obra/${webtoon.slug}`)}
                          className="bg-transparent border-white/20 text-white hover:bg-white/10"
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Botões de Navegação */}
            {featuredWebtoons.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>

                {/* Indicadores */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                  {featuredWebtoons.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-purple-600' : 'w-2 bg-white/50'
                        }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Atualizados Recentemente */}
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Clock className="h-6 w-6 text-purple-500" />
              Atualizados Recentemente
            </h2>
          </div>

          {recentlyUpdated.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentlyUpdated.map((webtoon) => {
                const imgSrc = normalizeImageSrc(webtoon.coverImage)
                const latest = Number(webtoon.latestChapter)
                const hasChapter = Number.isFinite(latest) && latest > 0
                const href = hasChapter ? `/obra/${webtoon.slug}/chapter/${latest}` : `/obra/${webtoon.slug}`
                return (
                  <Link
                    key={webtoon.id}
                    href={href}
                    className="group"
                  >
                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden mb-2 bg-white/5">
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={webtoon.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                          <span className="text-4xl">📖</span>
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/70 rounded px-2 py-1 text-xs text-white">
                        {hasChapter ? `Cap. ${latest}` : 'Novo'}
                      </div>
                    </div>
                    <h3 className="text-white font-medium text-sm line-clamp-2 group-hover:text-purple-400 transition-colors">
                      {webtoon.title}
                    </h3>
                    <p className="text-white/60 text-xs mt-1">{formatAuthors(webtoon.author)}</p>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center text-white/60 py-8">
              Nenhum webtoon disponível
            </div>
          )}
        </section>

        {/* Explorar por Gênero */}
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-white mb-6">Explorar por Gênero</h2>

          {/* Abas de Gênero */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {genres.map((genre) => (
              <button
                key={genre.id}
                onClick={() => setSelectedGenre(genre.slug)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${selectedGenre === genre.slug
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
              >
                {genre.name} ({genre._count.webtoons})
              </button>
            ))}
          </div>

          {/* Webtoons do Gênero */}
          {genreWebtoons.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {genreWebtoons.map((webtoon) => {
                const imgSrc = normalizeImageSrc(webtoon.coverImage)
                return (
                  <Link
                    key={webtoon.id}
                    href={`/obra/${webtoon.slug}`}
                    className="group"
                  >
                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden mb-2 bg-white/5">
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={webtoon.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                          <span className="text-4xl">📖</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <div className="flex items-center gap-2 text-xs text-white/90">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span>{typeof webtoon.rating === 'number' ? webtoon.rating.toFixed(1) : '—'}</span>
                          <Eye className="h-3 w-3 ml-auto" />
                          <span>{typeof webtoon.views === 'number' ? (webtoon.views / 1000).toFixed(0) + 'K' : '—'}</span>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-white font-medium text-sm line-clamp-2 group-hover:text-purple-400 transition-colors">
                      {webtoon.title}
                    </h3>
                    <p className="text-white/60 text-xs mt-1">{formatAuthors(webtoon.author)}</p>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center text-white/60 py-8">
              Nenhum webtoon neste gênero
            </div>
          )}
        </section>
      </div>
    </>
  )
}
