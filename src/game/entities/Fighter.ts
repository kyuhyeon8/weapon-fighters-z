import Phaser from 'phaser';
import { combatTuning } from '../config/combatTuning';
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
  private basicAttackCounter = 0;
  private lastGrounded = false;
  private jumpBufferedUntil = 0;
  private coyoteUntil = 0;
  private bufferedAttack?: { kind: AttackKind; expiresAt: number };
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
    this.bufferedAttack = undefined;
    this.slowedUntil = 0;
    this.basicAttackCounter = 0;
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
    if (this.bufferedAttack && now > this.bufferedAttack.expiresAt) {
      this.bufferedAttack = undefined;
    }
    if (this.bufferedAttack && this.canStartAttack()) {
      const { kind } = this.bufferedAttack;
      this.bufferedAttack = undefined;
      this.startAttack(kind, now);
    }

    if (!this.currentAttack && this.state !== 'HITSTUN' && this.state !== 'STUN') {
      this.facing = opponentX >= this.x ? 1 : -1;
    }
    this.setFlipX(this.facing < 0);

    const grounded = this.bodyRef.blocked.down || this.bodyRef.touching.down;
    if (grounded) this.coyoteUntil = now + combatTuning.coyoteMs;
    if (input.jumpPressed) this.jumpBufferedUntil = now + combatTuning.jumpBufferMs;
    const actionLocked = this.currentAttack || this.state === 'HITSTUN' || this.state === 'STUN';
    if (this.controlEnabled && !actionLocked && this.state !== 'RESPAWN_INVULNERABLE') {
      const speedScale = now < this.slowedUntil ? combatTuning.slowMoveScale : 1;
      const direction = Number(input.right) - Number(input.left);
      const acceleration = this.fighterConfig.moveSpeed
        * (grounded ? combatTuning.groundAcceleration : combatTuning.airAcceleration)
        * speedScale;
      this.setAccelerationX(direction * acceleration);
      this.setDragX(direction === 0
        ? (grounded ? combatTuning.groundBraking : combatTuning.airBraking)
        : combatTuning.activeMoveDrag);
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
      this.setDragX(grounded ? combatTuning.attackGroundDrag : combatTuning.attackAirDrag);
      const lunge = this.currentAttack.phase === 'active'
        ? this.currentAttack.config.lungeVelocity ?? 0
        : 0;
      this.setVelocityX(this.currentAttack.direction * lunge);
    } else {
      this.setAccelerationX(0);
      this.setDragX(grounded ? combatTuning.hitGroundDrag : combatTuning.hitAirDrag);
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
    if (!this.controlEnabled || this.state === 'KO' || this.state === 'RESPAWN_INVULNERABLE') {
      return false;
    }
    if (!this.canStartAttack()) {
      this.bufferedAttack = { kind, expiresAt: now + combatTuning.attackBufferMs };
      return false;
    }
    return this.startAttack(kind, now);
  }

  private canStartAttack(): boolean {
    return !this.currentAttack && this.state !== 'HITSTUN' && this.state !== 'STUN';
  }

  private startAttack(kind: AttackKind, now: number): boolean {
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
    if (kind === 'basic' && this.fighterConfig.id === 'minigun') {
      this.basicAttackCounter += 1;
      if (this.basicAttackCounter % 3 === 0) {
        config = {
          ...base,
          name: '강화 6점사',
          damage: 9,
          hitstunMs: 170,
          knockbackX: 145,
          hitstopMs: 42,
        };
      }
    }
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
    if (!attack) return false;
    return this.receiveAttackSnapshot(attacker, attack, now);
  }

  receiveAttackSnapshot(attacker: Fighter, attack: ActiveAttack, now: number): boolean {
    if (attack.hitTargets.has(this.playerNumber) || now < this.invulnerableUntil) return false;
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
    this.bufferedAttack = undefined;
    this.setVelocity(knockbackX, knockbackY);
    this.state = this.stats.health <= 0 ? 'KO' : 'HITSTUN';
    this.stateUntil = now + hitstunMs;
    if (this.state === 'KO') this.setVelocity(knockbackX * 1.2, Math.min(knockbackY, -300));
    if (attacker.fighterConfig.id === 'fist') {
      const gain = attackKind === 'skill' ? 2 : attackKind === 'basic' ? 1 : 0;
      attacker.stats = addRage(attacker.stats, gain);
      if (attackKind === 'skill') this.slowedUntil = now + 1000;
    }
    if (attacker.fighterConfig.id === 'clock' && attackKind === 'skill') {
      this.slowedUntil = now + 1600;
    }
    if (attacker.fighterConfig.id === 'plant' && attackKind === 'skill') {
      attacker.stats = {
        ...attacker.stats,
        health: Math.min(attacker.stats.maxHealth, attacker.stats.health + 5),
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
    this.stats = applyDamage(this.stats, combatTuning.voidFallDamage);
    if (this.stats.health <= 0) {
      this.state = 'KO';
      this.setPosition(640, 180).setVelocity(0, 0);
      return;
    }
    this.setPosition(this.playerNumber === 1 ? 580 : 700, 170).setVelocity(0, 0);
    this.invulnerableUntil = now + combatTuning.voidRespawnInvulnerabilityMs;
    this.state = 'RESPAWN_INVULNERABLE';
  }

  private updatePose(): void {
    this.setAngle(0);
    if (this.currentAttack?.phase === 'startup') this.setScale(0.92, 1.06);
    else if (this.currentAttack?.phase === 'active') this.setScale(1.18, 0.94);
    else this.setScale(1);
  }

  private updateWeaponPose(): void {
    const id = this.fighterConfig.id;
    const idleAngles = { sword: -28, fist: -8, minigun: -4, clock: -18, plant: -20, rock: -34 };
    const idleReach = { sword: 10, fist: 9, minigun: 7, clock: 9, plant: 9, rock: 8 };
    let angle = idleAngles[id];
    let reach = idleReach[id];
    let vertical = id === 'minigun' ? -25 : -23;
    let weaponScale = id === 'rock' ? 0.94 : id === 'fist' ? 0.84 : 0.88;

    if (this.currentAttack) {
      const phase = this.currentAttack.phase;
      if (phase === 'startup') {
        const windup = { sword: -112, fist: -48, minigun: -12, clock: -105, plant: -82, rock: -128 };
        angle = windup[id];
        reach = id === 'minigun' ? 4 : 1;
        vertical -= id === 'fist' ? 8 : 2;
        weaponScale *= 0.94;
      } else if (phase === 'active') {
        const swing = { sword: 32, fist: 4, minigun: -2, clock: 82, plant: 26, rock: 44 };
        angle = swing[id];
        reach = id === 'minigun' ? 10 : id === 'fist' ? 20 : 22;
        weaponScale *= this.currentAttack.kind === 'ultimate' ? 1.34 : 1.18;
      } else {
        const followThrough = { sword: 72, fist: 22, minigun: 5, clock: 132, plant: 58, rock: 88 };
        angle = followThrough[id];
        reach = id === 'minigun' ? 7 : 15;
      }
      if (this.currentAttack.kind === 'ultimate') {
        weaponScale += 0.16;
        vertical -= 3;
      } else if (this.currentAttack.kind === 'skill') {
        angle += id === 'clock' ? 22 : id === 'rock' ? 8 : 12;
      }
    } else if (this.state === 'RUN') {
      angle += Math.sin(this.scene.time.now / 85) * 7;
      vertical += Math.sin(this.scene.time.now / 70) * 3;
      reach += Math.sin(this.scene.time.now / 85) * 2;
    } else if (this.state === 'JUMP') {
      angle -= 28;
    } else if (this.state === 'FALL') {
      angle += 30;
    } else if (this.state === 'HITSTUN' || this.state === 'STUN') {
      angle = 68;
      reach = 2;
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
