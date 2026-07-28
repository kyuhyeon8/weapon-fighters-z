import Phaser from 'phaser';

export const palette = {
  ink: '#f6f7ff',
  muted: '#aab8dc',
  panel: 0x101733,
  panelBright: 0x18234a,
  cyan: 0x37d8ff,
  blue: 0x4d6fff,
  gold: 0xffd66b,
  danger: 0xff4f72,
};

export function addBackdrop(scene: Phaser.Scene, accent = 0x253b78): void {
  const g = scene.add.graphics();
  g.fillGradientStyle(0x060919, 0x060919, accent, 0x10162d, 1);
  g.fillRect(0, 0, 1280, 720);
  g.fillStyle(palette.blue, 0.9).fillRect(0, 0, 1280, 10);
  g.fillStyle(palette.cyan, 0.18).fillRect(0, 10, 1280, 4);
  g.fillStyle(0x061020, 0.55).fillRect(0, 670, 1280, 50);
  for (let i = 0; i < 14; i += 1) {
    g.lineStyle(1, 0x6b8dca, 0.11);
    g.lineBetween(-60, 138 + i * 48, 1340, 54 + i * 48);
  }
  g.lineStyle(1, palette.cyan, 0.12);
  for (let x = 20; x < 1280; x += 80) g.lineBetween(x, 660, x + 34, 660);
}

export function addTitle(scene: Phaser.Scene, title: string, subtitle?: string): void {
  scene.add.rectangle(640, 72, 1120, 104, 0x0b1024, 0.82)
    .setStrokeStyle(2, palette.blue, 0.55);
  scene.add.rectangle(640, 124, 300, 4, palette.cyan, 0.8);
  scene.add.text(640, 62, title, {
    fontFamily: 'Arial Black, sans-serif',
    fontSize: '42px',
    color: palette.ink,
    stroke: '#060817',
    strokeThickness: 7,
  }).setOrigin(0.5);
  if (subtitle) {
    scene.add.text(640, 105, subtitle, {
      fontSize: '14px', color: '#7ee8ff', letterSpacing: 3,
    }).setOrigin(0.5);
  }
}

export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 360,
): Phaser.GameObjects.Container {
  const shadow = scene.add.rectangle(6, 7, width, 64, 0x000000, 0.35);
  const bg = scene.add.rectangle(0, 0, width, 64, palette.panel, 0.98)
    .setStrokeStyle(2, palette.cyan, 0.75);
  const accent = scene.add.rectangle(-width / 2 + 6, 0, 8, 44, palette.blue, 1);
  const text = scene.add.text(0, 0, label, {
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
    fontSize: '22px',
    color: palette.ink,
  }).setOrigin(0.5);
  const container = scene.add.container(x, y, [shadow, bg, accent, text]).setSize(width, 64).setInteractive();
  container.on('pointerover', () => {
    bg.setFillStyle(palette.panelBright);
    bg.setStrokeStyle(3, palette.cyan, 1);
    container.setScale(1.025);
  });
  container.on('pointerout', () => { bg.setFillStyle(palette.panel); container.setScale(1); });
  container.on('pointerdown', () => container.setScale(0.985));
  container.on('pointerup', () => {
    container.setScale(1.025);
    onClick();
  });
  return container;
}

export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  accent = palette.cyan,
  alpha = 0.96,
): Phaser.GameObjects.Rectangle {
  scene.add.rectangle(x + 7, y + 9, width, height, 0x000000, 0.3);
  return scene.add.rectangle(x, y, width, height, palette.panel, alpha)
    .setStrokeStyle(3, accent, 0.72);
}

export function addKeyHint(
  scene: Phaser.Scene,
  x: number,
  y: number,
  key: string,
  label: string,
): Phaser.GameObjects.Container {
  const keycap = scene.add.rectangle(0, 0, 44, 34, 0x202b55, 1)
    .setStrokeStyle(2, palette.cyan, 0.7);
  const keyText = scene.add.text(0, 0, key, {
    fontFamily: 'Arial Black, sans-serif', fontSize: '15px', color: '#ffffff',
  }).setOrigin(0.5);
  const caption = scene.add.text(34, 0, label, {
    fontSize: '14px', color: palette.muted,
  }).setOrigin(0, 0.5);
  return scene.add.container(x, y, [keycap, keyText, caption]);
}
