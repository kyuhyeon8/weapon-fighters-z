import Phaser from 'phaser';
import { fighters } from '../data/fighters';
import type { FighterId, MatchSettings } from '../data/types';
import { addBackdrop, addButton, addTitle } from '../ui/ui';

export class CharacterSelectScene extends Phaser.Scene {
  private selecting: 1 | 2 = 1;
  private p1: FighterId = 'sword';
  private status!: Phaser.GameObjects.Text;

  constructor() { super('CharacterSelectScene'); }

  create(): void {
    addBackdrop(this, 0x23385f);
    addTitle(this, '파이터 선택', '같은 파이터도 선택할 수 있습니다');
    this.status = this.add.text(640, 158, '1P가 파이터를 선택하세요', {
      fontSize: '23px', fontStyle: 'bold', color: '#56d6ff',
    }).setOrigin(0.5);
    this.card(350, 'sword');
    this.card(930, 'fist');
    addButton(this, 640, 650, '← 돌아가기', () => this.scene.start('ModeSelectScene'), 240);
  }

  private card(x: number, id: FighterId): void {
    const fighter = fighters[id];
    const panel = this.add.rectangle(0, 0, 470, 420, 0x10152a, 0.96)
      .setStrokeStyle(3, fighter.color);
    const avatar = this.add.rectangle(0, -128, 76, 126, fighter.color).setStrokeStyle(5, 0xffffff, 0.7);
    const weapon = id === 'sword'
      ? this.add.rectangle(48, -150, 10, 130, 0xe8f8ff).setRotation(-0.45)
      : this.add.circle(43, -120, 27, 0xffd2c7);
    const name = this.add.text(0, -32, fighter.name, {
      fontSize: '32px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    const details = this.add.text(-195, 18,
      `${fighter.style}\n\n평타  ${fighter.descriptions.basic}\n스킬  ${fighter.descriptions.skill}\n필살  ${fighter.descriptions.ultimate}`,
      { fontSize: '17px', color: '#bdc7ee', wordWrap: { width: 390 }, lineSpacing: 9 },
    );
    const container = this.add.container(x, 390, [panel, avatar, weapon, name, details])
      .setSize(470, 420).setInteractive();
    container.on('pointerover', () => container.setScale(1.02));
    container.on('pointerout', () => container.setScale(1));
    container.on('pointerdown', () => this.choose(id));
  }

  private choose(id: FighterId): void {
    if (this.selecting === 1) {
      this.p1 = id;
      this.selecting = 2;
      this.status.setText(`1P: ${fighters[id].name}  ·  2P가 선택하세요`).setColor('#ffb16b');
      return;
    }
    const settings = this.registry.get('settings') as MatchSettings;
    this.registry.set('settings', { ...settings, p1: this.p1, p2: id });
    this.scene.start('MapSelectScene');
  }
}
