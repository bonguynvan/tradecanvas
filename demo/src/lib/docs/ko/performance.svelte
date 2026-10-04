<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>성능 — TradeCanvas 문서</title>
  <meta name="description" content="TradeCanvas가 빠른 이유: 2-캔버스 렌더링, 보이는 범위만 처리, 증분 지표 계산, 가벼운 전체 로드, LTTB 다운샘플링 — 벤치마크 수치 포함." />
</svelte:head>

<h1>성능</h1>
<p>
  2-캔버스 Canvas2D 파이프라인은 바뀐 부분만 다시 그리며, 프레임마다 하는 모든 작업은
  불러온 과거 데이터의 양이 아니라 화면에 보이는 것만큼으로 제한됩니다. 아래 수치는
  <code>pnpm bench</code>(단일 코어)와 실제 위젯 프로파일링에서 얻은 것이며,
  <a href={href('/') + '#lab-title'}>Feature Lab</a>에서는 클릭할 때마다 실제 전환 시간을 측정합니다.
</p>

<h2>프레임: 500봉에서 100,000봉까지 일정</h2>
<ul>
  <li><strong>두 개의 캔버스</strong> — 장면 캔버스(격자, 시리즈, 지표, 차트 개체, 축)와 십자선, 범례 등 포인터를 따라가는 요소를 위한 얇은 상단 캔버스로 나뉩니다. 마우스를 올리면 상단 캔버스만 다시 그리며(~0.2 ms), 브라우저는 네 개가 아니라 두 개의 표면만 합성합니다.</li>
  <li><strong>보이는 범위만 렌더링</strong> — 모든 렌더러, 자동 눈금, 지표 가격 범위 계산이 화면에 보이는 봉만 순회합니다.</li>
  <li><strong>프레임별 가비지 없음</strong> — 뷰포트 스냅샷은 변경이 있을 때까지 캐시되며, 숫자와 날짜 포매터는 라벨마다 새로 만들지 않고 재사용합니다.</li>
  <li><strong>자동 크기 가격 축</strong> — 가장 긴 라벨에 축 너비를 맞추는 비용은 ~0.05 ms이며, 너비가 실제로 바뀔 때만 레이아웃을 다시 계산합니다.</li>
</ul>

<h2>실시간 틱: 증분 지표 계산</h2>
<p>
  틱은 형성 중인 봉만 바꾸므로, <code>update()</code>를 구현한 지표는 그 봉만 다시
  계산합니다(SMA, EMA, WMA, VWMA, Bollinger, Envelope, RSI, MACD, ATR, OBV, Stochastic). 나머지는
  전체 재계산을 사용합니다. BB + EMA + RSI + MACD 기준:
</p>
<table>
  <thead><tr><th>과거 데이터</th><th>전체 재계산</th><th>증분 <code>update()</code></th></tr></thead>
  <tbody>
    <tr><td>20,000봉</td><td>~5 ms</td><td>~0.0005 ms</td></tr>
    <tr><td>100,000봉</td><td>~27 ms</td><td>~0.001 ms</td></tr>
  </tbody>
</table>
<p>
  사용자 지정 지표도 이 방식을 사용할 수 있습니다 — <a href={href('/docs/plugins')}>플러그인 → 빠른 실시간 업데이트</a>를 참고하세요.
</p>

<h2>종목 또는 시간 단위 전환</h2>
<ul>
  <li><strong>가벼운 전체 로드</strong> — 지표 값은 <code>IndicatorValueMap</code>(배열 기반으로, 타임스탬프를 키로 쓰는 <code>Map</code>보다 만드는 비용이 ~3배 저렴)에 저장되며, <code>setData</code>는 이미 유효한 봉을 복사하지 않고 재사용합니다.</li>
  <li><strong>느릴 때만 로딩 표시</strong> — 이전 차트가 그대로 유지되고, 전환이 200 ms를 넘길 때만 가림막이 나타나므로 일반적인 ~130 ms 네트워크 전환에서는 화면이 깜박이지 않습니다.</li>
  <li><strong>오래된 데이터 없음</strong> — 대체된 과거 데이터 요청은 버리고 이전 소켓은 분리하므로, 항상 마지막 클릭이 반영됩니다.</li>
  <li><strong>로컬 리샘플링</strong> — 정적 데이터는 다시 가져오지 않고 시간 단위를 전환하며, 느린 리샘플링은 메인 스레드가 바빠지기 전에 가림막부터 그립니다.</li>
</ul>

<h2>LTTB 다운샘플링</h2>
<p>
  라인 및 영역 차트는 픽셀보다 봉이 훨씬 많을 때 <strong>Largest-Triangle-Three-Buckets</strong>로
  보이는 범위를 픽셀당 ~2개의 점으로 다운샘플링합니다. 그리는 점은 수십 배 줄어도 선은
  시각적으로 똑같이 유지됩니다. 일반적인 확대 수준에서는 아무 일도 하지 않습니다. 알고리즘은
  직접 사용할 수 있도록 export되어 있습니다.
</p>
<pre><code>{`import { lttbDownsample } from '@tradecanvas/chart'

// indices preserving the shape of a 100k series, reduced to 1600 points
const idx = lttbDownsample(series.length, 1600, (i) => series[i].close)`}</code></pre>
<table>
  <thead><tr><th>보이는 점 수 → 1600</th><th>프레임당 시간</th><th>처리량</th></tr></thead>
  <tbody>
    <tr><td>10,000</td><td>~0.025 ms</td><td>39,600 / s</td></tr>
    <tr><td>100,000</td><td>~0.32 ms</td><td>3,100 / s</td></tr>
    <tr><td>1,000,000</td><td>~2.6 ms</td><td>380 / s</td></tr>
  </tbody>
</table>

<h2>축소했을 때의 지표</h2>
<p>
  봉 하나가 1픽셀보다 좁아지면 지표의 선, 밴드, 히스토그램은 픽셀 열마다 하나의 구간으로 그려집니다. 열의 최저점부터 최고점까지, 앞 열과 이어지고, 폭은 선 두께와 같습니다. 수천 개의 점을 지나는 선과 거의 같아 보이면서도 래스터 작업은 훨씬 적습니다. 200,000개 봉을 축소해 볼린저 밴드, EMA, RSI, MACD를 함께 띄우면 내장 GPU에서 한 프레임이 약 54 ms에서 약 21 ms로 줄었습니다. <code>node scripts/bench-render.mjs</code>로 내 컴퓨터에서도 측정할 수 있습니다.
</p>

<h2>WebGL 렌더러 (미리 보기)</h2>
<p>
  <code>renderer: 'webgl'</code>을 쓰면 플롯 영역과 지표 패널을 WebGL 2로 2D 장면 아래의 캔버스에 그립니다. 그리드, 세션, 캔들, 거래량은 직접 그리고, 지표·비교선·대부분의 차트 유형의 Canvas 2D 그리기는 GPU의 선, 채우기, 사각형으로 기록되어 Canvas 2D처럼 가장자리가 안티앨리어싱됩니다. 텍스트, 드로잉, 주문, 축, 크로스헤어는 Canvas 2D로 남고, GPU가 똑같이 그릴 수 없는 것도 Canvas 2D가 그립니다(순서대로 그리므로 겹침 순서는 그대로입니다). 직접 만든 지표 플러그인도 수정 없이 동작합니다. 캔들은 Canvas 2D와 2/255 이내로 일치하고, 선과 채우기는 안티앨리어싱된 가장자리의 일부 픽셀만 다릅니다. WebGL 코드는 별도 청크(gzip 약 17 KB)로, 처음 쓸 때 불러옵니다. WebGL 2가 없거나 컨텍스트를 잃으면 차트는 Canvas 2D로 계속 그립니다.
</p>
<pre><code>{`const chart = new Chart(el, { renderer: 'webgl' })

chart.on('rendererChange', (e) => console.log(e.payload))
// { renderer: 'webgl' }, or { renderer: 'canvas', reason: 'unsupported' | 'contextLost' }

await chart.setRenderer('canvas')   // resolves to what draws now`}</code></pre>
<p>이동 중 프레임 시간, 내장 GPU(Intel UHD, 16.7 ms가 60 fps):</p>
<table>
  <thead><tr><th>차트</th><th>픽셀 비율</th><th>Canvas 2D</th><th>WebGL</th></tr></thead>
  <tbody>
    <tr><td>1600×900, 캔들 500개 + 지표 4개</td><td>2</td><td>27.4 ms</td><td>19.6 ms</td></tr>
    <tr><td>1600×900, 봉 200,000개를 축소 + 지표 4개</td><td>2</td><td>34.5 ms</td><td>20.2 ms</td></tr>
    <tr><td>차트 6개, 각각 캔들 500개와 지표 2개</td><td>2</td><td>23.5 ms</td><td>17.2 ms</td></tr>
    <tr><td>2560×1400, 캔들 2,000개 + 지표 4개</td><td>1</td><td>41.6 ms</td><td>17.7 ms</td></tr>
    <tr><td>2560×1400, 캔들 2,000개 + 지표 4개</td><td>1.5</td><td>70.8 ms</td><td>17.6 ms</td></tr>
    <tr><td>2560×1400, 캔들 2,000개 + 지표 4개</td><td>2</td><td>114.5 ms</td><td>29.1 ms</td></tr>
    <tr><td>2560×1400, 캔들 2,000개</td><td>2</td><td>33.1 ms</td><td>20.9 ms</td></tr>
  </tbody>
</table>
<p>
  위 WebGL 프레임 대부분은 16.7 ms이며, 평균에는 몇몇 긴 프레임이 포함됩니다. 픽셀 비율 2의 2560×1400 차트에서는 이 GPU에서 브라우저가 전체 크기 레이어를 합성하는 데만 약 23 ms가 걸립니다. <code>node scripts/bench-render.mjs --renderer=webgl</code>로 내 컴퓨터에서 측정할 수 있습니다.
</p>

<h2>메인 스레드 밖에서 계산</h2>
<p>
  <code>IndicatorWorkerHost</code>는 Promise 기반 <code>calculate()</code>, 요청별 타임아웃,
  SSR과 테스트를 위한 동기식 대체 경로를 갖추고 Web Worker에서 지표 계산을 실행합니다.
</p>
