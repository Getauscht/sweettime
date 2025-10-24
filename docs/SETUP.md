# 🚀 Instruções Rápidas de Setup

## 1️⃣ Configure o arquivo .env

Crie um arquivo `.env` na raiz do projeto com:

```env
# Database - AJUSTE COM SUAS CREDENCIAIS
DATABASE_URL="mysql://root:senha@localhost:3306/sweettime"

# NextAuth - GERE UMA SECRET KEY
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=sua-chave-secreta-aqui

# OAuth (Opcional - deixe vazio se não for usar)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email (Opcional - deixe vazio se não for testar recuperação de senha)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM=noreply@sweettime.com
```

### Gerar NEXTAUTH_SECRET:
```bash
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Ou use um gerador online
# https://generate-secret.vercel.app/32
```

## 2️⃣ Configure o MySQL

```sql
CREATE DATABASE sweettime;
```

## 3️⃣ Execute as migrações

```bash
npx prisma migrate dev --name init
```

## 4️⃣ Inicie o servidor

```bash
npm run dev
```

## 5️⃣ Acesse o sistema

Abra http://localhost:3000

## 📋 Checklist de Funcionalidades

### Teste estas funcionalidades:

- [ ] **Página Inicial** (`/`) - Landing page com informações
- [ ] **Registro** (`/auth/register`) - Criar nova conta
- [ ] **Login** (`/auth/login`) - Entrar com email/senha
- [ ] **Dashboard** (`/dashboard`) - Página protegida após login
- [ ] **Recuperar Senha** (`/auth/forgot-password`) - Solicitar reset
- [ ] **Redefinir Senha** (`/auth/reset-password?token=...`) - Usar link do email
- [ ] **Configurar TOTP** (`/auth/totp-setup`) - 2FA com Google Authenticator
- [ ] **Login Social** - Google/GitHub (se configurado)
- [ ] **Logout** - Sair do sistema

## 🔐 Testando TOTP (Autenticação de Dois Fatores)

1. Faça login no sistema
2. Acesse `/auth/totp-setup`
3. Clique em "Gerar QR Code"
4. Escaneie com **Google Authenticator** ou **Authy**
5. Digite o código de 6 dígitos
6. Clique em "Verificar e Habilitar"
7. Faça logout
8. No próximo login, será pedido o código TOTP

## 📧 Testando Recuperação de Senha

### Opção 1: Com Email Configurado (Gmail)

1. Configure Gmail com senha de app:
   - Ative verificação em 2 etapas: https://myaccount.google.com/security
   - Gere senha de app: https://myaccount.google.com/apppasswords
   - Use a senha de app no `.env`

2. Teste o fluxo:
   - Acesse `/auth/forgot-password`
   - Digite seu email cadastrado
   - Verifique sua caixa de entrada
   - Clique no link recebido
   - Defina nova senha

### Opção 2: Sem Email (Teste Manual)

1. Inicie o servidor
2. Solicite reset em `/auth/forgot-password`
3. Veja o console do servidor - o token aparecerá no log
4. Acesse manualmente: `/auth/reset-password?token=TOKEN_DO_CONSOLE`
5. Defina nova senha

## 🎨 Estrutura de Rotas

### Rotas Públicas
- `/` - Página inicial
- `/auth/login` - Login
- `/auth/register` - Registro
- `/auth/forgot-password` - Recuperar senha
- `/auth/reset-password` - Redefinir senha

### Rotas Protegidas (Requer autenticação)
- `/dashboard` - Dashboard do usuário
- `/auth/totp-setup` - Configuração 2FA

### APIs
- `POST /api/auth/register` - Criar usuário
- `POST /api/auth/forgot-password` - Solicitar reset
- `POST /api/auth/reset-password` - Confirmar reset
- `GET /api/auth/totp` - Gerar QR Code TOTP
- `POST /api/auth/totp` - Habilitar TOTP
- `DELETE /api/auth/totp` - Desabilitar TOTP
- `POST /api/auth/verify-totp` - Verificar código TOTP

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Prisma Studio (Interface visual do banco)
npx prisma studio

# Ver estrutura do banco
npx prisma db pull

# Resetar banco (CUIDADO!)
npx prisma migrate reset

# Build de produção
npm run build
npm run start
```

## 🐛 Problemas Comuns

### ❌ Erro de conexão com MySQL
```
P1001: Can't reach database server
```
**Solução**: 
- Verifique se o MySQL está rodando
- Confirme usuário, senha e porta no `.env`
- Teste a conexão: `mysql -u root -p`

### ❌ Prisma Client não inicializado
```
@prisma/client did not initialize yet
```
**Solução**: `npx prisma generate`

### ❌ NEXTAUTH_SECRET não definido
```
NEXTAUTH_SECRET environment variable is not set
```
**Solução**: Gere uma chave e adicione ao `.env`

### ❌ Componentes UI com erro
```
Cannot find module '@radix-ui/...'
```
**Solução**: `npm install`

## 📦 Estrutura de Tabelas

### User
- id, name, email, password (hash)
- totpSecret, totpEnabled
- emailVerified, createdAt, updatedAt

### Account (OAuth)
- userId, provider, providerAccountId
- access_token, refresh_token, expires_at

### Session
- userId, sessionToken, expires

### PasswordReset
- userId, token, expires, used

## ✅ Tudo Funcionando?

Se você conseguiu:
- ✅ Criar uma conta
- ✅ Fazer login
- ✅ Acessar o dashboard
- ✅ Configurar TOTP
- ✅ Fazer logout

**Parabéns! 🎉 Seu sistema de autenticação está 100% funcional!**

## 📖 Próximos Passos

1. Customize a landing page (`src/app/page.tsx`)
2. Adicione mais campos ao perfil do usuário
3. Implemente roles e permissões
4. Configure OAuth social (Google/GitHub)
5. Adicione logs de auditoria
6. Implemente rate limiting
7. Configure deploy em produção

## 🔗 Links Úteis

- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth.js Docs](https://next-auth.js.org/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Shadcn UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

💡 **Dica**: Leia o arquivo `AUTH_README.md` para documentação completa!
