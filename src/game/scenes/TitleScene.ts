import Phaser from 'phaser';
import { addBackdrop, addButton } from '../ui/ui';

export class TitleScene extends Phaser.Scene {
  private help?: Phaser.GameObjects.Container;

  constructor() { super('TitleScene'); }

  create(): void {
    addBackdrop(this, 0x173b56);
    this.add.text(640, 186, 'WFZ', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '124px', color: '#f6f8ff',
      stroke: '#13243d', strokeThickness: 14,
    }).setOrigin(0.5);
    this.add.text(640, 276, 'WEAPON FIGHTERS Z', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '31px', color: '#65dcff',
      letterSpacing: 8,
    }).setOrigin(0.5);
    this.add.text(640, 324, 'LOCAL 2 PLAYER BATTLE', {
      fontSize: '17px', color: '#b9c3e9', letterSpacing: 4,
    }).setOrigin(0.5);

    addButton(this, 640, 440, '게임 시작', () => this.scene.start('ModeSelectScene'));
    addButton(this, 640, 524, '조작 방법', () => this.toggleHelp());
    this.add.text(640, 650, '하나의 키보드 · 두 명의 파이터 · 오직 한 명의 승자', {
      fontSize: '16px', color: '#7782aa',
    }).setOrigin(0.5);
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('ModeSelectScene'));
  }

  private toggleHelp(): void {
    if (this.help) {
      this.help.destroy(true);
      this.help = undefined;
      return;
    }
    const panel = this.add.rectangle(0, 0, 820, 430, 0x080b17, 0.98)
      .setStrokeStyle(3, 0x56d6ff);
    const title = this.add.text(0, -165, '조작 방법', {
      fontSize: '30px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    const controls = this.add.text(0, -35,
      '1P  이동 A / D   점프 W   기본 F   스킬 G   필살기 H\n\n' +
      '2P  이동 ← / →   점프 ↑   기본 J   스킬 K   필살기 L\n\n' +
      'F2  전투 판정과 상태 디버그 표시\n\n클릭하거나 ESC를 눌러 닫기',
      { fontSize: '21px', color: '#cad4ff', align: 'center', lineSpacing: 8 },
    ).setOrigin(0.5);
    this.help = this.add.container(640, 360, [panel, title, controls]).setDepth(20)
      .setSize(820, 430).setInteractive();
    this.help.once('pointerdown', () => this.toggleHelp());
    this.input.keyboard?.once('keydown-ESC', () => this.toggleHelp());
  }
}
