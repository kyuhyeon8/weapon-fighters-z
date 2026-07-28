import Phaser from 'phaser';
import { maps } from '../data/maps';
import type { MapId, MatchSettings } from '../data/types';
import { addBackdrop, addButton, addTitle } from '../ui/ui';

export class MapSelectScene extends Phaser.Scene {
  constructor() { super('MapSelectScene'); }

  create(): void {
    addBackdrop(this, 0x20395c);
    addTitle(this, '전장 선택', 'WHERE WILL YOU FIGHT?');
    this.mapCard(360, 'meadow');
    this.mapCard(920, 'void');
    addButton(this, 640, 645, '← 파이터 선택으로', () => this.scene.start('CharacterSelectScene'), 280);
  }

  private mapCard(x: number, id: MapId): void {
    const map = maps[id];
    const panel = this.add.rectangle(0, 0, 470, 380, 0x10152a, 0.97)
      .setStrokeStyle(3, map.color);
    const preview = this.add.rectangle(0, -75, 390, 175, id === 'meadow' ? 0x78c9e8 : 0x09071b);
    const ground = this.add.rectangle(0, -8, id === 'meadow' ? 390 : 260, 40, map.color);
    const name = this.add.text(0, 52, map.name, {
      fontSize: '29px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    const description = this.add.text(0, 112, map.description, {
      fontSize: '18px', color: '#bdc7ee', align: 'center', wordWrap: { width: 390 },
    }).setOrigin(0.5);
    const container = this.add.container(x, 382, [panel, preview, ground, name, description])
      .setSize(470, 380).setInteractive();
    container.on('pointerover', () => container.setScale(1.02));
    container.on('pointerout', () => container.setScale(1));
    container.on('pointerdown', () => {
      const settings = this.registry.get('settings') as MatchSettings;
      this.registry.set('settings', { ...settings, map: id });
      this.scene.start('FightScene');
    });
  }
}
