import Phaser from 'phaser';
import type { GameMode, MatchSettings } from '../data/types';
import { addBackdrop, addButton, addTitle } from '../ui/ui';

export class ModeSelectScene extends Phaser.Scene {
  constructor() { super('ModeSelectScene'); }

  create(): void {
    addBackdrop(this, 0x34265b);
    addTitle(this, '승부 방식 선택', 'HOW WILL YOU SETTLE THIS?');
    const choose = (mode: GameMode) => {
      const settings = this.registry.get('settings') as MatchSettings;
      this.registry.set('settings', { ...settings, mode });
      this.scene.start('CharacterSelectScene');
    };
    addButton(this, 640, 300, '한 판 승부', () => choose('single'), 440);
    this.add.text(640, 348, '단 한 번의 KO로 승부를 결정합니다.', {
      fontSize: '16px', color: '#aab2d4',
    }).setOrigin(0.5);
    addButton(this, 640, 450, '3판 2선승', () => choose('bestOf3'), 440);
    this.add.text(640, 498, '먼저 두 라운드를 가져가면 최종 승리합니다.', {
      fontSize: '16px', color: '#aab2d4',
    }).setOrigin(0.5);
    addButton(this, 640, 620, '← 돌아가기', () => this.scene.start('TitleScene'), 240);
  }
}
