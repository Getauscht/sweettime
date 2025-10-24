# AGENTS.md

Este arquivo fornece orientações para agentes ao trabalharem com o código deste repositório.

- O desenvolvimento usa Turbopack: execute [`npm run dev`](package.json:6) => executa `next dev --turbopack` (não é o dev padrão do Next).
- O seed do banco usa tsx: [`npm run db:seed`](package.json:15) executa `tsx prisma/seed.ts`. O Prisma também tem `"prisma"."seed"` configurado (veja [`package.json`](package.json:18)).
- Não há runner de testes automatizados configurado no repositório — siga os passos manuais em [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md:1) para validar funcionalidades ou adicione um framework de testes antes de escrever testes.
- Alias de caminho: importar de `@/...` é obrigatório (veja [`tsconfig.json`](tsconfig.json:21)). Prefira imports por alias ao invés de caminhos relativos profundos.
- App Router E API de pages coexistem: rotas de UI estão em [`src/app`](src/app:1) e APIs de servidor em [`pages/api`](pages/api:1). Edite código de API em `pages/api/*`.
- O histórico de leitura anônimo usa um sessionId armazenado no localStorage e muitas APIs aceitam o parâmetro sessionId na query (veja [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md:85,219)). Preserve esse comportamento ao alterar a lógica de histórico.
- A busca de menções exige 2+ caracteres; tanto UX quanto backend esperam esse limite (veja [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md:108,266)).
- Payload de markdown de capítulo: o backend aceita string simples OU JSON no formato `{ "markdown": "..." }` — não seguir isso quebra a renderização (veja [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md:258)).
- Workflow do Prisma: migrações ficam em [`prisma/migrations`](prisma/migrations:1). Para prototipagem rápida, o guia usa `npm run db:push` (veja [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md:12)); use `prisma migrate dev` para migrações adequadas (veja [`package.json`](package.json:12,13)).
- ESLint é programático (`eslint.config.mjs`) usando FlatCompat e estende configs do Next — execute via [`npm run lint`](package.json:9) (veja [`eslint.config.mjs`](eslint.config.mjs:12)).
- TypeScript roda em modo estrito (`tsconfig.json`) — evite `any`; use [`npm run typecheck`](package.json:10) quando estiver em dúvida (veja [`tsconfig.json`](tsconfig.json:7)).
- Classes do Tailwind: prefira o helper `cn` de [`src/lib/utils.ts`](src/lib/utils.ts:1) para mesclagem condicional de classes (convenção do projeto).
- Classes do Tailwind: prefira o helper `cn` de [`src/lib/utils.ts`](src/lib/utils.ts:1) para mesclagem condicional de classes (convenção do projeto).

- **Framework UI**: [React](https://reactjs.org/) (v19.1.0)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) (v4)
- **Componentes UI**: Baseado em [shadcn/ui](https://ui.shadcn.com/), com componentes Radix UI (`Avatar`, `Dialog`, `Label`, `Slot`)
- **Ícones**: [Lucide React](https://lucide.dev/guide/react)
- **Utilitários CSS**: `clsx` e `tailwind-merge`

### Backend & Segurança

- **Validação de Esquema**: [Zod](https://zod.dev/)
- **Criptografia de Senha**: [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **Autenticação de Dois Fatores (2FA)**: [otplib](https://github.com/yeojz/otplib) e [qrcode](https://github.com/soldair/node-qrcode)
- **Envio de Email**: [Nodemailer](https://nodemailer.com/)

### Ferramentas de Desenvolvimento

- **Linting**: [ESLint](https://eslint.org/) com `eslint-config-next`
- **Gerenciador de Pacotes**: `npm`

## Comandos do Projeto

Os seguintes scripts estão disponíveis no arquivo `package.json` e podem ser executados com `npm run <comando>`.

- **`dev`**: Inicia o servidor de desenvolvimento do Next.js com Turbopack.
  ```bash
  npm run dev
  ```
- **`build`**: Compila a aplicação para produção.
  ```bash
  npm run build
  ```
- **`start`**: Inicia o servidor de produção do Next.js.
  ```bash
  npm run start
  ```
- **`lint`**: Executa o linter ESLint para verificar a qualidade do código.
  ```bash
  npm run lint
  ```

### Comandos do Banco de Dados (Prisma)

- **`db:generate`**: Gera o cliente Prisma com base no `schema.prisma`.
  ```bash
  npm run db:generate
  ```
- **`db:migrate`**: Cria e aplica uma nova migração de banco de dados.
  ```bash
  npm run db:migrate
  ```
- **`db:push`**: Sincroniza o esquema do Prisma com o banco de dados (para prototipagem).
  ```bash
  npm run db:push
  ```
- **`db:studio`**: Abre a interface gráfica do Prisma Studio para visualizar e editar dados.
  ```bash
  npm run db:studio
  ```
- **`db:seed`**: Executa o script de seed para popular o banco de dados.
  ```bash
  npm run db:seed
  ```
- **`db:reset`**: Reseta o banco de dados e aplica todas as migrações.
  ```bash
  npm run db:reset
  ```

## Convenções de Codificação

Manter um estilo de codificação consistente é crucial para a manutenibilidade do projeto.

### Estrutura de Diretórios

- **`src/app`**: Contém as páginas e rotas da aplicação, seguindo a estrutura do App Router do Next.js.
- **`src/components`**: Componentes React.
  - **`src/components/ui`**: Componentes de UI genéricos e reutilizáveis (estilo shadcn/ui).
  - **`src/components/providers`**: Provedores de contexto React (ex: `SessionProvider`).
- **`src/lib`**: Módulos e utilitários reutilizáveis.
  - **`src/lib/auth`**: Lógica de autenticação e autorização.
  - **`src/lib/prisma.ts`**: Instância singleton do cliente Prisma.
- **`pages/api`**: Rotas de API do Next.js, principalmente para autenticação com NextAuth.js.
- **`prisma`**: Esquema do banco de dados (`schema.prisma`) e migrações.

### TypeScript

- **Tipagem Estrita**: O modo `strict` do TypeScript está ativado. Evite o uso de `any` sempre que possível.
- **Alias de Caminho**: Use o alias `@/*` para importar de `src/*`.
  ```typescript
  import { prisma } from '@/lib/prisma';
  import { Button } from '@/components/ui/button';
  ```

### Componentes React

- **Componentes Funcionais**: Use componentes funcionais com Hooks.
- **Estilização**: Utilize o Tailwind CSS para estilização. A função `cn` de `src/lib/utils.ts` deve ser usada para mesclar classes condicionalmente.
  ```tsx
  import { cn } from '@/lib/utils';

  function MyComponent({ isActive }: { isActive: boolean }) {
    return (
      <div className={cn('p-4', { 'bg-blue-500': isActive })}>
        ...
      </div>
    );
  }
  ```

### Backend e API

- **RBAC (Controle de Acesso Baseado em Função)**: A lógica de permissões está centralizada em `src/lib/auth/permissions.ts`. Use os helpers `withPermission` e `requirePermission` para proteger rotas de API.
- **Tratamento de Erros**: As rotas de API devem retornar respostas de erro padronizadas em JSON.
- **Variáveis de Ambiente**: Acesse as variáveis de ambiente com `process.env`. Todas as variáveis necessárias devem ser documentadas em um arquivo `.env.example`.

## Documentação

Manter a documentação atualizada é essencial para colaboração e integração de novos membros na equipe.

### Comentários no Código

- **Funções**: Adicione comentários JSDoc a funções complexas, explicando seu propósito, parâmetros e valor de retorno.
- **Lógica Crítica**: Comente seções de código que implementam lógica de negócios complexa ou algoritmos não triviais.

### Documentos Markdown

- **`docs/`**: O diretório `docs/` contém a documentação geral do projeto.
- **Novas Funcionalidades**: Ao adicionar uma nova funcionalidade, crie ou atualize a documentação correspondente, explicando seu funcionamento, uso e configuração.
- **Decisões de Arquitetura**: Documente decisões de arquitetura importantes em um local centralizado para referência futura.

### Commits e Pull Requests

- **Mensagens de Commit**: Siga o padrão [Conventional Commits](https://www.conventionalcommits.org/).
  - Ex: `feat(auth): adicionar autenticação de dois fatores`
  - Ex: `fix(webtoon): corrigir paginação na página de busca`
- **Pull Requests**: Forneça uma descrição clara das alterações, incluindo o problema que está sendo resolvido e como as mudanças o abordam.
