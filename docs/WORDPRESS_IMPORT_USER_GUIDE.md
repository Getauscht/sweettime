# Guia Rápido: Importação WordPress e Recuperação de Senha Legada

## Para Administradores

### 1. Importar Usuários do WordPress

#### Preparar o arquivo CSV
Exporte os usuários do WordPress em formato CSV com as colunas:
```
ID,user_login,user_pass,user_nicename,user_email
```

Exemplo:
```csv
ID,user_login,user_pass,user_nicename,user_email
1,johndoe,$P$B...,John Doe,john@example.com
2,janedoe,$P$B...,Jane Doe,jane@example.com
```

#### Importar via API (temporário - UI em desenvolvimento)
```bash
curl -X POST http://localhost:3000/api/admin/users/import \
  -H "Cookie: next-auth.session-token=SEU_TOKEN_AQUI" \
  -F "file=@usuarios-wordpress.csv"
```

#### Resultado
- Usuários são criados com email do CSV
- Nome vem de `user_nicename`
- Senha temporária aleatória é gerada
- Flag `mustChangePassword` marcada como `true`
- Emails duplicados são pulados silenciosamente

### 2. Enviar Magic Link para Usuário

#### Via Interface Admin
1. Acesse `/admin/users`
2. Localize o usuário na tabela
3. Clique no ícone de **envelope (Send)** ao lado do nome
4. Confirme o envio
5. Toast de sucesso aparecerá confirmando envio

#### Resultado
- Email enviado com link de recuperação
- Link expira em 60 minutos (configurável)
- Pode ser usado apenas uma vez

### 3. Configurar Email e TTL

1. Acesse `/admin/settings`
2. Configure:
   - **Nome do Site**: Aparece no email
   - **Nome do Remetente**: Nome do "From" do email
   - **Email do Remetente**: Email do "From"
   - **Tempo de Expiração**: 5-1440 minutos (padrão 60)
   - **Habilitar Magic Links**: Liga/desliga funcionalidade
3. Clique em **Salvar Configurações**

---

## Para Usuários Importados

### Primeiro Acesso

#### 1. Tentativa de Login (bloqueada)
Quando tentar fazer login com email e senha antiga do WordPress:
- Sistema irá rejeitar com mensagem:
  > "Sua conta requer troca de senha. Use o botão 'Recuperar senha legada' para receber um link por email."

#### 2. Solicitar Link de Recuperação

**Opção A: Na tela de login**
1. Clique em **"Recuperar senha legada"** (abaixo de "Criar conta")
2. Digite seu email no modal
3. Clique em **"Enviar Link"**
4. Aguarde email (verifique spam/lixo eletrônico)

**Opção B: Solicitar ao administrador**
- Peça ao admin para enviar o link via painel admin

#### 3. Verificar Email

Você receberá um email com:
- Assunto: **"Recuperação de acesso — primeiro login (troca de senha obrigatória)"**
- Botão destacado: **"Entrar e Trocar Minha Senha"**
- Link alternativo (caso botão não funcione)

**Importante:**
- Link expira em **1 hora**
- Pode ser usado **apenas uma vez**

#### 4. Clicar no Link

Ao clicar:
1. Página de verificação aparece
2. Token é validado automaticamente
3. Redirecionamento para página de troca de senha

#### 5. Criar Nova Senha

Na página `/auth/change-password`:
1. Digite sua **nova senha** (mínimo 6 caracteres)
2. Confirme a senha no campo **"Confirmar Nova Senha"**
3. Clique em **"Atualizar Senha"**

Validações:
- Senha deve ter pelo menos 6 caracteres
- As duas senhas devem ser idênticas

#### 6. Acesso Liberado

Após troca de senha:
- Você é redirecionado para a página inicial
- Flag `mustChangePassword` é removida
- Pode usar o sistema normalmente
- Login futuro usa a nova senha

---

## Fluxo Visual

```
┌─────────────────────────────────────────────────────────────────┐
│ ADMINISTRADOR                                                    │
├─────────────────────────────────────────────────────────────────┤
│ 1. Importa CSV WordPress                                        │
│    ↓                                                             │
│ 2. Usuários criados com mustChangePassword=true                 │
│    ↓                                                             │
│ 3. [OPCIONAL] Admin envia magic link manualmente                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ USUÁRIO                                                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. Tenta login com senha antiga                                 │
│    ↓ (bloqueado)                                                 │
│ 2. Clica "Recuperar senha legada"                               │
│    ↓                                                             │
│ 3. Recebe email com magic link                                  │
│    ↓                                                             │
│ 4. Clica no link do email                                       │
│    ↓                                                             │
│ 5. Token validado → redireciona para /auth/change-password      │
│    ↓                                                             │
│ 6. Cria nova senha                                               │
│    ↓                                                             │
│ 7. mustChangePassword removida                                  │
│    ↓                                                             │
│ 8. ✅ Acesso liberado!                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Perguntas Frequentes

### O que acontece se o link expirar?
- Solicite um novo link clicando em "Recuperar senha legada" novamente
- Ou peça ao admin para reenviar

### Posso usar o mesmo link duas vezes?
- Não. O link é de uso único por segurança
- Após usar, solicite um novo se necessário

### Não recebi o email. O que fazer?
1. Verifique a pasta de spam/lixo eletrônico
2. Aguarde alguns minutos (pode haver atraso)
3. Solicite novo link (sem limite de tentativas)
4. Entre em contato com o administrador

### Posso ainda fazer login com a senha antiga do WordPress?
- Não. Por segurança, a senha antiga não funciona
- Use o fluxo de magic link para criar uma nova senha

### O que é "mustChangePassword"?
- É uma flag interna do sistema que bloqueia seu acesso
- Removida automaticamente quando você cria uma nova senha
- Garante que contas importadas sejam seguras

---

## Segurança

### Para Administradores
- Magic links são armazenados como SHA256 (hash irreversível)
- Tokens expiram automaticamente (padrão 60min)
- Rate limiting evita spam no endpoint público (5 req/15min)
- Endpoint público não vaza existência de emails

### Para Usuários
- Link de uso único (não pode ser reutilizado)
- Expira em 1 hora
- Sessão temporária até troca de senha
- Senha antiga do WordPress não funciona (segurança)

---

## Suporte

### Problemas Comuns

**"Email inválido"**
- Verifique se digitou corretamente
- Email deve estar cadastrado no sistema

**"Link inválido ou expirado"**
- Token já foi usado ou expirou
- Solicite novo link

**"Senha deve ter pelo menos 6 caracteres"**
- Use uma senha mais longa

**"As senhas não coincidem"**
- Digite a mesma senha nos dois campos

### Contato
Entre em contato com o administrador do sistema em caso de dúvidas ou problemas técnicos.

---

**Versão**: 1.0  
**Última atualização**: 01/11/2025
