// 코어: 캔버스, 입력, 에셋 로더, 그리기 도우미, 즉시모드 UI
'use strict';
const W = 1080, H = 1920;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;

function fitCanvas() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  canvas.style.width = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', fitCanvas);
fitCanvas();

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const fmt = n => Math.floor(n).toLocaleString('en-US');
const shortNum = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : fmt(n);

// ---------- 에셋 ----------
const IMG = {};
function loadImages(map, onProgress) {
  const keys = Object.keys(map);
  let done = 0;
  return Promise.all(keys.map(k => new Promise(res => {
    const im = new Image();
    im.onload = () => { IMG[k] = im; done++; onProgress && onProgress(done / keys.length); res(); };
    im.onerror = () => { console.warn('이미지 로드 실패', map[k]); done++; res(); };
    im.src = map[k];
  })));
}

// ---------- 그리기 ----------
function img(key, x, y, w, h, alpha) {
  const im = IMG[key];
  if (!im) return;
  if (alpha !== undefined) { ctx.save(); ctx.globalAlpha *= alpha; }
  ctx.drawImage(im, x, y, w === undefined ? im.width : w, h === undefined ? im.height : h);
  if (alpha !== undefined) ctx.restore();
}
// 가운데 기준, 비율 유지하며 box에 맞춤
function imgFit(key, cx, cy, maxW, maxH, alpha) {
  const im = IMG[key];
  if (!im) return;
  const s = Math.min(maxW / im.width, maxH / im.height);
  img(key, cx - im.width * s / 2, cy - im.height * s / 2, im.width * s, im.height * s, alpha);
}
// 9-slice: 원화 가장자리를 보존하며 확대
function nine(key, x, y, w, h, b = 60, k = 0.5) {
  const im = IMG[key];
  if (!im) return;
  const iw = im.width, ih = im.height;
  const db = Math.min(b * k, w / 2, h / 2);
  const sx = [0, b, iw - b, iw], sy = [0, b, ih - b, ih];
  const dx = [x, x + db, x + w - db, x + w], dy = [y, y + db, y + h - db, y + h];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const sw = sx[i + 1] - sx[i], sh = sy[j + 1] - sy[j];
    const dw = dx[i + 1] - dx[i], dh = dy[j + 1] - dy[j];
    if (sw > 0 && sh > 0 && dw > 0 && dh > 0) ctx.drawImage(im, sx[i], sy[j], sw, sh, dx[i], dy[j], dw + 0.5, dh + 0.5);
  }
}
const FONT = '"NK", "Noto Sans KR", "Malgun Gothic", sans-serif';
function text(s, x, y, o = {}) {
  const size = o.size || 36;
  ctx.save();
  ctx.font = `${o.weight || 800} ${size}px ${FONT}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.base || 'middle';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.maxW) {
    const m = ctx.measureText(s).width;
    if (m > o.maxW) { ctx.translate(x, y); ctx.scale(o.maxW / m, 1); ctx.translate(-x, -y); }
  }
  if (o.stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = o.sw || Math.max(4, size * 0.18);
    ctx.strokeStyle = o.stroke;
    ctx.strokeText(s, x, y);
  }
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.blur || 16; }
  ctx.fillStyle = o.color || '#5a3a22';
  ctx.fillText(s, x, y);
  ctx.restore();
}
function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function bar(x, y, w, h, ratio, fillKey) {
  nine('ui.progress-track', x, y, w, h, 60, h / 138 * 1.2);
  ratio = clamp(ratio, 0, 1);
  if (ratio <= 0) return;
  const pad = h * 0.16;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + pad, y, (w - pad * 2) * ratio, h);
  ctx.clip();
  nine(fillKey, x + pad, y + pad, w - pad * 2, h - pad * 2, 45, (h - pad * 2) / 99 * 1.2);
  ctx.restore();
}

// ---------- 입력 & 즉시모드 버튼 ----------
const Input = { x: 0, y: 0, down: false, click: null, clicks: [], downPos: null, handlers: null };
function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
canvas.addEventListener('pointerdown', e => {
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 합성 이벤트 등 */ }
  Audio2.unlock();
  const p = toLogical(e);
  Object.assign(Input, p, { down: true, downPos: p });
  Input.handlers && Input.handlers.onDown && Input.handlers.onDown(p);
});
canvas.addEventListener('pointermove', e => {
  const p = toLogical(e);
  Input.x = p.x; Input.y = p.y;
  Input.handlers && Input.handlers.onMove && Input.handlers.onMove(p);
});
function endPointer(e) {
  if (!Input.down) return;
  const p = toLogical(e);
  Input.down = false;
  let consumed = false;
  if (Input.handlers && Input.handlers.onUp) consumed = Input.handlers.onUp(p) === true;
  if (!consumed && Input.downPos && Math.hypot(p.x - Input.downPos.x, p.y - Input.downPos.y) < 40) Input.clicks.push({ x: p.x, y: p.y, down: Input.downPos });
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', e => { Input.down = false; });

// 버튼: 그리고, 이번 프레임에 클릭되었으면 true
const UI = {
  layer: 0, // 모달 레이어: 현재 활성 레이어의 버튼만 반응
  active: 0,
  hit(x, y, w, h) {
    if (this.layer !== this.active) return false;
    const r = { x, y, w, h };
    if (Input.click && inRect(Input.click, r) && inRect(Input.click.down || Input.click, r)) {
      Input.click = null;
      return true;
    }
    return false;
  },
  pressed(x, y, w, h) {
    return this.layer === this.active && Input.down && inRect(Input, { x, y, w, h }) && Input.downPos && inRect(Input.downPos, { x, y, w, h });
  },
  button(x, y, w, h, label, o = {}) {
    const color = o.color || 'yellow';
    const disabled = o.disabled;
    const pr = !disabled && this.pressed(x, y, w, h);
    const state = disabled ? 'disabled' : pr ? 'pressed' : 'normal';
    const sc = pr ? 0.95 : 1;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    if (o.pulse && !disabled) {
      const p = 1 + Math.sin(performance.now() / 180) * 0.025;
      ctx.translate(cx, cy); ctx.scale(p, p); ctx.translate(-cx, -cy);
    }
    nine(`ui.button-${color}-${state}`, x, y, w, h, 58, Math.min(1, h / 134 * 1.05));
    let tx = cx;
    if (o.icon) {
      const is = o.iconSize || h * 0.5;
      const lw = label ? Math.min(w - is - 60, label.length * (o.size || h * 0.3)) : 0;
      const ix = label ? cx - (is + lw) / 2 - 6 : cx - is / 2;
      imgFit(o.icon, ix + is / 2, cy - h * 0.03, is, is, disabled ? 0.5 : 1);
      tx = ix + is + 10 + lw / 2;
    }
    if (label) {
      text(label, tx, cy - h * 0.035 + (o.sub ? -h * 0.12 : 0), { size: o.size || Math.min(h * 0.32, 44), color: disabled ? '#9a8f84' : (o.textColor || '#5a3a22'), maxW: w - 50 - (o.icon ? h * 0.5 : 0) });
      if (o.sub) text(o.sub, tx, cy + h * 0.17, { size: (o.size || h * 0.3) * 0.72, color: disabled ? '#9a8f84' : '#7a5636', maxW: w - 60 });
    }
    ctx.restore();
    if (o.badge) {
      ctx.save();
      ctx.fillStyle = '#ff5a5a';
      ctx.beginPath(); ctx.arc(x + w - 14, y + 16, 14, 0, 7); ctx.fill();
      ctx.restore();
    }
    if (disabled) {
      if (this.hit(x, y, w, h) && o.onDisabled) o.onDisabled();
      return false;
    }
    const hit = this.hit(x, y, w, h);
    if (hit) Audio2.sfx('click');
    return hit;
  },
  panel(x, y, w, h, color = 'cream') {
    nine(`ui.panel-${color}`, x, y, w, h, 90, 0.55);
  },
};

// ---------- 토스트 ----------
const Toast = {
  items: [],
  show(msg, color = '#fff') { this.items.push({ msg, t: 0, color }); if (this.items.length > 3) this.items.shift(); },
  update(dt) { this.items.forEach(i => i.t += dt); this.items = this.items.filter(i => i.t < 2); },
  draw() {
    this.items.forEach((it, i) => {
      const a = it.t < 0.2 ? it.t / 0.2 : it.t > 1.6 ? (2 - it.t) / 0.4 : 1;
      const y = 520 + i * 90 - easeOut(Math.min(1, it.t * 4)) * 30;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(50,30,20,0.82)';
      ctx.font = `800 38px ${FONT}`;
      const w = ctx.measureText(it.msg).width + 80;
      rrect(W / 2 - w / 2, y - 36, w, 72, 36); ctx.fill();
      ctx.restore();
      text(it.msg, W / 2, y, { size: 38, color: it.color, alpha: a });
    });
  },
};
