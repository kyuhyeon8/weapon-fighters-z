import type { GameMode, RoundResult } from '../data/types';

export class RoundManager {
  readonly mode: GameMode;
  round = 1;
  p1Wins = 0;
  p2Wins = 0;
  history: RoundResult[] = [];

  constructor(mode: GameMode) {
    this.mode = mode;
  }

  record(result: RoundResult): { matchOver: boolean; winner: RoundResult | null } {
    this.history.push(result);
    if (result === 'draw') {
      return { matchOver: true, winner: 'draw' };
    }
    if (result === 'p1') this.p1Wins += 1;
    if (result === 'p2') this.p2Wins += 1;

    if (this.mode === 'single') {
      return { matchOver: true, winner: result };
    }
    if (this.p1Wins >= 2) return { matchOver: true, winner: 'p1' };
    if (this.p2Wins >= 2) return { matchOver: true, winner: 'p2' };

    this.round += 1;
    return { matchOver: false, winner: null };
  }
}
