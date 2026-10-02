# @tradecanvas/chart

[English](README.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · **한국어** · [Español](README.es.md)

지표, 그리기 도구, 실시간 스트리밍이 내장된 고성능 캔버스 트레이딩 차트. 외부 의존성이 전혀 없습니다.

**[라이브 데모](https://bonguynvan.github.io/tradecanvas/)** | **[GitHub](https://github.com/bonguynvan/tradecanvas)** | **[npm](https://www.npmjs.com/package/@tradecanvas/chart)**

## 왜 TradeCanvas인가?

대부분의 차트 라이브러리는 둘 중 하나를 고르게 합니다. 트레이딩 기능이 없는 예쁜 차트, 아니면 API가 투박한 트레이딩 기능. TradeCanvas는 둘 다 제공합니다.

- **내장 지표 85개** — SMA, EMA, TEMA, VWMA, Hull MA, RSI, MACD, Bollinger, Envelope, Ichimoku, Pivot Points, Anchored VWAP, ZigZag, Linear Regression Channel, Awesome / Chaikin Oscillator 등. 어떤 지표든 다른 지표의 선을 입력으로 읽을 수 있습니다(RSI의 SMA). 별도의 계산 라이브러리가 필요 없습니다.
- **그리기 도구 69개** — 추세선(정보선, 추세 각도, 십자선), 피보나치(되돌림, 확장, 채널, 시간대, 속도 저항 팬과 아크, 서클, 스파이럴, 웨지), 수평/수직선, 채널, 피치포크와 피치팬, 갠 팬 / 박스 / 스퀘어, 주기, 하모닉 패턴(XABCD, 사이퍼, ABCD, 스리 드라이브, 헤드 앤 숄더), 엘리엇 파동, 메모, 말풍선과 표시, 브러시와 패스, 예측과 투영, 포지션 크기를 계산하는 롱/숏 포지션, 고정 범위 매물대. 도구마다 설정, 추세선 알림, 그룹과 레이어, 실행 취소/다시 실행, 완전한 직렬화를 지원합니다.
- **17가지 차트 유형** — 캔들스틱, 라인, 영역, 바, 할로우 캔들, 기준선, 하이킨아시, 렌코, 카기, 라인 브레이크, 포인트 앤 피겨, 레인지 바, 거래량 캔들, **이퀴볼륨**, HLC 영역, 계단선, 라인+마커.
- **프로급 인터랙션** — 마지막 봉을 지나 비어 있는 미래 영역까지 자유롭게 이동(그림도 그곳에 그릴 수 있습니다), 가격/시간 축을 드래그해 눈금 조절, 더블 클릭으로 자동 맞춤, `Ctrl/⌘+drag`로 여러 그림 선택(그다음 함께 이동, 스타일 변경, 삭제), `Shift+drag`로 측정(봉 수 × 가격 Δ × %), `Alt+click`으로 비교 툴팁 고정, 상황별 커서(십자선, 잡는 손, 크기 조절 화살표), 커서 아래에서 축을 따라가는 가격/시간 라벨, 봉 호버 강조.
- **트레이딩 오버레이** — 진입선, 손익 구간, SL/TP 마커와 함께 열린 포지션을 그립니다. 주문은 점선으로 표시됩니다. SL/TP를 드래그해 수정합니다. 트레이딩이 필요 없는 프로젝트에서는 `features.trading: false`로 깔끔하게 끌 수 있습니다.
- **실시간 스트리밍** — Binance, Coinbase, Bybit, Kraken 어댑터가 내장되어 있고, 범용 `WebSocketAdapter` / `PollingAdapter` 기반 클래스로 어떤 피드든 약 20줄이면 연결됩니다. 뒤로 스크롤하면 이전 봉을 불러오고, 어떤 간격(`7m`, `90m`, `2d`)이든 피드 자체의 간격으로 만들어 내며, 종목 검색은 피드에서 가져옵니다.
- **시간대** — 서머타임을 반영하는 모든 IANA 시간대(`'America/New_York'`), 고정 오프셋, 또는 거래소 자체 시간대를 축, 십자선, 일 구분선, 세션 시간에 적용합니다.
- **14개 언어** — `ChartWidget`을 영어, 베트남어, 중국어 간체 및 번체, 일본어, 한국어, 스페인어, 포르투갈어, 프랑스어, 독일어, 러시아어, 튀르키예어, 인도네시아어, 태국어로 제공합니다.
- **실시간 주문 실행** — `ExecutionAdapter`를 연결하면 트레이딩 오버레이가 실제 거래 화면이 됩니다. 차트를 드래그해 주문을 만들고 체결 내역을 맞춰 봅니다. `PaperExecutionAdapter` 샌드박스가 함께 제공됩니다.
- **플러그인 SDK** — 사용자 지정 지표, 그리기 도구, 차트 유형, 오버레이를 전역 또는 차트별로 등록합니다.
- **전략 백테스터** — `@tradecanvas/analytics`는 가상 체결, 수수료/슬리피지 모델, 포트폴리오 추적, 리스크 지표(Sharpe, Sortino, Calmar, 최대 낙폭)를 갖춘 봉 단위 `Backtester`를 제공합니다. **이제 바로 쓸 수 있는 참조 전략 4개와 몬테카를로 경로 의존성 분석까지 포함합니다.**
- **리플레이 모드** — `ReplayController`가 start / pause / step / seek / setSpeed로 과거 봉을 제어된 속도로 진행시킵니다. 위젯은 이제 그 위에 떠 있는 하단 스크러버 UI(재생/일시정지/한 단계 이동/탐색 + 0.5×–100× 속도)를 제공합니다.
- **매물대(Volume Profile)** — 보이는 범위의 거래량을 가격대별로 묶어 보여 주는 선택적 가로 히스토그램. POC(point of control)를 강조 표시합니다.
- **관심 종목 사이드바** — 종목별 최근 가격, 변동률(%), 미니 스파크라인을 보여 주는 선택적 세로 패널. 행을 클릭하면 차트가 해당 종목으로 전환됩니다.
- **CSV / JSON 드래그 앤 드롭** — 파일을 차트에 놓으면 즉시 파싱해 불러옵니다. 헤더 구성, ISO/unix-s/unix-ms 타임스탬프, 배열형/객체형 JSON 구조를 감지합니다.
- **저장된 레이아웃** — 차트 유형 + 지표 구성 + 그림 + 알림을 종목별로 localStorage에 저장하는 선택적 기능. 종목을 바꿨다가 돌아와도 설정이 그대로 남아 있습니다.
- **멀티 차트 그리드** — 십자선이 연동되고 시간 축을 공유하는, 동기화된 2×2 / 2×3 레이아웃을 위한 `ChartGrid`.
- **신호 마커와 거래 구간** — 봇/알고리즘의 출력(방향 화살표, 진입→청산 사각형)을 정식 차트 레이어로 그립니다.
- **단축키 목록** — 위젯에서 `?`를 누르면 분류별로 정리된 키보드 단축키 목록이 열립니다.
- **차트 상태 저장/불러오기** — 그림, 지표, 테마, 차트 유형을 JSON으로 저장합니다. 호출 한 번으로 복원합니다.
- **의존성 없음** — 라이브러리 전체가 자체적으로 완결됩니다. `d3`도, `chart.js`도, `fancy-canvas`도 없습니다.

## 설치

```bash
npm install @tradecanvas/chart
# or
pnpm add @tradecanvas/chart
# or
yarn add @tradecanvas/chart
```

## 빠른 시작

가장 빠른 방법은 `ChartWidget`입니다. 완전한 트레이딩 UI(도구 모음, 그리기 사이드바, 설정 대화 상자, 상태 표시줄)를 갖춘 바로 끼워 쓰는 컴포넌트로, 프레임워크 의존성이 없습니다.

```typescript
import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  trading: true,
})
```

이게 전부입니다. 실시간 데이터, 85개 지표 전부, 69개 그리기 도구 전부, 명령 팔레트(`Ctrl+K`), 종목 검색(`Ctrl+P`), 단축키 목록(`?`), Shift 드래그 측정, Alt 클릭 툴팁 고정, CSV/JSON 드래그 앤 드롭 불러오기까지 갖춰집니다.

## 헤드리스 Chart

주변 UI(사용자 지정 도구 모음, 프레임워크별 컨트롤)를 직접 만들고 싶은 프로젝트라면 하위 수준의 `Chart` 클래스를 직접 사용하세요:

```typescript
import { Chart, BinanceAdapter } from '@tradecanvas/chart'

const chart = new Chart(document.getElementById('chart')!, {
  theme: 'dark',
  autoScale: true,
  features: {
    drawings: true,
    indicators: true,
    trading: true,           // set false to disable orders/positions entirely
    tradingContextMenu: true, // opt-in right-click order menu (off by default)
    volume: true,
  },
})

const adapter = new BinanceAdapter()
chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '5m', historyLimit: 300 })
```

### 위젯 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `symbol` | `string` | `'BTCUSDT'` | 초기 거래 종목 |
| `timeframe` | `TimeFrame` | `'5m'` | 초기 시간 단위 |
| `theme` | `'dark' \| 'light' \| Theme` | `'dark'` | 차트 테마 |
| `adapter` | `DataAdapter` | — | 데이터 소스 어댑터 |
| `toolbar` | `boolean` | `true` | 상단 도구 모음 표시 |
| `drawingTools` | `boolean` | `true` | 왼쪽 그리기 사이드바 표시 |
| `settings` | `boolean` | `true` | 설정 버튼 표시 |
| `trading` | `boolean` | `true` | 트레이딩 오버레이 활성화 |
| `statusBar` | `boolean` | `true` | 하단 상태 표시줄 표시 |
| `rangeBar` | `boolean` | `true` | 상태 표시줄의 기간 프리셋(1D … All)과 날짜로 이동(Alt+G) |
| `indicatorLegend` | `boolean` | `true` | 차트에 표시되는 지표 목록(OHLCV 범례 아래와 각 패널 상단)과 표시 / 설정 / 삭제 |
| `fullscreen` | `boolean` | `true` | 도구 모음의 전체 화면 버튼 |
| `symbols` | `string[]` | BTC/ETH/SOL/BNB | 검색 가능한 종목 목록 |
| `timeframes` | `TimeFrame[]` | 1m ~ 1M | 제공할 시간 단위. ▾ 메뉴에서 즐겨 쓰는 항목을 고정할 수 있습니다 |
| `chartTypes` | `ChartType[]` | 11가지 | 사용 가능한 차트 유형 |
| `watchlist` | `boolean` | `false` | 오른쪽 관심 종목 사이드바 |
| `dragDropImport` | `boolean` | `true` | CSV / JSON 파일을 차트에 놓아 데이터 불러오기 |
| `persistLayouts` | `boolean \| { keyPrefix, debounceMs }` | `false` | 종목별 지표 / 그림 / 차트 유형을 localStorage에 저장 |
| `onSymbolChange` | `(symbol) => void` | — | 종목 변경 콜백 |
| `onTimeframeChange` | `(tf) => void` | — | 시간 단위 변경 콜백 |
| `onReady` | `(chart) => void` | — | 차트가 준비되면 호출 |
| `locale` | `string` | `'en'` | UI 언어 — `'en'`과 `'vi'`는 내장, 나머지 12개는 locales 엔트리에서 불러옵니다. 아래 **위젯 i18n** 참고 |
| `messages` | `Partial<Record<MessageKey, string>>` | — | `locale` 위에 개별 UI 문자열을 덮어쓰거나 추가 |

### 아이콘

위젯의 아이콘 세트는 직접 만든 UI에서도 쓸 수 있도록 export됩니다.
`createIcon(name)`, `createToolIcon(drawingTool)`, `createChartTypeIcon(chartType)`은
`currentColor`로 그린 인라인 SVG 문자열을 반환합니다(24 px 그리드, 1.75 px 선).

```ts
import { createToolIcon } from '@tradecanvas/chart/widget'
button.innerHTML = createToolIcon('fibRetracement', 16)
```

### 위젯 i18n

`ChartWidget`은 14개 언어를 지원합니다: 영어, 베트남어, 중국어 간체와 번체, 일본어, 한국어, 스페인어, 포르투갈어, 프랑스어, 독일어, 러시아어, 튀르키예어, 인도네시아어, 태국어. 도구 모음, 설정, 그리기 도구, 가격 알림, 대화 상자, 명령 팔레트, 단축키 목록, 안내 메시지까지 화면에 표시되는 모든 문자열이 번역되어 있습니다. 지표 이름(SMA, RSI…)은 그대로 유지됩니다. 언어는 생성할 때 설정합니다.

영어와 베트남어는 내장되어 있습니다. 나머지 언어는 `@tradecanvas/chart/widget/locales`에서 불러오므로, 페이지에는 import한 언어만 포함됩니다:

```ts
import { ja } from '@tradecanvas/chart/widget/locales'

new ChartWidget(el, {
  locale: 'ja',
  messages: ja,                               // or registerWidgetLocales() for all of them
  chartOptions: { numberLocale: 'ja-JP' },    // separate: number/date formatting (see below)
});
```

`messages`로 `locale` 위에 개별 키를 덮어쓸 수도 있습니다(`{ 'watchlist.title': 'Theo dõi' }`). 지역이 붙은 로케일은 해당 언어로 대체됩니다(`ja-JP` → `ja`; `zh-TW` → 중국어 번체).

`locale`/`messages`는 **텍스트**를 담당하고, `chartOptions.numberLocale`은 `Intl`을 통해 숫자와 날짜의 **형식**(가격 축, 범례, 관심 종목 가격, 현재 가격 태그, 세션 구분 날짜)을 제어합니다.

전체 키 목록(`MessageKey`)은 `packages/library/src/widget/locales/en.ts`를 참고하세요.

### 위젯 vs 헤드리스

| | `Chart` (헤드리스) | `ChartWidget` |
|---|---|---|
| 임포트 | `@tradecanvas/chart` | `@tradecanvas/chart/widget` |
| 포함된 UI | 없음 — 직접 만듦 | 완전한 도구 모음, 사이드바, 설정 |
| 번들 크기 | ~50 KB gzip | ~65 KB gzip (UI 포함) |
| 프레임워크 | 모두 지원 (React, Vue, Svelte, vanilla) | Vanilla JS DOM (어디서나 동작) |
| 커스터마이징 | 완전한 제어 | 섹션별 켜기/끄기 |
| 고급 접근 | 직접 API | 직접 API는 `widget.getChart()`로 |

### 위젯 테마

`ChartWidget`의 자체 UI(도구 모음, 사이드바, 설정 패널, 관심 종목 — 캔버스 *바깥*의 모든 것)는 위젯의 루트 요소인 `.tcw-root`에 정의된 CSS 사용자 지정 속성만으로 스타일이 지정됩니다. 이 속성들은 **안정적이고 문서화된 계약**입니다. 마이너/패치 릴리스에서는 추가만 이루어지며, 메이저 버전 업 없이 속성 이름이 바뀌거나 삭제되는 일은 없습니다. 호스트 페이지에서 덮어쓰기만 하면 되며, 빌드 단계나 테마 객체는 필요 없습니다.

```css
/* Dark is the default (no attribute needed); light sets data-tcw-theme="light" */
.my-app .tcw-root:not([data-tcw-theme="light"]) {
  --tcw-bg: #0a0a0f;
  --tcw-accent: #7c5cff;
  --tcw-radius: 0px;
  --tcw-radius-lg: 0px;
}
```

| 변수 | 기본값 (다크) | 용도 |
|---|---|---|
| `--tcw-bg` | `#080b10` | 루트 배경 |
| `--tcw-bg-surface` | `#0c1016` | 패널 / 도구 모음 표면 |
| `--tcw-bg-elevated` | `#141922` | 팝오버, 드롭다운, 모달 |
| `--tcw-bg-overlay` | `rgba(20,25,34,.5)` | 오버레이 뒤 배경막 |
| `--tcw-border` | `#1f2630` | 기본 테두리 |
| `--tcw-border-strong` | `#2a323e` | 강조 테두리 (포커스 링, 구분선) |
| `--tcw-text` | `#e7e9ee` | 기본 텍스트 |
| `--tcw-text-dim` | `#aab1bd` | 보조 텍스트 |
| `--tcw-text-muted` | `#758091` | 3차 / 플레이스홀더 텍스트 |
| `--tcw-accent` | `#f2a93b` | 기본 강조색 (활성 탭, 포커스, 링크) |
| `--tcw-accent-ink` | `#1a1204` | 강조색 배경 위의 텍스트와 아이콘 |
| `--tcw-accent-hover` | `#f5b95c` | 강조색 호버 상태 |
| `--tcw-accent-soft` | `rgba(242,169,59,.14)` | 강조색 틴트 (선택된 행 배경) |
| `--tcw-accent-glow` | `rgba(242,169,59,.22)` | 강조색 글로우 (포커스 후광) |
| `--tcw-accent-line` | `rgba(242,169,59,.55)` | 강조색 테두리/밑줄 |
| `--tcw-red` / `--tcw-red-soft` | `#e8505b` / 틴트 | 하락/매도/음수 |
| `--tcw-green` / `--tcw-green-soft` | `#1fa874` / 틴트 | 상승/매수/양수 |
| `--tcw-amber` | `#ff9f43` | 경고 |
| `--tcw-hover-bg` | `rgba(255,255,255,.05)` | 행/버튼 호버 배경 |
| `--tcw-active-bg` | `rgba(255,255,255,.08)` | 행/버튼 눌림 배경 |
| `--tcw-divider` | `rgba(255,255,255,.06)` | 가는 구분선 |
| `--tcw-ease` / `--tcw-ease-out` | cubic-bezier | 전환 이징 |
| `--tcw-dur-fast` / `-normal` / `-slow` | `120ms` / `180ms` / `260ms` | 전환 지속 시간 |
| `--tcw-radius-sm` / `-base` / `-lg` / `-xl` | `4px` / `6px` / `10px` / `14px` | 모서리 반경 — 각진 모양을 원하면 `0`으로 설정 |
| `--tcw-shadow-sm` / `-md` / `-lg` / `-xl` | box-shadow 값 | 높이감(그림자) |
| `--tcw-ring` | `0 0 0 2px rgba(242,169,59,.45)` | 포커스 링 |
| `--tcw-font-mono` | `'JetBrains Mono', …` | 고정폭 글꼴 스택 (호가창, 코드) |

라이트 테마(`[data-tcw-theme="light"]`)는 색상 그룹(`--tcw-bg*`, `--tcw-border*`, `--tcw-text*`, `--tcw-accent*`, `--tcw-hover-bg`, `--tcw-active-bg`, `--tcw-divider`, `--tcw-shadow*`)을 자체 기본값으로 다시 정의합니다. 두 테마를 모두 지원한다면 두 셀렉터를 모두 덮어쓰세요.

## 기능

### 차트 유형

| 유형 | 설명 |
|---|---|
| 캔들스틱 | 표준 OHLC 캔들 |
| 할로우 캔들 | 시가/종가 관계로 채움 여부가 결정됨 |
| 바 (OHLC) | 클래식 시가-고가-저가-종가 바 |
| 라인 | 종가 선 |
| 영역 | 종가 아래를 채운 영역 |
| 기준선 | 기준 가격을 경계로 두 색으로 나뉘는 영역 |
| 하이킨아시 | 추세 파악을 위한 평활화된 캔들 |
| 렌코 | 시간을 무시하는 고정 크기 벽돌 |
| 카기 | 반전 기반 라인 차트 |
| 포인트 앤 피겨 | 수요/공급 분석을 위한 X/O 열 |
| 라인 브레이크 | 3선 전환 차트 |
| 레인지 바 | 고정 가격 범위 바 — 각 바의 고가 − 저가가 설정한 범위와 같음 |
| 거래량 캔들 | 너비가 거래량에 비례하는 캔들스틱 |
| 이퀴볼륨 | 너비가 거래량 비중에 비례하는 전체 범위 상자 (Richard Arms 방식) |
| HLC 영역 | 종가 선이 있는 고가-저가-종가 영역 밴드 |
| 계단선 | 종가로 만든 계단 모양 패턴 |
| 마커가 있는 라인 | 각 데이터 포인트에 원형 마커가 있는 종가 선 |

### 멀티 차트 그리드

십자선과 시간 축이 연동된 여러 차트를 나란히 표시합니다:

```typescript
import { ChartGrid, BinanceAdapter } from '@tradecanvas/chart'

const grid = new ChartGrid(document.getElementById('grid')!, {
  layout: '2x2',
  syncCrosshair: true,
  syncTimeAxis: true,
})

const adapter = new BinanceAdapter()
grid.connectAll(adapter, ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'], '5m')
```

지원 레이아웃: `'1x1'`, `'1x2'`, `'2x1'`, `'2x2'`, `'1x3'`, `'3x1'`, `'2x3'`, `'3x2'`.

### 명령 팔레트

ChartWidget 안에서 `Ctrl+K`(또는 `Cmd+K`)를 누르면 검색 가능한 명령 팔레트가 열립니다. 지표를 빠르게 찾아 켜고 끄거나, 차트 유형을 바꾸거나, 그리기 도구를 활성화하거나, 시간 단위를 전환하거나, 작업(스크린샷, 테마 전환, 설정)을 실행할 수 있습니다.

### 금융 차트

| 차트 | 설명 |
|---|---|
| SparklineChart | 숫자 배열로 그리는 작은 인라인 라인/영역 차트 — 대시보드와 KPI 카드용 |
| DepthChart | 누적 거래량 영역으로 표현한 매수/매도 호가창 시각화 |
| EquityCurveChart | 낙폭 음영과 벤치마크 비교를 갖춘 포트폴리오 자산 곡선 |
| HeatmapChart | 트리맵 레이아웃의 색상 셀 그리드 — 섹터/시장 성과용 |
| WaterfallChart | 누적 합계를 이어 가는 막대 — 손익 기여도, 매출 브리지, 현금 흐름 |
| GaugeChart | 속도계 스타일 게이지 — KPI, 리스크 점수, 공포·탐욕 지수 |

```typescript
import {
  SparklineChart, DepthChart, EquityCurveChart, HeatmapChart,
  WaterfallChart, GaugeChart,
} from '@tradecanvas/chart'

// Sparkline in a 120x48 container
new SparklineChart(el, { data: [100, 102, 98, 105, 103], mode: 'area', color: '#1fa874' })

// Equity curve with drawdown
new EquityCurveChart(el, { data: equityPoints, drawdown: true, benchmark: spyData })

// Order book depth
new DepthChart(el, { data: { bids, asks }, crosshair: true })

// Market heatmap (treemap weighted by market cap)
new HeatmapChart(el, { data: cells, weighted: true })

// P&L waterfall
new WaterfallChart(el, {
  data: [
    { label: 'Start', value: 10000, type: 'total' },
    { label: 'Gain', value: 1850 },
    { label: 'Loss', value: -620 },
    { label: 'End', value: 11230, type: 'total' },
  ],
})

// Fear & Greed gauge: zones light up to the value, the label shows the current zone
const gauge = new GaugeChart(el, {
  value: 72,
  label: 'Fear & Greed',
  zones: [
    { from: 0, to: 25, color: '#e8505b', label: 'Extreme fear' },
    { from: 25, to: 45, color: '#f2a93b', label: 'Fear' },
    { from: 45, to: 55, color: '#8a93a3', label: 'Neutral' },
    { from: 55, to: 75, color: '#62c895', label: 'Greed' },
    { from: 75, to: 100, color: '#1fa874', label: 'Extreme greed' },
  ],
  // pointer: 'needle',  // classic needle instead of the ring marker
})
gauge.setValue(85) // animates smoothly
```

### 지표 (내장)

85개 지표 — 가격 패널에는 이동평균(SMA, EMA, WMA, Hull, DEMA, TEMA, ALMA, KAMA,
LSMA, McGinley, SMMA, MA Cross, MTF MA), 밴드와 채널(Bollinger, Keltner,
Donchian, Envelope, Linear Regression), 추세와 스탑(Ichimoku, Supertrend,
Parabolic SAR, Chandelier, Chande Kroll Stop, Alligator, ZigZag, Fractals,
Pivot Points), VWAP과 매물대가 있고, 별도 패널에는 RSI, MACD, Stochastic, ATR,
ADX, CCI, OBV, MFI, Bollinger %B와 BandWidth, Historical Volatility, Ulcer Index
외 40개의 오실레이터, 거래량 및 변동성 지표가 있습니다.
[지표 카탈로그](https://bonguynvan.github.io/tradecanvas/docs/indicators)에서
모든 id와 그 입력값, 선, 레벨을 확인할 수 있습니다.

```typescript
import { indicatorSource } from '@tradecanvas/chart'

const rsi = chart.addIndicator('rsi', { period: 14 })!
chart.addIndicator('ema', { period: 21, source: 'hlc3' })                     // another price
chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') }) // RSI's own average, in RSI's pane
chart.setIndicatorLevels(rsi, [20, 50, 80])
```

- **소스**: close, open, high, low, hl2, hlc3, ohlc4, hlcc4, 또는 다른 지표의 선.
- **패널**: 패널마다 선, 레벨, 축, 십자선이 쓰는 값 눈금이 하나씩 있으며, 여러 지표가 한 패널을 함께 쓸 수 있습니다.
- **레벨**: 인스턴스마다 편집할 수 있고(RSI 30/70, CCI ±100 …), 저장된 레이아웃에 유지됩니다.
- **값 태그**: 각 선의 최신 값이 그 선의 색으로 축에 표시됩니다.
- **사용자 지정 지표**는 선(`plots`), 눈금, 레벨, 입력값을 선언하기만 하면 차트가 그리고 라벨을 붙입니다.

잘못된 파라미터(NaN, Infinity, 숫자가 아닌 문자열, 누락된 키)는 계산에 도달하지 않고
기본값으로 대체됩니다.

### 그리기 도구

추세선, 수평선, 수직선, 반직선, 연장선, 평행 채널, 피보나치 되돌림, 피보나치 확장, **피보나치 시간대**, 사각형, 타원, 삼각형, 화살표, 피치포크, 갠 팬, 갠 박스, 엘리엇 파동, 회귀 채널, 날짜 범위, 가격 범위, 측정, 앵커 VWAP, 고정 범위 매물대, 텍스트 주석

모든 그리기 도구는 다음을 지원합니다:
- OHLC 값에 자석처럼 달라붙는 클릭 배치
- 실행 취소 / 다시 실행 (Ctrl+Z / Ctrl+Y)
- 저장/불러오기를 위한 직렬화
- 사용자 지정 스타일 (색상, 두께, 점선 패턴)

### 트레이딩 오버레이

MT4/MT5처럼 열린 포지션과 대기 주문을 차트에 직접 그립니다.

```typescript
import type { TradingPosition, TradingOrder } from '@tradecanvas/chart'

chart.setPositions([{
  id: 'pos-1',
  side: 'buy',
  entryPrice: 3500,
  quantity: 1.5,
  closedQuantity: 0.5,   // partial close — visualized as a left-edge dim band
  stopLoss: 3400,
  takeProfit: 3700,
}])

chart.setOrders([{
  id: 'order-1',
  side: 'sell',
  type: 'limit',
  price: 3800,
  quantity: 0.5,
  label: 'TP',
  draggable: true,
}])

// Customize the position zone color via P&L thresholds
chart.setTradingConfig({
  pnlThresholds: [
    { pnl: -Infinity, color: '#b91c1c' },
    { pnl: 0,         color: '#94a3b8' },
    { pnl: 50,        color: '#16a34a' },
    { pnl: 200,       color: '#15803d' },
  ],
  // Custom label template — tokens: {side} {qty} {openQty} {closedQty} {entry} {price} {pnl} {pnlPct} {pnlSign}
  positionLabel: '{side} {openQty}/{qty} @ {entry} | {pnlSign}{pnl} ({pnlPct})',
})

// Listen for user drag-to-modify
chart.on('positionModify', (e) => console.log('SL/TP moved:', e.payload))
chart.on('orderModify', (e) => console.log('Order moved:', e.payload))
```

### 신호 마커

봇, 지표, 수동 분석에서 나온 매수/매도 신호를 시각화합니다.

```typescript
chart.addSignalMarker({
  time: 1715692800000,
  price: 62500,
  direction: 'long',
  confidence: 0.85,
  source: 'ema-crossover',
  label: 'EMA Cross',
})

// Color-code by source
chart.setSignalMarkerStyle({
  sourceColors: {
    'ema-crossover': '#4c8dff',
    'rsi-divergence': '#f2a93b',
    'whale-flow': '#9C27B0',
  },
})
```

### 거래 구간

체결된 거래의 진입→청산 사각형을 손익에 따른 색으로 그립니다.

```typescript
const zoneId = chart.addTradeZone({
  entryTime: 1715692800000,
  entryPrice: 62500,
  exitTime: 1715700000000,
  exitPrice: 63200,
  direction: 'long',
  pnl: 140,
  pnlPercent: 1.12,
})

// Update a live trade when it closes
chart.updateTradeZone(zoneId, {
  exitTime: Date.now(),
  exitPrice: 63500,
  pnl: 200,
})
```

### 실시간 스트리밍

```typescript
// Built-in Binance adapter (free, no API key)
chart.connect({
  adapter: new BinanceAdapter(),
  symbol: 'ETHUSDT',
  timeframe: '1m',
  historyLimit: 500,
})

// Or manual data feed
chart.setData(historicalBars)
chart.appendBar(newBar)
chart.updateLastBar(updatedBar)
chart.setCurrentPrice(3500.42)
```

**내장 어댑터**(모두 무료, API 키 불필요): `BinanceAdapter`, `CoinbaseAdapter`, `BybitAdapter`, `KrakenAdapter`, 그리고 오프라인/테스트용 `MockAdapter`.

```typescript
import { BybitAdapter, KrakenAdapter, CoinbaseAdapter } from '@tradecanvas/chart'

chart.connect({ adapter: new BybitAdapter(),    symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new KrakenAdapter(),   symbol: 'BTC/USD', timeframe: '5m' })
chart.connect({ adapter: new CoinbaseAdapter(), symbol: 'BTC-USD', timeframe: '15m' })
```

**어떤 피드든 약 20줄로.** `WebSocketAdapter`(실시간 + REST 과거 데이터) 또는 `PollingAdapter`(REST 전용 피드)를 확장하세요. 기반 클래스가 연결 수명 주기, 재연결, 디코딩, 이벤트 발생을 처리하므로 URL과 파싱 함수만 제공하면 됩니다:

```typescript
import { WebSocketAdapter } from '@tradecanvas/chart'

const myAdapter = new WebSocketAdapter({
  name: 'myexchange',
  wsUrl: (c) => `wss://api.myexchange.com/ws/${c.symbol}@kline_${c.timeframe}`,
  fetchHistory: (symbol, tf, limit) => fetch(`/candles?...`).then((r) => r.json()),
  parseMessage: (raw) => ({ bar: toBar(raw), closed: raw.k.x }),
})
```

### 실시간 주문 실행

`ExecutionAdapter`를 연결하면 표시 전용이던 트레이딩 오버레이가 실제 거래 화면이 됩니다. 차트는 주문/포지션 의도를 어댑터로 전달하고, 어댑터가 되돌려 보내는 권위 있는 `orders` / `positions`를 그립니다 — **어댑터가 유일한 진실 공급원(single source of truth)입니다**. 어댑터가 연결되지 않은 경우 이러한 의도는 일반 이벤트로 남습니다(하위 호환).

```typescript
import { PaperExecutionAdapter } from '@tradecanvas/chart'

chart.connectExecution(new PaperExecutionAdapter({ markPrice: 64000 }))

// Drag-to-create an order, then confirm:
chart.startOrderDraft('buy')   // draggable line at the latest close
chart.confirmOrderDraft()      // emits orderPlace → adapter fills → chart renders the position
// chart.cancelOrderDraft()

// One channel for failures (adapter-reported or a failed command):
chart.on('executionError', (e) => toast(e.payload.message))
```

`ExecutionAdapter`(`DataAdapter`와 같은 구조)를 구현해 실제 브로커 / OMS를 연결하세요: `placeOrder`, `modifyOrder`, `cancelOrder`, `modifyPosition`, `closePosition`, 그리고 `orders` / `positions` / `fill` / `error` 이벤트. `PaperExecutionAdapter`는 데모와 테스트를 위한 가상 체결 샌드박스입니다. 드래그로 만든 주문의 유형(지정가 vs 스탑)은 현재 가격을 기준으로 선을 놓은 위치에서 판단합니다.

### 플러그인 — 차트 확장

사용자 지정 **지표**, **그리기 도구**, **차트 유형**, **오버레이**를 전역(이후 생성되는 모든 차트가 상속) 또는 차트별로 등록하세요.

```typescript
import { Chart, registerPlugin, IndicatorBase } from '@tradecanvas/chart'

class MyIndicator extends IndicatorBase { /* descriptor, calculate(), render() */ }

// 1) Global — available to every chart created afterward:
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction:
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance:
chart.plugins.register({ kind: 'chartType', plugin: myCustomCandles })
chart.setChartType('my-custom-candles')   // custom chart types render via the plugin
```

| 플러그인 종류 | 계약 |
|---|---|
| `indicator` | `IndicatorPlugin` — `calculate()` + `render()` |
| `drawing` | `DrawingPlugin` — `render()` + `hitTest()` |
| `chartType` | `ChartTypePlugin` — `createRenderer()` + 선택적 `transform()` |
| `overlay` | `OverlayPlugin` — `main` / `overlay` / `ui` 레이어에서 `render(ctx, { viewport, data, theme })` |

### 차트 밖에서 지표 계산

`IndicatorWorkerHost`는 Web Worker가 사용할 것과 같은 메시지로 봉 데이터에서 지표를
계산합니다. 워커 스크립트는 아직 배포 패키지에 포함되어 있지 않습니다. `null`을 전달하고
플러그인을 등록하면 그 자리에서 계산합니다(SSR, 테스트, 스크립트):

```typescript
import { IndicatorWorkerHost, RSIIndicator } from '@tradecanvas/core'

const host = new IndicatorWorkerHost(null)
host.registerFallbackPlugin(new RSIIndicator())
const output = await host.calculate('rsi', { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }, bars)
```

### 저장 / 불러오기

```typescript
const json = chart.saveState()
localStorage.setItem('my-chart', json!)

chart.loadState(localStorage.getItem('my-chart')!)

// Download / upload files
chart.downloadState('my-chart.json')
await chart.loadStateFromFile()

// Or keep a layout saved as it changes (debounced)
chart.setAutoSave('my-chart', 1500)
```

저장된 레이아웃에는 차트 유형, 테마, 그림, 지표(입력값, 패널, 색상, 표시 여부),
알림(지표 선에 건 알림 포함)이 담깁니다.

### 테마

```typescript
import { DARK_THEME, LIGHT_THEME, DARK_TERMINAL } from '@tradecanvas/chart'

// Built-in presets: DARK_THEME, LIGHT_THEME, DARK_TERMINAL
chart.setTheme(DARK_TERMINAL)  // fintech terminal: #0E0E0E bg, #00FF87/#FF3B4D candles, monospace

// Or customize any preset
chart.setTheme({
  ...DARK_THEME,
  candleUp: '#1fa874',
  candleDown: '#e8505b',
  background: '#0a0a0f',
})
```

### 이벤트

```typescript
chart.on('crosshairMove', (e) => { /* { point, bar, barIndex, indicatorValues } — also over indicator panes */ })
chart.on('crosshairLeave', () => { /* the pointer left the plot */ })
chart.on('drawingToolChange', (e) => { /* { tool } — null once a drawing is finished or cancelled */ })
chart.on('indicatorUpdate', (e) => { /* { from } — indicator values recomputed from this bar on */ })
chart.on('paneResize', (e) => { /* { instanceId, size } — an indicator pane was resized */ })
chart.on('indicatorChange', (e) => { /* { instanceId, change } — shown/hidden, restyled, levels, inputs or pane changed */ })
chart.on('barClick', (e) => { /* { bar, barIndex, point } */ })
chart.on('visibleRangeChange', (e) => { /* { from, to } — bar indices, not timestamps */ })
chart.on('priceRangeChange', (e) => { /* { min, max } — visible price bounds */ })
chart.on('zoomChange', (e) => { /* { barWidth } — pixels per bar */ })
chart.on('drawingCreate', (e) => { /* ... */ })
chart.on('orderModify', (e) => { /* ... */ })
chart.on('positionModify', (e) => { /* ... */ })
```

`visibleRangeChange`, `priceRangeChange`, `zoomChange`는 이동, 확대/축소, 크기 조절,
데이터 업데이트가 있을 때마다 발생하지만, 해당 뷰포트 상태가 실제로 바뀐 경우에만
발생합니다. `visibleRangeChange`의 인덱스는
`chart.getData()[e.payload.from].time`으로 시간으로 변환할 수 있습니다.

### 리플레이 모드

`ReplayController`는 과거 `DataSeries`를 제어된 속도로 재생합니다. `Chart`와 분리되어 있어 어떤 대상에든 연결할 수 있습니다(UI 재생에는 차트, 헤드리스 백테스트에는 전략 함수).

```typescript
import { ReplayController } from '@tradecanvas/chart'

const replay = new ReplayController({
  data: historicalBars,
  speed: 10,        // bars per second
  startIndex: 0,
})

// Seed the chart with the prefix before replay starts
chart.setData(replay.getPrefix())

// Each emitted bar drives the chart forward
replay.on('bar', ({ bar }) => chart.appendBar(bar))
replay.on('finished', () => console.log('done'))

replay.start()
// replay.pause(); replay.resume(); replay.step(5); replay.seek(200); replay.setSpeed(20)
```

### 차트 인터랙션

데스크톱 트레이딩 차트에서 기대하는 모든 제스처가 내장되어 있습니다:

| 제스처 | 결과 |
|---|---|
| 차트 본문을 좌우로 드래그 | 시간 축을 따라 이동 |
| 차트 본문을 위아래로 드래그 | 가격 눈금 이동 (자동 눈금이 고정됨. 가격 축을 더블 클릭하면 복원) |
| 가격 축을 위아래로 드래그 | 세로 눈금 압축 / 확장 (자동 눈금이 고정됨) |
| 시간 축을 좌우로 드래그 | 시간 축 확대/축소 |
| 가격 축 더블 클릭 | 자동 눈금 다시 켜기 |
| 시간 축 더블 클릭 | 모든 데이터를 화면에 맞춤 |
| 휠 | 커서를 중심으로 확대/축소 |
| 패널 구분선 드래그 | 지표 패널 크기 조절 (호버 시 `ns-resize` 커서) |
| `Shift` + 드래그 | 측정 자 (봉 수 × 시간 × 가격 Δ × %) |
| `Alt` + 클릭 | OHLC 툴팁 고정. 실시간 십자선에 고정된 봉과의 Δ 표시 |
| 호버 | 가격 + 시간 라벨이 양쪽 축을 따라 이동 |
| `Esc` | 툴팁 고정 해제 / 그리기 취소 |
| `?` | 키보드 단축키 목록 표시 *(위젯)* |
| `Ctrl/⌘ + K` | 명령 팔레트 *(위젯)* |
| `Ctrl/⌘ + P` | 종목 검색 *(위젯)* |
| `Ctrl/⌘ + Z` / `Shift + Z` | 그림 실행 취소 / 다시 실행 |

### 데이터 가져오기 — 드래그 앤 드롭 또는 코드로

```typescript
import { parseOHLCV } from '@tradecanvas/chart'

const { data, rowCount, skipped } = parseOHLCV(csvText)
chart.setData(data)
```

CSV 또는 JSON 파일을 위젯에 놓으면 즉시 불러옵니다. 구분자(`,` / `;` / 탭 / `|`),
헤더 유무, ISO 8601 타임스탬프, 배열의 배열 vs 객체의 배열 형태의 JSON을 자동으로
감지합니다.

### 백테스트 (`@tradecanvas/analytics`)

가상 체결, 수수료/슬리피지 모델, 완전한 리스크 지표 보고서를 갖춘 봉 단위 전략 백테스터입니다.

```typescript
import { Backtester, PercentCommission, PercentSlippage } from '@tradecanvas/analytics'

const bt = new Backtester({
  initialCash: 10_000,
  commission: new PercentCommission(0.0005),
  slippage: new PercentSlippage(0.0003),
})

const result = bt.run(historicalBars, (ctx) => {
  // Strategy fn runs at close of each bar; orders fill on the NEXT bar.
  if (!ctx.position && smaFast > smaSlow) {
    ctx.placeOrder({ side: 'long', type: 'market', quantity: 1 })
  } else if (ctx.position && smaFast < smaSlow) {
    ctx.close()
  }
})

console.log(result.metrics.sharpe)         // 1.42
console.log(result.metrics.maxDrawdownPct) // 0.087
console.log(result.equityCurve)            // → feed into the chart via EquityCurveRenderer
```

반환값: `fills`, 청산된 `trades`, `equityCurve`, `metrics`(Sharpe, Sortino, Calmar, CAGR, 최대 낙폭, 승률, 수익 팩터, 기대값). [라이브 백테스트 데모](https://bonguynvan.github.io/tradecanvas/docs/analytics/)를 확인해 보세요.

#### 전략 라이브러리
바로 끼워 쓸 수 있는 참조 전략 4가지 — 각각 `Backtester.run()`에 그대로 넣을 수 있는
`StrategyFn`을 반환합니다:

```typescript
import {
  Backtester,
  smaCrossStrategy,
  rsiReversionStrategy,
  donchianBreakoutStrategy,
  bollingerReversionStrategy,
} from '@tradecanvas/analytics'

const bt = new Backtester({ initialCash: 10_000 })
bt.run(bars, smaCrossStrategy({ fastPeriod: 10, slowPeriod: 30 }))
bt.run(bars, donchianBreakoutStrategy({ entryPeriod: 20, exitPeriod: 10 }))
```

#### 몬테카를로 경로 의존성
실현된 거래 순서를 N번 섞어, 전략이 운 좋은 순서에 기대고 있는지 드러냅니다.
P5/P95 밴드가 좁으면 견고한 우위, 넓으면 경로 의존적입니다.

```typescript
import { runMonteCarlo } from '@tradecanvas/analytics'

const result = bt.run(bars, smaCrossStrategy())
const mc = runMonteCarlo(10_000, result.trades, { simulations: 1000, seed: 42 })

mc.equityBands              // [{ step, p5, p25, p50, p75, p95 }, …]
mc.finalEquityPercentiles   // { p5, p25, p50, p75, p95 }
mc.probabilityProfitable    // 0..1
mc.worstMaxDrawdownPct
```

## 비교

| 기능 | @tradecanvas/chart | lightweight-charts | chart.js | Highcharts Stock |
|---|---|---|---|---|
| 차트 유형 | 17 + 금융 6 | 4 | 8 (비금융) | 10+ |
| 금융 차트 | Sparkline, Depth, Equity, Heatmap, Waterfall, Gauge | 없음 | 없음 | 일부 |
| 내장 지표 | 85 | 0 | 0 | ~30 |
| 그리기 도구 | 69 | 0 | 0 | 일부 |
| 트레이딩 오버레이 | 완전 지원 (포지션 + 주문 + 드래그) | 없음 | 없음 | 없음 |
| 실시간 스트리밍 | 내장 (Binance) | 수동 | 수동 | 내장 |
| 상태 저장/불러오기 | 예 | 아니요 | 아니요 | 예 |
| 리플레이 모드 | 예 (`ReplayController`) | 아니요 | 아니요 | 아니요 |
| 백테스터 | 예 (`@tradecanvas/analytics`) | 아니요 | 아니요 | 아니요 |
| 멀티 차트 그리드 | 예 (`ChartGrid`) | 아니요 | 아니요 | 예 |
| 번들 (gzip) | ~100 KB 코어 | ~45 KB | ~70 KB | ~200 KB |
| 의존성 | 0 | 1 | 0 | 0 |
| 위젯 (완전한 UI) | 예 (`ChartWidget`) | 아니요 | 아니요 | 아니요 |
| 라이선스 | MIT | Apache 2.0 | MIT | 상용 |

## API 개요

### `new Chart(container, options)`

```typescript
const chart = new Chart(element, {
  chartType: 'candlestick',
  theme: DARK_THEME,
  autoScale: true,
  rightMargin: 5,
  numberLocale: 'en-US',  // or 'de-DE', 'vi-VN', etc. — BCP 47 locale
  crosshair: { mode: 'magnet' },
  features: { drawings: true, indicators: true, trading: true, volume: true },
})

// Change locale at runtime
chart.setNumberLocale('de-DE')  // 65.234,00
```

### 주요 메서드

| 메서드 | 설명 |
|---|---|
| `setData(bars)` | 과거 OHLCV 데이터 불러오기 |
| `appendBar(bar)` | 새 캔들 추가 |
| `appendBars(bars)` | 일괄 추가 (재연결 후 누락분 따라잡기) |
| `updateLastBar(bar)` | 진행 중인 캔들 업데이트 |
| `setCurrentPrice(price, pulseColor?)` | 실시간 가격선 표시 |
| `connect(config)` | 실시간 데이터 소스에 연결 |
| `setTimeframe(tf)` | 활성 스트림의 시간 단위 전환 |
| `setChartType(type)` | 차트 유형 전환 |
| `setTheme(theme)` | 테마 적용 (DARK_THEME, LIGHT_THEME, DARK_TERMINAL) |
| `setNumberLocale(locale)` | 숫자 형식 로케일 설정 (en-US, de-DE, vi-VN) |
| `setStatusText(text)` | 범례 영역에 상태 표시 ("LIVE · 8ms") |
| `addIndicator(id, params?)` | 기술 지표 추가 |
| `removeIndicator(instanceId)` | 지표 제거 |
| `setDrawingTool(tool)` | 그리기 도구 활성화 |
| `setPositions(positions)` | 트레이딩 포지션 그리기 |
| `setOrders(orders)` | 대기 주문 그리기 |
| `setVolumeProfileVisible(v)` | 가로 매물대 오버레이 켜기/끄기 |
| `setVolumeProfileConfig({ buckets, widthRatio, opacity, highlightPoC })` | 매물대 세부 조정 |
| `setAutoScale(v)` / `setLogScale(v)` | 가격 눈금 모드 고정 또는 변경 |
| `setInvertScale(v)` | 가격 눈금을 위아래로 뒤집기 |
| `fitContent()` / `scrollToEnd()` | 모든 데이터를 화면에 맞춤 / 실시간 끝으로 이동 |
| `setVisibleRangePreset(p)` | `1D`, `5D`, `1M`, `3M`, `6M`, `YTD`, `1Y`, `5Y` 또는 `All` 표시 |
| `goToTime(time)` | 해당 시간의 봉을 가운데에 표시 |
| `setCrosshairTime(time)` | 다른 차트의 십자선을 따라 표시 (세로선만) |
| `copyDrawings()` / `pasteDrawings()` | 선택 항목을 복사해 이 차트나 다른 차트에 붙여넣기 |
| `setStayInDrawingMode(v)` | 그림을 하나 그린 뒤에도 그리기 도구 유지 |
| `saveState(key?)` | 차트 상태 직렬화 |
| `loadState(json)` | 차트 상태 복원 |
| `screenshot()` | 차트를 이미지로 다운로드 |
| `on(event, handler)` | 이벤트 구독 |
| `destroy()` | 모든 리소스 정리 |

### 데이터 형식

```typescript
interface OHLCBar {
  time: number    // Unix time in ms or seconds (up to 1e12 is read as seconds); ascending
  open: number
  high: number
  low: number
  close: number
  volume: number
}
```

## 예제

| 예제 | 설명 |
|---|---|
| [라이브 데모](https://bonguynvan.github.io/tradecanvas/) | 기능 랩: 그리기 도구, 지표, 트레이딩, 기간, 페이지 단위 과거 데이터, 리플레이, 1센트 미만 가격과 14개 언어, 20만 봉, 느린 네트워크에서의 전환 — 모두 실시간 차트에서. 사이트와 문서는 베트남어, 중국어, 일본어, 한국어, 스페인어로도 제공됩니다 |
| [StackBlitz 샌드박스](https://bonguynvan.github.io/tradecanvas/examples/) | 클릭 한 번으로 포크 가능: vanilla `Chart`, `ChartWidget`, React / Vue / Svelte 래퍼, 금융 차트 |
| [`@tradecanvas/react`](./packages/react/) · [`/vue`](./packages/vue/) · [`/svelte`](./packages/svelte/) | 프레임워크 컴포넌트 — 반응형 props, 타입 지원, 보일러플레이트 없음 |

## AI 코딩 도구

- [`llms.txt`](https://bonguynvan.github.io/tradecanvas/llms.txt)와
  [`llms-full.txt`](https://bonguynvan.github.io/tradecanvas/llms-full.txt)는
  어시스턴트에게 문서를 한곳에 모아 제공합니다.
- 에이전트 스킬 [`skills/tradecanvas`](skills/tradecanvas/SKILL.md)는 코딩 에이전트에게
  TradeCanvas로 개발하는 방법을 알려 줍니다: 진입점, 대부분의 버그를 피하는 규칙,
  그리고 CI가 라이브러리를 대상으로 타입 검사하는 실제 예제. 사용하려면 이 폴더를
  프로젝트의 `.claude/skills/`(또는 사용하는 에이전트의 스킬 폴더)에 복사하세요.

## 브라우저 지원

Chrome 80+, Firefox 80+, Safari 14+, Edge 80+

## 프레임워크 통합

공식 래퍼 컴포넌트 — 반응형 props, ref, 보일러플레이트 없음. 코어와 함께 `1.x`로 배포됩니다:

```bash
npm install @tradecanvas/react    # or @tradecanvas/vue · @tradecanvas/svelte
```

```tsx
import { TradeCanvas } from '@tradecanvas/react'

<TradeCanvas symbol="BTCUSDT" timeframe="5m" theme="dark" indicators={['rsi', 'macd']} />
```

세 패키지 모두 같은 props 구성을 공유하며, `onReady` / ref / `bind:chart`를 통해 내부 `Chart`(그림, 트레이딩, 주문 실행, 플러그인용)를 넘겨줍니다. [프레임워크 문서](https://bonguynvan.github.io/tradecanvas/docs/frameworks)를 참고하세요.

### 헤드리스 (수명 주기 직접 관리)

`Chart` 클래스는 DOM 요소를 직접 받을 수도 있습니다 — 프레임워크에 구애받지 않습니다:

**React:**

```tsx
import { useEffect, useRef } from 'react'
import { Chart, BinanceAdapter } from '@tradecanvas/chart'

function TradingChart() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const chart = new Chart(ref.current!, {
      theme: 'dark',
      features: { indicators: true, drawings: true },
    })
    chart.connect({
      adapter: new BinanceAdapter(),
      symbol: 'BTCUSDT',
      timeframe: '5m',
    })
    return () => chart.destroy()
  }, [])

  return <div ref={ref} style={{ width: '100%', height: 500 }} />
}
```

**Svelte:**

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart'
  import type { TimeFrame } from '@tradecanvas/chart'

  interface Props { symbol?: string; timeframe?: TimeFrame }
  let { symbol = 'BTCUSDT', timeframe = '5m' }: Props = $props()

  let container: HTMLDivElement
  let chart: Chart | null = null

  onMount(() => {
    chart = new Chart(container, {
      chartType: 'candlestick',
      theme: DARK_THEME,
      autoScale: true,
      features: { indicators: true, drawings: true, volume: true },
    })
    chart.connect({ adapter: new BinanceAdapter(), symbol, timeframe })
  })

  onDestroy(() => chart?.destroy())

  $effect(() => {
    if (!chart) return
    chart.disconnectStream()
    chart.connect({ adapter: new BinanceAdapter(), symbol, timeframe })
  })
</script>

<div bind:this={container} style="width: 100%; height: 600px" />
```

**Vue:**

```vue
<template>
  <div ref="chartContainer" style="width: 100%; height: 600px" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart'

const chartContainer = ref<HTMLDivElement>()
let chart: Chart | null = null

onMounted(() => {
  if (!chartContainer.value) return
  chart = new Chart(chartContainer.value, {
    chartType: 'candlestick',
    theme: DARK_THEME,
    autoScale: true,
    features: { indicators: true, drawings: true, volume: true },
  })
  chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '5m' })
})

onUnmounted(() => chart?.destroy())
</script>
```

## 성능

이중 캔버스 Canvas2D 파이프라인: 호버 시에는 위쪽의 얇은 캔버스만 다시 그리고, 장면 전체는 다시 그리지 않습니다. 대용량 데이터를 빠르게 유지하는 네 가지 요소:

- **LTTB 다운샘플링** — 픽셀보다 봉이 훨씬 많으면 라인 / 영역 차트는 Largest-Triangle-Three-Buckets로 보이는 범위를 픽셀당 약 2개 포인트로 자동 다운샘플링합니다. 수십 배 적은 포인트를 그리면서도 선은 시각적으로 동일하게 유지되며, 일반 확대 수준에서는 아무 작업도 하지 않습니다. `lttbDownsample` 유틸리티도 export되어 직접 사용할 수 있습니다.
- **보이는 범위만 렌더링** — 모든 렌더러는 전체 시리즈가 아니라 화면에 보이는 봉만 순회합니다. 호버와 이동의 프레임 비용은 불러온 봉이 500개에서 100,000개가 되어도 일정합니다.
- **실시간 틱의 증분 지표 계산** — 틱은 형성 중인 봉만 바꾸므로, `update()`를 구현한 내장 지표(SMA, EMA, WMA, VWMA, Bollinger, Envelope, RSI, MACD, ATR, OBV, Stochastic)는 전체 과거가 아니라 그 봉만 다시 계산합니다. 나머지 지표는 전체 재계산으로 대체됩니다. 사용자 지정 플러그인은 `IndicatorPlugin.update`로 이 방식을 선택할 수 있습니다.
- **가벼운 전체 로드** — 종목/시간 단위를 전환하면 모든 지표를 한 번씩 다시 계산합니다. 봉별 `values` 조회는 `IndicatorValueMap`으로 이루어지고(봉이 시간 순서대로 들어오는 동안은 배열 기반이며, 타임스탬프를 키로 하는 `Map`보다 생성 비용이 약 3배 저렴), `setData`는 이미 올바른 형태인 봉을 하나하나 복사하지 않고 그대로 재사용합니다.

BB + EMA + RSI + MACD (`pnpm bench`, 단일 코어):

| 과거 데이터 | 전체 재계산 (전환 / `setData`) | 증분 `update()` (실시간 틱) |
|---|---|---|
| 봉 20,000개 | ~5 ms | ~0.0005 ms |
| 봉 100,000개 | ~27 ms | ~0.001 ms |

다운샘플링 처리량 (`pnpm bench`, 단일 코어):

| 보이는 포인트 → 1600 | 프레임당 시간 | 처리량 |
|---|---|---|
| 10,000 | ~0.025 ms | 39,600 / s |
| 100,000 | ~0.32 ms | 3,100 / s |
| 1,000,000 | ~2.6 ms | 380 / s |

10만 봉 라인 차트는 약 0.3 ms 만에 다운샘플링되어 16.6 ms 프레임 예산 안에 넉넉히 들어오며, 그다음 약 62배 적은 포인트를 그립니다(100k → 1600).

## 아키텍처

두 캔버스를 겹쳐 쌓습니다 — 호버 시에는 위쪽의 얇은 캔버스만 다시 그립니다:

```
  Top canvas    (crosshair + axis pills, legend, countdown, measure)   z=1
  Scene canvas  (grid, candles, indicators, drawings, orders, axes)    z=0
```

## 관련 프로젝트

- **[bo-grid](https://github.com/bonguynvan/bo-grid)** — 핀테크 UI를 위한 작고 빠른 **Svelte 5** 데이터 그리드: 캔버스 스파크라인, 일괄 처리되는 실시간 셀 업데이트, 가상 스크롤, 그룹화 / 피벗 / 트리 데이터, Excel 내보내기를 지원하며, 코어는 gzip 기준 약 32 KB입니다. 같은 툴킷의 테이블 담당으로, TradeCanvas와 함께 쓰면 완전한 트레이딩 데스크가 됩니다. **[라이브 데모](https://bonguynvan.github.io/bo-grid/)**

## 라이선스

[MIT](./LICENSE)
