import Phaser from 'phaser';
import type { RoundResult } from '../data/types';
import { addBackdrop, addButton } from '../ui/ui';

interface MatchResult {
  winner: RoundResult;
  history: RoundResult[];
  p1Wins: number;
  p2Wins: number;
}

export class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }

  create(): void {
    addBackdrop(this, 0x42224c);
    const result = this.registry.get('result') as MatchResult;
    const title = result.winner === 'draw' ? '무승부' : `${result.winner === 'p1' ? '1P' : '2P'} 승리`;
    this.add.text(640, 125, 'BATTLE RESULT', {
      fontSize: '19px', color: '#ffcf6e', letterSpacing: 7,
    }).setOrigin(0.5);
    this.add.text(640, 215, title, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '72px', color: '#ffffff',
      stroke: '#20102a', strokeThickness: 12,
    }).setOrigin(0.5);
    const history = result.history.map((round, index) => {
      const label = round === 'draw' ? '무승부' : `${round === 'p1' ? '1P' : '2P'} 승`;
      return `ROUND ${index + 1}  ${label}`;
    }).join('   ·   ');
    this.add.text(640, 290, history, {
      fontSize: '18px', color: '#bdc7ee', align: 'center', wordWrap: { width: 950 },
    }).setOrigin(0.5);
    addButton(this, 640, 395, '재대결', () => {
      this.registry.remove('resumeRounds');
      this.scene.start('FightScene');
    });
    addButton(this, 640, 478, '캐릭터 선택으로', () => this.scene.start('CharacterSelectScene'));
    addButton(this, 640, 561, '메인 메뉴로', () => this.scene.start('TitleScene'));
  }
}
