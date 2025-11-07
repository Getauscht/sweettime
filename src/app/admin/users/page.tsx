'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/Toast'
import { Edit, Lock, Trash2, ChevronLeft, ChevronRight, X, Send, UploadCloud } from 'lucide-react'

interface User {
    id: string
    name: string | null
    email: string | null
    image: string | null
    status: string
    role: {
        id: string
        name: string
    } | null
    lastActive: string
    createdAt: string
}

interface Role {
    id: string
    name: string
}

export default function UserManagement() {
    const { toast, ToastContainer } = useToast()
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [roles, setRoles] = useState<Role[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [sortBy, setSortBy] = useState('createdAt')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [importModalOpen, setImportModalOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadProgress, setUploadProgress] = useState<number | null>(null)
    const [importResult, setImportResult] = useState<any>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        roleId: '',
        status: 'active'
    })

    useEffect(() => {
        fetchUsers()
        fetchRoles()
    }, [page, roleFilter, statusFilter, search, sortBy])

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                ...(roleFilter && { role: roleFilter }),
                ...(statusFilter && { status: statusFilter }),
                ...(search && { search }),
                sortBy,
                sortOrder: 'desc',
            })

            const response = await fetch(`/api/admin/users?${params}`)
            if (response.ok) {
                const data = await response.json()
                setUsers(data.users)
                setTotalPages(data.pagination.totalPages)
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchRoles = async () => {
        try {
            const response = await fetch('/api/admin/roles')
            if (response.ok) {
                const data = await response.json()
                setRoles(data.roles)
            }
        } catch (error) {
            console.error('Error fetching roles:', error)
        }
    }

    const handleEdit = (user: User) => {
        setEditingUser(user)
        setEditForm({
            name: user.name || '',
            email: user.email || '',
            roleId: user.role?.id || '',
            status: user.status
        })
    }

    const handleSaveEdit = async () => {
        if (!editingUser) return

        try {
            const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            })

            if (response.ok) {
                setEditingUser(null)
                fetchUsers()
            } else {
                const error = await response.json()
                toast(error.error || 'Falha ao atualizar usuário', 'error')
            }
        } catch (error) {
            console.error('Error updating user:', error)
            toast('Falha ao atualizar usuário', 'error')
        }
    }

    const handleStatusToggle = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active'

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })

            if (response.ok) {
                fetchUsers()
            }
        } catch (error) {
            console.error('Error updating user:', error)
        }
    }

    const handleDelete = async (userId: string) => {
        if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                fetchUsers()
            } else {
                const error = await response.json()
                toast(error.error || 'Falha ao excluir usuário', 'error')
            }
        } catch (error) {
            console.error('Error deleting user:', error)
            toast('Falha ao excluir usuário', 'error')
        }
    }

    const handleSendMagicLink = async (userId: string, userEmail: string | null) => {
        if (!userEmail) {
            toast('Usuário não possui email cadastrado', 'error')
            return
        }

        if (!confirm(`Enviar link de recuperação para ${userEmail}?`)) return

        try {
            const response = await fetch('/api/admin/users/send-magic-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            })

            const data = await response.json()

            if (response.ok) {
                toast(data.message || 'Link enviado com sucesso!', 'success')
            } else {
                toast(data.error || 'Falha ao enviar link', 'error')
            }
        } catch (error) {
            console.error('Error sending magic link:', error)
            toast('Falha ao enviar link', 'error')
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
        })
    }

    const getTimeAgo = (dateString: string) => {
        const now = new Date()
        const date = new Date(dateString)
        const diffMs = now.getTime() - date.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)

        if (diffHours < 1) return 'Agora mesmo'
        if (diffHours < 24) return `${diffHours}h atrás`
        if (diffDays < 30) return `${diffDays}d atrás`
        return formatDate(dateString)
    }

    return (
        <div className="space-y-6">
            {/* Cabeçalho */}
            <div>
                <h1 className="text-3xl font-bold text-white">Gerenciamento de Usuários</h1>
                <p className="text-white/60 mt-2">Visualize, edite, suspenda ou exclua contas de usuários</p>
            </div>

            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4">
                <Input
                    type="text"
                    placeholder="Buscar usuários..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-[#0f0b14] border-white/10 text-white placeholder:text-white/40"
                />
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-2 bg-[#0f0b14] border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                    <option value="">Todas as funções</option>
                    {roles.map(role => (
                        <option key={role.id} value={role.name.toLowerCase()}>{role.name}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-[#0f0b14] border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                    <option value="">Todos os status</option>
                    <option value="active">Ativo</option>
                    <option value="suspended">Suspenso</option>
                </select>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 bg-[#0f0b14] border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                    <option value="createdAt">Data de entrada</option>
                    <option value="lastActive">Última atividade</option>
                    <option value="name">Nome</option>
                </select>
                <div className="ml-auto flex items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files && e.target.files[0]
                            setSelectedFile(f || null)
                            setImportResult(null)
                            setImportModalOpen(true)
                        }}
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-[#21102b] text-white border border-white/10 hover:bg-[#2a1239]"
                    >
                        <UploadCloud className="h-4 w-4 mr-2" />
                        Importar usuários (WordPress)
                    </Button>
                </div>
            </div>

            {/* Tabela */}
            <Card className="bg-[#0f0b14] border-white/10">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Usuário</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Função</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Status</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Data de entrada</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Última atividade</th>
                                <th className="px-6 py-4 text-right text-sm font-medium text-white/60">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                                        Carregando...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                                        Nenhum usuário encontrado
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {user.image ? (
                                                    <img
                                                        src={user.image}
                                                        alt={user.name || 'Usuário'}
                                                        className="w-10 h-10 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                                                        <span className="text-white font-semibold">
                                                            {user.name?.[0]?.toUpperCase() || 'U'}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-white font-medium">{user.name || 'Sem nome'}</div>
                                                    <div className="text-white/60 text-sm">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm">
                                                {user.role?.name || 'Sem função'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-sm font-medium ${user.status === 'active'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-red-500/20 text-red-400'
                                                    }`}
                                            >
                                                {user.status === 'active' ? 'Ativo' : 'Suspenso'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-white/60 text-sm">{formatDate(user.createdAt)}</td>
                                        <td className="px-6 py-4 text-white/60 text-sm">{getTimeAgo(user.lastActive)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleSendMagicLink(user.id, user.email)}
                                                    className="p-2 text-white/60 hover:text-blue-400 hover:bg-white/5 rounded transition-colors"
                                                    title="Recuperar senha legada"
                                                >
                                                    <Send className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-2 text-white/60 hover:text-purple-400 hover:bg-white/5 rounded transition-colors"
                                                    title="Editar usuário"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusToggle(user.id, user.status)}
                                                    className="p-2 text-white/60 hover:text-yellow-400 hover:bg-white/5 rounded transition-colors"
                                                    title={user.status === 'active' ? 'Suspender usuário' : 'Ativar usuário'}
                                                >
                                                    <Lock className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2 text-white/60 hover:text-red-400 hover:bg-white/5 rounded transition-colors"
                                                    title="Excluir usuário"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                        <div className="text-sm text-white/60">
                            Página {page} de {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                className="text-white hover:bg-white/10 disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Anterior
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPage(page + 1)}
                                disabled={page >= totalPages}
                                className="text-white hover:bg-white/10 disabled:opacity-50"
                            >
                                Próximo
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Modal de edição de usuário */}
            {editingUser && (
                <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <Card className="bg-[#0f0b14] border-white/10 p-6 max-w-md w-full">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-white">Editar usuário</h3>
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="text-white/60 hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-white">Nome</Label>
                                    <Input
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-white">Email</Label>
                                    <Input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-white">Função</Label>
                                    <select
                                        value={editForm.roleId}
                                        onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="">Selecionar função</option>
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-white">Status</Label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="active">Ativo</option>
                                        <option value="suspended">Suspenso</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 justify-end mt-6">
                                <Button
                                    variant="ghost"
                                    onClick={() => setEditingUser(null)}
                                    className="text-white hover:bg-white/10"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleSaveEdit}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    Salvar Alterações
                                </Button>
                            </div>
                        </Card>
                    </div>
                </Dialog>
            )}
            <ToastContainer />

            {/* Modal de importação CSV */}
            {importModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <Card className="bg-[#0f0b14] border-white/10 p-6 max-w-xl w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-bold text-white">Importar usuários do WordPress</h3>
                            <button
                                onClick={() => { setImportModalOpen(false); setSelectedFile(null); setUploadProgress(null); setImportResult(null) }}
                                className="text-white/60 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 border-2 border-dashed border-white/10 rounded-md text-center">
                                {!selectedFile ? (
                                    <div className="text-white/60">Selecione um arquivo CSV exportado do WordPress (colunas: ID, user_login, user_pass, user_nicename, user_email)</div>
                                ) : (
                                    <div className="text-white">
                                        <div className="font-medium">{selectedFile.name}</div>
                                        <div className="text-sm text-white/60">{Math.round(selectedFile.size / 1024)} KB</div>
                                    </div>
                                )}
                            </div>

                            {uploadProgress !== null && (
                                <div>
                                    <div className="text-white/60 text-sm mb-2">Progresso de upload</div>
                                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                                        <div style={{ width: `${uploadProgress}%` }} className="h-full bg-purple-600" />
                                    </div>
                                </div>
                            )}

                            {importResult && (
                                <div className="bg-white/5 p-3 rounded text-white/80">
                                    <div className="font-medium">Resultado da importação</div>
                                    <div className="text-sm mt-2">Importados: {importResult.imported} — Pulados: {importResult.skipped}</div>
                                    {importResult.errors && importResult.errors.length > 0 && (
                                        <div className="mt-2 text-sm text-orange-300">
                                            Erros: {importResult.errors.length} (ver console para detalhes)
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4 justify-end mt-6">
                            <Button
                                variant="ghost"
                                onClick={() => { setImportModalOpen(false); setSelectedFile(null); setUploadProgress(null); setImportResult(null) }}
                                className="text-white hover:bg-white/10"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (!selectedFile) {
                                        toast('Selecione um arquivo CSV antes de importar', 'error')
                                        return
                                    }

                                    setUploadProgress(0)

                                    try {
                                        const formData = new FormData()
                                        formData.append('file', selectedFile)

                                        // Use fetch with credentials to include cookies
                                        const response = await fetch('/api/admin/users/import', {
                                            method: 'POST',
                                            body: formData,
                                            headers: {
                                                Accept: 'application/json'               
                                            }
                                        })

                                        if (!response.ok) {
                                            const data = await response.json().catch(() => null)
                                            toast((data && data.error) || 'Falha na importação', 'error')
                                        } else {
                                            const data = await response.json()
                                            setImportResult(data)
                                            toast(data.message || 'Importação concluída', 'success')
                                            fetchUsers()
                                        }
                                    } catch (error) {
                                        console.error('Import error:', error)
                                        toast('Erro ao importar usuários', 'error')
                                    } finally {
                                        setUploadProgress(null)
                                    }
                                }}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                Iniciar importação
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
