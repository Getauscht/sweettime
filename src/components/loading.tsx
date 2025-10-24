import { Loader2 } from 'lucide-react'

interface LoadingProps {
    text?: string
}

export default function Loading({ text = 'Carregando...' }: LoadingProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">{text}</p>
        </div>
    )
}
