<p align="center">
  <a href="https://tradecanvas.dev/ko/"><img src=".github/assets/banner.png" alt="TradeCanvas, 트레이딩 앱을 위한 차트 엔진" width="100%"></a>
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
  <b><a href="https://tradecanvas.dev/ko/chart/">라이브 데모</a></b> ·
  <a href="https://tradecanvas.dev/ko/docs/getting-started/">문서</a> ·
  <a href="https://tradecanvas.dev/ko/examples/">예제</a> ·
  <a href="https://tradecanvas.dev/ko/audit/">시스템 점검</a> ·
  <a href="./CHANGELOG.md">변경 기록</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <b>한국어</b> · <a href="README.es.md">Español</a>
</p>

**웹을 위한 완전한 트레이딩 차트.** 캔들스틱부터 렌코까지, 134개 지표, 69개 그리기 도구, 거래소 실시간 피드와 차트 위 주문을 서드파티 의존성 없이 Canvas 2D 또는 WebGL로 그립니다. 완전한 `ChartWidget`을 그대로 넣거나 헤드리스 `Chart` 위에 직접 UI를 만들 수 있으며, TypeScript, React, Vue, Svelte를 지원합니다.

<p align="center">
  <a href="https://tradecanvas.dev/ko/chart/"><img src=".github/assets/clips/hero.webp" alt="실시간 시장의 ChartWidget: EMA 21과 55, RSI, 십자선, 마우스로 그린 추세선" width="100%"></a>
</p>

## 주요 특징

- **18가지 차트, 134개 지표, 69가지 드로잉 도구**, 지표 위의 지표, 선에 거는 알림, 실행 취소와 다시 실행.
- **차트 위 거래**: 손익이 실시간으로 바뀌는 포지션, 끌어서 옮기는 주문과 손절, 모의 브로커 또는 직접 연결.
- **실시간 데이터**: Binance, Bybit, Coinbase, Kraken 내장, 직접 만든 피드는 스무 줄 남짓.
- **빠름**: WebGL로 봉 100만 개를 60 fps로 이동, 실시간 틱 하나에 약 1마이크로초.
- **작업 공간**: 차트 그리드, 레이아웃, 봉 리플레이, 백테스트.
- **원하는 대로**: 테마, 세 가지 룩, 114개 스위치, 플러그인; 30개 언어; 휴대폰과 앱.

<table>
  <tr>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/trading.webp" alt="롱 포지션의 익절과 손절을 끌어서 옮기면 가격에 따라 손익이 바뀜">
      <br><b>끌어서 옮기는 주문</b>: 손절, 목표가, 지정가가 마우스를 따라 움직입니다.
    </td>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/replay.webp" alt="볼린저 밴드와 함께 시장을 다시 재생">
      <br><b>봉 리플레이</b>: 시장을 다시 재생하고 그 위에서 모의 거래.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/grid.webp" alt="2×2 그리드에 시간 단위가 다른 차트 네 개, 십자선이 모두를 따라감">
      <br><b>그리드</b>: 차트 최대 여섯 개를 종목, 시간 단위, 십자선, 시간으로 연동.
    </td>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/looks.webp" alt="한 차트가 Terminal, Capsule, Studio 룩과 다크·라이트를 오감">
      <br><b>나만의 룩</b>: Studio, Terminal, Capsule, 라이트 또는 다크, 또는 직접 만든 토큰.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" align="center">
      <img src=".github/assets/clips/phone.webp" alt="휴대폰의 위젯: 손가락으로 차트를 옮기고 추세선을 그림" width="46%">
    </td>
    <td width="50%" valign="top">
      <br><b>휴대폰에서</b>: 손가락으로 이동, 확대, 그리기, 주문 끌기를 하고, 위젯은 작은 화면에 맞게 배치를 바꿉니다. WebView, React Native, Capacitor, Tauri에서도 동작합니다.
    </td>
  </tr>
</table>

## 빠른 시작

```bash
npm install @tradecanvas/chart
```

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

헤드리스 `Chart`는 직접 준비한 봉 데이터(`chart.setData(bars)`)를 받고 화면은 여러분에게 맡깁니다. React, Vue, Svelte에서는 `@tradecanvas/react`, `/vue`, `/svelte`가 같은 props의 컴포넌트로 감쌉니다.

## 문서

[시작하기](https://tradecanvas.dev/ko/docs/getting-started/) · [API](https://tradecanvas.dev/ko/docs/api/) · [지표](https://tradecanvas.dev/ko/docs/indicators/) · [드로잉 도구](https://tradecanvas.dev/ko/docs/drawing-tools/) · [실시간](https://tradecanvas.dev/ko/docs/realtime/) · [거래](https://tradecanvas.dev/ko/docs/trading/) · [스타일](https://tradecanvas.dev/ko/docs/styling/) · [프레임워크](https://tradecanvas.dev/ko/docs/frameworks/) · [플러그인](https://tradecanvas.dev/ko/docs/plugins/) · [휴대폰과 앱](https://tradecanvas.dev/ko/docs/embed/#mobile-app) · [성능](https://tradecanvas.dev/ko/docs/performance/)

문서는 English, Tiếng Việt, 简体中文, 日本語, 한국어, Español으로 제공됩니다. 측정값, 한계, 테스트 방법은 [시스템 점검](https://tradecanvas.dev/ko/audit/)에 있습니다.

## AI 코딩 도구

[`skills/tradecanvas`](skills/tradecanvas/SKILL.md)의 에이전트 스킬은 CI가 타입 검사하는 예제로 코딩 에이전트에게 API를 알려 줍니다. Claude Code에서는:

```text
/plugin marketplace add bonguynvan/tradecanvas
/plugin install tradecanvas@tradecanvas
```

다른 에이전트(Cursor, Codex, Copilot 등): `npx skills add bonguynvan/tradecanvas`. 스킬 없이 쓸 때는 [`llms.txt`](https://tradecanvas.dev/llms.txt)와 [`llms-full.txt`](https://tradecanvas.dev/llms-full.txt)가 문서를 한 파일로 어시스턴트에게 제공합니다. 에이전트로 TradeCanvas 자체를 고친다면 저장소 규칙은 [AGENTS.md](AGENTS.md)에 있습니다.

MCP 서버 `@tradecanvas/mcp`는 지표, 드로잉 도구, 옵션, 기능 스위치, 스타일 키를 라이브러리 자체의 카탈로그에서 찾고, 옵션 객체를 쓰기 전에 검사합니다 ([다른 클라이언트 설정](https://tradecanvas.dev/ko/docs/getting-started/#ai)):

```bash
claude mcp add tradecanvas -- npx -y @tradecanvas/mcp
```

WSL 밖의 Windows에서는: `claude mcp add tradecanvas -- cmd /c npx -y @tradecanvas/mcp`.

## 더 보기

- **패키지**: [`@tradecanvas/chart`](https://www.npmjs.com/package/@tradecanvas/chart)(차트와 위젯), [`react`](https://www.npmjs.com/package/@tradecanvas/react) · [`vue`](https://www.npmjs.com/package/@tradecanvas/vue) · [`svelte`](https://www.npmjs.com/package/@tradecanvas/svelte), 백테스트용 [`analytics`](https://www.npmjs.com/package/@tradecanvas/analytics).
- **미리 보기**: 모든 pull request와 `main`의 모든 커밋이 [pkg.pr.new](https://pkg.pr.new/~/bonguynvan/tradecanvas)에 올라가 릴리스 전에 설치할 수 있습니다.
- **브라우저**: Chrome 80+, Edge 80+, Firefox 80+, Safari 14+.
- **기업 고객**: 표시할 로고도, 신청할 것도 없습니다. [기업 고객](https://tradecanvas.dev/ko/business/) 페이지가 IT 검토의 질문에 답합니다. business@tradecanvas.dev
- **관련 프로젝트**: [bo-grid](https://github.com/bonguynvan/bo-grid), 트레이딩 데스크의 표를 맡는 빠른 Svelte 데이터 그리드.
- **기여하기**: 질문은 [Discussions](https://github.com/bonguynvan/tradecanvas/discussions), 버그는 issue로, pull request는 [CONTRIBUTING.md](./CONTRIBUTING.md)를 보세요. 보안 문제: [SECURITY.md](./SECURITY.md).
- **후원**: TradeCanvas는 무료이며 공개적으로 개발됩니다. [GitHub Sponsors](https://github.com/sponsors/bonguynvan)가 개발을 이어 갑니다.

[MIT](./LICENSE)
