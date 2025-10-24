'use client'

import { useState, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { TOTP_REQUIRED } from '@/lib/auth/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Github, Mail } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [totpToken, setTotpToken] = useState('')
    const [showTotpInput, setShowTotpInput] = useState(false)
    const checkingRef = useRef<number | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const result = await signIn('credentials', {
                email,
                password,
                totpToken: showTotpInput ? totpToken : undefined,
                redirect: false,
            })

            if (result?.error) {
                if (result.error === TOTP_REQUIRED) {
                    setShowTotpInput(true)
                    setError('Por favor, insira o código de autenticação de dois fatores')
                } else {
                    setError(result.error)
                }
            } else if (result?.ok) {
                router.push('/')
                router.refresh()
            }
        } catch (err) {
            setError('Erro ao fazer login')
        } finally {
            setLoading(false)
        }
    }

    const handleSocialLogin = async (provider: 'google' | 'github') => {
        setLoading(true)
        try {
            await signIn(provider, { callbackUrl: '/' })
        } catch (err) {
            setError('Erro ao fazer login')
            setLoading(false)
        }
    }

    // When the email changes, debounce and check if the user has TOTP enabled.
    useEffect(() => {
        if (!email || !email.includes('@')) return

        // clear existing timer
        if (checkingRef.current) {
            window.clearTimeout(checkingRef.current)
            checkingRef.current = null
        }

        checkingRef.current = window.setTimeout(async () => {
            try {
                const res = await fetch(`/api/auth/has-totp?email=${encodeURIComponent(email)}`)
                if (!res.ok) return
                const data = await res.json()
                if (data?.hasTotp) setShowTotpInput(true)
            } catch (e) {
                // ignore network errors silently
            }
        }, 600)

        return () => {
            if (checkingRef.current) clearTimeout(checkingRef.current)
        }
    }, [email])

    return (
        <>
            <Header />
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#1a1625] p-4">
                <Card className="w-full max-w-md bg-[#0f0b14] border-white/10">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center text-white">Login</CardTitle>
                        <CardDescription className="text-center text-white/60">
                            Entre com sua conta para continuar
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-white">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value)
                                        // if email changes, reset totp input visibility until we check again
                                        setShowTotpInput(false)
                                    }}
                                    required
                                    disabled={loading}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-white">Senha</Label>
                                    <Link
                                        href="/auth/forgot-password"
                                        className="text-sm text-purple-400 hover:text-purple-300"
                                    >
                                        Esqueceu a senha?
                                    </Link>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                />
                            </div>

                            {showTotpInput && (
                                <div className="space-y-2">
                                    <Label htmlFor="totpToken" className="text-white">Código de Autenticação</Label>
                                    <Input
                                        id="totpToken"
                                        type="text"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={totpToken}
                                        onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ''))}
                                        required
                                        disabled={loading}
                                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                    />
                                </div>
                            )}

                            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={loading}>
                                {loading ? 'Entrando...' : 'Entrar'}
                            </Button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#0f0b14] px-2 text-white/60">Ou continue com</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                onClick={() => handleSocialLogin('google')}
                                disabled={loading}
                                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                            >
                                <Mail className="mr-2 h-4 w-4" />
                                Google
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleSocialLogin('github')}
                                disabled={loading}
                                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                            >
                                <Github className="mr-2 h-4 w-4" />
                                GitHub
                            </Button>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <div className="text-sm text-center text-white/60">
                            Não tem uma conta?{' '}
                            <Link href="/auth/register" className="text-purple-400 hover:text-purple-300">
                                Criar conta
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </>
    )
}
