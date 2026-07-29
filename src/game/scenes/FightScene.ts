import Phaser from 'phaser';
import { fighters } from '../data/fighters';
import { voidPlatforms } from '../data/maps';
import type { AttackKind, MatchSettings, RoundResult } from '../data/types';
import { Fighter, type ActiveAttack } from '../entities/Fighter';
import { CombatSystem } from '../systems/CombatSystem';
import { determineRoundResult } from '../systems/CombatLogic';
import { InputController } from '../systems/InputController';
import { RoundManager } from '../systems/RoundManager';
import { SoundSystem } from '../systems/SoundSystem';
import { FightHUD } from '../ui/FightHUD';
import { addButton, fontBody, fontDisplay, fontTech, palette } from '../ui/ui';

export class FightScene extends Phaser.Scene {
  private settings!: MatchSettings;
  private p1!: Fighter;
  private p2!: Fighter;
  private inputs!: InputController;
  private combat!: CombatSystem;
  private rounds!: RoundManager;
  private hud!: FightHUD;
  private sounds!: SoundSystem;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private countdown?: Phaser.GameObjects.Text;
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private debugText!: Phaser.GameObjects.Text;
  private debugVisible = false;
  private roundEnding = false;
  private isPaused = false;
  private pauseObjects: Phaser.GameObjects.GameObject[] = [];
  private controlsBeforePause: [boolean, boolean] = [false, false];
  private debugHandler?: () => void;
  private escapeHandler?: () => void;

  constructor() { super('FightScene'); }

  create(): void {
    // Scene instances survive restart/start cycles in Phaser. These flags must
    // describe the new round, not the round that just finished.
    this.roundEnding = false;
    this.isPaused = false;
    this.debugVisible = false;
    this.pauseObjects = [];
    this.controlsBeforePause = [false, false];
    this.countdown = undefined;

    this.settings = this.registry.get('settings') as MatchSettings;
    this.drawArena();
    this.inputs = new InputController(this);
    this.sounds = new SoundSystem(this);
    this.rounds = new RoundManager(this.settings.mode);
    const resume = this.registry.get('resumeRounds') as
      | { round: number; p1Wins: number; p2Wins: number; history: RoundResult[] }
      | undefined;
    if (resume) {
      this.rounds.round = resume.round;
      this.rounds.p1Wins = resume.p1Wins;
      this.rounds.p2Wins = resume.p2Wins;
      this.rounds.history = [...resume.history];
      this.registry.remove('resumeRounds');
    }
    const p1Config = fighters[this.settings.p1];
    const p2Config = fighters[this.settings.p2];
    const same = this.settings.p1 === this.settings.p2;
    const p1Spawn = this.settings.map === 'void' ? { x: 190, y: 330 } : { x: 330, y: 500 };
    const p2Spawn = this.settings.map === 'void' ? { x: 1090, y: 330 } : { x: 950, y: 500 };
    this.p1 = new Fighter(this, p1Spawn.x, p1Spawn.y, p1Config, 1, p1Config.color);
    this.p2 = new Fighter(
      this,
      p2Spawn.x,
      p2Spawn.y,
      p2Config,
      2,
      same ? p2Config.alternateColor : p2Config.color,
    );
    if (this.settings.map === 'meadow') {
      this.p1.setCollideWorldBounds(true);
      this.p2.setCollideWorldBounds(true);
    }
    if (this.settings.map === 'void') {
      const oneWayPlatform: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
        fighterObject,
        platformObject,
      ) => {
        const fighter = fighterObject as Fighter;
        const platform = platformObject as Phaser.Types.Physics.Arcade.GameObjectWithBody;
        const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody;
        const previousBottom = fighter.bodyRef.prev.y + fighter.bodyRef.height;
        return fighter.bodyRef.velocity.y >= 0 && previousBottom <= platformBody.top + 14;
      };
      this.physics.add.collider(this.p1, this.platforms, undefined, oneWayPlatform);
      this.physics.add.collider(this.p2, this.platforms, undefined, oneWayPlatform);
    } else {
      this.physics.add.collider(this.p1, this.platforms);
      this.physics.add.collider(this.p2, this.platforms);
    }
    this.physics.add.collider(this.p1, this.p2);
    this.combat = new CombatSystem(
      this,
      (attacker, target, attack) => this.onHit(attacker, target, attack),
    );
    this.hud = new FightHUD(this, this.p1, this.p2);
    this.debugGraphics = this.add.graphics().setDepth(80);
    this.debugText = this.add.text(18, 145, '', {
      fontFamily: fontTech, fontSize: '13px', color: '#e9f5ff',
      backgroundColor: '#050711cc', padding: { x: 8, y: 6 },
    }).setDepth(81).setVisible(false);
    this.wireFighterEvents(this.p1);
    this.wireFighterEvents(this.p2);
    this.debugHandler = () => {
      this.debugVisible = !this.debugVisible;
      this.debugText.setVisible(this.debugVisible);
      if (!this.debugVisible) this.debugGraphics.clear();
    };
    this.escapeHandler = () => this.togglePause();
    this.input.keyboard?.on('keydown-F2', this.debugHandler);
    this.input.keyboard?.on('keydown-ESC', this.escapeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.debugHandler) this.input.keyboard?.off('keydown-F2', this.debugHandler);
      if (this.escapeHandler) this.input.keyboard?.off('keydown-ESC', this.escapeHandler);
      this.input.keyboard?.resetKeys();
    });
    this.startCountdown();
  }

  update(time: number, delta: number): void {
    if (this.isPaused) return;
    const p1Move = {
      left: this.inputs.p1.left.isDown,
      right: this.inputs.p1.right.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(this.inputs.p1.jump),
    };
    const p2Move = {
      left: this.inputs.p2.left.isDown,
      right: this.inputs.p2.right.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(this.inputs.p2.jump),
    };
    this.p1.updateFighter(time, delta, this.p2.x, p1Move);
    this.p2.updateFighter(time, delta, this.p1.x, p2Move);

    this.handleAttackInput(this.p1, this.inputs.p1, time);
    this.handleAttackInput(this.p2, this.inputs.p2, time);
    this.combat.update(time, [this.p1, this.p2]);

    if (this.settings.map === 'void') {
      this.checkVoidFall(this.p1, time);
      this.checkVoidFall(this.p2, time);
    }
    const result = determineRoundResult(this.p1.stats.health, this.p2.stats.health);
    if (result && !this.roundEnding) this.finishRound(result);
    this.hud.update(this.p1, this.p2, this.rounds, time);
    if (this.debugVisible) this.drawDebug();
  }

  private togglePause(): void {
    if (this.roundEnding) return;
    if (this.isPaused) {
      this.resumeFight();
      return;
    }
    this.isPaused = true;
    this.controlsBeforePause = [this.p1.controlEnabled, this.p2.controlEnabled];
    this.p1.controlEnabled = false;
    this.p2.controlEnabled = false;
    this.physics.world.pause();
    this.time.paused = true;
    this.tweens.pauseAll();

    const shade = this.add.rectangle(640, 360, 1280, 720, 0x03050d, 0.82).setDepth(200);
    const panel = this.add.rectangle(640, 350, 650, 520, 0x0b1127, 0.99)
      .setStrokeStyle(4, palette.cyan, 0.95).setDepth(201);
    const topBand = this.add.rectangle(640, 115, 646, 46, palette.blue, 0.95).setDepth(202);
    const title = this.add.text(640, 176, 'PAUSED', {
      fontFamily: fontTech, fontStyle: 'bold', fontSize: '52px', color: '#ffffff',
      stroke: '#091027', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(202);
    const subtitle = this.add.text(640, 224, 'ESC를 다시 누르면 전투로 돌아갑니다', {
      fontFamily: fontBody, fontSize: '16px', color: '#aebee8',
    }).setOrigin(0.5).setDepth(202);
    const resume = addButton(this, 640, 300, '계속하기', () => this.resumeFight(), 390).setDepth(203);
    const restart = addButton(this, 640, 380, '현재 라운드 다시 시작', () => {
      this.restoreRuntime();
      this.registry.set('resumeRounds', {
        round: this.rounds.round,
        p1Wins: this.rounds.p1Wins,
        p2Wins: this.rounds.p2Wins,
        history: [...this.rounds.history],
      });
      this.scene.restart();
    }, 390).setDepth(203);
    const select = addButton(this, 640, 460, '파이터 선택으로', () => {
      this.restoreRuntime();
      this.registry.remove('resumeRounds');
      this.scene.start('CharacterSelectScene');
    }, 390).setDepth(203);
    const menu = addButton(this, 640, 540, '메인 메뉴로', () => {
      this.restoreRuntime();
      this.registry.remove('resumeRounds');
      this.scene.start('TitleScene');
    }, 390).setDepth(203);
    this.pauseObjects = [shade, panel, topBand, title, subtitle, resume, restart, select, menu];
  }

  private resumeFight(): void {
    this.restoreRuntime();
    this.pauseObjects.forEach((object) => object.destroy());
    this.pauseObjects = [];
    this.isPaused = false;
    this.p1.controlEnabled = this.controlsBeforePause[0] && !this.roundEnding;
    this.p2.controlEnabled = this.controlsBeforePause[1] && !this.roundEnding;
    this.input.keyboard?.resetKeys();
  }

  private restoreRuntime(): void {
    this.time.paused = false;
    this.tweens.resumeAll();
    this.physics.world.resume();
  }

  private handleAttackInput(
    fighter: Fighter,
    input: { basic: Phaser.Input.Keyboard.Key; skill: Phaser.Input.Keyboard.Key; ultimate: Phaser.Input.Keyboard.Key },
    now: number,
  ): void {
    if (Phaser.Input.Keyboard.JustDown(input.basic)) fighter.tryAttack('basic', now);
    if (Phaser.Input.Keyboard.JustDown(input.skill)) fighter.tryAttack('skill', now);
    if (Phaser.Input.Keyboard.JustDown(input.ultimate)) fighter.tryAttack('ultimate', now);
  }

  private wireFighterEvents(fighter: Fighter): void {
    fighter.on('jump', () => this.sounds.play('jump'));
    fighter.on('attack-start', (kind: AttackKind) => {
      this.sounds.play(kind === 'basic' ? 'attack' : kind === 'skill' ? 'skill' : 'ultimate');
      if (kind === 'ultimate') this.ultimateIntro(fighter);
    });
    fighter.on('attack-active', (kind: AttackKind) => {
      this.attackVisual(fighter, kind);
      if (fighter.fighterConfig.id === 'sword' && kind === 'skill') this.spawnSwordShards(fighter);
    });
    fighter.on('mana-empty', () => {
      const label = this.add.text(fighter.x, fighter.y - 132, '마나 부족!', {
        fontFamily: fontBody, fontSize: '16px', fontStyle: 'bold', color: '#b878ff',
      }).setOrigin(0.5).setDepth(60);
      this.tweens.add({ targets: label, y: label.y - 28, alpha: 0, duration: 520, onComplete: () => label.destroy() });
    });
  }

  private onHit(attacker: Fighter, target: Fighter, attack: ActiveAttack): void {
    this.sounds.play('hit');
    this.cameras.main.shake(attack.config.hitstopMs + 25, attack.kind === 'ultimate' ? 0.008 : 0.0035);
    this.combat.showHitEffect(target.x, target.y - 48, attacker.fighterConfig.color);
    this.damageNumber(target.x, target.y - 105, attack.config.damage);

    if (attacker.fighterConfig.id === 'sword' && attack.kind === 'ultimate') {
      target.state = 'STUN';
      [110, 220, 330].forEach((delay, index) => {
        this.time.delayedCall(delay, () => {
          if (target.state === 'KO') return;
          const final = index === 2;
          const hit = target.receiveBonusHit(
            10,
            final ? attack.direction * 420 : 0,
            final ? -280 : 0,
            this.time.now,
            attacker,
            final ? 260 : 180,
            'ultimate',
          );
          if (hit) {
            this.damageNumber(target.x, target.y - 105, 10);
            this.slashLine(target.x, target.y - 50, attacker.fighterConfig.color, index);
            if (final) this.cameras.main.shake(150, 0.012);
          }
        });
      });
    } else if (attacker.fighterConfig.id === 'fist' && attack.kind === 'ultimate') {
      this.rushVisual(target, attacker.fighterConfig.color);
    }
  }

  private spawnSwordShards(attacker: Fighter): void {
    [1, 2, 3].forEach((step) => {
      this.time.delayedCall(step * 130, () => {
        if (!attacker.active) return;
        const x = attacker.x + attacker.facing * (90 + step * 75);
        const y = this.settings.map === 'void' ? 503 : 561;
        const shard = this.add.triangle(x, y, 0, 38, 18, 0, 36, 38, attacker.fighterConfig.color, 0.85)
          .setDepth(8).setScale(attacker.facing, 1);
        this.tweens.add({ targets: shard, y: y - 26, alpha: 0, duration: 280, onComplete: () => shard.destroy() });
        const target = attacker === this.p1 ? this.p2 : this.p1;
        const rect = new Phaser.Geom.Rectangle(x - 28, y - 75, 56, 80);
        if (Phaser.Geom.Intersects.RectangleToRectangle(rect, target.getHurtbox())) {
          if (target.receiveBonusHit(5, attacker.facing * 120, -90, this.time.now, attacker, 140)) {
            this.damageNumber(target.x, target.y - 100, 5);
          }
        }
      });
    });
  }

  private attackVisual(fighter: Fighter, kind: AttackKind): void {
    const color = fighter.fighterConfig.color;
    this.weaponTrail(fighter, kind);
    if (fighter.fighterConfig.id === 'sword') {
      const arc = this.add.arc(
        fighter.x + fighter.facing * 62, fighter.y - 50,
        kind === 'ultimate' ? 110 : 66, -70, 70, false, color, 0.65,
      ).setStrokeStyle(kind === 'ultimate' ? 13 : 7, 0xffffff, 0.72).setDepth(15);
      arc.setScale(fighter.facing, 1);
      this.tweens.add({ targets: arc, alpha: 0, scaleX: fighter.facing * 1.35, duration: 190, onComplete: () => arc.destroy() });
      return;
    }
    if (fighter.fighterConfig.id === 'fist') {
      const fist = this.add.circle(
        fighter.x + fighter.facing * 58, fighter.y - (kind === 'skill' ? 88 : 50),
        kind === 'ultimate' ? 40 : 27, color, 0.75,
      ).setStrokeStyle(5, 0xffffff, 0.7).setDepth(15);
      this.tweens.add({ targets: fist, scale: 1.7, alpha: 0, duration: 170, onComplete: () => fist.destroy() });
      return;
    }
    if (fighter.fighterConfig.id === 'minigun') {
      const reinforced = kind === 'basic' && (fighter.currentAttack?.config.damage ?? 0) > 6;
      const count = kind === 'ultimate' ? 9 : kind === 'skill' ? 6 : reinforced ? 6 : 4;
      for (let index = 0; index < count; index += 1) {
        const bullet = this.add.rectangle(
          fighter.x + fighter.facing * (70 + index * 34),
          fighter.y - 53 + (index % 2) * 8,
          kind === 'ultimate' ? 30 : 20,
          7,
          index % 2 ? 0xffffff : color,
          0.9,
        ).setDepth(16);
        this.tweens.add({
          targets: bullet,
          x: bullet.x + fighter.facing * 95,
          alpha: 0,
          duration: 150 + index * 12,
          onComplete: () => bullet.destroy(),
        });
      }
      return;
    }
    if (fighter.fighterConfig.id === 'clock') {
      const ring = this.add.circle(
        fighter.x + fighter.facing * 80,
        fighter.y - 55,
        kind === 'ultimate' ? 120 : kind === 'skill' ? 72 : 40,
        color,
        0.16,
      ).setStrokeStyle(kind === 'ultimate' ? 10 : 6, color, 0.9).setDepth(16);
      const hand = this.add.rectangle(ring.x, ring.y, ring.radius * 1.45, 6, 0xffffff, 0.85)
        .setOrigin(0, 0.5).setRotation(-0.7).setDepth(17);
      this.tweens.add({
        targets: [ring, hand],
        rotation: 1.7,
        scale: 1.35,
        alpha: 0,
        duration: 260,
        onComplete: () => { ring.destroy(); hand.destroy(); },
      });
      return;
    }
    if (fighter.fighterConfig.id === 'plant') {
      const count = kind === 'ultimate' ? 7 : kind === 'skill' ? 4 : 2;
      for (let index = 0; index < count; index += 1) {
        const leaf = this.add.ellipse(
          fighter.x + fighter.facing * (58 + index * 34),
          fighter.y - 35 - (index % 3) * 24,
          34,
          18,
          index % 2 ? 0xbaff79 : color,
          0.85,
        ).setRotation(fighter.facing * (0.4 + index * 0.12)).setDepth(16);
        this.tweens.add({
          targets: leaf,
          y: leaf.y - 45,
          angle: leaf.angle + fighter.facing * 80,
          alpha: 0,
          duration: 230 + index * 25,
          onComplete: () => leaf.destroy(),
        });
      }
      return;
    }
    const size = kind === 'ultimate' ? 76 : kind === 'skill' ? 52 : 34;
    const rock = this.add.polygon(
      fighter.x + fighter.facing * 68,
      fighter.y - 53,
      [0, -size / 2, size * 0.46, -size * 0.2, size / 2, size * 0.3, 0, size / 2, -size * 0.5, size * 0.2],
      color,
      0.9,
    ).setStrokeStyle(5, 0xffffff, 0.5).setDepth(16);
    this.tweens.add({
      targets: rock,
      x: rock.x + fighter.facing * (kind === 'ultimate' ? 180 : 75),
      rotation: fighter.facing * 1.2,
      scale: 1.3,
      alpha: 0,
      duration: 230,
      onComplete: () => rock.destroy(),
    });
  }

  private weaponTrail(fighter: Fighter, kind: AttackKind): void {
    const color = fighter.fighterConfig.color;
    const strength = kind === 'ultimate' ? 1.45 : kind === 'skill' ? 1.2 : 1;
    const isRanged = fighter.fighterConfig.id === 'minigun';
    const count = isRanged ? 2 : 4;
    for (let index = 0; index < count; index += 1) {
      const progress = index / Math.max(1, count - 1);
      const ghost = this.add.image(
        fighter.x + fighter.facing * (12 + progress * 25),
        fighter.y - 25 - progress * 5,
        `weapon-${fighter.fighterConfig.id}`,
      )
        .setOrigin(0.12, 0.5)
        .setTint(index % 2 ? color : 0xffffff)
        .setAlpha(0.22 + progress * 0.18)
        .setDepth(14)
        .setRotation(fighter.facing * (-1.05 + progress * 1.25))
        .setScale(fighter.facing * (0.75 + progress * 0.18) * strength, (0.75 + progress * 0.18) * strength);
      this.tweens.add({
        targets: ghost,
        x: ghost.x + fighter.facing * (isRanged ? 28 : 48),
        rotation: ghost.rotation + fighter.facing * (isRanged ? 0.08 : 0.55),
        alpha: 0,
        scaleY: ghost.scaleY * 1.15,
        duration: 120 + index * 24,
        onComplete: () => ghost.destroy(),
      });
    }

    const flashX = fighter.x + fighter.facing * (isRanged ? 78 : 58);
    const flashY = fighter.y - (fighter.fighterConfig.id === 'fist' && kind === 'skill' ? 82 : 48);
    const flash = this.add.star(
      flashX,
      flashY,
      kind === 'ultimate' ? 10 : 7,
      kind === 'ultimate' ? 14 : 8,
      kind === 'ultimate' ? 42 : 25,
      color,
      0.8,
    ).setStrokeStyle(3, 0xffffff, 0.75).setDepth(18);
    this.tweens.add({
      targets: flash,
      scale: 1.7,
      rotation: fighter.facing * 0.6,
      alpha: 0,
      duration: kind === 'ultimate' ? 240 : 150,
      onComplete: () => flash.destroy(),
    });
  }

  private ultimateIntro(fighter: Fighter): void {
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x02030a, 0.72).setDepth(40);
    const line = this.add.text(640, 338, fighter.fighterConfig.ultimate.name, {
      fontFamily: fontDisplay, fontStyle: 'bold', fontSize: '50px', color: '#ffffff',
      stroke: Phaser.Display.Color.IntegerToColor(fighter.fighterConfig.color).rgba,
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(41);
    this.tweens.add({ targets: [shade, line], alpha: 0, delay: 170, duration: 240, onComplete: () => { shade.destroy(); line.destroy(); } });
  }

  private rushVisual(target: Fighter, color: number): void {
    for (let i = 0; i < 7; i += 1) {
      this.time.delayedCall(i * 45, () => {
        const burst = this.add.circle(
          target.x + Phaser.Math.Between(-38, 38),
          target.y - Phaser.Math.Between(25, 82),
          Phaser.Math.Between(10, 23), color, 0.75,
        ).setDepth(20);
        this.tweens.add({ targets: burst, scale: 1.8, alpha: 0, duration: 150, onComplete: () => burst.destroy() });
      });
    }
  }

  private slashLine(x: number, y: number, color: number, index: number): void {
    const line = this.add.rectangle(x, y, 150, 8, color, 0.85)
      .setRotation(index % 2 === 0 ? -0.5 : 0.5).setDepth(21);
    this.tweens.add({ targets: line, scaleX: 1.6, alpha: 0, duration: 130, onComplete: () => line.destroy() });
  }

  private damageNumber(x: number, y: number, damage: number): void {
    const text = this.add.text(x, y, `-${damage}`, {
      fontFamily: fontTech, fontStyle: 'bold', fontSize: '24px', color: '#fff3a6',
      stroke: '#6b1320', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(70);
    this.tweens.add({ targets: text, y: y - 52, alpha: 0, duration: 650, ease: 'Cubic.Out', onComplete: () => text.destroy() });
  }

  private checkVoidFall(fighter: Fighter, now: number): void {
    if (fighter.y < 790 || fighter.state === 'KO' || fighter.state === 'RESPAWN_INVULNERABLE') return;
    fighter.applyVoidFall(now);
    this.cameras.main.shake(120, 0.008);
    this.damageNumber(fighter.x, 190, 15);
  }

  private startCountdown(): void {
    this.p1.controlEnabled = false;
    this.p2.controlEnabled = false;
    this.countdown?.destroy();
    this.countdown = this.add.text(640, 300, '3', {
      fontFamily: fontTech, fontStyle: 'bold', fontSize: '112px', color: '#ffffff',
      stroke: '#192044', strokeThickness: 12,
    }).setOrigin(0.5).setDepth(90);
    const steps = ['3', '2', '1', 'FIGHT!'];
    steps.forEach((step, index) => {
      this.time.delayedCall(index * 650, () => {
        this.countdown?.setText(step).setScale(step === 'FIGHT!' ? 0.72 : 1).setAlpha(1);
        this.tweens.add({ targets: this.countdown, scale: step === 'FIGHT!' ? 0.95 : 1.3, alpha: 0.2, duration: 520 });
        this.sounds.play('round');
      });
    });
    this.time.delayedCall(steps.length * 650, () => {
      this.countdown?.destroy();
      this.countdown = undefined;
      this.p1.controlEnabled = true;
      this.p2.controlEnabled = true;
    });
  }

  private finishRound(result: RoundResult): void {
    this.roundEnding = true;
    this.p1.controlEnabled = false;
    this.p2.controlEnabled = false;
    this.sounds.play('ko');
    const label = result === 'draw' ? 'DOUBLE KO · DRAW' : `${result === 'p1' ? '1P' : '2P'}  K.O.`;
    this.add.text(640, 300, label, {
      fontFamily: fontTech, fontStyle: 'bold', fontSize: '72px', color: '#ffffff',
      stroke: '#7e1b39', strokeThickness: 12,
    }).setOrigin(0.5).setDepth(100);
    const outcome = this.rounds.record(result);
    this.time.delayedCall(1900, () => {
      if (outcome.matchOver) {
        this.registry.set('result', {
          winner: outcome.winner,
          history: [...this.rounds.history],
          p1Wins: this.rounds.p1Wins,
          p2Wins: this.rounds.p2Wins,
        });
        this.scene.start('ResultScene');
        return;
      }
      this.registry.set('resumeRounds', {
        round: this.rounds.round,
        p1Wins: this.rounds.p1Wins,
        p2Wins: this.rounds.p2Wins,
        history: this.rounds.history,
      });
      this.scene.restart();
    });
  }

  private drawArena(): void {
    if (this.settings.map === 'meadow') {
      this.cameras.main.setBackgroundColor(0x4ba7d1);
      const g = this.add.graphics();
      g.fillGradientStyle(0x3896c7, 0x3896c7, 0xa5e7ee, 0xdff7e6, 1).fillRect(0, 0, 1280, 560);
      g.fillStyle(0xfff3b1, 0.18).fillCircle(1050, 132, 88);
      g.fillStyle(0xfff3b1).fillCircle(1050, 132, 50);
      g.lineStyle(3, 0xffffff, 0.35).strokeCircle(1050, 132, 64);
      g.fillStyle(0x5d91a2, 0.45).fillTriangle(0, 500, 260, 210, 535, 500);
      g.fillStyle(0x4d8297, 0.4).fillTriangle(360, 500, 650, 180, 940, 500);
      g.fillStyle(0x5b94a3, 0.36).fillTriangle(790, 500, 1070, 240, 1280, 500);
      g.fillStyle(0x8fd6a1).fillEllipse(210, 520, 700, 270).fillEllipse(980, 520, 820, 300);
      g.fillStyle(0x66b982, 0.9).fillEllipse(590, 555, 680, 215);
      g.lineStyle(3, 0xd9fff2, 0.45)
        .beginPath().arc(240, 480, 330, 3.55, 5.75).strokePath()
        .beginPath().arc(945, 490, 390, 3.45, 5.85).strokePath();
      [
        [180, 155, 150], [510, 115, 110], [820, 190, 125],
      ].forEach(([x, y, width]) => {
        g.fillStyle(0xffffff, 0.56)
          .fillEllipse(x, y, width, 34)
          .fillCircle(x - width * 0.18, y - 12, 25)
          .fillCircle(x + width * 0.08, y - 17, 31);
      });
      for (let index = 0; index < 24; index += 1) {
        const x = 30 + index * 54;
        const height = 10 + (index % 4) * 5;
        g.lineStyle(2, index % 3 === 0 ? 0xb9ff8f : 0x74d891, 0.55)
          .lineBetween(x, 544, x + (index % 2 ? 5 : -5), 544 - height);
      }
      this.platforms = this.physics.add.staticGroup();
      const ground = this.platforms.create(640, 620, 'pixel') as Phaser.Physics.Arcade.Sprite;
      ground.setDisplaySize(1280, 160).setTint(0x246847).refreshBody();
      this.add.rectangle(640, 542, 1280, 10, 0x8dea83, 1);
      this.add.rectangle(640, 550, 1280, 6, 0x3c9e66, 1);
      for (let x = 18; x < 1280; x += 52) {
        this.add.polygon(x, 585, [0, -18, 20, -10, 26, 12, 5, 22, -15, 8], 0x1c573e, 0.34);
      }
      this.physics.world.setBounds(24, 0, 1232, 720);
      return;
    }
    this.cameras.main.setBackgroundColor(0x070516);
    const stars = this.add.graphics();
    stars.fillGradientStyle(0x050318, 0x110827, 0x1e0d3d, 0x050718, 1).fillRect(0, 0, 1280, 720);
    stars.fillStyle(0x8d4dff, 0.09).fillEllipse(280, 380, 620, 390);
    stars.fillStyle(0x3de7ff, 0.07).fillEllipse(1020, 280, 520, 310);
    stars.lineStyle(3, 0x9b78ff, 0.18).strokeEllipse(1030, 170, 300, 95);
    stars.fillStyle(0x261b52, 0.9).fillCircle(1030, 170, 74);
    stars.fillStyle(0x534589, 0.45).fillCircle(1005, 145, 16);
    for (let i = 0; i < 85; i += 1) {
      stars.fillStyle(i % 4 === 0 ? 0xa884ff : 0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
      stars.fillCircle(Phaser.Math.Between(0, 1280), Phaser.Math.Between(110, 650), Phaser.Math.Between(1, 3));
    }
    for (let index = 0; index < 12; index += 1) {
      const shard = this.add.polygon(
        35 + (index * 127) % 1210,
        170 + (index * 83) % 470,
        [0, -14, 8, 0, 0, 25, -7, 1],
        index % 2 ? 0x5f46a0 : 0x226f88,
        0.24,
      ).setRotation(index * 0.37);
      this.tweens.add({
        targets: shard,
        y: shard.y - 14,
        rotation: shard.rotation + 0.5,
        duration: 1800 + index * 130,
        yoyo: true,
        repeat: -1,
      });
    }
    this.platforms = this.physics.add.staticGroup();
    voidPlatforms.forEach((platform) => {
      this.addPlatform(
        platform.x,
        platform.y,
        platform.width,
        platform.height,
        platform.tint,
      );
    });
    this.add.rectangle(640, 355, 64, 5, 0x75e8ff, 0.25);
    this.add.rectangle(430, 530, 86, 4, 0xb499ff, 0.22).setRotation(-0.12);
    this.add.rectangle(850, 530, 86, 4, 0xb499ff, 0.22).setRotation(0.12);
    this.physics.world.setBounds(-220, 0, 1720, 900);
  }

  private addPlatform(x: number, y: number, width: number, height: number, tint: number): void {
    this.add.polygon(
      x,
      y + height / 2 + 14,
      [-width / 2 + 8, -14, width / 2 - 8, -14, width / 2 - 28, 18, -width / 2 + 28, 18],
      0x110c2c,
      0.9,
    ).setStrokeStyle(2, 0x6f55a8, 0.5);
    const platform = this.platforms.create(x, y, 'pixel') as Phaser.Physics.Arcade.Sprite;
    platform.setDisplaySize(width, height).setTint(tint).refreshBody();
    this.add.rectangle(x, y - height / 2 + 3, width - 8, 6, 0xb9a4ff, 0.92);
    this.add.rectangle(x, y + height / 2 - 5, width - 28, 3, 0x33285c, 0.9);
    [x - width / 2 + 22, x + width / 2 - 22].forEach((lightX) => {
      const light = this.add.circle(lightX, y, 4, 0x75e8ff, 0.9);
      this.tweens.add({ targets: light, alpha: 0.25, duration: 680, yoyo: true, repeat: -1 });
    });
  }

  private drawDebug(): void {
    this.debugGraphics.clear();
    [this.p1, this.p2].forEach((fighter, index) => {
      const hurt = fighter.getHurtbox();
      this.debugGraphics.lineStyle(2, index === 0 ? 0x55e8ff : 0xffb55e, 1).strokeRectShape(hurt);
      const hit = fighter.getHitbox();
      if (hit) this.debugGraphics.fillStyle(0xff315b, 0.25).fillRectShape(hit).lineStyle(2, 0xff315b).strokeRectShape(hit);
      this.debugGraphics.lineStyle(2, 0xffffff, 0.7)
        .lineBetween(fighter.x, fighter.y - 45, fighter.x + fighter.bodyRef.velocity.x * 0.16, fighter.y - 45 + fighter.bodyRef.velocity.y * 0.16);
    });
    const line = (fighter: Fighter) => {
      const attack = fighter.currentAttack;
      return `${fighter.playerNumber}P ${fighter.state}  HP:${fighter.stats.health.toFixed(0)} MP:${fighter.stats.mana.toFixed(0)} R:${fighter.stats.rage}\n` +
        `ATK:${attack?.config.id ?? '-'} PHASE:${attack?.phase ?? '-'}  V:${fighter.bodyRef.velocity.x.toFixed(0)},${fighter.bodyRef.velocity.y.toFixed(0)}`;
    };
    this.debugText.setText(`${line(this.p1)}\n\n${line(this.p2)}`);
  }
}
