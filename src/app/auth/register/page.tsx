'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Github, Mail } from 'lucide-react'
import { signIn } from 'next-auth/react'

export default function RegisterPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        if (password !== confirmPassword) {
            setError('As senhas não coincidem')
            setLoading(false)
            return
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.message || 'Erro ao criar conta')
            } else {
                setSuccess(true)
                setTimeout(() => {
                    router.push('/auth/login')
                }, 2000)
            }
        } catch (err) {
            setError('Erro ao criar conta')
        } finally {
            setLoading(false)
        }
    }

    const handleSocialRegister = async (provider: 'google' | 'github') => {
        setLoading(true)
        try {
            await signIn(provider, { callbackUrl: '/' })
        } catch (err) {
            setError('Erro ao fazer registro')
            setLoading(false)
        }
    }

    return (
        <>
            <Header />
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#1a1625] p-4">
                <Card className="w-full max-w-md bg-[#0f0b14] border-white/10">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center text-white">Criar conta</CardTitle>
                        <CardDescription className="text-center text-white/60">
                            Preencha os dados abaixo para criar sua conta
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {success && (
                            <Alert>
                                <AlertDescription>
                                    Conta criada com sucesso! Redirecionando para o login...
                                </AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-white">Nome</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Seu nome"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    disabled={loading || success}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-white">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading || success}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-white">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    disabled={loading || success}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-white">Confirmar Senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    disabled={loading || success}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                />
                            </div>

                            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={loading || success}>
                                {loading ? 'Criando conta...' : 'Criar conta'}
                            </Button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#0f0b14] px-2 text-white/60">Ou registre-se com</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                onClick={() => handleSocialRegister('google')}
                                disabled={loading || success}
                                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                            >
                                <Mail className="mr-2 h-4 w-4" />
                                Google
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleSocialRegister('github')}
                                disabled={loading || success}
                                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                            >
                                <Github className="mr-2 h-4 w-4" />
                                GitHub
                            </Button>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <div className="text-sm text-center text-white/60">
                            Já tem uma conta?{' '}
                            <Link href="/auth/login" className="text-purple-400 hover:text-purple-300">
                                Fazer login
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </>
    )
}
