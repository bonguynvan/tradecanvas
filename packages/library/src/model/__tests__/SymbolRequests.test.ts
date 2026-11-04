import { describe, it, expect } from 'vitest';
import { SymbolRequests, type SymbolReaders } from '../SymbolRequests.js';

type Ind = { instanceId: string; id: string; params: Record<string, unknown> };

function setup(initial: Ind[] = []) {
  let list = initial;
  const held = new Set<string>();
  const readers = {
    getActiveIndicators: () => list,
    getIndicatorConfig: (id: string) => list.find((i) => i.instanceId === id) ?? null,
  } as unknown as SymbolReaders;
  const requests = new SymbolRequests(readers, held);
  return { requests, held, set: (next: Ind[]) => (list = next) };
}

const compare = (instanceId: string, symbol: unknown): Ind => ({ instanceId, id: 'compareSymbol', params: { symbol } });

describe('SymbolRequests', () => {
  it('lists the symbols the indicators read, once each, trimmed', () => {
    const { requests } = setup([compare('a', ' ETH '), compare('b', 'ETH'), { instanceId: 'c', id: 'spread', params: { symbol: 'SOL' } }, compare('d', '  ')]);
    expect(requests.required()).toEqual(['ETH', 'SOL']);
  });

  it('ignores a symbol input on an indicator that reads no other symbol', () => {
    const { requests } = setup([{ instanceId: 'a', id: 'sma', params: { symbol: 'ETH' } }]);
    expect(requests.required()).toEqual([]);
    expect(requests.toAsk('a')).toBeNull();
  });

  it('asks once for a symbol the chart has not got', () => {
    const { requests } = setup([compare('a', 'ETH'), compare('b', 'ETH')]);
    expect(requests.toAsk('a')).toBe('ETH');
    expect(requests.toAsk('a')).toBeNull();
    expect(requests.toAsk('b')).toBeNull();
  });

  it('does not ask for one it holds', () => {
    const { requests, held } = setup([compare('a', 'ETH')]);
    held.add('ETH');
    expect(requests.toAsk('a')).toBeNull();
  });

  it('asks again once the bars came, or once no indicator read it', () => {
    const { requests, set } = setup([compare('a', 'ETH')]);
    requests.toAsk('a');
    requests.given(' ETH ');
    expect(requests.toAsk('a')).toBe('ETH');
    set([]);
    requests.forgetUnread();
    set([compare('a', 'ETH')]);
    expect(requests.toAsk('a')).toBe('ETH');
  });

  it('lists the indicators reading a symbol', () => {
    const { requests } = setup([compare('a', 'ETH '), compare('b', 'SOL'), { instanceId: 'c', id: 'sma', params: { symbol: 'ETH' } }]);
    expect(requests.readersOf(' ETH')).toEqual(['a']);
  });

  it('returns null for an unknown indicator', () => {
    expect(setup().requests.toAsk('nope')).toBeNull();
  });
});
