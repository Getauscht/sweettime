# 🚀 Guia Rápido de Setup - Painel Administrativo

## Pré-requisitos
- Node.js 20+
- MySQL/PostgreSQL configurado
- Arquivo `.env` com DATABASE_URL

## Instalação Rápida

### 1. Instalar Dependências
```bash
npm install
npm install tsx -D
```

### 2. Configurar Banco de Dados
```bash
# Gerar cliente Prisma
npm run db:generate

# Criar/atualizar schema do banco
npm run db:push

# OU rodar migração
npm run db:migrate
```

### 3. Popular Banco com Dados Iniciais
```bash
npm run db:seed
```

Isso irá criar:
- ✅ Sistema RBAC completo (4 roles, 20+ permissões)
- ✅ Usuário admin padrão
- ✅ Dados de exemplo (autores, webtoons, gêneros)

### 4. Iniciar Servidor
```bash
npm run dev
```

## Acessar o Painel

### URL
```
http://localhost:3000/admin
```

### Credenciais Padrão
```
Email: admin@storyverse.com
Senha: admin123
```

## Estrutura Criada

### ✅ Sistema RBAC
- **4 Roles Padrão**: Admin, Moderator, Author, Reader
- **20+ Permissões**: Organizadas em 7 categorias
- **Sistema Flexível**: Criar roles customizadas
- **Middleware**: Proteção automática de rotas

### ✅ Painel Administrativo
```
/admin                  → Dashboard com estatísticas
/admin/webtoons        → Gerenciamento de webtoons
/admin/authors         → Gerenciamento de autores
/admin/genres          → Gerenciamento de gêneros
/admin/users           → Gerenciamento de usuários
/admin/analytics       → Relatórios e métricas
```

### ✅ APIs Administrativas
```
GET  /api/admin/dashboard/stats  → Estatísticas gerais
GET  /api/admin/users            → Listar usuários
PATCH /api/admin/users           → Atualizar usuário
DELETE /api/admin/users          → Deletar usuário
```

## Próximos Passos

### 1. Testar o Sistema
1. Acesse `/admin` com as credenciais padrão
2. Navegue pelas diferentes seções
3. Teste criar/editar/deletar itens

### 2. Customizar Dados
Edite `prisma/seed.ts` para adicionar:
- Mais webtoons de exemplo
- Mais autores
- Mais gêneros
- Usuários de teste

### 3. Conectar com APIs Reais
Substitua os mock data nas páginas admin por chamadas reais:

```typescript
// Exemplo: src/app/admin/webtoons/page.tsx
useEffect(() => {
  fetch('/api/admin/webtoons')
    .then(res => res.json())
    .then(data => setWebtoons(data.webtoons))
}, [])
```

### 4. Implementar Features Faltantes
- [ ] Formulários de criação/edição
- [ ] Upload de imagens
- [ ] Bulk operations
- [ ] Export para CSV/PDF
- [ ] Gráficos reais (Chart.js, Recharts)
- [ ] Real-time notifications

## Segurança

### Proteger Rotas do Painel
O layout `/admin/layout.tsx` deve verificar permissões:

```typescript
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { hasAnyPermission, PERMISSIONS } from '@/lib/auth/permissions'

export default async function AdminLayout({ children }) {
  const session = await getServerSession()
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }
  
  // Verificar se tem pelo menos uma permissão admin
  const hasAccess = await hasAnyPermission(session.user.id, [
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.WEBTOONS_VIEW,
  ])
  
  if (!hasAccess) {
    redirect('/')
  }
  
  return <>{children}</>
}
```

### Proteger API Routes
Sempre use o middleware `withPermission`:

```typescript
import { withPermission } from '@/lib/auth/middleware'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { authOptions } from '@/pages/api/auth/[...nextauth]'

export const GET = withPermission(
  PERMISSIONS.USERS_VIEW,
  async (req: Request) => {
    // Sua lógica aqui
  },
  authOptions
)
```

## Comandos Úteis

```bash
# Ver banco de dados no navegador
npm run db:studio

# Reset completo do banco
npm run db:reset

# Gerar nova migração
npm run db:migrate

# Rodar seed novamente
npm run db:seed
```

## Troubleshooting

### Erro: "No session found"
1. Verifique se o NextAuth está configurado
2. Confirme que o usuário fez login
3. Verifique cookies no navegador

### Erro: "Permission denied"
```typescript
// Verificar permissões do usuário
const permissions = await getUserPermissions(userId)
console.log('Permissions:', permissions)
```

### Erro ao fazer seed
```bash
# Limpar e recriar banco
npm run db:reset
# Seed será executado automaticamente
```

### Tabelas não existem
```bash
# Forçar criação das tabelas
npm run db:push
```

## Customização

### Adicionar Nova Permissão
1. Adicione em `src/lib/auth/permissions.ts`:
```typescript
export const PERMISSIONS = {
  // ...existing
  COMMENTS_MODERATE: 'comments.moderate',
}
```

2. Atualize `DEFAULT_ROLES` se necessário
3. Execute seed novamente

### Criar Nova Role
```typescript
// Em prisma/seed.ts
const customRole = await prisma.role.create({
  data: {
    name: 'content-reviewer',
    description: 'Reviews content before publication',
    isSystem: false,
  }
})

// Atribuir permissões
// ...
```

### Adicionar Nova Página Admin
```typescript
// src/app/admin/my-page/page.tsx
export default function MyAdminPage() {
  return (
    <div>
      <h1>My Custom Page</h1>
    </div>
  )
}
```

Adicione no navigation do layout:
```typescript
const navigation = [
  // ...existing
  { name: 'My Page', href: '/admin/my-page', icon: Settings },
]
```

## Recursos

- **Documentação RBAC**: `docs/RBAC_GUIDE.md`
- **Documentação Reader**: `docs/READER_GUIDE.md`
- **Schema Prisma**: `prisma/schema.prisma`
- **Seed Script**: `prisma/seed.ts`

## Suporte

Para dúvidas ou problemas:
1. Verifique a documentação em `/docs`
2. Inspecione os logs no console
3. Use `npm run db:studio` para verificar dados
4. Revise o código em `src/lib/auth/`

---

✅ **Sistema pronto para uso!** Comece explorando o painel administrativo.
