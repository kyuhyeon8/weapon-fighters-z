import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';

export class CombatSystem {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onHit: (attacker: Fighter, target: Fighter) => void,
  ) {}

  update(now: number, fighters: [Fighter, Fighter]): void {
    const [p1, p2] = fighters;
    const p2Attack = p2.currentAttack;
    const p1WillHit = this.intersects(p1, p2);
    const p2WillHit = this.intersects(p2, p1);

    if (p1WillHit && p2.receiveHit(p1, now)) this.onHit(p1, p2);
    if (p2WillHit) {
      if (p2.currentAttack && p1.receiveHit(p2, now)) {
        this.onHit(p2, p1);
      } else if (p2Attack) {
        // The first collision may have interrupted P2's attack. Because both
        // overlaps were sampled in the same physics tick, preserve the trade.
        p1.receiveBonusHit(
          p2Attack.config.damage,
          p2Attack.config.knockbackX * p2Attack.direction,
          p2Attack.config.knockbackY,
          now,
          p2,
          p2Attack.config.hitstunMs,
        );
      }
    }
  }

  private intersects(attacker: Fighter, target: Fighter): boolean {
    const hitbox = attacker.getHitbox();
    return Boolean(hitbox && Phaser.Geom.Intersects.RectangleToRectangle(hitbox, target.getHurtbox()));
  }

  showHitEffect(x: number, y: number, color: number): void {
    const ring = this.scene.add.circle(x, y, 12, color, 0.4).setStrokeStyle(4, 0xffffff);
    this.scene.tweens.add({
      targets: ring, radius: 44, alpha: 0, duration: 180,
      onComplete: () => ring.destroy(),
    });
  }
}
