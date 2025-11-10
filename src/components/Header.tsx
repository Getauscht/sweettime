'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import SearchBar from '@/components/SearchBar'
import { NotificationBell } from '@/components/ui/notification-bell'
import { User, Menu, X, LogOut } from 'lucide-react'

export default function Header() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement | null>(null)

  const navLinks = [
    { href: '/', label: 'Início' },
    { href: '/search', label: 'Buscar' },
    { href: '/library', label: 'Biblioteca' }
  ]

  const isActive = (href: string) => pathname === href

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [accountRef])

  return (
    <>
      {/* Header */}
      <header className="border-b border-white/10 bg-[#1a1625]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Desktop Nav */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center">
                  <span className="text-white text-sm font-bold">📖</span>
                </div>
                <span className="text-xl font-bold text-white">Sweet Time</span>
              </Link>

              <nav className="hidden lg:flex items-center gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors ${isActive(link.href)
                      ? 'text-white'
                      : 'text-white/60 hover:text-white'
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="hidden sm:block w-48 md:w-64">
                <SearchBar />
              </div>

              {/* Icons and Avatar */}
              {status === 'authenticated' ? (
                <>
                  <div className="hidden sm:block">
                    <NotificationBell />
                  </div>
                  <div className="relative" ref={accountRef}>
                    <Avatar
                      className="h-8 w-8 cursor-pointer border-2 border-transparent hover:border-purple-500 transition-colors"
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
                          setAccountMenuOpen(!accountMenuOpen)
                        } else {
                          router.push('/profile')
                        }
                      }}
                    >
                      <AvatarImage src={session?.user?.image || ''} />
                      <AvatarFallback className="bg-purple-600 text-white">
                        {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    {accountMenuOpen && (
                      <div className="absolute right-0 mt-2 w-44 bg-[#1a1625] border border-white/10 rounded shadow-md py-1 z-50">
                        <button
                          onClick={() => { setAccountMenuOpen(false); router.push('/profile') }}
                          className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/5 flex items-center"
                        >
                          <User className="h-4 w-4 mr-2 text-white/80" />
                          <span>Perfil</span>
                        </button>
                        <button
                          onClick={() => { setAccountMenuOpen(false); signOut({ callbackUrl: '/auth/login' }) }}
                          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/5 flex items-center"
                        >
                          <LogOut className="h-4 w-4 mr-2 text-red-400" />
                          <span>Sair</span>
                        </button>
                      </div>
                    )}

                  </div>
                </>
              ) : (
                <Link href="/auth/login">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 rounded-full">
                    <User className="h-4 w-4 mr-2" />
                    Entrar
                  </Button>
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6 text-white" />
                ) : (
                  <Menu className="h-6 w-6 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-[#0f0b14] border-l border-white/10 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span className="text-lg font-bold text-white">Menu</span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* User Info (if logged in) */}
          {status === 'authenticated' && (
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={session?.user?.image || ''} />
                  <AvatarFallback className="bg-purple-600 text-white">
                    {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-white font-medium">{session?.user?.name || 'Usuário'}</div>
                  <div className="text-white/60 text-sm">{session?.user?.email}</div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Search */}
          <div className="p-4 border-b border-white/10">
            <SearchBar onClose={() => setIsMobileMenuOpen(false)} />
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive(link.href)
                    ? 'bg-purple-600 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Mobile Menu Footer */}
          {status === 'authenticated' ? (
            <div className="p-4 border-t border-white/10 space-y-2">
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  Ver Perfil
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center"
                size="sm"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  signOut({ callbackUrl: '/auth/login' })
                }}
              >
                <LogOut className="h-4 w-4 mr-2 text-red-400" />
                Sair
              </Button>
            </div>
          ) : (
            <div className="p-4 border-t border-white/10">
              <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  <User className="h-4 w-4 mr-2" />
                  Entrar
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
} 