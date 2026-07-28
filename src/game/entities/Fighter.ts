import Phaser from 'phaser';
import type { AttackConfig, AttackKind, FighterConfig } from '../data/types';
import {
  addRage,
  applyDamage,
  canUseMana,
  consumeRage,
  punchRushDamage,
  regenerateMana,
  spendMana,
  type CombatantStats,
} from '../systems/CombatLogic';

export type FighterState =
  | 'IDLE' | 'RUN' | 'JUMP' | 'FALL'
  | 'ATTACK' | 'SKILL' | 'ULTIMATE'
  | 'HITSTUN' | 'STUN' | 'KO' | 'RESPAWN_INVULNERABLE';
export type AttackPhase = 'startup' | 'active' | 'recovery';

export interface ActiveAttack {
  config: AttackConfig;
  kind: AttackKind;
  startedAt: number;
  id: string;
  phase: AttackPhase;
  direction: -1 | 1;
  hitTargets: Set<number>;
}

export class Fighter extends Phaser.Physics.Arcade.Sprite {
  readonly playerNumber: 1 | 2;
  readonly fighterConfig: FighterConfig;
  stats: CombatantStats;
  state: FighterState = 'IDLE';
  facing: -1 | 1;
  currentAttack?: ActiveAttack;
  controlEnabled = false;
  manaFlashUntil = 0;
  invulnerableUntil = 0;
  slowedUntil = 0;
  private stateUntil = 0;
  private attackCounter = 0;
  private lastGrounded = false;
  private jumpBufferedUntil = 0;
  private coyoteUntil = 0;
  readonly displayTint: number;
  readonly weapon: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: FighterConfig,
    playerNumber: 1 | 2,
    tint: number,
  ) {
    super(scene, x, y, 'fighter-body');
    this.playerNumber = playerNumber;
    this.fighterConfig = config;
    this.displayTint = tint;
    this.facing = playerNumber === 1 ? 1 : -1;
    this.stats = {
      health: config.maxHealth,
      mana: config.startMana,
      maxHealth: config.maxHealth,
      maxMana: config.maxMana,
      rage: 0,
    };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.weapon = scene.add.image(x, y - 22, `weapon-${config.id}`)
      .setOrigin(0.12, 0.5)
      .setTint(tint)
      .setDepth(11);
    this.setTint(tint);
    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(false);
    this.setDepth(10);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(40, 40).setOffset(2, 4);
    body.setMaxVelocity(620, 900);
  }

  get bodyRef(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  resetForRound(x: number, y: number, facing: -1 | 1): void {
    this.setPosition(x, y).setVelocity(0, 0).setAlpha(1).clearTint();
    this.setTint(this.displayTint);
    this.stats = {
      health: this.fighterConfig.maxHealth,
      mana: this.fighterConfig.startMana,
      maxHealth: this.fighterConfig.maxHealth,
      maxMana: this.fighterConfig.maxMana,
      rage: 0,
    };
    this.facing = facing;
    this.state = 'IDLE';
    this.currentAttack = undefined;
    this.controlEnabled = false;
    this.invulnerableUntil = 0;
    this.jumpBufferedUntil = 0;
    this.coyoteUntil = 0;
    this.bodyRef.enable = true;
    this.updateWeaponPose();
  }

  updateFighter(
    now: number,
    delta: number,
    opponentX: number,
    input: { left: boolean; right: boolean; jumpPressed: boolean },
  ): void {
    this.updateAttack(now);
    this.stats = regenerateMana(this.stats, this.fighterConfig.manaRegen, delta / 1000);

    if (this.state === 'KO') {
      this.updateWeaponPose();
      return;
    }
    if (now > this.invulnerableUntil && this.state === 'RESPAWN_INVULNERABLE') {
      this.state = 'FALL';
      this.setAlpha(1);
    } else if (this.state === 'RESPAWN_INVULNERABLE') {
      this.setAlpha(Math.floor(now / 90) % 2 === 0 ? 0.3 : 0.75);
    }
    if ((this.state === 'HITSTUN' || this.state === 'STUN') && now >= this.stateUntil) {
      this.state = this.bodyRef.blocked.down ? 'IDLE' : 'FALL';
    }

    if (!this.currentAttack && this.state !== 'HITSTUN' && this.state !== 'STUN') {
      this.facing = opponentX >= this.x ? 1 : -1;
    }
    this.setFlipX(this.facing < 0);

    const grounded = this.bodyRef.blocked.down || this.bodyRef.touching.down;
    if (grounded) this.coyoteUntil = now + 110;
    if (input.jumpPressed) this.jumpBufferedUntil = now + 140;
    const actionLocked = this.currentAttack || this.state === 'HITSTUN' || this.state === 'STUN';
    if (this.controlEnabled && !actionLocked && this.state !== 'RESPAWN_INVULNERABLE') {
      const speedScale = now < this.slowedUntil ? 0.75 : 1;
      const direction = Number(input.right) - Number(input.left);
      const acceleration = this.fighterConfig.moveSpeed * (grounded ? 7.6 : 4.4) * speedScale;
      this.setAccelerationX(direction * acceleration);
      this.setDragX(direction === 0 ? (grounded ? 1850 : 260) : 560);
      const maxMoveSpeed = this.fighterConfig.moveSpeed * speedScale;
      if (Math.abs(this.bodyRef.velocity.x) > maxMoveSpeed) {
        this.setVelocityX(Phaser.Math.Clamp(this.bodyRef.velocity.x, -maxMoveSpeed, maxMoveSpeed));
      }
      if (this.jumpBufferedUntil >= now && this.coyoteUntil >= now) {
        this.setVelocityY(-this.fighterConfig.jumpVelocity);
        this.jumpBufferedUntil = 0;
        this.coyoteUntil = 0;
        this.state = 'JUMP';
        this.emit('jump');
      } else if (grounded) {
        this.state = direction === 0 ? 'IDLE' : 'RUN';
      }
    } else if (actionLocked && this.currentAttack) {
      this.setAccelerationX(0);
      this.setDragX(grounded ? 1800 : 480);
      const lunge = this.currentAttack.phase === 'active'
        ? this.currentAttack.config.lungeVelocity ?? 0
        : 0;
      this.setVelocityX(this.currentAttack.direction * lunge);
    } else {
      this.setAccelerationX(0);
      this.setDragX(grounded ? 900 : 260);
    }

    if (!grounded && !this.currentAttack && this.state !== 'HITSTUN' && this.state !== 'STUN'
      && this.state !== 'RESPAWN_INVULNERABLE') {
      this.state = this.bodyRef.velocity.y < 0 ? 'JUMP' : 'FALL';
    }
    if (grounded && !this.lastGrounded && this.state === 'FALL') this.state = 'IDLE';
    this.lastGrounded = grounded;
    this.updatePose();
    this.updateWeaponPose();
  }

  tryAttack(kind: AttackKind, now: number): boolean {
    if (!this.controlEnabled || this.state === 'KO' || this.currentAttack
      || this.state === 'HITSTUN' || this.state === 'STUN'
      || this.state === 'RESPAWN_INVULNERABLE') return false;
    const base = kind === 'basic'
      ? this.fighterConfig.basicAttack
      : kind === 'skill'
        ? this.fighterConfig.skill
        : this.fighterConfig.ultimate;
    if (!canUseMana(this.stats, base.manaCost)) {
      this.manaFlashUntil = now + 420;
      this.emit('mana-empty');
      return false;
    }

    let config = base;
    if (kind === 'ultimate' && this.fighterConfig.id === 'fist') {
      config = { ...base, damage: punchRushDamage(this.stats.rage) };
      this.stats = consumeRage(this.stats);
    }
    this.stats = spendMana(this.stats, config.manaCost);
    this.currentAttack = {
      config,
      kind,
      startedAt: now,
      id: `${this.playerNumber}-${config.id}-${this.attackCounter += 1}`,
      phase: 'startup',
      direction: this.facing,
      hitTargets: new Set(),
    };
    this.state = kind === 'basic' ? 'ATTACK' : kind === 'skill' ? 'SKILL' : 'ULTIMATE';
    this.emit('attack-start', kind);
    return true;
  }

  private updateAttack(now: number): void {
    const attack = this.currentAttack;
    if (!attack) return;
    const elapsed = now - attack.startedAt;
    const activeEnd = attack.config.startupMs + attack.config.activeMs;
    const total = activeEnd + attack.config.recoveryMs;
    const nextPhase: AttackPhase = elapsed < attack.config.startupMs
      ? 'startup'
      : elapsed < activeEnd ? 'active' : 'recovery';
    if (attack.phase !== nextPhase) {
      attack.phase = nextPhase;
      if (nextPhase === 'active') this.emit('attack-active', attack.kind);
    }
    if (elapsed >= total) {
      this.currentAttack = undefined;
      this.state = this.bodyRef.blocked.down ? 'IDLE' : 'FALL';
      this.setScale(1);
      this.setAngle(0);
    }
  }

  getHitbox(): Phaser.Geom.Rectangle | null {
    const attack = this.currentAttack;
    if (!attack || attack.phase !== 'active') return null;
    const { config, direction } = attack;
    const centerX = this.x + config.hitboxOffsetX * direction;
    const centerY = this.y - 24 + config.hitboxOffsetY;
    return new Phaser.Geom.Rectangle(
      centerX - config.hitboxWidth / 2,
      centerY - config.hitboxHeight / 2,
      config.hitboxWidth,
      config.hitboxHeight,
    );
  }

  getHurtbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - 20, this.y - 40, 40, 40);
  }

  receiveHit(attacker: Fighter, now: number): boolean {
    const attack = attacker.currentAttack;
    if (!attack || attack.hitTargets.has(this.playerNumber) || now < this.invulnerableUntil) return false;
    attack.hitTargets.add(this.playerNumber);
    return this.receiveDamage(
      attack.config.damage,
      attack.config.hitstunMs,
      attack.config.knockbackX * attack.direction,
      attack.config.knockbackY,
      now,
      attacker,
      attack.kind,
    );
  }

  receiveBonusHit(
    damage: number,
    knockbackX: number,
    knockbackY: number,
    now: number,
    attacker: Fighter,
    stunMs = 160,
    attackKind?: AttackKind,
  ): boolean {
    if (now < this.invulnerableUntil || this.state === 'KO') return false;
    return this.receiveDamage(damage, stunMs, knockbackX, knockbackY, now, attacker, attackKind);
  }

  private receiveDamage(
    damage: number,
    hitstunMs: number,
    knockbackX: number,
    knockbackY: number,
    now: number,
    attacker: Fighter,
    attackKind?: AttackKind,
  ): boolean {
    this.stats = applyDamage(this.stats, damage);
    this.currentAttack = undefined;
    this.setVelocity(knockbackX, knockbackY);
    this.state = this.stats.health <= 0 ? 'KO' : 'HITSTUN';
    this.stateUntil = now + hitstunMs;
    if (this.state === 'KO') this.setVelocity(knockbackX * 1.2, Math.min(knockbackY, -300));
    if (attacker.fighterConfig.id === 'fist') {
      const gain = attackKind === 'skill' ? 2 : attackKind === 'basic' ? 1 : 0;
      attacker.stats = addRage(attacker.stats, gain);
      if (attackKind === 'skill') this.slowedUntil = now + 1200;
    }
    if (attacker.fighterConfig.id === 'clock' && attackKind === 'skill') {
      this.slowedUntil = now + 1800;
    }
    if (attacker.fighterConfig.id === 'plant' && attackKind === 'skill') {
      attacker.stats = {
        ...attacker.stats,
        health: Math.min(attacker.stats.maxHealth, attacker.stats.health + 4),
      };
    }
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(75, () => {
      if (this.active) {
        this.clearTint().setTint(this.displayTint);
      }
    });
    this.emit('damaged', damage, attacker);
    return true;
  }

  applyVoidFall(now: number): void {
    this.stats = applyDamage(this.stats, 15);
    if (this.stats.health <= 0) {
      this.state = 'KO';
      this.setPosition(640, 180).setVelocity(0, 0);
      return;
    }
    this.setPosition(this.playerNumber === 1 ? 580 : 700, 170).setVelocity(0, 0);
    this.invulnerableUntil = now + 1000;
    this.state = 'RESPAWN_INVULNERABLE';
  }

  private updatePose(): void {
    this.setAngle(0);
    if (this.currentAttack?.phase === 'startup') this.setScale(0.92, 1.06);
    else if (this.currentAttack?.phase === 'active') this.setScale(1.18, 0.94);
    else this.setScale(1);
  }

  private updateWeaponPose(): void {
    let angle = -24;
    let reach = 11;
    let vertical = -22;
    let weaponScale = 0.9;

    if (this.currentAttack) {
      const phase = this.currentAttack.phase;
      if (phase === 'startup') {
        angle = -72;
        reach = 7;
      } else if (phase === 'active') {
        angle = this.fighterConfig.id === 'minigun' ? -6 : 28;
        reach = this.fighterConfig.id === 'minigun' ? 7 : 18;
        weaponScale = 1.08;
      } else {
        angle = -5;
        reach = 13;
      }
      if (this.currentAttack.kind === 'ultimate') {
        weaponScale += 0.18;
        vertical -= 3;
      } else if (this.currentAttack.kind === 'skill') {
        angle += this.fighterConfig.id === 'clock' ? 70 : 12;
      }
    } else if (this.state === 'RUN') {
      angle = -17;
      vertical += Math.sin(this.scene.time.now / 70) * 2;
    } else if (this.state === 'JUMP') {
      angle = -42;
    } else if (this.state === 'FALL') {
      angle = 8;
    } else if (this.state === 'HITSTUN' || this.state === 'STUN') {
      angle = 58;
      reach = 5;
    }

    this.weapon
      .setPosition(this.x + this.facing * reach, this.y + vertical)
      .setRotation(Phaser.Math.DegToRad(angle * this.facing))
      .setScale(this.facing * weaponScale, weaponScale)
      .setAlpha(this.alpha)
      .setVisible(this.visible)
      .clearTint()
      .setTint(this.displayTint);
  }
}
