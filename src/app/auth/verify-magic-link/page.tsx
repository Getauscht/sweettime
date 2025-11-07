"use client"

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function VerifyMagicLinkPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const token = searchParams?.get('token')

        if (!token) {
            setStatus('error')
            setErrorMessage('Token não fornecido')
            return
        }

        // Navigate the browser to the API GET so the server can set the session cookie
        // and redirect properly. Keep local UI state so the page matches project styles
        // while the navigation happens.
        const url = `/api/auth/verify-magic-link?token=${encodeURIComponent(token)}`
        // Use a full navigation so the Set-Cookie from the server is applied
        // and the server can perform redirects.
        window.location.href = url
    }, [searchParams, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        {status === 'verifying' && (
                            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/5">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-green-50">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-red-50">
                                <XCircle className="h-8 w-8 text-red-600" />
                            </div>
                        )}
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">
                        {status === 'verifying' && 'Verificando link...'}
                        {status === 'success' && 'Link verificado com sucesso!'}
                        {status === 'error' && 'Erro ao verificar link'}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {status === 'verifying' && 'Por favor, aguarde enquanto validamos seu acesso.'}
                        {status === 'success' && 'Redirecionando para a página de troca de senha...'}
                        {status === 'error' && (errorMessage || 'O link pode ter expirado ou já foi usado. Solicite um novo link de recuperação.')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                    {status === 'error' && (
                        <div className="w-full space-y-3">
                            <div className="text-sm text-muted-foreground text-center">{errorMessage}</div>
                            <div className="flex gap-2">
                                <Button className="w-full" onClick={() => router.push('/auth/login')}>
                                    Voltar ao Login
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => router.push('/')}>Ir para a Página Inicial</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
