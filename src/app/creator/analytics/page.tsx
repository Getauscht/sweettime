'use client'

import { Card } from '@/components/ui/card'
import { BarChart3, TrendingUp, Eye, Users } from 'lucide-react'

export default function CreatorAnalyticsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white">Análises</h1>
                <p className="text-white/60 mt-2">
                    Acompanhe o desempenho da sua série e o engajamento do público
                </p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-[#0f0b14] border-white/10 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-purple-500/10">
                            <Eye className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                            <div className="text-white/60 text-sm">Total de Visualizações</div>
                            <div className="text-white text-2xl font-bold">Em Breve</div>
                        </div>
                    </div>
                </Card>

                <Card className="bg-[#0f0b14] border-white/10 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-pink-500/10">
                            <Users className="h-6 w-6 text-pink-400" />
                        </div>
                        <div>
                            <div className="text-white/60 text-sm">Seguidores</div>
                            <div className="text-white text-2xl font-bold">Em Breve</div>
                        </div>
                    </div>
                </Card>

                <Card className="bg-[#0f0b14] border-white/10 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-blue-500/10">
                            <TrendingUp className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-white/60 text-sm">Taxa de Engajamento</div>
                            <div className="text-white text-2xl font-bold">Em Breve</div>
                        </div>
                    </div>
                </Card>

                <Card className="bg-[#0f0b14] border-white/10 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-green-500/10">
                            <BarChart3 className="h-6 w-6 text-green-400" />
                        </div>
                        <div>
                            <div className="text-white/60 text-sm">Avaliação Média</div>
                            <div className="text-white text-2xl font-bold">Em Breve</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts Placeholder */}
            <Card className="bg-[#0f0b14] border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Visualizações ao longo do tempo</h2>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-white/10 rounded-lg">
                    <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-white/20 mx-auto mb-4" />
                        <p className="text-white/40">Gráficos de análise em breve</p>
                    </div>
                </div>
            </Card>

            <Card className="bg-[#0f0b14] border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Desempenho das Séries</h2>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-white/10 rounded-lg">
                    <div className="text-center">
                        <TrendingUp className="h-12 w-12 text-white/20 mx-auto mb-4" />
                        <p className="text-white/40">Comparação de séries em breve</p>
                    </div>
                </div>
            </Card>
        </div>
    )
}
