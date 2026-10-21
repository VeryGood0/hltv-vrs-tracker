// Web Audio API Synthesizer for CS2 Tactical Sound Effects

class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 100; // 0..100
  private varied: boolean = false;
  private lastTarget: Element | null = null;
  private master: GainNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const v = localStorage.getItem('sfx_volume');
        if (v !== null) this.volume = Math.max(0, Math.min(100, Number(v) || 0));
        this.varied = localStorage.getItem('sfx_varied') === '1';
      } catch { /* ignore */ }
      window.addEventListener('pointerdown', (e) => { this.lastTarget = e.target as Element; }, true);
      window.addEventListener('keydown', () => { this.lastTarget = document.activeElement; }, true);
    }
  }

  public getVolume() { return this.volume; }
  public setVolume(v: number) {
    this.volume = Math.max(0, Math.min(100, v));
    try { localStorage.setItem('sfx_volume', String(this.volume)); } catch { /* ignore */ }
    if (this.master) this.master.gain.value = this.volume / 100;
  }
  public getVaried() { return this.varied; }
  public setVaried(v: boolean) {
    this.varied = v;
    try { localStorage.setItem('sfx_varied', v ? '1' : '0'); } catch { /* ignore */ }
  }

  private get out(): AudioNode {
    if (!this.master && this.ctx) {
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume / 100;
      this.master.connect(this.ctx.destination);
    }
    return this.master as AudioNode;
  }

  private classify(): string {
    const el = this.lastTarget?.closest?.('button, a, input, select, [role=button], label');
    if (!el) return 'default';
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) return 'toggle';
    if (el.tagName === 'SELECT') return 'toggle';
    const t = ((el.textContent || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase().trim();
    if (/сброс|удал|очист|reset|delete|clear/.test(t)) return 'danger';
    if (/отмен|закры|cancel|close/.test(t) || (t === '' && el.querySelector('svg.lucide-x'))) return 'cancel';
    if (/готово|созда|сохран|примен|подтвер|старт|начать|запуст|симул|ок\b|save|create|confirm|start/.test(t)) return 'confirm';
    if (/^\s*[+]|плюс|\+\d/.test(t)) return 'up';
    if (/^\s*[-−]|минус|-\d/.test(t)) return 'down';
    if (el.getAttribute('role') === 'tab' || /рандом|перемеш|случ/.test(t)) return 'shuffle';
    return 'default';
  }

  private tone(type: OscillatorType, f1: number, f2: number, dur: number, vol: number, delay = 0) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.exponentialRampToValueAtTime(f2, now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.out);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Crisp mechanical click for buttons
  public playClick() {
    if (this.isMuted || this.volume === 0) return;
    this.initCtx();
    if (!this.ctx) return;

    if (this.varied) {
      try {
        switch (this.classify()) {
          case 'confirm': this.tone('triangle', 660, 660, 0.06, 0.12); this.tone('triangle', 990, 990, 0.09, 0.12, 0.06); return;
          case 'cancel': this.tone('sine', 420, 220, 0.08, 0.14); return;
          case 'danger': this.tone('square', 220, 110, 0.12, 0.07); return;
          case 'toggle': this.tone('sine', 1200, 900, 0.025, 0.12); return;
          case 'up': this.tone('triangle', 500, 800, 0.04, 0.12); return;
          case 'down': this.tone('triangle', 800, 500, 0.04, 0.12); return;
          case 'shuffle': [0, 0.035, 0.07].forEach((d, i) => this.tone('triangle', 500 + i * 180, 300 + i * 180, 0.03, 0.09, d)); return;
        }
      } catch { /* fallthrough */ }
    }

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.out);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Tactical map finish / defused sound
  public playMapWin() {
    if (this.isMuted || this.volume === 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      
      // Low punch
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.out);

      osc.start(now);
      osc.stop(now + 0.3);

      // High metallic chime
      const highOsc = this.ctx.createOscillator();
      const highGain = this.ctx.createGain();

      highOsc.type = 'triangle';
      highOsc.frequency.setValueAtTime(520, now + 0.05);
      highOsc.frequency.exponentialRampToValueAtTime(780, now + 0.15);

      highGain.gain.setValueAtTime(0.1, now + 0.05);
      highGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      highOsc.connect(highGain);
      highGain.connect(this.out);

      highOsc.start(now + 0.05);
      highOsc.stop(now + 0.35);
    } catch {
      // Audio fallback
    }
  }

  // Triumphant match victory fanfare
  public playVictory() {
    if (this.isMuted || this.volume === 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [392.00, 523.25, 659.25, 783.99]; // G4, C5, E5, G5

      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.15, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(this.out);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.45);
      });
    } catch {
      // Audio fallback
    }
  }
}

export const soundFx = new SoundEffects();
