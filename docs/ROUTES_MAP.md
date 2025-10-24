# Mapa Completo de Rotas e APIs - SweetTime

## 📄 Páginas Públicas

| Rota | Descrição | Requer Auth |
|------|-----------|-------------|
| `/` | Homepage com carrosséis e destaques | ❌ |
| `/browse` | Explorar webtoons | ❌ |
| `/webtoon/[slug]` | Página de detalhes do webtoon | ❌ |
| `/webtoon/[slug]/chapter/[number]` | Leitura de capítulo | ❌ |
| `/genres` | Lista de gêneros | ❌ |
| `/search` | Busca de webtoons | ❌ |
| `/library` | Biblioteca pessoal (parcial sem auth) | Parcial ✅ |

## 🔐 Páginas de Autenticação

| Rota | Descrição |
|------|-----------|
| `/auth/login` | Login com email/password, Google, GitHub |
| `/auth/register` | Registro de novo usuário |
| `/auth/forgot-password` | Solicitar reset de senha |
| `/auth/reset-password` | Redefinir senha com token |
| `/auth/totp-setup` | Configurar 2FA |
| `/auth/error` | Página de erro de autenticação |

## 👤 Páginas de Usuário

| Rota | Descrição | Requer Auth |
|------|-----------|-------------|
| `/profile` | Perfil do usuário com edição | ✅ |
| `/dashboard` | Dashboard do usuário | ✅ |

## ✍️ Creator Studio

| Rota | Descrição | Requer Permissão |
|------|-----------|------------------|
| `/creator` | Dashboard do criador | `content.create` |
| `/creator/series` | Minhas séries | `content.create` |
| `/creator/series/new` | Criar nova série | `content.create` |
| `/creator/series/[id]/edit` | Editar série | `content.update` |
| `/creator/analytics` | Analytics das obras | `content.view` |
| `/creator/community` | Comunidade/comentários | `content.view` |
| `/creator/settings` | Configurações de criador | `content.create` |

## 🛡️ Admin Panel

| Rota | Descrição | Requer Permissão |
|------|-----------|------------------|
| `/admin` | Dashboard administrativo | `admin.access` |
| `/admin/users` | Gerenciar usuários | `users.manage` |
| `/admin/roles` | Gerenciar roles | `roles.manage` |
| `/admin/webtoons` | Gerenciar webtoons | `content.manage` |
| `/admin/authors` | Gerenciar autores | `content.manage` |
| `/admin/genres` | Gerenciar gêneros | `content.manage` |
| `/admin/analytics` | Analytics gerais | `analytics.view` |

---

## 🔌 APIs de Autenticação

### NextAuth
| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/[...nextauth]` | ALL | NextAuth handlers (signin, signout, callback, etc) |
| `/api/auth/register` | POST | Registro de usuário |
| `/api/auth/forgot-password` | POST | Solicitar reset de senha |
| `/api/auth/reset-password` | POST | Redefinir senha |
| `/api/auth/has-totp` | POST | Verificar se usuário tem 2FA |
| `/api/auth/totp` | POST | Gerar QR Code para 2FA |
| `/api/auth/verify-totp` | POST | Verificar código 2FA |

---

## 📚 APIs de Conteúdo (Webtoons)

### Webtoons
| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/api/webtoons/featured` | GET | Top webtoons em destaque | ❌ |
| `/api/webtoons/recent` | GET | Webtoons atualizados recentemente | ❌ |
| `/api/webtoons/by-genre` | GET | Webtoons por gênero | ❌ |
| `/api/webtoons/[slug]` | GET | Detalhes completos de um webtoon | ❌ |
| `/api/webtoons/[webtoonId]/favorite` | GET | Verifica se favoritou | Parcial ✅ |
| `/api/webtoons/[webtoonId]/favorite` | POST | Adiciona aos favoritos | ✅ |
| `/api/webtoons/[webtoonId]/favorite` | DELETE | Remove dos favoritos | ✅ |
| `/api/webtoons/[webtoonId]/chapters/[chapterId]` | GET | Dados do capítulo | ❌ |

### Gêneros
| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/api/genres` | GET | Lista todos os gêneros | ❌ |

---

## 👥 APIs de Usuário

### Perfil
| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/api/user/profile` | GET | Dados do perfil | ✅ |
| `/api/user/profile` | PATCH | Atualizar perfil | ✅ |

### Busca
| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/api/users/search` | GET | Buscar usuários (para menções) | ❌ |

---

## ❤️ APIs de Interação

### Favoritos
| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/api/favorites` | GET | Lista todos os favoritos do usuário | ✅ |

### Follows
| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/api/following` | GET | Lista autores seguidos | ✅ |
| `/api/authors/[authorId]/follow` | GET | Verifica se segue autor | Parcial ✅ |
| `/api/authors/[authorId]/follow` | POST | Seguir autor | ✅ |
| `/api/authors/[authorId]/follow` | DELETE | Parar de seguir | ✅ |

### Histórico de Leitura
| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/api/reading-history` | GET | Lista histórico de leitura | Parcial ✅* |
| `/api/reading-history` | POST | Atualiza progresso de leitura | Parcial ✅* |

*Funciona com `sessionId` para usuários anônimos

### Comentários
| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/api/comments` | GET | Lista comentários (filtro por webtoonId ou chapterId) | ❌ |
| `/api/comments` | POST | Criar comentário (com menções) | ✅ |

---

## 🔔 APIs de Notificações

| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/api/notifications` | GET | Lista notificações do usuário | ✅ |
| `/api/notifications` | PATCH | Marcar como lidas | ✅ |
| `/api/notifications` | DELETE | Deletar notificações | ✅ |

---

## 🛠️ APIs Creator

### Webtoons
| Endpoint | Método | Descrição | Permissão |
|----------|--------|-----------|-----------|
| `/api/creator/webtoons` | GET | Lista webtoons do criador | `content.view` |
| `/api/creator/webtoons` | POST | Criar novo webtoon | `content.create` |
| `/api/creator/webtoons/[id]` | GET | Detalhes do webtoon | `content.view` |
| `/api/creator/webtoons/[id]` | PATCH | Atualizar webtoon | `content.update` |
| `/api/creator/webtoons/[id]` | DELETE | Deletar webtoon | `content.delete` |

### Capítulos
| Endpoint | Método | Descrição | Permissão |
|----------|--------|-----------|-----------|
| `/api/creator/webtoons/[webtoonId]/chapters` | GET | Lista capítulos | `content.view` |
| `/api/creator/webtoons/[webtoonId]/chapters` | POST | Criar capítulo | `content.create` |
| `/api/creator/webtoons/[webtoonId]/chapters/[id]` | GET | Detalhes do capítulo | `content.view` |
| `/api/creator/webtoons/[webtoonId]/chapters/[id]` | PATCH | Atualizar capítulo | `content.update` |
| `/api/creator/webtoons/[webtoonId]/chapters/[id]` | DELETE | Deletar capítulo | `content.delete` |

---

## 🛡️ APIs Admin

### Dashboard
| Endpoint | Método | Descrição | Permissão |
|----------|--------|-----------|-----------|
| `/api/admin/dashboard/stats` | GET | Estatísticas gerais | `admin.access` |

### Usuários
| Endpoint | Método | Descrição | Permissão |
|----------|--------|-----------|-----------|
| `/api/admin/users` | GET | Lista usuários | `users.manage` |
| `/api/admin/users` | POST | Criar usuário | `users.manage` |
| `/api/admin/users/[id]` | GET | Detalhes do usuário | `users.view` |
| `/api/admin/users/[id]` | PATCH | Atualizar usuário | `users.manage` |
| `/api/admin/users/[id]` | DELETE | Deletar usuário | `users.manage` |
| `/api/admin/seed-admin` | POST | Criar usuário admin | ❌ (pública) |

### Roles
| Endpoint | Método | Descrição | Permissão |
|----------|--------|-----------|-----------|
| `/api/admin/roles` | GET | Lista roles | `roles.view` |
| `/api/admin/roles` | POST | Criar role | `roles.manage` |
| `/api/admin/roles/[id]` | GET | Detalhes da role | `roles.view` |
| `/api/admin/roles/[id]` | PATCH | Atualizar role | `roles.manage` |
| `/api/admin/roles/[id]` | DELETE | Deletar role | `roles.manage` |

### Permissões
| Endpoint | Método | Descrição | Permissão |
|----------|--------|-----------|-----------|
| `/api/admin/permissions` | GET | Lista permissões | `roles.view` |
| `/api/admin/permissions/[roleId]` | GET | Permissões de uma role | `roles.view` |
| `/api/admin/permissions/[roleId]` | POST | Adicionar permissão | `roles.manage` |
| `/api/admin/permissions/[roleId]` | DELETE | Remover permissão | `roles.manage` |

### Webtoons
| Endpoint | Método | Descrição | Permissão |
|----------|--------|-----------|-----------|
| `/api/admin/webtoons` | GET | Lista todos webtoons | `content.view` |
| `/api/admin/webtoons` | POST | Criar webtoon | `content.manage` |
| `/api/admin/webtoons/[id]` | GET | Detalhes do webtoon | `content.view` |
| `/api/admin/webtoons/[id]` | PATCH | Atualizar webtoon | `content.manage` |
| `/api/admin/webtoons/[id]` | DELETE | Deletar webtoon | `content.manage` |

### Autores
| Endpoint | Método | Descrição | Permissão |
|----------|--------|-----------|-----------|
| `/api/admin/authors` | GET | Lista autores | `content.view` |
| `/api/admin/authors` | POST | Criar autor | `content.manage` |
| `/api/admin/authors/[id]` | GET | Detalhes do autor | `content.view` |
| `/api/admin/authors/[id]` | PATCH | Atualizar autor | `content.manage` |
| `/api/admin/authors/[id]` | DELETE | Deletar autor | `content.manage` |

### Gêneros
| Endpoint | Método | Descrição | Permissão |
|----------|--------|-----------|-----------|
| `/api/admin/genres` | GET | Lista gêneros | `content.view` |
| `/api/admin/genres` | POST | Criar gênero | `content.manage` |
| `/api/admin/genres/[id]` | GET | Detalhes do gênero | `content.view` |
| `/api/admin/genres/[id]` | PATCH | Atualizar gênero | `content.manage` |
| `/api/admin/genres/[id]` | DELETE | Deletar gênero | `content.manage` |

### Capítulos
| Endpoint | Método | Descrição | Permissão |
|----------|--------|-----------|-----------|
| `/api/admin/chapters` | GET | Lista capítulos | `content.view` |
| `/api/admin/chapters` | POST | Criar capítulo | `content.manage` |
| `/api/admin/chapters/[id]` | GET | Detalhes do capítulo | `content.view` |
| `/api/admin/chapters/[id]` | PATCH | Atualizar capítulo | `content.manage` |
| `/api/admin/chapters/[id]` | DELETE | Deletar capítulo | `content.manage` |

---

## 📤 APIs de Upload

| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/api/upload` | POST | Upload de imagens (capa, avatar, etc) | ✅ |

---

## 🔑 Sistema de Permissões

### Categorias de Permissões

**Admin:**
- `admin.access` - Acesso ao painel admin

**Usuários:**
- `users.view` - Ver usuários
- `users.manage` - Gerenciar usuários (criar, editar, deletar)

**Roles:**
- `roles.view` - Ver roles
- `roles.manage` - Gerenciar roles e permissões

**Conteúdo:**
- `content.view` - Ver conteúdo
- `content.create` - Criar conteúdo (webtoons, capítulos)
- `content.update` - Editar conteúdo próprio
- `content.delete` - Deletar conteúdo próprio
- `content.manage` - Gerenciar todo conteúdo (admin)

**Analytics:**
- `analytics.view` - Ver analytics

**Moderação:**
- `moderation.comments` - Moderar comentários
- `moderation.reports` - Ver reports
- `moderation.users` - Moderar usuários (ban, suspend)

---

## 📊 Modelos do Banco de Dados

### Autenticação & Usuários
- `User` - Dados do usuário
- `Account` - Contas OAuth (Google, GitHub)
- `Session` - Sessões ativas
- `PasswordReset` - Tokens de reset de senha

### RBAC
- `Role` - Papéis (Admin, Creator, User)
- `Permission` - Permissões individuais
- `RolePermission` - Relação many-to-many

### Conteúdo
- `Webtoon` - Obra/série
- `Author` - Autor da obra
- `Genre` - Gênero
- `WebtoonGenre` - Relação many-to-many
- `Chapter` - Capítulo

### Interação
- `Favorite` - Favoritos do usuário
- `Follow` - Follows em autores
- `ReadingHistory` - Histórico de leitura
- `Comment` - Comentários
- `CommentMention` - Menções em comentários

### Sistema
- `Notification` - Notificações
- `ActivityLog` - Log de atividades

---

## 🎨 Tema & Design System

### Cores Principais
- Background primário: `#0f0b14`
- Background secundário: `#1a1625`
- Accent roxo: `purple-600`
- Accent rosa: `pink-500`
- Texto: `gray-100`, `gray-300`, `gray-400`

### Componentes UI
- `Button` - Botão com variantes
- `Input` - Campo de texto
- `Textarea` - Área de texto
- `Label` - Label para formulários
- `Avatar` - Avatar do usuário
- `Dialog` - Modal
- `Alert` - Alertas
- `MentionInput` - Input com autocomplete de menções
- `NotificationBell` - Sino de notificações

---

## 🚀 Fluxos Principais

### Leitura de Webtoon
1. Homepage → Clicar em webtoon
2. Página de detalhes → Ver informações, capítulos
3. Clicar em capítulo → Leitura com markdown
4. Histórico salvo automaticamente
5. Navegação prev/next

### Interação com Conteúdo
1. Favoritar webtoon → Salvo em favoritos
2. Seguir autor → Recebe notificações de novos capítulos
3. Comentar → Pode mencionar usuários com @
4. Mencionado → Recebe notificação

### Criação de Conteúdo
1. Creator Studio → Criar série
2. Upload de capa
3. Criar capítulos com markdown
4. Publicar
5. Acompanhar analytics

### Administração
1. Admin Panel → Ver dashboard
2. Gerenciar usuários, roles, conteúdo
3. Moderar comentários
4. Ver analytics gerais

---

## 📱 Responsividade

Todas as páginas são totalmente responsivas:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

Grid adapta-se automaticamente:
- Mobile: 1 coluna
- Tablet: 2 colunas
- Desktop: 3-4 colunas

---

Esta documentação cobre 100% das rotas e APIs implementadas no projeto SweetTime. ✨
