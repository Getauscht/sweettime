# 🔐 Sistema RBAC - Controle de Acesso Baseado em Funções

## Visão Geral

O sistema RBAC (Role-Based Access Control) implementado no StoryVerse permite gerenciar permissões granulares para diferentes tipos de usuários através de funções (roles) e permissões customizáveis.

## Arquitetura

### Modelos do Banco de Dados

#### Role (Função)
```typescript
{
  id: string
  name: string        // admin, moderator, author, reader
  description: string
  isSystem: boolean   // Roles do sistema não podem ser deletadas
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### Permission (Permissão)
```typescript
{
  id: string
  name: string        // webtoons.create, users.manage, etc
  description: string
  category: string    // webtoons, users, authors, genres, analytics, system
  createdAt: DateTime
}
```

#### RolePermission (Relacionamento)
```typescript
{
  roleId: string
  permissionId: string
}
```

## Funções Padrão

### 1. Admin
**Acesso Completo ao Sistema**
- Todas as permissões disponíveis
- Pode gerenciar usuários, roles e permissões
- Acesso a todas as funcionalidades administrativas

### 2. Moderator
**Gerenciamento de Conteúdo**
- Editar/deletar webtoons
- Editar autores e gêneros
- Visualizar usuários e suspendê-los
- Acesso a analytics básico

### 3. Author
**Criação de Conteúdo**
- Criar e editar próprios webtoons
- Visualizar estatísticas dos próprios webtoons
- Gerenciar perfil de autor

### 4. Reader
**Acesso Básico**
- Visualizar webtoons
- Interagir com conteúdo (comentários, likes)
- Gerenciar própria conta

## Categorias de Permissões

### Webtoons
```typescript
WEBTOONS_VIEW     // Visualizar webtoons
WEBTOONS_CREATE   // Criar novos webtoons
WEBTOONS_EDIT     // Editar webtoons
WEBTOONS_DELETE   // Deletar webtoons
WEBTOONS_PUBLISH  // Publicar/despublicar capítulos
```

### Authors
```typescript
AUTHORS_VIEW      // Visualizar autores
AUTHORS_CREATE    // Adicionar novos autores
AUTHORS_EDIT      // Editar perfis de autores
AUTHORS_DELETE    // Remover autores
```

### Genres
```typescript
GENRES_VIEW       // Visualizar gêneros
GENRES_CREATE     // Criar novos gêneros
GENRES_EDIT       // Editar gêneros
GENRES_DELETE     // Remover gêneros
```

### Users
```typescript
USERS_VIEW            // Listar usuários
USERS_CREATE          // Criar novos usuários
USERS_EDIT            // Editar dados de usuários
USERS_DELETE          // Deletar usuários
USERS_SUSPEND         // Suspender/banir usuários
USERS_MANAGE_ROLES    // Atribuir roles a usuários
```

### Roles & Permissions
```typescript
ROLES_VIEW            // Visualizar roles
ROLES_CREATE          // Criar custom roles
ROLES_EDIT            // Editar roles
ROLES_DELETE          // Deletar roles (exceto system)
PERMISSIONS_MANAGE    // Gerenciar permissões de roles
```

### Analytics
```typescript
ANALYTICS_VIEW        // Visualizar relatórios
ANALYTICS_EXPORT      // Exportar dados
```

### System
```typescript
SYSTEM_SETTINGS       // Configurações do sistema
SYSTEM_LOGS          // Visualizar logs de atividade
```

## Uso do Sistema

### Verificar Permissões

#### Em API Routes
```typescript
import { withPermission } from '@/lib/auth/middleware'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { authOptions } from '@/pages/api/auth/[...nextauth]'

export const GET = withPermission(
  PERMISSIONS.USERS_VIEW,
  async (req: Request, { userId }) => {
    // Sua lógica aqui
    return NextResponse.json({ data: '...' })
  },
  authOptions
)
```

#### Com Múltiplas Permissões (OR)
```typescript
export const GET = withPermission(
  [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_EDIT],
  async (req: Request) => {
    // Executado se o usuário tiver qualquer uma das permissões
  },
  authOptions
)
```

#### Verificação Manual
```typescript
import { hasPermission, hasAnyPermission } from '@/lib/auth/permissions'

// Verificar uma permissão
const canEdit = await hasPermission(userId, PERMISSIONS.WEBTOONS_EDIT)

// Verificar múltiplas permissões (OR)
const canManage = await hasAnyPermission(userId, [
  PERMISSIONS.WEBTOONS_EDIT,
  PERMISSIONS.WEBTOONS_DELETE
])
```

### Em Componentes React (Client-Side)

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function MyComponent() {
  const { data: session } = useSession()
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/auth/check-permission?permission=webtoons.edit`)
        .then(res => res.json())
        .then(data => setCanEdit(data.allowed))
    }
  }, [session])

  return (
    <div>
      {canEdit && (
        <button>Edit Webtoon</button>
      )}
    </div>
  )
}
```

## Inicialização do Sistema

### 1. Gerar Migração do Banco
```bash
npm run db:generate
npm run db:migrate
```

### 2. Executar Seed
```bash
npm run db:seed
```

Isso irá criar:
- Todas as permissões predefinidas
- As 4 roles padrão (admin, moderator, author, reader)
- Usuário admin padrão
- Dados de exemplo (autores, webtoons, gêneros)

### 3. Credenciais Padrão
```
Email: admin@storyverse.com
Password: admin123
```

## API Endpoints Administrativos

### Dashboard
```
GET /api/admin/dashboard/stats
```
Retorna estatísticas gerais do sistema

### Gerenciamento de Usuários
```
GET    /api/admin/users        # Listar usuários
PATCH  /api/admin/users        # Atualizar usuário
DELETE /api/admin/users        # Deletar usuário
```

Query params suportados:
- `page`: Número da página
- `limit`: Itens por página
- `role`: Filtrar por role
- `status`: Filtrar por status
- `search`: Buscar por nome ou email
- `sortBy`: Campo para ordenar
- `sortOrder`: asc ou desc

## Criando Roles Customizadas

### Via API (Futuro)
```typescript
POST /api/admin/roles
{
  "name": "content-manager",
  "description": "Manages content without user access",
  "permissions": [
    "webtoons.view",
    "webtoons.edit",
    "authors.view",
    "authors.edit",
    "genres.view",
    "genres.edit"
  ]
}
```

### Via Prisma Direto
```typescript
import { prisma } from '@/lib/prisma'

const role = await prisma.role.create({
  data: {
    name: 'content-manager',
    description: 'Manages content without user access',
    isSystem: false,
  }
})

// Atribuir permissões
const permissions = await prisma.permission.findMany({
  where: {
    name: {
      in: ['webtoons.view', 'webtoons.edit', 'authors.view']
    }
  }
})

for (const permission of permissions) {
  await prisma.rolePermission.create({
    data: {
      roleId: role.id,
      permissionId: permission.id,
    }
  })
}
```

## Estrutura do Painel Administrativo

### Páginas Disponíveis

1. **Dashboard** (`/admin`)
   - Estatísticas gerais
   - Atividades recentes
   - Top webtoons

2. **Webtoons** (`/admin/webtoons`)
   - Listagem de todos os webtoons
   - Filtros e busca
   - Ações: visualizar, editar, deletar

3. **Authors** (`/admin/authors`)
   - Gerenciamento de autores
   - Estatísticas por autor

4. **Genres** (`/admin/genres`)
   - Gerenciamento de gêneros
   - Contagem de webtoons por gênero

5. **Users** (`/admin/users`)
   - Lista completa de usuários
   - Filtros por role e status
   - Ações: editar, suspender, deletar
   - Atribuição de roles

6. **Analytics** (`/admin/analytics`)
   - Métricas detalhadas
   - Gráficos de performance
   - Relatórios exportáveis

## Segurança

### Proteção de Rotas
Todas as rotas administrativas devem verificar:
1. Autenticação (usuário logado)
2. Autorização (permissões necessárias)

### Exemplo de Middleware Completo
```typescript
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

export default async function AdminLayout({ children }) {
  const session = await getServerSession()
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }
  
  const hasAccess = await hasPermission(
    session.user.id,
    PERMISSIONS.ANALYTICS_VIEW // Permissão mínima para admin
  )
  
  if (!hasAccess) {
    redirect('/')
  }
  
  return <>{children}</>
}
```

## Auditoria

### Activity Logs
Todas as ações importantes são registradas:

```typescript
await prisma.activityLog.create({
  data: {
    action: 'updated',
    entityType: 'user',
    entityId: userId,
    details: 'Changed role from reader to author',
    performedBy: currentUserId,
  }
})
```

### Visualizar Logs
```typescript
const logs = await prisma.activityLog.findMany({
  where: {
    performedBy: userId,
    createdAt: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    }
  },
  orderBy: {
    createdAt: 'desc'
  }
})
```

## Boas Práticas

1. **Sempre verificar permissões** em API routes
2. **Não confiar apenas no client-side** para controle de acesso
3. **Registrar ações críticas** no ActivityLog
4. **Usar roles predefinidas** sempre que possível
5. **Testar permissões** antes de deploy
6. **Revisar permissions** regularmente

## Expansão Futura

### Recursos Planejados
- [ ] Interface web para criar/editar roles
- [ ] Permissões em nível de objeto (ex: editar apenas próprios webtoons)
- [ ] Hierarquia de roles
- [ ] Permissões temporárias
- [ ] Audit trail completo
- [ ] Role templates
- [ ] Bulk operations

## Troubleshooting

### Usuário não tem acesso
```typescript
// Verificar role do usuário
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { role: true }
})
console.log('User role:', user?.role?.name)

// Verificar permissões da role
const permissions = await getUserPermissions(userId)
console.log('User permissions:', permissions)
```

### Role não aparece
Certifique-se que executou o seed:
```bash
npm run db:seed
```

### Permissão negada mesmo sendo admin
Verifique se o usuário tem `roleId` apontando para a role admin:
```typescript
await prisma.user.update({
  where: { id: userId },
  data: { roleId: adminRoleId }
})
```
