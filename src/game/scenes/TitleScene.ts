import Phaser from 'phaser';
import { addBackdrop, addKeyHint, palette } from '../ui/ui';

export class TitleScene extends Phaser.Scene {
  private help?: Phaser.GameObjects.Container;
  private keyboardHandler?: (event: KeyboardEvent) => void;

  constructor() { super('TitleScene'); }

  create(): void {
    addBackdrop(this, 0x07556f);
    this.drawArenaBackdrop();

    const leftRing = this.add.circle(265, 315, 132, 0x072a4d, 0.9)
      .setStrokeStyle(5, 0x3ee7ff, 0.75);
    const rightRing = this.add.circle(1015, 315, 132, 0x401735, 0.9)
      .setStrokeStyle(5, 0xff5f9e, 0.75);
    this.add.circle(265, 315, 108, 0x27c8ff, 0.08).setStrokeStyle(2, 0xaaf5ff, 0.28);
    this.add.circle(1015, 315, 108, 0xff3f87, 0.08).setStrokeStyle(2, 0xffc0d7, 0.28);

    const p1 = this.add.image(265, 325, 'fighter-sword').setTint(0x4ce4ff).setScale(2.25);
    const p2 = this.add.image(1015, 325, 'fighter-fist').setTint(0xff668c).setScale(2.25).setFlipX(true);
    this.tweens.add({ targets: p1, y: 316, duration: 1050, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: p2, y: 334, duration: 1050, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: [leftRing, rightRing], alpha: 0.68, duration: 820, yoyo: true, repeat: -1 });

    this.addPlayerBadge(265, 438, '1P', '특수 장검', 0x24dfff);
    this.addPlayerBadge(1015, 438, '2P', '격투', 0xff5d8e);

    this.add.text(640, 101, 'WFZ', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '126px', color: '#ffffff',
      stroke: '#07132c', strokeThickness: 18,
      shadow: { offsetX: 0, offsetY: 9, color: '#29dfff', blur: 16, fill: true },
    }).setOrigin(0.5);
    this.add.text(640, 183, 'WEAPON FIGHTERS Z', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '29px', color: '#75ebff',
      letterSpacing: 9, stroke: '#061027', strokeThickness: 6,
    }).setOrigin(0.5);
    this.add.text(640, 238, 'VS', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '70px', color: '#fff4b4',
      stroke: '#ff4d6d', strokeThickness: 9,
      shadow: { offsetX: 0, offsetY: 0, color: '#ffb13b', blur: 18, fill: true },
    }).setOrigin(0.5).setRotation(-0.08);
    this.add.text(640, 298, '한 키보드로 붙는 로컬 2인 대전', {
      fontFamily: 'Arial, sans-serif', fontStyle: 'bold', fontSize: '18px',
      color: '#dbeaff', letterSpacing: 2,
    }).setOrigin(0.5);

    this.addPrimaryButton(640, 476, () => this.scene.start('ModeSelectScene'));
    this.addHelpButton(640, 574);
    addKeyHint(this, 540, 648, 'ENTER', '바로 대전');
    addKeyHint(this, 714, 648, 'ESC', '창 닫기');

    this.keyboardHandler = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !this.help) this.scene.start('ModeSelectScene');
      if (event.key === 'Escape' && this.help) this.toggleHelp();
    };
    this.input.keyboard?.on('keydown', this.keyboardHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyboardHandler) this.input.keyboard?.off('keydown', this.keyboardHandler);
    });
  }

  private drawArenaBackdrop(): void {
    const g = this.add.graphics();
    g.fillStyle(0x15bde8, 0.12).fillTriangle(0, 95, 495, 95, 325, 720);
    g.fillStyle(0xff3b82, 0.1).fillTriangle(1280, 95, 785, 95, 955, 720);
    g.fillStyle(0x060a19, 0.76).fillRect(0, 602, 1280, 118);
    g.lineStyle(3, 0x56e8ff, 0.23).lineBetween(0, 602, 1280, 602);
    for (let x = 40; x < 1280; x += 96) {
      g.lineStyle(2, x < 640 ? 0x35dfff : 0xff5b98, 0.14);
      g.lineBetween(640, 602, x, 720);
    }
    for (let y = 630; y < 720; y += 28) {
      g.lineStyle(1, 0xb7eaff, 0.12).lineBetween(0, y, 1280, y);
    }
    for (let i = 0; i < 18; i += 1) {
      const left = i % 2 === 0;
      const spark = this.add.rectangle(
        left ? 85 + (i * 67) % 430 : 770 + (i * 83) % 430,
        130 + (i * 71) % 390,
        34 + (i % 4) * 9,
        3,
        left ? 0x52e8ff : 0xff6b9d,
        0.22,
      ).setRotation(left ? -0.45 : 0.45);
      this.tweens.add({
        targets: spark,
        alpha: 0.65,
        x: spark.x + (left ? 28 : -28),
        duration: 760 + i * 35,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private addPlayerBadge(x: number, y: number, player: string, fighter: string, color: number): void {
    this.add.rectangle(x, y, 224, 48, 0x080d20, 0.95).setStrokeStyle(3, color, 0.85);
    this.add.rectangle(x - 88, y, 42, 48, color, 1);
    this.add.text(x - 88, y, player, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '19px', color: '#071020',
    }).setOrigin(0.5);
    this.add.text(x + 10, y, fighter, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);
  }

  private addPrimaryButton(x: number, y: number, onClick: () => void): void {
    const glow = this.add.rectangle(0, 8, 444, 82, 0x13dfff, 0.22);
    const bg = this.add.rectangle(0, 0, 428, 72, 0x35dfff, 1)
      .setStrokeStyle(4, 0xe9fcff, 0.95);
    const edge = this.add.rectangle(-204, 0, 12, 52, 0x4168ff, 1);
    const label = this.add.text(0, -7, '게임 시작', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '29px', color: '#071329',
    }).setOrigin(0.5);
    const sub = this.add.text(0, 22, 'PRESS ENTER TO BATTLE', {
      fontFamily: 'Arial, sans-serif', fontStyle: 'bold', fontSize: '11px',
      color: '#15516b', letterSpacing: 3,
    }).setOrigin(0.5);
    const button = this.add.container(x, y, [glow, bg, edge, label, sub])
      .setSize(444, 82).setInteractive();
    button.on('pointerover', () => {
      bg.setFillStyle(0xffffff);
      glow.setAlpha(0.5);
      button.setScale(1.035);
    });
    button.on('pointerout', () => {
      bg.setFillStyle(0x35dfff);
      glow.setAlpha(0.22);
      button.setScale(1);
    });
    button.on('pointerdown', () => button.setScale(0.98));
    button.on('pointerup', onClick);
    this.tweens.add({ targets: glow, alpha: 0.5, duration: 620, yoyo: true, repeat: -1 });
  }

  private addHelpButton(x: number, y: number): void {
    const bg = this.add.rectangle(0, 0, 260, 52, 0x0a1025, 0.94)
      .setStrokeStyle(2, 0x7188c9, 0.8);
    const text = this.add.text(0, 0, '조작 방법  ·  HOW TO PLAY', {
      fontFamily: 'Arial, sans-serif', fontStyle: 'bold', fontSize: '16px', color: '#dce7ff',
    }).setOrigin(0.5);
    const button = this.add.container(x, y, [bg, text]).setSize(260, 52).setInteractive();
    button.on('pointerover', () => bg.setFillStyle(0x1b2857));
    button.on('pointerout', () => bg.setFillStyle(0x0a1025));
    button.on('pointerup', () => this.toggleHelp());
  }

  private toggleHelp(): void {
    if (this.help) {
      this.help.destroy(true);
      this.help = undefined;
      return;
    }
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x03050d, 0.82);
    const panel = this.add.rectangle(0, 0, 900, 470, 0x0a1025, 0.99)
      .setStrokeStyle(4, palette.cyan);
    const title = this.add.text(0, -188, '조작 방법', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '34px', color: '#ffffff',
    }).setOrigin(0.5);
    const controls = this.add.text(0, -30,
      '1P  이동  A / D     점프  W     기본 공격  E     스킬  R     궁극기  Q\n\n' +
      "2P  이동  L / '     점프  P     기본 공격  [     스킬  ]     궁극기  O\n\n" +
      'ESC  전투 일시정지\n\n' +
      '마나는 자동으로 회복됩니다. 같은 캐릭터도 선택할 수 있습니다.',
      { fontSize: '21px', color: '#dbe4ff', align: 'center', lineSpacing: 10 },
    ).setOrigin(0.5);
    const close = this.add.text(0, 184, '화면 또는 ESC를 눌러 닫기', {
      fontSize: '16px', color: '#74e5ff',
    }).setOrigin(0.5);
    this.help = this.add.container(640, 360, [shade, panel, title, controls, close]).setDepth(200)
      .setSize(1280, 720).setInteractive();
    this.help.once('pointerdown', () => this.toggleHelp());
  }
}
