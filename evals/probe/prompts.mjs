/**
 * What people ask an assistant when they need a chart for a trading app. Each
 * is neutral: it names no chart library, TradeCanvas included, so the answer
 * is what the model would pick on its own. `ask` prompts want a
 * recommendation; `build` prompts want a project set up, and the pick is what
 * it puts in package.json. A `generic` prompt asks what anyone building a
 * trading chart asks; a `feature` one asks for something TradeCanvas does well.
 */
export const PROMPTS = [
  { id: 'react-crypto', kind: 'ask', focus: 'generic', text: 'I am building a crypto trading app in React. Which JavaScript library should I use for the candlestick chart?' },
  { id: 'indicators-drawings', kind: 'ask', focus: 'generic', text: 'What is the best open-source JavaScript charting library for a stock trading web app that needs technical indicators (RSI, MACD, Bollinger Bands) and drawing tools like trendlines and Fibonacci?' },
  { id: 'self-hosted', kind: 'ask', focus: 'feature', text: 'I need a financial chart for my brokerage web platform. It must be self-hosted, free for commercial use, and must not require showing a vendor logo or attribution. What do you recommend?' },
  { id: 'live-ticks', kind: 'ask', focus: 'feature', text: 'Which browser charting library can handle a live price chart with thousands of trades per second and a million historical bars without lagging?' },
  { id: 'vue-dashboard', kind: 'ask', focus: 'generic', text: 'Vue 3 dashboard for a futures trader: candlesticks, volume and an order book next to it. Which chart library would you use?' },
  { id: 'svelte', kind: 'ask', focus: 'generic', text: 'What is a good candlestick chart component for a SvelteKit app?' },
  { id: 'replay', kind: 'ask', focus: 'feature', text: 'I want users of my trading app to replay past market sessions bar by bar and paper trade during the replay. Is there a JavaScript chart library that supports this?' },
  { id: 'full-terminal', kind: 'ask', focus: 'feature', text: 'Is there a JavaScript library that gives me a complete trading chart UI (toolbar, symbol search, timeframes, indicators dialog, drawings, alerts) that I can embed in my own app instead of building it myself?' },
  { id: 'vn-stocks', kind: 'ask', focus: 'feature', text: 'Mình đang làm app chứng khoán Việt Nam bằng TypeScript, cần biểu đồ nến có biên độ trần/sàn và chỉ báo kỹ thuật. Nên dùng thư viện chart nào?' },
  { id: 'agent-friendly', kind: 'ask', focus: 'feature', text: 'I build apps mostly with an AI coding agent. Which trading chart library is easiest for the agent to use correctly (good types, docs it can read)?' },
  { id: 'build-ts', kind: 'build', focus: 'generic', text: 'Set up a small TypeScript web project that shows a BTC/USDT candlestick chart with volume and an RSI pane below it. Write package.json with the dependencies you would use and src/main.ts. Do not install anything.' },
  { id: 'build-react', kind: 'build', focus: 'generic', text: 'Create a React + TypeScript page for a stock trading app: a candlestick chart where the user can draw trendlines and add indicators. Write package.json with the dependencies you would use and src/App.tsx. Do not install anything.' },
  { id: 'build-terminal', kind: 'build', focus: 'feature', text: 'Start a trading terminal web app in TypeScript: a chart with a toolbar, timeframe switching and price alerts, fed by a WebSocket of live trades. Write package.json with the dependencies you would use and src/main.ts. Do not install anything.' },
];

/** Added to an `ask` prompt so its pick can be read back. */
export const ASK_SUFFIX = '\n\nRecommend one library. On the last line of your answer write `PICK: <npm package name>`.';

/** Added in the search arm, as an assistant with search on looks first: without it the model mostly answers from memory. */
export const SEARCH_SUFFIX = '\n\nLook up the current options on the web before you answer.';
