export type SoundEvent = "flap" | "score" | "collision" | "milestone" | "newBest";

const SOUNDS: Record<SoundEvent, { start: number; end: number; duration: number; volume: number }> = {
  flap: { start: 390, end: 300, duration: 0.07, volume: 0.035 },
  score: { start: 680, end: 860, duration: 0.11, volume: 0.045 },
  collision: { start: 170, end: 65, duration: 0.18, volume: 0.055 },
  milestone: { start: 520, end: 740, duration: 0.14, volume: 0.04 },
  newBest: { start: 760, end: 980, duration: 0.2, volume: 0.045 },
};

export class AudioManager {
  private context: AudioContext | null = null;
  private attempted = false;

  activate(muted: boolean): void {
    if (muted || this.attempted) return;
    this.attempted = true;

    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      this.context = new AudioContextClass();
      if (this.context.state === "suspended") void this.context.resume().catch(() => undefined);
    } catch {
      this.context = null;
    }
  }

  play(event: SoundEvent, muted: boolean): void {
    if (muted || !this.context) return;

    try {
      const context = this.context;
      if (context.state === "closed") return;
      if (context.state === "suspended") void context.resume().catch(() => undefined);

      const sound = SOUNDS[event];
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime;
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(sound.start, start);
      oscillator.frequency.exponentialRampToValueAtTime(sound.end, start + sound.duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(sound.volume, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + sound.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + sound.duration);
    } catch {
      // Audio is optional; browser restrictions must not interrupt gameplay.
    }
  }

  destroy(): void {
    try {
      if (this.context && this.context.state !== "closed") {
        void this.context.close().catch(() => undefined);
      }
    } catch {
      // AudioContext shutdown is best effort.
    }
  }
}
