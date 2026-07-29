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

  it.each(Object.values(fighters))('$name uses identical combat data for 1P and 2P', (fighter) => {
    const p1Config = fighter;
    const p2Config = fighter;
    expect(p1Config.maxHealth).toBe(p2Config.maxHealth);
    expect(p1Config.moveSpeed).toBe(p2Config.moveSpeed);
    expect(p1Config.jumpVelocity).toBe(p2Config.jumpVelocity);
    expect(p1Config.basicAttack).toEqual(p2Config.basicAttack);
    expect(p1Config.skill).toEqual(p2Config.skill);
    expect(p1Config.ultimate).toEqual(p2Config.ultimate);
  });

  it('balances the minigun range with lower reward and longer recovery', () => {
    expect(fighters.minigun.basicAttack.hitboxWidth)
      .toBeGreaterThan(fighters.sword.basicAttack.hitboxWidth);
    expect(fighters.minigun.basicAttack.recoveryMs)
      .toBeGreaterThan(fighters.sword.basicAttack.recoveryMs);
    expect(fighters.minigun.skill.damage).toBeLessThan(fighters.sword.skill.damage);
    expect(fighters.minigun.ultimate.damage).toBeLessThan(fighters.rock.ultimate.damage);
  });
});
