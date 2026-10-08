/**
 * High-fidelity Web Audio API sound synthesizer and background music engine.
 * Fully procedural with zero external audio assets required.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isBgmPlaying = false;
  private bgmIntervalId: any = null;
  private volumeMaster = 0.7;
  private volumeBgm = 0.35;
  private volumeSfx = 0.8;
  private isMuted = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volumeMaster, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.volumeBgm, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.volumeSfx, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMasterVolume(val: number) {
    this.volumeMaster = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volumeMaster, this.ctx.currentTime);
    }
  }

  public setBgmVolume(val: number) {
    this.volumeBgm = Math.max(0, Math.min(1, val));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.volumeBgm, this.ctx.currentTime);
    }
  }

  public setSfxVolume(val: number) {
    this.volumeSfx = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.volumeSfx, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volumeMaster, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getSettings() {
    return {
      master: this.volumeMaster,
      bgm: this.volumeBgm,
      sfx: this.volumeSfx,
      muted: this.isMuted,
      bgmPlaying: this.isBgmPlaying,
    };
  }

  /**
   * Card deal / draw sound: smooth paper sliding sound
   */
  public playDraw() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Filtered noise for paper friction
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + 0.12);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(now);
  }

  public playCardSlide() {
    this.playDraw();
  }

  /**
   * Card play snap: tactile snap onto the felt table
   */
  public playCardSnap() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Fast pitch drop oscillator for percussive thump
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    // Click transient
    const click = this.ctx.createOscillator();
    click.type = 'sine';
    click.frequency.setValueAtTime(1200, now);
    click.frequency.exponentialRampToValueAtTime(200, now + 0.03);

    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0.4, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    click.connect(clickGain);
    clickGain.connect(this.sfxGain);

    osc.start(now);
    click.start(now);
    osc.stop(now + 0.09);
    click.stop(now + 0.04);
  }

  /**
   * Turn transition chime
   */
  public playTurnChime() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * Reverse card action: swirling futuristic frequency sweep
   */
  public playReverse() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(700, now + 0.2);
    osc.frequency.linearRampToValueAtTime(300, now + 0.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(2200, now + 0.2);
    filter.frequency.linearRampToValueAtTime(400, now + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.46);
  }

  /**
   * Skip card action: sudden brake/whoosh sound
   */
  public playSkip() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.28);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(250, now + 0.28);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.31);
  }

  /**
   * Draw Two (+2) action: two playful ascending power chimes
   */
  public playDrawTwo() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    [0, 0.14].forEach((delay, idx) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 587.33 : 880, now + delay); // D5 then A5

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.01, now + delay);
      gain.gain.linearRampToValueAtTime(0.35, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + delay);
      osc.stop(now + delay + 0.23);
    });
  }

  /**
   * Wild Draw Four (+4) action: dramatic bass drop + four rapid cascading synth chords
   */
  public playDrawFour() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Sub bass impact
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(35, now + 0.6);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.65);

    // 4 sharp staccato power pulses
    [0.08, 0.18, 0.28, 0.38].forEach((timeOffset, i) => {
      const pulse = this.ctx!.createOscillator();
      pulse.type = 'sawtooth';
      pulse.frequency.setValueAtTime(400 + i * 150, now + timeOffset);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, now + timeOffset);

      const pGain = this.ctx!.createGain();
      pGain.gain.setValueAtTime(0.3, now + timeOffset);
      pGain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.14);

      pulse.connect(filter);
      filter.connect(pGain);
      pGain.connect(this.sfxGain!);

      pulse.start(now + timeOffset);
      pulse.stop(now + timeOffset + 0.15);
    });
  }

  /**
   * Wild card played: pleasant celestial chord
   */
  public playWild() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const freqs = [440, 554.37, 659.25, 830.61]; // A major 7
    freqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.04);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.01, now + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.04 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.55);
    });
  }

  /**
   * UNO Call Announcement: Energetic fanfare trumpet + siren excitement
   */
  public playUnoCall() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Dramatic fanfare chord
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now);
      osc.stop(now + 0.85);
    });

    // Pitch sweep "WHOOP"
    const whoop = this.ctx.createOscillator();
    whoop.type = 'sine';
    whoop.frequency.setValueAtTime(300, now);
    whoop.frequency.exponentialRampToValueAtTime(1200, now + 0.35);

    const wGain = this.ctx.createGain();
    wGain.gain.setValueAtTime(0.25, now);
    wGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    whoop.connect(wGain);
    wGain.connect(this.sfxGain);
    whoop.start(now);
    whoop.stop(now + 0.45);
  }

  /**
   * Victory sound
   */
  public playVictory() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const melody = [
      { f: 523.25, d: 0.15 }, // C
      { f: 659.25, d: 0.15 }, // E
      { f: 783.99, d: 0.15 }, // G
      { f: 1046.5, d: 0.4 },  // C6
    ];

    let t = now;
    melody.forEach((note) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + note.d + 0.05);
      t += note.d * 0.8;
    });
  }

  /**
   * Emoji reaction sound
   */
  public playEmojiSound(emoji: string) {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    let baseFreq = 480;
    let type: OscillatorType = 'sine';

    if (emoji.includes('+4') || emoji.includes('💥')) {
      baseFreq = 220;
      type = 'sawtooth';
    } else if (emoji.includes('+2')) {
      baseFreq = 660;
      type = 'triangle';
    } else if (emoji.includes('🔄') || emoji.includes('reverse')) {
      this.playReverse();
      return;
    } else if (emoji.includes('🛑') || emoji.includes('skip')) {
      this.playSkip();
      return;
    } else if (emoji.includes('🔥') || emoji.includes('👑')) {
      baseFreq = 880;
      type = 'triangle';
    }

    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * Procedural Ambient Lo-Fi / Lounge Game Background Music
   */
  public startBGM() {
    if (this.isBgmPlaying) return;
    this.initCtx();
    if (!this.ctx || !this.bgmGain) return;

    this.isBgmPlaying = true;

    // Chords in F major / D minor chill progression:
    // Dm7 -> G7 -> Cmaj7 -> Am7
    const chords = [
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [246.94, 293.66, 392.0, 440.0],  // G7
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
    ];

    let chordIdx = 0;
    const playChordStep = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.bgmGain) return;
      const now = this.ctx.currentTime;
      const chord = chords[chordIdx % chords.length];
      chordIdx++;

      chord.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        // Subtle vibrato/detune for lushness
        osc.detune.setValueAtTime(idx % 2 === 0 ? 3 : -3, now);
        osc.frequency.setValueAtTime(freq, now);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain!);

        osc.start(now);
        osc.stop(now + 2.35);
      });

      // Subtle soft bass pulse
      const bass = this.ctx.createOscillator();
      bass.type = 'triangle';
      bass.frequency.setValueAtTime(chord[0] / 2, now);

      const bGain = this.ctx.createGain();
      bGain.gain.setValueAtTime(0.08, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      bass.connect(bGain);
      bGain.connect(this.bgmGain);
      bass.start(now);
      bass.stop(now + 1.25);
    };

    playChordStep();
    this.bgmIntervalId = setInterval(() => {
      if (this.isBgmPlaying) {
        playChordStep();
      }
    }, 2400);
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  public toggleBGM(): boolean {
    if (this.isBgmPlaying) {
      this.stopBGM();
      return false;
    } else {
      this.startBGM();
      return true;
    }
  }

  /**
   * Turn timer warning tick (last 5 seconds)
   */
  public playTick() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.04);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Turn timeout buzzer
   */
  public playTimeoutBuzzer() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.setValueAtTime(105, now + 0.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Challenge / Caught uno penalty slap
   */
  public playChallengeSuccess() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // High sharp whistle then low impact
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }
}

export const sound = new SoundEngine();
