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

interface ActiveAttack {
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
  private readonly displayTint: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: FighterConfig,
    playerNumber: 1 | 2,
    tint: number,
  ) {
    super(scene, x, y, 'fighter');
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
    this.setTint(tint);
    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(config.id === 'sword');
    this.setDepth(10);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(48, 92).setOffset(3, 4);
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
    this.bodyRef.enable = true;
  }

  updateFighter(
    now: number,
    delta: number,
    opponentX: number,
    input: { left: boolean; right: boolean; jumpPressed: boolean },
  ): void {
    this.updateAttack(now);
    this.stats = regenerateMana(this.stats, this.fighterConfig.manaRegen, delta / 1000);

    if (this.state === 'KO') return;
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
    const actionLocked = this.currentAttack || this.state === 'HITSTUN' || this.state === 'STUN';
    if (this.controlEnabled && !actionLocked && this.state !== 'RESPAWN_INVULNERABLE') {
      const speedScale = now < this.slowedUntil ? 0.75 : 1;
      const direction = Number(input.right) - Number(input.left);
      this.setVelocityX(direction * this.fighterConfig.moveSpeed * speedScale);
      if (input.jumpPressed && grounded) {
        this.setVelocityY(-this.fighterConfig.jumpVelocity);
        this.state = 'JUMP';
        this.emit('jump');
      } else if (grounded) {
        this.state = direction === 0 ? 'IDLE' : 'RUN';
      }
    } else if (actionLocked && this.currentAttack) {
      this.setVelocityX(this.currentAttack.kind === 'ultimate' && this.fighterConfig.id === 'fist'
        ? this.currentAttack.direction * 150
        : 0);
    }

    if (!grounded && !this.currentAttack && this.state !== 'HITSTUN' && this.state !== 'STUN'
      && this.state !== 'RESPAWN_INVULNERABLE') {
      this.state = this.bodyRef.velocity.y < 0 ? 'JUMP' : 'FALL';
    }
    if (grounded && !this.lastGrounded && this.state === 'FALL') this.state = 'IDLE';
    this.lastGrounded = grounded;
    this.updatePose();
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
    const centerY = this.y - 48 + config.hitboxOffsetY;
    return new Phaser.Geom.Rectangle(
      centerX - config.hitboxWidth / 2,
      centerY - config.hitboxHeight / 2,
      config.hitboxWidth,
      config.hitboxHeight,
    );
  }

  getHurtbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - 24, this.y - 92, 48, 92);
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
    );
  }

  receiveBonusHit(
    damage: number,
    knockbackX: number,
    knockbackY: number,
    now: number,
    attacker: Fighter,
    stunMs = 160,
  ): boolean {
    if (now < this.invulnerableUntil || this.state === 'KO') return false;
    return this.receiveDamage(damage, stunMs, knockbackX, knockbackY, now, attacker);
  }

  private receiveDamage(
    damage: number,
    hitstunMs: number,
    knockbackX: number,
    knockbackY: number,
    now: number,
    attacker: Fighter,
  ): boolean {
    this.stats = applyDamage(this.stats, damage);
    this.currentAttack = undefined;
    this.setVelocity(knockbackX, knockbackY);
    this.state = this.stats.health <= 0 ? 'KO' : 'HITSTUN';
    this.stateUntil = now + hitstunMs;
    if (this.state === 'KO') this.setVelocity(knockbackX * 1.2, Math.min(knockbackY, -300));
    if (attacker.fighterConfig.id === 'fist') {
      const gain = attacker.currentAttack?.kind === 'skill' ? 2
        : attacker.currentAttack?.kind === 'basic' ? 1 : 0;
      attacker.stats = addRage(attacker.stats, gain);
      if (attacker.currentAttack?.kind === 'skill') this.slowedUntil = now + 1200;
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
    if (this.state === 'RUN') this.setAngle(this.facing * 5);
    else if (this.state === 'JUMP') this.setAngle(this.facing * -8);
    else if (this.state === 'FALL') this.setAngle(this.facing * 8);
    else if (this.currentAttack?.phase === 'startup') this.setScale(0.92, 1.06);
    else if (this.currentAttack?.phase === 'active') this.setScale(1.18, 0.94);
    else this.setScale(1).setAngle(0);
  }
}
