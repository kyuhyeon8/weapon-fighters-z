import Phaser from 'phaser';
import type { FighterId } from '../data/types';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create(): void {
    const fighterIds: FighterId[] = ['sword', 'fist', 'minigun', 'clock', 'plant', 'rock'];
    fighterIds.forEach((id) => this.createFighterTexture(id));
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 32, 32);
    g.generateTexture('pixel', 32, 32);
    g.destroy();
    this.registry.set('settings', {
      mode: 'single', p1: 'sword', p2: 'fist', map: 'meadow',
    });
    this.scene.start('TitleScene');
  }

  private createFighterTexture(id: FighterId): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.lineStyle(4, 0x111426, 1);
    g.fillStyle(0xffffff);
    g.fillCircle(37, 18, 14).strokeCircle(37, 18, 14);
    g.fillRoundedRect(20, 31, 34, 49, 9).strokeRoundedRect(20, 31, 34, 49, 9);
    g.fillRoundedRect(16, 76, 17, 30, 7).strokeRoundedRect(16, 76, 17, 30, 7);
    g.fillRoundedRect(41, 76, 17, 30, 7).strokeRoundedRect(41, 76, 17, 30, 7);

    if (id === 'sword') {
      g.fillStyle(0xe7f8ff).fillTriangle(59, 26, 69, 1, 72, 32).strokeTriangle(59, 26, 69, 1, 72, 32);
      g.fillStyle(0xffffff).fillRect(53, 28, 18, 7).strokeRect(53, 28, 18, 7);
    } else if (id === 'fist') {
      g.fillStyle(0xffffff).fillCircle(13, 49, 12).strokeCircle(13, 49, 12);
      g.fillCircle(61, 49, 12).strokeCircle(61, 49, 12);
    } else if (id === 'minigun') {
      g.fillStyle(0xffffff).fillRoundedRect(47, 42, 26, 14, 4).strokeRoundedRect(47, 42, 26, 14, 4);
      g.fillRect(54, 56, 8, 13).strokeRect(54, 56, 8, 13);
      g.fillRect(67, 44, 7, 4).fillRect(67, 50, 7, 4);
    } else if (id === 'clock') {
      g.fillStyle(0xffffff).fillCircle(60, 48, 14).strokeCircle(60, 48, 14);
      g.lineStyle(3, 0x111426).lineBetween(60, 48, 60, 38).lineBetween(60, 48, 68, 52);
    } else if (id === 'plant') {
      g.fillStyle(0xffffff).fillRoundedRect(48, 42, 22, 18, 5).strokeRoundedRect(48, 42, 22, 18, 5);
      g.fillTriangle(46, 45, 36, 39, 48, 53).strokeTriangle(46, 45, 36, 39, 48, 53);
      g.fillCircle(65, 36, 5).strokeCircle(65, 36, 5);
    } else {
      g.fillStyle(0xffffff).fillCircle(61, 49, 16).strokeCircle(61, 49, 16);
      g.lineStyle(2, 0x111426).lineBetween(52, 43, 66, 54).lineBetween(58, 36, 62, 58);
    }
    g.generateTexture(`fighter-${id}`, 76, 108);
    g.destroy();
  }
}
