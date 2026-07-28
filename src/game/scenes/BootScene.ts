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
    const outline = 0x080b12;
    g.lineStyle(6, outline, 1);
    g.fillStyle(0xffffff);
    g.fillCircle(38, 45, 28).strokeCircle(38, 45, 28);
    g.lineStyle(3, 0xffffff, 0.34);
    g.beginPath().arc(31, 38, 17, 3.55, 5.15).strokePath();
    g.lineStyle(5, outline, 1);

    if (id === 'sword') {
      g.fillStyle(0xffffff);
      g.fillTriangle(48, 51, 94, 10, 61, 55).strokeTriangle(48, 51, 94, 10, 61, 55);
      g.fillStyle(0xffffff).fillRect(46, 49, 20, 8).strokeRect(46, 49, 20, 8);
      g.lineStyle(7, outline).lineBetween(51, 55, 43, 64);
    } else if (id === 'fist') {
      g.fillStyle(0xffffff);
      g.fillCircle(67, 38, 12).strokeCircle(67, 38, 12);
      g.fillCircle(77, 45, 12).strokeCircle(77, 45, 12);
      g.fillCircle(67, 54, 12).strokeCircle(67, 54, 12);
      g.fillRoundedRect(57, 45, 26, 19, 8).strokeRoundedRect(57, 45, 26, 19, 8);
    } else if (id === 'minigun') {
      g.fillStyle(0xffffff).fillRoundedRect(54, 32, 27, 23, 6).strokeRoundedRect(54, 32, 27, 23, 6);
      g.fillRect(76, 34, 20, 5).strokeRect(76, 34, 20, 5);
      g.fillRect(76, 47, 20, 5).strokeRect(76, 47, 20, 5);
      g.fillRect(61, 52, 9, 16).strokeRect(61, 52, 9, 16);
    } else if (id === 'clock') {
      g.fillStyle(0xffffff).fillCircle(71, 45, 20).strokeCircle(71, 45, 20);
      g.lineStyle(4, outline).lineBetween(71, 45, 71, 31).lineBetween(71, 45, 82, 51);
      g.fillStyle(outline).fillCircle(71, 45, 4);
      g.lineStyle(4, outline).strokeCircle(71, 45, 13);
    } else if (id === 'plant') {
      g.fillStyle(0xffffff).fillRoundedRect(55, 38, 27, 23, 7).strokeRoundedRect(55, 38, 27, 23, 7);
      g.fillTriangle(56, 42, 42, 34, 56, 53).strokeTriangle(56, 42, 42, 34, 56, 53);
      g.lineStyle(5, outline).beginPath().arc(70, 38, 13, 3.4, 6.05).strokePath();
      g.fillStyle(0xffffff).fillCircle(91, 31, 5).strokeCircle(91, 31, 5);
    } else {
      g.fillStyle(0xffffff);
      g.fillTriangle(53, 59, 62, 27, 83, 21).strokeTriangle(53, 59, 62, 27, 83, 21);
      g.fillTriangle(53, 59, 83, 21, 94, 52).strokeTriangle(53, 59, 83, 21, 94, 52);
      g.lineStyle(4, outline).lineBetween(66, 31, 74, 44).lineBetween(74, 44, 87, 39);
    }
    g.generateTexture(`fighter-${id}`, 100, 78);
    g.destroy();
  }
}
