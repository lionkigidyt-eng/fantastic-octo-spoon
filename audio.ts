class XianxiaAudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private lastPlayTime: Record<string, number> = {};

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private throttle(key: string, minMs: number): boolean {
    const now = performance.now();
    if (this.lastPlayTime[key] && now - this.lastPlayTime[key] < minMs) {
      return false;
    }
    this.lastPlayTime[key] = now;
    return true;
  }

  public playSwordSlash(isCrit = false) {
    if (!this.throttle('slash', isCrit ? 60 : 120)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCrit ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 680 : 520, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    gain.gain.setValueAtTime(isCrit ? 0.1 : 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playSkillBurst(heavy = false) {
    if (!this.throttle('skill', 100)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = heavy ? [293.66, 440, 587.33, 880] : [392, 523.25, 659.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.03);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, now + idx * 0.03 + 0.22);
      gain.gain.setValueAtTime(0.065, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.26);
    });
  }

  public playLootPickup() {
    if (!this.throttle('loot', 80)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Chinese pentatonic chime (D5 -> A5)
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(0.055, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.2);
    });
  }

  public playBreakthrough() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Majestic pentatonic ascending arpeggio: C5 D5 E5 G5 A5 C6
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    scale.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === scale.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.075);
      gain.gain.setValueAtTime(0.09, now + i * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.075 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.075);
      osc.stop(now + i * 0.075 + 0.52);
    });
  }

  public playRechargeChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.08, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.38);
    });
  }
}

export const xianxiaAudio = new XianxiaAudioEngine();
