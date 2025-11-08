/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/Toast'
import { Shield, Edit, Trash2, Plus, X, Check } from 'lucide-react'

interface Permission {
    id: string
    name: string
    description: string | null
}

interface Role {
    id: string
    name: string
    description: string | null
    isSystem: boolean
    permissions: { permission: Permission }[]
    _count: { users: number }
}

export default function RolesPage() {
    const { toast, ToastContainer } = useToast()
    const [roles, setRoles] = useState<Role[]>([])
    const [permissions, setPermissions] = useState<Permission[]>([])
    const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({})
    const [loading, setLoading] = useState(true)
    const [editingRole, setEditingRole] = useState<Role | null>(null)
    const [creatingRole, setCreatingRole] = useState(false)
    const [roleForm, setRoleForm] = useState({
        name: '',
        description: '',
        permissionIds: [] as string[]
    })

    useEffect(() => {
        fetchRoles()
        fetchPermissions()
    }, [])

    const fetchRoles = async () => {
        try {
            const response = await fetch('/api/admin/roles')
            if (response.ok) {
                const data = await response.json()
                // Normalize API rolePermissions -> permissions for UI compatibility
                const normalized = (data.roles || []).map((r: any) => ({
                    ...r,
                    permissions: r.rolePermissions || r.permissions || [],
                }))
                setRoles(normalized)
            }
        } catch (error) {
            console.error('Error fetching roles:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchPermissions = async () => {
        try {
            const response = await fetch('/api/admin/permissions')
            if (response.ok) {
                const data = await response.json()
                setPermissions(data.permissions)
                setGroupedPermissions(data.grouped)
            }
        } catch (error) {
            console.error('Error fetching permissions:', error)
        }
    }

    const handleEdit = (role: Role) => {
        setEditingRole(role)
        setRoleForm({
            name: role.name,
            description: role.description || '',
            permissionIds: role.permissions.map(p => p.permission.id)
        })
    }

    const handleCreate = () => {
        setCreatingRole(true)
        setRoleForm({
            name: '',
            description: '',
            permissionIds: []
        })
    }

    const handleSave = async () => {
        try {
            const url = editingRole
                ? `/api/admin/roles/${editingRole.id}`
                : '/api/admin/roles'

            const response = await fetch(url, {
                method: editingRole ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roleForm),
            })

            if (response.ok) {
                setEditingRole(null)
                setCreatingRole(false)
                fetchRoles()
            } else {
                const error = await response.json()
                toast(error.error || 'Failed to save role', 'error')
            }
        } catch (error) {
            console.error('Error saving role:', error)
            toast('Failed to save role', 'error')
        }
    }

    const handleDelete = async (roleId: string) => {
        if (!confirm('Tem certeza que deseja excluir esta função?')) return

        try {
            const response = await fetch(`/api/admin/roles/${roleId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                fetchRoles()
            } else {
                const error = await response.json()
                toast(error.error || 'Failed to delete role', 'error')
            }
        } catch (error) {
            console.error('Error deleting role:', error)
            toast('Failed to delete role', 'error')
        }
    }

    const togglePermission = (permissionId: string) => {
        setRoleForm(prev => ({
            ...prev,
            permissionIds: prev.permissionIds.includes(permissionId)
                ? prev.permissionIds.filter(id => id !== permissionId)
                : [...prev.permissionIds, permissionId]
        }))
    }

    const showModal = Boolean(editingRole || creatingRole)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Gerenciamento de Funções</h1>
                    <p className="text-white/60 mt-2">Gerencie funções e permissões</p>
                </div>
                <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Função
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="text-white/40">Carregando...</div>
                ) : (
                    roles.map((role) => (
                        <Card key={role.id} className="bg-[#0f0b14] border-white/10 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-purple-500/10 rounded-lg">
                                        <Shield className="h-6 w-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold">{role.name}</h3>
                                        <p className="text-white/60 text-sm">{role._count.users} usuários</p>
                                    </div>
                                </div>
                                {!role.isSystem && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleEdit(role)}
                                            className="p-2 text-white/60 hover:text-purple-400 hover:bg-white/5 rounded transition-colors"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(role.id)}
                                            className="p-2 text-white/60 hover:text-red-400 hover:bg-white/5 rounded transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {role.description && (
                                <p className="text-white/60 text-sm mb-4">{role.description}</p>
                            )}

                            <div className="space-y-2">
                                <div className="text-white/60 text-sm font-medium">
                                    Permissões ({role.permissions.length})
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {role.permissions.slice(0, 3).map((p) => (
                                        <span key={p.permission.id} className="px-2 py-1 bg-white/5 text-white/60 rounded text-xs">
                                            {p.permission.name.split('.').pop()}
                                        </span>
                                    ))}
                                    {role.permissions.length > 3 && (
                                        <span className="px-2 py-1 text-white/40 text-xs">
                                            +{role.permissions.length - 3} mais
                                        </span>
                                    )}
                                </div>
                            </div>

                            {role.isSystem && (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <span className="text-xs text-purple-400">Função do sistema</span>
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>

            {/* Modal de criar/editar */}
            {showModal && (
                <Dialog open={showModal} onOpenChange={() => {
                    setEditingRole(null)
                    setCreatingRole(false)
                }}>
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <Card className="bg-[#0f0b14] border-white/10 p-6 max-w-3xl w-full my-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-white">
                                    {editingRole ? 'Editar Função' : 'Criar Nova Função'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setEditingRole(null)
                                        setCreatingRole(false)
                                    }}
                                    className="text-white/60 hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-white">Nome da Função</Label>
                                    <Input
                                        value={roleForm.name}
                                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                                        disabled={editingRole?.isSystem}
                                        placeholder="ex.: Editor"
                                        className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-white">Descrição</Label>
                                    <textarea
                                        value={roleForm.description}
                                        onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                                        placeholder="Descreva o propósito desta função..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 resize-none"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-white">Permissões</Label>
                                    <div className="max-h-96 overflow-y-auto space-y-4 border border-white/10 rounded-lg p-4">
                                        {Object.entries(groupedPermissions).map(([category, perms]) => (
                                            <div key={category}>
                                                <h4 className="text-white font-medium mb-2 capitalize">{category}</h4>
                                                <div className="space-y-2">
                                                    {perms.map((permission) => (
                                                        <label
                                                            key={permission.id}
                                                            className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer"
                                                        >
                                                            <div
                                                                className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${roleForm.permissionIds.includes(permission.id)
                                                                    ? 'bg-purple-600 border-purple-600'
                                                                    : 'border-white/20'
                                                                    }`}
                                                            >
                                                                {roleForm.permissionIds.includes(permission.id) && (
                                                                    <Check className="h-3 w-3 text-white" />
                                                                )}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={roleForm.permissionIds.includes(permission.id)}
                                                                onChange={() => togglePermission(permission.id)}
                                                                className="hidden"
                                                            />
                                                            <div className="flex-1">
                                                                <div className="text-white text-sm">{permission.name.split('.').pop()?.replace(/_/g, ' ')}</div>
                                                                {permission.description && (
                                                                    <div className="text-white/40 text-xs">{permission.description}</div>
                                                                )}
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 justify-end mt-6">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setEditingRole(null)
                                        setCreatingRole(false)
                                    }}
                                    className="text-white hover:bg-white/10"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    {editingRole ? 'Salvar Alterações' : 'Criar Função'}
                                </Button>
                            </div>
                        </Card>
                    </div>
                </Dialog>
            )}
            <ToastContainer />
        </div>
    )
}
