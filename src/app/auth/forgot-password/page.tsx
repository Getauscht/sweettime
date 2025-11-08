/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.message || 'Erro ao enviar email')
            } else {
                setSuccess(true)
            }
        } catch (err) {
            setError('Erro ao enviar email')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Header />
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#1a1625] p-4">
                <Card className="w-full max-w-md bg-[#0f0b14] border-white/10">
                    <CardHeader className="space-y-1">
                        <Link
                            href="/auth/login"
                            className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 mb-2"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar para o login
                        </Link>
                        <CardTitle className="text-2xl font-bold text-white">Esqueceu a senha?</CardTitle>
                        <CardDescription className="text-white/60">
                            Digite seu email e enviaremos instruções para redefinir sua senha
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {success ? (
                            <Alert className="mb-4 bg-green-500/10 border-green-500/20 text-green-400">
                                <AlertDescription>
                                    Se o email informado estiver cadastrado, você receberá instruções para recuperação de senha.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-white">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                    />
                                </div>

                                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={loading}>
                                    {loading ? 'Enviando...' : 'Enviar email de recuperação'}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    )
}
