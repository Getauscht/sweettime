'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar } from '@/components/ui/avatar'
import { User, Bell, Lock, Palette } from 'lucide-react'

export default function CreatorSettingsPage() {
    const { data: session } = useSession()
    const [activeTab, setActiveTab] = useState('profile')

    const tabs = [
        { id: 'profile', name: 'Perfil', icon: User },
        { id: 'notifications', name: 'Notificações', icon: Bell },
        { id: 'security', name: 'Segurança', icon: Lock },
        { id: 'appearance', name: 'Aparência', icon: Palette },
    ]

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white">Configurações</h1>
                <p className="text-white/60 mt-2">
                    Gerencie as configurações e preferências da sua conta
                </p>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Sidebar */}
                <div className="col-span-12 lg:col-span-3">
                    <Card className="bg-[#0f0b14] border-white/10 p-2">
                        <nav className="space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id
                                        ? 'bg-purple-600 text-white'
                                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <tab.icon className="h-5 w-5" />
                                    <span>{tab.name}</span>
                                </button>
                            ))}
                        </nav>
                    </Card>
                </div>

                {/* Content */}
                <div className="col-span-12 lg:col-span-9">
                    {activeTab === 'profile' && (
                        <Card className="bg-[#0f0b14] border-white/10 p-6">
                            <h2 className="text-xl font-bold text-white mb-6">Configurações do Perfil</h2>

                            <div className="space-y-6">
                                <div className="flex items-center gap-6">
                                    <Avatar className="h-24 w-24 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                        {session?.user?.name?.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <div>
                                        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                                            Alterar Avatar
                                        </Button>
                                        <p className="text-white/40 text-sm mt-2">JPG, PNG ou GIF. Tamanho máximo 2MB</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-white">Nome de exibição</Label>
                                        <Input
                                            defaultValue={session?.user?.name || ''}
                                            className="bg-white/5 border-white/10 text-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-white">Email</Label>
                                        <Input
                                            defaultValue={session?.user?.email || ''}
                                            type="email"
                                            className="bg-white/5 border-white/10 text-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-white">Biografia</Label>
                                        <textarea
                                            placeholder="Conte-nos sobre você..."
                                            rows={4}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                                        Salvar Alterações
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'notifications' && (
                        <Card className="bg-[#0f0b14] border-white/10 p-6">
                            <h2 className="text-xl font-bold text-white mb-6">Preferências de Notificações</h2>
                            <div className="text-white/40 text-center py-12">
                                Configurações de notificações em breve
                            </div>
                        </Card>
                    )}

                    {activeTab === 'security' && (
                        <Card className="bg-[#0f0b14] border-white/10 p-6">
                            <h2 className="text-xl font-bold text-white mb-6">Configurações de Segurança</h2>
                            <div className="text-white/40 text-center py-12">
                                Configurações de segurança em breve
                            </div>
                        </Card>
                    )}

                    {activeTab === 'appearance' && (
                        <Card className="bg-[#0f0b14] border-white/10 p-6">
                            <h2 className="text-xl font-bold text-white mb-6">Configurações de Aparência</h2>
                            <div className="text-white/40 text-center py-12">
                                Personalização de tema em breve
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
