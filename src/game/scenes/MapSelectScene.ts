import Phaser from 'phaser';
import { maps } from '../data/maps';
import type { MapId, MatchSettings } from '../data/types';
import { addBackdrop, addButton, addTitle, palette } from '../ui/ui';

export class MapSelectScene extends Phaser.Scene {
  private keyboardHandler?: (event: KeyboardEvent) => void;

  constructor() { super('MapSelectScene'); }

  create(): void {
    addBackdrop(this, 0x17365d);
    addTitle(this, '전장 선택', 'CHOOSE THE BATTLEFIELD · 숫자키 1–2 선택');
    this.mapCard(350, 'meadow', 1);
    this.mapCard(930, 'void', 2);
    addButton(this, 640, 650, '← 파이터 선택으로', () => this.scene.start('CharacterSelectScene'), 290);
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.scene.start('CharacterSelectScene');
      if (event.key === '1') this.choose('meadow');
      if (event.key === '2') this.choose('void');
    };
    this.input.keyboard?.on('keydown', this.keyboardHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyboardHandler) this.input.keyboard?.off('keydown', this.keyboardHandler);
    });
  }

  private mapCard(x: number, id: MapId, number: number): void {
    const map = maps[id];
    const shadow = this.add.rectangle(7, 9, 500, 420, 0x000000, 0.34);
    const panel = this.add.rectangle(0, 0, 500, 420, 0x10172f, 0.98)
      .setStrokeStyle(3, map.color);
    const numberBadge = this.add.text(-215, -178, String(number), {
      fontFamily: 'Arial Black, sans-serif', fontSize: '20px', color: '#081020',
      backgroundColor: '#ffffff', padding: { x: 8, y: 3 },
    }).setOrigin(0.5);
    const preview = this.add.rectangle(0, -78, 430, 230, id === 'meadow' ? 0x75d6ef : 0x08081d)
      .setStrokeStyle(2, 0x93a8de, 0.55);
    const previewObjects: Phaser.GameObjects.GameObject[] = [shadow, panel, numberBadge, preview];

    if (id === 'meadow') {
      previewObjects.push(
        this.add.circle(145, -145, 31, 0xfff3b0),
        this.add.ellipse(-112, -28, 270, 100, 0x8fda86),
        this.add.ellipse(108, -25, 300, 108, 0x72c779),
        this.add.rectangle(0, 13, 430, 48, 0x3f965c),
      );
    } else {
      const stars = [
        this.add.circle(-155, -148, 3, 0xffffff),
        this.add.circle(120, -128, 2, 0xb893ff),
        this.add.circle(175, -55, 3, 0xffffff),
        this.add.circle(-80, -48, 2, 0x75e8ff),
      ];
      const platforms = [
        this.add.rectangle(0, -135, 240, 16, 0x7772ad).setStrokeStyle(3, 0x101020),
        this.add.rectangle(-146, -67, 105, 14, 0x555287).setStrokeStyle(3, 0x101020),
        this.add.rectangle(146, -67, 105, 14, 0x555287).setStrokeStyle(3, 0x101020),
        this.add.rectangle(0, -12, 130, 15, 0x625e98).setStrokeStyle(3, 0x101020),
        this.add.rectangle(-142, 35, 100, 13, 0x454371).setStrokeStyle(3, 0x101020),
        this.add.rectangle(142, 35, 100, 13, 0x454371).setStrokeStyle(3, 0x101020),
      ];
      previewObjects.push(...stars, ...platforms);
    }

    const name = this.add.text(0, 83, map.name, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '30px', color: '#ffffff',
    }).setOrigin(0.5);
    const description = this.add.text(0, 137, map.description, {
      fontSize: '17px', color: '#bdc7ee', align: 'center', wordWrap: { width: 410 },
    }).setOrigin(0.5);
    const select = this.add.text(0, 184, 'SELECT', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '14px', color: '#89ebff',
      letterSpacing: 3,
    }).setOrigin(0.5);
    previewObjects.push(name, description, select);
    const container = this.add.container(x, 382, previewObjects).setSize(500, 420).setInteractive();
    container.on('pointerover', () => {
      panel.setFillStyle(0x19254a).setStrokeStyle(4, palette.cyan, 1);
      container.setScale(1.025);
    });
    container.on('pointerout', () => {
      panel.setFillStyle(0x10172f).setStrokeStyle(3, map.color, 1);
      container.setScale(1);
    });
    container.on('pointerdown', () => this.choose(id));
  }

  private choose(id: MapId): void {
    const settings = this.registry.get('settings') as MatchSettings;
    this.registry.set('settings', { ...settings, map: id });
    this.scene.start('FightScene');
  }
}
