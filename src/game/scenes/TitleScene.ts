import Phaser from 'phaser';
import { addBackdrop, addButton, addKeyHint, palette } from '../ui/ui';

export class TitleScene extends Phaser.Scene {
  private help?: Phaser.GameObjects.Container;
  private keyboardHandler?: (event: KeyboardEvent) => void;

  constructor() { super('TitleScene'); }

  create(): void {
    addBackdrop(this, 0x173b56);
    this.add.circle(275, 235, 116, 0x152b59, 0.85).setStrokeStyle(3, palette.cyan, 0.35);
    this.add.circle(1005, 235, 116, 0x351d50, 0.85).setStrokeStyle(3, 0xff79b2, 0.35);
    this.add.image(275, 250, 'fighter-sword').setTint(0x58dfff).setScale(1.55).setRotation(-0.08);
    this.add.image(1005, 250, 'fighter-fist').setTint(0xff6b84).setScale(1.55).setFlipX(true).setRotation(0.08);
    this.add.rectangle(640, 226, 490, 220, 0x090d20, 0.72).setStrokeStyle(2, 0x4c67bf, 0.55);
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

    addButton(this, 640, 446, '게임 시작', () => this.scene.start('ModeSelectScene'), 390);
    addButton(this, 640, 530, '조작 방법', () => this.toggleHelp(), 390);
    addKeyHint(this, 570, 603, 'ENTER', '빠른 시작');
    addKeyHint(this, 725, 603, 'ESC', '도움말 닫기');
    this.add.text(640, 650, '하나의 키보드 · 두 명의 파이터 · 오직 한 명의 승자', {
      fontSize: '16px', color: '#7782aa',
    }).setOrigin(0.5);
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !this.help) this.scene.start('ModeSelectScene');
      if (event.key === 'Escape' && this.help) this.toggleHelp();
    };
    this.input.keyboard?.on('keydown', this.keyboardHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyboardHandler) this.input.keyboard?.off('keydown', this.keyboardHandler);
    });
  }

  private toggleHelp(): void {
    if (this.help) {
      this.help.destroy(true);
      this.help = undefined;
      return;
    }
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x03050d, 0.78);
    const panel = this.add.rectangle(0, 0, 900, 470, 0x0a1025, 0.99)
      .setStrokeStyle(4, palette.cyan);
    const title = this.add.text(0, -188, 'BATTLE CONTROLS', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '30px', color: '#ffffff',
    }).setOrigin(0.5);
    const controls = this.add.text(0, -34,
      '1P  이동  A / D     점프  W     기본  E     스킬  R     필살기  Q\n\n' +
      "2P  이동  L / '     점프  P     기본  [     스킬  ]     필살기  O\n\n" +
      'ESC  전투 일시정지     F2  전투 판정 디버그\n\n' +
      '마나는 자동 회복됩니다. 같은 파이터를 골라도 2P 색상이 바뀝니다.',
      { fontSize: '21px', color: '#dbe4ff', align: 'center', lineSpacing: 10 },
    ).setOrigin(0.5);
    const close = this.add.text(0, 184, '클릭 또는 ESC로 닫기', {
      fontSize: '16px', color: '#74e5ff',
    }).setOrigin(0.5);
    this.help = this.add.container(640, 360, [shade, panel, title, controls, close]).setDepth(200)
      .setSize(1280, 720).setInteractive();
    this.help.once('pointerdown', () => this.toggleHelp());
  }
}
