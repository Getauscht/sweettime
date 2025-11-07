# Suporte a Novels (Texto)

Este documento descreve as mudanças feitas para adicionar suporte a obras do tipo "novel" (texto) ao projeto.

Principais mudanças:

- Adicionado enum `WorkType` ao `prisma/schema.prisma` com valores `WEBTOON` e `NOVEL`.
- Criado modelo `Novel` e `NovelChapter` no schema Prisma para armazenar obras textuais e capítulos em Markdown.
- Seed atualizado (`prisma/seed.ts`) para incluir exemplo de `novel` e capítulos.
- Novas rotas de API em `pages/api/novels/*` para gerenciar novels e capítulos (GET/POST/PATCH/DELETE conforme aplicável).
- Páginas básicas no frontend em `src/app/novel` (lista, detalhe, leitor) usando `react-markdown` para renderizar conteúdo de capítulos.

Notas de implementação e compatibilidade:

- As implementações existentes para `webtoons` foram mantidas inalteradas.
- Integrações avançadas (favoritos, histórico de leitura, comentários) permanecem atreladas ao modelo `Webtoon` e precisam de adaptação futura para suportar `Novel` de forma unificada.
- O design adotado foi o de rotas separadas por tipo, conforme solicitado.

Como testar localmente:

1. Configure `DATABASE_URL` no `.env` apontando para o banco de dados MySQL local.
2. Aplicar schema e seed:

```powershell
npm run db:push
npm run db:seed
```

3. Iniciar o servidor de desenvolvimento:

```powershell
npm run dev
```

4. Acesse as páginas:

- `/novel` — lista de novels
- `/novel/<slug>` — detalhe da novel
- `/novel/<slug>/chapter/<number>` — leitor de capítulo (renderiza Markdown)

Futuras melhorias:

- Unificar modelo de conteúdo (work) para suportar operações comuns entre webtoons e novels (favoritos, histórico, ratings).
- Adicionar suporte a previews ricos no painel de upload (WYSIWYG) — atualmente usa `react-markdown` para preview/reader.
- Atualizar testes e documentação de QA.
