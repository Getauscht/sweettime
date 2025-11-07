# Unificação de Rotas Webtoons e Novels

## Resumo

Este documento descreve a implementação da unificação das rotas de webtoons e novels em uma única estrutura de rotas `/obra`.

## Mudanças Implementadas

### 1. Novas Rotas de API (`pages/api/obra/`)

#### Endpoints Principais

- **`/api/obra`** - Listagem e criação de obras
  - GET: Lista obras (webtoons e novels)
  - POST: Cria nova obra (requer campo `type: 'webtoon' | 'novel'`)
  - Validação: Verifica unicidade de slug globalmente entre webtoons e novels

- **`/api/obra/[workId]`** - Operações com obra individual
  - GET: Obtém detalhes da obra por slug ou ID
  - PATCH: Atualiza obra
  - DELETE: Remove obra
  - Detecção automática de tipo (tenta webtoon primeiro, depois novel)

- **`/api/obra/[workId]/chapters`** - Gerenciamento de capítulos
  - GET: Lista capítulos da obra
  - POST: Cria novo capítulo
  - Suporta conteúdo de webtoon (painéis) e novel (markdown)

- **`/api/obra/[workId]/chapters/[chapterId]`** - Operações com capítulo individual
  - GET: Obtém detalhes do capítulo
  - PATCH: Atualiza capítulo
  - DELETE: Remove capítulo

#### Endpoints de Descoberta

- **`/api/obra/featured`** - Obras em destaque
  - Combina webtoons e novels mais populares
  - Ordena por rating (webtoons) e views

- **`/api/obra/recent`** - Obras atualizadas recentemente
  - Combina webtoons e novels por data de atualização
  - Inclui número do último capítulo

- **`/api/obra/by-genre`** - Obras por gênero
  - Atualmente apenas webtoons (novels não têm gêneros no schema)
  - Ordena por views

### 2. Novas Páginas de UI (`src/app/obra/`)

#### Páginas Criadas

- **`src/app/obra/[slug]/page.tsx`** - Página de detalhes da obra
  - Renderização condicional baseada no campo `type`
  - Sistema de avaliação apenas para webtoons
  - Botões de favoritar e seguir autor
  - Lista de capítulos

- **`src/app/obra/[slug]/chapter/[number]/page.tsx`** - Leitor de capítulo
  - Suporta painéis de imagem (webtoons)
  - Suporta markdown (novels)
  - Navegação entre capítulos
  - Histórico de leitura

### 3. Componentes Atualizados

#### Alterações em Componentes

- **`src/components/SearchBar.tsx`** - Atualizado para `/obra/${slug}`
- **`src/components/AuthorWebtoonsList.tsx`** - Atualizado para `/obra/${slug}`
- **`src/components/NovelActions.tsx`** - Mantido com APIs antigas (favoritos)
- **`src/app/page.tsx`** - Atualizado para usar APIs unificadas
  - `/api/obra/featured`
  - `/api/obra/recent`
  - `/api/obra/by-genre`
- **`src/app/search/page.tsx`** - Atualizado para `/obra/${slug}` e `/api/obra/featured`
- **`src/app/library/page.tsx`** - Atualizado para `/obra/${slug}`
- **`src/app/admin/webtoons/page.tsx`** - Atualizado para `/obra/${slug}`
- **`src/app/painel/groups/[id]/page.tsx`** - Atualizado para `/obra/${slug}`
- **`src/app/groups/[id]/page.tsx`** - Atualizado para `/obra/${slug}`

### 4. Estrutura Removida

#### Pastas Deletadas

- `src/app/webtoon/` - Substituída por `src/app/obra/`
- `src/app/novel/` - Substituída por `src/app/obra/`

#### APIs Mantidas (para compatibilidade)

- `pages/api/webtoons/` - Mantida para painel de edição e favoritos
- `pages/api/novels/` - Mantida para favoritos

## Características Técnicas

### Detecção de Tipo

A API `/api/obra/[workId]` detecta automaticamente o tipo da obra:
1. Tenta buscar como webtoon usando slug/ID
2. Se não encontrar, tenta buscar como novel
3. Retorna erro 404 se não encontrar em nenhum

### Resposta Normalizada

Todas as APIs retornam um campo `type` na resposta:
```json
{
  "id": "...",
  "title": "...",
  "slug": "...",
  "type": "webtoon",  // ou "novel"
  "authors": [...],
  "genres": [...],
  "totalChapters": 10,
  ...
}
```

### Validação de Slug Único

A criação de obras valida globalmente:
```typescript
const [existingWebtoon, existingNovel] = await Promise.all([
  prisma.webtoon.findUnique({ where: { slug } }),
  prisma.novel.findUnique({ where: { slug } })
])
if (existingWebtoon || existingNovel) {
  return res.status(409).json({ error: 'Slug already exists' })
}
```

### Conteúdo de Capítulo

- **Webtoons**: Array de painéis (imagens)
- **Novels**: String (markdown) ou objeto EditorJS

## Compatibilidade

### APIs Mantidas

As seguintes APIs antigas foram mantidas para compatibilidade:
- `/api/webtoons/${id}/favorite` - Favoritar webtoon
- `/api/novels/${id}/favorite` - Favoritar novel
- `/api/webtoons/${id}/rating` - Avaliar webtoon
- `/api/webtoons/${id}` - Usado no painel de edição

### Migrações Necessárias

Nenhuma migração de banco de dados foi necessária. As tabelas `Webtoon`, `Chapter`, `Novel` e `NovelChapter` permanecem separadas.

## Próximos Passos

### ✅ Melhorias Implementadas

1. **✅ APIs de Favoritos Unificadas**
   - Criado `/api/obra/[workId]/favorite`
   - Detecção automática de tipo (webtoon ou novel)
   - Compatível com slug ou ID

2. **✅ Gêneros para Novels**
   - Criada tabela `NovelGenre` no schema
   - Criada tabela `NovelCredit` para autores de novels
   - Atualizado `/api/obra/by-genre` para incluir novels
   - Novels agora aparecem em buscas por gênero

3. **✅ Histórico de Leitura com Campos Unificados**
   - Adicionados campos `workId` e `workType` ao `ReadingHistory`
   - API suporta formato unificado e formato legado
   - Mantém compatibilidade retroativa

### Detalhes Técnicos das Melhorias

#### 1. API de Favoritos Unificada

**Endpoint:** `/api/obra/[workId]/favorite`

**Métodos:**
- `GET` - Verifica se obra está favoritada
- `POST` - Adiciona aos favoritos
- `DELETE` - Remove dos favoritos

**Resposta:**
```json
{
  "isFavorited": true,
  "type": "webtoon"  // ou "novel"
}
```

**Implementação:**
1. Detecta tipo da obra (busca webtoon primeiro, depois novel)
2. Opera na tabela `Favorite` com campo apropriado (`webtoonId` ou `novelId`)
3. Aceita slug ou ID como `workId`

#### 2. Schema de Gêneros para Novels

**Novas Tabelas:**

```prisma
model NovelGenre {
  id        String   @id @default(cuid())
  novelId   String
  genreId   String
  createdAt DateTime @default(now())

  novel Novel @relation(fields: [novelId], references: [id], onDelete: Cascade)
  genre Genre @relation(fields: [genreId], references: [id], onDelete: Cascade)

  @@unique([novelId, genreId])
}

model NovelCredit {
  id       String @id @default(cuid())
  novelId  String
  authorId String
  role     String // AUTHOR, EDITOR

  novel  Novel  @relation(fields: [novelId], references: [id], onDelete: Cascade)
  author Author @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@unique([novelId, authorId, role])
}
```

**Modificações em `Genre`:**
- Adicionado campo `novels NovelGenre[]`
- Agora suporta webtoons e novels

**API `/api/obra/by-genre` atualizada:**
- Busca webtoons E novels com o gênero especificado
- Combina e ordena por views
- Retorna campo `type` para cada obra

#### 3. Histórico de Leitura Unificado

**Campos Adicionados ao `ReadingHistory`:**
```prisma
model ReadingHistory {
  // Novos campos unificados
  workId     String?    // webtoonId ou novelId
  workType   WorkType?  // WEBTOON ou NOVEL
  
  // Campos legados mantidos
  webtoonId  String?
  chapterId  String?
  novelId    String?
  novelChapterId String?
  
  // ... outros campos
}
```

**API `/api/reading-history` atualizada:**

Suporta dois formatos de requisição:

**Formato Unificado (Novo):**
```json
{
  "workId": "webtoon-slug",
  "workType": "WEBTOON",
  "chapterNumber": 5,
  "progress": 75
}
```

**Formato Legado (Mantido):**
```json
{
  "webtoonId": "webtoon-id",
  "chapterId": "chapter-id",
  "progress": 75
}
```

A API detecta qual formato está sendo usado e processa adequadamente.

### Componentes Atualizados

- **`src/app/obra/[slug]/page.tsx`**
  - Usa `/api/obra/${slug}/favorite` ao invés de endpoints separados
  - Simplifica lógica de favoritos

### Melhorias Futuras Sugeridas

1. **Migração de Dados Legados**
   - Script para popular `workId` e `workType` em registros antigos de `ReadingHistory`
   - Após migração, remover campos legados

2. **Rating para Novels**
   - Criar tabela `NovelRating` similar a `WebtoonRating`
   - Atualizar página de obra para mostrar rating de novels

3. **Busca Unificada Melhorada**
   - API `/api/search` que busca em webtoons E novels
   - Filtros por tipo de obra

4. **Analytics Unificados**
   - Dashboard de admin mostrando estatísticas de webtoons e novels juntos

## Verificação

### TypeScript

✅ Compilação TypeScript: Sem erros
```bash
npm run typecheck
```

### Banco de Dados

✅ Schema aplicado com sucesso
```bash
npm run db:push
```

### Estrutura de Tabelas

✅ Novas tabelas criadas:
- `NovelGenre` - Relacionamento entre novels e gêneros
- `NovelCredit` - Créditos de autores para novels

✅ Campos adicionados:
- `ReadingHistory.workId` - ID unificado da obra
- `ReadingHistory.workType` - Tipo da obra (enum)

### Manual Testing

Teste os seguintes cenários:
1. Acessar `/obra/[slug-webtoon]` - deve carregar página de webtoon
2. Acessar `/obra/[slug-novel]` - deve carregar página de novel
3. Abrir capítulo de webtoon - deve renderizar painéis de imagem
4. Abrir capítulo de novel - deve renderizar markdown
5. Criar nova obra via API - deve validar slug único
6. Buscar obras - deve retornar webtoons e novels
7. Favoritar obra - deve funcionar (usando APIs antigas)

## Notas

- As pastas antigas `src/app/webtoon` e `src/app/novel` foram removidas
- As rotas antigas não foram redirecionadas - links antigos darão 404
- O painel de edição de webtoons (`src/app/painel/groups/webtoons`) continua usando `/api/webtoons` diretamente
- A página de obra unificada (`src/app/obra/[slug]/page.tsx`) usa `/api/webtoons` e `/api/novels` para favoritos e avaliações
