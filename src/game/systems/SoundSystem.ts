import Phaser from 'phaser';

type SoundName = 'jump' | 'attack' | 'hit' | 'skill' | 'ultimate' | 'round' | 'ko';

const tones: Record<SoundName, [number, number, OscillatorType]> = {
  jump: [330, 0.08, 'sine'],
  attack: [150, 0.05, 'square'],
  hit: [90, 0.09, 'sawtooth'],
  skill: [420, 0.12, 'triangle'],
  ultimate: [70, 0.3, 'sawtooth'],
  round: [520, 0.12, 'sine'],
  ko: [55, 0.45, 'square'],
};

export class SoundSystem {
  private context?: AudioContext;

  constructor(private readonly scene: Phaser.Scene) {}

  play(name: SoundName): void {
    try {
      this.context ??= new AudioContext();
      const [frequency, duration, type] = tones[name];
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.context.currentTime);
      gain.gain.setValueAtTime(0.045, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
      osc.connect(gain).connect(this.context.destination);
      osc.start();
      osc.stop(this.context.currentTime + duration);
    } catch {
      this.scene.sound.mute = false;
    }
  }
}
