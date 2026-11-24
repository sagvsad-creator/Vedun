import type { BladeKind, SignId, TodPhase } from '../core/events';
import type { AudioSettings } from '../core/settings';

export type MusicMood = 'village_dawn' | 'forest_dusk' | 'combat_hunt' | 'night_barrow' | 'boss_leshy';

const DORIAN_SCALE_HZ = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 329.63, 392.0]; // D minor / Dorian gusli
const NAV_SCALE_HZ = [130.81, 155.56, 185.0, 196.0, 233.08, 261.63]; // Dark C Phrygian/Diminished Nav

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private droneOscA: OscillatorNode | null = null;
  private droneOscB: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private settings: AudioSettings = { muted: false, master: 0.78, music: 0.56, sfx: 0.86 };
  private mood: MusicMood = 'village_dawn';
  private paused = false;
  private musicAcc = 0;
  private stepIdx = 0;
  private unlocked = false;

  unlock(): void {
    if (this.unlocked) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      const music = ctx.createGain();
      const sfx = ctx.createGain();
      master.connect(ctx.destination);
      music.connect(master);
      sfx.connect(master);

      this.masterGain = master;
      this.musicGain = music;
      this.sfxGain = sfx;

      // Pre-compute white noise buffer for wind, splashes, fire, blade whoosh
      const len = ctx.sampleRate * 1.5;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;

      // Continuous subtle Slavic hurdy-gurdy / cello drone bed
      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 340;
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.08;
      droneFilter.connect(droneGain);
      droneGain.connect(music);

      const oscA = ctx.createOscillator();
      oscA.type = 'sawtooth';
      oscA.frequency.value = 73.42; // D2
      const oscB = ctx.createOscillator();
      oscB.type = 'triangle';
      oscB.frequency.value = 110.0; // A2 fifth
      oscA.connect(droneFilter);
      oscB.connect(droneFilter);
      oscA.start();
      oscB.start();

      this.droneOscA = oscA;
      this.droneOscB = oscB;
      this.droneFilter = droneFilter;
      this.droneGain = droneGain;

      this.unlocked = true;
      this.applyVolumes();
    } catch {
      // Ignore blocked audio contexts in restricted headless environments
    }
  }

  updateSettings(settings: AudioSettings): void {
    this.settings = { ...settings };
    this.applyVolumes();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.applyVolumes();
  }

  setMoodContext(params: { tod: TodPhase; inCombat: boolean; nearBoss: boolean; inBarrow: boolean }): void {
    let next: MusicMood = 'village_dawn';
    if (params.nearBoss && params.inCombat) {
      next = 'boss_leshy';
    } else if (params.inCombat) {
      next = 'combat_hunt';
    } else if (params.inBarrow || params.tod === 'night') {
      next = 'night_barrow';
    } else if (params.tod === 'dusk') {
      next = 'forest_dusk';
    } else {
      next = 'village_dawn';
    }
    if (next === this.mood) return;
    this.mood = next;

    if (this.ctx && this.droneOscA && this.droneOscB && this.droneFilter && this.droneGain) {
      const now = this.ctx.currentTime;
      const rootHz =
        next === 'boss_leshy' ? 65.41 : next === 'night_barrow' ? 61.74 : next === 'combat_hunt' ? 73.42 : 73.42;
      const fifthHz = next === 'night_barrow' ? 92.5 : rootHz * 1.5;
      const cutoff =
        next === 'boss_leshy' ? 560 : next === 'combat_hunt' ? 450 : next === 'night_barrow' ? 260 : 320;
      const bedLevel = next === 'boss_leshy' ? 0.14 : next === 'combat_hunt' ? 0.11 : 0.08;

      this.droneOscA.frequency.setTargetAtTime(rootHz, now, 0.6);
      this.droneOscB.frequency.setTargetAtTime(fifthHz, now, 0.6);
      this.droneFilter.frequency.setTargetAtTime(cutoff, now, 0.5);
      this.droneGain.gain.setTargetAtTime(bedLevel, now, 0.5);
    }
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const muteFactor = this.settings.muted ? 0 : 1;
    this.masterGain.gain.setTargetAtTime(this.settings.master * muteFactor, now, 0.05);
    this.musicGain.gain.setTargetAtTime((this.paused ? 0.15 : 1) * this.settings.music, now, 0.08);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfx, now, 0.04);
  }

  tick(dt: number): void {
    if (!this.ctx || !this.musicGain || this.settings.muted || this.paused) return;
    if (this.ctx.state !== 'running') return;

    const beatInterval =
      this.mood === 'boss_leshy'
        ? 0.36
        : this.mood === 'combat_hunt'
          ? 0.44
          : this.mood === 'forest_dusk'
            ? 0.72
            : 0.95;

    this.musicAcc += dt;
    if (this.musicAcc < beatInterval) return;
    this.musicAcc -= beatInterval;
    this.stepIdx++;

    const now = this.ctx.currentTime;
    // Slavic frame drum pulse in combat / boss / dusk
    if (this.mood === 'boss_leshy' || this.mood === 'combat_hunt' || (this.mood === 'forest_dusk' && this.stepIdx % 2 === 0)) {
      const strong = this.stepIdx % 4 === 0;
      this.playMusicDrum(now, strong ? 92 : 68, strong ? 0.18 : 0.10);
    }

    // Plucked gusli / Nav bell motif
    const scale = this.mood === 'night_barrow' || this.mood === 'boss_leshy' ? NAV_SCALE_HZ : DORIAN_SCALE_HZ;
    if (this.mood === 'village_dawn' && this.stepIdx % 2 === 0) {
      const hz = scale[(this.stepIdx * 3) % scale.length];
      this.playGusliPluck(now, hz, 0.085);
    } else if (this.mood === 'forest_dusk' && this.stepIdx % 2 === 1) {
      const hz = scale[(this.stepIdx * 5) % scale.length];
      this.playGusliPluck(now, hz, 0.09);
    } else if (this.mood === 'night_barrow' && this.stepIdx % 3 === 0) {
      const hz = scale[(this.stepIdx * 2) % scale.length] * 1.5;
      this.playBellPad(now, hz, 0.065);
    } else if ((this.mood === 'combat_hunt' || this.mood === 'boss_leshy') && this.stepIdx % 2 === 0) {
      const hz = scale[(this.stepIdx * 3 + 1) % scale.length] * (this.mood === 'boss_leshy' ? 0.75 : 1);
      this.playGusliPluck(now, hz, 0.11);
    }
  }

  private playMusicDrum(t: number, freq: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(34, t + 0.14);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.23);
  }

  private playGusliPluck(t: number, freq: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.frequency.exponentialRampToValueAtTime(360, t + 0.65);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.86);
  }

  private playBellPad(t: number, freq: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 1.45);
  }

  playFootstep(inWater: boolean): void {
    this.playNoiseBurst(inWater ? 0.14 : 0.06, inWater ? 920 : 380, inWater ? 'bandpass' : 'lowpass', inWater ? 0.12 : 0.07);
  }

  playJump(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.11);
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
    this.playNoiseBurst(0.09, 650, 'bandpass', 0.08);
  }

  playLand(impact: number): void {
    this.playNoiseBurst(0.11, 240, 'lowpass', Math.min(0.24, 0.08 + impact * 0.02));
  }

  playDash(): void {
    this.playNoiseBurst(0.17, 1100, 'bandpass', 0.16);
  }

  playSwing(blade: BladeKind, heavy: boolean): void {
    const pitch = blade === 'silver' ? (heavy ? 760 : 1240) : (heavy ? 540 : 880);
    this.playNoiseBurst(heavy ? 0.24 : 0.14, pitch, 'bandpass', heavy ? 0.24 : 0.17);
  }

  playHit(blade: BladeKind, crit: boolean): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = blade === 'silver' ? 'triangle' : 'sawtooth';
    const base = blade === 'silver' ? (crit ? 620 : 460) : (crit ? 260 : 185);
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 0.42, t + 0.12);
    g.gain.setValueAtTime(crit ? 0.26 : 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
    this.playNoiseBurst(0.08, 1600, 'highpass', crit ? 0.2 : 0.12);
  }

  playSign(sign: SignId): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const t = this.ctx.currentTime;
    if (sign === 'svarog') {
      this.playNoiseBurst(0.45, 520, 'lowpass', 0.3);
      this.playTone(130, 62, 0.35, 'sawtooth', 0.18);
    } else if (sign === 'veles') {
      this.playTone(220, 48, 0.32, 'sine', 0.3);
      this.playNoiseBurst(0.22, 820, 'bandpass', 0.22);
    } else if (sign === 'makosh') {
      this.playTone(440, 660, 0.36, 'triangle', 0.16);
      this.playTone(554, 880, 0.36, 'sine', 0.12);
    } else {
      this.playTone(310, 145, 0.4, 'sawtooth', 0.15);
      this.playNoiseBurst(0.28, 1900, 'highpass', 0.14);
    }
    void t;
  }

  playSense(): void {
    this.playTone(196, 392, 0.48, 'sine', 0.16);
    this.playTone(98, 74, 0.55, 'triangle', 0.15);
  }

  playHurt(blocked: boolean): void {
    if (blocked) {
      this.playTone(580, 290, 0.2, 'triangle', 0.24);
    } else {
      this.playTone(135, 52, 0.25, 'sawtooth', 0.28);
    }
  }

  playTelegraph(): void {
    this.playTone(165, 290, 0.22, 'sawtooth', 0.11);
  }

  playUiClick(): void {
    this.playTone(520, 420, 0.055, 'triangle', 0.08);
  }

  private playTone(f0: number, f1: number, dur: number, type: OscillatorType, vol: number): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private playNoiseBurst(dur: number, freq: number, filterType: BiquadFilterType, vol: number): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer || this.settings.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    const v = vol * (0.92 + Math.random() * 0.16);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  dispose(): void {
    try {
      this.droneOscA?.stop();
      this.droneOscB?.stop();
      void this.ctx?.close();
    } catch {
      // noop
    }
  }
}
