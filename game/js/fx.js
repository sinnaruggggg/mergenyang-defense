// 이펙트: 파티클, 떠오르는 숫자, 화면 흔들림, 히트스톱, 슬로모션, 섬광
'use strict';
const FX = {
  parts: [], texts: [], sprites: [], bolts: [], rings: [],
  shakeAmt: 0, flashColor: '#fff', flashA: 0, hitstop: 0,
  slowT: 0, slowScale: 1, zoom: 1, zoomT: 0, zoomX: W / 2, zoomY: 500,
  clear() { this.parts = []; this.texts = []; this.sprites = []; this.bolts = []; this.rings = []; this.shakeAmt = 0; this.flashA = 0; this.hitstop = 0; this.slowT = 0; this.zoomT = 0; },

  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); },
  flash(color, a = 0.6) { this.flashColor = color; this.flashA = Math.max(this.flashA, a); },
  stop(t) { this.hitstop = Math.max(this.hitstop, t); },
  slow(t, s = 0.25) { this.slowT = t; this.slowScale = s; },
  punch(x, y, t = 0.35) { this.zoomT = t; this.zoomX = x; this.zoomY = y; },
  timeScale() { return this.slowT > 0 ? this.slowScale : 1; },

  // 파티클 기본형
  p(o) {
    if (this.parts.length > 900) this.parts.shift();
    this.parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0.9, life: 0.6, t: 0, size: 10, color: '#fff', add: true, shrink: true, rot: 0, vr: 0 }, o));
  },
  burst(x, y, color, n = 16, speed = 600, size = 12, life = 0.5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(0.3, 1) * speed;
      this.p({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: rand(0.5, 1) * size, color, life: rand(0.6, 1) * life, drag: 0.88 });
    }
  },
  sparks(x, y, color = '#ffd36b', n = 10, dir = 0, spread = Math.PI) {
    for (let i = 0; i < n; i++) {
      const a = dir + rand(-spread / 2, spread / 2), s = rand(400, 1100);
      this.p({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: rand(3, 6), color, life: rand(0.2, 0.45), streak: true, g: 1400, drag: 0.93 });
    }
  },
  stars(x, y, n = 8, spread = 300, size = 40, ui = false) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(0.4, 1) * spread;
      this.p({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 200, g: 600, img: 'icon.star', size: rand(0.5, 1) * size, life: rand(0.5, 0.9), vr: rand(-8, 8), add: false, ui });
    }
  },
  smoke(x, y, n = 6, color = 'rgba(240,225,205,0.45)') {
    for (let i = 0; i < n; i++) this.p({ x: x + rand(-30, 30), y: y + rand(-10, 10), vx: rand(-120, 120), vy: rand(-160, -40), size: rand(14, 28), color, life: rand(0.4, 0.8), add: false, grow: true, drag: 0.92 });
  },
  ring(x, y, color, maxR = 250, life = 0.45, width = 18) { this.rings.push({ x, y, color, maxR, life, t: 0, width }); },
  bolt(x1, y1, x2, y2, color = '#bfe6ff', life = 0.25) {
    const pts = [];
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push({ x: lerp(x1, x2, t) + (i && i < n ? rand(-40, 40) : 0), y: lerp(y1, y2, t) + (i && i < n ? rand(-20, 20) : 0) });
    }
    this.bolts.push({ pts, color, life, t: 0 });
  },
  // 이미지 스프라이트 이펙트(검기, 치유 오라, 합성 빛)
  sprite(key, x, y, w, h, o = {}) {
    this.sprites.push(Object.assign({ key, x, y, w, h, t: 0, life: 0.35, scale0: 0.6, scale1: 1.15, rot: 0, flip: false, add: false }, o));
  },
  number(x, y, value, o = {}) {
    if (this.texts.length > 80) this.texts.shift();
    this.texts.push(Object.assign({ x: x + rand(-25, 25), y, s: typeof value === 'number' ? fmt(value) : value, t: 0, life: 0.9, size: 44, color: '#fff', stroke: '#5a2a18', vy: -260 }, o));
  },

  update(dt) {
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 60);
    this.flashA = Math.max(0, this.flashA - dt * 2.5);
    if (this.slowT > 0) this.slowT -= dt;
    if (this.zoomT > 0) this.zoomT -= dt;
    for (const p of this.parts) {
      p.t += dt;
      p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60);
      p.vy += p.g * dt;
      if (p.target) {
        // 목표 지점으로 빨려 들어감
        const k = clamp((p.t - p.delay) / p.flyTime, 0, 1);
        if (p.t > p.delay) {
          if (p.sx === undefined) { p.sx = p.x; p.sy = p.y; }
          const e = k * k;
          p.x = lerp(p.sx, p.target.x, e) + Math.sin(k * Math.PI) * p.curve;
          p.y = lerp(p.sy, p.target.y, e);
          if (k >= 1 && !p.arrived) { p.arrived = true; p.t = p.life; p.onArrive && p.onArrive(); }
          continue;
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.floor !== undefined && p.y > p.floor) { p.y = p.floor; p.vy *= -0.45; p.vx *= 0.7; }
    }
    this.parts = this.parts.filter(p => p.t < p.life);
    for (const t of this.texts) { t.t += dt; t.y += t.vy * dt; t.vy *= Math.pow(0.9, dt * 60); }
    this.texts = this.texts.filter(t => t.t < t.life);
    for (const s of this.sprites) s.t += dt;
    this.sprites = this.sprites.filter(s => s.t < s.life);
    for (const b of this.bolts) b.t += dt;
    this.bolts = this.bolts.filter(b => b.t < b.life);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter(r => r.t < r.life);
  },

  // 월드 좌표에 있는 이펙트 (흔들림 적용 레이어 안에서 호출)
  drawWorld() {
    for (const s of this.sprites) {
      const k = s.t / s.life, sc = lerp(s.scale0, s.scale1, easeOut(k));
      ctx.save();
      if (s.add) ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.scale(sc * (s.flip ? -1 : 1), sc);
      img(s.key, -s.w / 2, -s.h / 2, s.w, s.h);
      ctx.restore();
    }
    for (const r of this.rings) {
      const k = r.t / r.life;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - k) + 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.maxR * easeOut(k), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    for (const b of this.bolts) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - b.t / b.life;
      for (const [w, c] of [[22, b.color], [7, '#ffffff']]) {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round';
        ctx.shadowColor = b.color; ctx.shadowBlur = 30;
        ctx.beginPath();
        b.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.stroke();
      }
      ctx.restore();
    }
    this.drawParts(false);
  },
  drawParts(ui) {
    for (const p of this.parts) {
      if (!!p.ui !== ui) continue;
      const k = p.t / p.life;
      const a = p.fade === false ? 1 : k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      const size = p.grow ? p.size * (1 + k * 1.5) : p.shrink ? p.size * (1 - k * 0.7) : p.size;
      ctx.save();
      ctx.globalAlpha = a * (p.alpha || 1);
      if (p.img) {
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        img(p.img, -size / 2, -size / 2, size, size);
      } else {
        if (p.add) ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color;
        if (p.streak) {
          ctx.strokeStyle = p.color; ctx.lineWidth = size; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }
  },
  drawTexts() {
    for (const t of this.texts) {
      const k = t.t / t.life;
      const pop = t.t < 0.12 ? lerp(1.8, 1, t.t / 0.12) : 1;
      const a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.save();
      ctx.translate(t.x, t.y); ctx.scale(pop, pop);
      text(t.s, 0, 0, { size: t.size, color: t.color, stroke: t.stroke, alpha: a, weight: 900, shadow: t.glow, blur: 20 });
      ctx.restore();
    }
  },
  drawOverlay() {
    if (this.flashA > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashA;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  },
  applyCamera() {
    if (this.shakeAmt > 0) ctx.translate(rand(-1, 1) * this.shakeAmt, rand(-1, 1) * this.shakeAmt);
    if (this.zoomT > 0) {
      const z = 1 + 0.06 * Math.sin((this.zoomT / 0.35) * Math.PI);
      ctx.translate(this.zoomX, this.zoomY); ctx.scale(z, z); ctx.translate(-this.zoomX, -this.zoomY);
    }
  },
  // 골드·보석이 HUD로 빨려 들어감
  collect(x, y, key, target, n, onEach, ui = true) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(200, 650);
      this.p({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 300, g: 1500, drag: 0.9, img: key, size: rand(38, 52), life: 5, add: false, shrink: false, fade: false,
        target, delay: rand(0.35, 0.7), flyTime: rand(0.35, 0.55), curve: rand(-120, 120), onArrive: onEach, ui, vr: rand(-5, 5) });
    }
  },
};
