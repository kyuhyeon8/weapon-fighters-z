import Phaser from 'phaser';
import { fighters } from '../data/fighters';
import type { FighterId, MatchSettings } from '../data/types';
import { addBackdrop, addButton, addPanel, addTitle, palette } from '../ui/ui';

const fighterOrder: FighterId[] = ['sword', 'fist', 'minigun', 'clock', 'plant', 'rock'];

export class CharacterSelectScene extends Phaser.Scene {
  private selecting: 1 | 2 = 1;
  private p1: FighterId = 'sword';
  private status!: Phaser.GameObjects.Text;
  private previewAvatar!: Phaser.GameObjects.Image;
  private previewName!: Phaser.GameObjects.Text;
  private previewStyle!: Phaser.GameObjects.Text;
  private previewMoves!: Phaser.GameObjects.Text;
  private readonly cardFrames = new Map<FighterId, Phaser.GameObjects.Rectangle>();
  private readonly cardBadges = new Map<FighterId, Phaser.GameObjects.Text>();
  private keyboardHandler?: (event: KeyboardEvent) => void;

  constructor() { super('CharacterSelectScene'); }

  create(): void {
    addBackdrop(this, 0x1b315d);
    addTitle(this, '파이터 선택', 'CHOOSE YOUR WEAPON · 숫자키 1–6 선택');

    this.add.rectangle(245, 154, 370, 54, 0x1379c8, 0.95)
      .setStrokeStyle(2, palette.cyan, 0.9);
    this.add.rectangle(1035, 154, 370, 54, 0xb44368, 0.95)
      .setStrokeStyle(2, 0xff8fad, 0.9);
    this.add.text(86, 154, '1P', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '29px', color: '#ffffff',
    }).setOrigin(0, 0.5);
    this.add.text(1194, 154, '2P', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '29px', color: '#ffffff',
    }).setOrigin(1, 0.5);
    this.status = this.add.text(640, 154, '1P SELECT', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '20px', color: '#8feaff',
      backgroundColor: '#071027', padding: { x: 18, y: 8 },
    }).setOrigin(0.5);

    fighterOrder.forEach((id, index) => {
      const x = 130 + (index % 3) * 190;
      const y = 284 + Math.floor(index / 3) * 178;
      this.card(x, y, id, index + 1);
    });

    addPanel(this, 940, 390, 520, 404, palette.cyan);
    this.add.text(940, 215, 'FIGHTER DATA', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '16px', color: '#73e8ff',
      letterSpacing: 4,
    }).setOrigin(0.5);
    this.previewAvatar = this.add.image(745, 320, 'fighter-sword')
      .setTint(fighters.sword.color).setScale(1.25);
    this.previewName = this.add.text(840, 275, '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '34px', color: '#ffffff',
    });
    this.previewStyle = this.add.text(840, 324, '', {
      fontSize: '17px', color: '#aebee8', wordWrap: { width: 325 },
    });
    this.previewMoves = this.add.text(710, 392, '', {
      fontSize: '16px', color: '#e8edff', lineSpacing: 10, wordWrap: { width: 465 },
    });
    this.showPreview('sword');

    addButton(this, 640, 650, '← 승부 방식으로', () => this.scene.start('ModeSelectScene'), 270);
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.scene.start('ModeSelectScene');
        return;
      }
      const index = Number(event.key) - 1;
      if (index >= 0 && index < fighterOrder.length) this.choose(fighterOrder[index]);
    };
    this.input.keyboard?.on('keydown', this.keyboardHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyboardHandler) this.input.keyboard?.off('keydown', this.keyboardHandler);
    });
  }

  private card(x: number, y: number, id: FighterId, number: number): void {
    const fighter = fighters[id];
    const shadow = this.add.rectangle(5, 6, 170, 150, 0x000000, 0.32);
    const panel = this.add.rectangle(0, 0, 170, 150, 0x111934, 0.98)
      .setStrokeStyle(3, 0x52699f, 0.85);
    const top = this.add.rectangle(0, -64, 168, 20, fighter.color, 0.9);
    const avatar = this.add.image(0, -19, `fighter-${id}`).setTint(fighter.color).setScale(0.66);
    const name = this.add.text(0, 52, fighter.name, {
      fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    const numberBadge = this.add.text(-72, -63, String(number), {
      fontFamily: 'Arial Black, sans-serif', fontSize: '13px', color: '#081020',
      backgroundColor: '#ffffff', padding: { x: 5, y: 2 },
    }).setOrigin(0.5);
    const selectedBadge = this.add.text(68, -63, '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5);
    this.cardFrames.set(id, panel);
    this.cardBadges.set(id, selectedBadge);
    const container = this.add.container(x, y, [shadow, panel, top, avatar, name, numberBadge, selectedBadge])
      .setSize(170, 150).setInteractive();
    container.on('pointerover', () => {
      panel.setFillStyle(0x1c2952).setStrokeStyle(4, fighter.color, 1);
      container.setScale(1.035);
      this.showPreview(id);
    });
    container.on('pointerout', () => {
      panel.setFillStyle(0x111934);
      if (this.p1 !== id || this.selecting === 1) panel.setStrokeStyle(3, 0x52699f, 0.85);
      container.setScale(1);
    });
    container.on('pointerdown', () => this.choose(id));
  }

  private showPreview(id: FighterId): void {
    const fighter = fighters[id];
    this.previewAvatar?.setTexture(`fighter-${id}`).setTint(fighter.color);
    this.previewName?.setText(fighter.name);
    this.previewStyle?.setText(fighter.style);
    this.previewMoves?.setText(
      `기본  ${fighter.descriptions.basic}\n` +
      `스킬  ${fighter.descriptions.skill}  · MP ${fighter.skill.manaCost}\n` +
      `필살  ${fighter.descriptions.ultimate}  · MP ${fighter.ultimate.manaCost}`,
    );
  }

  private choose(id: FighterId): void {
    this.showPreview(id);
    if (this.selecting === 1) {
      this.p1 = id;
      this.selecting = 2;
      this.cardBadges.forEach((badge) => badge.setText(''));
      this.cardBadges.get(id)?.setText('1P');
      this.cardFrames.get(id)?.setStrokeStyle(4, palette.cyan, 1);
      this.status.setText('2P SELECT').setColor('#ff9fbc');
      return;
    }
    this.cardBadges.get(id)?.setText(id === this.p1 ? '1P·2P' : '2P');
    const settings = this.registry.get('settings') as MatchSettings;
    this.registry.set('settings', { ...settings, p1: this.p1, p2: id });
    this.scene.start('MapSelectScene');
  }
}
