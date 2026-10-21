import type { SiteMessages } from '../messages';

const pt: SiteMessages = {
  meta: {
    title: 'TradeCanvas · Gráficos de trading em Canvas para a web',
    description:
      'TradeCanvas é uma biblioteca de gráficos de trading para a web, desenhada com Canvas 2D ou WebGL: 18 tipos de gráfico, 134 indicadores, 69 ferramentas de desenho, dados ao vivo de exchanges, ordens no gráfico, replay e backtesting, em 30 idiomas. Sem dependências, MIT.',
  },

  nav: {
    main: 'Navegação principal',
    docs: 'Docs',
    examples: 'Exemplos',
    playground: 'Playground',
    changelog: 'Notas de versão',
    audit: 'Auditoria',
    business: 'Empresas',
    toLight: 'Mudar para o tema claro',
    toDark: 'Mudar para o tema escuro',
    github: 'TradeCanvas no GitHub',
    sponsor: 'Patrocinar',
    sponsorLabel: 'Patrocine o TradeCanvas no GitHub',
    openMenu: 'Abrir menu',
    closeMenu: 'Fechar menu',
    menu: 'Menu',
    language: 'Idioma',
  },

  footer: {
    tagline: 'Gráficos de trading para a web, desenhados com Canvas 2D ou WebGL. Sem dependências, licença MIT.',
    library: 'Biblioteca',
    packages: 'Pacotes',
    project: 'Projeto',
    gettingStarted: 'Primeiros passos',
    apiReference: 'Referência da API',
    examples: 'Exemplos',
    changelog: 'Notas de versão',
    audit: 'Auditoria do sistema',
    business: 'Para empresas',
    issues: 'Issues',
    discussions: 'Discussões',
    boGrid: 'bo-grid (grade de dados)',
    builtWith: 'Feito com TradeCanvas',
  },

  home: {
    release: 'renderizador WebGL, 30 idiomas',
    title: 'O motor de gráficos para apps de trading.',
    ledeHtml:
      'De candles a Renko, 134 indicadores, 69 ferramentas de desenho, dados ao vivo de exchanges e ordens no gráfico. Desenhado com Canvas 2D ou WebGL, sem nenhuma dependência. Use o <code>ChartWidget</code> completo ou construa sua própria interface sobre o <code>Chart</code> headless.',
    getStarted: 'Começar',
    browseExamples: 'Ver exemplos',
    specsLabel: 'Números principais',
    specs: [
      'indicadores',
      'ferramentas de desenho',
      'tipos de gráfico',
      'idiomas do widget',
      'barras a 60 fps com WebGL',
      'dependências de terceiros em runtime',
    ],
    tape: 'Preços ao vivo da Binance',
    tapePause: 'Pausar os preços',
    tapePlay: 'Retomar os preços',
    story: {
      eyebrow: 'Da primeira olhada à ordem executada',
      title: 'Um gráfico para a operação inteira',
      subtitle: 'Quatro gráficos ao vivo, cada um trabalhando na sua parte. Arraste, dê zoom, desenhe sobre eles.',
      chapters: [
        {
          title: 'Ler o mercado',
          text: 'Bandas, médias e osciladores sobre os candles, níveis de Fibonacci e linhas de tendência por cima, cada um com suas configurações e alertas.',
          points: [
            '134 indicadores, um sobre o outro, como uma média do RSI',
            '69 ferramentas de desenho com ímã, grupos e desfazer',
            'Alertas de preço, de linhas e de cruzamentos de indicadores',
          ],
        },
        {
          title: 'Operar no gráfico',
          text: 'Ordens, posições e seus brackets ficam na escala de preços. Arraste um stop para movê-lo; o broker simulado as executa, então você constrói antes de conectar.',
          points: [
            'Arraste para criar uma ordem, arraste o stop-loss e o take-profit para movê-los',
            'Marcas de execução e lucro e prejuízo no gráfico',
            'Seu broker se conecta por um único adaptador',
          ],
        },
        {
          title: 'Reviver o passado',
          text: 'Percorra o histórico candle a candle ou deixe correr: indicadores, desenhos e ordens simuladas seguem o preço reproduzido.',
          points: [
            'Qualquer candle inicial, qualquer velocidade',
            'Cada candle pode se formar passo a passo a partir de outros menores',
            'Opere o replay com o broker simulado',
          ],
        },
        {
          title: 'Escala sem engasgos',
          text: 'Aqui, 200.000 barras com quatro indicadores, deslizando sozinhas. Troque o renderizador e veja o tempo por quadro: com WebGL, a GPU desenha os candles e as linhas.',
          points: [
            '1.000.000 de barras com zoom afastado a 60 fps com WebGL',
            'Canvas 2D onde não há WebGL, com a mesma aparência',
            'Só as barras na tela são desenhadas',
          ],
        },
      ],
      frameTime: '{ms} ms por quadro',
      panning: 'Desliza sozinho até você assumir',
      renderer: 'Renderizador',
      replaying: 'Reproduzindo',
    },
    trust: {
      label: 'Código aberto',
      downloads: '{n} downloads no npm por mês',
      license: 'licença {n}',
      dependencies: '{n} dependências de runtime',
      typescript: 'tipos {n} para toda a API',
    },
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
        text: 'O ChartWidget traz barra de ferramentas, barra lateral de desenho, lista de observação, alertas, árvore de objetos, janela de dados, replay e uma paleta de comandos (Ctrl+K), em 30 idiomas, do inglês e vietnamita ao chinês, japonês, coreano e árabe.',
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
      stat: '134 integrados',
      blurb:
        'Sobrepostos e em painéis, calculados internamente, sem dependências matemáticas. Ticks ao vivo recalculam só a barra em formação — 0,001 ms por tick com quatro indicadores em 100k barras.',
      tryThis: [
        'Clique no botão Indicadores (ou Ctrl+K) e busque qualquer um dos 134',
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
        'As marcas de compra e venda e a operação só aparecem quando o replay chega a elas',
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
    vnmarket: {
      title: 'Mercados do Vietnã',
      stat: 'HOSE · VN30F',
      blurb:
        'HOSE e os futuros do VN30 do jeito que as bolsas os operam: preços em variações de 10, 50 ou 100 dongs conforme a faixa de preço, o preço-teto, o preço-piso e o preço de referência do dia, lotes de 100 ações, as sessões de negociação no fuso horário do Vietnã e as cores do painel de cotações.',
      tryThis: [
        'Clique com o botão direito no gráfico: os preços oferecidos respeitam a variação mínima, 50 dongs para HPG',
        'Abra uma nova ordem no painel da conta: ela começa com 100 ações, e um preço acima do teto é recusado',
        'Mude para FPT (variações de 100 dongs) ou para o contrato VN30F (a partir das 8h45)',
        'As linhas roxa, ciano e amarela são o preço-teto, o preço-piso e o preço de referência',
      ],
    },
    priceboard: {
      title: 'Indicadores de tela de cotação',
      stat: '64 padrões',
      blurb:
        'Padrões de candles marcados no candle em que terminam, com o nome: engolfo, martelo, estrelas, três soldados, três corvos, 64 ao todo; os de reversão só contam depois da tendência que revertem. Abaixo do gráfico, a Psychological Line e o Volume Ratio, como as telas asiáticas mostram.',
      tryThis: [
        'Aproxime: cada seta mostra o nome curto do padrão',
        'Abra as configurações do indicador para ver também dojis e piões',
        'Mude para HPG ou para o contrato VN30F',
      ],
    },
    subcent: {
      title: '30 idiomas, preços abaixo de um centavo',
      stat: 'i18n',
      blurb:
        'O widget inteiro em 30 idiomas — menus, configurações, ferramentas de desenho, diálogos, árabe, hebraico e persa da direita para a esquerda — com números no formato de cada idioma. O PEPE é negociado perto de 0,000004: cada rótulo segue a precisão da escala de preço, e o eixo se alarga para caber.',
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
    overrides: {
      title: 'Overrides de estilo',
      stat: '101 chaves',
      blurb:
        'Qualquer parte da aparência do gráfico por chave, à parte do tema: a grade em cada direção, a cruz, os eixos, os painéis, a legenda, o último preço, o volume e as cores de cada tipo de gráfico. Aqui a grade vertical está desligada, a horizontal pontilhada, a cruz contínua, e a linha de sinal do MACD tracejada num painel com separador próprio.',
      tryThis: [
        'Troque o tipo de gráfico: barras e Heikin-Ashi usam as cores dos candles se não tiverem as suas',
        'Troque o tema do site: o que não tem override o acompanha',
        'Abra as Configurações: a aba Estilo define cada chave, inclusive as cores do tipo de gráfico em exibição; a aba Trading define as cores de ordens, marcadores e zonas, em Auto até você escolher uma',
      ],
    },
    parts: {
      title: 'Seu widget, suas peças',
      stat: '112 chaves',
      blurb:
        'Cada parte do widget tem uma chave, ligada até você desligar e alterável em execução: uma capacidade inteira (alertas, configurações, atalhos) ou um único lugar (um botão da barra, uma entrada de menu, uma seção de ferramentas de desenho). Seus próprios botões, menus e itens de status ficam nas barras do widget. Aqui o replay, duas seções de desenho e o download dos dados estão desligados, e a barra traz um menu de chaves.',
      tryThis: [
        'Abra “features” na barra e desligue e ligue partes',
        'O olho no pé da barra de desenho esconde a barra de ferramentas e a de status, e as traz de volta (Alt+X)',
        'Clique com o botão direito num desenho: a última entrada é da própria página',
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
        'Com o WebGL ligado, mude o tipo de gráfico para Linha de base, Kagi ou Ponto e figura: também são desenhados na GPU',
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
    subtitle: 'Sparklines, curvas de patrimônio, profundidade do livro de ofertas, mapas de mercado por setor, cascatas, medidores, barras, roscas, gráficos de dispersão, histogramas, calendários e matrizes de correlação para portfólios e KPIs.',
    portfolio: 'Desempenho do portfólio',
    depth: 'Profundidade do livro de ofertas',
    heatmap: 'Mapa de calor do mercado cripto',
    pnl: 'Atribuição de P&L',
    fearGreed: 'Índice de Medo e Ganância',
    flows: 'Compra líquida de estrangeiros, bilhões de dongs',
    flowSeries: 'Líquido',
    allocation: 'Alocação do portfólio',
    allocationTotal: 'Total',
    assets: { stocks: 'Ações', bonds: 'Títulos', cash: 'Caixa', gold: 'Ouro' },
    riskReturn: 'Bancos: risco e retorno',
    banks: 'Bancos',
    volatility: 'Volatilidade',
    yearReturn: 'Retorno em um ano',
    returns: 'Retornos diários',
    mean: 'Média',
    var: 'VaR 95%',
    calendar: 'Variação diária por pregão',
    sectorMap: 'Mapa do mercado por setor',
    sectors: { banks: 'Bancos', realEstate: 'Imobiliário', steel: 'Siderurgia', retail: 'Varejo', energy: 'Energia', tech: 'Tecnologia' },
    correlation: 'Ações de bancos: correlação dos retornos diários',
    counterClock: 'Curva anti-horária: preço contra volume, médias de 25 dias',
    avgVolume: 'Volume, média',
    avgPrice: 'Preço, média',
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

  engage: {
    click: 'Clique para usar o gráfico',
    tap: 'Toque para usar o gráfico',
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
    drawnWith: 'Desenhado com {renderer}',
    live: 'AO VIVO',
    offline: 'OFFLINE',
    connecting: 'CONECTANDO',
    hints: [
      ['Arrastar', 'deslocar'],
      ['Clique + rolar', 'zoom'],
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
        blurb: 'A interface de trading completa em uma chamada: barra de ferramentas, 69 ferramentas de desenho, lista de observação, trading, replay, em 30 idiomas.',
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

  audit: {
    metaTitle: 'Auditoria do sistema — TradeCanvas',
    description:
      'O que o TradeCanvas faz e com que velocidade: cada recurso por área, tempos por quadro em GPU integrada, o caminho dos dados, o tamanho do download, como ele é testado e os limites que conhecemos.',
    eyebrow: 'Auditoria do sistema',
    title: 'O que ele faz, e com que velocidade.',
    ledeHtml:
      'Tudo nesta página vem no <code>@tradecanvas/chart</code> {version}. Os tempos por quadro foram medidos no Chrome, em um notebook com GPU integrada (Intel UHD); <code>node scripts/bench-render.mjs</code>, no repositório, roda as mesmas cenas na sua máquina.',
    numbersTitle: 'Em números',
    numbers: [
      'tipos de gráfico',
      'indicadores integrados',
      'ferramentas de desenho',
      'idiomas do widget',
      'chaves de estilo',
      'chaves de recursos do widget',
      'dependências de terceiros em runtime',
      'testes unitários',
    ],

    perfTitle: 'Tempo por quadro',
    perfLede: 'Tempo para desenhar um quadro enquanto o gráfico desliza. 16,7 ms equivalem a 60 quadros por segundo.',
    perfChart: 'Gráfico',
    perfRatio: 'Proporção de pixels',
    perf: [
      '1600×900, 500 candles + 4 indicadores',
      '1600×900, zoom afastado em 200.000 barras + 4 indicadores',
      '1600×900, zoom afastado em 1.000.000 de barras + 4 indicadores',
      '1600×900, heatmap de profundidade, 240 instantâneos × 80 níveis',
      'Seis gráficos, cada um com 500 candles e 2 indicadores',
      '2560×1400, 2.000 candles + 4 indicadores',
      '2560×1400, 2.000 candles + 4 indicadores',
      '2560×1400, 2.000 candles + 4 indicadores',
    ],
    perfNoteHtml:
      'O Canvas 2D é o padrão. <code>renderer: \'webgl\'</code> (ou <code>\'auto\'</code>) desenha a área do gráfico com WebGL 2 e volta ao Canvas 2D onde falta WebGL 2 ou quando o contexto dele é perdido.',

    dataTitle: 'Caminho dos dados',
    data: [
      'Um tick ao vivo com Bandas de Bollinger, EMA, RSI e MACD em 100.000 barras',
      'Os mesmos quatro indicadores recalculados por inteiro em 100.000 barras',
      'Uma linha de 1.000.000 de pontos visíveis, reduzida para um quadro',
      'Um redesenho ao passar o mouse (mira, legenda)',
      'Uma troca de ativo ou de tempo gráfico só mostra o véu de carregamento depois de',
    ],

    sizeTitle: 'Tamanho do download',
    sizeLede: 'Minificado e com gzip, com tudo o que ele importa.',
    size: ['Chart, a API headless', 'ChartWidget, a interface completa', 'O renderizador WebGL, carregado no primeiro uso'],

    qualityTitle: 'Como é verificado',
    quality: [
      'Mais de 3.000 testes unitários nos sete pacotes rodam no CI a cada pull request.',
      'O renderizador WebGL desenha os candles nos mesmos pixels do dispositivo que o Canvas 2D; linhas e preenchimentos diferem só em alguns pixels de borda suavizados.',
      'O renderizador WebGL foi verificado no Chromium, no Firefox e no WebKit. Sem WebGL 2, ou quando o contexto dele é perdido, o gráfico segue com Canvas 2D.',
      'Os exemplos de código da documentação e da skill para agentes passam por checagem de tipos contra a API real.',
      'Os gráficos podem ser lidos por leitores de tela e usados pelo teclado; o widget fica da direita para a esquerda em árabe, hebraico e persa.',
    ],

    catalogTitle: 'Recursos',
    catalogLede: 'Filtre por área ou busque por nome ou API.',
    search: 'Buscar recursos',
    searchPlaceholder: 'replay, webgl, alerta…',
    all: 'Todas',
    count: '{shown} de {total}',
    colCapability: 'Recurso',
    colArea: 'Área',
    colDetail: 'Detalhes e API',
    areas: {
      chartTypes: 'Tipos de gráfico',
      rendering: 'Renderização',
      indicators: 'Indicadores',
      drawings: 'Ferramentas de desenho',
      scales: 'Escalas e tempo',
      data: 'Dados e tempo real',
      trading: 'Trading',
      alerts: 'Alertas e replay',
      workspace: 'Área de trabalho',
      customization: 'Personalização',
      access: 'Idiomas e acessibilidade',
      developers: 'Desenvolvedores',
    },
    catalog: {
      chartTypes: [
        { name: 'Candles, barras OHLC, linha, área, linha de base, Heikin-Ashi, candles vazados', detail: 'candlestick, bar, line, area, baseline, heikinAshi, hollowCandle' },
        { name: 'Renko, line break, Kagi, ponto e figura, barras de range', detail: 'Tamanho da caixa ou ATR, linhas para o rompimento, reversão em porcentagem ou em preço, range por barra' },
        { name: 'Candles de volume, Equivolume, área HLC, linha em degraus, linha com marcadores, máxima-mínima', detail: '18 tipos de gráfico no total' },
        { name: 'A série principal oculta', detail: 'Só ficam os indicadores e os desenhos' },
        { name: 'Gráficos para dashboards', detail: 'Barras (agrupadas, empilhadas, horizontais), rosca e pizza, dispersão e bolhas, histogramas, calendários, matrizes de correlação, mapas por setor, curvas anti-horárias, sparklines, medidores, mapas de calor e treemaps, cascatas, profundidade, curvas de patrimônio' },
      ],
      rendering: [
        { name: 'Canvas 2D ou WebGL 2', detail: "renderer: 'canvas' | 'webgl' | 'auto', setRenderer, o evento rendererChange" },
        { name: 'Um traço por coluna de pixels com zoom afastado', detail: 'Linhas, bandas e histogramas de indicadores abaixo de um pixel por barra' },
        { name: 'Um milhão de barras deslizando com suavidade', detail: 'Com quatro indicadores, em proporção de pixels 2' },
        { name: 'Heatmap de profundidade, perfil de volume e perfil de mercado na GPU', detail: 'pushDepthSnapshot(book, time)' },
        { name: 'Vários gráficos WebGL em uma página', detail: 'Até 8 (setMaxWebGLCharts); os demais desenham com Canvas 2D; voltam ao WebGL quando o contexto retorna' },
        { name: 'Nítido em qualquer escala de tela', detail: 'Candles, volume e desenhos em pixels do dispositivo a 100%, 125% e 200%' },
        { name: 'Sem dependências de terceiros em runtime', detail: 'Nada mais para instalar ou auditar' },
      ],
      indicators: [
        { name: '134 indicadores integrados', detail: 'Pivot points de seis tipos, MA Cross, correlação com outro ativo' },
        { name: 'Fonte de preço', detail: 'open, high, low, hl2, hlc3, ohlc4, hlcc4' },
        { name: 'Um indicador sobre outro indicador', detail: 'Como uma média móvel do RSI, atualizada a cada tick' },
        { name: 'Vários indicadores em um painel, movidos entre painéis', detail: 'moveIndicatorToPane' },
        { name: 'O mesmo indicador várias vezes', detail: 'EMA 20 e EMA 50 lado a lado' },
        { name: 'Níveis e limiares', detail: 'RSI 30/70, CCI ±100, salvos com o layout' },
        { name: 'Último valor no eixo', detail: 'No eixo de preço e no eixo de cada painel, na cor da linha' },
        { name: 'Painéis recolhidos, maximizados e reordenados', detail: 'Salvos com o layout' },
        { name: 'Modelos de indicadores', detail: 'Parâmetros, estilo, níveis e painel, salvos e aplicados juntos' },
        { name: 'Estilo e visibilidade de cada linha', detail: 'Uma linha oculta não estica a escala; setIndicatorDefaults' },
        { name: 'Delta de volume e CVD', detail: 'Estimados a partir das barras' },
        { name: 'Exportação dos valores dos indicadores', detail: 'CSV ou JSON, uma coluna por linha' },
        { name: 'Atualizações incrementais com ticks ao vivo', detail: 'update() recalcula só a barra em formação' },
      ],
      drawings: [
        { name: '69 ferramentas de desenho', detail: 'Linhas, canais, Fibonacci, Gann, pitchforks, ondas de Elliott, padrões, ciclos, projeções' },
        { name: 'Configurações próprias de cada ferramenta', detail: 'Estilo, propriedades e coordenadas na grade de preços do mercado' },
        { name: 'Posições compradas e vendidas', detail: 'Risco:retorno, quantidade a partir do risco em porcentagem ou em dinheiro' },
        { name: 'Alertas em um desenho', detail: 'Quando o preço cruza uma linha de tendência ou um canal como foi desenhado, inclusive em escala logarítmica' },
        { name: 'Ordem, grupos e modelos', detail: 'Trazer para frente, enviar para trás, agrupar, travar, ocultar' },
        { name: 'Notas, balões, setas, bandeiras, pincel, caminho, curva', detail: 'Desenho à mão livre e de vários pontos' },
        { name: 'VWAP ancorado e perfil de volume de intervalo fixo', detail: 'Leem as barras do gráfico' },
        { name: 'Borracha, zoom por área, ímã forte, atalhos de teclado', detail: 'Alt+T, Alt+H, Alt+J, Alt+V, Alt+C, Alt+F' },
      ],
      scales: [
        { name: 'Ir para uma data; períodos de 1D a Tudo', detail: 'Sem limite para afastar o zoom' },
        { name: 'Fusos horários IANA com horário de verão', detail: 'Ou o fuso da própria bolsa' },
        { name: 'Qualquer tempo gráfico, e barras de tick', detail: '7m, 90m, 2d montados a partir do que o feed fornece; 100T a partir dos negócios dele' },
        { name: 'Escalas à esquerda e à direita; logarítmica, invertida e percentual por painel', detail: 'A escala da esquerda para uma sobreposição ou uma cópia da escala de preço' },
        { name: 'Comparar ativos, spread e razão', detail: 'Na própria escala ou painel, alinhados pelo tempo' },
        { name: 'Horário estendido', detail: 'A partir dos horários de pregão do ativo' },
        { name: 'Formatos de preço e de hora', detail: 'priceFormat como função ou frações como 1/32; timeFormatter' },
        { name: 'A escala nas casas decimais e no passo de preço do ativo', detail: 'pricePrecision, minTick: uma ação que se move de 10 em 10 nunca mostra 21.705' },
        { name: 'Linhas de máxima e mínima, bid e ask', detail: 'Bid e ask a partir dos ticks do feed' },
        { name: 'Marcas de eventos no gráfico', detail: 'signalMarkerHover, signalMarkerClick' },
      ],
      data: [
        { name: 'Feeds prontos e os seus', detail: 'Binance, Bybit, Coinbase, Kraken, mock; WebSocketAdapter, PollingAdapter' },
        { name: 'Histórico mais antigo carregado ao rolar para a esquerda', detail: 'fetchHistoryBefore' },
        { name: 'Busca de ativos com detalhes', detail: 'searchSymbols, resolveSymbol: casas decimais, passo de preço, pregões, fuso horário' },
        { name: 'Detalhes do ativo descobertos após a conexão', detail: 'O evento symbolInfo do adaptador' },
        { name: 'Book de ofertas em escada', detail: 'Volume de compra e de venda por preço; clique para operar' },
        { name: 'Cotações ao vivo para listas de observação', detail: 'subscribeQuotes, setQuotes, getQuote' },
        { name: 'Notícias e status do mercado', detail: 'fetchNews; uma contagem regressiva até a abertura ou o fechamento' },
        { name: 'Regras da bolsa', detail: 'setMarket: variação mínima por faixa de preço, teto e piso diários, lotes, sessões; HOSE, HNX, UPCoM e futuros do VN30' },
      ],
      trading: [
        { name: 'Ordens e posições no gráfico', detail: 'Arraste para modificar; cancele, feche e inverta pela linha' },
        { name: 'Marcas de execução', detail: 'Motivo e lucro ou prejuízo em executionFill' },
        { name: 'Boleta', detail: 'Quantidade, tipo, stop-loss e take-profit, validade, verificados enquanto você digita; a variação mínima, o teto, o piso e os lotes da bolsa' },
        { name: 'Painel da conta', detail: 'Posições com lucro e prejuízo ao vivo, ordens em aberto, execuções' },
        { name: 'Sinais e zonas de trade', detail: 'Chaves de estilo markers.*, tradeZones.*' },
        { name: 'Backtesting e métricas de risco', detail: '@tradecanvas/analytics: comissão, slippage, Sharpe, Sortino, Calmar, drawdown' },
      ],
      alerts: [
        { name: 'Alertas além de um nível de preço', detail: 'Linha cruzando linha, um movimento de N% em N barras, no fechamento da barra, com expiração' },
        { name: 'Replay de barras em passos menores', detail: 'Um tempo gráfico maior reproduzido a partir de barras menores' },
        { name: 'Paper trading no replay', detail: 'Ordens executadas aos preços do replay' },
        { name: 'Replay em uma grade de gráficos', detail: 'Todos em sincronia' },
        { name: 'Replay para aplicações', detail: 'startTime, hideHistory, duration, marcas reveladas conforme avança, replayComplete' },
      ],
      workspace: [
        { name: 'Uma grade de widgets sincronizados', detail: 'Até 6, compartilhando ativo, tempo gráfico, mira, tempo e desenhos' },
        { name: 'Layouts com nome no seu próprio armazenamento', detail: 'Salvar, abrir, renomear, salvamento automático; LayoutStorage para um servidor' },
        { name: 'Desfazer e refazer para tudo', detail: 'Desenhos, indicadores, configurações e tipo de gráfico; recordUndo' },
        { name: 'Menus de contexto por área', detail: 'Desenhos, área do gráfico, painéis, eixo de preço, eixo de tempo' },
        { name: 'Listas de observação', detail: 'Várias listas, reordenadas arrastando' },
        { name: 'Eventos para a aplicação', detail: 'symbolChange, timeframeChange, ordersChange, executionFill, styleChange e mais' },
      ],
      customization: [
        { name: 'Três aparências para o widget', detail: 'Studio, Terminal, Capsule; ui e setUI; variáveis CSS --tcw-*' },
        { name: 'A aparência do gráfico por chave', detail: 'applyOverrides sobre 101 chaves tipadas, numa camada da aplicação e numa do usuário' },
        { name: 'Configurações que alcançam cada chave', detail: 'Uma aba de estilo para o tipo de gráfico em exibição, uma aba de trading' },
        { name: '112 chaves de recursos', detail: 'features, setFeatures, isFeatureOn; alteráveis em execução' },
        { name: 'Suas próprias peças no widget', detail: 'Botões e menus suspensos na barra de ferramentas, botões na barra lateral, itens de status, slots, itens de menu' },
        { name: 'Seus próprios atalhos', detail: 'addHotkey de acordo com o layout do teclado' },
      ],
      access: [
        { name: 'O widget em 30 idiomas', detail: 'Árabe, hebraico e persa da direita para a esquerda' },
        { name: 'Leitores de tela e teclado', detail: 'Um resumo do gráfico, barras lidas uma a uma, diálogos pelo teclado' },
        { name: 'Documentação em seis idiomas, este site em quatorze', detail: 'English, Tiếng Việt, 简体中文, 日本語, 한국어, Español' },
      ],
      developers: [
        { name: 'Componentes para React, Vue e Svelte', detail: 'Props reativas: overrides, indicators, features' },
        { name: 'Plugins', detail: 'Indicadores, ferramentas de desenho, tipos de gráfico e sobreposições; overlayScale e getPriceStep para desenhar na grade de preços' },
        { name: 'Documentação para agentes de código', detail: 'llms.txt, llms-full.txt e uma skill para agentes' },
      ],
    },

    limitsTitle: 'Limites conhecidos',
    limits: [
      'O Canvas 2D continua como renderizador padrão até o WebGL ser testado em mais dispositivos; a taxa de quadros do WebGL no Safari e em telas 5K ainda não foi medida.',
      'Com proporção de pixels 2 em um gráfico de 2560×1400, só a composição do navegador leva cerca de 23 ms em GPU integrada, então ali os quadros WebGL ficam em média em 29 ms.',
      'Tempos gráficos de tick são montados com os negócios recentes que o feed retorna; não é possível carregar histórico de ticks mais antigo.',
      'Delta de volume e CVD são estimados a partir das barras, não do lado de cada negócio.',
      'No máximo 8 gráficos por página desenham com WebGL ao mesmo tempo; os outros desenham com Canvas 2D.',
    ],
  },

  business: {
    metaTitle: 'Para empresas — TradeCanvas',
    description:
      'TradeCanvas em um produto comercial: licença MIT, sem logo no gráfico, sem cadastro, nada enviado a lugar nenhum. O que uma revisão de TI pergunta, com fontes, e o programa de primeiros parceiros.',
    eyebrow: 'Para empresas',
    title: 'Seu gráfico de trading, com a sua marca.',
    lede: 'O TradeCanvas tem licença MIT. Coloque-o em um produto comercial, modifique-o, hospede-o você mesmo: seus clientes veem a sua marca, e seus dados ficam nos seus servidores.',
    ctaContact: 'Fale conosco',
    ctaAudit: 'Leia a auditoria do sistema',

    freeTitle: 'Grátis, para qualquer uso',
    free: [
      {
        title: 'Sem logo no gráfico',
        body: 'Nada do TradeCanvas é desenhado no gráfico ou no widget. A licença MIT só pede que o texto dela acompanhe o código.',
      },
      {
        title: 'Nada enviado a lugar nenhum',
        body: 'A biblioteca não tem telemetria. Ela só abre uma conexão por meio de um adaptador de dados que você inicia: um dos feeds de exchanges embutidos, ou o seu próprio.',
      },
      {
        title: 'Sem solicitação, sem aprovação',
        body: 'npm install, e todos os recursos da auditoria do sistema são seus, incluindo o book de ofertas em escada, o gráfico de profundidade e o heatmap.',
      },
      {
        title: 'Todo o código-fonte',
        body: 'Leia, corrija, faça um fork. A MIT não exige nada do seu próprio código: ele continua seu e continua fechado, se você quiser.',
      },
    ],

    reviewTitle: 'Pronto para uma revisão de TI',
    reviewLede: 'O que uma revisão de segurança ou de fornecedor costuma perguntar, e onde conferir cada resposta.',
    reviewHtml: [
      'Sem dependências de terceiros em runtime: o pacote do gráfico depende apenas do core e do commons do próprio TradeCanvas.',
      'Sem <code>eval</code> e sem <code>new Function</code>, então ele roda sob uma Content Security Policy sem <code>unsafe-eval</code>.',
      "O widget adiciona um elemento <code>&lt;style&gt;</code>, então as páginas dele precisam de <code>style-src 'unsafe-inline'</code>; o <code>Chart</code> headless não adiciona nenhum.",
      'Problemas de segurança são reportados de forma privada e respondidos em até uma semana.',
      'Cada pull request é compilado, tem os tipos verificados e é testado no CI: mais de 3.000 testes unitários.',
      'As versões são publicadas pelo GitHub Actions a partir do repositório, não da máquina de um desenvolvedor.',
      'Chrome 80+, Firefox 80+, Safari 14+ e Edge 80+.',
      'A licença: MIT, uma página.',
    ],
    source: 'Fonte',

    dataTitle: 'Seus dados, seus servidores',
    dataHtml:
      'O gráfico desenha as barras, os ticks e as ordens que você entrega a ele. Conecte seu próprio backend com um <code>DataAdapter</code>, ou com um <code>WebSocketAdapter</code> que recebe uma URL, uma função de histórico e um parser de mensagens; as ordens saem por um adaptador de execução seu. A documentação de Realtime e de Trading mostra como.',
    dataDocs: 'Docs de Realtime',
    tradingDocs: 'Docs de Trading',

    partnerTitle: 'Primeiros parceiros',
    partnerLede:
      'Estamos procurando as primeiras corretoras, plataformas de trading e equipes de fintech que vão levar o TradeCanvas aos seus clientes.',
    partnerGetTitle: 'O que você recebe',
    partnerGet: [
      'Ajuda para conectar seu feed de dados e suas ordens',
      'Os problemas que você encontrar, corrigidos primeiro',
      'Voz no que será construído a seguir',
    ],
    partnerGiveTitle: 'O que pedimos',
    partnerGive: ['Feedback enquanto você desenvolve', 'Permissão para citar você como usuário quando estiver no ar'],
    partnerNote:
      'Suporte pago, com tempos de resposta em contrato, suporte de longo prazo para uma versão principal e módulos feitos para você, vem depois. Se você precisa disso agora, é só dizer.',

    contactTitle: 'Fale conosco',
    contactLede: 'Conte quem você é, o que está construindo e para quais mercados.',
    contactPublic: 'Perguntas sobre o código ficam melhor em público, nas issues do GitHub.',

    faqTitle: 'Perguntas',
    faq: [
      {
        q: 'Precisamos mostrar o nome ou o logo do TradeCanvas?',
        a: 'Não. Mantenha o texto da licença junto com o código, como ele já está em node_modules; nada precisa aparecer na tela.',
      },
      {
        q: 'Precisamos publicar nosso próprio código?',
        a: 'Não. A MIT não impõe condições ao código ao redor.',
      },
      {
        q: 'A licença pode mudar de repente?',
        a: 'Toda versão já lançada é MIT e continua MIT: a licença de uma versão publicada não pode ser revogada.',
      },
    ],
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
      customization: 'Personalização',
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
