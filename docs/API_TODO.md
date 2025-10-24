# 📋 APIs Pendentes - Implementação Futura

Este documento lista as APIs administrativas que precisam ser implementadas para completar o sistema.

## Webtoons Management

### GET /api/admin/webtoons
```typescript
// Listar todos os webtoons com filtros
Query params:
- page, limit (paginação)
- status (ongoing, completed, hiatus, cancelled)
- authorId (filtrar por autor)
- genreId (filtrar por gênero)
- search (buscar por título)
- sortBy (views, likes, rating, createdAt)
- sortOrder (asc, desc)

Response: {
  webtoons: Webtoon[],
  pagination: { page, limit, total, totalPages }
}
```

### POST /api/admin/webtoons
```typescript
// Criar novo webtoon
Body: {
  title: string
  slug: string
  description: string
  authorId: string
  genreIds: string[]
  coverImage?: string
  status: 'ongoing' | 'completed' | 'hiatus'
}

Response: { webtoon: Webtoon }
```

### PATCH /api/admin/webtoons
```typescript
// Atualizar webtoon
Body: {
  webtoonId: string
  ...updates
}

Response: { webtoon: Webtoon }
```

### DELETE /api/admin/webtoons
```typescript
// Deletar webtoon
Query: ?webtoonId=xxx

Response: { success: boolean }
```

---

## Authors Management

### GET /api/admin/authors
```typescript
// Listar autores
Query params:
- page, limit
- search (nome)
- sortBy (name, webtoonCount, createdAt)

Response: {
  authors: Author[],
  pagination: { ... }
}
```

### POST /api/admin/authors
```typescript
// Criar autor
Body: {
  name: string
  slug: string
  bio?: string
  avatar?: string
  socialLinks?: object
}

Response: { author: Author }
```

### PATCH /api/admin/authors
```typescript
// Atualizar autor
Body: {
  authorId: string
  ...updates
}
```

### DELETE /api/admin/authors
```typescript
// Deletar autor
Query: ?authorId=xxx
```

---

## Genres Management

### GET /api/admin/genres
```typescript
// Listar gêneros
Response: {
  genres: Genre[]
}
```

### POST /api/admin/genres
```typescript
// Criar gênero
Body: {
  name: string
  slug: string
  description?: string
}

Response: { genre: Genre }
```

### PATCH /api/admin/genres
```typescript
// Atualizar gênero
Body: {
  genreId: string
  ...updates
}
```

### DELETE /api/admin/genres
```typescript
// Deletar gênero
Query: ?genreId=xxx
```

---

## Roles & Permissions Management

### GET /api/admin/roles
```typescript
// Listar todas as roles
Response: {
  roles: Role[]
}
```

### POST /api/admin/roles
```typescript
// Criar role customizada
Body: {
  name: string
  description: string
  permissions: string[] // array de permission names
}

Permissions required: ROLES_CREATE

Response: { role: Role }
```

### PATCH /api/admin/roles
```typescript
// Atualizar role
Body: {
  roleId: string
  name?: string
  description?: string
  permissions?: string[]
}

Permissions required: ROLES_EDIT
```

### DELETE /api/admin/roles
```typescript
// Deletar role (apenas custom roles)
Query: ?roleId=xxx

Permissions required: ROLES_DELETE

Note: Roles com isSystem=true não podem ser deletadas
```

### GET /api/admin/permissions
```typescript
// Listar todas as permissões disponíveis
Response: {
  permissions: Permission[],
  grouped: {
    webtoons: Permission[],
    authors: Permission[],
    users: Permission[],
    // ...
  }
}
```

---

## Analytics & Reporting

### GET /api/admin/analytics/overview
```typescript
// Métricas gerais
Query params:
- startDate, endDate (período)

Response: {
  totalViews: number
  totalUsers: number
  activeUsers: number
  newUsers: number
  popularWebtoons: Webtoon[]
  growthRate: number
}
```

### GET /api/admin/analytics/webtoons
```typescript
// Analytics de webtoons
Query: ?webtoonId=xxx&period=7d|30d|90d

Response: {
  views: { date: string, count: number }[]
  likes: { date: string, count: number }[]
  chapters: { number: number, views: number }[]
  demographics: object
}
```

### GET /api/admin/analytics/users
```typescript
// Analytics de usuários
Response: {
  registrations: { date: string, count: number }[]
  activeByRole: { role: string, count: number }[]
  retention: object
}
```

### GET /api/admin/analytics/export
```typescript
// Exportar relatório
Query: ?format=csv|pdf&type=users|webtoons|overview

Permissions required: ANALYTICS_EXPORT

Response: File download
```

---

## Activity Logs

### GET /api/admin/logs
```typescript
// Buscar logs de atividade
Query params:
- page, limit
- entityType (webtoon, user, author, genre)
- action (created, updated, deleted)
- performedBy (userId)
- startDate, endDate

Permissions required: SYSTEM_LOGS

Response: {
  logs: ActivityLog[],
  pagination: { ... }
}
```

---

## User Role Assignment

### PATCH /api/admin/users/role
```typescript
// Atribuir role a usuário
Body: {
  userId: string
  roleId: string
}

Permissions required: USERS_MANAGE_ROLES

Response: { user: User }
```

---

## Chapters Management

### GET /api/admin/chapters
```typescript
// Listar capítulos de um webtoon
Query: ?webtoonId=xxx

Response: {
  chapters: Chapter[]
}
```

### POST /api/admin/chapters
```typescript
// Criar novo capítulo
Body: {
  webtoonId: string
  number: number
  title: string
  content: any[] // array de URLs de imagens
}

Response: { chapter: Chapter }
```

### PATCH /api/admin/chapters
```typescript
// Atualizar capítulo
Body: {
  chapterId: string
  ...updates
}
```

### DELETE /api/admin/chapters
```typescript
// Deletar capítulo
Query: ?chapterId=xxx
```

---

## Bulk Operations

### POST /api/admin/bulk/delete-users
```typescript
// Deletar múltiplos usuários
Body: {
  userIds: string[]
}

Permissions required: USERS_DELETE
```

### POST /api/admin/bulk/suspend-users
```typescript
// Suspender múltiplos usuários
Body: {
  userIds: string[]
}

Permissions required: USERS_SUSPEND
```

### PATCH /api/admin/bulk/update-webtoons
```typescript
// Atualizar múltiplos webtoons
Body: {
  webtoonIds: string[]
  updates: object
}

Permissions required: WEBTOONS_EDIT
```

---

## File Upload

### POST /api/admin/upload
```typescript
// Upload de imagem/arquivo
FormData: {
  file: File
  type: 'cover' | 'avatar' | 'chapter'
}

Response: {
  url: string
  path: string
}
```

---

## System Settings

### GET /api/admin/settings
```typescript
// Obter configurações do sistema
Permissions required: SYSTEM_SETTINGS

Response: {
  settings: object
}
```

### PATCH /api/admin/settings
```typescript
// Atualizar configurações
Body: {
  ...settings
}

Permissions required: SYSTEM_SETTINGS
```

---

## Implementação Template

Todas as APIs devem seguir este padrão:

```typescript
// pages/api/admin/[resource]/index.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/auth/middleware'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { PERMISSIONS } from '@/lib/auth/permissions'

export const GET = withPermission(
  PERMISSIONS.RESOURCE_VIEW,
  async (req: Request, { userId }) => {
    try {
      const { searchParams } = new URL(req.url)
      
      // Parsing de parâmetros
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '10')
      
      // Query do banco
      const [items, total] = await Promise.all([
        prisma.resource.findMany({
          skip: (page - 1) * limit,
          take: limit,
          // ... filters
        }),
        prisma.resource.count(),
      ])
      
      // Logging de atividade
      await prisma.activityLog.create({
        data: {
          action: 'viewed',
          entityType: 'resource',
          performedBy: userId,
        }
      })
      
      return NextResponse.json({
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error('Error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  authOptions
)

export const POST = withPermission(
  PERMISSIONS.RESOURCE_CREATE,
  async (req: Request, { userId }) => {
    try {
      const body = await req.json()
      
      // Validação
      if (!body.requiredField) {
        return NextResponse.json(
          { error: 'Missing required field' },
          { status: 400 }
        )
      }
      
      // Criação
      const item = await prisma.resource.create({
        data: body,
      })
      
      // Log
      await prisma.activityLog.create({
        data: {
          action: 'created',
          entityType: 'resource',
          entityId: item.id,
          performedBy: userId,
        }
      })
      
      return NextResponse.json({ item })
    } catch (error) {
      console.error('Error:', error)
      return NextResponse.json(
        { error: 'Failed to create' },
        { status: 500 }
      )
    }
  },
  authOptions
)
```

---

## Prioridades de Implementação

### Alta Prioridade
1. ✅ User Management (GET, PATCH, DELETE)
2. ✅ Dashboard Stats (GET)
3. 🔲 Webtoons Management (GET, POST, PATCH, DELETE)
4. 🔲 Authors Management (GET, POST, PATCH, DELETE)
5. 🔲 Genres Management (GET, POST, PATCH, DELETE)

### Média Prioridade
6. 🔲 Chapters Management
7. 🔲 Roles & Permissions Management
8. 🔲 Analytics APIs
9. 🔲 Activity Logs
10. 🔲 File Upload

### Baixa Prioridade
11. 🔲 Bulk Operations
12. 🔲 System Settings
13. 🔲 Export Features

---

## Testando APIs

Use ferramentas como:
- **Thunder Client** (VS Code extension)
- **Postman**
- **Insomnia**
- **curl**

Exemplo com curl:
```bash
# Login primeiro para obter session
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@storyverse.com","password":"admin123"}'

# Depois fazer request com cookie de sessão
curl http://localhost:3000/api/admin/users \
  -H "Cookie: next-auth.session-token=xxx"
```
