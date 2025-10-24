# 📖 Guia do Leitor de Capítulos Avançado

## Visão Geral

O **ChapterReader** é um componente sofisticado para leitura de webtoons/mangás com múltiplas opções de configuração e experiência imersiva.

## Funcionalidades

### 🎯 Controles Dinâmicos
- **Barra de controles que aparece/desaparece**: Clique na área de imagens para mostrar/ocultar os controles
- **Auto-hide**: Controles desaparecem automaticamente após 3 segundos de inatividade
- **Barra de progresso**: Mostra o progresso de leitura no modo livro

### 📚 Modos de Leitura

#### Modo Livro
- **1 página**: Exibe uma página por vez
- **2 páginas**: Exibe duas páginas lado a lado (estilo mangá tradicional)
- Navegação página por página com botões Anterior/Próximo

#### Modo Lista
- **Vertical**: Scroll vertical contínuo (ideal para webtoons)
- **Horizontal**: Scroll horizontal (estilo tradicional japonês)
- Todas as páginas carregadas de uma vez

### ⚙️ Configurações Completas

#### Sentido de Leitura
- **Esquerda → Direita** (LTR): Padrão ocidental
- **Direita → Esquerda** (RTL): Padrão de mangás japoneses

#### Posição do Menu
- **Esquerda**: Painel de configurações no canto esquerdo
- **Direita**: Painel de configurações no canto direito
- **Inferior**: Painel de configurações centralizado na parte inferior

#### Opções Visuais
- **Escala de Cinza**: Aplica filtro monocromático às imagens
- **Espaço entre Imagens**: Adiciona margem entre páginas no modo lista
- **Modo Tela Cheia**: Ativa/desativa fullscreen automático

## Como Usar

### Integração Básica

```tsx
import ChapterReader from '@/components/ChapterReader'

<ChapterReader
  chapterNumber={1}
  totalPages={8}
  onPrevious={() => router.push('/webtoon/1/chapter/0')}
  onNext={() => router.push('/webtoon/1/chapter/2')}
  canGoPrevious={true}
  canGoNext={true}
/>
```

### Props

| Prop | Tipo | Descrição |
|------|------|-----------|
| `chapterNumber` | `number` | Número do capítulo atual |
| `totalPages` | `number` | Total de páginas no capítulo |
| `onPrevious` | `() => void` | Callback ao ir para capítulo anterior |
| `onNext` | `() => void` | Callback ao ir para próximo capítulo |
| `canGoPrevious` | `boolean` | Se pode navegar para capítulo anterior |
| `canGoNext` | `boolean` | Se pode navegar para próximo capítulo |

## Estrutura de Controles

### Barra Inferior
```
[← Anterior] [Página X/Y] [Capítulo N] [⚙️ Configurações] [Próximo →]
```

### Painel de Configurações
- **Modo de Leitura**: Livro / Lista
- **Páginas por Tela**: 1 / 2 (apenas modo livro)
- **Direção da Lista**: Vertical / Horizontal (apenas modo lista)
- **Sentido de Leitura**: LTR / RTL
- **Posição do Menu**: Esquerda / Inferior / Direita
- **Opções Adicionais**: Checkboxes para escala de cinza, espaçamento, fullscreen

## Estados e Comportamentos

### Click para Mostrar/Ocultar
- Clique em qualquer lugar da área de leitura
- Controles aparecem por 3 segundos
- Novo clique reseta o timer

### Navegação Inteligente
- **Modo Livro**: Navega página por página, depois muda de capítulo
- **Modo Lista**: Navegação direta entre capítulos (sem paginação)

### Persistência de Configurações
Todas as configurações são mantidas no estado do componente durante a sessão. Para persistência entre sessões, adicione:

```tsx
// Salvar no localStorage
useEffect(() => {
  localStorage.setItem('readerConfig', JSON.stringify(config))
}, [config])

// Carregar do localStorage
useEffect(() => {
  const saved = localStorage.getItem('readerConfig')
  if (saved) setConfig(JSON.parse(saved))
}, [])
```

## Customização

### Cores e Tema
O componente usa as cores do design system:
- Background: `#1a1625`
- Cards: `#0f0b14`
- Accent: `purple-600` / `pink-500`

### Placeholder de Imagens
Atualmente usa emoji 📖 para demonstração. Para usar imagens reais:

```tsx
// Substitua o conteúdo de renderPages()
<img 
  src={`/api/chapters/${chapterNumber}/pages/${i}`}
  alt={`Page ${i}`}
  className={config.grayscale ? 'grayscale' : ''}
/>
```

## Atalhos de Teclado (Futuro)
Sugestões para implementação futura:
- `Espaço`: Próxima página
- `←/→`: Navegação de páginas
- `F`: Toggle fullscreen
- `G`: Toggle escala de cinza
- `C`: Abrir configurações

## Acessibilidade
- Botões com labels semânticos
- Controles com estados disabled apropriados
- Navegação via mouse e teclado
- Alto contraste no tema dark

## Performance
- Lazy loading de imagens (a implementar)
- Debounce no auto-hide dos controles
- Transições CSS suaves (300ms)
- Modo fullscreen nativo do navegador

## Exemplos de Uso

### Webtoon Vertical Tradicional
```tsx
// Config padrão para webtoons
readingMode: 'list'
listDirection: 'vertical'
spacing: true
```

### Mangá Japonês
```tsx
// Config para mangá tradicional
readingMode: 'book'
pagesPerView: 2
readingDirection: 'rtl'
```

### Leitura Imersiva
```tsx
// Config para máxima imersão
fullscreen: true
grayscale: false (ou true para noir)
menuPosition: 'bottom'
```

## Troubleshooting

### Controles não aparecem
- Verifique se `showControls` está sendo alterado no onClick
- Confirme que o z-index da barra está correto (z-50)

### Fullscreen não funciona
- Alguns navegadores requerem interação do usuário
- iOS Safari tem suporte limitado a fullscreen

### Imagens não carregam
- Verifique o path das imagens na função `renderPages()`
- Confirme que a API está retornando os dados corretos

## Roadmap

- [ ] Lazy loading de imagens
- [ ] Atalhos de teclado
- [ ] Zoom nas imagens
- [ ] Marcador de página automático
- [ ] Modo noturno adicional (sepia)
- [ ] Ajuste de brilho/contraste
- [ ] Preload de próximo capítulo
- [ ] Histórico de leitura
- [ ] Bookmarks em páginas específicas
