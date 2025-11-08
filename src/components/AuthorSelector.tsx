/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { X, Plus, User } from 'lucide-react'
import { useToast } from '@/components/Toast'

interface Author {
    id: string
    name: string
}

interface AuthorSelectorProps {
    label: string
    selectedIds: string[]
    onChange: (ids: string[]) => void
    multiple?: boolean
    required?: boolean
}

export function AuthorSelector({ label, selectedIds, onChange, multiple = false, required = false }: AuthorSelectorProps) {
    const { toast } = useToast()
    const [authors, setAuthors] = useState<Author[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [filteredAuthors, setFilteredAuthors] = useState<Author[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [newAuthorName, setNewAuthorName] = useState('')
    const [creating, setCreating] = useState(false)
    const [isAdminMode, setIsAdminMode] = useState<boolean | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchAuthors()
    }, [])

    useEffect(() => {
        if (searchTerm) {
            const filtered = authors.filter(author =>
                author.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !selectedIds.includes(author.id)
            )
            setFilteredAuthors(filtered)
            setShowDropdown(filtered.length > 0 || searchTerm.length > 0)
        } else {
            setFilteredAuthors([])
            setShowDropdown(false)
        }
    }, [searchTerm, authors, selectedIds])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchAuthors = async () => {
        try {
            // Try admin endpoint first; if forbidden, fallback to public authors endpoint
            const res = await fetch('/api/admin/authors', { credentials: 'include' })
            if (res.ok) {
                const data = await res.json()
                setAuthors(data.authors || [])
                setIsAdminMode(true)
                return
            }

            if (res.status === 401 || res.status === 403) {
                setIsAdminMode(false)
                const pub = await fetch('/api/authors', { credentials: 'include' })
                if (pub.ok) {
                    const data = await pub.json()
                    setAuthors(data.authors || [])
                }
                return
            }

            // fallback: try public
            const pub = await fetch('/api/authors', { credentials: 'include' })
            if (pub.ok) {
                const data = await pub.json()
                setAuthors(data.authors || [])
                setIsAdminMode(false)
            }
        } catch (err) {
            console.error('Error fetching authors', err)
        }
    }

    const handleSelect = (authorId: string) => {
        if (multiple) {
            onChange([...selectedIds, authorId])
        } else {
            onChange([authorId])
        }
        setSearchTerm('')
        setShowDropdown(false)
    }

    const handleRemove = (authorId: string) => {
        onChange(selectedIds.filter(id => id !== authorId))
    }

    const handleCreateAuthor = async () => {
        if (!newAuthorName.trim()) {
            toast('Digite um nome para o autor', 'error')
            return
        }

        setCreating(true)
        try {
            const endpoint = isAdminMode === false ? '/api/authors/create' : '/api/admin/authors'
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newAuthorName.trim() }),
                credentials: 'include'
            })

            if (res.ok) {
                const data = await res.json()
                const newAuthor = data.author
                setAuthors(prev => [...prev, newAuthor])
                handleSelect(newAuthor.id)
                setNewAuthorName('')
                setShowModal(false)
                toast('Autor criado com sucesso!', 'success')
            } else {
                // parse for debug/telemetry but show a generic message to the user
                try {
                    const errBody = await res.json()
                    console.debug('Author creation error:', errBody)
                } catch (e) {
                    console.debug('Author creation non-json error')
                }
                if (res.status === 401 || res.status === 403) {
                    toast('Você não tem permissão para criar autores.', 'error')
                } else {
                    toast('Não foi possível criar o autor. Tente novamente mais tarde.', 'error')
                }
            }
        } catch (err) {
            console.error('Error creating author', err)
            toast('Erro ao criar autor', 'error')
        } finally {
            setCreating(false)
        }
    }

    const selectedAuthors = authors.filter(a => selectedIds.includes(a.id))

    return (
        <div className="space-y-2">
            <Label className="text-white">
                {label} {required && <span className="text-red-400">*</span>}
            </Label>

            {/* Selected Authors */}
            {selectedAuthors.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {selectedAuthors.map(author => (
                        <div
                            key={author.id}
                            className="flex items-center gap-2 px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full text-white text-sm"
                        >
                            <User className="h-3 w-3" />
                            <span>{author.name}</span>
                            <button
                                type="button"
                                onClick={() => handleRemove(author.id)}
                                className="hover:text-red-400"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Search Input */}
            {(multiple || selectedIds.length === 0) && (
                <div className="relative" ref={dropdownRef}>
                    <Input
                        type="text"
                        placeholder="Digite para buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => searchTerm && setShowDropdown(true)}
                        className="bg-[#1a1625] border-white/10 text-white"
                    />

                    {/* Dropdown */}
                    {showDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-[#1a1625] border border-white/10 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {filteredAuthors.length > 0 ? (
                                filteredAuthors.map(author => (
                                    <button
                                        key={author.id}
                                        type="button"
                                        onClick={() => handleSelect(author.id)}
                                        className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2"
                                    >
                                        <User className="h-4 w-4" />
                                        {author.name}
                                    </button>
                                ))
                            ) : (
                                <div className="p-4 space-y-2">
                                    <p className="text-white/60 text-sm">Nenhum autor encontrado</p>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setNewAuthorName(searchTerm)
                                            setShowModal(true)
                                            setShowDropdown(false)
                                        }}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                        size="sm"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Cadastrar &quot;{searchTerm}&quot;
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Create Author Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="bg-[#0f0b14] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Cadastrar Novo Autor/Artista</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="author-name" className="text-white">Nome</Label>
                            <Input
                                id="author-name"
                                value={newAuthorName}
                                onChange={(e) => setNewAuthorName(e.target.value)}
                                className="bg-[#1a1625] border-white/10 text-white"
                                placeholder="Nome do autor/artista"
                                autoFocus
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowModal(false)}
                            className="text-white hover:bg-white/10"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCreateAuthor}
                            disabled={creating || !newAuthorName.trim()}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {creating ? 'Criando...' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
