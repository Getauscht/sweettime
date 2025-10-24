# Guia de Teste - Sistema de Leitura

## 🚀 Como Testar as Novas Funcionalidades

### Pré-requisitos

1. Certifique-se de que o banco de dados está rodando:
   ```bash
   docker-compose up -d
   ```

2. Execute as migrações (já feito):
   ```bash
   npm run db:push
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Acesse: http://localhost:3000

---

## 1. Testando Página de Detalhes do Webtoon

### Passos:
1. Na homepage, clique em qualquer webtoon dos carrosséis
2. Você será redirecionado para `/webtoon/[slug]`
3. Verifique:
   - ✅ Capa do webtoon aparece
   - ✅ Título, autor, descrição estão visíveis
   - ✅ Gêneros aparecem como badges clicáveis
   - ✅ Estatísticas (views, likes, rating) estão corretas
   - ✅ Lista de capítulos recentes aparece
   - ✅ Botão "Favoritar" aparece

### Testando Favoritos:
1. **SEM login:** Clique em "Favoritar" → deve redirecionar para `/auth/login`
2. **COM login:** 
   - Clique em "Favoritar" → botão deve mudar para "Favoritado" (rosa)
   - Clique novamente → deve voltar para "Favoritar" (outline)
   - Verifique em `/library` na aba "Favoritos"

### Testando Follow:
1. **SEM login:** Clique em "Seguir Autor" → deve redirecionar para `/auth/login`
2. **COM login:**
   - Clique em "Seguir Autor" → botão deve mudar para "Seguindo"
   - Clique novamente → deve voltar para "Seguir Autor"
   - Verifique em `/library` na aba "Seguindo"

---

## 2. Testando Leitura de Capítulo

### Passos:
1. Na página do webtoon, clique em qualquer capítulo
2. Você será redirecionado para `/webtoon/[slug]/chapter/[number]`
3. Verifique:
   - ✅ Header fixo com navegação
   - ✅ Conteúdo markdown renderizado corretamente
   - ✅ Botões "Anterior" e "Próximo" funcionam
   - ✅ Botão "Todos os Capítulos" volta para página do webtoon
   - ✅ Botão "Home" volta para homepage

### Testando Markdown:
Se o capítulo tiver markdown, teste:
- Títulos (# ## ###)
- **Negrito** e *itálico*
- Listas (com - ou 1.)
- Links
- Imagens
- Blocos de código
- Citações (>)

### Testando Histórico de Leitura:
1. Role a página do capítulo
2. Abra `/library`
3. Verifique na aba "Continue Lendo":
   - ✅ Capítulo aparece na lista
   - ✅ Barra de progresso reflete o % lido
   - ✅ Data de última leitura está correta

**IMPORTANTE:** Funciona mesmo sem login! O histórico usa sessionId no localStorage.

---

## 3. Testando Sistema de Comentários

### Passos:
1. Na página do webtoon, role até a seção "Comentários"
2. **SEM login:** 
   - ✅ Deve mostrar "Faça login para comentar"
   - Clique no botão → redireciona para `/auth/login`
3. **COM login:**
   - ✅ Deve mostrar campo de comentário
   - Digite um comentário
   - Clique em "Comentar"
   - ✅ Comentário aparece na lista abaixo

---

## 4. Testando Sistema de Menções

### Passos (requer login):
1. Na página do webtoon, vá até "Comentários"
2. No campo de comentário, digite `@`
3. Verifique:
   - ✅ Nada acontece ainda (precisa de 2+ caracteres)
4. Digite `@u` ou `@admin` ou qualquer nome
5. Verifique:
   - ✅ Dropdown aparece com sugestões de usuários
   - ✅ Mostra avatar, nome e email
   - ✅ Destaque visual ao passar o mouse
6. Use setas do teclado:
   - ✅ ↓ (seta baixo) seleciona próximo
   - ✅ ↑ (seta cima) seleciona anterior
   - ✅ Enter insere o usuário selecionado
   - ✅ Esc fecha o dropdown
7. Clique em um usuário no dropdown:
   - ✅ Nome do usuário é inserido no texto
   - ✅ Dropdown fecha
8. Envie o comentário:
   - ✅ Comentário aparece na lista
   - ✅ Mostra "Mencionou: [nome]" abaixo do comentário

### Verificar Notificações:
1. Faça login com o usuário que foi mencionado
2. Clique no sino de notificações no header
3. ✅ Deve ter uma notificação "Você foi mencionado"

---

## 5. Testando Biblioteca

### Passos:
1. Acesse `/library`
2. Verifique as 3 abas:

### Aba "Continue Lendo":
- ✅ Mostra capítulos que você leu
- ✅ Exibe capa, título, capítulo atual
- ✅ Barra de progresso (%)
- ✅ Data de última leitura
- ✅ Clique leva para o capítulo
- ✅ **Funciona sem login!**

### Aba "Favoritos" (requer login):
- ✅ Mostra webtoons favoritados em grid
- ✅ Exibe capa, título, autor
- ✅ Total de capítulos e status
- ✅ Clique leva para página do webtoon

### Aba "Seguindo" (requer login):
- ✅ Mostra autores seguidos
- ✅ Exibe avatar (inicial), nome
- ✅ Total de obras do autor
- ✅ Bio do autor (se disponível)
- ✅ Clique leva para página do autor (quando implementada)

---

## 6. Testando Busca de Usuários

### Via API (Postman/Thunder Client):
```bash
GET http://localhost:3000/api/users/search?query=admin
```

Deve retornar:
```json
{
  "users": [
    {
      "id": "...",
      "name": "Admin User",
      "email": "admin@example.com",
      "image": null
    }
  ]
}
```

---

## 7. Testando APIs Diretamente

### Favoritar Webtoon:
```bash
# Verificar status
GET /api/webtoons/[webtoonId]/favorite

# Adicionar
POST /api/webtoons/[webtoonId]/favorite

# Remover
DELETE /api/webtoons/[webtoonId]/favorite
```

### Seguir Autor:
```bash
# Verificar status
GET /api/authors/[authorId]/follow

# Seguir
POST /api/authors/[authorId]/follow

# Parar de seguir
DELETE /api/authors/[authorId]/follow
```

### Histórico de Leitura:
```bash
# Listar (logado)
GET /api/reading-history

# Listar (anônimo)
GET /api/reading-history?sessionId=anon_123456789

# Atualizar progresso
POST /api/reading-history
Content-Type: application/json
{
  "webtoonId": "...",
  "chapterId": "...",
  "progress": 50,
  "sessionId": "anon_123456789" // opcional se logado
}
```

### Comentários:
```bash
# Listar comentários de um webtoon
GET /api/comments?webtoonId=[id]

# Listar comentários de um capítulo
GET /api/comments?chapterId=[id]

# Criar comentário
POST /api/comments
Content-Type: application/json
{
  "webtoonId": "...",
  "content": "Ótimo webtoon! @admin você viu isso?",
  "mentions": ["userId1", "userId2"]
}
```

---

## 🐛 Troubleshooting

### Erro: "Chapter not found"
- Verifique se o webtoon tem capítulos no banco
- Execute `npm run db:seed` para popular dados

### Markdown não renderiza
- Verifique se o conteúdo do capítulo está em formato correto
- Deve ser string ou JSON com `{markdown: "..."}`

### Histórico não aparece
- Verifique o sessionId no localStorage (DevTools → Application → Local Storage)
- Tente fazer login e verificar novamente

### Menções não funcionam
- Verifique se há usuários no banco
- Busca precisa de 2+ caracteres
- Certifique-se de que está logado

### Favoritos/Follows não salvam
- Verifique se está logado
- Abra DevTools → Network para ver erros de API
- Verifique se o banco está sincronizado: `npm run db:push`

---

## ✅ Checklist de Testes

- [ ] Página de webtoon carrega com dados reais
- [ ] Botão de favoritar funciona
- [ ] Botão de seguir autor funciona
- [ ] Lista de capítulos aparece
- [ ] Clicar em capítulo abre a leitura
- [ ] Markdown renderiza corretamente
- [ ] Navegação entre capítulos funciona
- [ ] Histórico de leitura registra progresso
- [ ] Histórico aparece em /library
- [ ] Comentários podem ser criados
- [ ] Sistema de menção funciona (@user)
- [ ] Dropdown de menção aparece ao digitar
- [ ] Navegação por teclado funciona
- [ ] Notificações são criadas para mencionados
- [ ] Biblioteca mostra 3 abas
- [ ] Favoritos aparecem na biblioteca
- [ ] Autores seguidos aparecem na biblioteca
- [ ] Tudo funciona sem login (exceto favoritos/follows/comentários)

---

## 📊 Dados de Teste

Se não houver dados suficientes, execute:

```bash
npm run db:seed
```

Ou crie manualmente:
1. **Webtoon:** Via Creator Studio ou Admin Panel
2. **Capítulos:** Via Creator Studio
3. **Usuários:** Via registro ou admin seed
4. **Comentários:** Via interface do webtoon

---

## 🎉 Tudo Funcionando?

Se todos os testes passarem, você tem um sistema completo de:
- ✅ Visualização de webtoons
- ✅ Leitura de capítulos com markdown
- ✅ Favoritos e follows
- ✅ Histórico de leitura (anônimo e logado)
- ✅ Comentários com menções
- ✅ Biblioteca pessoal
- ✅ Sistema de notificações

Parabéns! 🚀
