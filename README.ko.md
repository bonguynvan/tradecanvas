<p align="center">
  <a href="https://bonguynvan.github.io/tradecanvas/ko/"><img src=".github/assets/banner.png" alt="TradeCanvas, 트레이딩 앱을 위한 차트 엔진" width="100%"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@tradecanvas/chart"><img src="https://img.shields.io/npm/v/@tradecanvas/chart?style=flat-square&labelColor=0b0e13&color=f2a93b&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@tradecanvas/chart"><img src="https://img.shields.io/npm/dm/@tradecanvas/chart?style=flat-square&labelColor=0b0e13&color=3ccf91" alt="npm downloads"></a>
  <a href="https://github.com/bonguynvan/tradecanvas/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/bonguynvan/tradecanvas/ci.yml?branch=main&style=flat-square&labelColor=0b0e13&label=CI" alt="CI status"></a>
  <a href="https://pkg.pr.new/~/bonguynvan/tradecanvas"><img src="https://pkg.pr.new/badge/bonguynvan/tradecanvas" alt="pkg.pr.new previews"></a>
  <img src="https://img.shields.io/badge/third--party%20deps-0-3ccf91?style=flat-square&labelColor=0b0e13" alt="No third-party dependencies">
  <img src="https://img.shields.io/badge/TypeScript-strict-4c8dff?style=flat-square&labelColor=0b0e13" alt="TypeScript">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/bonguynvan/tradecanvas?style=flat-square&labelColor=0b0e13&color=a9b0bd" alt="MIT license"></a>
  <a href="https://github.com/bonguynvan/tradecanvas/stargazers"><img src="https://img.shields.io/github/stars/bonguynvan/tradecanvas?style=flat-square&labelColor=0b0e13&color=f2a93b" alt="GitHub stars"></a>
  <a href="https://github.com/sponsors/bonguynvan"><img src="https://img.shields.io/github/sponsors/bonguynvan?style=flat-square&labelColor=0b0e13&color=db61a2&label=sponsors&logo=githubsponsors&logoColor=db61a2" alt="GitHub Sponsors"></a>
</p>

<p align="center">
  <b><a href="https://bonguynvan.github.io/tradecanvas/ko/">라이브 데모</a></b> ·
  <a href="https://bonguynvan.github.io/tradecanvas/ko/docs/getting-started/">문서</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/ko/examples/">예제</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/ko/playground/">Playground</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/ko/audit/">시스템 점검</a> ·
  <a href="./CHANGELOG.md">변경 기록</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <b>한국어</b> · <a href="README.es.md">Español</a>
</p>

**웹을 위한 완전한 트레이딩 차트.** 캔들스틱부터 렌코까지, 134개 지표, 69개 그리기 도구, 거래소 실시간 피드와 차트 위 주문을 서드파티 의존성 없이 Canvas 2D 또는 WebGL로 그립니다. 완전한 `ChartWidget`을 그대로 넣거나 헤드리스 `Chart` 위에 직접 UI를 만들 수 있으며, TypeScript, React, Vue, Svelte를 지원합니다.

<p align="center">
  <a href="https://bonguynvan.github.io/tradecanvas/ko/"><img src=".github/assets/hero.png" alt="Binance의 실시간 BTCUSDT를 보여 주는 ChartWidget: EMA 21과 55, RSI, 추세선, 롱 포지션, 실시간 시세가 있는 관심 종목" width="100%"></a>
</p>

## 주요 특징

- **18가지 차트 유형**: 캔들과 하이킨아시부터 렌코, 카기, 포인트 앤 피겨, 이퀴볼륨까지, 그리고 여섯 가지 금융 차트(스파크라인, 호가 깊이, 자산 곡선, 히트맵, 워터폴, 게이지).
- **134개 지표와 69개 그리기 도구**: 지표 위의 지표, 추세선 알림, 템플릿, 그룹, 실행 취소와 다시 실행.
- **차트 위에서 거래**: 실시간 손익이 표시되는 포지션, 드래그로 옮기는 주문과 손절/익절, 주문 티켓, 계좌 패널, 그리고 모의 거래 브로커 또는 직접 만든 실행 어댑터.
- **실시간 데이터**: Binance, Bybit, Coinbase, Kraken이 내장되어 있고 다른 피드도 약 20줄이면 연결됩니다. 뒤로 스크롤하면 이전 과거 데이터를 불러오며, 어떤 시간 단위든, 틱 차트도 지원합니다.
- **Canvas 2D 또는 WebGL**: 100만 개 봉을 60 fps로 이동하며, 어떤 화면 배율에서도 선명합니다.
- **완전한 작업 공간**: 멀티 차트 그리드, 이름을 붙인 레이아웃, 모의 거래가 가능한 봉 리플레이, 그리고 `@tradecanvas/analytics`의 백테스터.
- **원하는 대로**: 101개 스타일 키, 112개 기능 스위치, 세 가지 외관, 그리고 지표, 그리기 도구, 차트 유형, 오버레이를 위한 플러그인.
- **모두를 위해**: 위젯은 오른쪽에서 왼쪽으로 쓰는 언어를 포함한 30개 언어로 제공되며, 스크린 리더와 키보드를 지원합니다.

## 설치

```bash
npm install @tradecanvas/chart
```

## 빠른 시작

`ChartWidget`은 도구 모음, 그리기 사이드바, 설정, 상태 표시줄을 갖춘 트레이딩 UI 전체를 한 번의 호출로 만듭니다.

```typescript
import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(), // 실시간 데이터, API 키 불필요
  trading: true,
})
```

UI를 직접 만들려면 헤드리스 `Chart`와 그 API를 사용하세요.

```typescript
import { Chart } from '@tradecanvas/chart'

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' })
chart.setData(bars) // [{ time, open, high, low, close, volume }, …]
chart.addIndicator('ema', { period: 50 })
chart.addIndicator('rsi')
```

직접 가진 피드는 `WebSocketAdapter` 또는 `PollingAdapter`로 연결합니다. [실시간](https://bonguynvan.github.io/tradecanvas/ko/docs/realtime/)을 참고하세요.

## 프레임워크

```bash
npm install @tradecanvas/react    # 또는 @tradecanvas/vue, @tradecanvas/svelte
```

```tsx
import { TradeCanvas } from '@tradecanvas/react'

<TradeCanvas symbol="BTCUSDT" timeframe="5m" indicators={['rsi', { id: 'ema', params: { period: 50 } }]} />
```

세 컴포넌트는 같은 props를 공유하며 내부 `Chart`를 넘겨줍니다. [프레임워크](https://bonguynvan.github.io/tradecanvas/ko/docs/frameworks/)를 참고하세요.

## 둘러보기

<table>
  <tr>
    <td width="50%" valign="top">
      <a href=".github/assets/drawings.png"><img src=".github/assets/drawings.png" alt="그리기 도구: 메모가 달린 피보나치 되돌림, 추세선, 엘리엇 충격 파동, 롱 포지션"></a>
      <br><b>69개 그리기 도구</b><br>
      피보나치, 갠, 피치포크, 엘리엇 파동, 하모닉 패턴, 메모, 그리고 거래 규모를 계산하는 롱/숏 포지션.
    </td>
    <td width="50%" valign="top">
      <a href=".github/assets/trading.png"><img src=".github/assets/trading.png" alt="차트 위 거래: 손절과 익절이 걸린 롱 포지션, 매수 스톱과 매도 지정가 주문, 계좌 패널"></a>
      <br><b>차트 위에서 거래</b><br>
      실시간 손익이 표시되는 포지션, 드래그로 가격을 바꾸는 주문, 주문 티켓과 계좌 패널.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href=".github/assets/grid.png"><img src=".github/assets/grid.png" alt="여러 시간 단위의 BTC, ETH, SOL, BNB 차트로 된 2×2 작업 공간"></a>
      <br><b>멀티 차트 작업 공간</b><br>
      최대 여섯 개의 차트를 나란히 두고 종목, 시간 단위, 십자선, 시간, 그림으로 연동합니다.
    </td>
    <td width="50%" valign="top">
      <a href=".github/assets/looks.png"><img src=".github/assets/looks.png" alt="하나의 차트, 세 가지 외관: studio, terminal, 라이트 테마의 capsule"></a>
      <br><b>나만의 외관</b><br>
      세 가지 프리셋 또는 모서리 둥글기, 밀도, 글꼴, 가격 라벨을 직접 정할 수 있으며, 라이트와 다크 테마를 모두 지원합니다.
    </td>
  </tr>
</table>

## 문서

| 주제 | |
|---|---|
| [시작하기](https://bonguynvan.github.io/tradecanvas/ko/docs/getting-started/) | 설치, 위젯, 헤드리스 차트 |
| [차트 유형](https://bonguynvan.github.io/tradecanvas/ko/docs/chart-types/) · [지표](https://bonguynvan.github.io/tradecanvas/ko/docs/indicators/) · [그리기 도구](https://bonguynvan.github.io/tradecanvas/ko/docs/drawing-tools/) | 차트가 그리는 것과 각각의 설정 |
| [실시간](https://bonguynvan.github.io/tradecanvas/ko/docs/realtime/) | 내장 피드, 직접 만든 어댑터, 과거 데이터, 틱 차트 |
| [트레이딩](https://bonguynvan.github.io/tradecanvas/ko/docs/trading/) | 주문, 포지션, 실행 어댑터, 리플레이 |
| [스타일](https://bonguynvan.github.io/tradecanvas/ko/docs/styling/) · [사용자 정의](https://bonguynvan.github.io/tradecanvas/ko/docs/customization/) | 테마, 스타일 키, 외관, 기능 스위치, 직접 만든 부품 |
| [플러그인](https://bonguynvan.github.io/tradecanvas/ko/docs/plugins/) | 직접 만든 지표, 그리기 도구, 차트 유형, 오버레이 |
| [분석](https://bonguynvan.github.io/tradecanvas/ko/docs/analytics/) · [금융 차트](https://bonguynvan.github.io/tradecanvas/ko/docs/finance/) | 백테스트와 리스크 지표, 호가 깊이·자산 곡선 등의 차트 |
| [성능](https://bonguynvan.github.io/tradecanvas/ko/docs/performance/) · [API 레퍼런스](https://bonguynvan.github.io/tradecanvas/ko/docs/api/) | 측정 결과와 전체 API |

문서는 English, Tiếng Việt, 简体中文, 日本語, Español으로도 제공됩니다.

## 성능

내장 그래픽(Intel UHD)의 Chrome에서 측정했습니다. 전체 표는 [시스템 점검](https://bonguynvan.github.io/tradecanvas/ko/audit/)에 있습니다.

| | |
|---|---|
| 1,000,000개 봉 + 지표 4개, 축소 화면, WebGL | 프레임당 16.7 ms (60 fps) |
| 지표 네 개가 있는 100,000개 봉에서 실시간 틱 한 번 | ~0.001 ms |
| `Chart` / `ChartWidget`, minify 및 gzip 후 | 176 KB / 315 KB |

## 패키지

| 패키지 | |
|---|---|
| [`@tradecanvas/chart`](https://www.npmjs.com/package/@tradecanvas/chart) | 차트와 `ChartWidget` (`/widget`) |
| [`@tradecanvas/react`](https://www.npmjs.com/package/@tradecanvas/react) · [`/vue`](https://www.npmjs.com/package/@tradecanvas/vue) · [`/svelte`](https://www.npmjs.com/package/@tradecanvas/svelte) | 프레임워크 컴포넌트 |
| [`@tradecanvas/analytics`](https://www.npmjs.com/package/@tradecanvas/analytics) | 백테스터와 리스크 지표 |
| `@tradecanvas/core` · `@tradecanvas/commons` | 엔진과 공유 타입, 차트와 함께 설치됨 |

## 미리 보기 빌드

모든 풀 리퀘스트와 `main`의 모든 커밋은 [pkg.pr.new](https://pkg.pr.new)에 게시되므로, 수정이나 기능을 릴리스 전에 써 볼 수 있습니다. 풀 리퀘스트 번호나 커밋으로 미리 보기를 설치하세요.

```bash
npm install https://pkg.pr.new/@tradecanvas/chart@123      # 풀 리퀘스트 #123
npm install https://pkg.pr.new/@tradecanvas/chart@a1b2c3d  # main의 커밋
```

각 풀 리퀘스트에는 모든 패키지의 정확한 명령이 담긴 댓글이 달립니다.

## 브라우저 지원

Chrome 80+, Firefox 80+, Safari 14+, Edge 80+.

## AI 코딩 도구

[`llms.txt`](https://bonguynvan.github.io/tradecanvas/llms.txt)와 [`llms-full.txt`](https://bonguynvan.github.io/tradecanvas/llms-full.txt)는 어시스턴트에게 문서를 한 파일로 제공하고, [`skills/tradecanvas`](skills/tradecanvas/SKILL.md)의 에이전트 스킬은 CI가 타입 검사하는 예제로 코딩 에이전트에게 API를 알려 줍니다.

## 관련 프로젝트

- **[bo-grid](https://github.com/bonguynvan/bo-grid)**: 핀테크 UI를 위한 작고 빠른 Svelte 5 데이터 그리드로, 트레이딩 데스크의 테이블 담당입니다. [라이브 데모](https://bonguynvan.github.io/bo-grid/)

## 기업 고객

TradeCanvas를 고객용 제품에 넣으시나요? 표시해야 할 로고도, 신청 절차도 없습니다. [기업 페이지](https://bonguynvan.github.io/tradecanvas/ko/business/)에서 IT 검토에서 자주 묻는 항목에 출처와 함께 답하고, 첫 파트너 프로그램을 소개합니다. 문의: business@tradingdek.com.

## 기여하기

질문, 아이디어, TradeCanvas로 만든 것은 [Discussions](https://github.com/bonguynvan/tradecanvas/discussions)에, 버그는 이슈에 남겨 주세요. 풀 리퀘스트도 환영합니다. [CONTRIBUTING.md](./CONTRIBUTING.md)에 개발 환경 설정(`pnpm install && pnpm build && pnpm test`)과 풀 리퀘스트에 필요한 것을 정리해 두었습니다. 보안 문제를 발견했다면 이슈를 열지 말고 [SECURITY.md](./SECURITY.md)를 따라 주세요.

## 후원

TradeCanvas는 무료이며 MIT 라이선스로 공개적으로 개발·유지되고 있습니다. 여러분의 제품에 도움이 된다면 [GitHub Sponsors](https://github.com/sponsors/bonguynvan)에서 개발을 후원할 수 있습니다.

## 라이선스

[MIT](./LICENSE)
