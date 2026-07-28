import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { RoundManager } from '../systems/RoundManager';

export class FightHUD {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly center: Phaser.GameObjects.Text;
  private readonly p1Rage: Phaser.GameObjects.Text;
  private readonly p2Rage: Phaser.GameObjects.Text;
  private p1Trail = 100;
  private p2Trail = 100;

  constructor(scene: Phaser.Scene, p1: Fighter, p2: Fighter) {
    this.graphics = scene.add.graphics().setDepth(50);
    scene.add.text(42, 24, `1P  ${p1.fighterConfig.name}`, {
      fontSize: '21px', fontStyle: 'bold', color: '#ffffff',
    }).setDepth(51);
    scene.add.text(1238, 24, `${p2.fighterConfig.name}  2P`, {
      fontSize: '21px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(1, 0).setDepth(51);
    this.center = scene.add.text(640, 24, '', {
      fontSize: '20px', fontStyle: 'bold', color: '#ffffff', align: 'center',
    }).setOrigin(0.5, 0).setDepth(51);
    this.p1Rage = scene.add.text(42, 107, '', {
      fontSize: '15px', fontStyle: 'bold', color: '#ffbe4f',
    }).setDepth(51);
    this.p2Rage = scene.add.text(1238, 107, '', {
      fontSize: '15px', fontStyle: 'bold', color: '#ffbe4f',
    }).setOrigin(1, 0).setDepth(51);
  }

  update(p1: Fighter, p2: Fighter, rounds: RoundManager, now: number): void {
    this.p1Trail = Phaser.Math.Linear(this.p1Trail, p1.stats.health, 0.06);
    this.p2Trail = Phaser.Math.Linear(this.p2Trail, p2.stats.health, 0.06);
    this.graphics.clear();
    this.drawBars(42, 57, p1.stats.health, this.p1Trail, p1.stats.mana, p1.manaFlashUntil > now, false);
    this.drawBars(1238, 57, p2.stats.health, this.p2Trail, p2.stats.mana, p2.manaFlashUntil > now, true);
    this.center.setText(
      `ROUND ${rounds.round}\n${rounds.mode === 'bestOf3' ? `${rounds.p1Wins}  —  ${rounds.p2Wins}` : 'FINAL ROUND'}`,
    );
    this.p1Rage.setText(p1.fighterConfig.id === 'fist' ? `투지 ${'◆'.repeat(p1.stats.rage)}${'◇'.repeat(4 - p1.stats.rage)}` : '');
    this.p2Rage.setText(p2.fighterConfig.id === 'fist' ? `투지 ${'◆'.repeat(p2.stats.rage)}${'◇'.repeat(4 - p2.stats.rage)}` : '');
  }

  private drawBars(
    x: number,
    y: number,
    health: number,
    trail: number,
    mana: number,
    manaFlash: boolean,
    reverse: boolean,
  ): void {
    const width = 430;
    const origin = reverse ? x - width : x;
    this.graphics.fillStyle(0x070916, 0.9).fillRoundedRect(origin - 4, y - 4, width + 8, 30, 6);
    this.graphics.fillStyle(0xffa44f, 0.55)
      .fillRect(reverse ? x - width * trail / 100 : x, y, width * trail / 100, 22);
    this.graphics.fillStyle(health > 35 ? 0x55e28c : 0xff5b62)
      .fillRect(reverse ? x - width * health / 100 : x, y, width * health / 100, 22);
    this.graphics.fillStyle(0x080b18).fillRoundedRect(origin, y + 32, width, 13, 4);
    this.graphics.fillStyle(manaFlash ? 0xffffff : mana >= 60 ? 0xb06cff : 0x4ba8ff)
      .fillRoundedRect(reverse ? x - width * mana / 100 : x, y + 32, width * mana / 100, 13, 4);
  }
}
