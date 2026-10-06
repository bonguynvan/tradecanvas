import { describe, it, expect, beforeEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { ReplayManager, MAX_REPLAY_FRAME_MS, type ReplayClock } from '../ReplayManager.js';

const bars = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: i * 60_000, open: i, high: i, low: i, close: i, volume: 1 }));

/** A clock the test moves: each `frame(ms)` runs the waiting frame `ms` later. */
function manualClock() {
  let time = 0;
  let waiting: (() => void) | null = null;
  const clock: ReplayClock = {
    now: () => time,
    frame: (run) => {
      waiting = run;
      return run;
    },
    cancel: () => {
      waiting = null;
    },
  };
  const frame = (ms: number) => {
    time += ms;
    const run = waiting;
    waiting = null;
    run?.();
  };
  return { clock, frame, pending: () => waiting !== null };
}

let shown: number[];
let rm: ReplayManager;
let clock: ReturnType<typeof manualClock>;

beforeEach(() => {
  clock = manualClock();
  rm = new ReplayManager(clock.clock);
  shown = [];
  rm.on('bar', ({ index }) => shown.push(index));
});

describe('ReplayManager on the frame clock', () => {
  it('advances several bars a frame when a bar takes less than a frame', () => {
    rm.load(bars(1000));
    rm.play({ startIndex: 0, interval: 500, speed: 125 }); // 4 ms a bar
    clock.frame(16);
    expect(shown).toEqual([3]); // bars 0..3 in one go, reported once
    clock.frame(16);
    expect(shown).toEqual([3, 7]);
  });

  it('plays the whole replay in about the duration asked, whatever its length', () => {
    rm.load(bars(8641));
    const complete: number[] = [];
    rm.on('complete', () => complete.push(rm.getProgress().current));
    rm.play({ startIndex: 0, duration: 3500 });
    let frames = 0;
    while (clock.pending() && frames < 1000) {
      clock.frame(1000 / 60);
      frames++;
    }
    expect(frames).toBeGreaterThan(200);
    expect(frames).toBeLessThan(215); // ~3.5 s at 60 fps
    expect(complete).toEqual([8640]);
    expect(rm.getState()).toBe('paused');
  });

  it('slows down for a late frame rather than skip ahead', () => {
    rm.load(bars(1000));
    rm.play({ startIndex: 0, duration: 1000 }); // 1 ms a bar
    clock.frame(2000); // a frame two seconds late
    expect(shown).toEqual([MAX_REPLAY_FRAME_MS - 1]);
    expect(rm.isAtEnd()).toBe(false);
  });

  it('keeps one clock, and none once paused', () => {
    rm.load(bars(100));
    rm.play({ startIndex: 0, interval: 500, speed: 125 });
    rm.play({ interval: 500, speed: 125 });
    clock.frame(16);
    expect(shown).toEqual([3]);
    rm.pause();
    expect(clock.pending()).toBe(false);
  });

  it('drops the duration for a speed set after it', () => {
    rm.load(bars(100));
    rm.play({ startIndex: 0, duration: 100, paused: true });
    rm.setSpeed(250); // 2 ms a bar, from now on
    rm.resume();
    clock.frame(16);
    expect(shown).toEqual([0, 8]);
  });

  it('keeps one clock when a listener starts the replay over at its end', () => {
    rm.load(bars(100));
    let loops = 0;
    rm.on('complete', () => {
      if (loops++ > 0) return;
      rm.seekTo(0);
      rm.resume();
    });
    rm.play({ startIndex: 90, interval: 500, speed: 125 }); // 4 ms a bar
    clock.frame(16);
    clock.frame(16);
    clock.frame(16); // past the end: complete, and again from bar 0
    shown.length = 0;
    clock.frame(16);
    expect(shown).toEqual([4]); // four bars a frame, not eight
    rm.pause();
    clock.frame(16);
    expect(shown).toEqual([4]);
  });

  it('forgets a duration once a replay starts without one', () => {
    rm.load(bars(100));
    rm.play({ startIndex: 0, duration: 100_000 });
    rm.stop();
    rm.load(bars(100));
    rm.play({ startIndex: 0, interval: 500, speed: 125 });
    clock.frame(16);
    expect(shown.at(-1)).toBe(3);
  });

  it('keeps the pace of a duration through a pause', () => {
    rm.load(bars(1001));
    rm.play({ startIndex: 0, duration: 1000 }); // 1 ms a bar
    clock.frame(16);
    expect(shown.at(-1)).toBe(15);
    rm.pause();
    rm.resume();
    clock.frame(16);
    expect(shown.at(-1)).toBe(31);
  });

  it('goes on when a listener throws', () => {
    rm.load(bars(100));
    let thrown = 0;
    rm.on('bar', () => {
      if (thrown++ === 0) throw new Error('listener');
    });
    rm.play({ startIndex: 0, interval: 500, speed: 125 });
    expect(() => clock.frame(16)).toThrow('listener');
    clock.frame(16);
    expect(shown.at(-1)).toBe(7);
    expect(rm.getState()).toBe('playing');
  });

  it('waits rather than spin on a speed that has no pace', () => {
    rm.load(bars(100));
    rm.play({ startIndex: 0, interval: 500, speed: -1 });
    expect(rm.getState()).toBe('paused');
    expect(clock.pending()).toBe(false);
    rm.play({ startIndex: 0, interval: 500, speed: 1, duration: Infinity });
    expect(rm.getState()).toBe('playing'); // the duration is left out, the speed kept
  });
});
