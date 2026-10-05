import type { SiteMessages } from '../messages';

const pt: SiteMessages = {
  meta: {
    title: 'TradeCanvas · Gráficos de trading em Canvas para a web',
    description:
      'TradeCanvas é uma biblioteca de gráficos de trading em Canvas2D: 17 tipos de gráfico, 95 indicadores, 69 ferramentas de desenho, dados ao vivo de exchanges, ordens no gráfico, replay e backtesting. Zero dependências, MIT.',
  },

  nav: {
    main: 'Navegação principal',
    docs: 'Docs',
    examples: 'Exemplos',
    playground: 'Playground',
    changelog: 'Notas de versão',
    toLight: 'Mudar para o tema claro',
    toDark: 'Mudar para o tema escuro',
    github: 'TradeCanvas no GitHub',
    openMenu: 'Abrir menu',
    closeMenu: 'Fechar menu',
    menu: 'Menu',
    language: 'Idioma',
  },

  footer: {
    tagline: 'Gráficos de trading em Canvas2D para a web. Zero dependências, licença MIT.',
    library: 'Biblioteca',
    packages: 'Pacotes',
    project: 'Projeto',
    gettingStarted: 'Primeiros passos',
    apiReference: 'Referência da API',
    examples: 'Exemplos',
    changelog: 'Notas de versão',
    issues: 'Issues',
    boGrid: 'bo-grid (grade de dados)',
    builtWith: 'Feito com TradeCanvas',
  },

  home: {
    release: 'renderizador com dois canvas, deslocamento livre',
    title: 'O motor de gráficos para apps de trading.',
    ledeHtml:
      'De candles a Renko, 95 indicadores, 69 ferramentas de desenho, dados ao vivo de exchanges e ordens no gráfico. Desenhado em Canvas2D, sem nenhuma dependência. Use o <code>ChartWidget</code> completo ou construa sua própria interface sobre o <code>Chart</code> headless.',
    getStarted: 'Começar',
    browseExamples: 'Ver exemplos',
    specsLabel: 'Números principais',
    specs: [
      'tipos de gráfico',
      'indicadores',
      'ferramentas de desenho',
      'dependências de runtime',
      'gzip, núcleo headless',
      'quadro de hover com 100k barras',
    ],
    hood: {
      eyebrow: 'Por dentro',
      title: 'Medido, documentado e pronto para você estender',
      subtitleHtml: 'O motor por trás do Laboratório de recursos. Todos os números abaixo podem ser reproduzidos com <code>pnpm bench</code>.',
      frameBudget: 'Orçamento por quadro',
      perf: [
        'tick ao vivo com 4 indicadores em 100k barras',
        'recálculo completo após trocar de ativo, 100k barras',
        'downsampling LTTB, 100k → 1.600 pontos',
        'quadro de hover, estável de 500 a 100k barras',
      ],
      perfFoot: 'Dois canvas empilhados: o hover redesenha só o de cima, que é leve. Cada renderizador percorre apenas as barras visíveis na tela.',
      gestures: 'Gestos',
      gestureList: [
        ['Arrastar', 'deslocar, inclusive além da última barra'],
        ['Rolar', 'zoom em torno do ponteiro'],
        ['Pinça', 'zoom em tela sensível ao toque'],
        ['Arrastar para a direita', 'barras antigas carregam conforme você avança'],
        ['Arrastar um eixo', 'mudar a escala dele'],
        ['Ctrl + arrastar', 'selecionar desenhos'],
        ['Shift + arrastar', 'medir'],
        ['Alt + clique', 'fixar um tooltip'],
      ],
    },
    capabilities: [
      {
        label: 'Widget',
        title: 'Uma chamada, interface de trading completa',
        text: 'O ChartWidget traz barra de ferramentas, barra lateral de desenho, lista de observação, alertas, árvore de objetos, janela de dados, replay e uma paleta de comandos (Ctrl+K), em 16 idiomas, do inglês e vietnamita ao chinês, japonês, coreano e árabe.',
      },
      {
        label: 'Dados',
        title: 'Qualquer feed de mercado',
        text: 'Adaptadores para Binance, Coinbase, Bybit e Kraken já incluídos; WebSocketAdapter e PollingAdapter para todo o resto. Barras antigas carregam conforme você rola para trás; reconecta sozinho e descarta trocas de ativo já superadas.',
      },
      {
        label: 'Trading',
        title: 'Ordens no gráfico',
        text: 'ExecutionAdapter com corretora simulada, ordens criadas arrastando, ordens bracket, linhas de stop-loss e take-profit arrastáveis, alertas para webhooks e notificações na área de trabalho.',
      },
      {
        label: 'Frameworks',
        title: 'React, Vue e Svelte',
        text: '@tradecanvas/react, /vue e /svelte envolvem o mesmo motor com props reativas e tipadas. A instância completa do Chart fica a uma ref de distância.',
      },
      {
        label: 'Plugins',
        title: 'Estenda cada camada',
        text: 'Registre indicadores próprios com update() incremental, ferramentas de desenho, tipos de gráfico e overlays, globalmente ou por gráfico.',
      },
      {
        label: 'Análise',
        title: 'Backtests ao lado do gráfico',
        text: 'Um Backtester barra a barra com bandas de Monte Carlo e um pipeline de indicadores em Web Worker que mantém a thread principal livre.',
      },
    ],
    quickstart: {
      eyebrow: 'Início rápido',
      title: 'O mesmo gráfico, cinco formas de começar',
      subtitle: 'O widget completo, um componente de framework ou o motor headless. Todos compartilham o mesmo renderizador.',
      tabs: 'Variante do início rápido',
    },
    closing: {
      title: 'Coloque um gráfico ao vivo no seu app hoje mesmo.',
      readDocs: 'Ler a documentação',
      star: 'Dar uma estrela no GitHub',
    },
  },

  lab: {
    eyebrow: 'Laboratório de recursos',
    title: 'Cada recurso em um gráfico ao vivo.',
    subtitleHtml:
      'Escolha uma cena. Cada uma abre o <code>ChartWidget</code> completo em um estado que mostra uma área em ação — depois é com você: arraste, desenhe e troque de ativo ou de tempo gráfico.',
    scenes: 'Cenas de recursos',
    widgetLanguage: 'Idioma do widget',
    widgetLook: 'Aparência do widget',
    widgetRenderer: 'Renderizador',
    idle: 'Role até aqui para iniciar o gráfico ao vivo',
    metricHint: 'Troque de ativo ou de tempo gráfico para cronometrar',
    metricSwitch: '→ {label}: {ms} · {bars} barras',
    metricSetData: 'setData({bars} barras): {ms}',
    metricLook: "setUI('{name}'): {ms}",
    metricRenderer: '{name}: {ms} por quadro ao arrastar',
    metricRendererMissing: 'Sem WebGL 2 aqui: desenhando com Canvas 2D',
    tryThis: 'Experimente',
  },

  scenes: {
    drawings: {
      title: 'Ferramentas de desenho',
      stat: '69 ferramentas',
      blurb:
        'Ferramentas de Fibonacci e Gann com níveis próprios, ondas de Elliott, padrões harmônicos, notas e pincéis. Clique duplo em um desenho abre suas configurações e clique direito, seu menu; os alertas acompanham as linhas de tendência, e a ferramenta de posição comprada/vendida calcula o tamanho da posição.',
      tryThis: [
        'Dê um clique duplo na retração de Fibonacci e edite seus níveis',
        'Clique direito em um desenho: avance-o, agrupe-o ou adicione um alerta',
        'Escolha o pincel ou a ferramenta de caminho; Enter encerra um caminho',
      ],
    },
    indicators: {
      title: 'Indicadores',
      stat: '95 integrados',
      blurb:
        'Sobrepostos e em painéis, calculados internamente, sem dependências matemáticas. Ticks ao vivo recalculam só a barra em formação — 0,001 ms por tick com quatro indicadores em 100k barras.',
      tryThis: [
        'Clique no botão Indicadores (ou Ctrl+K) e busque qualquer um dos 95',
        'Clique no nome de um indicador na legenda: parâmetros, cores e níveis',
        'Defina o campo “Source” de uma média móvel como a linha de outro indicador',
        'Arraste a linha entre os painéis para redimensioná-los; os botões no canto superior direito de um painel o movem, recolhem ou maximizam',
        'O ⋯ em uma linha da legenda move o indicador para o painel acima ou abaixo, ou para um painel próprio',
        'Menu Indicadores → Salvar indicadores como modelo…; Ctrl+Z também desfaz alterações nos indicadores',
        'Digite um número no gráfico (4, depois h, Enter) para trocar o tempo gráfico; Alt+T escolhe a linha de tendência',
      ],
    },
    trading: {
      title: 'Trading',
      stat: 'corretora simulada',
      blurb:
        'Ordens e posições que você opera direto do gráfico: arraste stops e alvos, cancele, feche ou inverta pela própria linha e veja cada execução marcada na sua barra. Uma boleta e o painel da conta ficam abaixo do gráfico; tudo passa por um ExecutionAdapter — aqui, a corretora simulada que vem junto.',
      tryThis: [
        'Clique em ⇅ na posição comprada aberta para invertê-la, ou em × para fechá-la — a execução aparece como uma marca na sua barra',
        'Clique com o botão direito abaixo do preço: compra limitada, venda stop ou nova ordem nesse preço',
        'O painel da conta, abaixo do gráfico, lista as posições com seu P&L, as ordens e o histórico',
        'Arraste as linhas de SL / TP da posição comprada aberta — a corretora as atualiza',
        'O + ao lado do eixo de preço oferece um alerta, uma ordem ou uma linha nesse preço',
      ],
    },
    workspace: {
      title: 'Área de trabalho',
      stat: 'vários gráficos',
      blurb:
        'Dois gráficos lado a lado, ligados pela mira — ou por ativo, tempo gráfico, tempo e desenhos, como você preferir. Salve toda a área de trabalho como um layout com nome e volte a ela quando quiser.',
      tryThis: [
        'Passe o mouse sobre um gráfico: o outro mostra o mesmo momento',
        'Ative “Tempo gráfico” na barra Sincronizar e depois mude o tempo gráfico de um dos gráficos',
        'Escolha quatro gráficos na barra; com “Ativo” sincronizado, os novos abrem com o ativo do gráfico selecionado',
        'Layout ▾ → Salvar como…, mude algo e abra o layout de novo (Ctrl+S salva)',
      ],
    },
    navigation: {
      title: 'Períodos e layouts',
      stat: '1D … Tudo',
      blurb:
        'Vá para um período ou uma data, inverta a escala de preço, fixe os tempos gráficos que você usa, aplique o mesmo indicador várias vezes — e recupere tudo de um layout salvo.',
      tryThis: [
        'Clique em 1M, 3M ou 6M abaixo do gráfico; Alt+G vai para uma data',
        'Alt+I deixa a escala de preço de cabeça para baixo; a escala logarítmica fica nas Configurações',
        'Configurações → Fuso horário: escolha Nova York ou Tóquio — eixo, viradas de dia e YTD acompanham, incluindo o horário de verão',
        'Configurações → Escala → Escala de preço à esquerda; a aba Estilo de uma EMA pode movê-la para essa escala',
        'Marque um tempo gráfico com estrela no menu ▾ ao lado dos botões de tempo gráfico',
        'Ative o botão ↻ na barra à esquerda para desenhar várias linhas seguidas; Ctrl+C / Ctrl+V copia as linhas',
      ],
    },
    history: {
      title: 'Volte no tempo rolando',
      stat: 'histórico paginado',
      blurb:
        'Barras antigas carregam, uma página por vez, conforme você arrasta em direção à mais antiga, e o que está na tela não sai do lugar. Afaste o zoom até caber tudo o que foi carregado: abaixo de um pixel por barra, os candles se fundem por coluna de pixels, e milhares de barras continuam legíveis.',
      tryThis: [
        'Arraste o gráfico para a direita: um aviso à esquerda mostra barras antigas carregando',
        'Role para afastar o zoom, além de algumas centenas de barras, até um quarto de pixel por barra',
        'Clique em Tudo abaixo do gráfico para enquadrar tudo o que já foi carregado',
        'Digite 7 ou 90 no menu ▾ de tempos gráficos: a Binance não oferece nenhum dos dois, então o gráfico os monta a partir de barras de 1m e 30m',
      ],
    },
    replay: {
      title: 'Replay de barras',
      stat: 'linha do tempo',
      blurb:
        'Percorra o histórico barra a barra para treinar leituras sem saber o que vem depois. Os dados ao vivo ficam em espera durante o replay; a escala de preço se ajusta a cada passo.',
      tryThis: [
        'Clique em Reproduzir ou avance e volte uma barra por vez com Shift+→ / Shift+←',
        'Clique em qualquer barra já revelada para levar o cursor até ela',
        '“Voltar ao tempo real” retorna à série ao vivo',
        'Escolha um Passo menor na barra de replay (15m) para ver cada barra se formar',
      ],
    },
    compare: {
      title: 'Comparar, spread, razão',
      stat: 'ativos',
      blurb:
        'ETH em uma escala de preço própria ao lado do BTC, e BTC ÷ ETH em um painel. Outros ativos se alinham ao gráfico pelo tempo; o spread ou a razão ganham legenda, rótulos de valor e alertas como qualquer indicador. A máxima mais alta e a mínima mais baixa na tela ficam marcadas.',
      tryThis: [
        'Abra a árvore de objetos e clique no + ao lado de Comparar: escolha um ativo e depois como comparar',
        'Clique com o botão direito no painel da razão para uma escala percentual',
        'Clique com o botão direito no gráfico: Exportar dados (CSV) leva junto todas as linhas dos indicadores',
        'Mude o tempo gráfico: as barras do outro ativo são buscadas de novo',
      ],
    },
    bonds: {
      title: 'Títulos em 32 avos',
      stat: 'formatos',
      blurb:
        'Um título cotado em 32 avos e meios 32 avos (110’165 é 110 e 16½ 32 avos) em barras de máxima-mínima. Todo preço no gráfico — eixo, mira, legenda, ordens, desenhos — aparece do mesmo jeito, e as marcas do eixo caem em frações inteiras.',
      tryThis: [
        'Passe o mouse: a mira e a legenda aparecem em 32 avos',
        'Configurações → Exibição → desative Horário estendido para ver só o pregão regular',
        'Mude para Renko ou Kagi e ajuste a caixa ou a reversão nas Configurações',
        'Desenhe uma linha horizontal: o rótulo dela também aparece em 32 avos',
      ],
    },
    subcent: {
      title: '16 idiomas, preços abaixo de um centavo',
      stat: 'i18n',
      blurb:
        'O widget inteiro em 16 idiomas — menus, configurações, ferramentas de desenho, diálogos, árabe e hebraico da direita para a esquerda — com números no formato de cada idioma. O PEPE é negociado perto de 0,000004: cada rótulo segue a precisão da escala de preço, e o eixo se alarga para caber.',
      tryThis: [
        'Escolha um idioma acima do gráfico: 日本語, 한국어, 简体中文, Deutsch…',
        'Ctrl+P busca todos os ativos da Binance, com nomes, enquanto você digita',
        'Abra as Configurações ou as ferramentas de desenho para ver a tradução',
        'Passe o mouse: o rótulo da mira mantém a precisão total no formato numérico do idioma',
      ],
    },
    looks: {
      title: 'Sua própria aparência',
      stat: '3 predefinições',
      blurb:
        'As formas e os tamanhos do widget são tokens: cantos, altura dos controles, tipografia, bordas, sombras, o jeito de mostrar um botão selecionado, barras fixas ou flutuantes. Comece pelo Studio, Terminal ou Capsule e mude o que quiser; os rótulos de preço do gráfico usam os mesmos cantos.',
      tryThis: [
        'Troque a aparência acima do gráfico: ela muda na hora, nada é reconstruído',
        'Abra as Configurações, um menu ou as ferramentas de desenho em cada aparência',
        'O Capsule faz a barra de ferramentas e as ferramentas de desenho flutuarem como ilhas, com rótulos de preço em formato de pílula',
        'O Terminal é denso e quadrado: rótulos em maiúsculas e uma linha sob o tempo gráfico selecionado',
      ],
    },
    markets: {
      title: 'Listas de observação e mercado',
      stat: 'cotações ao vivo',
      blurb:
        'Listas de ativos com cotações ao vivo da fonte de dados, um painel com o preço do ativo, o status do mercado e os números do dia, e gráficos de ticks: uma barra a cada 100 negócios.',
      tryThis: [
        'Abra o menu da lista de observação: troque para Memes, crie sua própria lista e renomeie-a',
        'Adicione um ativo com +, arraste as linhas para reordená-las ou pressione Delete em uma delas',
        'Digite 100T no gráfico para ter uma barra a cada 100 negócios e depois 1m para voltar',
        'Passe o mouse sobre o gráfico para ver os botões de zoom e rolagem na parte de baixo',
      ],
    },
    bigdata: {
      title: '200.000 barras',
      stat: 'desempenho',
      blurb:
        'Duzentas mil barras de 1 minuto com quatro indicadores. A renderização toca só as barras visíveis; tempos gráficos maiores são reamostrados localmente, atrás de um véu de carregamento quando isso leva mais do que alguns quadros.',
      tryThis: [
        'Alterne entre Canvas 2D e WebGL acima do gráfico: cada troca mede um breve arrasto',
        'Mude para 1H, 4H e volte para 1m — os tempos aparecem abaixo do gráfico',
        'Afaste o zoom ao máximo e desloque: o custo por quadro continua estável',
        'Adicione outro indicador e observe o tempo da troca',
      ],
    },
    heatmap: {
      title: 'Heatmap de liquidez',
      stat: '240 × 80 células',
      blurb:
        'Duzentos e quarenta instantâneos do livro de ofertas, com 80 níveis de preço cada, como um heatmap atrás das velas: o volume em espera acende nível a nível, compras em verde e vendas em vermelho, e as paredes que persistem se destacam. Com WebGL, as 19.200 células são desenhadas na GPU sob as barras.',
      tryThis: [
        'Alterne entre Canvas 2D e WebGL acima do gráfico: cada troca mede um breve arrasto',
        'Procure as linhas brilhantes: paredes de volume que ficam num preço ao longo do tempo',
        'Aproxime uma parede e arraste de um lado para o outro: as células acompanham as barras',
      ],
    },
    switching: {
      title: 'Trocas em rede lenta',
      stat: '+1,2 s de latência',
      blurb:
        'Aqui, cada requisição de histórico atrasa 1,2 s. O gráfico anterior continua na tela e só recebe o véu quando uma troca passa de 200 ms; cliques rápidos nunca deixam uma resposta desatualizada vencer.',
      tryThis: [
        'Clique em vários ativos rapidamente — só o último chega',
        'Troque o tempo gráfico e veja o véu aparecer e sumir',
        'Compare com a cena Indicadores: trocas rápidas nunca piscam',
      ],
    },
  },

  gallery: {
    eyebrow: 'Tipos de gráfico',
    title: 'Todos os tipos de gráfico, ao vivo na página',
    subtitleHtml:
      'Cada bloco é uma instância real de <code>Chart</code>, não uma imagem. Arraste para deslocar, role para dar zoom e passe o mouse para ver a mira; cada bloco responde de forma independente.',
    tiles: {
      candlestick: { name: 'Candles', tag: 'OHLC' },
      heikinAshi: { name: 'Heikin-Ashi', tag: 'Tendência' },
      area: { name: 'Área', tag: 'Fechamento' },
      baseline: { name: 'Linha de base', tag: 'Acima / abaixo' },
      bar: { name: 'Barras OHLC', tag: 'Clássico' },
      stepLine: { name: 'Linha em degraus', tag: 'Discreto' },
    },
  },

  finance: {
    eyebrow: 'Gráficos financeiros',
    title: 'Além dos candles',
    subtitle: 'Sparklines, curvas de patrimônio, profundidade do livro de ofertas, mapas de calor por setor, cascatas e medidores para portfólios e KPIs.',
    portfolio: 'Desempenho do portfólio',
    depth: 'Profundidade do livro de ofertas',
    heatmap: 'Mapa de calor do mercado cripto',
    pnl: 'Atribuição de P&L',
    fearGreed: 'Índice de Medo e Ganância',
    waterfall: {
      start: 'Início',
      btcLong: 'BTC comprado',
      ethShort: 'ETH vendido',
      solLong: 'SOL comprado',
      fees: 'Taxas',
      end: 'Fim',
    },
    zones: {
      extremeFear: 'Medo extremo',
      fear: 'Medo',
      neutral: 'Neutro',
      greed: 'Ganância',
      extremeGreed: 'Ganância extrema',
    },
  },

  terminal: {
    symbol: 'Ativo',
    timeframe: 'Tempo gráfico',
    chartType: 'Tipo de gráfico',
    types: {
      candlestick: 'Candles',
      heikinAshi: 'Heikin-Ashi',
      area: 'Área',
      bar: 'Barras',
      baseline: 'Linha de base',
    },
    unavailable: 'Feed ao vivo indisponível: {error}',
    live: 'AO VIVO',
    offline: 'OFFLINE',
    connecting: 'CONECTANDO',
    hints: [
      ['Arrastar', 'deslocar'],
      ['Rolar', 'zoom'],
      ['Arrastar eixo', 'escala'],
    ],
  },

  copy: {
    copy: 'COPIAR',
    copied: 'COPIADO',
    copiedAnnouncement: 'Copiado para a área de transferência',
    copyLabel: 'Copiar {label}',
    copyCode: 'Copiar código',
    codeSample: 'Exemplo de código',
    packageManager: 'Gerenciador de pacotes',
    copyInstall: 'Copiar comando de instalação',
  },

  examples: {
    metaTitle: 'Exemplos · TradeCanvas',
    description: 'Exemplos ao vivo no StackBlitz para Vanilla JS, React, Vue, Svelte, o ChartWidget e dashboards financeiros.',
    eyebrow: 'Exemplos · StackBlitz',
    title: 'Exemplos',
    subtitleHtml:
      'Sandboxes ao vivo para fazer fork com um clique. Cada um abre no StackBlitz com os pacotes 1.x mais recentes já configurados. Para testar os recursos sem configurar nada, use o <a href="{lab}">Laboratório de recursos</a> na página inicial.',
    open: 'Abrir {title} no StackBlitz',
    items: {
      vanilla: {
        title: 'Vanilla JS',
        blurb: 'O Chart headless: stream ao vivo da Binance, Bollinger + RSI e as ferramentas de desenho na sua própria interface.',
      },
      widget: {
        title: 'ChartWidget',
        blurb: 'A interface de trading completa em uma chamada: barra de ferramentas, 69 ferramentas de desenho, lista de observação, trading, replay, em 16 idiomas.',
      },
      react: {
        title: 'React',
        blurb: '@tradecanvas/react — props reativas e tipadas, o Chart subjacente por meio de uma ref.',
      },
      vue: {
        title: 'Vue 3',
        blurb: '@tradecanvas/vue — script setup, props reativas, o Chart via @ready.',
      },
      svelte: {
        title: 'Svelte 5',
        blurb: '@tradecanvas/svelte — runes, props reativas, bind:chart.',
      },
      finance: {
        title: 'Dashboard financeiro',
        blurb: 'Renderizadores de sparkline, medidor, mapa de calor, profundidade e curva de patrimônio em um só layout.',
      },
    },
  },

  playground: {
    metaTitle: 'Playground · TradeCanvas',
    description: 'Faça fork de um sandbox interativo do TradeCanvas no StackBlitz e comece a programar.',
    eyebrow: 'Playground · StackBlitz',
    title: 'Playground',
    subtitle: 'Um sandbox editável no StackBlitz com o ChartWidget já conectado a dados ao vivo da Binance.',
    launch: 'Abrir o playground',
    more: 'Mais exemplos',
    insideTitle: 'O que vem dentro',
    insideHtml:
      'Um projeto mínimo com Vite + TypeScript e um único arquivo, <code>src/main.ts</code>, que monta o <code>ChartWidget</code> e conecta um <code>BinanceAdapter</code>.',
  },

  changelog: {
    metaTitle: 'Notas de versão — TradeCanvas',
    description: 'As notas de cada versão do TradeCanvas.',
    englishOnly: 'As notas de versão são escritas em inglês.',
  },

  backtest: {
    title: 'Backtest ao vivo — cruzamento SMA(10/30)',
    subtitle: '365 dias de preços sintéticos, capital inicial de $10k, comissão de 0,05%, slippage de 0,03%.',
    play: 'Reproduzir',
    pause: 'Pausar',
    replay: 'Repetir',
    end: 'Fim',
    running: 'Executando o backtest…',
    failed: 'Falhou: {error}',
    bar: 'Barra {index}/{total}',
    totalReturn: 'Retorno total',
    maxDrawdown: 'DD máx.',
    winRate: 'Taxa de acerto',
    profitFactor: 'Fator de lucro',
    trades: 'Operações',
  },

  error: {
    notFound: 'Página não encontrada',
    notFoundText: 'Esta página não existe ou foi movida.',
    other: 'Algo deu errado',
    otherText: 'Não foi possível exibir a página. Tente de novo ou comece pela página inicial.',
    home: 'Voltar para o início',
    docs: 'Abrir a documentação',
  },

  docs: {
    titleSuffix: 'Documentação do TradeCanvas',
    navLabel: 'Navegação da documentação',
    groups: {
      start: 'Primeiros passos',
      chart: 'Gráfico',
      trading: 'Trading',
    },
    pages: {
      'getting-started': 'Primeiros passos',
      frameworks: 'Frameworks',
      embed: 'Widget incorporável',
      api: 'Referência da API',
      styling: 'Aparência',
      'chart-types': 'Tipos de gráfico',
      indicators: 'Indicadores',
      'drawing-tools': 'Ferramentas de desenho',
      plugins: 'Plugins',
      performance: 'Desempenho',
      trading: 'Camada de trading',
      finance: 'Gráficos financeiros',
      realtime: 'Tempo real e replay',
      analytics: 'Análise',
    },
    notTranslated: 'Esta página ainda não foi traduzida, por isso aparece em inglês.',
  },
};

export default pt;
