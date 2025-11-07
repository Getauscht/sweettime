# Importação via crawler — sweetscan.org

Este documento descreve como usar o crawler fornecido para extrair metadados de obras do site sweetscan.org e importá-los na aplicação Sweettime. O foco inicial é importar obras (metadados) e capas — capítulos serão ignorados nesta fase.

Arquivos adicionados:
- `scripts/crawl-sweetscan.config.json` — configurações e seletores (edite conforme necessário).
- `scripts/crawl-sweetscan.ts` — script TypeScript que realiza o crawling e salva `tmp_sweetscan_works.json` e baixa capas em `public/uploads/cover/sweetscan/`.

Pré-requisitos
- Node.js (versão compatível com `tsx` usada no projeto)
- Dependências: `axios`, `cheerio` (instale com `npm i axios cheerio`)
- O projeto usa `tsx` para rodar scripts TypeScript diretamente (veja `package.json`).

Passos rápidos

1. Ajuste os seletores em `scripts/crawl-sweetscan.config.json` para corresponder ao HTML do sweetscan.org. Exemplo de campos:
   - `workLink`: seletor CSS para links de página de obra em páginas de listagem.
   - `title`, `author`, `description`, `genres`, `status`, `cover` etc.: seletores na página da obra.

2. Instale dependências (uma vez):

```powershell
npm install axios cheerio
```

3. Execute o crawler em modo limitado (ex: apenas 10 obras enquanto valida):

```powershell
npx tsx scripts\crawl-sweetscan.ts
```

O script criará `tmp_sweetscan_works.json` no root do projeto contendo um array de objetos com metadados e baixará capas para `public/uploads/cover/sweetscan/`.

Como integrar os dados ao banco

- Após validar o JSON, crie um pequeno script que leia `tmp_sweetscan_works.json` e para cada item:
  - Crie/ache um `Author` (por `slug`/nome) e salve no banco com Prisma.
  - Crie um `Webtoon` com `title`, `slug` (use uma função slugify), `description`, `coverImage` apontando para o caminho local (ou faça upload para storage se preferir), `status`, `views`, `likes`.
  - Vincule `WebtoonGenre` criando `Genre` quando necessário.

Sugestões e boas práticas

- Respeite `robots.txt` do site alvo e evite sobrecarregar o servidor; o script já faz um `robots.txt` preview e tem `delayMs` e `concurrency` configuráveis.
- Comece com `maxWorks` baixo para validar seletores e comportamento.
- Faça o download das capas com cuidado: normalize nomes e evite caracteres inválidos.
- Mantenha um campo `sourceUrl` no `Webtoon` ou num `ActivityLog` para poder auditar a origem dos dados.
- Se for preciso atualizar metadata periodicamente, armazene `sourceId`/`sourceSlug` do sweetscan e implemente um updater que re-crawle apenas obras modificadas.

Próximos passos
- Ajustar `scripts/crawl-sweetscan.config.json` após inspeção do HTML do sweetscan.org.
- Rodar com `maxWorks` baixo, validar JSON e imports.
- Implementar script de import para Prisma e rodar em um ambiente de staging.

Observação sobre estrutura de URLs

No sweetscan.org a estrutura de URLs segue o padrão:
- Página da obra: `/manga/obra-name`
- Página de capítulo: `/manga/obra-name/obraChapterNumName`

Por isso o `crawl-sweetscan.config.json` inclui a opção `workLinkRegex` que, por padrão, está configurada como `^/manga/[^/]+/?$` para garantir que o crawler capture apenas as páginas de obra (e não links para capítulos). Ajuste esse regex se o site usar outro padrão.

Extrair dados apenas da list page

Se você preferir (ou se o site disponibilizar dados suficientes na list page), o crawler tem modo "list-page-only". No `scripts/crawl-sweetscan.config.json` há a flag `useListPageOnly` (true/false) e um bloco `listItem` com seletores para extrair metadados diretamente das cards na página de listagem:

- `listItem.selector` — seletor do container do item na list page (por exemplo `.post-item` ou `.manga-item`).
- `listItem.link` — seletor para o link da obra dentro do item.
- `listItem.title`, `listItem.author`, `listItem.cover`, `listItem.views`, `listItem.likes` — seletores relativos ao container do item.

Por padrão o config fornecido ativa `useListPageOnly: true`. Quando esse modo está ativo, o crawler fará apenas parsing das list pages (sem visitar a página da obra) e contabilizará somente os dados extraídos das list pages — exatamente o comportamento que você indicou ser desejado.
