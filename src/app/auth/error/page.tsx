'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

const errorMessages: Record<string, string> = {
    Configuration: 'Erro de configuração do servidor. Entre em contato com o suporte.',
    AccessDenied: 'Acesso negado. Você não tem permissão para acessar este recurso.',
    Verification: 'Erro na verificação. O link pode ter expirado.',
    Default: 'Ocorreu um erro durante a autenticação. Tente novamente.',
    CredentialsSignin: 'Credenciais inválidas. Verifique seu email e senha.',
    OAuthSignin: 'Erro ao tentar fazer login com o provedor OAuth.',
    OAuthCallback: 'Erro no callback do provedor OAuth.',
    OAuthCreateAccount: 'Erro ao criar conta com o provedor OAuth.',
    EmailCreateAccount: 'Erro ao criar conta com email.',
    Callback: 'Erro no callback de autenticação.',
    OAuthAccountNotLinked: 'Esta conta já está associada a outro provedor de login.',
    EmailSignin: 'Erro ao enviar email de verificação.',
    SessionRequired: 'Por favor, faça login para acessar esta página.',
}

export default function AuthErrorPage() {
    const searchParams = useSearchParams()
    const error = searchParams ? searchParams.get('error') : null

    const errorMessage = error
        ? errorMessages[error] || errorMessages.Default
        : errorMessages.Default

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">Erro de Autenticação</CardTitle>
                    <CardDescription className="text-center">
                        Algo deu errado durante o processo de autenticação
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert variant="destructive">
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>

                    {error && (
                        <div className="text-xs text-muted-foreground text-center">
                            Código do erro: {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Link href="/auth/login" className="block">
                            <Button className="w-full">Voltar para o Login</Button>
                        </Link>
                        <Link href="/" className="block">
                            <Button variant="outline" className="w-full">
                                Ir para a Página Inicial
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
