'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Shield, LogOut, User } from 'lucide-react'

export default function DashboardPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-lg">Carregando...</p>
            </div>
        )
    }

    if (status === 'unauthenticated') {
        router.push('/auth/login')
        return null
    }

    const getInitials = (name?: string | null) => {
        if (!name) return 'U'
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <div className="max-w-4xl mx-auto py-8 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <Button variant="outline" onClick={() => signOut({ callbackUrl: '/auth/login' })}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Informações do Usuário</CardTitle>
                        <CardDescription>Seus dados de perfil</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={session?.user?.image || undefined} />
                                <AvatarFallback>
                                    {getInitials(session?.user?.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="text-xl font-semibold">{session?.user?.name}</h3>
                                <p className="text-muted-foreground">{session?.user?.email}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center space-x-2">
                                        <User className="h-5 w-5 text-primary" />
                                        <div>
                                            <p className="text-sm font-medium">Nome</p>
                                            <p className="text-sm text-muted-foreground">
                                                {session?.user?.name || 'Não informado'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center space-x-2">
                                        <Shield className="h-5 w-5 text-primary" />
                                        <div>
                                            <p className="text-sm font-medium">Autenticação 2FA</p>
                                            <Button
                                                variant="link"
                                                className="p-0 h-auto text-sm"
                                                onClick={() => router.push('/auth/totp-setup')}
                                            >
                                                Configurar TOTP
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recursos de Segurança</CardTitle>
                        <CardDescription>Configurações de autenticação disponíveis</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-3">
                                <Shield className="h-6 w-6 text-primary" />
                                <div>
                                    <p className="font-medium">Autenticação de Dois Fatores (TOTP)</p>
                                    <p className="text-sm text-muted-foreground">
                                        Adicione uma camada extra de segurança com códigos temporários
                                    </p>
                                </div>
                            </div>
                            <Button onClick={() => router.push('/auth/totp-setup')}>
                                Configurar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
