"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ChangePasswordPage() {
    const router = useRouter()
    const { update } = useSession()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const validate = () => {
        const newErrors: Record<string, string> = {}

        // Strong password policy:
        // - at least 8 characters
        // - at least one lowercase letter
        // - at least one uppercase letter
        // - at least one digit
        // - at least one special character
        // - no whitespace
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])(?!.*\s).{8,}$/

        if (!password) newErrors.password = 'A senha é obrigatória'
        else if (!strongPasswordRegex.test(password)) newErrors.password = 'A senha deve ter ao menos 8 caracteres, conter letras maiúsculas e minúsculas, um número e um caractere especial, sem espaços'

        if (!confirmPassword) newErrors.confirmPassword = 'A confirmação de senha é obrigatória'
        else if (password !== confirmPassword) newErrors.confirmPassword = 'As senhas não coincidem'

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage('')
        if (!validate()) return

        setLoading(true)

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, confirmPassword }),
            })

            const data = await res.json()

            if (!res.ok) {
                setMessage(data.error || 'Erro ao atualizar senha')
            } else {
                setMessage('Senha atualizada com sucesso! Redirecionando...')

                // update session to clear mustChangePassword flag
                try {
                    await update()
                } catch {
                }

                setTimeout(() => router.push('/'), 2000)
            }
        } catch (err) {
            console.error('Error changing password:', err)
            setMessage('Erro ao processar solicitação')
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/auth/login' })
    }

    return (
        <>
            <Header />
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#1a1625] p-4">
                <Card className="w-full max-w-md bg-[#0f0b14] border-white/10">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-white">Troca de senha obrigatória</CardTitle>
                        <CardDescription className="text-white/60">
                            Por segurança, você precisa criar uma nova senha para continuar usando o sistema.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {message && (
                            <Alert className={`${message.includes('sucesso') ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'} mb-4`}>
                                <AlertDescription className={`${message.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>
                                    {message}
                                </AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-white">Nova senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    disabled={loading}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                />
                                {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
                                <p className="mt-2 text-xs text-white/60">Requisitos: mínimo 8 caracteres, letras maiúsculas e minúsculas, número e caractere especial (sem espaços).</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-white">Confirmar nova senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    disabled={loading}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                />
                                {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>}
                            </div>

                            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={loading}>
                                {loading ? 'Atualizando...' : 'Atualizar senha'}
                            </Button>

                            <div className="text-center">
                                <button type="button" onClick={() => router.push('/auth/login')} className="text-sm text-purple-400 hover:text-purple-300">
                                    Voltar para o login
                                </button>
                            </div>
                        </form>

                        <div className="mt-4 pt-4 border-t border-white/10">
                            <button onClick={handleLogout} className="w-full px-4 py-2 text-white/70 hover:text-white font-medium transition-colors">
                                Sair
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    )
}
