import Phaser from 'phaser';

export interface PlayerInput {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key;
  basic: Phaser.Input.Keyboard.Key;
  skill: Phaser.Input.Keyboard.Key;
  ultimate: Phaser.Input.Keyboard.Key;
}

export class InputController {
  readonly p1: PlayerInput;
  readonly p2: PlayerInput;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required');
    this.p1 = keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.W,
      basic: Phaser.Input.Keyboard.KeyCodes.F,
      skill: Phaser.Input.Keyboard.KeyCodes.G,
      ultimate: Phaser.Input.Keyboard.KeyCodes.H,
    }) as PlayerInput;
    this.p2 = keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      jump: Phaser.Input.Keyboard.KeyCodes.UP,
      basic: Phaser.Input.Keyboard.KeyCodes.J,
      skill: Phaser.Input.Keyboard.KeyCodes.K,
      ultimate: Phaser.Input.Keyboard.KeyCodes.L,
    }) as PlayerInput;
  }
}
