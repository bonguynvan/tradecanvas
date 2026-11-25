import { describe, it, expect } from 'vitest';
import { feedHealth, FEED_QUIET_AFTER_S } from '../feedHealth.js';

const NOW = 1_000_000;
const judged = (over: Partial<Parameters<typeof feedHealth>[0]> = {}) =>
  feedHealth({ hasFeed: true, state: 'connected', lastUpdate: NOW - 1000, now: NOW, quietAfter: 60, marketOpen: null, ...over });

// The status read "Live" two minutes after the feed's last word, and an order went out at that price.
describe('feedHealth', () => {
  it('is live while a connected feed keeps telling', () => {
    expect(judged()).toBe('live');
  });

  it('is quiet once a connected feed has told nothing for longer than the wait', () => {
    expect(judged({ lastUpdate: NOW - 60_000 })).toBe('live');
    expect(judged({ lastUpdate: NOW - 60_001 })).toBe('quiet');
  });

  it('is down while the feed is not connected: failed, or connecting again', () => {
    expect(judged({ state: 'error' })).toBe('down');
    expect(judged({ state: 'connecting' })).toBe('down');
  });

  it('is not quiet on a market that is shut: there is nothing to tell', () => {
    expect(judged({ lastUpdate: NOW - 600_000, marketOpen: false })).toBe('live');
    expect(judged({ lastUpdate: NOW - 600_000, marketOpen: true })).toBe('quiet');
  });

  it('is not judged where the bars are the host’s own, or the wait is switched off', () => {
    expect(judged({ hasFeed: false, state: 'disconnected', lastUpdate: null })).toBe('live');
    expect(judged({ lastUpdate: NOW - 600_000, quietAfter: 0 })).toBe('live');
  });

  it('gives a feed that has told nothing yet the wait from now', () => {
    expect(judged({ lastUpdate: null })).toBe('live');
  });

  it('waits a minute unless told otherwise', () => {
    expect(FEED_QUIET_AFTER_S).toBe(60);
  });
});
