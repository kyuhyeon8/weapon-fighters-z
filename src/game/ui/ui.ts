import Phaser from 'phaser';

export const palette = {
  ink: '#f6f7ff',
  muted: '#aab2d4',
  panel: 0x151a31,
  cyan: 0x56d6ff,
  gold: 0xffd66b,
};

export function addBackdrop(scene: Phaser.Scene, accent = 0x253b78): void {
  const g = scene.add.graphics();
  g.fillGradientStyle(0x070914, 0x070914, accent, 0x11172d, 1);
  g.fillRect(0, 0, 1280, 720);
  for (let i = 0; i < 16; i += 1) {
    g.lineStyle(1, 0x6b7aa8, 0.12);
    g.lineBetween(0, 130 + i * 48, 1280, 60 + i * 48);
  }
}

export function addTitle(scene: Phaser.Scene, title: string, subtitle?: string): void {
  scene.add.text(640, 76, title, {
    fontFamily: 'Arial Black, sans-serif',
    fontSize: '46px',
    color: palette.ink,
    stroke: '#060817',
    strokeThickness: 8,
  }).setOrigin(0.5);
  if (subtitle) {
    scene.add.text(640, 124, subtitle, {
      fontSize: '18px', color: palette.muted, letterSpacing: 2,
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
  const bg = scene.add.rectangle(0, 0, width, 64, palette.panel, 0.96)
    .setStrokeStyle(2, palette.cyan, 0.7);
  const text = scene.add.text(0, 0, label, {
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
    fontSize: '22px',
    color: palette.ink,
  }).setOrigin(0.5);
  const container = scene.add.container(x, y, [bg, text]).setSize(width, 64).setInteractive();
  container.on('pointerover', () => { bg.setFillStyle(0x24315b); container.setScale(1.025); });
  container.on('pointerout', () => { bg.setFillStyle(palette.panel); container.setScale(1); });
  container.on('pointerdown', onClick);
  return container;
}
