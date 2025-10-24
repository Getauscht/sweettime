# SweetTime - Sistema de Autenticação Completo

Sistema completo de autenticação e autorização construído com **Next.js 15**, **NextAuth.js**, **MySQL**, **Prisma ORM** e **Shadcn UI**.

## 🚀 Funcionalidades

### Autenticação
- ✅ Login com email e senha
- ✅ Registro de novos usuários
- ✅ Login social (Google, GitHub)
- ✅ Sessões persistentes com JWT
- ✅ Proteção de rotas
- ✅ Logout seguro

### Segurança
- ✅ Autenticação de dois fatores (TOTP)
- ✅ Recuperação de senha por email
- ✅ Senhas criptografadas com bcrypt (12 rounds)
- ✅ Tokens de reset com expiração
- ✅ Proteção CSRF
- ✅ Validação de dados com Zod

### Interface
- ✅ Design moderno e responsivo
- ✅ Componentes Shadcn UI
- ✅ Feedback visual de erros/sucesso
- ✅ QR Code para configuração TOTP
- ✅ Avatar do usuário
- ✅ Dashboard de usuário

## 📋 Pré-requisitos

- Node.js 18+ 
- MySQL 8+
- NPM ou Yarn

## 🛠️ Instalação

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd sweettime
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o banco de dados MySQL

Crie um banco de dados MySQL:
```sql
CREATE DATABASE sweettime;
```

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto (use `.env.example` como referência):

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/sweettime"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<gere-uma-chave-secreta-aqui>

# OAuth Providers (Opcional)
GOOGLE_CLIENT_ID=seu-google-client-id
GOOGLE_CLIENT_SECRET=seu-google-client-secret

GITHUB_CLIENT_ID=seu-github-client-id
GITHUB_CLIENT_SECRET=seu-github-client-secret

# Email (para recuperação de senha)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=seu-email@gmail.com
EMAIL_SERVER_PASSWORD=sua-senha-de-app
EMAIL_FROM=noreply@sweettime.com
```

#### Gerar NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 5. Execute as migrações do Prisma

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 6. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

## 📁 Estrutura do Projeto

```
sweettime/
├── prisma/
│   └── schema.prisma          # Schema do banco de dados
├── pages/
│   └── api/
│       └── auth/
│           ├── [...nextauth].ts    # Configuração NextAuth
│           ├── register.ts         # API de registro
│           ├── forgot-password.ts  # API de recuperação
│           ├── reset-password.ts   # API de reset
│           ├── totp.ts            # API TOTP
│           └── verify-totp.ts     # API verificação TOTP
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── login/            # Página de login
│   │   │   ├── register/         # Página de registro
│   │   │   ├── forgot-password/  # Recuperação de senha
│   │   │   ├── reset-password/   # Reset de senha
│   │   │   └── totp-setup/       # Configuração TOTP
│   │   ├── dashboard/            # Dashboard do usuário
│   │   ├── layout.tsx            # Layout principal
│   │   └── page.tsx              # Página inicial
│   ├── components/
│   │   ├── providers/
│   │   │   └── session-provider.tsx  # Provider de sessão
│   │   └── ui/                   # Componentes Shadcn UI
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── password.ts      # Hash de senhas
│   │   │   ├── totp.ts         # Lógica TOTP
│   │   │   └── email.ts        # Envio de emails
│   │   ├── prisma.ts           # Cliente Prisma
│   │   └── utils.ts            # Utilitários
│   └── types/
│       └── next-auth.d.ts      # Types do NextAuth
└── .env                         # Variáveis de ambiente
```

## 🔐 Configuração OAuth (Opcional)

### Google OAuth

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto
3. Habilite a Google+ API
4. Crie credenciais OAuth 2.0
5. Adicione `http://localhost:3000/api/auth/callback/google` nas URIs de redirecionamento
6. Copie Client ID e Client Secret para o `.env`

### GitHub OAuth

1. Acesse [GitHub Developer Settings](https://github.com/settings/developers)
2. Crie um novo OAuth App
3. Use `http://localhost:3000/api/auth/callback/github` como callback URL
4. Copie Client ID e Client Secret para o `.env`

## 📧 Configuração de Email

Para recuperação de senha, configure um serviço SMTP:

### Gmail (Recomendado para desenvolvimento)

1. Ative a verificação em 2 etapas na sua conta Google
2. Gere uma [Senha de App](https://myaccount.google.com/apppasswords)
3. Use a senha de app no `.env`

### Outros provedores SMTP

Ajuste as configurações no `.env` conforme seu provedor.

## 🧪 Testando o Sistema

### 1. Criar um usuário
- Acesse `/auth/register`
- Preencha os dados
- Faça login em `/auth/login`

### 2. Testar recuperação de senha
- Em `/auth/login`, clique em "Esqueceu a senha?"
- Digite seu email
- Verifique sua caixa de entrada
- Use o link para redefinir

### 3. Configurar TOTP
- Após login, acesse `/auth/totp-setup`
- Escaneie o QR Code com Google Authenticator ou Authy
- Digite o código de 6 dígitos para confirmar
- No próximo login, será solicitado o código TOTP

## 🎨 Componentes UI

Este projeto usa [Shadcn UI](https://ui.shadcn.com/). Componentes incluídos:

- Button
- Input
- Card
- Label
- Alert
- Dialog
- Avatar

## 📦 Scripts Disponíveis

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Inicia servidor de produção
npm run lint         # Executa linter
npx prisma studio    # Abre interface visual do banco
npx prisma migrate   # Cria novas migrações
```

## 🔒 Segurança

### Boas práticas implementadas:

- ✅ Senhas com hash bcrypt (12 rounds)
- ✅ Tokens de reset com expiração (1 hora)
- ✅ TOTP com janela de tolerância de 1 período
- ✅ Sessões JWT seguras
- ✅ Validação de dados com Zod
- ✅ Proteção CSRF nativa do NextAuth
- ✅ HTTPOnly cookies
- ✅ Sanitização de inputs

### Recomendações para produção:

- [ ] Configure HTTPS
- [ ] Use variáveis de ambiente seguras
- [ ] Configure rate limiting
- [ ] Implemente logs de auditoria
- [ ] Configure CORS adequadamente
- [ ] Use provedor de email profissional
- [ ] Implemente captcha no registro
- [ ] Configure backup do banco de dados

## 🐛 Troubleshooting

### Erro de conexão com MySQL
```
Error: P1001: Can't reach database server
```
**Solução**: Verifique se o MySQL está rodando e as credenciais no `.env` estão corretas.

### Erro ao gerar Prisma Client
```
Error: @prisma/client did not initialize yet
```
**Solução**: Execute `npx prisma generate`

### Erro de NEXTAUTH_SECRET
```
Error: NEXTAUTH_SECRET environment variable is not set
```
**Solução**: Gere uma secret key com `openssl rand -base64 32` e adicione ao `.env`

### Email não está sendo enviado
**Solução**: 
- Verifique as configurações SMTP no `.env`
- Para Gmail, use uma senha de app
- Verifique se a porta 587 não está bloqueada pelo firewall

## 📚 Tecnologias Utilizadas

- **Next.js 15** - Framework React
- **NextAuth.js 4** - Autenticação
- **Prisma 6** - ORM
- **MySQL 8** - Banco de dados
- **Shadcn UI** - Componentes UI
- **Tailwind CSS 4** - Estilização
- **TypeScript 5** - Tipagem
- **Zod** - Validação de schemas
- **bcryptjs** - Hash de senhas
- **otplib** - Geração/validação TOTP
- **qrcode** - Geração de QR Codes
- **nodemailer** - Envio de emails

## 📄 Licença

Este projeto é open source e está disponível sob a licença MIT.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📞 Suporte

Se você encontrar algum problema ou tiver dúvidas, abra uma issue no repositório.

---

Desenvolvido com ❤️ usando Next.js e NextAuth.js
