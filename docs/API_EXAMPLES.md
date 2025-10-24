# 🔌 Exemplos de Uso das APIs - SweetTime Auth

Este documento contém exemplos práticos de como usar as APIs de autenticação.

---

## 📋 Índice

1. [Registro de Usuário](#registro-de-usuário)
2. [Login](#login)
3. [Recuperação de Senha](#recuperação-de-senha)
4. [Reset de Senha](#reset-de-senha)
5. [Configurar TOTP](#configurar-totp)
6. [Verificar TOTP](#verificar-totp)
7. [Usar a Sessão](#usar-a-sessão)

---

## 1. Registro de Usuário

### POST `/api/auth/register`

#### Request
```javascript
// JavaScript/TypeScript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'João Silva',
    email: 'joao@example.com',
    password: 'senha123456',
  }),
})

const data = await response.json()
```

#### PowerShell
```powershell
$body = @{
    name = "João Silva"
    email = "joao@example.com"
    password = "senha123456"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://localhost:3000/api/auth/register" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

#### cURL
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "password": "senha123456"
  }'
```

#### Resposta de Sucesso (201)
```json
{
  "message": "Usuário criado com sucesso",
  "user": {
    "id": "clx1234567890",
    "name": "João Silva",
    "email": "joao@example.com"
  }
}
```

#### Resposta de Erro (400)
```json
{
  "message": "Email já cadastrado"
}
```

---

## Webtoons API — campos e contrato (`authors`)

O projeto padronizou o contrato de retorno dos endpoints que expõem um `webtoon` para incluir um array padronizado `authors: Author[]`.

- `authors` (recomendado): array com objetos de autor completos — cada item tem `id`, `name`, `slug`, `avatar` e campos públicos do autor.
- `author` (legado): alguns endpoints ainda expõem um campo legada `author` (string ou array) por compatibilidade; novos clientes devem usar `authors`.

Exemplo de resposta (GET `/api/webtoons/:slug`):

```json
{
  "webtoon": {
    "id": "clx...",
    "title": "Minha História",
    "slug": "minha-historia",
    "description": "...",
    "coverImage": null,
    "authors": [
      { "id": "a1", "name": "Autor A", "slug": "autor-a", "avatar": null },
      { "id": "a2", "name": "Coautor B", "slug": "coautor-b", "avatar": null }
    ],
    "author": [ /* legado: array semelhante a authors */ ],
    "genres": [ { "id": "g1", "name": "Aventura", "slug": "aventura" } ],
    "latestChapters": [],
    "totalChapters": 12
  }
}
```

Recomendações:

- Prefira `authors` (array) em novos consumidores do API.
- Mantenha compatibilidade por enquanto; remova o uso de `author` da UI quando todas rotas e páginas estiverem migradas.


## 2. Login

### NextAuth - Credentials

#### Client-side (React/Next.js)
```typescript
import { signIn } from 'next-auth/react'

// Login básico
const result = await signIn('credentials', {
  email: 'joao@example.com',
  password: 'senha123456',
  redirect: false,
})

if (result?.ok) {
  // Login bem-sucedido
  console.log('Login realizado!')
} else if (result?.error === 'TOTP_REQUIRED') {
  // TOTP necessário
  setShowTotpInput(true)
} else {
  // Erro
  console.error(result?.error)
}
```

#### Login com TOTP
```typescript
// Quando TOTP está habilitado
const result = await signIn('credentials', {
  email: 'joao@example.com',
  password: 'senha123456',
  totpToken: '123456', // Código do app autenticador
  redirect: false,
})
```

#### Login com Google
```typescript
await signIn('google', {
  callbackUrl: '/',
})
```

#### Login com GitHub
```typescript
await signIn('github', {
  callbackUrl: '/',
})
```

---

## 3. Recuperação de Senha

### POST `/api/auth/forgot-password`

#### Request
```javascript
const response = await fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'joao@example.com',
  }),
})

const data = await response.json()
```

#### PowerShell
```powershell
$body = @{
    email = "joao@example.com"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://localhost:3000/api/auth/forgot-password" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

#### Resposta de Sucesso (200)
```json
{
  "message": "Se o email existir, você receberá instruções de recuperação"
}
```

**Nota:** Por segurança, sempre retorna a mesma mensagem, independente do email existir ou não.

---

## 4. Reset de Senha

### POST `/api/auth/reset-password`

#### Request
```javascript
const response = await fetch('/api/auth/reset-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: 'abc123...', // Token recebido por email
    password: 'novaSenha123456',
  }),
})

const data = await response.json()
```

#### PowerShell
```powershell
$body = @{
    token = "abc123..."
    password = "novaSenha123456"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://localhost:3000/api/auth/reset-password" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

#### Resposta de Sucesso (200)
```json
{
  "message": "Senha alterada com sucesso"
}
```

#### Resposta de Erro (400)
```json
{
  "message": "Token inválido ou expirado"
}
```

---

## 5. Configurar TOTP

### Gerar QR Code - GET `/api/auth/totp`

#### Request (precisa estar autenticado)
```javascript
const response = await fetch('/api/auth/totp', {
  credentials: 'include', // Envia cookies de sessão
})

const data = await response.json()
// data.qrCode - data URL da imagem
// data.secret - segredo para entrada manual
```

#### Resposta de Sucesso (200)
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KG..."
}
```

### Habilitar TOTP - POST `/api/auth/totp`

#### Request
```javascript
const response = await fetch('/api/auth/totp', {
  method: 'POST',
  credentials: 'include',
})

const data = await response.json()
```

#### Resposta de Sucesso (200)
```json
{
  "message": "TOTP habilitado com sucesso"
}
```

### Desabilitar TOTP - DELETE `/api/auth/totp`

#### Request
```javascript
const response = await fetch('/api/auth/totp', {
  method: 'DELETE',
  credentials: 'include',
})

const data = await response.json()
```

#### Resposta de Sucesso (200)
```json
{
  "message": "TOTP desabilitado com sucesso"
}
```

---

## 6. Verificar TOTP

### POST `/api/auth/verify-totp`

#### Request
```javascript
const response = await fetch('/api/auth/verify-totp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    token: '123456', // Código de 6 dígitos
  }),
})

const data = await response.json()
```

#### Resposta de Sucesso (200)
```json
{
  "valid": true
}
```

#### Resposta de Erro (400)
```json
{
  "message": "Código inválido"
}
```

---

## 7. Usar a Sessão

### Client-side (React/Next.js)

#### Hook useSession
```typescript
import { useSession } from 'next-auth/react'

function MyComponent() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <p>Carregando...</p>
  }

  if (status === 'unauthenticated') {
    return <p>Não autenticado</p>
  }

  return (
    <div>
      <p>Olá, {session.user.name}</p>
      <p>Email: {session.user.email}</p>
    </div>
  )
}
```

#### Proteger página
```typescript
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

function ProtectedPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return <p>Carregando...</p>
  }

  return <div>Conteúdo protegido</div>
}
```

### Server-side (API Routes)

#### Verificar sessão em API route
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ message: 'Não autorizado' })
  }

  // Usuário autenticado
  const userId = session.user.id
  const userEmail = session.user.email

  // Seu código aqui...
}
```

### Server Components (App Router)

#### Verificar sessão em Server Component
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div>
      <h1>Olá, {session.user.name}</h1>
      <p>Email: {session.user.email}</p>
    </div>
  )
}
```

---

## 🔐 Autenticação com Bearer Token (Opcional)

Se você quiser usar JWT tokens manualmente:

### Gerar token customizado
```typescript
import jwt from 'jsonwebtoken'

const token = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.NEXTAUTH_SECRET!,
  { expiresIn: '7d' }
)
```

### Verificar token
```typescript
import jwt from 'jsonwebtoken'

try {
  const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!)
  // Token válido
} catch (error) {
  // Token inválido
}
```

---

## 📱 Exemplos Práticos

### Exemplo Completo: Fluxo de Login

```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpToken, setTotpToken] = useState('')
  const [showTotp, setShowTotp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        totpToken: showTotp ? totpToken : undefined,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === 'TOTP_REQUIRED') {
          setShowTotp(true)
          setError('Digite o código de autenticação')
        } else {
          setError(result.error)
        }
      } else if (result?.ok) {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
        required
      />
      
      {showTotp && (
        <input
          type="text"
          value={totpToken}
          onChange={(e) => setTotpToken(e.target.value)}
          placeholder="Código 2FA"
          maxLength={6}
          required
        />
      )}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
```

### Exemplo: Configurar TOTP Completo

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function TotpSetup() {
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [step, setStep] = useState<'generate' | 'verify' | 'done'>('generate')

  const generateQR = async () => {
    const res = await fetch('/api/auth/totp')
    const data = await res.json()
    setQrCode(data.qrCode)
    setSecret(data.secret)
    setStep('verify')
  }

  const verifyAndEnable = async () => {
    // Verificar código
    const verifyRes = await fetch('/api/auth/verify-totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: verifyToken }),
    })

    if (!verifyRes.ok) {
      alert('Código inválido')
      return
    }

    // Habilitar TOTP
    const enableRes = await fetch('/api/auth/totp', {
      method: 'POST',
    })

    if (enableRes.ok) {
      setStep('done')
    }
  }

  if (step === 'generate') {
    return (
      <button onClick={generateQR}>
        Gerar QR Code
      </button>
    )
  }

  if (step === 'verify') {
    return (
      <div>
        <Image src={qrCode} alt="QR Code" width={200} height={200} />
        <p>Segredo: {secret}</p>
        <input
          type="text"
          value={verifyToken}
          onChange={(e) => setVerifyToken(e.target.value)}
          placeholder="000000"
          maxLength={6}
        />
        <button onClick={verifyAndEnable}>
          Verificar e Habilitar
        </button>
      </div>
    )
  }

  return <p>TOTP habilitado com sucesso! ✅</p>
}
```

---

## 🚨 Tratamento de Erros

### Erros Comuns e Como Tratar

```typescript
// Wrapper para requisições
async function apiRequest(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Erro na requisição')
    }

    return data
  } catch (error) {
    if (error instanceof Error) {
      // Erro de rede ou parsing
      console.error('Erro:', error.message)
      throw error
    }
    throw new Error('Erro desconhecido')
  }
}

// Uso
try {
  const data = await apiRequest('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  console.log('Sucesso:', data)
} catch (error) {
  if (error instanceof Error) {
    alert(error.message)
  }
}
```

---

## 📊 Status Codes

| Código | Significado | Quando Ocorre |
|--------|-------------|---------------|
| 200 | OK | Requisição bem-sucedida |
| 201 | Created | Usuário criado |
| 400 | Bad Request | Dados inválidos |
| 401 | Unauthorized | Não autenticado |
| 403 | Forbidden | Sem permissão |
| 405 | Method Not Allowed | Método HTTP inválido |
| 500 | Internal Server Error | Erro no servidor |

---

## 🔗 Links Úteis

- [NextAuth.js Docs](https://next-auth.js.org/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

**💡 Dica:** Use ferramentas como Postman ou Insomnia para testar as APIs antes de integrar no frontend!
