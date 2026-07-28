import Phaser from 'phaser';
import { fighters } from '../data/fighters';
import type { AttackKind, MatchSettings, RoundResult } from '../data/types';
import { Fighter } from '../entities/Fighter';
import { CombatSystem } from '../systems/CombatSystem';
import { determineRoundResult } from '../systems/CombatLogic';
import { InputController } from '../systems/InputController';
import { RoundManager } from '../systems/RoundManager';
import { SoundSystem } from '../systems/SoundSystem';
import { FightHUD } from '../ui/FightHUD';

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

  constructor() { super('FightScene'); }

  create(): void {
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
    this.p1 = new Fighter(this, 330, 500, p1Config, 1, p1Config.color);
    this.p2 = new Fighter(this, 950, 500, p2Config, 2, same ? p2Config.alternateColor : p2Config.color);
    if (this.settings.map === 'meadow') {
      this.p1.setCollideWorldBounds(true);
      this.p2.setCollideWorldBounds(true);
    }
    this.physics.add.collider(this.p1, this.platforms);
    this.physics.add.collider(this.p2, this.platforms);
    this.physics.add.collider(this.p1, this.p2);
    this.combat = new CombatSystem(this, (attacker, target) => this.onHit(attacker, target));
    this.hud = new FightHUD(this, this.p1, this.p2);
    this.debugGraphics = this.add.graphics().setDepth(80);
    this.debugText = this.add.text(18, 145, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#e9f5ff',
      backgroundColor: '#050711cc', padding: { x: 8, y: 6 },
    }).setDepth(81).setVisible(false);
    this.wireFighterEvents(this.p1);
    this.wireFighterEvents(this.p2);
    this.input.keyboard?.on('keydown-F2', () => {
      this.debugVisible = !this.debugVisible;
      this.debugText.setVisible(this.debugVisible);
      if (!this.debugVisible) this.debugGraphics.clear();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.removeAllListeners());
    this.startCountdown();
  }

  update(time: number, delta: number): void {
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
        fontSize: '17px', fontStyle: 'bold', color: '#b878ff',
      }).setOrigin(0.5).setDepth(60);
      this.tweens.add({ targets: label, y: label.y - 28, alpha: 0, duration: 520, onComplete: () => label.destroy() });
    });
  }

  private onHit(attacker: Fighter, target: Fighter): void {
    const attack = attacker.currentAttack;
    if (!attack) return;
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
    if (fighter.fighterConfig.id === 'sword') {
      const arc = this.add.arc(
        fighter.x + fighter.facing * 62, fighter.y - 50,
        kind === 'ultimate' ? 110 : 66, -70, 70, false, color, 0.65,
      ).setStrokeStyle(kind === 'ultimate' ? 13 : 7, 0xffffff, 0.72).setDepth(15);
      arc.setScale(fighter.facing, 1);
      this.tweens.add({ targets: arc, alpha: 0, scaleX: fighter.facing * 1.35, duration: 190, onComplete: () => arc.destroy() });
    } else {
      const fist = this.add.circle(
        fighter.x + fighter.facing * 58, fighter.y - (kind === 'skill' ? 88 : 50),
        kind === 'ultimate' ? 40 : 27, color, 0.75,
      ).setStrokeStyle(5, 0xffffff, 0.7).setDepth(15);
      this.tweens.add({ targets: fist, scale: 1.7, alpha: 0, duration: 170, onComplete: () => fist.destroy() });
    }
  }

  private ultimateIntro(fighter: Fighter): void {
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x02030a, 0.72).setDepth(40);
    const line = this.add.text(640, 338, fighter.fighterConfig.ultimate.name, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '54px', color: '#ffffff',
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
      fontFamily: 'Arial Black, sans-serif', fontSize: '26px', color: '#fff3a6',
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
      fontFamily: 'Arial Black, sans-serif', fontSize: '118px', color: '#ffffff',
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
      fontFamily: 'Arial Black, sans-serif', fontSize: '78px', color: '#ffffff',
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
      this.cameras.main.setBackgroundColor(0x7cc7e8);
      const g = this.add.graphics();
      g.fillStyle(0xcfeeff).fillCircle(1050, 125, 54);
      g.fillStyle(0x91d78b).fillEllipse(240, 520, 650, 260).fillEllipse(960, 520, 780, 290);
      this.platforms = this.physics.add.staticGroup();
      const ground = this.platforms.create(640, 620, 'pixel') as Phaser.Physics.Arcade.Sprite;
      ground.setDisplaySize(1280, 160).setTint(0x3c8959).refreshBody();
      this.physics.world.setBounds(24, 0, 1232, 720);
      return;
    }
    this.cameras.main.setBackgroundColor(0x070516);
    const stars = this.add.graphics();
    for (let i = 0; i < 85; i += 1) {
      stars.fillStyle(i % 4 === 0 ? 0xa884ff : 0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
      stars.fillCircle(Phaser.Math.Between(0, 1280), Phaser.Math.Between(110, 650), Phaser.Math.Between(1, 3));
    }
    this.platforms = this.physics.add.staticGroup();
    this.addPlatform(640, 570, 670, 44, 0x6649a6);
    this.addPlatform(230, 430, 260, 32, 0x4e397f);
    this.addPlatform(1050, 390, 260, 32, 0x4e397f);
    this.physics.world.setBounds(-200, 0, 1680, 1000);
  }

  private addPlatform(x: number, y: number, width: number, height: number, tint: number): void {
    const platform = this.platforms.create(x, y, 'pixel') as Phaser.Physics.Arcade.Sprite;
    platform.setDisplaySize(width, height).setTint(tint).refreshBody();
    this.add.rectangle(x, y - 8, width, 4, 0xb499ff, 0.8);
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
