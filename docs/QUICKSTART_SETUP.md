# 🚀 Inicialização do Projeto - SweetTime

## ✅ Pré-requisitos

- Node.js 18+ instalado
- MySQL rodando (via Docker ou local)
- npm ou yarn

---

## 📋 Checklist de Setup

### 1. Instalação de Dependências

```bash
npm install
```

**Dependências instaladas:**
- Next.js 15.5.4
- React 19.1.0
- Prisma 6.16.3
- NextAuth 4.24.11
- react-markdown, remark-gfm, rehype-raw, rehype-sanitize
- uuid, date-fns, sharp, bcryptjs, etc.

---

### 2. Configuração do Banco de Dados

#### Docker (Recomendado)
```bash
docker-compose up -d
```

Isso iniciará:
- MySQL 8.0 na porta 3306
- Banco de dados: `sweettime`
- Usuário: `sweettime_user`
- Senha: `sweettime_password`

#### Verificar se o MySQL está rodando:
```bash
docker ps
```

Deve mostrar o container `sweettime-db` em execução.

---

### 3. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Database
DATABASE_URL="mysql://sweettime_user:sweettime_password@localhost:3306/sweettime"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="seu-secret-super-secreto-aqui-mude-isso"

# OAuth Providers (Opcional)
GOOGLE_CLIENT_ID="seu-google-client-id"
GOOGLE_CLIENT_SECRET="seu-google-client-secret"
GITHUB_ID="seu-github-id"
GITHUB_SECRET="seu-github-secret"

# Email (Opcional - para recuperação de senha)
EMAIL_SERVER_USER="seu-email@gmail.com"
EMAIL_SERVER_PASSWORD="sua-senha-de-app"
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_FROM="noreply@sweettime.com"
```

---

### 4. Migrações do Banco de Dados

#### Aplicar schema ao banco:
```bash
npm run db:push
```

Este comando:
- Cria todas as tabelas
- Aplica índices e constraints
- Sincroniza o schema.prisma com o banco

#### Gerar Prisma Client:
```bash
npm run db:generate
```

Este comando:
- Gera os tipos TypeScript
- Cria o cliente Prisma
- Disponibiliza os modelos (User, Webtoon, Favorite, etc.)

---

### 5. Popular o Banco com Dados Iniciais

#### Seed completo (recomendado para desenvolvimento):
```bash
npm run db:seed
```

Isso criará:
- Roles (Admin, Creator, User)
- Permissões
- Gêneros
- Autores
- Webtoons de exemplo
- Capítulos

#### Criar apenas usuário admin:
```bash
curl -X POST http://localhost:3000/api/admin/seed-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sweettime.com",
    "password": "admin123",
    "name": "Admin User"
  }'
```

**Credenciais:**
- Email: `admin@sweettime.com`
- Senha: `admin123`

---

### 6. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

O servidor estará disponível em:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3000/api/*

---

## 🧪 Verificação do Setup

### 1. Testar Homepage
Acesse: http://localhost:3000

Deve mostrar:
- ✅ Carrosséis de webtoons (se houver dados)
- ✅ Header com logo e navegação
- ✅ Botão de login

### 2. Testar Login
Acesse: http://localhost:3000/auth/login

Faça login com:
- Email: `admin@sweettime.com`
- Senha: `admin123`

Deve:
- ✅ Redirecionar para homepage
- ✅ Mostrar nome do usuário no header
- ✅ Sino de notificações aparecer

### 3. Testar Admin Panel
Acesse: http://localhost:3000/admin

Deve:
- ✅ Mostrar dashboard administrativo
- ✅ Estatísticas (usuários, webtoons, etc.)
- ✅ Menu lateral com opções

### 4. Testar Creator Studio
Acesse: http://localhost:3000/creator

Deve:
- ✅ Mostrar dashboard do criador
- ✅ Opção de criar nova série

### 5. Testar Leitura de Webtoon
1. Na homepage, clique em um webtoon
2. Na página do webtoon, clique em um capítulo
3. Deve:
   - ✅ Mostrar conteúdo do capítulo
   - ✅ Header fixo com navegação
   - ✅ Botões prev/next

### 6. Testar Favoritos
1. Faça login
2. Vá para um webtoon
3. Clique em "Favoritar"
4. Vá para `/library`
5. Deve:
   - ✅ Aparecer na aba "Favoritos"

### 7. Testar Comentários
1. Faça login
2. Vá para um webtoon
3. Role até "Comentários"
4. Digite um comentário e envie
5. Deve:
   - ✅ Comentário aparecer na lista

### 8. Testar Menções
1. No campo de comentário, digite `@`
2. Digite parte de um nome de usuário
3. Deve:
   - ✅ Dropdown aparecer com sugestões
   - ✅ Poder selecionar com mouse ou teclado

---

## 🛠️ Comandos Úteis

### Banco de Dados

```bash
# Ver dados no Prisma Studio
npm run db:studio

# Aplicar schema
npm run db:push

# Criar migração
npm run db:migrate

# Popular banco
npm run db:seed

# Resetar banco (CUIDADO!)
npm run db:reset
```

### Desenvolvimento

```bash
# Iniciar dev server
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm run start

# Linter
npm run lint
```

---

## 📂 Estrutura de Pastas

```
sweettime/
├── docs/                      # Documentação
│   ├── READER_IMPLEMENTATION.md
│   ├── TESTING_GUIDE.md
│   ├── ROUTES_MAP.md
│   └── EXECUTIVE_SUMMARY.md
├── pages/
│   └── api/                   # API Routes
│       ├── auth/             # Autenticação
│       ├── admin/            # Admin APIs
│       ├── creator/          # Creator APIs
│       ├── webtoons/         # Webtoon APIs
│       ├── authors/          # Author APIs
│       ├── comments/         # Comentários
│       ├── favorites/        # Favoritos
│       ├── following/        # Follows
│       ├── reading-history/  # Histórico
│       └── users/            # Usuários
├── prisma/
│   ├── schema.prisma         # Schema do banco
│   ├── seed.ts               # Seed script
│   └── migrations/           # Migrações
├── public/
│   └── uploads/              # Arquivos uploaded
├── src/
│   ├── app/                  # App Router (Next.js 15)
│   │   ├── auth/            # Páginas de auth
│   │   ├── admin/           # Admin Panel
│   │   ├── creator/         # Creator Studio
│   │   ├── webtoon/         # Páginas de webtoon
│   │   ├── library/         # Biblioteca
│   │   └── ...
│   ├── components/
│   │   ├── ui/              # Componentes UI
│   │   └── providers/       # Context providers
│   └── lib/
│       ├── auth/            # Lógica de auth
│       ├── prisma.ts        # Cliente Prisma
│       └── utils.ts         # Utilitários
└── ...
```

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"
**Solução:**
```bash
# Verificar se MySQL está rodando
docker ps

# Reiniciar container
docker-compose restart

# Verificar logs
docker-compose logs db
```

### Erro: "Prisma Client not generated"
**Solução:**
```bash
npm run db:generate
```

### Erro: "Module not found"
**Solução:**
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### Erro de TypeScript nos modelos Prisma
**Solução:**
```bash
# Regenerar cliente
npm run db:generate

# Reload do VS Code
Ctrl+Shift+P -> Developer: Reload Window
```

### Erro: "NextAuth session not found"
**Solução:**
Verifique se `NEXTAUTH_SECRET` está configurado no `.env`

### Erro: "Upload failed"
**Solução:**
Crie a pasta:
```bash
mkdir -p public/uploads/cover
```

---

## 📊 Dados de Teste

### Criar usuário de teste:
1. Acesse: http://localhost:3000/auth/register
2. Preencha o formulário
3. Faça login

### Criar webtoon de teste (como Creator):
1. Faça login como criador
2. Vá para: http://localhost:3000/creator/series/new
3. Preencha o formulário
4. Upload de capa
5. Salve

### Criar capítulo de teste:
1. Vá para a série criada
2. Clique em "Novo Capítulo"
3. Preencha título e conteúdo (pode usar Markdown)
4. Salve

**Exemplo de conteúdo em Markdown:**
```markdown
# Título do Capítulo

Este é um parágrafo de exemplo.

## Subtítulo

- Item 1
- Item 2
- Item 3

**Texto em negrito** e *itálico*.

> Uma citação interessante

![Imagem](https://via.placeholder.com/800x400)
```

---

## ✅ Checklist Final

Antes de começar a desenvolver:

- [ ] MySQL rodando (via Docker)
- [ ] `.env` configurado
- [ ] Dependências instaladas (`npm install`)
- [ ] Schema aplicado (`npm run db:push`)
- [ ] Cliente gerado (`npm run db:generate`)
- [ ] Banco populado (`npm run db:seed`)
- [ ] Servidor dev rodando (`npm run dev`)
- [ ] Homepage carrega em http://localhost:3000
- [ ] Login funcionando
- [ ] Admin panel acessível
- [ ] Creator studio acessível

---

## 🎉 Tudo Pronto!

Se todos os itens do checklist estão marcados, o projeto está 100% funcional e pronto para desenvolvimento!

Acesse a documentação completa em:
- `docs/READER_IMPLEMENTATION.md` - Implementação do sistema de leitura
- `docs/TESTING_GUIDE.md` - Guia de testes
- `docs/ROUTES_MAP.md` - Mapa completo de rotas
- `docs/EXECUTIVE_SUMMARY.md` - Resumo executivo

**Boa codificação! 🚀**
