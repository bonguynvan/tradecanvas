<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';
  import Diagram, { type DiagramWords } from '../Diagram.svelte';
  import { DATA_FLOW, REPLAY, WIDGET_PARTS } from '../diagrams';

  const { href } = useI18n();

  const dataSteps = [
    { nodes: ['feed', 'adapter', 'stream'], title: '봉이 들어온다', text: 'DataFeed에는 과거 데이터를 요청하고(getBars) 실시간 봉을 구독합니다. BinanceAdapter 같은 DataAdapter는 모든 것을 이벤트로 보냅니다. StreamManager는 feed를 adapter로 바꾸고, 차트의 주기로 리샘플링하며, 틱으로 봉을 만듭니다.' },
    { nodes: ['chart', 'stream', 'code'], title: '차트가 받는다', text: 'chart.connect()는 snapshot, barUpdate, barClose, barCorrection 이벤트를 받습니다. 직접 작성한 코드는 setData, appendBar, updateLastBar, updateBar로 같은 봉을 쓰며, feed가 전혀 필요 없습니다.' },
    { nodes: ['store', 'chart'], title: '하나의 저장소', text: '모든 쓰기는 SeriesStore를 거칩니다. 표시 중인 봉, 장외 봉을 숨길 때의 전체 시리즈, 리플레이 중 따로 둔 실시간 시리즈를 보관하고, 각 쓰기가 무엇을 했는지 차트에 알립니다.' },
    { nodes: ['display', 'store', 'indicators', 'fit'], title: '그릴 것을 계산한다', text: 'DisplaySeries는 차트 유형이 그리는 시리즈(하이킨 아시, 렌코, 카기…)를 만들고 봉이 바뀔 때까지 캐시합니다. IndicatorEngine은 처음 바뀐 봉부터만 다시 계산합니다. PriceFit은 가격 축을 맞추고 PaneLayout은 패널 크기를 정합니다.' },
    { nodes: ['viewport', 'input', 'fit'], title: '뷰', text: 'Viewport는 어떤 봉이 보이는지, 봉 하나의 너비, 어디까지 스크롤했는지를 보관합니다. 드래그, 휠, 키 입력은 InteractionManager를 통해 스크롤하고 확대·축소합니다.' },
    { nodes: ['engine', 'display', 'indicators', 'viewport', 'scene', 'top'], title: '한 프레임', text: 'RenderEngine은 바뀐 레이어에 표시를 하고 다음 애니메이션 프레임에 그립니다. 실시간 틱은 먼저 모아지므로 연달아 들어와도 한 프레임입니다. scene 캔버스에는 격자, 시리즈, 지표, 드로잉, 축이, top 캔버스에는 십자선과 범례가 있어 포인터를 움직이면 top만 다시 그립니다. renderer: \'webgl\'에서는 아래쪽 GPU 캔버스가 캔들과 거래량을 그립니다.' },
    { nodes: ['events', 'chart'], title: '앱으로 돌아가기', text: '차트는 이벤트로 알려 줍니다: crosshairMove, dataUpdate, visibleRangeChange, symbolChange 등. 전체 목록은 API 레퍼런스에 있습니다.' },
  ];

  const widgetSteps = [
    { nodes: ['widget'], title: '하나의 공개 클래스', text: 'ChartWidget은 공개 메서드와 초기 설정을 맡습니다. 생성자는 부품이 서로를 필요로 하는 순서대로 놓인 단계 목록입니다: readOptions, buildRoot, buildToolbar, buildBody, buildChart … finishSetup.' },
    { nodes: ['areas', 'hosts', 'widget'], title: '영역마다 host를 통해', text: '리플레이, 거래, 알림, 비교, 관심 목록, 범례, 메뉴, 명령, 레이아웃, 도크, Chart Settings, 드로잉 편집, 주기는 각각 독립된 클래스입니다. 각 클래스는 위젯에서 쓰는 것만 정확히 나열한 host 인터페이스를 받고, ChartWidget의 공개 메서드는 해당 영역으로 넘깁니다.' },
    { nodes: ['chart', 'areas'], title: '하나의 차트', text: 'buildChart는 위젯이 감싸는 단 하나의 Chart를 만듭니다. 모든 영역은 host를 통해 이 차트에 닿으며, 자기 차트를 따로 갖지 않습니다. 위젯은 차트 이벤트를 받아 툴바와 범례를 맞춥니다.' },
    { nodes: ['signals', 'ui', 'widget'], title: 'Signal', text: '여러 부품이 함께 보여 주는 상태는 signal입니다: 테마(look), 툴바에서 열린 버튼(openRoles), Chart Settings. 하나의 effect가 이를 보여 주는 모든 곳을 갱신하므로, 쓰는 쪽이 갱신을 하나씩 호출하지 않습니다.' },
    { nodes: ['dialogs', 'overlay', 'widget'], title: '대화상자는 처음 열 때 로드', text: '큰 대화상자, 지표 대화상자, 명령 팔레트, 종목 검색은 DIALOGS에 있고 처음 열 때 코드를 불러옵니다. 이들은 overlayHost 안에서 열리며, 전체 화면에서는 overlayHost가 위젯 안으로 옮겨집니다.' },
  ];

  const replaySteps = [
    { nodes: ['ui'], title: '봉 고르기', text: '리플레이 버튼이 리플레이 바를 엽니다. 봉을 클릭하거나 replayFrom()을 호출해 시작 위치를 고릅니다.' },
    { nodes: ['chart', 'store', 'manager'], title: '시작', text: 'chart.replayStart()는 SeriesStore가 실시간 봉을 따로 두게 한 뒤, 재생할 봉을 ReplayManager에 불러옵니다. ReplayManager는 시작 위치에서 일시 정지한 채 기다립니다.' },
    { nodes: ['manager', 'chart', 'store'], title: '단계', text: '재생, 일시 정지, 한 봉 앞으로·뒤로, 속도는 ReplayManager로 갑니다. 각 단계는 bar 이벤트를 보내고, 차트는 그 지점까지의 봉을 보여 줍니다(showReplayed, 앞으로 갈 때는 appendReplayed).' },
    { nodes: ['indicators', 'store', 'paper', 'chart'], title: '리플레이를 따라가는 것', text: '지표는 바뀐 봉부터 다시 계산되고, 가격선은 재생 중인 종가를 보여 주며, 모의 계좌는 재생 가격으로 체결됩니다. 실계좌의 주문과 알림은 실시간 그대로입니다.' },
    { nodes: ['stop', 'store', 'ui'], title: '끝', text: '마지막 봉에 닿으면 리플레이가 일시 정지합니다. 나가면 replayStop()이 호출되어 SeriesStore가 실시간 시리즈를 되돌리고, 차트는 다시 실시간이 됩니다.' },
  ];

  const dataWords: DiagramWords = {
    code: { title: '직접 작성한 코드' },
    stream: { note: '리샘플 · TickAggregator' },
    store: { note: '표시 · 전체 · 따로 둠' },
    display: { note: '차트 유형별' },
    engine: { note: '바뀐 레이어 · rAF' },
    scene: { title: 'scene 캔버스', note: '시리즈 · 축 · 드로잉' },
    top: { title: 'top 캔버스', note: '십자선 · 범례' },
    input: { title: '포인터 · 휠 · 키' },
  };

  const widgetWords: DiagramWords = {
    widget: { note: '공개 API · 초기 설정' },
    hosts: { note: '영역마다 인터페이스 하나' },
    dialogs: { note: 'LazyPart · 처음 열 때' },
    ui: { title: '툴바 · 테마', note: '각각 effect 하나' },
    areas: { title: 'Widget… 영역', note: 'Replay · Trading · Alerts…' },
    overlay: { note: 'portal · 전체 화면' },
    chart: { note: '위젯마다 하나' },
  };

  const replayWords: DiagramWords = {
    ui: { note: 'toggleReplay · 봉 클릭' },
    store: { note: '실시간 시리즈 따로 둠' },
    paper: { title: '모의 계좌' },
  };
</script>

<svelte:head>
  <title>작동 방식 — TradeCanvas 문서</title>
  <meta name="description" content="TradeCanvas의 내부 작동 방식: 봉이 데이터 소스에서 화면까지 가는 길, ChartWidget의 구성, 봉 리플레이의 흐름. 코드에 쓰인 이름 그대로 그린 세 개의 다이어그램." />
</svelte:head>

<h1>작동 방식</h1>
<p>라이브러리를 안쪽에서 본 세 개의 다이어그램입니다. 코드에 쓰인 이름을 그대로 써서 소스에서 각 부분을 찾을 수
  있습니다. 단계에 포인터를 올리거나 Tab 키로 이동하면 그 단계가 다루는 상자가 강조됩니다. 차트를 쓰는 데는 필요
  없지만, 데이터 소스나 플러그인을 작성하거나 라이브러리 자체를 고칠 때 도움이 됩니다.</p>

<h2 id="data-flow">데이터 소스에서 화면까지</h2>
<p>봉은 거래소에서 오든 직접 작성한 코드에서 오든 같은 길을 지나고, 하나의 저장소에 보관됩니다.
  그려지는 모든 것은 이 저장소와 뷰에서 계산됩니다.</p>
<Diagram {...DATA_FLOW} label="SeriesStore를 거쳐 데이터 소스에서 두 캔버스로 가는 봉" steps={dataSteps} words={dataWords} />
<p>직접 데이터 소스를 작성하는 법은 <a href={href('/docs/realtime')}>실시간 및 리플레이</a>에,
  프레임당 비용은 <a href={href('/docs/performance')}>성능</a>에 있습니다.</p>

<h2 id="widget">ChartWidget의 구성</h2>
<p><code>ChartWidget</code>은 하나의 <code>Chart</code>를 감싼 트레이딩 화면 전체입니다. 각 부분은 작은
  클래스이며, 건네받은 것만 봅니다.</p>
<Diagram {...WIDGET_PARTS} label="하나의 Chart를 감싼 ChartWidget과 그 영역, signal, 대화상자" steps={widgetSteps} words={widgetWords} />

<h2 id="replay">봉 리플레이</h2>
<p>리플레이는 같은 차트에서 과거를 봉 하나씩 재생하고, 실시간 봉은 끝날 때까지 따로 둡니다.</p>
<Diagram {...REPLAY} label="첫 클릭부터 실시간 차트로 돌아올 때까지의 봉 리플레이" steps={replaySteps} words={replayWords} />
<p>옵션과 이벤트는 <a href={href('/docs/realtime')}>실시간 및 리플레이</a>에 있습니다.</p>
