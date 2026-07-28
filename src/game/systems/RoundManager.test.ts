import { describe, expect, it } from 'vitest';
import { RoundManager } from './RoundManager';

describe('RoundManager', () => {
  it('ends a single-round match immediately', () => {
    const rounds = new RoundManager('single');
    expect(rounds.record('p1')).toEqual({ matchOver: true, winner: 'p1' });
  });

  it('awards a best-of-three match at two wins', () => {
    const rounds = new RoundManager('bestOf3');
    expect(rounds.record('p1').matchOver).toBe(false);
    expect(rounds.record('draw').matchOver).toBe(false);
    expect(rounds.record('p1')).toEqual({ matchOver: true, winner: 'p1' });
    expect(rounds.p1Wins).toBe(2);
    expect(rounds.p2Wins).toBe(0);
  });

  it('does not award a win for a draw round', () => {
    const rounds = new RoundManager('bestOf3');
    rounds.record('draw');
    expect([rounds.p1Wins, rounds.p2Wins, rounds.round]).toEqual([0, 0, 2]);
  });
});
