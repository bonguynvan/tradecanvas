import { createRequire } from 'node:module';
import { REPO } from './workspace.mjs';

const require = createRequire(`${REPO}/packages/library/package.json`);

/** A 2D context that takes any call: the chart draws into nothing, and its state reads back. */
function fakeContext(canvas) {
  const store = { canvas };
  return new Proxy(store, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (text) => ({ width: String(text).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (prop === 'getImageData' || prop === 'createImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => ({ addColorStop() {} });
      if (prop === 'getLineDash') return () => [];
      return () => {};
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  });
}

/** Sockets that never open: an answer that reaches for an exchange is seen, not served. */
function socketClass(sockets) {
  return class FakeSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = 0;
    constructor(url) {
      this.url = String(url);
      sockets.push(this.url);
    }
    send() {}
    close() { this.readyState = 3; }
    addEventListener() {}
    removeEventListener() {}
  };
}

/** Requests by XMLHttpRequest: recorded, never sent, each a 404. */
function xhrClass(requests) {
  return class FakeXhr {
    readyState = 0;
    status = 0;
    responseText = '';
    open(method, url) { this.url = String(url); }
    setRequestHeader() {}
    addEventListener(type, cb) { if (type === 'load' || type === 'error') this[`on${type}`] = cb; }
    send() {
      requests.push(this.url);
      setTimeout(() => {
        this.readyState = 4;
        this.status = 404;
        this.onreadystatechange?.();
        this.onload?.();
      }, 0);
    }
    abort() {}
  };
}

/**
 * Names Node has too, whose browser kind an answer needs: Node's Event can't
 * be dispatched on a jsdom element, nor its AbortSignal given to a jsdom
 * listener; Node's navigator and storage aren't a page's.
 */
const BROWSER_OWN = new Set([
  'Event', 'EventTarget', 'CustomEvent', 'MessageEvent', 'ErrorEvent', 'UIEvent', 'KeyboardEvent', 'MouseEvent', 'FocusEvent', 'WheelEvent',
  'AbortController', 'AbortSignal', 'DOMException', 'navigator', 'localStorage', 'sessionStorage',
]);

/**
 * A browser for one answer: jsdom's window as the globals, the canvas, frame,
 * resize and path APIs jsdom lacks, and a network that records each request
 * and answers only what the task's `serve` gives (else a 404).
 */
export function installDom() {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  const { window } = dom;
  for (const key of Object.getOwnPropertyNames(window)) {
    if (key in globalThis && !BROWSER_OWN.has(key)) continue;
    try {
      Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
    } catch {
      // A property the global object won't take: the answer reads it from window.
    }
  }
  globalThis.window = window;
  globalThis.document = window.document;
  const network = { fetches: [], sockets: [], xhr: [] };
  let serve = () => null;
  const fetchStub = async (input) => {
    const url = String(input?.url ?? input);
    network.fetches.push(url);
    const body = await serve(url);
    if (body === null || body === undefined) return new Response('not found', { status: 404 });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const globals = {
    fetch: fetchStub,
    WebSocket: socketClass(network.sockets),
    XMLHttpRequest: xhrClass(network.xhr),
    requestAnimationFrame: (cb) => setTimeout(() => cb(performance.now()), 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    Path2D: class { moveTo() {} lineTo() {} rect() {} arc() {} closePath() {} bezierCurveTo() {} quadraticCurveTo() {} addPath() {} },
    matchMedia: () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  };
  for (const [key, value] of Object.entries(globals)) {
    globalThis[key] = value;
    window[key] = value;
  }
  window.HTMLCanvasElement.prototype.getContext = function getContext() {
    return fakeContext(this);
  };
  return {
    window,
    network,
    /** Answer requests: `(url) => body` (an object is sent as JSON), null for a 404. */
    serve(handler) { serve = handler; },
    /** An attached element of a set size: jsdom lays nothing out. */
    host(width = 900, height = 520) {
      const el = window.document.createElement('div');
      Object.defineProperty(el, 'clientWidth', { value: width, configurable: true });
      Object.defineProperty(el, 'clientHeight', { value: height, configurable: true });
      el.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON() {} });
      window.document.body.appendChild(el);
      return el;
    },
  };
}
