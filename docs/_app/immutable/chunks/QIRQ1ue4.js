var S=Object.defineProperty;var L=(d,t,e)=>t in d?S(d,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):d[t]=e;var i=(d,t,e)=>L(d,typeof t!="symbol"?t+"":t,e);import{C as D,D as b,L as y}from"./ZKv3rEsH.js";const v=[{label:"1m",value:"1m"},{label:"5m",value:"5m"},{label:"15m",value:"15m"},{label:"1H",value:"1h"},{label:"4H",value:"4h"},{label:"1D",value:"1d"}],f=[{label:"Candlestick",value:"candlestick"},{label:"Line",value:"line"},{label:"Area",value:"area"},{label:"Bar",value:"bar"},{label:"Heikin-Ashi",value:"heikinAshi"},{label:"Hollow Candle",value:"hollowCandle"},{label:"Baseline",value:"baseline"},{label:"Volume Candles",value:"volumeCandles"},{label:"Equivolume",value:"equivolume"},{label:"HLC Area",value:"hlcArea"},{label:"Step Line",value:"stepLine"},{label:"Line + Markers",value:"lineWithMarkers"}],C=[{label:"Lines",tools:[{label:"Trend Line",value:"trendLine"},{label:"Ray",value:"ray"},{label:"Extended Line",value:"extendedLine"}]},{label:"Horizontal/Vertical",tools:[{label:"Horizontal Line",value:"horizontalLine"},{label:"Vertical Line",value:"verticalLine"}]},{label:"Channels",tools:[{label:"Parallel Channel",value:"parallelChannel"},{label:"Regression Channel",value:"regressionChannel"}]},{label:"Fibonacci",tools:[{label:"Fib Retracement",value:"fibRetracement"},{label:"Fib Extension",value:"fibExtension"}]},{label:"Shapes",tools:[{label:"Rectangle",value:"rectangle"},{label:"Ellipse",value:"ellipse"},{label:"Triangle",value:"triangle"}]},{label:"Gann & Advanced",tools:[{label:"Pitchfork",value:"pitchfork"},{label:"Gann Fan",value:"gannFan"},{label:"Gann Box",value:"gannBox"},{label:"Elliott Wave",value:"elliottWave"}]},{label:"Measure",tools:[{label:"Price Range",value:"priceRange"},{label:"Date Range",value:"dateRange"},{label:"Measure",value:"measure"}]},{label:"Annotation",tools:[{label:"Text",value:"text"},{label:"Arrow",value:"arrow"}]}],k=[{id:"sma",name:"SMA",type:"overlay"},{id:"ema",name:"EMA",type:"overlay"},{id:"hma",name:"Hull MA",type:"overlay"},{id:"bb",name:"Bollinger Bands",type:"overlay"},{id:"vwap",name:"VWAP",type:"overlay"},{id:"avwap",name:"Anchored VWAP",type:"overlay"},{id:"ichimoku",name:"Ichimoku Cloud",type:"overlay"},{id:"psar",name:"Parabolic SAR",type:"overlay"},{id:"supertrend",name:"Supertrend",type:"overlay"},{id:"keltner",name:"Keltner Channel",type:"overlay"},{id:"donchian",name:"Donchian Channel",type:"overlay"},{id:"pivots",name:"Pivot Points",type:"overlay"},{id:"zigzag",name:"ZigZag",type:"overlay"},{id:"lrc",name:"Linear Regression Channel",type:"overlay"},{id:"rsi",name:"RSI",type:"panel"},{id:"macd",name:"MACD",type:"panel"},{id:"stochastic",name:"Stochastic",type:"panel"},{id:"atr",name:"ATR",type:"panel"},{id:"adx",name:"ADX",type:"panel"},{id:"obv",name:"OBV",type:"panel"},{id:"williamsR",name:"Williams %R",type:"panel"},{id:"cci",name:"CCI",type:"panel"},{id:"mfi",name:"MFI",type:"panel"},{id:"roc",name:"ROC",type:"panel"},{id:"tsi",name:"TSI",type:"panel"},{id:"cmf",name:"CMF",type:"panel"},{id:"aroon",name:"Aroon",type:"panel"},{id:"stddev",name:"Std Deviation",type:"panel"},{id:"vroc",name:"Volume ROC",type:"panel"},{id:"ad",name:"Acc/Dist",type:"panel"},{id:"ao",name:"Awesome Oscillator",type:"panel"},{id:"chaikinOsc",name:"Chaikin Oscillator",type:"panel"},{id:"volumeProfile",name:"Volume Profile",type:"panel"}],I=["sma","ema","bb","rsi","macd","stochastic","vwap","atr","obv","ichimoku"],M=["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT"],E={candleUpColor:"#26A69A",candleDownColor:"#EF5350",candleUpWick:"#26A69A",candleDownWick:"#EF5350",backgroundColor:"#131722",gridColor:"#1E222D",gridVisible:!0,volumeVisible:!0,legendVisible:!0,barCountdown:!0,logScale:!1,autoScale:!0,crosshairMode:"magnet",numberLocale:"en-US"},N=`/* === TradeCanvas Widget Styles === */\r
\r
.tcw-root {\r
  display: flex;\r
  flex-direction: column;\r
  width: 100%;\r
  height: 100%;\r
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;\r
  font-size: 13px;\r
  color: #d1d4dc;\r
  background: #131722;\r
  position: relative;\r
  overflow: hidden;\r
\r
  /* Dark theme tokens (default) */\r
  --tcw-bg: #131722;\r
  --tcw-bg-elevated: #1E222D;\r
  --tcw-border: #2A2E39;\r
  --tcw-text: #d1d4dc;\r
  --tcw-text-dim: #b2b5be;\r
  --tcw-text-muted: #787b86;\r
  --tcw-accent: #2962ff;\r
  --tcw-accent-dim: rgba(41,98,255,0.15);\r
  --tcw-accent-glow: rgba(41,98,255,0.12);\r
  --tcw-red: #ef5350;\r
  --tcw-green: #26a69a;\r
  --tcw-transition: 0.15s ease;\r
  --tcw-radius-lg: 8px;\r
  --tcw-font-mono: 'SF Mono', 'Fira Code', 'Consolas', monospace;\r
  --tcw-hover-bg: rgba(255,255,255,0.04);\r
}\r
\r
.tcw-root[data-tcw-theme="light"] {\r
  color: #131722;\r
  background: #ffffff;\r
\r
  --tcw-bg: #ffffff;\r
  --tcw-bg-elevated: #f0f3fa;\r
  --tcw-border: #e0e3eb;\r
  --tcw-text: #131722;\r
  --tcw-text-dim: #434651;\r
  --tcw-text-muted: #787b86;\r
  --tcw-accent: #2962ff;\r
  --tcw-accent-dim: rgba(41,98,255,0.1);\r
  --tcw-accent-glow: rgba(41,98,255,0.08);\r
  --tcw-red: #ef5350;\r
  --tcw-green: #26a69a;\r
  --tcw-hover-bg: rgba(0,0,0,0.04);\r
}\r
\r
/* === Toolbar === */\r
\r
.tcw-toolbar {\r
  display: flex;\r
  align-items: center;\r
  gap: 0;\r
  padding: 0 12px;\r
  height: 40px;\r
  border-bottom: 1px solid var(--tcw-border);\r
  background: var(--tcw-bg-elevated);\r
  flex-shrink: 0;\r
  position: relative;\r
  z-index: 20;\r
}\r
\r
.tcw-toolbar-symbol {\r
  font-size: 13px;\r
  font-weight: 700;\r
  color: var(--tcw-text);\r
  padding: 0 10px;\r
  white-space: nowrap;\r
  letter-spacing: -0.01em;\r
  cursor: pointer;\r
  border: none;\r
  background: none;\r
  font-family: inherit;\r
}\r
\r
.tcw-toolbar-sep {\r
  width: 1px;\r
  height: 20px;\r
  background: var(--tcw-border);\r
  flex-shrink: 0;\r
}\r
\r
.tcw-toolbar-group {\r
  display: flex;\r
  align-items: center;\r
  gap: 2px;\r
  padding: 0 8px;\r
}\r
\r
.tcw-toolbar-spacer {\r
  flex: 1;\r
}\r
\r
.tcw-btn {\r
  padding: 4px 8px;\r
  font-size: 12px;\r
  font-family: inherit;\r
  border: none;\r
  border-radius: 4px;\r
  background: transparent;\r
  color: var(--tcw-text-dim);\r
  cursor: pointer;\r
  transition: all var(--tcw-transition);\r
  white-space: nowrap;\r
  line-height: 1;\r
}\r
\r
.tcw-btn:hover {\r
  background: var(--tcw-hover-bg);\r
  color: var(--tcw-text);\r
}\r
\r
.tcw-btn.tcw-active {\r
  background: var(--tcw-accent);\r
  color: white;\r
}\r
\r
.tcw-btn-icon {\r
  width: 32px;\r
  height: 32px;\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  font-family: inherit;\r
  border: none;\r
  border-radius: 4px;\r
  background: transparent;\r
  color: var(--tcw-text-muted);\r
  cursor: pointer;\r
  transition: all var(--tcw-transition);\r
  line-height: 1;\r
  position: relative;\r
}\r
\r
.tcw-btn-icon:hover {\r
  background: var(--tcw-hover-bg);\r
  color: var(--tcw-text);\r
}\r
\r
.tcw-badge-count {\r
  font-size: 10px;\r
  color: var(--tcw-accent);\r
  background: var(--tcw-accent-dim);\r
  padding: 0 4px;\r
  border-radius: 8px;\r
  font-weight: 600;\r
}\r
\r
.tcw-indicator-chips {\r
  display: flex;\r
  align-items: center;\r
  gap: 4px;\r
  padding: 0 4px;\r
  flex-wrap: nowrap;\r
  overflow: hidden;\r
}\r
\r
.tcw-indicator-chip {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 4px;\r
  padding: 2px 6px 2px 8px;\r
  font-size: 11px;\r
  font-weight: 500;\r
  background: var(--tcw-accent-dim);\r
  color: var(--tcw-accent);\r
  border-radius: 4px;\r
  white-space: nowrap;\r
  line-height: 1.4;\r
}\r
\r
.tcw-chip-remove {\r
  cursor: pointer;\r
  opacity: 0.6;\r
  padding: 0 2px;\r
  transition: opacity var(--tcw-transition);\r
  border: none;\r
  background: none;\r
  color: inherit;\r
  display: inline-flex;\r
  align-items: center;\r
}\r
\r
.tcw-chip-remove:hover {\r
  opacity: 1;\r
}\r
\r
/* === Dropdown === */\r
\r
.tcw-dropdown-trigger {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 4px;\r
  padding: 4px 8px;\r
  font-size: 12px;\r
  font-family: inherit;\r
  border: none;\r
  border-radius: 4px;\r
  background: transparent;\r
  color: var(--tcw-text-dim);\r
  cursor: pointer;\r
  transition: all var(--tcw-transition);\r
  white-space: nowrap;\r
  line-height: 1;\r
}\r
\r
.tcw-dropdown-trigger:hover {\r
  background: var(--tcw-hover-bg);\r
  color: var(--tcw-text);\r
}\r
\r
.tcw-dropdown {\r
  position: absolute;\r
  top: 100%;\r
  margin-top: 4px;\r
  background: var(--tcw-bg-elevated);\r
  border: 1px solid var(--tcw-border);\r
  border-radius: var(--tcw-radius-lg);\r
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);\r
  z-index: 50;\r
  padding: 4px 0;\r
  max-height: 400px;\r
  overflow-y: auto;\r
}\r
\r
.tcw-dropdown-item {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  padding: 6px 12px;\r
  font-size: 12px;\r
  color: var(--tcw-text-dim);\r
  cursor: pointer;\r
  transition: background var(--tcw-transition), color var(--tcw-transition);\r
  width: 100%;\r
  border: none;\r
  background: none;\r
  font-family: inherit;\r
  text-align: left;\r
}\r
\r
.tcw-dropdown-item:hover {\r
  background: var(--tcw-hover-bg);\r
  color: var(--tcw-text);\r
}\r
\r
.tcw-dropdown-item.tcw-active {\r
  color: var(--tcw-accent);\r
}\r
\r
.tcw-dropdown-label {\r
  text-transform: uppercase;\r
  font-size: 10px;\r
  color: var(--tcw-text-muted);\r
  letter-spacing: 0.05em;\r
  padding: 6px 12px;\r
  font-weight: 600;\r
}\r
\r
.tcw-dropdown-divider {\r
  border-top: 1px solid var(--tcw-border);\r
  margin: 4px 0;\r
}\r
\r
.tcw-tag {\r
  font-size: 10px;\r
  color: var(--tcw-text-muted);\r
  padding: 1px 5px;\r
  border-radius: 3px;\r
  background: var(--tcw-hover-bg);\r
}\r
\r
/* === Body === */\r
\r
.tcw-body {\r
  display: flex;\r
  flex: 1;\r
  min-height: 0;\r
}\r
\r
.tcw-chart-container {\r
  flex: 1;\r
  min-width: 0;\r
  min-height: 0;\r
  width: 100%;\r
  height: 100%;\r
}\r
\r
/* === Sidebar === */\r
\r
.tcw-sidebar {\r
  width: 36px;\r
  flex-shrink: 0;\r
  background: var(--tcw-bg-elevated);\r
  border-right: 1px solid var(--tcw-border);\r
  display: flex;\r
  flex-direction: column;\r
  align-items: center;\r
  padding: 4px 0;\r
  overflow: visible;\r
}\r
\r
.tcw-tool-group-wrap {\r
  position: relative;\r
}\r
\r
.tcw-sidebar-btn {\r
  width: 36px;\r
  height: 32px;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  border: none;\r
  background: transparent;\r
  color: var(--tcw-text-muted);\r
  cursor: pointer;\r
  font-family: inherit;\r
  transition: all var(--tcw-transition);\r
  position: relative;\r
  flex-shrink: 0;\r
  line-height: 1;\r
}\r
\r
.tcw-sidebar-btn:hover {\r
  color: var(--tcw-text);\r
  background: var(--tcw-hover-bg);\r
}\r
\r
.tcw-sidebar-btn.tcw-active {\r
  color: var(--tcw-accent);\r
  background: var(--tcw-accent-glow);\r
}\r
\r
.tcw-sidebar-btn.tcw-danger:hover {\r
  color: var(--tcw-red);\r
  background: rgba(239,68,68,0.1);\r
}\r
\r
.tcw-multi-dot {\r
  position: absolute;\r
  bottom: 2px;\r
  right: 2px;\r
  width: 4px;\r
  height: 4px;\r
  border-radius: 50%;\r
  background: var(--tcw-text-muted);\r
}\r
\r
.tcw-sidebar-divider {\r
  width: 20px;\r
  height: 1px;\r
  background: var(--tcw-border);\r
  margin: 4px 0;\r
  flex-shrink: 0;\r
}\r
\r
.tcw-sidebar-spacer {\r
  flex: 1;\r
}\r
\r
/* === Flyout === */\r
\r
.tcw-flyout {\r
  position: absolute;\r
  left: 100%;\r
  top: 0;\r
  margin-left: 2px;\r
  min-width: 160px;\r
  background: var(--tcw-bg-elevated);\r
  border: 1px solid var(--tcw-border);\r
  border-radius: var(--tcw-radius-lg);\r
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);\r
  z-index: 30;\r
  padding: 4px 0;\r
}\r
\r
.tcw-flyout-header {\r
  text-transform: uppercase;\r
  font-size: 10px;\r
  color: var(--tcw-text-muted);\r
  letter-spacing: 0.05em;\r
  padding: 6px 12px;\r
  font-weight: 600;\r
}\r
\r
.tcw-flyout-item {\r
  padding: 6px 12px;\r
  font-size: 12px;\r
  color: var(--tcw-text-dim);\r
  cursor: pointer;\r
  width: 100%;\r
  display: block;\r
  border: none;\r
  background: none;\r
  text-align: left;\r
  font-family: inherit;\r
  transition: background var(--tcw-transition), color var(--tcw-transition);\r
}\r
\r
.tcw-flyout-item:hover {\r
  background: var(--tcw-hover-bg);\r
  color: var(--tcw-text);\r
}\r
\r
.tcw-flyout-item.tcw-active {\r
  color: var(--tcw-accent);\r
}\r
\r
/* === Modal === */\r
\r
.tcw-modal-backdrop {\r
  position: fixed;\r
  inset: 0;\r
  background: rgba(0,0,0,0.5);\r
  backdrop-filter: blur(4px);\r
  -webkit-backdrop-filter: blur(4px);\r
  z-index: 100;\r
}\r
\r
.tcw-modal {\r
  position: fixed;\r
  z-index: 101;\r
  top: 50%;\r
  left: 50%;\r
  transform: translate(-50%, -50%);\r
  background: var(--tcw-bg-elevated);\r
  border: 1px solid var(--tcw-border);\r
  border-radius: var(--tcw-radius-lg);\r
  width: 480px;\r
  max-width: 90vw;\r
  max-height: 80vh;\r
  display: flex;\r
  flex-direction: column;\r
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);\r
}\r
\r
.tcw-modal-header {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  padding: 16px 20px;\r
  border-bottom: 1px solid var(--tcw-border);\r
}\r
\r
.tcw-modal-header h3 {\r
  font-size: 15px;\r
  font-weight: 600;\r
  margin: 0;\r
  color: var(--tcw-text);\r
}\r
\r
.tcw-modal-close {\r
  width: 28px;\r
  height: 28px;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  border: none;\r
  background: transparent;\r
  color: var(--tcw-text-muted);\r
  cursor: pointer;\r
  border-radius: 4px;\r
  transition: all var(--tcw-transition);\r
}\r
\r
.tcw-modal-close:hover {\r
  background: var(--tcw-hover-bg);\r
  color: var(--tcw-text);\r
}\r
\r
.tcw-modal-tabs {\r
  display: flex;\r
  gap: 0;\r
  padding: 0 20px;\r
  border-bottom: 1px solid var(--tcw-border);\r
}\r
\r
.tcw-modal-tab {\r
  padding: 10px 16px;\r
  font-size: 12px;\r
  font-weight: 500;\r
  color: var(--tcw-text-muted);\r
  border: none;\r
  background: none;\r
  cursor: pointer;\r
  border-bottom: 2px solid transparent;\r
  margin-bottom: -1px;\r
  transition: color var(--tcw-transition);\r
  font-family: inherit;\r
  text-transform: capitalize;\r
}\r
\r
.tcw-modal-tab:hover {\r
  color: var(--tcw-text-dim);\r
}\r
\r
.tcw-modal-tab.tcw-active {\r
  color: var(--tcw-accent);\r
  border-bottom-color: var(--tcw-accent);\r
}\r
\r
.tcw-modal-body {\r
  padding: 20px;\r
  overflow-y: auto;\r
  flex: 1;\r
}\r
\r
.tcw-settings-section {\r
  margin-bottom: 20px;\r
}\r
\r
.tcw-settings-section:last-child {\r
  margin-bottom: 0;\r
}\r
\r
.tcw-settings-section-title {\r
  font-size: 11px;\r
  font-weight: 600;\r
  text-transform: uppercase;\r
  letter-spacing: 0.05em;\r
  color: var(--tcw-text-muted);\r
  margin-bottom: 12px;\r
}\r
\r
.tcw-settings-row {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  padding: 8px 0;\r
}\r
\r
.tcw-settings-row + .tcw-settings-row {\r
  border-top: 1px solid rgba(255,255,255,0.03);\r
}\r
\r
.tcw-root[data-tcw-theme="light"] .tcw-settings-row + .tcw-settings-row {\r
  border-top: 1px solid rgba(0,0,0,0.04);\r
}\r
\r
.tcw-settings-label {\r
  font-size: 13px;\r
  color: var(--tcw-text-dim);\r
}\r
\r
.tcw-color-picker-wrap {\r
  display: flex;\r
  align-items: center;\r
  gap: 6px;\r
}\r
\r
.tcw-color-picker-wrap input[type='color'] {\r
  width: 28px;\r
  height: 28px;\r
  border: 1px solid var(--tcw-border);\r
  border-radius: 4px;\r
  background: none;\r
  cursor: pointer;\r
  padding: 2px;\r
}\r
\r
.tcw-color-picker-wrap input[type='color']::-webkit-color-swatch-wrapper {\r
  padding: 0;\r
}\r
\r
.tcw-color-picker-wrap input[type='color']::-webkit-color-swatch {\r
  border: none;\r
  border-radius: 2px;\r
}\r
\r
.tcw-color-hex {\r
  font-size: 11px;\r
  font-family: var(--tcw-font-mono);\r
  color: var(--tcw-text-muted);\r
  min-width: 60px;\r
}\r
\r
.tcw-toggle {\r
  width: 36px;\r
  height: 20px;\r
  background: rgba(255,255,255,0.1);\r
  border-radius: 10px;\r
  position: relative;\r
  cursor: pointer;\r
  transition: background var(--tcw-transition);\r
  border: none;\r
  padding: 0;\r
  flex-shrink: 0;\r
}\r
\r
.tcw-toggle::after {\r
  content: '';\r
  position: absolute;\r
  top: 2px;\r
  left: 2px;\r
  width: 16px;\r
  height: 16px;\r
  border-radius: 50%;\r
  background: var(--tcw-text-muted);\r
  transition: all var(--tcw-transition);\r
}\r
\r
.tcw-toggle.tcw-on {\r
  background: var(--tcw-accent);\r
}\r
\r
.tcw-toggle.tcw-on::after {\r
  left: 18px;\r
  background: white;\r
}\r
\r
.tcw-root[data-tcw-theme="light"] .tcw-toggle {\r
  background: rgba(0,0,0,0.1);\r
}\r
\r
.tcw-root[data-tcw-theme="light"] .tcw-toggle::after {\r
  background: #888;\r
}\r
\r
.tcw-root[data-tcw-theme="light"] .tcw-toggle.tcw-on {\r
  background: var(--tcw-accent);\r
}\r
\r
.tcw-root[data-tcw-theme="light"] .tcw-toggle.tcw-on::after {\r
  background: white;\r
}\r
\r
.tcw-settings-select {\r
  padding: 4px 8px;\r
  font-size: 12px;\r
  font-family: inherit;\r
  background: var(--tcw-bg);\r
  border: 1px solid var(--tcw-border);\r
  border-radius: 4px;\r
  color: var(--tcw-text);\r
  cursor: pointer;\r
}\r
\r
.tcw-modal-footer {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  padding: 12px 20px;\r
  border-top: 1px solid var(--tcw-border);\r
}\r
\r
.tcw-reset-link {\r
  font-size: 12px;\r
  color: var(--tcw-text-muted);\r
  cursor: pointer;\r
  border: none;\r
  background: none;\r
  font-family: inherit;\r
  text-decoration: underline;\r
  text-underline-offset: 2px;\r
  transition: color var(--tcw-transition);\r
}\r
\r
.tcw-reset-link:hover {\r
  color: var(--tcw-text-dim);\r
}\r
\r
.tcw-done-btn {\r
  padding: 6px 16px;\r
  font-size: 12px;\r
  font-weight: 500;\r
  background: var(--tcw-accent);\r
  color: white;\r
  border: none;\r
  border-radius: 4px;\r
  cursor: pointer;\r
  font-family: inherit;\r
  transition: background var(--tcw-transition);\r
}\r
\r
.tcw-done-btn:hover {\r
  background: #2563eb;\r
}\r
\r
/* === Status Bar === */\r
\r
.tcw-statusbar {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  padding: 6px 16px;\r
  border-top: 1px solid var(--tcw-border);\r
  background: var(--tcw-bg-elevated);\r
  font-size: 11px;\r
  color: var(--tcw-text-muted);\r
  flex-shrink: 0;\r
}\r
\r
.tcw-status-indicator {\r
  display: flex;\r
  align-items: center;\r
  gap: 6px;\r
}\r
\r
.tcw-status-dot {\r
  width: 6px;\r
  height: 6px;\r
  border-radius: 50%;\r
  background: var(--tcw-text-muted);\r
  transition: background 0.3s;\r
}\r
\r
.tcw-status-dot.tcw-connected {\r
  background: var(--tcw-green);\r
}\r
\r
.tcw-status-dot.tcw-error {\r
  background: var(--tcw-red);\r
}\r
\r
/* === Command Palette === */\r
\r
.tcw-cmd-palette {\r
  position: fixed;\r
  z-index: 102;\r
  top: 20%;\r
  left: 50%;\r
  transform: translateX(-50%);\r
  background: var(--tcw-bg-elevated);\r
  border: 1px solid var(--tcw-border);\r
  border-radius: var(--tcw-radius-lg);\r
  width: 520px;\r
  max-width: 90vw;\r
  max-height: 60vh;\r
  display: flex;\r
  flex-direction: column;\r
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);\r
  overflow: hidden;\r
}\r
\r
.tcw-cmd-header {\r
  display: flex;\r
  align-items: center;\r
  padding: 12px 16px;\r
  border-bottom: 1px solid var(--tcw-border);\r
  gap: 10px;\r
}\r
\r
.tcw-cmd-icon {\r
  font-size: 18px;\r
  color: var(--tcw-text-muted);\r
  flex-shrink: 0;\r
}\r
\r
.tcw-cmd-input {\r
  flex: 1;\r
  background: none;\r
  border: none;\r
  outline: none;\r
  font-size: 14px;\r
  font-family: inherit;\r
  color: var(--tcw-text);\r
  caret-color: var(--tcw-accent);\r
}\r
\r
.tcw-cmd-input::placeholder {\r
  color: var(--tcw-text-muted);\r
}\r
\r
.tcw-cmd-hint {\r
  font-size: 10px;\r
  color: var(--tcw-text-muted);\r
  border: 1px solid var(--tcw-border);\r
  padding: 2px 6px;\r
  border-radius: 3px;\r
  flex-shrink: 0;\r
}\r
\r
.tcw-cmd-list {\r
  overflow-y: auto;\r
  flex: 1;\r
  padding: 4px 0;\r
  max-height: 360px;\r
}\r
\r
.tcw-cmd-category {\r
  text-transform: uppercase;\r
  font-size: 10px;\r
  color: var(--tcw-text-muted);\r
  letter-spacing: 0.05em;\r
  padding: 8px 16px 4px;\r
  font-weight: 600;\r
}\r
\r
.tcw-cmd-item {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  padding: 8px 16px;\r
  font-size: 13px;\r
  color: var(--tcw-text-dim);\r
  cursor: pointer;\r
  width: 100%;\r
  border: none;\r
  background: none;\r
  font-family: inherit;\r
  text-align: left;\r
  transition: background 80ms ease;\r
  gap: 8px;\r
}\r
\r
.tcw-cmd-item:hover,\r
.tcw-cmd-item.tcw-selected {\r
  background: var(--tcw-hover-bg);\r
  color: var(--tcw-text);\r
}\r
\r
.tcw-cmd-item.tcw-active .tcw-cmd-item-label {\r
  color: var(--tcw-accent);\r
}\r
\r
.tcw-cmd-item-label {\r
  flex: 1;\r
}\r
\r
.tcw-cmd-check {\r
  color: var(--tcw-accent);\r
  font-size: 14px;\r
  font-weight: 600;\r
}\r
\r
.tcw-cmd-kbd {\r
  font-size: 10px;\r
  font-family: var(--tcw-font-mono);\r
  color: var(--tcw-text-muted);\r
  background: var(--tcw-bg);\r
  border: 1px solid var(--tcw-border);\r
  padding: 1px 5px;\r
  border-radius: 3px;\r
}\r
\r
.tcw-cmd-empty {\r
  padding: 24px 16px;\r
  text-align: center;\r
  color: var(--tcw-text-muted);\r
  font-size: 13px;\r
}\r
\r
.tcw-cmd-footer {\r
  display: flex;\r
  align-items: center;\r
  gap: 16px;\r
  padding: 8px 16px;\r
  border-top: 1px solid var(--tcw-border);\r
  font-size: 11px;\r
  color: var(--tcw-text-muted);\r
}\r
\r
/* === Responsive === */\r
\r
@media (max-width: 768px) {\r
  .tcw-toolbar {\r
    padding: 0 8px;\r
    height: 36px;\r
  }\r
  .tcw-toolbar-sep {\r
    display: none;\r
  }\r
  .tcw-indicator-chips {\r
    display: none;\r
  }\r
  .tcw-sidebar {\r
    width: 32px;\r
  }\r
  .tcw-sidebar-btn {\r
    width: 32px;\r
    height: 28px;\r
  }\r
}\r
`;let g=0;const x="tcw-styles";function B(){if(g++,g>1||document.getElementById(x))return;const d=document.createElement("style");d.id=x,d.textContent=N,document.head.appendChild(d)}function U(){if(g--,g>0)return;const d=document.getElementById(x);d&&d.remove()}const A={cursor:'<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>',trendingUp:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',minus:'<path d="M5 12h14"/>',penLine:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',hash:'<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',square:'<rect width="18" height="18" x="3" y="3" rx="2"/>',gitBranch:'<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',ruler:'<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',type:'<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',magnet:'<path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15"/><path d="m5 8 4 4"/><path d="m12 15 4 4"/>',undo:'<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',redo:'<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>',trash:'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',camera:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',settings:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',chevronDown:'<path d="m6 9 6 6 6-6"/>',chevronUp:'<path d="m18 15-6-6-6 6"/>',barChart:'<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',play:'<polygon points="6 3 20 12 6 21 6 3"/>',pause:'<rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/>',stop:'<rect width="14" height="14" x="5" y="5" rx="1"/>',receipt:'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>'};function p(d,t=14){const e=A[d];return e?`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${e}</svg>`:""}class T{constructor(t,e={}){i(this,"trigger");i(this,"panel");i(this,"_isOpen",!1);i(this,"onOutsideClick");i(this,"onEscapeKey");i(this,"onTriggerClick");this.trigger=t,this.panel=document.createElement("div"),this.panel.className="tcw-dropdown",this.panel.style.width=e.width??"200px",e.align==="right"?this.panel.style.right="0":this.panel.style.left="0",this.panel.style.display="none",t.style.position="relative",t.appendChild(this.panel),this.onTriggerClick=()=>{this._isOpen?this.close():this.open()},this.onOutsideClick=n=>{this.trigger.contains(n.target)||this.close()},this.onEscapeKey=n=>{n.key==="Escape"&&this.close()},t.addEventListener("click",this.onTriggerClick)}setContent(t){this.panel.innerHTML=t}open(){this._isOpen||(this._isOpen=!0,this.panel.style.display="",document.addEventListener("mousedown",this.onOutsideClick),document.addEventListener("keydown",this.onEscapeKey))}close(){this._isOpen&&(this._isOpen=!1,this.panel.style.display="none",document.removeEventListener("mousedown",this.onOutsideClick),document.removeEventListener("keydown",this.onEscapeKey))}isOpen(){return this._isOpen}destroy(){this.trigger.removeEventListener("click",this.onTriggerClick),document.removeEventListener("mousedown",this.onOutsideClick),document.removeEventListener("keydown",this.onEscapeKey),this.panel.remove()}}class R{constructor(t,e,n){i(this,"config");i(this,"callbacks");i(this,"el");i(this,"chartTypeDropdown",null);i(this,"indicatorDropdown",null);i(this,"tfButtons",[]);i(this,"chipsContainer",null);i(this,"themeBtn",null);this.config=e,this.callbacks=n,this.el=document.createElement("div"),this.el.className="tcw-toolbar",this.build(),t.appendChild(this.el)}build(){const{config:t,callbacks:e,el:n}=this,r=document.createElement("button");r.className="tcw-toolbar-symbol",r.dataset.role="symbol",r.addEventListener("click",e.onSymbolClick),n.appendChild(r),n.appendChild(this.sep());const o=document.createElement("div");o.className="tcw-toolbar-group";for(const u of t.timeframes){const w=document.createElement("button");w.className="tcw-btn",w.textContent=u.label,w.dataset.tf=u.value,w.addEventListener("click",()=>e.onTimeframe(u.value)),o.appendChild(w),this.tfButtons.push(w)}n.appendChild(o),n.appendChild(this.sep());const a=document.createElement("div");a.style.position="relative",a.style.display="inline-flex";const s=document.createElement("button");s.className="tcw-dropdown-trigger",s.dataset.role="charttype",a.appendChild(s),n.appendChild(a),this.chartTypeDropdown=new T(a,{width:"160px"}),this.buildChartTypeMenu(),n.appendChild(this.sep());const l=document.createElement("div");l.style.position="relative",l.style.display="inline-flex";const c=document.createElement("button");c.className="tcw-dropdown-trigger",c.dataset.role="indicators",l.appendChild(c),n.appendChild(l),this.indicatorDropdown=new T(l,{width:"280px"}),this.buildIndicatorMenu(),this.chipsContainer=document.createElement("div"),this.chipsContainer.className="tcw-indicator-chips",n.appendChild(this.chipsContainer),n.appendChild(this.spacer());const h=this.iconBtn("camera","Screenshot",e.onScreenshot);n.appendChild(h);const m=this.iconBtn("settings","Chart Settings",e.onSettings);n.appendChild(m),this.themeBtn=this.iconBtn("moon","Toggle theme",e.onToggleTheme),this.themeBtn.dataset.role="theme",n.appendChild(this.themeBtn)}buildChartTypeMenu(){if(!this.chartTypeDropdown)return;const t=this.config.chartTypes.map(n=>`<button class="tcw-dropdown-item" data-ct="${n.value}">${n.label}</button>`).join("");this.chartTypeDropdown.setContent(t),this.chartTypeDropdown.panel.querySelectorAll(".tcw-dropdown-item").forEach(n=>{n.addEventListener("click",r=>{var a;const o=r.currentTarget.dataset.ct;this.callbacks.onChartType(o),(a=this.chartTypeDropdown)==null||a.close()})})}buildIndicatorMenu(){if(!this.indicatorDropdown)return;const{indicators:t,popularIndicatorIds:e}=this.config,n=t.filter(s=>e.includes(s.id)),r=t.filter(s=>!e.includes(s.id));let o='<div class="tcw-dropdown-label">Popular</div>';for(const s of n)o+=`<button class="tcw-dropdown-item" data-ind="${s.id}"><span>${s.name}</span><span class="tcw-tag">${s.type}</span></button>`;o+='<div class="tcw-dropdown-divider"></div>',o+='<div class="tcw-dropdown-label">All</div>';for(const s of r)o+=`<button class="tcw-dropdown-item" data-ind="${s.id}"><span>${s.name}</span><span class="tcw-tag">${s.type}</span></button>`;this.indicatorDropdown.setContent(o),this.indicatorDropdown.panel.querySelectorAll(".tcw-dropdown-item[data-ind]").forEach(s=>{s.addEventListener("click",l=>{const c=l.currentTarget.dataset.ind;this.callbacks.onAddIndicator(c)})})}update(t){var o;const e=this.el.querySelector('[data-role="symbol"]');e&&(e.textContent=t.symbol);for(const a of this.tfButtons)a.classList.toggle("tcw-active",a.dataset.tf===t.timeframe);const n=this.el.querySelector('[data-role="charttype"]');if(n){const a=((o=this.config.chartTypes.find(s=>s.value===t.chartType))==null?void 0:o.label)??"Candles";n.innerHTML=`${p("barChart",14)} ${a} ${p("chevronDown",12)}`}const r=this.el.querySelector('[data-role="indicators"]');if(r){const a=t.activeIndicators.size;let s=`${p("trendingUp",14)} Indicators`;a>0&&(s+=` <span class="tcw-badge-count">${a}</span>`),r.innerHTML=s}if(this.chipsContainer){const a=this.getActiveIndicatorList(t);this.chipsContainer.innerHTML="";for(const s of a){const l=document.createElement("div");l.className="tcw-indicator-chip";const c=document.createElement("span");c.textContent=s.label,l.appendChild(c);const h=document.createElement("button");h.className="tcw-chip-remove",h.innerHTML=p("x",10),h.addEventListener("click",()=>this.callbacks.onRemoveIndicator(s.instanceId)),l.appendChild(h),this.chipsContainer.appendChild(l)}}this.themeBtn&&(this.themeBtn.innerHTML=t.isDark?p("moon",14):p("sun",14))}getActiveIndicatorList(t){const e=[];for(const[n,r]of t.activeIndicators.entries())e.push({instanceId:r,id:n,label:n.toUpperCase()});return e}sep(){const t=document.createElement("span");return t.className="tcw-toolbar-sep",t}spacer(){const t=document.createElement("span");return t.className="tcw-toolbar-spacer",t}iconBtn(t,e,n){const r=document.createElement("button");return r.className="tcw-btn-icon",r.title=e,r.innerHTML=p(t,14),r.addEventListener("click",n),r}destroy(){var t,e;(t=this.chartTypeDropdown)==null||t.destroy(),(e=this.indicatorDropdown)==null||e.destroy(),this.el.remove()}}const z=["trendingUp","minus","penLine","hash","square","gitBranch","ruler","type"];class O{constructor(t,e,n){i(this,"config");i(this,"callbacks");i(this,"el");i(this,"groupWraps",[]);i(this,"groupButtons",[]);i(this,"cursorBtn",null);i(this,"magnetBtn",null);i(this,"flyoutEl",null);this.config=e,this.callbacks=n,this.el=document.createElement("div"),this.el.className="tcw-sidebar",this.build(),t.appendChild(this.el)}build(){const{config:t,callbacks:e,el:n}=this;this.cursorBtn=document.createElement("button"),this.cursorBtn.className="tcw-sidebar-btn",this.cursorBtn.title="Cursor",this.cursorBtn.innerHTML=p("cursor",14),this.cursorBtn.addEventListener("click",e.onCancelDrawing),n.appendChild(this.cursorBtn),n.appendChild(this.divider()),t.drawingToolGroups.forEach((l,c)=>{const h=document.createElement("div");h.className="tcw-tool-group-wrap";const m=document.createElement("button");if(m.className="tcw-sidebar-btn",m.title=l.label,m.innerHTML=p(z[c]??"square",14),l.tools.length>1){const u=document.createElement("span");u.className="tcw-multi-dot",m.appendChild(u)}m.addEventListener("click",()=>e.onDrawingTool(l.tools[0].value)),h.appendChild(m),h.addEventListener("mouseenter",()=>this.showFlyout(c)),h.addEventListener("mouseleave",()=>this.hideFlyout()),n.appendChild(h),this.groupWraps.push(h),this.groupButtons.push(m)});const r=document.createElement("div");r.className="tcw-sidebar-spacer",n.appendChild(r),n.appendChild(this.divider()),this.magnetBtn=document.createElement("button"),this.magnetBtn.className="tcw-sidebar-btn",this.magnetBtn.title="Magnet",this.magnetBtn.innerHTML=p("magnet",14),this.magnetBtn.addEventListener("click",e.onToggleMagnet),n.appendChild(this.magnetBtn);const o=document.createElement("button");o.className="tcw-sidebar-btn",o.title="Undo",o.innerHTML=p("undo",14),o.addEventListener("click",e.onUndo),n.appendChild(o);const a=document.createElement("button");a.className="tcw-sidebar-btn",a.title="Redo",a.innerHTML=p("redo",14),a.addEventListener("click",e.onRedo),n.appendChild(a);const s=document.createElement("button");s.className="tcw-sidebar-btn tcw-danger",s.title="Clear all",s.innerHTML=p("trash",14),s.addEventListener("click",e.onClearDrawings),n.appendChild(s)}showFlyout(t){const e=this.config.drawingToolGroups[t];if(!e||e.tools.length<=1)return;this.hideFlyout();const n=document.createElement("div");n.className="tcw-flyout";const r=document.createElement("div");r.className="tcw-flyout-header",r.textContent=e.label,n.appendChild(r);for(const o of e.tools){const a=document.createElement("button");a.className="tcw-flyout-item",a.textContent=o.label,a.dataset.toolValue=o.value,a.addEventListener("click",()=>{this.callbacks.onDrawingTool(o.value),this.hideFlyout()}),n.appendChild(a)}this.flyoutEl=n,this.groupWraps[t].appendChild(n)}hideFlyout(){this.flyoutEl&&(this.flyoutEl.remove(),this.flyoutEl=null)}update(t){this.cursorBtn&&this.cursorBtn.classList.toggle("tcw-active",t.activeTool===null);const{drawingToolGroups:e}=this.config;for(let n=0;n<e.length;n++){const r=e[n].tools.some(o=>o.value===t.activeTool);this.groupButtons[n].classList.toggle("tcw-active",r)}this.flyoutEl&&this.flyoutEl.querySelectorAll(".tcw-flyout-item").forEach(n=>{const r=n;r.classList.toggle("tcw-active",r.dataset.toolValue===t.activeTool)}),this.magnetBtn&&(this.magnetBtn.classList.toggle("tcw-active",t.magnetEnabled),this.magnetBtn.title=t.magnetEnabled?"Magnet ON":"Magnet OFF")}divider(){const t=document.createElement("div");return t.className="tcw-sidebar-divider",t}destroy(){this.hideFlyout(),this.el.remove()}}const W=["style","display","scale"];class V{constructor(t){i(this,"callbacks");i(this,"backdrop",null);i(this,"modal",null);i(this,"currentTab","style");i(this,"currentSettings",null);i(this,"bodyEl",null);i(this,"tabButtons",[]);this.callbacks=t}open(t){this.currentSettings={...t},this.currentTab="style",this.buildModal()}close(){var t,e;(t=this.backdrop)==null||t.remove(),(e=this.modal)==null||e.remove(),this.backdrop=null,this.modal=null,this.bodyEl=null,this.tabButtons=[]}buildModal(){this.backdrop=document.createElement("div"),this.backdrop.className="tcw-modal-backdrop",this.backdrop.addEventListener("click",()=>{this.callbacks.onClose(),this.close()}),document.body.appendChild(this.backdrop),this.modal=document.createElement("div"),this.modal.className="tcw-modal";const t=document.createElement("div");t.className="tcw-modal-header";const e=document.createElement("h3");e.textContent="Chart Settings",t.appendChild(e);const n=document.createElement("button");n.className="tcw-modal-close",n.innerHTML=p("x",16),n.addEventListener("click",()=>{this.callbacks.onClose(),this.close()}),t.appendChild(n),this.modal.appendChild(t);const r=document.createElement("div");r.className="tcw-modal-tabs",this.tabButtons=[];for(const c of W){const h=document.createElement("button");h.className="tcw-modal-tab",h.textContent=c,h.dataset.tab=c,c===this.currentTab&&h.classList.add("tcw-active"),h.addEventListener("click",()=>{this.currentTab=c,this.tabButtons.forEach(m=>m.classList.toggle("tcw-active",m.dataset.tab===c)),this.renderTabContent()}),r.appendChild(h),this.tabButtons.push(h)}this.modal.appendChild(r),this.bodyEl=document.createElement("div"),this.bodyEl.className="tcw-modal-body",this.modal.appendChild(this.bodyEl),this.renderTabContent();const o=document.createElement("div");o.className="tcw-modal-footer";const a=document.createElement("button");a.className="tcw-reset-link",a.textContent="Reset to defaults",a.addEventListener("click",()=>this.callbacks.onReset()),o.appendChild(a);const s=document.createElement("button");s.className="tcw-done-btn",s.textContent="Done",s.addEventListener("click",()=>{this.callbacks.onClose(),this.close()}),o.appendChild(s),this.modal.appendChild(o),document.body.appendChild(this.modal);const l=c=>{c.key==="Escape"&&(document.removeEventListener("keydown",l),this.callbacks.onClose(),this.close())};document.addEventListener("keydown",l)}renderTabContent(){if(!(!this.bodyEl||!this.currentSettings))switch(this.bodyEl.innerHTML="",this.currentTab){case"style":this.renderStyleTab();break;case"display":this.renderDisplayTab();break;case"scale":this.renderScaleTab();break}}renderStyleTab(){if(!this.bodyEl||!this.currentSettings)return;const t=this.currentSettings,e=this.section("Candle Colors");e.appendChild(this.colorRow("Up Body",t.candleUpColor,r=>this.patch({candleUpColor:r}))),e.appendChild(this.colorRow("Down Body",t.candleDownColor,r=>this.patch({candleDownColor:r}))),e.appendChild(this.colorRow("Up Wick",t.candleUpWick,r=>this.patch({candleUpWick:r}))),e.appendChild(this.colorRow("Down Wick",t.candleDownWick,r=>this.patch({candleDownWick:r}))),this.bodyEl.appendChild(e);const n=this.section("Background");n.appendChild(this.colorRow("Background",t.backgroundColor,r=>this.patch({backgroundColor:r}))),n.appendChild(this.colorRow("Grid",t.gridColor,r=>this.patch({gridColor:r}))),this.bodyEl.appendChild(n)}renderDisplayTab(){if(!this.bodyEl||!this.currentSettings)return;const t=this.currentSettings,e=this.section();e.appendChild(this.toggleRow("Grid Lines",t.gridVisible,n=>this.patch({gridVisible:n}))),e.appendChild(this.toggleRow("Volume",t.volumeVisible,n=>this.patch({volumeVisible:n}))),e.appendChild(this.toggleRow("OHLC Legend",t.legendVisible,n=>this.patch({legendVisible:n}))),e.appendChild(this.toggleRow("Bar Countdown",t.barCountdown,n=>this.patch({barCountdown:n}))),e.appendChild(this.selectRow("Crosshair Mode",t.crosshairMode,[{label:"Magnet",value:"magnet"},{label:"Normal",value:"normal"},{label:"Hidden",value:"hidden"}],n=>this.patch({crosshairMode:n}))),e.appendChild(this.selectRow("Number Locale",t.numberLocale,[{label:"en-US (65,234.00)",value:"en-US"},{label:"de-DE (65.234,00)",value:"de-DE"},{label:"fr-FR (65 234,00)",value:"fr-FR"},{label:"vi-VN (65.234,00)",value:"vi-VN"},{label:"en-IN (65,234.00)",value:"en-IN"},{label:"ja-JP (65,234.00)",value:"ja-JP"}],n=>this.patch({numberLocale:n}))),this.bodyEl.appendChild(e)}renderScaleTab(){if(!this.bodyEl||!this.currentSettings)return;const t=this.currentSettings,e=this.section();e.appendChild(this.toggleRow("Auto Scale",t.autoScale,n=>this.patch({autoScale:n}))),e.appendChild(this.toggleRow("Log Scale",t.logScale,n=>this.patch({logScale:n}))),this.bodyEl.appendChild(e)}patch(t){this.currentSettings&&Object.assign(this.currentSettings,t),this.callbacks.onChange(t)}section(t){const e=document.createElement("div");if(e.className="tcw-settings-section",t){const n=document.createElement("div");n.className="tcw-settings-section-title",n.textContent=t,e.appendChild(n)}return e}colorRow(t,e,n){const r=document.createElement("div");r.className="tcw-settings-row";const o=document.createElement("span");o.className="tcw-settings-label",o.textContent=t,r.appendChild(o);const a=document.createElement("div");a.className="tcw-color-picker-wrap";const s=document.createElement("input");s.type="color",s.value=e;const l=document.createElement("span");return l.className="tcw-color-hex",l.textContent=e,s.addEventListener("input",()=>{l.textContent=s.value,n(s.value)}),a.appendChild(s),a.appendChild(l),r.appendChild(a),r}toggleRow(t,e,n){const r=document.createElement("div");r.className="tcw-settings-row";const o=document.createElement("span");o.className="tcw-settings-label",o.textContent=t,r.appendChild(o);const a=document.createElement("button");return a.className=`tcw-toggle${e?" tcw-on":""}`,a.addEventListener("click",()=>{const s=!a.classList.contains("tcw-on");a.classList.toggle("tcw-on",s),n(s)}),r.appendChild(a),r}selectRow(t,e,n,r){const o=document.createElement("div");o.className="tcw-settings-row";const a=document.createElement("span");a.className="tcw-settings-label",a.textContent=t,o.appendChild(a);const s=document.createElement("select");s.className="tcw-settings-select";for(const l of n){const c=document.createElement("option");c.value=l.value,c.textContent=l.label,l.value===e&&(c.selected=!0),s.appendChild(c)}return s.addEventListener("change",()=>r(s.value)),o.appendChild(s),o}destroy(){this.close()}}class H{constructor(t){i(this,"el");i(this,"dotEl");i(this,"messageEl");i(this,"infoEl");this.el=document.createElement("div"),this.el.className="tcw-statusbar";const e=document.createElement("div");e.className="tcw-status-indicator",this.dotEl=document.createElement("span"),this.dotEl.className="tcw-status-dot",e.appendChild(this.dotEl),this.messageEl=document.createElement("span"),e.appendChild(this.messageEl),this.el.appendChild(e),this.infoEl=document.createElement("span"),this.el.appendChild(this.infoEl),t.appendChild(this.el)}update(t){this.dotEl.className="tcw-status-dot",t.connectionState==="connected"?this.dotEl.classList.add("tcw-connected"):t.connectionState==="error"&&this.dotEl.classList.add("tcw-error"),this.messageEl.textContent=t.message,this.infoEl.textContent=`${t.symbol} ${t.timeframe}`}destroy(){this.el.remove()}}class P{constructor(t){i(this,"backdrop",null);i(this,"modal",null);i(this,"input",null);i(this,"list",null);i(this,"items",[]);i(this,"filtered",[]);i(this,"selectedIndex",0);i(this,"callbacks");i(this,"boundKeydown");this.callbacks=t,this.boundKeydown=this.handleKeydown.bind(this)}open(t){if(this.backdrop)return;this.items=t,this.filtered=t,this.selectedIndex=0,this.backdrop=document.createElement("div"),this.backdrop.className="tcw-modal-backdrop",this.backdrop.addEventListener("click",()=>this.close()),this.modal=document.createElement("div"),this.modal.className="tcw-cmd-palette";const e=document.createElement("div");e.className="tcw-cmd-header";const n=document.createElement("span");n.className="tcw-cmd-icon",n.textContent="⌕",e.appendChild(n),this.input=document.createElement("input"),this.input.className="tcw-cmd-input",this.input.type="text",this.input.placeholder="Search indicators, chart types, tools...",this.input.addEventListener("input",()=>this.filter()),e.appendChild(this.input);const r=document.createElement("span");r.className="tcw-cmd-hint",r.textContent="ESC",e.appendChild(r),this.modal.appendChild(e),this.list=document.createElement("div"),this.list.className="tcw-cmd-list",this.modal.appendChild(this.list);const o=document.createElement("div");o.className="tcw-cmd-footer",o.innerHTML="<span>↑↓ Navigate</span><span>⏎ Select</span><span>Esc Close</span>",this.modal.appendChild(o),document.body.appendChild(this.backdrop),document.body.appendChild(this.modal),this.renderList(),this.input.focus(),document.addEventListener("keydown",this.boundKeydown)}close(){var t,e;document.removeEventListener("keydown",this.boundKeydown),(t=this.backdrop)==null||t.remove(),(e=this.modal)==null||e.remove(),this.backdrop=null,this.modal=null,this.input=null,this.list=null,this.callbacks.onClose()}isOpen(){return this.backdrop!==null}filter(){var e;const t=((e=this.input)==null?void 0:e.value.toLowerCase().trim())??"";t?this.filtered=this.items.filter(n=>n.label.toLowerCase().includes(t)||n.category.toLowerCase().includes(t)||n.id.toLowerCase().includes(t)):this.filtered=this.items,this.selectedIndex=0,this.renderList()}renderList(){if(!this.list)return;if(this.list.innerHTML="",this.filtered.length===0){const e=document.createElement("div");e.className="tcw-cmd-empty",e.textContent="No results found",this.list.appendChild(e);return}let t="";for(let e=0;e<this.filtered.length;e++){const n=this.filtered[e];if(n.category!==t){t=n.category;const a=document.createElement("div");a.className="tcw-cmd-category",a.textContent=this.categoryLabel(t),this.list.appendChild(a)}const r=document.createElement("button");r.className="tcw-cmd-item",e===this.selectedIndex&&r.classList.add("tcw-selected"),n.active&&r.classList.add("tcw-active"),r.dataset.index=String(e);const o=document.createElement("span");if(o.className="tcw-cmd-item-label",o.textContent=n.label,r.appendChild(o),n.active){const a=document.createElement("span");a.className="tcw-cmd-check",a.textContent="✓",r.appendChild(a)}if(n.shortcut){const a=document.createElement("kbd");a.className="tcw-cmd-kbd",a.textContent=n.shortcut,r.appendChild(a)}r.addEventListener("click",()=>this.select(e)),r.addEventListener("mouseenter",()=>{this.selectedIndex=e,this.updateSelection()}),this.list.appendChild(r)}}updateSelection(){var e;if(!this.list)return;const t=this.list.querySelectorAll(".tcw-cmd-item");t.forEach((n,r)=>{n.classList.toggle("tcw-selected",r===this.selectedIndex)}),(e=t[this.selectedIndex])==null||e.scrollIntoView({block:"nearest"})}select(t){const e=this.filtered[t];if(e){switch(e.category){case"indicator":this.callbacks.onIndicator(e.id);break;case"chartType":this.callbacks.onChartType(e.id);break;case"drawing":this.callbacks.onDrawingTool(e.id);break;case"timeframe":this.callbacks.onTimeframe(e.id);break;case"action":this.callbacks.onAction(e.id);break}this.close()}}handleKeydown(t){switch(t.key){case"Escape":t.preventDefault(),this.close();break;case"ArrowDown":t.preventDefault(),this.filtered.length>0&&(this.selectedIndex=(this.selectedIndex+1)%this.filtered.length,this.updateSelection());break;case"ArrowUp":t.preventDefault(),this.filtered.length>0&&(this.selectedIndex=(this.selectedIndex-1+this.filtered.length)%this.filtered.length,this.updateSelection());break;case"Enter":t.preventDefault(),this.select(this.selectedIndex);break}}categoryLabel(t){switch(t){case"indicator":return"Indicators";case"chartType":return"Chart Types";case"drawing":return"Drawing Tools";case"timeframe":return"Timeframes";case"action":return"Actions";default:return t}}destroy(){this.close()}}class K{constructor(t,e={}){i(this,"chart");i(this,"state");i(this,"toolbar",null);i(this,"sidebar",null);i(this,"settings",null);i(this,"statusBar",null);i(this,"commandPalette",null);i(this,"root");i(this,"chartContainer");i(this,"destroyed",!1);i(this,"options");i(this,"symbolIndex",0);i(this,"symbols");i(this,"settingsState");i(this,"adapter",null);i(this,"boundGlobalKeydown",null);var s,l;this.options=e,this.symbols=e.symbols??M,this.settingsState={...E};const n=this.resolveIsDark(e.theme),r=this.resolveTheme(e.theme);this.state={symbol:e.symbol??this.symbols[0]??"BTCUSDT",timeframe:e.timeframe??"5m",chartType:((s=e.chartOptions)==null?void 0:s.chartType)??"candlestick",isDark:n,activeIndicators:new Map,activeTool:null,magnetEnabled:!0,connectionState:"connecting",connectionMessage:"Connecting..."};const o=this.symbols.indexOf(this.state.symbol);o>=0&&(this.symbolIndex=o),B(),this.root=document.createElement("div"),this.root.className="tcw-root",this.root.dataset.tcwTheme=n?"dark":"light",t.appendChild(this.root),e.toolbar!==!1&&(this.toolbar=new R(this.root,{symbols:this.symbols,timeframes:e.timeframes?v.filter(c=>e.timeframes.includes(c.value)):v,chartTypes:e.chartTypes?f.filter(c=>e.chartTypes.includes(c.value)):f,indicators:k,popularIndicatorIds:I},{onSymbolClick:()=>this.handleSymbolClick(),onTimeframe:c=>this.handleTimeframe(c),onChartType:c=>this.handleChartType(c),onAddIndicator:c=>this.handleAddIndicator(c),onRemoveIndicator:c=>this.handleRemoveIndicator(c),onScreenshot:()=>this.chart.screenshot(),onSettings:()=>this.openSettings(),onToggleTheme:()=>this.handleToggleTheme()}));const a=document.createElement("div");a.className="tcw-body",e.drawingTools!==!1&&(this.sidebar=new O(a,{drawingToolGroups:C},{onDrawingTool:c=>this.handleDrawingTool(c),onCancelDrawing:()=>this.handleCancelDrawing(),onToggleMagnet:()=>this.handleToggleMagnet(),onUndo:()=>this.chart.undo(),onRedo:()=>this.chart.redo(),onClearDrawings:()=>{this.chart.clearDrawings(),this.state={...this.state,activeTool:null},this.updateUI()}})),this.chartContainer=document.createElement("div"),this.chartContainer.className="tcw-chart-container",a.appendChild(this.chartContainer),this.root.appendChild(a),this.chart=new D(this.chartContainer,{chartType:this.state.chartType,theme:r,autoScale:!0,crosshair:{mode:"magnet"},features:{drawings:!0,drawingMagnet:!0,drawingUndoRedo:!0,indicators:!0,trading:e.trading!==!1,tradingContextMenu:e.trading!==!1,volume:!0,legend:!0,crosshair:!0,keyboard:!0,screenshot:!0,alerts:!0,barCountdown:!0,logScale:!0,watermark:!0},...e.chartOptions}),e.statusBar!==!1&&(this.statusBar=new H(this.root)),e.settings!==!1&&(this.settings=new V({onChange:c=>this.applySettings(c),onReset:()=>this.resetSettings(),onClose:()=>{}})),this.commandPalette=new P({onIndicator:c=>this.handleAddIndicator(c),onChartType:c=>this.handleChartType(c),onDrawingTool:c=>this.handleDrawingTool(c),onTimeframe:c=>this.handleTimeframe(c),onAction:c=>this.handleAction(c),onClose:()=>{}}),this.boundGlobalKeydown=c=>{(c.ctrlKey||c.metaKey)&&c.key==="k"&&(c.preventDefault(),this.toggleCommandPalette())},document.addEventListener("keydown",this.boundGlobalKeydown),e.adapter&&(this.adapter=e.adapter,this.connectStream()),this.updateUI(),(l=e.onReady)==null||l.call(e,this.chart)}async setSymbol(t){var n,r;this.state={...this.state,symbol:t};const e=this.symbols.indexOf(t);e>=0&&(this.symbolIndex=e),(r=(n=this.options).onSymbolChange)==null||r.call(n,t),this.updateUI(),this.adapter&&await this.connectStream()}async setTimeframe(t){var e,n;this.state={...this.state,timeframe:t},(n=(e=this.options).onTimeframeChange)==null||n.call(e,t),this.updateUI(),this.adapter&&await this.connectStream()}setTheme(t){const e=this.resolveIsDark(t),n=this.resolveTheme(t);this.state={...this.state,isDark:e},this.root.dataset.tcwTheme=e?"dark":"light",this.chart.setTheme(n),this.updateUI()}getChart(){return this.chart}destroy(){var t,e,n,r,o;this.destroyed||(this.destroyed=!0,this.boundGlobalKeydown&&document.removeEventListener("keydown",this.boundGlobalKeydown),(t=this.commandPalette)==null||t.destroy(),(e=this.toolbar)==null||e.destroy(),(n=this.sidebar)==null||n.destroy(),(r=this.settings)==null||r.destroy(),(o=this.statusBar)==null||o.destroy(),this.chart.destroy(),this.root.remove(),U())}handleSymbolClick(){var e,n;this.symbolIndex=(this.symbolIndex+1)%this.symbols.length;const t=this.symbols[this.symbolIndex];this.state={...this.state,symbol:t},(n=(e=this.options).onSymbolChange)==null||n.call(e,t),this.updateUI(),this.adapter&&this.connectStream()}handleTimeframe(t){var e,n;this.state={...this.state,timeframe:t},(n=(e=this.options).onTimeframeChange)==null||n.call(e,t),this.updateUI(),this.adapter&&this.connectStream()}handleChartType(t){this.state={...this.state,chartType:t},this.chart.setChartType(t),this.updateUI()}handleAddIndicator(t){if(this.state.activeIndicators.has(t)){const e=this.state.activeIndicators.get(t);this.chart.removeIndicator(e);const n=new Map(this.state.activeIndicators);n.delete(t),this.state={...this.state,activeIndicators:n}}else{const e=this.chart.addIndicator(t);if(e){const n=new Map(this.state.activeIndicators);n.set(t,e),this.state={...this.state,activeIndicators:n}}}this.updateUI()}handleRemoveIndicator(t){this.chart.removeIndicator(t);const e=new Map(this.state.activeIndicators);for(const[n,r]of e.entries())if(r===t){e.delete(n);break}this.state={...this.state,activeIndicators:e},this.updateUI()}toggleCommandPalette(){var t,e;if((t=this.commandPalette)!=null&&t.isOpen()){this.commandPalette.close();return}(e=this.commandPalette)==null||e.open(this.buildCommandItems())}buildCommandItems(){const t=[];for(const e of k)t.push({id:e.id,label:e.name,category:"indicator",active:this.state.activeIndicators.has(e.id)});for(const e of f)t.push({id:e.value,label:e.label,category:"chartType",active:this.state.chartType===e.value});for(const e of C)for(const n of e.tools)t.push({id:n.value,label:n.label,category:"drawing",active:this.state.activeTool===n.value});for(const e of v)t.push({id:e.value,label:e.label,category:"timeframe",active:this.state.timeframe===e.value});return t.push({id:"screenshot",label:"Screenshot",category:"action",shortcut:""},{id:"toggleTheme",label:"Toggle Theme",category:"action"},{id:"settings",label:"Settings",category:"action"},{id:"clearDrawings",label:"Clear All Drawings",category:"action"}),t}handleAction(t){switch(t){case"screenshot":this.chart.screenshot();break;case"toggleTheme":this.handleToggleTheme();break;case"settings":this.openSettings();break;case"clearDrawings":this.chart.clearDrawings(),this.state={...this.state,activeTool:null},this.updateUI();break}}handleDrawingTool(t){this.state={...this.state,activeTool:t},this.chart.setDrawingTool(t),this.updateUI()}handleCancelDrawing(){this.state={...this.state,activeTool:null},this.chart.setDrawingTool(null),this.updateUI()}handleToggleMagnet(){const t=!this.state.magnetEnabled;this.state={...this.state,magnetEnabled:t},this.chart.setDrawingMagnet(t),this.updateUI()}handleToggleTheme(){const t=!this.state.isDark;this.state={...this.state,isDark:t},this.root.dataset.tcwTheme=t?"dark":"light",this.chart.setTheme(t?b:y),this.chart.setWatermark(this.state.symbol.replace("USDT"," / USDT"),{fontSize:48,color:t?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"}),this.updateUI()}openSettings(){var t;(t=this.settings)==null||t.open(this.settingsState)}applySettings(t){this.settingsState={...this.settingsState,...t},t.gridVisible!==void 0&&this.chart.setGridVisible(t.gridVisible),t.volumeVisible!==void 0&&this.chart.setVolumeVisible(t.volumeVisible),t.crosshairMode!==void 0&&this.chart.setCrosshairMode(t.crosshairMode),t.autoScale!==void 0&&this.chart.setAutoScale(t.autoScale),t.logScale!==void 0&&this.chart.setLogScale(t.logScale),t.numberLocale!==void 0&&this.chart.setNumberLocale(t.numberLocale);const n={...this.chart.getTheme()};let r=!1;t.candleUpColor!==void 0&&(n.candleUp=t.candleUpColor,r=!0),t.candleDownColor!==void 0&&(n.candleDown=t.candleDownColor,r=!0),t.candleUpWick!==void 0&&(n.candleUpWick=t.candleUpWick,r=!0),t.candleDownWick!==void 0&&(n.candleDownWick=t.candleDownWick,r=!0),t.backgroundColor!==void 0&&(n.background=t.backgroundColor,r=!0),t.gridColor!==void 0&&(n.grid=t.gridColor,r=!0),r&&this.chart.setTheme(n)}resetSettings(){this.settingsState={...E},this.applySettings(this.settingsState)}async connectStream(){if(this.adapter){this.state={...this.state,connectionState:"connecting",connectionMessage:"Connecting..."},this.updateUI();try{this.chart.disconnectStream(),await this.chart.connect({adapter:this.adapter,symbol:this.state.symbol,timeframe:this.state.timeframe,historyLimit:this.options.historyLimit??500}),this.chart.setWatermark(this.state.symbol.replace("USDT"," / USDT"),{fontSize:48,color:this.state.isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"}),this.state={...this.state,connectionState:"connected",connectionMessage:"Live"}}catch(t){this.state={...this.state,connectionState:"error",connectionMessage:t instanceof Error?t.message:"Connection failed"}}this.updateUI()}}updateUI(){var t,e,n;(t=this.toolbar)==null||t.update(this.state),(e=this.sidebar)==null||e.update(this.state),(n=this.statusBar)==null||n.update({connectionState:this.state.connectionState,message:this.state.connectionMessage,symbol:this.state.symbol,timeframe:this.state.timeframe})}resolveIsDark(t){return t===void 0||t==="dark"?!0:t==="light"?!1:typeof t=="object"&&t.background?this.isColorDark(t.background):!0}resolveTheme(t){return t===void 0||t==="dark"?b:t==="light"?y:typeof t=="object"?t:b}isColorDark(t){if(t.startsWith("#")&&t.length>=7){const e=parseInt(t.slice(1,3),16),n=parseInt(t.slice(3,5),16),r=parseInt(t.slice(5,7),16);return e+n+r<384}return!0}}export{K as ChartWidget};
