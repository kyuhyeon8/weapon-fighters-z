import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff);
    g.fillRoundedRect(0, 0, 54, 96, 14);
    g.generateTexture('fighter', 54, 96);
    g.clear();
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 32, 32);
    g.generateTexture('pixel', 32, 32);
    g.destroy();
    this.registry.set('settings', {
      mode: 'single', p1: 'sword', p2: 'fist', map: 'meadow',
    });
    this.scene.start('TitleScene');
  }
}
