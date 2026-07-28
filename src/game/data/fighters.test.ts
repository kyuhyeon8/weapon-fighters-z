import { describe, expect, it } from 'vitest';
import { fighters } from './fighters';

describe('fighter roster', () => {
  it('contains the six fighters required by the proposal', () => {
    expect(Object.keys(fighters)).toEqual([
      'sword',
      'fist',
      'minigun',
      'clock',
      'plant',
      'rock',
    ]);
  });

  it.each(Object.values(fighters))('$name uses the shared health and mana rules', (fighter) => {
    expect(fighter.maxHealth).toBe(100);
    expect(fighter.maxMana).toBe(100);
    expect(fighter.basicAttack.manaCost).toBe(0);
    expect(fighter.skill.manaCost).toBeGreaterThan(0);
    expect(fighter.ultimate.manaCost).toBeGreaterThan(fighter.skill.manaCost);
  });

  it('keeps the proposal values for sword and fist', () => {
    expect(fighters.sword.basicAttack.damage).toBe(7);
    expect(fighters.sword.skill).toMatchObject({ damage: 20, manaCost: 30 });
    expect(fighters.sword.ultimate.manaCost).toBe(75);
    expect(fighters.fist.basicAttack.damage).toBe(10);
    expect(fighters.fist.skill).toMatchObject({ damage: 20, manaCost: 25 });
    expect(fighters.fist.ultimate.manaCost).toBe(60);
  });
});
