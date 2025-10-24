'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Shield, ShieldOff } from 'lucide-react'
import Image from 'next/image'

export default function TotpSetupPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    const [qrCode, setQrCode] = useState('')
    const [secret, setSecret] = useState('')
    const [verifyToken, setVerifyToken] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const [showDisableDialog, setShowDisableDialog] = useState(false)
    const [disableMethod, setDisableMethod] = useState<'password' | 'token'>('password')
    const [disableProof, setDisableProof] = useState('')

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login')
        }
    }, [status, router])

    const handleGenerateQR = async () => {
        setError('')
        setLoading(true)

        try {
            const response = await fetch('/api/auth/totp')
            const data = await response.json()

            if (!response.ok) {
                setError(data.message || 'Erro ao gerar QR code')
            } else {
                setQrCode(data.qrCode)
                setSecret(data.secret)
            }
        } catch (err) {
            setError('Erro ao gerar QR code')
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyAndEnable = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Primeiro verificar o código
            const verifyResponse = await fetch('/api/auth/verify-totp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: verifyToken }),
            })

            if (!verifyResponse.ok) {
                const data = await verifyResponse.json()
                setError(data.message || 'Código inválido')
                setLoading(false)
                return
            }

            // Se verificado, habilitar TOTP
            const enableResponse = await fetch('/api/auth/totp', {
                method: 'POST',
            })

            if (!enableResponse.ok) {
                const data = await enableResponse.json()
                setError(data.message || 'Erro ao habilitar TOTP')
            } else {
                setSuccess('Autenticação de dois fatores habilitada com sucesso!')
                setQrCode('')
                setSecret('')
                setVerifyToken('')
                setTimeout(() => router.push('/'), 2000)
            }
        } catch (err) {
            setError('Erro ao configurar autenticação de dois fatores')
        } finally {
            setLoading(false)
        }
    }

    const handleDisable = async () => {
        setError('')
        setLoading(true)

        try {
            const body: any = {}
            if (disableMethod === 'password') body.password = disableProof
            else body.token = disableProof

            const response = await fetch('/api/auth/totp', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.message || 'Erro ao desabilitar TOTP')
            } else {
                setSuccess('Autenticação de dois fatores desabilitada')
                setShowDisableDialog(false)
                setTimeout(() => router.push('/'), 2000)
            }
        } catch (err) {
            setError('Erro ao desabilitar TOTP')
        } finally {
            setLoading(false)
        }
    }

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Carregando...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <Shield className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">
                        Autenticação de Dois Fatores
                    </CardTitle>
                    <CardDescription className="text-center">
                        Configure a autenticação TOTP para maior segurança
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
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    {!qrCode ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground text-center">
                                Use um aplicativo autenticador como Google Authenticator ou Authy
                            </p>
                            <Button
                                onClick={handleGenerateQR}
                                className="w-full"
                                disabled={loading}
                            >
                                {loading ? 'Gerando...' : 'Gerar QR Code'}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => setShowDisableDialog(true)}
                                className="w-full"
                                disabled={loading}
                            >
                                <ShieldOff className="mr-2 h-4 w-4" />
                                Desabilitar TOTP
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleVerifyAndEnable} className="space-y-4">
                            <div className="flex flex-col items-center space-y-4">
                                <p className="text-sm text-muted-foreground text-center">
                                    Escaneie este QR code com seu aplicativo autenticador
                                </p>
                                <div className="bg-white p-4 rounded-lg">
                                    <Image
                                        src={qrCode}
                                        alt="QR Code TOTP"
                                        width={200}
                                        height={200}
                                    />
                                </div>
                                <div className="text-xs text-center text-muted-foreground">
                                    <p>Ou digite manualmente:</p>
                                    <code className="bg-muted px-2 py-1 rounded">{secret}</code>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="verifyToken">Código de Verificação</Label>
                                <Input
                                    id="verifyToken"
                                    type="text"
                                    placeholder="000000"
                                    maxLength={6}
                                    value={verifyToken}
                                    onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ''))}
                                    required
                                    disabled={loading}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Digite o código de 6 dígitos do seu aplicativo
                                </p>
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Verificando...' : 'Verificar e Habilitar'}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setQrCode('')
                                    setSecret('')
                                    setVerifyToken('')
                                }}
                                className="w-full"
                                disabled={loading}
                            >
                                Cancelar
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Desabilitar Autenticação de Dois Fatores</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja desabilitar a autenticação de dois fatores?
                            Isso tornará sua conta menos segura.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <div className="w-full space-y-2">
                            <div className="flex items-center space-x-2">
                                <label className="text-sm">Método</label>
                                <select value={disableMethod} onChange={(e) => setDisableMethod(e.target.value as any)} className="border rounded px-2 py-1">
                                    <option value="password">Senha</option>
                                    <option value="token">Código TOTP</option>
                                </select>
                            </div>

                            <Input placeholder={disableMethod === 'password' ? 'Senha atual' : 'Código TOTP'} value={disableProof} onChange={(e) => setDisableProof(e.target.value)} />

                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDisableDialog(false)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDisable}
                                    disabled={loading}
                                >
                                    {loading ? 'Desabilitando...' : 'Desabilitar'}
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
