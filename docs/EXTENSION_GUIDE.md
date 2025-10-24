# 🔧 Guia de Extensão - StoryVerse

## Como Adicionar Novas Funcionalidades

### 1. Adicionar Novo Item ao Menu

**Arquivo**: `src/components/Header.tsx`

```tsx
// Adicione ao array navLinks (linha ~15)
const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse' },
  // ... outros links
  { href: '/trending', label: 'Trending' }, // ← NOVO
]
```

### 2. Criar Nova Página

**Arquivo**: `src/app/trending/page.tsx`

```tsx
'use client'

import Header from '@/components/Header'
import { useRouter } from 'next/navigation'

export default function TrendingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#1a1625] text-white">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Trending Now</h1>
        {/* Seu conteúdo aqui */}
      </div>
    </div>
  )
}
```

### 3. Adicionar Nova Aba no Perfil

**Arquivo**: `src/app/profile/page.tsx`

```tsx
// 1. Adicione ao tipo da aba
const [activeTab, setActiveTab] = useState<
  'favorites' | 'history' | 'lists' | 'notifications' | 'bookmarks' // ← NOVO
>('notifications')

// 2. Adicione o botão da aba
<button
  onClick={() => setActiveTab('bookmarks')}
  className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${
    activeTab === 'bookmarks'
      ? 'border-purple-500 text-white'
      : 'border-transparent text-white/60 hover:text-white'
  }`}
>
  Bookmarks
</button>

// 3. Adicione o conteúdo da aba
{activeTab === 'bookmarks' && (
  <div>
    <h2 className="text-2xl font-bold mb-6">Bookmarks</h2>
    {/* Conteúdo dos bookmarks */}
  </div>
)}
```

### 4. Adicionar API para Webtoons

**Arquivo**: `src/app/api/webtoons/route.ts` (NOVO)

```tsx
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const genre = searchParams.get('genre')
  
  const webtoons = await prisma.webtoon.findMany({
    where: genre ? { genres: { has: genre } } : undefined,
    include: {
      author: true,
      chapters: {
        orderBy: { number: 'desc' },
        take: 1
      }
    }
  })
  
  return NextResponse.json(webtoons)
}

export async function POST(request: Request) {
  const data = await request.json()
  
  const webtoon = await prisma.webtoon.create({
    data: {
      title: data.title,
      description: data.description,
      authorId: data.authorId,
      genres: data.genres,
      coverImage: data.coverImage
    }
  })
  
  return NextResponse.json(webtoon)
}
```

### 5. Adicionar Schema Prisma para Webtoons

**Arquivo**: `prisma/schema.prisma`

```prisma
// Adicione estes modelos

model Webtoon {
  id          String   @id @default(cuid())
  title       String
  description String   @db.Text
  coverImage  String?
  genres      String[]
  authorId    String
  author      User     @relation("AuthorWebtoons", fields: [authorId], references: [id])
  chapters    Chapter[]
  favorites   Favorite[]
  views       Int      @default(0)
  rating      Float    @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([authorId])
  @@map("webtoons")
}

model Chapter {
  id        String   @id @default(cuid())
  number    Int
  title     String
  content   String   @db.Text
  webtoonId String
  webtoon   Webtoon  @relation(fields: [webtoonId], references: [id], onDelete: Cascade)
  views     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([webtoonId, number])
  @@index([webtoonId])
  @@map("chapters")
}

model Favorite {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  webtoonId String
  webtoon   Webtoon  @relation(fields: [webtoonId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  
  @@unique([userId, webtoonId])
  @@index([userId])
  @@index([webtoonId])
  @@map("favorites")
}

// Adicione ao modelo User existente:
model User {
  // ... campos existentes
  authorWebtoons Webtoon[]  @relation("AuthorWebtoons")
  favorites      Favorite[]
}
```

### 6. Hook Customizado para Buscar Webtoons

**Arquivo**: `src/hooks/useWebtoons.ts` (NOVO)

```tsx
import { useState, useEffect } from 'react'

interface Webtoon {
  id: string
  title: string
  description: string
  coverImage?: string
  genres: string[]
  author: {
    name: string
  }
  rating: number
  views: number
}

export function useWebtoons(genre?: string) {
  const [webtoons, setWebtoons] = useState<Webtoon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWebtoons() {
      try {
        setLoading(true)
        const url = genre 
          ? `/api/webtoons?genre=${genre}` 
          : '/api/webtoons'
        
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error('Failed to fetch webtoons')
        }
        
        const data = await response.json()
        setWebtoons(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchWebtoons()
  }, [genre])

  return { webtoons, loading, error }
}

// Uso:
// const { webtoons, loading, error } = useWebtoons('Fantasy')
```

### 7. Componente Card Reutilizável

**Arquivo**: `src/components/WebtoonCard.tsx` (NOVO)

```tsx
import { useRouter } from 'next/navigation'

interface WebtoonCardProps {
  id: string | number
  title: string
  emoji?: string
  coverImage?: string
  rating?: number
  chapters?: number
}

export default function WebtoonCard({
  id,
  title,
  emoji = '📖',
  coverImage,
  rating,
  chapters
}: WebtoonCardProps) {
  const router = useRouter()

  return (
    <div
      className="group cursor-pointer"
      onClick={() => router.push(`/webtoon/${id}`)}
    >
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-2">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            {emoji}
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all" />
        
        {(rating || chapters) && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            {rating && (
              <span className="bg-black/60 px-2 py-1 rounded">⭐ {rating}</span>
            )}
            {chapters && (
              <span className="bg-black/60 px-2 py-1 rounded">{chapters} ch</span>
            )}
          </div>
        )}
      </div>
      
      <h4 className="text-sm font-medium truncate group-hover:text-purple-400 transition-colors">
        {title}
      </h4>
    </div>
  )
}

// Uso:
// <WebtoonCard 
//   id={1} 
//   title="The Crimson Corsair" 
//   emoji="🏴‍☠️"
//   rating={4.8}
//   chapters={45}
// />
```

### 8. Context para Estado Global

**Arquivo**: `src/contexts/WebtoonContext.tsx` (NOVO)

```tsx
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface WebtoonContextType {
  currentWebtoon: any | null
  setCurrentWebtoon: (webtoon: any) => void
  favorites: string[]
  addFavorite: (id: string) => void
  removeFavorite: (id: string) => void
}

const WebtoonContext = createContext<WebtoonContextType | undefined>(undefined)

export function WebtoonProvider({ children }: { children: ReactNode }) {
  const [currentWebtoon, setCurrentWebtoon] = useState<any | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])

  const addFavorite = (id: string) => {
    setFavorites(prev => [...prev, id])
  }

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(fav => fav !== id))
  }

  return (
    <WebtoonContext.Provider
      value={{
        currentWebtoon,
        setCurrentWebtoon,
        favorites,
        addFavorite,
        removeFavorite
      }}
    >
      {children}
    </WebtoonContext.Provider>
  )
}

export function useWebtoonContext() {
  const context = useContext(WebtoonContext)
  if (context === undefined) {
    throw new Error('useWebtoonContext must be used within WebtoonProvider')
  }
  return context
}

// Adicione ao layout.tsx:
// <WebtoonProvider>
//   {children}
// </WebtoonProvider>
```

### 9. Sistema de Busca Funcional

**Arquivo**: `src/components/SearchBar.tsx` (NOVO)

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function search() {
      if (debouncedQuery.length < 2) {
        setResults([])
        return
      }

      const response = await fetch(`/api/search?q=${debouncedQuery}`)
      const data = await response.json()
      setResults(data)
      setIsOpen(true)
    }

    search()
  }, [debouncedQuery])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={searchRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search"
        className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
      />
      
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-[#0f0b14] border border-white/10 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
          {results.map((result: any) => (
            <div
              key={result.id}
              onClick={() => {
                router.push(`/webtoon/${result.id}`)
                setIsOpen(false)
                setQuery('')
              }}
              className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
            >
              <div className="font-medium">{result.title}</div>
              <div className="text-sm text-white/60">{result.author.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### 10. Hook useDebounce

**Arquivo**: `src/hooks/useDebounce.ts` (NOVO)

```tsx
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
```

### 11. Middleware para Proteção de Rotas

**Arquivo**: `src/middleware.ts` (já existe, adicione rotas)

```tsx
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname
      
      // Rotas que precisam de autenticação
      const protectedRoutes = [
        '/profile',
        '/library',
        '/dashboard'
      ]
      
      if (protectedRoutes.some(route => path.startsWith(route))) {
        return !!token
      }
      
      return true
    }
  }
})

export const config = {
  matcher: [
    '/profile/:path*',
    '/library/:path*',
    '/dashboard/:path*'
  ]
}
```

### 12. Componente de Loading

**Arquivo**: `src/components/LoadingSpinner.tsx` (NOVO)

```tsx
export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizes[size]} animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-500`} />
    </div>
  )
}

// Uso:
// <LoadingSpinner size="lg" />
```

### 13. Toast Notifications

**Arquivo**: `src/components/Toast.tsx` (NOVO)

```tsx
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7)
    setToasts(prev => [...prev, { id, message, type }])
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 3000)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info
  }

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2">
        {toasts.map(toast => {
          const Icon = icons[toast.type]
          return (
            <div
              key={toast.id}
              className={`${colors[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slideIn`}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{toast.message}</span>
              <button onClick={() => removeToast(toast.id)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

// Uso:
// const { showToast } = useToast()
// showToast('Chapter added to favorites!', 'success')
```

## 🔥 Dicas Rápidas

### Adicionar Animação CSS

```css
/* src/app/globals.css */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slideIn {
  animation: slideIn 0.3s ease-out;
}
```

### Adicionar Variante de Botão

```tsx
// src/components/ui/button.tsx
const buttonVariants = {
  // ... existentes
  gradient: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
}
```

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_UPLOAD_URL=https://your-upload-service.com
```

## 📚 Recursos Úteis

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Prisma](https://www.prisma.io/docs)
- [NextAuth.js](https://next-auth.js.org)
- [Radix UI](https://www.radix-ui.com)
