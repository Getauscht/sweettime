'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/AdminShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Settings {
    siteName: string
    fromName: string
    fromEmail: string
    magicLinkTtlMinutes: number
    magicLinkEnabled: boolean
    logoUrl?: string | null
    faviconUrl?: string | null
}

export default function AdminSettingsPage() {
    const router = useRouter()
    const [settings, setSettings] = useState<Settings>({
        siteName: '',
        fromName: '',
        fromEmail: '',
        magicLinkTtlMinutes: 60,
        magicLinkEnabled: true,
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [uploading, setUploading] = useState(false)
    const logoInputRef = useRef<HTMLInputElement | null>(null)
    const faviconInputRef = useRef<HTMLInputElement | null>(null)
    const [logoFileName, setLogoFileName] = useState<string | null>(null)
    const [faviconFileName, setFaviconFileName] = useState<string | null>(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/admin/settings')
            if (response.ok) {
                const data = await response.json()
                setSettings(data)
            } else if (response.status === 403) {
                setMessage('Você não tem permissão para acessar esta página')
            } else {
                setMessage('Erro ao carregar configurações')
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
            setMessage('Erro ao carregar configurações')
        } finally {
            setLoading(false)
        }
    }

    const uploadFile = async (file: File | null, type: 'logo' | 'favicon') => {
        if (!file) return null
        setUploading(true)
        try {
            const form = new FormData()
            form.append('file', file)
            form.append('type', type)

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: form,
            })

            const json = await res.json()
            if (!res.ok) {
                setMessage(json.error || 'Erro ao enviar arquivo')
                return null
            }

            return json.url as string
        } catch (err) {
            console.error('Upload error', err)
            setMessage('Erro ao enviar arquivo')
            return null
        } finally {
            setUploading(false)
        }
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}

        if (!settings.siteName.trim()) {
            newErrors.siteName = 'Nome do site é obrigatório'
        }

        if (!settings.fromName.trim()) {
            newErrors.fromName = 'Nome do remetente é obrigatório'
        }

        if (!settings.fromEmail.trim() || !settings.fromEmail.includes('@')) {
            newErrors.fromEmail = 'Email do remetente inválido'
        }

        if (settings.magicLinkTtlMinutes < 5 || settings.magicLinkTtlMinutes > 1440) {
            newErrors.magicLinkTtlMinutes = 'TTL deve estar entre 5 e 1440 minutos'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage('')

        if (!validate()) {
            return
        }

        setSaving(true)

        try {
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings),
            })

            const data = await response.json()

            if (response.ok) {
                setSettings(data)
                setMessage('Configurações salvas com sucesso!')
            } else {
                setMessage(data.error || 'Erro ao salvar configurações')
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            setMessage('Erro ao salvar configurações')
        } finally {
            setSaving(false)
        }
    }

    const handleChange = (field: keyof Settings, value: string | number | boolean) => {
        setSettings(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    if (loading) {
        return (
            <AdminShell>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            </AdminShell>
        )
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Configurações</h1>
                <p className="text-gray-400">
                    Configure as opções do sistema, incluindo email e magic links
                </p>
            </div>

            {message && (
                <Alert
                    className={`mb-6 ${message.includes('sucesso')
                        ? 'bg-green-600/20 border-green-600/50 text-green-100'
                        : 'bg-red-600/20 border-red-600/50 text-red-100'
                        }`}
                >
                    <AlertDescription>{message}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="bg-[#0f0b14] border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Configurações Gerais</CardTitle>
                        <CardDescription className="text-gray-400">
                            Informações básicas do site
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-white">Logo do Site</Label>
                            <div className="flex items-center space-x-4">
                                <div className="w-32 h-12 bg-white/5 flex items-center justify-center border border-white/5">
                                    {settings.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={settings.logoUrl} alt="Logo" className="max-h-10 object-contain" />
                                    ) : (
                                        <span className="text-sm text-gray-400">Sem logo</span>
                                    )}
                                </div>
                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const f = e.target.files?.[0] || null
                                        if (!f) return
                                        setLogoFileName(f.name)
                                        const url = await uploadFile(f, 'logo')
                                        if (url) setSettings(prev => ({ ...prev, logoUrl: url }))
                                    }}
                                    disabled={uploading}
                                    className="sr-only"
                                    aria-hidden
                                />
                                <div className="flex items-center space-x-2">
                                    <Button
                                        type="button"
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={uploading}
                                        className="h-9"
                                    >
                                        {uploading ? 'Enviando...' : 'Enviar logo'}
                                    </Button>
                                    <span className="text-sm text-gray-400">{logoFileName ?? (settings.logoUrl ? 'Já enviado' : 'Nenhum arquivo')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-white">Favicon</Label>
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-white/5 flex items-center justify-center border border-white/5">
                                    {settings.faviconUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={settings.faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                                    ) : (
                                        <span className="text-sm text-gray-400">Sem ícone</span>
                                    )}
                                </div>
                                <input
                                    ref={faviconInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const f = e.target.files?.[0] || null
                                        if (!f) return
                                        setFaviconFileName(f.name)
                                        const url = await uploadFile(f, 'favicon')
                                        if (url) setSettings(prev => ({ ...prev, faviconUrl: url }))
                                    }}
                                    disabled={uploading}
                                    className="sr-only"
                                    aria-hidden
                                />
                                <div className="flex items-center space-x-2">
                                    <Button
                                        type="button"
                                        onClick={() => faviconInputRef.current?.click()}
                                        disabled={uploading}
                                        className="h-9"
                                    >
                                        {uploading ? 'Enviando...' : 'Enviar ícone'}
                                    </Button>
                                    <span className="text-sm text-gray-400">{faviconFileName ?? (settings.faviconUrl ? 'Já enviado' : 'Nenhum arquivo')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="siteName" className="text-white">Nome do Site</Label>
                            <Input
                                id="siteName"
                                type="text"
                                value={settings.siteName}
                                onChange={(e) => handleChange('siteName', e.target.value)}
                                disabled={saving}
                                className={`bg-white/5 border-white/10 text-white ${errors.siteName ? 'border-red-500' : ''
                                    }`}
                            />
                            {errors.siteName && (
                                <p className="text-sm text-red-500">{errors.siteName}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#0f0b14] border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Configurações de Email</CardTitle>
                        <CardDescription className="text-gray-400">
                            Configure o remetente dos emails do sistema
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fromName" className="text-white">Nome do Remetente</Label>
                            <Input
                                id="fromName"
                                type="text"
                                value={settings.fromName}
                                onChange={(e) => handleChange('fromName', e.target.value)}
                                disabled={saving}
                                className={`bg-white/5 border-white/10 text-white ${errors.fromName ? 'border-red-500' : ''
                                    }`}
                            />
                            {errors.fromName && (
                                <p className="text-sm text-red-500">{errors.fromName}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fromEmail" className="text-white">Email do Remetente</Label>
                            <Input
                                id="fromEmail"
                                type="email"
                                value={settings.fromEmail}
                                onChange={(e) => handleChange('fromEmail', e.target.value)}
                                disabled={saving}
                                className={`bg-white/5 border-white/10 text-white ${errors.fromEmail ? 'border-red-500' : ''
                                    }`}
                            />
                            {errors.fromEmail && (
                                <p className="text-sm text-red-500">{errors.fromEmail}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#0f0b14] border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Configurações de Magic Link</CardTitle>
                        <CardDescription className="text-gray-400">
                            Configure o comportamento dos links mágicos de recuperação de senha
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="magicLinkTtlMinutes" className="text-white">
                                Tempo de Expiração (minutos)
                            </Label>
                            <Input
                                id="magicLinkTtlMinutes"
                                type="number"
                                min="5"
                                max="1440"
                                value={settings.magicLinkTtlMinutes}
                                onChange={(e) => handleChange('magicLinkTtlMinutes', parseInt(e.target.value))}
                                disabled={saving}
                                className={`bg-white/5 border-white/10 text-white ${errors.magicLinkTtlMinutes ? 'border-red-500' : ''
                                    }`}
                            />
                            <p className="text-sm text-gray-400">Entre 5 minutos e 24 horas (1440 minutos)</p>
                            {errors.magicLinkTtlMinutes && (
                                <p className="text-sm text-red-500">{errors.magicLinkTtlMinutes}</p>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="magicLinkEnabled"
                                checked={settings.magicLinkEnabled}
                                onChange={(e) => handleChange('magicLinkEnabled', e.target.checked)}
                                disabled={saving}
                                className="w-4 h-4 text-purple-600 bg-white/5 border-white/10 rounded focus:ring-purple-500"
                            />
                            <Label htmlFor="magicLinkEnabled" className="text-white cursor-pointer">
                                Habilitar envio de magic links
                            </Label>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end space-x-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/admin')}
                        disabled={saving}
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={saving}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {saving ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
