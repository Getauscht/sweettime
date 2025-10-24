# Documentação das Páginas - StoryVerse

## Estrutura de Páginas Criadas

### 1. **Componente Header Reutilizável** (`/src/components/Header.tsx`)

Componente de navegação global com as seguintes funcionalidades:

#### Recursos Desktop:
- Logo e marca "StoryVerse"
- Links de navegação: Home, Browse, Genres, New, Popular, Library, For You
- Barra de busca
- Ícones de bookmark e notificações (quando autenticado)
- Avatar do usuário com link para perfil

#### Recursos Mobile:
- Menu hambúrguer que abre sidebar lateral
- Sidebar cobre a maior parte da tela com overlay escuro
- Informações do usuário no topo do menu
- Barra de busca dedicada
- Links de navegação adaptados para mobile
- Botões de ação no rodapé

#### Uso:
```tsx
import Header from '@/components/Header'

export default function MyPage() {
  return (
    <div>
      <Header />
      {/* Seu conteúdo aqui */}
    </div>
  )
}
```

---

### 2. **Página Inicial** (`/src/app/page.tsx`)

Página principal do site com:
- **Hero Section**: Carrossel rotativo automático com 3 webtoons em destaque
- **Recently Updated**: Grid de 6 webtoons atualizados recentemente
- **Genres**: Filtros de gênero clicáveis com grid de webtoons
- Totalmente responsiva
- Navegação integrada com links para páginas de webtoons

---

### 3. **Página de Perfil** (`/src/app/profile/page.tsx`)

Página de perfil do usuário com 4 abas:

#### Aba Notifications:
- Lista de notificações com ícones
- Opções para marcar como lida ou remover
- Botões "Mark all as read" e "Clear all"
- 3 tipos de notificações: capítulos, mensagens e atualizações do sistema

#### Aba Favorites:
- Grid de webtoons favoritos do usuário
- Cards clicáveis que levam para página do webtoon

#### Aba Reading History:
- Histórico de leitura com progresso
- Mostra último capítulo lido

#### Aba Reading Lists:
- Listas personalizadas de leitura
- Contador de histórias em cada lista

**Recursos:**
- Avatar grande centralizado
- Informações do perfil
- Botão "Edit Profile"
- Sistema de abas elegante
- Requer autenticação (redireciona para login se não autenticado)

---

### 4. **Página do Webtoon** (`/src/app/webtoon/[id]/page.tsx`)

Página de detalhes de um webtoon específico:

#### Seções:
- **Cover + Info**: Capa grande com informações do webtoon
- **Metadados**: Autor, gêneros, descrição completa
- **Estatísticas**: Seguidores, rating, número de capítulos
- **Botões de ação**: 
  - "Follow" (toggle)
  - "Read Now"
  - "Add to Favorites"

#### Tabela de Capítulos:
- Lista organizada de todos os capítulos
- Colunas: Número, Título, Data
- Clicável para ir para página de leitura
- Hover effect em cada linha

#### Similar Webtoons:
- Grid de 6 webtoons similares
- Clicáveis para navegar entre webtoons

---

### 5. **Página de Leitura** (`/src/app/webtoon/[id]/chapter/[chapter]/page.tsx`)

Página para ler capítulos:

#### Recursos:
- Header com navegação de retorno
- Área de leitura com painéis verticais
- Navegação entre capítulos (Previous/Next)
- Botões desabilitados quando apropriado
- Layout otimizado para leitura vertical
- Barra de navegação sticky no rodapé

---

### 6. **Página Browse** (`/src/app/browse/page.tsx`)

Navegação geral de todos os webtoons:
- Grid responsivo de 2-6 colunas
- 12 webtoons de exemplo
- Cards com rating e número de capítulos
- Hover effects

---

### 7. **Página Genres** (`/src/app/genres/page.tsx`)

Navegação por gêneros:
- **12 gêneros disponíveis**: Fantasy, Romance, Action, Comedy, Drama, Slice of Life, Sci-Fi, Horror, Mystery, Thriller, Historical, Sports
- Cards de gênero com emoji, nome e contador
- Seleção de gênero ativa
- Grid de webtoons do gênero selecionado
- Totalmente interativo

---

### 8. **Página Library** (`/src/app/library/page.tsx`)

Biblioteca pessoal do usuário:
- Lista de webtoons em andamento
- Barra de progresso para cada webtoon
- Informação do último capítulo lido
- Porcentagem de conclusão
- Requer autenticação

---

## Design System

### Cores:
- **Background principal**: `#1a1625` (roxo escuro)
- **Background secundário**: `#0f0b14` (sidebar mobile)
- **Accent primary**: `#a855f7` (roxo - purple-600)
- **Accent secondary**: `#ec4899` (rosa - pink-500)

### Tipografia:
- **Títulos**: Bold, tamanhos 2xl-5xl
- **Corpo**: Regular, tamanho sm-base
- **Opacidade de texto**: 
  - Principal: 100% (white)
  - Secundário: 60% (white/60)
  - Terciário: 40% (white/40)

### Componentes:
- **Botões**: Rounded-full, purple-600 background
- **Cards**: Rounded-lg, white/5 background, white/10 border
- **Inputs**: Rounded-full (search), white/5 background
- **Hover effects**: Transition-colors, scale animations

### Responsividade:
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (sm-lg)
- **Desktop**: > 1024px (lg+)

---

## Rotas da Aplicação

```
/                           → Página inicial
/profile                    → Perfil do usuário (requer auth)
/browse                     → Navegar todos webtoons
/genres                     → Navegação por gêneros
/library                    → Biblioteca pessoal (requer auth)
/webtoon/[id]              → Detalhes do webtoon
/webtoon/[id]/chapter/[n]  → Leitura de capítulo
/auth/login                → Login
/auth/register             → Registro
/dashboard                 → Dashboard (existente)
```

---

## Melhorias Implementadas

✅ Header reutilizável em todas as páginas
✅ Menu hambúrguer funcional para mobile com overlay
✅ Sistema de navegação completo
✅ Páginas de perfil com abas e notificações
✅ Página de webtoon com informações completas
✅ Sistema de leitura de capítulos
✅ Integração com autenticação NextAuth
✅ Design consistente em todas as páginas
✅ Responsividade completa
✅ Animações e transições suaves
✅ Custom scrollbar estilizado

---

## Próximos Passos Sugeridos

1. **Integração com banco de dados**:
   - Criar modelos Prisma para webtoons, capítulos, favoritos, etc.
   - Implementar APIs para CRUD de webtoons
   
2. **Sistema de busca**:
   - Implementar busca funcional
   - Filtros avançados
   
3. **Upload de conteúdo**:
   - Sistema para criadores enviarem webtoons
   - Upload de imagens de capítulos
   
4. **Sistema de comentários**:
   - Comentários em capítulos
   - Sistema de likes/dislikes
   
5. **Notificações em tempo real**:
   - WebSockets para notificações push
   - Sistema de seguir autores
   
6. **Analytics**:
   - Tracking de leitura
   - Estatísticas de visualizações

---

## Como Testar

1. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

2. Navegue pelas rotas:
   - `/` - Página inicial
   - `/profile` - Perfil (faça login primeiro)
   - `/browse` - Navegar webtoons
   - `/genres` - Ver gêneros
   - `/webtoon/1` - Ver detalhes de um webtoon
   - `/webtoon/1/chapter/1` - Ler capítulo

3. Teste o menu mobile:
   - Redimensione a janela para < 1024px
   - Clique no ícone hambúrguer
   - Navegue pelo menu lateral

---

## Dependências Utilizadas

- **Next.js 15**: Framework React
- **NextAuth**: Autenticação
- **Tailwind CSS 4**: Estilização
- **Radix UI**: Componentes primitivos (Avatar, Button, etc.)
- **Lucide React**: Ícones
- **TypeScript**: Type safety
