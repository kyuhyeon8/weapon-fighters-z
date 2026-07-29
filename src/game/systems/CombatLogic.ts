import type { RoundResult } from '../data/types';
import { combatTuning } from '../config/combatTuning';

export interface CombatantStats {
  health: number;
  mana: number;
  maxHealth: number;
  maxMana: number;
  rage: number;
}

export function applyDamage(stats: CombatantStats, damage: number): CombatantStats {
  return { ...stats, health: Math.max(0, stats.health - Math.max(0, damage)) };
}

export function canUseMana(stats: CombatantStats, cost: number): boolean {
  return stats.mana >= cost;
}

export function spendMana(stats: CombatantStats, cost: number): CombatantStats {
  return canUseMana(stats, cost) ? { ...stats, mana: stats.mana - cost } : stats;
}

export function regenerateMana(
  stats: CombatantStats,
  perSecond: number,
  deltaSeconds: number,
): CombatantStats {
  return { ...stats, mana: Math.min(stats.maxMana, stats.mana + perSecond * deltaSeconds) };
}

export function addRage(stats: CombatantStats, amount: number): CombatantStats {
  return { ...stats, rage: Math.min(4, Math.max(0, stats.rage + amount)) };
}

export function punchRushDamage(rage: number): number {
  if (rage >= 4) return 60;
  if (rage >= 2) return 40;
  return 30;
}

export function consumeRage(stats: CombatantStats): CombatantStats {
  return { ...stats, rage: 0 };
}

export function determineRoundResult(p1Health: number, p2Health: number): RoundResult | null {
  if (p1Health <= 0 && p2Health <= 0) return 'draw';
  if (p1Health <= 0) return 'p2';
  if (p2Health <= 0) return 'p1';
  return null;
}

export function applyVoidFall(stats: CombatantStats): CombatantStats {
  return applyDamage(stats, combatTuning.voidFallDamage);
}

export function shouldApplyInterruptedTrade(
  attackWasSampled: boolean,
  attackStillActive: boolean,
): boolean {
  return attackWasSampled && !attackStillActive;
}

export function minigunBurstCount(sequence: number): 4 | 6 {
  return sequence > 0 && sequence % 3 === 0 ? 6 : 4;
}

export function shouldSwordSlamDive(elapsedMs: number, verticalVelocity: number): boolean {
  return elapsedMs >= 650 || verticalVelocity >= -20;
}

export function shouldSwordSlamLand(elapsedMs: number, grounded: boolean): boolean {
  return elapsedMs >= 140 && grounded;
}

export function swordWavePositions(
  originX: number,
  surfaceLeft: number,
  surfaceRight: number,
  step: number,
): number[] {
  const distance = 64 + step * 74;
  const edgePadding = 18;
  return [originX - distance, originX + distance]
    .filter((x) => x >= surfaceLeft + edgePadding && x <= surfaceRight - edgePadding);
}

export function facingTowardOpponent(
  fighterX: number,
  opponentX: number,
  currentFacing: -1 | 1,
): -1 | 1 {
  if (opponentX === fighterX) return currentFacing;
  return opponentX > fighterX ? 1 : -1;
}

export function swordSlamWeaponAngle(elapsedMs: number, descending: boolean): number {
  if (descending) return 132;
  const keyframes = [-13, 42, 77, 107, 132] as const;
  const progress = Math.max(0, Math.min(1, (elapsedMs - 540) / 110));
  const scaled = progress * (keyframes.length - 1);
  const frame = Math.min(keyframes.length - 2, Math.floor(scaled));
  const frameProgress = scaled - frame;
  return keyframes[frame] + (keyframes[frame + 1] - keyframes[frame]) * frameProgress;
}
