import type { SiteMessages } from '../messages';

const ko: SiteMessages = {
  meta: {
    title: 'TradeCanvas · 웹을 위한 캔버스 트레이딩 차트',
    description:
      'TradeCanvas는 Canvas2D 트레이딩 차트 라이브러리입니다. 17가지 차트 유형, 85개 지표, 69개 그리기 도구, 실시간 거래소 피드, 차트 위 주문, 리플레이와 백테스트를 제공합니다. 의존성 없음, MIT 라이선스.',
  },

  nav: {
    main: '메인',
    docs: '문서',
    examples: '예제',
    playground: '플레이그라운드',
    changelog: '변경 내역',
    toLight: '라이트 테마로 전환',
    toDark: '다크 테마로 전환',
    github: 'GitHub의 TradeCanvas',
    openMenu: '메뉴 열기',
    closeMenu: '메뉴 닫기',
    menu: '메뉴',
    language: '언어',
  },

  footer: {
    tagline: '웹을 위한 Canvas2D 트레이딩 차트. 의존성 없음, MIT 라이선스.',
    library: '라이브러리',
    packages: '패키지',
    project: '프로젝트',
    gettingStarted: '시작하기',
    apiReference: 'API 레퍼런스',
    examples: '예제',
    changelog: '변경 내역',
    issues: '이슈',
    boGrid: 'bo-grid (데이터 그리드)',
    builtWith: 'TradeCanvas로 제작',
  },

  home: {
    release: '이중 캔버스 렌더러, 자유로운 이동',
    title: '트레이딩 앱을 위한 차트 엔진.',
    ledeHtml:
      '캔들스틱부터 렌코까지, 85개 지표, 69개 그리기 도구, 실시간 거래소 피드와 차트 위 주문. 의존성 없이 Canvas2D로 그립니다. 완성된 <code>ChartWidget</code>을 바로 넣거나, 헤드리스 <code>Chart</code> 위에 나만의 UI를 만드세요.',
    getStarted: '시작하기',
    browseExamples: '예제 둘러보기',
    specsLabel: '주요 수치',
    specs: [
      '차트 유형',
      '지표',
      '그리기 도구',
      '런타임 의존성',
      'gzip, 헤드리스 코어',
      '10만 봉에서의 호버 프레임',
    ],
    hood: {
      eyebrow: '내부 구조',
      title: '측정하고 문서화했으며, 확장은 자유롭게',
      subtitleHtml: '기능 랩을 움직이는 엔진입니다. 아래의 모든 수치는 <code>pnpm bench</code>로 재현할 수 있습니다.',
      frameBudget: '프레임 예산',
      perf: [
        '10만 봉, 지표 4개에서 실시간 틱',
        '종목 전환 후 전체 재계산, 10만 봉',
        'LTTB 다운샘플링, 10만 → 1,600 포인트',
        '호버 프레임, 500봉부터 10만 봉까지 일정',
      ],
      perfFoot: '두 캔버스를 겹쳐 쌓습니다. 호버 시에는 위쪽의 얇은 캔버스만 다시 그립니다. 모든 렌더러는 화면에 보이는 봉만 순회합니다.',
      gestures: '제스처',
      gestureList: [
        ['드래그', '이동, 마지막 봉 너머까지'],
        ['스크롤', '포인터를 중심으로 확대/축소'],
        ['핀치', '터치스크린에서 확대/축소'],
        ['오른쪽으로 드래그', '이동하는 동안 이전 봉을 불러옴'],
        ['축 드래그', '눈금 조절'],
        ['Ctrl + 드래그', '그림 선택'],
        ['Shift + 드래그', '측정'],
        ['Alt + 클릭', '툴팁 고정'],
      ],
    },
    capabilities: [
      {
        label: '위젯',
        title: '호출 한 번으로 완전한 트레이딩 UI',
        text: 'ChartWidget은 도구 모음, 그리기 사이드바, 관심 종목, 가격 알림, 개체 트리, 데이터 창, 리플레이, 명령 팔레트(Ctrl+K)를 제공하며, 영어와 베트남어부터 중국어, 일본어, 한국어까지 14개 언어를 지원합니다.',
      },
      {
        label: '데이터',
        title: '어떤 시장 피드든',
        text: 'Binance, Coinbase, Bybit, Kraken 어댑터가 내장되어 있고, 그 밖의 피드는 WebSocketAdapter와 PollingAdapter로 연결합니다. 뒤로 스크롤하면 이전 봉을 불러오고, 끊기면 스스로 재연결하며, 이미 다른 요청으로 대체된 종목 전환은 버립니다.',
      },
      {
        label: '트레이딩',
        title: '차트 위의 주문',
        text: '모의 브로커가 포함된 ExecutionAdapter, 드래그로 주문 생성, 브래킷 주문, 드래그할 수 있는 손절·익절 선, 웹훅과 데스크톱 알림으로 전달되는 가격 알림.',
      },
      {
        label: '프레임워크',
        title: 'React, Vue, Svelte',
        text: '@tradecanvas/react, /vue, /svelte는 같은 엔진을 타입이 지정된 반응형 props로 감쌉니다. 전체 Chart 인스턴스에는 ref 하나로 바로 접근할 수 있습니다.',
      },
      {
        label: '플러그인',
        title: '모든 계층을 확장',
        text: '증분 update()를 지원하는 사용자 지정 지표, 그리기 도구, 차트 유형, 오버레이를 전역 또는 차트별로 등록하세요.',
      },
      {
        label: '분석',
        title: '차트 옆에서 백테스트',
        text: '몬테카를로 밴드를 갖춘 봉 단위 Backtester와, 메인 스레드를 비워 두는 Web Worker 지표 파이프라인.',
      },
    ],
    quickstart: {
      eyebrow: '빠른 시작',
      title: '같은 차트, 다섯 가지 시작 방법',
      subtitle: '완전한 위젯, 프레임워크 컴포넌트, 또는 헤드리스 엔진. 모두 하나의 렌더러를 공유합니다.',
      tabs: '빠른 시작 방식',
    },
    closing: {
      title: '지금 바로 앱에 실시간 차트를 넣어 보세요.',
      readDocs: '문서 읽기',
      star: 'GitHub에서 Star 주기',
    },
  },

  lab: {
    eyebrow: '기능 랩',
    title: '모든 기능을 실시간 차트에서.',
    subtitleHtml:
      '장면을 고르세요. 각 장면은 완전한 <code>ChartWidget</code>을 한 가지 영역이 작동하는 모습을 보여 주는 상태로 실행합니다. 그다음부터는 자유롭게 드래그하고, 그리고, 전환해 보세요.',
    scenes: '기능 장면',
    widgetLanguage: '위젯 언어',
    idle: '화면에 보이도록 스크롤하면 실시간 차트가 시작됩니다',
    metricHint: '종목이나 시간 단위를 바꾸면 소요 시간을 측정합니다',
    metricSwitch: '→ {label}: {ms} · 봉 {bars}개',
    metricSetData: 'setData(봉 {bars}개): {ms}',
    tryThis: '해 보기',
  },

  scenes: {
    drawings: {
      title: '그리기 도구',
      stat: '도구 69개',
      blurb:
        '직접 정한 레벨을 쓰는 피보나치·갠 도구, 엘리엇 파동, 하모닉 패턴, 노트, 브러시. 그림을 더블 클릭하면 설정, 오른쪽 클릭하면 메뉴가 열립니다. 알림은 추세선을 따라가고, 롱/숏 도구는 포지션 크기를 계산합니다.',
      tryThis: [
        '피보나치 되돌림을 더블 클릭해 레벨을 편집하세요',
        '그림을 오른쪽 클릭하세요: 앞으로 가져오기, 그룹화, 알림 추가',
        '브러시나 경로 도구를 선택하세요. Enter를 누르면 경로가 끝납니다',
      ],
    },
    indicators: {
      title: '지표',
      stat: '내장 85개',
      blurb:
        '오버레이와 보조 차트 지표를 자체 계산하며, 수학 라이브러리 의존성이 없습니다. 실시간 틱에서는 형성 중인 봉만 다시 계산합니다 — 10만 봉, 지표 4개에서 틱당 0.001 ms.',
      tryThis: [
        '지표 버튼(또는 Ctrl+K)을 누르고 85개 중 원하는 지표를 검색하세요',
        '범례에서 지표 이름을 클릭하세요: 입력값, 색상, 레벨',
        '이동평균의 소스를 다른 지표의 선으로 설정하세요',
        '패널 사이의 선을 드래그해 크기를 조절하세요. 패널 오른쪽 위 버튼으로 이동, 접기, 최대화를 할 수 있습니다',
        '범례 행의 ⋯로 지표를 위나 아래 패널, 또는 별도 패널로 옮기세요',
        '지표 메뉴 → 지표를 템플릿으로 저장…; Ctrl+Z로 지표 변경도 실행 취소할 수 있습니다',
        '차트에서 숫자를 입력(4, h, Enter)해 시간 단위를 바꾸세요. Alt+T는 추세선을 선택합니다',
      ],
    },
    trading: {
      title: '트레이딩',
      stat: '모의 브로커',
      blurb:
        '차트에서 바로 다루는 주문과 포지션입니다. 손절과 익절을 드래그하고, 선에서 바로 취소·청산·반전하며, 체결마다 해당 봉에 표시가 남습니다. 차트 아래에는 주문 티켓과 계좌 패널이 있고, 모든 것이 ExecutionAdapter를 거칩니다. 여기서는 번들된 모의 브로커를 사용합니다.',
      tryThis: [
        '열린 롱 포지션의 ⇅ 버튼으로 반전하거나 × 버튼으로 청산하세요 — 체결이 해당 봉에 표시됩니다',
        '현재가 아래를 오른쪽 클릭하세요: 그 가격에 지정가 매수, 스톱 매도, 새 주문을 넣을 수 있습니다',
        '차트 아래 계좌 패널에 포지션과 손익, 주문, 내역이 나열됩니다',
        '열린 롱 포지션의 SL / TP 선을 드래그하세요 — 브로커가 값을 갱신합니다',
        '가격 축 옆의 + 버튼을 누르면 그 가격에 알림, 주문, 선을 추가할 수 있습니다',
      ],
    },
    workspace: {
      title: '작업 공간',
      stat: '멀티 차트',
      blurb:
        '두 차트를 나란히 놓고 십자선으로 연동합니다. 원하면 종목, 시간 단위, 시간 축, 그림으로도 연동할 수 있습니다. 작업 공간 전체를 이름 있는 레이아웃으로 저장해 두고 언제든 다시 열 수 있습니다.',
      tryThis: [
        '한 차트 위로 마우스를 움직이면 다른 차트에도 같은 시간이 표시됩니다',
        '동기화 바에서 ‘시간 단위’를 켠 다음, 한 차트의 시간 단위를 바꿔 보세요',
        '바에서 차트 네 개를 고르세요. ‘종목’을 동기화하면 새 차트가 활성 차트의 종목으로 열립니다',
        '레이아웃 ▾ → 다른 이름으로 저장…, 무언가 바꾼 뒤 레이아웃을 다시 열어 보세요(Ctrl+S로 저장)',
      ],
    },
    navigation: {
      title: '기간과 레이아웃',
      stat: '1D … 전체',
      blurb:
        '원하는 기간이나 날짜로 이동하고, 가격 눈금을 뒤집고, 자주 쓰는 시간 단위를 고정하고, 같은 지표를 여러 번 추가하세요. 저장된 레이아웃에서 이 모든 것을 그대로 되찾을 수 있습니다.',
      tryThis: [
        '차트 아래의 1M, 3M, 6M을 클릭하세요. Alt+G는 날짜로 이동합니다',
        'Alt+I는 가격 눈금을 위아래로 뒤집습니다. 로그 눈금은 설정에 있습니다',
        '설정 → 시간대에서 뉴욕이나 도쿄를 고르세요. 축, 일 구분선, YTD가 서머타임까지 반영해 따라 바뀝니다',
        '설정 → 눈금 → 왼쪽 가격 눈금. EMA의 스타일 탭에서 EMA를 그 눈금으로 옮길 수 있습니다',
        '시간 단위 버튼 옆 ▾ 메뉴에서 시간 단위에 별표를 표시하세요',
        '왼쪽 도구 모음의 ↻ 버튼을 켜면 선을 연달아 여러 개 그릴 수 있습니다. Ctrl+C / Ctrl+V로 복사합니다',
      ],
    },
    history: {
      title: '과거로 스크롤',
      stat: '페이지 단위 과거 데이터',
      blurb:
        '가장 오래된 봉 쪽으로 드래그하면 이전 봉을 한 페이지씩 불러오며, 화면에 보이는 부분은 그대로 유지됩니다. 불러온 봉이 모두 들어올 때까지 축소해 보세요. 봉당 1픽셀 미만이 되면 캔들이 픽셀 열마다 합쳐져 수천 개의 봉도 알아보기 쉽게 유지됩니다.',
      tryThis: [
        '차트를 오른쪽으로 드래그하세요. 왼쪽의 알약 모양 표시가 이전 봉을 불러오는 중임을 알려 줍니다',
        '스크롤해 축소하세요. 수백 개 봉을 넘어 봉당 4분의 1픽셀까지 줄어듭니다',
        '차트 아래의 ‘전체’를 클릭하면 지금까지 불러온 모든 봉이 화면에 맞춰집니다',
        '▾ 시간 단위 메뉴에 7 또는 90을 입력하세요. Binance에는 둘 다 없으므로 차트가 1m, 30m 봉으로 직접 만듭니다',
      ],
    },
    replay: {
      title: '바 리플레이',
      stat: '스크러버',
      blurb:
        '과거를 봉 하나씩 넘기며 결과를 미리 알지 못한 채 차트 읽기를 연습하세요. 리플레이하는 동안 실시간 데이터는 따로 보관되고, 가격 눈금은 매 단계에 맞춰집니다.',
      tryThis: [
        '재생을 누르거나 Shift+→ / Shift+←로 한 봉씩 이동하세요',
        '이미 드러난 봉을 클릭하면 커서가 그 봉으로 이동합니다',
        '‘실시간으로 돌아가기’를 누르면 실시간 시리즈로 돌아갑니다',
      ],
    },
    subcent: {
      title: '14개 언어, 1센트 미만 가격',
      stat: 'i18n',
      blurb:
        '메뉴, 설정, 그리기 도구, 대화 상자까지 위젯 전체가 14개 언어로 제공되며, 숫자는 각 언어의 형식을 따릅니다. PEPE는 0.000004 안팎에서 거래됩니다. 모든 라벨이 가격 눈금의 정밀도를 따르고, 축은 값에 맞춰 넓어집니다.',
      tryThis: [
        '차트 위에서 언어를 고르세요: 日本語, 한국어, 简体中文, Deutsch…',
        'Ctrl+P를 누르면 입력하는 대로 모든 Binance 종목을 이름과 함께 검색합니다',
        '설정이나 그리기 도구를 열어 번역된 모습을 확인하세요',
        '마우스를 올려 보세요. 십자선 라벨이 해당 언어의 숫자 형식으로 전체 정밀도를 유지합니다',
      ],
    },
    bigdata: {
      title: '봉 200,000개',
      stat: '성능',
      blurb:
        '1분봉 20만 개에 지표 4개. 렌더링은 보이는 봉만 처리하며, 더 큰 시간 단위는 로컬에서 리샘플링합니다. 리샘플링이 몇 프레임 이상 걸리면 로딩 가림막 뒤에서 진행됩니다.',
      tryThis: [
        '1H, 4H로 바꿨다가 다시 1m으로 돌아오세요 — 차트 아래에 소요 시간이 표시됩니다',
        '끝까지 축소한 뒤 이동해 보세요. 프레임 비용이 일정하게 유지됩니다',
        '지표를 하나 더 추가하고 전환 시간을 지켜보세요',
      ],
    },
    switching: {
      title: '느린 네트워크에서의 전환',
      stat: '+1.2 s 지연',
      blurb:
        '여기서는 모든 과거 데이터 요청이 1.2 s 지연됩니다. 이전 차트는 화면에 그대로 남고, 전환이 200 ms보다 오래 걸릴 때만 가림막이 덮입니다. 빠르게 연달아 클릭해도 오래된 응답이 이기는 일은 없습니다.',
      tryThis: [
        '여러 종목을 빠르게 클릭하세요 — 마지막 종목만 표시됩니다',
        '시간 단위를 바꾸고 가림막이 나타났다 사라지는 것을 지켜보세요',
        '지표 장면과 비교해 보세요. 빠른 전환에서는 깜빡임이 없습니다',
      ],
    },
  },

  gallery: {
    eyebrow: '차트 유형',
    title: '모든 차트 유형을 페이지에서 실시간으로',
    subtitleHtml:
      '각 타일은 이미지가 아니라 실제 <code>Chart</code> 인스턴스입니다. 드래그해 이동하고, 스크롤해 확대/축소하고, 마우스를 올려 십자선을 확인하세요. 모든 타일이 각자 반응합니다.',
    tiles: {
      candlestick: { name: '캔들스틱', tag: 'OHLC' },
      heikinAshi: { name: '하이킨아시', tag: '추세' },
      area: { name: '영역', tag: '종가' },
      baseline: { name: '기준선', tag: '위 / 아래' },
      bar: { name: 'OHLC 바', tag: '클래식' },
      stepLine: { name: '계단선', tag: '불연속' },
    },
  },

  finance: {
    eyebrow: '금융 차트',
    title: '캔들스틱 그 너머',
    subtitle: '포트폴리오와 KPI를 위한 스파크라인, 자산 곡선, 호가 깊이, 섹터 히트맵, 워터폴, 게이지.',
    portfolio: '포트폴리오 성과',
    depth: '호가 깊이',
    heatmap: '암호화폐 시장 히트맵',
    pnl: '손익 기여도',
    fearGreed: '공포·탐욕 지수',
    waterfall: {
      start: '시작',
      btcLong: 'BTC 롱',
      ethShort: 'ETH 숏',
      solLong: 'SOL 롱',
      fees: '수수료',
      end: '종료',
    },
    zones: {
      extremeFear: '극단적 공포',
      fear: '공포',
      neutral: '중립',
      greed: '탐욕',
      extremeGreed: '극단적 탐욕',
    },
  },

  terminal: {
    symbol: '종목',
    timeframe: '시간 단위',
    chartType: '차트 유형',
    types: {
      candlestick: '캔들',
      heikinAshi: '하이킨아시',
      area: '영역',
      bar: '바',
      baseline: '기준선',
    },
    unavailable: '실시간 피드를 사용할 수 없습니다: {error}',
    live: '실시간',
    offline: '오프라인',
    connecting: '연결 중',
    hints: [
      ['드래그', '이동'],
      ['스크롤', '확대/축소'],
      ['축 드래그', '눈금 조절'],
    ],
  },

  copy: {
    copy: '복사',
    copied: '복사됨',
    copiedAnnouncement: '클립보드에 복사했습니다',
    copyLabel: '{label} 복사',
    copyCode: '코드 복사',
    codeSample: '코드 예시',
    packageManager: '패키지 관리자',
    copyInstall: '설치 명령 복사',
  },

  examples: {
    metaTitle: '예제 · TradeCanvas',
    description: 'vanilla JS, React, Vue, Svelte, ChartWidget, 금융 대시보드를 위한 라이브 StackBlitz 예제.',
    eyebrow: '예제 · StackBlitz',
    title: '예제',
    subtitleHtml:
      '클릭 한 번으로 포크할 수 있는 라이브 샌드박스입니다. 각 예제는 최신 1.x 패키지가 연결된 상태로 StackBlitz에서 열립니다. 설치 없이 기능을 체험하려면 홈페이지의 <a href="{lab}">기능 랩</a>을 이용하세요.',
    open: 'StackBlitz에서 {title} 열기',
    items: {
      vanilla: {
        title: 'Vanilla JS',
        blurb: '헤드리스 Chart: Binance 실시간 스트림, Bollinger + RSI, 직접 만든 UI 위의 그리기 도구.',
      },
      widget: {
        title: 'ChartWidget',
        blurb: '호출 한 번으로 완전한 트레이딩 UI: 도구 모음, 69개 그리기 도구, 관심 종목, 트레이딩, 리플레이, 14개 언어.',
      },
      react: {
        title: 'React',
        blurb: '@tradecanvas/react — 반응형 props, 타입 지원, ref로 접근하는 내부 Chart.',
      },
      vue: {
        title: 'Vue 3',
        blurb: '@tradecanvas/vue — script setup, 반응형 props, @ready로 받는 Chart.',
      },
      svelte: {
        title: 'Svelte 5',
        blurb: '@tradecanvas/svelte — runes, 반응형 props, bind:chart.',
      },
      finance: {
        title: '금융 대시보드',
        blurb: '스파크라인, 게이지, 히트맵, 호가 깊이, 자산 곡선 렌더러를 한 레이아웃에.',
      },
    },
  },

  playground: {
    metaTitle: '플레이그라운드 · TradeCanvas',
    description: 'StackBlitz에서 인터랙티브 TradeCanvas 샌드박스를 포크해 바로 코딩을 시작하세요.',
    eyebrow: '플레이그라운드 · StackBlitz',
    title: '플레이그라운드',
    subtitle: 'ChartWidget이 Binance 실시간 데이터에 이미 연결되어 있는, StackBlitz의 편집 가능한 샌드박스입니다.',
    launch: '플레이그라운드 실행',
    more: '더 많은 예제',
    insideTitle: '포함된 내용',
    insideHtml:
      '<code>src/main.ts</code> 파일 하나로 이루어진 최소한의 Vite + TypeScript 프로젝트로, <code>ChartWidget</code>을 마운트하고 <code>BinanceAdapter</code>를 연결합니다.',
  },

  changelog: {
    metaTitle: '변경 내역 — TradeCanvas',
    description: '모든 TradeCanvas 버전의 릴리스 노트.',
    englishOnly: '릴리스 노트는 영어로 작성되어 있습니다.',
  },

  backtest: {
    title: '실시간 백테스트 — SMA(10/30) 교차',
    subtitle: '365일 합성 가격 데이터, 초기 자금 $10k, 수수료 0.05%, 슬리피지 0.03%.',
    play: '재생',
    pause: '일시정지',
    replay: '다시 재생',
    end: '끝으로',
    running: '백테스트 실행 중…',
    failed: '실패: {error}',
    bar: '봉 {index}/{total}',
    totalReturn: '총 수익률',
    maxDrawdown: '최대 낙폭',
    winRate: '승률',
    profitFactor: '수익 팩터',
    trades: '거래 수',
  },

  error: {
    notFound: '페이지를 찾을 수 없습니다',
    notFoundText: '이 페이지는 존재하지 않거나 이동되었습니다.',
    other: '문제가 발생했습니다',
    otherText: '페이지를 표시할 수 없습니다. 다시 시도하거나 홈에서 시작해 주세요.',
    home: '홈으로 돌아가기',
    docs: '문서 열기',
  },

  docs: {
    titleSuffix: 'TradeCanvas 문서',
    navLabel: '문서 탐색',
    groups: {
      start: '시작하기',
      chart: '차트',
      trading: '트레이딩',
    },
    pages: {
      'getting-started': '시작하기',
      frameworks: '프레임워크',
      embed: '임베드 위젯',
      api: 'API 레퍼런스',
      'chart-types': '차트 유형',
      indicators: '지표',
      'drawing-tools': '그리기 도구',
      plugins: '플러그인',
      performance: '성능',
      trading: '트레이딩 오버레이',
      finance: '금융 차트',
      realtime: '실시간 및 리플레이',
      analytics: '분석',
    },
    notTranslated: '이 페이지는 아직 {language}로 번역되지 않아 영어로 표시됩니다.',
  },
};

export default ko;
