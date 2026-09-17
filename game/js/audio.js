// 사운드: 외부 파일 없이 WebAudio로 효과음과 BGM 합성
'use strict';
const Audio2 = {
  ac: null, master: null, sfxGain: null, bgmGain: null,
  bgmOn: true, sfxOn: true,
  bgm: null, bgmTimer: null, step: 0, nextTime: 0,
  unlock() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ac = new AC();
    this.master = this.ac.createGain(); this.master.gain.value = 0.8;
    const comp = this.ac.createDynamicsCompressor();
    this.master.connect(comp); comp.connect(this.ac.destination);
    this.sfxGain = this.ac.createGain(); this.sfxGain.connect(this.master);
    this.bgmGain = this.ac.createGain(); this.bgmGain.gain.value = 0.22; this.bgmGain.connect(this.master);
    const n = this.ac.sampleRate;
    this.noiseBuf = this.ac.createBuffer(1, n, n);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.applySettings();
    if (this.pendingBgm) this.playBgm(this.pendingBgm);
  },
  applySettings() {
    if (!this.ac) return;
    this.sfxGain.gain.value = this.sfxOn ? 1 : 0;
    this.bgmGain.gain.value = this.bgmOn ? 0.22 : 0;
  },
  tone(freq, dur, type = 'sine', vol = 0.3, slide = 0, delay = 0, dest) {
    const ac = this.ac; if (!ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol = 0.3, freq = 1200, q = 1, delay = 0, type = 'bandpass', slide = 0) {
    const ac = this.ac; if (!ac) return;
    const t = ac.currentTime + delay;
    const s = ac.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxGain);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  },
  last: {},
  sfx(name, p = 0) {
    if (!this.ac || !this.sfxOn) return;
    const now = this.ac.currentTime;
    // 같은 소리가 한 프레임에 몰리지 않도록 제한
    const gap = { hit: 0.03, coin: 0.035, crit: 0.05, enemyhit: 0.05 }[name] || 0;
    if (gap && this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    const T = this.tone.bind(this), N = this.noise.bind(this);
    switch (name) {
      case 'click': T(900, 0.06, 'triangle', 0.2, 1300); break;
      case 'pick': T(600, 0.07, 'triangle', 0.18, 900); break;
      case 'drop': T(420, 0.08, 'triangle', 0.18, 260); break;
      case 'merge': {
        const base = 523 * Math.pow(2, Math.min(p, 14) / 12);
        T(base, 0.18, 'triangle', 0.3); T(base * 1.5, 0.22, 'sine', 0.22, 0, 0.05); T(base * 2, 0.3, 'sine', 0.15, 0, 0.1);
        N(0.15, 0.08, 6000, 2, 0, 'highpass');
        break;
      }
      case 'chain': {
        const base = 659 * Math.pow(2, Math.min(p, 14) / 12);
        [0, 4, 7, 12].forEach((s, i) => T(base * Math.pow(2, s / 12), 0.2, 'square', 0.08, 0, i * 0.045));
        break;
      }
      case 'produce': N(0.12, 0.35, 2500, 3); T(1800, 0.25, 'square', 0.06, 1400); T(220, 0.1, 'sine', 0.3, 80); break;
      case 'pop': T(700, 0.08, 'sine', 0.25, 1200); break;
      case 'supply': N(0.35, 0.12, 800, 1, 0, 'bandpass', 4000); T(400, 0.3, 'sine', 0.12, 1200); break;
      case 'equip': T(784, 0.1, 'square', 0.1); T(1047, 0.1, 'square', 0.1, 0, 0.07); T(1568, 0.25, 'triangle', 0.15, 0, 0.14); break;
      case 'heal': [0, 4, 7, 11].forEach((s, i) => T(880 * Math.pow(2, s / 12), 0.35, 'sine', 0.1, 0, i * 0.06)); break;
      case 'hit': N(0.08, 0.3, rand(1500, 2500), 1.5); T(rand(180, 240), 0.08, 'square', 0.1, 80); break;
      case 'slash': N(0.14, 0.25, 3000, 1, 0, 'bandpass', 900); break;
      case 'crit': N(0.2, 0.4, 1200, 1); T(160, 0.25, 'sawtooth', 0.2, 50); T(1200, 0.15, 'square', 0.08, 2400); break;
      case 'arrow': N(0.12, 0.12, 5000, 3, 0, 'bandpass', 2000); break;
      case 'fire': N(0.3, 0.2, 600, 1, 0, 'lowpass', 2500); T(200, 0.3, 'sawtooth', 0.08, 400); break;
      case 'boom': N(0.6, 0.6, 400, 0.7, 0, 'lowpass', 60); T(90, 0.5, 'sine', 0.6, 30); break;
      case 'bigboom': N(1.2, 0.8, 600, 0.5, 0, 'lowpass', 40); T(70, 1.0, 'sine', 0.8, 25); N(0.4, 0.3, 4000, 1, 0.05, 'highpass'); break;
      case 'zap': for (let i = 0; i < 4; i++) { N(0.08, 0.3, 3000, 4, i * 0.05); T(rand(800, 1600), 0.06, 'sawtooth', 0.08, 200, i * 0.05); } break;
      case 'enemyhit': N(0.1, 0.25, 700, 1); T(120, 0.12, 'square', 0.12, 60); break;
      case 'die': T(500, 0.2, 'triangle', 0.15, 120); N(0.15, 0.15, 1500, 1); break;
      case 'coin': T(1319 + rand(-30, 30), 0.06, 'square', 0.06); T(1760, 0.12, 'square', 0.05, 0, 0.05); break;
      case 'meow': T(700, 0.12, 'sawtooth', 0.08, 1100); T(1100, 0.25, 'sawtooth', 0.07, 600, 0.1); break;
      case 'roar': N(1.2, 0.6, 300, 0.8, 0, 'lowpass', 120); T(110, 1.1, 'sawtooth', 0.25, 55); T(82, 1.1, 'square', 0.12, 40); break;
      case 'warn': T(880, 0.12, 'square', 0.15); T(880, 0.12, 'square', 0.15, 0, 0.2); T(880, 0.12, 'square', 0.15, 0, 0.4); break;
      case 'fever': [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => T(523 * Math.pow(2, s / 12), 0.25, 'square', 0.1, 0, i * 0.05)); N(0.8, 0.2, 5000, 1, 0.1, 'highpass'); break;
      case 'wave': T(523, 0.15, 'triangle', 0.2); T(784, 0.25, 'triangle', 0.2, 0, 0.12); break;
      case 'star': T(1047 * (1 + p * 0.25), 0.35, 'triangle', 0.25); T(2093 * (1 + p * 0.25), 0.3, 'sine', 0.1, 0, 0.03); break;
      case 'win': [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => T(523 * Math.pow(2, s / 12), 0.28, 'triangle', 0.2, 0, i * 0.11)); break;
      case 'lose': [7, 6, 5, 0].forEach((s, i) => T(392 * Math.pow(2, s / 12) / 1.5, 0.35, 'triangle', 0.2, 0, i * 0.22)); break;
      case 'legend': [0, 7, 12, 16, 19, 24].forEach((s, i) => T(392 * Math.pow(2, s / 12), 0.6, 'triangle', 0.15, 0, i * 0.09)); N(1.5, 0.15, 7000, 1, 0, 'highpass'); break;
      case 'freeze': T(2000, 0.4, 'sine', 0.1, 3000); N(0.4, 0.2, 6000, 2); break;
      case 'full': T(200, 0.15, 'square', 0.15); T(160, 0.2, 'square', 0.15, 0, 0.12); break;
      case 'chest': T(392, 0.1, 'triangle', 0.2); T(523, 0.1, 'triangle', 0.2, 0, 0.08); T(784, 0.3, 'triangle', 0.2, 0, 0.16); N(0.3, 0.1, 6000, 1, 0.16, 'highpass'); break;
    }
  },

  // ---- BGM: 간단한 스텝 시퀀서 ----
  songs: {
    lobby: { bpm: 100, scale: [0, 2, 4, 7, 9], root: 60, bass: [0, 0, 5, 7], mel: [0, 2, 4, 2, 7, 4, 2, 0, 4, 5, 7, 9, 7, 4, 2, -1] },
    battle: { bpm: 138, scale: [0, 2, 3, 5, 7, 8, 10], root: 57, bass: [0, 0, 5, 3, 0, 0, 7, 5], mel: [0, 2, 4, 2, 4, 5, 4, 2, 0, -1, 4, 6, 7, 6, 4, 2] },
    boss: { bpm: 150, scale: [0, 1, 3, 5, 7, 8, 10], root: 52, bass: [0, 0, 1, 0, 0, 0, 6, 5], mel: [0, -1, 0, 1, 4, -1, 3, 1, 0, -1, 0, 5, 4, 3, 1, -1] },
    fever: { bpm: 170, scale: [0, 2, 4, 7, 9], root: 64, bass: [0, 3, 4, 3], mel: [0, 1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 6, 5, 4, 3, 2] },
  },
  playBgm(name) {
    if (!this.ac) { this.pendingBgm = name; return; }
    if (this.bgm === name) return;
    this.bgm = name;
    this.step = 0;
    this.nextTime = this.ac.currentTime + 0.1;
    if (!this.bgmTimer) this.bgmTimer = setInterval(() => this.tick(), 50);
  },
  stopBgm() { this.bgm = null; this.pendingBgm = null; },
  tick() {
    if (!this.ac || !this.bgm) return;
    const song = this.songs[this.bgm];
    const stepDur = 60 / song.bpm / 2;
    while (this.nextTime < this.ac.currentTime + 0.2) {
      const t = this.nextTime - this.ac.currentTime;
      const s = this.step;
      const note = deg => {
        const sc = song.scale, o = Math.floor(deg / sc.length);
        return 440 * Math.pow(2, (song.root + sc[((deg % sc.length) + sc.length) % sc.length] + o * 12 - 69) / 12);
      };
      if (s % 2 === 0) {
        const b = song.bass[(s / 2) % song.bass.length];
        this.tone(note(b) / 2, stepDur * 1.8, 'triangle', 0.35, 0, t, this.bgmGain);
      }
      const m = song.mel[s % song.mel.length];
      if (m >= 0) this.tone(note(m + 7), stepDur * 1.4, this.bgm === 'lobby' ? 'sine' : 'square', this.bgm === 'lobby' ? 0.22 : 0.07, 0, t, this.bgmGain);
      if (this.bgm !== 'lobby') {
        if (s % 4 === 0) { this.tone(120, 0.15, 'sine', 0.5, 40, t, this.bgmGain); }
        if (s % 4 === 2) this.noiseTo(0.08, 0.15, t);
        if (this.bgm === 'fever' || this.bgm === 'boss') this.noiseTo(0.03, 0.06, t, 8000);
      }
      this.nextTime += stepDur;
      this.step++;
    }
  },
  noiseTo(dur, vol, delay, freq = 2000) {
    const ac = this.ac;
    const t = ac.currentTime + delay;
    const s = ac.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.bgmGain);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
};
