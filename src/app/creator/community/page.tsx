'use client'

import { Card } from '@/components/ui/card'
import { Users, MessageSquare, TrendingUp, Award } from 'lucide-react'

export default function CreatorCommunityPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white">Comunidade</h1>
                <p className="text-white/60 mt-2">
                    Conecte-se com outros criadores e seu público
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-[#0f0b14] border-white/10 p-8">
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-purple-500/10 rounded-full mb-4">
                            <Users className="h-8 w-8 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Fórum de Criadores</h3>
                        <p className="text-white/60 mb-4">
                            Conecte-se com outros criadores, compartilhe dicas e receba feedback
                        </p>
                        <p className="text-white/40 text-sm">Em breve</p>
                    </div>
                </Card>

                <Card className="bg-[#0f0b14] border-white/10 p-8">
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-pink-500/10 rounded-full mb-4">
                            <MessageSquare className="h-8 w-8 text-pink-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Comentários dos Leitores</h3>
                        <p className="text-white/60 mb-4">
                            Leia e responda aos comentários do seu público
                        </p>
                        <p className="text-white/40 text-sm">Em breve</p>
                    </div>
                </Card>

                <Card className="bg-[#0f0b14] border-white/10 p-8">
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-blue-500/10 rounded-full mb-4">
                            <TrendingUp className="h-8 w-8 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Tópicos em alta</h3>
                        <p className="text-white/60 mb-4">
                            Fique atualizado com gêneros e temas populares
                        </p>
                        <p className="text-white/40 text-sm">Em breve</p>
                    </div>
                </Card>

                <Card className="bg-[#0f0b14] border-white/10 p-8">
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-green-500/10 rounded-full mb-4">
                            <Award className="h-8 w-8 text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Concursos e Eventos</h3>
                        <p className="text-white/60 mb-4">
                            Participe de concursos comunitários e eventos especiais
                        </p>
                        <p className="text-white/40 text-sm">Em breve</p>
                    </div>
                </Card>
            </div>

            <Card className="bg-[#0f0b14] border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Discussões Recentes</h2>
                <div className="text-white/40 text-center py-12">
                    Recursos da comunidade estarão disponíveis em breve
                </div>
            </Card>
        </div>
    )
}
