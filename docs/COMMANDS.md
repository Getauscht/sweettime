# 🎯 Comandos Úteis - SweetTime Auth

## 📦 Instalação e Setup

```bash
# Instalar dependências
npm install

# Gerar Prisma Client
npx prisma generate

# Criar migração e aplicar
npx prisma migrate dev --name init

# Aplicar migrações existentes
npx prisma migrate deploy

# Resetar banco de dados (CUIDADO!)
npx prisma migrate reset
```

## 🗄️ Banco de Dados

```bash
# Abrir Prisma Studio (interface visual)
npx prisma studio

# Ver status das migrações
npx prisma migrate status

# Criar nova migração
npx prisma migrate dev --name nome_da_migracao

# Aplicar migrações em produção
npx prisma migrate deploy

# Sincronizar schema com o banco (pull)
npx prisma db pull

# Aplicar schema no banco (push) - apenas desenvolvimento
npx prisma db push

# Validar schema
npx prisma validate

# Formatar schema
npx prisma format
```

## 🚀 Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Iniciar com Turbopack (mais rápido)
npm run dev -- --turbo

# Build de produção
npm run build

# Iniciar servidor de produção
npm run start

# Rodar linter
npm run lint

# Rodar linter e corrigir
npm run lint -- --fix
```

## 🔐 Utilitários de Autenticação

### Gerar NEXTAUTH_SECRET

```bash
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Testar conexão MySQL

```bash
# Conectar ao MySQL
mysql -u root -p

# Ver bancos de dados
mysql -u root -p -e "SHOW DATABASES;"

# Ver tabelas do sweettime
mysql -u root -p sweettime -e "SHOW TABLES;"

# Contar usuários
mysql -u root -p sweettime -e "SELECT COUNT(*) FROM User;"
```

## 📧 Email (Gmail com senha de app)

```bash
# 1. Ativar verificação em 2 etapas
# https://myaccount.google.com/security

# 2. Gerar senha de app
# https://myaccount.google.com/apppasswords

# 3. Adicionar no .env
# EMAIL_SERVER_USER=seu-email@gmail.com
# EMAIL_SERVER_PASSWORD=senha-de-app-16-caracteres
```

## 🧪 Testes Manuais

### Testar API de Registro

```bash
# PowerShell
$body = @{
    name = "Teste User"
    email = "teste@example.com"
    password = "senha12345"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3000/api/auth/register -Method POST -Body $body -ContentType "application/json"
```

### Testar API de Recuperação de Senha

```bash
# PowerShell
$body = @{
    email = "teste@example.com"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3000/api/auth/forgot-password -Method POST -Body $body -ContentType "application/json"
```

## 🐛 Debug

### Ver logs do Prisma

```bash
# Ativar debug do Prisma
$env:DEBUG="prisma:*"
npm run dev
```

### Ver logs do NextAuth

```bash
# Ativar debug do NextAuth
# Adicione ao .env:
# NEXTAUTH_DEBUG=true
```

### Limpar cache do Next.js

```bash
# Windows PowerShell
Remove-Item -Recurse -Force .next

# Depois
npm run dev
```

## 📊 Consultas SQL Úteis

```sql
-- Ver todos os usuários
SELECT id, name, email, totpEnabled, createdAt FROM User;

-- Ver usuários com TOTP habilitado
SELECT name, email FROM User WHERE totpEnabled = true;

-- Ver sessões ativas
SELECT u.name, u.email, s.expires 
FROM Session s 
JOIN User u ON s.userId = u.id 
WHERE s.expires > NOW();

-- Ver contas OAuth
SELECT u.email, a.provider, a.providerAccountId 
FROM Account a 
JOIN User u ON a.userId = u.id;

-- Ver resets de senha pendentes
SELECT u.email, pr.token, pr.expires, pr.used 
FROM PasswordReset pr 
JOIN User u ON pr.userId = u.id 
WHERE pr.used = false AND pr.expires > NOW();

-- Limpar tokens expirados
DELETE FROM PasswordReset WHERE expires < NOW() OR used = true;

-- Limpar sessões expiradas
DELETE FROM Session WHERE expires < NOW();

-- Estatísticas
SELECT 
  (SELECT COUNT(*) FROM User) as total_users,
  (SELECT COUNT(*) FROM User WHERE totpEnabled = true) as users_with_totp,
  (SELECT COUNT(*) FROM Session WHERE expires > NOW()) as active_sessions;
```

## 🔧 Manutenção

### Backup do banco de dados

```bash
# Backup completo
mysqldump -u root -p sweettime > backup_sweettime_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# Backup apenas estrutura
mysqldump -u root -p --no-data sweettime > backup_structure.sql

# Restaurar backup
mysql -u root -p sweettime < backup_file.sql
```

### Limpar dados de desenvolvimento

```bash
# Resetar banco e recriar
npx prisma migrate reset --force

# Limpar node_modules e reinstalar
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

## 🚢 Deploy (Produção)

### Preparar para produção

```bash
# 1. Build
npm run build

# 2. Testar build localmente
npm run start

# 3. Verificar variáveis de ambiente
# Certifique-se de ter .env.production com:
# - DATABASE_URL (produção)
# - NEXTAUTH_URL (domínio de produção)
# - NEXTAUTH_SECRET (única para produção)
```

### Migração em produção

```bash
# Aplicar migrações sem confirmação
npx prisma migrate deploy

# Gerar Prisma Client
npx prisma generate
```

## 📈 Monitoramento

### Ver status do servidor

```bash
# Verificar se está rodando
Get-Process node

# Ver porta em uso
netstat -ano | findstr :3000
```

### Logs em produção

```bash
# PM2 (se usar)
pm2 logs sweettime
pm2 monit
```

## 🎨 Componentes UI (Shadcn)

### Adicionar novos componentes

```bash
# Instalar CLI do Shadcn (se necessário)
npm install -D @shadcn/ui

# Adicionar componente
npx shadcn-ui@latest add [component-name]

# Exemplos:
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
```

## 🔍 Troubleshooting

### Erro: Port 3000 já em uso

```bash
# Matar processo na porta 3000
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Id $process.OwningProcess -Force
}
```

### Erro: Prisma Client desatualizado

```bash
npx prisma generate
```

### Erro: Tipos TypeScript

```bash
# Limpar cache do TypeScript
Remove-Item -Recurse -Force .next
npm run dev
```

## 📚 Links Rápidos

- **Prisma Studio**: http://localhost:5555 (npx prisma studio)
- **App Local**: http://localhost:3000
- **API Auth**: http://localhost:3000/api/auth/*

## 💡 Dicas

1. Use `npx prisma studio` para visualizar e editar dados facilmente
2. Mantenha o `.env` seguro e nunca o commite
3. Use `npm run build` antes de fazer deploy
4. Configure um `.env.example` com valores de exemplo
5. Documente mudanças no schema do Prisma
6. Faça backup regular do banco de dados em produção
7. Use variáveis de ambiente diferentes para dev/staging/prod
8. Configure logs apropriados em produção
9. Implemente rate limiting antes do deploy
10. Use HTTPS em produção sempre!

---

💾 **Salve este arquivo para referência rápida!**
