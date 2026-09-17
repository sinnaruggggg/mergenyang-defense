// 전투 씬: 머지 보드 + 보급 레일 + 자동 전투 + 보스 패턴 + 피버
'use strict';
const BOARD = { cols: 7, rows: 5, ox: 83, oy: 876, cw: 128, ch: 128, px: 131, py: 150 };
const GROUND = 640;
const RAIL = { x: 25, y: 678, w: 1030, h: 150, cy: 757, x0: 270, x1: 880 };
const SMITH_POS = { x: 160, y: 1760 };
const IDLE_K = { warrior: 1, tank: 1, archer: 1, healer: 1, wizard: 1, smith: 1 };
// 공격 프레임(V4)은 대기 프레임(V3)과 원화 배율이 다르고 준비·타격 프레임끼리도 달라, 프레임별로 몸통 실루엣을 맞춘 보정값
// [[준비 배율, 가로 이동], [타격 배율, 가로 이동]] (512px 캔버스 기준)
const ATK_FIT = {
  'cat-warrior': [[1.06, -32], [1.19, -20]], 'cat-tank': [[1.12, 4], [1.04, -16]], 'cat-archer': [[0.98, -8], [0.93, -8]],
  'cat-healer': [[1.11, -4], [1.11, -4]], 'cat-wizard': [[1.08, 8], [1.04, 4]], 'cat-smith': [[0.95, -12], [0.96, 20]],
};
function drawCatAttack(atkId, frame, x, y, S, o) {
  const [k, dx] = (ATK_FIT[atkId] || [[1, 0], [1, 0]])[frame];
  drawSprite(`atk.${atkId}.${frame}`, x + dx * S * (o && o.flip ? -1 : 1), y, S * k, o);
}
// 보급 레일: 양 끝은 원본 그대로, 가운데 칸(원본 x 270~420)만 비율 유지하며 반복
function drawRailImage(x, y, w, h) {
  const im = IMG['ui.supply-rail'];
  if (!im) return;
  const s = h / im.height, L = 270, R = 420;
  const lw = L * s, rw = (im.width - R) * s;
  const n = Math.max(1, Math.round((w - lw - rw) / ((R - L) * s)));
  const uw = (w - lw - rw) / n;
  ctx.drawImage(im, 0, 0, L, im.height, x, y, lw + 0.5, h);
  for (let i = 0; i < n; i++) ctx.drawImage(im, L, 0, R - L, im.height, x + lw + i * uw, y, uw + 0.5, h);
  ctx.drawImage(im, R, 0, im.width - R, im.height, x + w - rw, y, rw, h);
}

function cellRect(i) {
  const c = i % BOARD.cols, r = Math.floor(i / BOARD.cols);
  return { x: BOARD.ox + c * BOARD.px, y: BOARD.oy + r * BOARD.py, w: BOARD.cw, h: BOARD.ch };
}
function cellCenter(i) { const r = cellRect(i); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
function cellAt(p) {
  const gx = (BOARD.px - BOARD.cw) / 2, gy = (BOARD.py - BOARD.ch) / 2;
  const c = Math.floor((p.x - BOARD.ox + gx) / BOARD.px), r = Math.floor((p.y - BOARD.oy + gy) / BOARD.py);
  if (c < 0 || r < 0 || c >= BOARD.cols || r >= BOARD.rows) return -1;
  return r * BOARD.cols + c;
}
function neighbors(i) {
  const c = i % BOARD.cols, r = Math.floor(i / BOARD.cols), out = [];
  if (c > 0) out.push(i - 1);
  if (c < BOARD.cols - 1) out.push(i + 1);
  if (r > 0) out.push(i - BOARD.cols);
  if (r < BOARD.rows - 1) out.push(i + BOARD.cols);
  return out;
}
function drawSprite(key, x, y, S, o = {}) {
  const im = IMG[key];
  if (!im) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.gray) ctx.filter = 'grayscale(1) brightness(0.9)';
  ctx.drawImage(im, -256 * S, -472 * S, 512 * S, 512 * S);
  if (o.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, o.flash);
    ctx.drawImage(im, -256 * S, -472 * S, 512 * S, 512 * S);
  }
  ctx.restore();
}
function drawItem(item, cx, cy, scale = 1, alpha = 1) {
  if (item.kind === 'chest') { imgFit('icon.chest', cx, cy, 96 * scale, 86 * scale, alpha); return; }
  imgFit(`item.${item.line}.${item.tier}`, cx, cy, 112 * scale, 84 * scale, alpha);
}
let ITEM_UID = 1;
const newItem = (line, tier) => ({ uid: ITEM_UID++, kind: 'item', line, tier, pop: 0.35, flyT: 0 });

class Battle {
  constructor(opts) {
    this.mode = opts.mode; // 'stage' | 'tower' | 'boss'
    this.ch = opts.ch || 0;
    this.st = opts.st || 0;
    this.floor = opts.floor || 1;
    this.g = this.mode === 'stage' ? this.ch * STAGES_PER_CHAPTER + this.st : this.mode === 'tower' ? this.floor * 1.6 : 6 + Save.power() / 900;
    this.scale = stageScale(this.g);
    this.itemPower = 1 + this.g * 0.07;
    this.tutorial = this.mode === 'stage' && this.ch === 0 && this.st === 0 && !Save.data.tutorialDone ? 0 : -1;

    const S = Save.data;
    const forge = id => Save.up('forge', id), smith = id => Save.up('smith', id);
    this.energyMax = 40 + forge('energyMax') * 6;
    this.energy = this.energyMax;
    this.regenEvery = 2.6 - forge('energyRegen') * 0.16;
    this.regenT = 0;
    this.autoEvery = forge('autoMerge') ? 14 - forge('autoMerge') : 0;
    this.autoT = 0;
    this.tier2Chance = forge('startTier') * 0.08;
    this.doubleChance = smith('double') * 0.06;
    const wr = smith('weaponRate') * 1.5;
    this.lineRates = { weapon: 35 + wr, armor: 30 + wr, consumable: 25 - wr, special: 10 - wr };
    this.feverDur = 8 + smith('fever');
    this.railSpeed = this.ch === 2 && this.mode === 'stage' ? 650 : 1500;

    this.board = Array.from({ length: 35 }, () => ({ item: null, frozen: 0 }));
    this.drag = null;
    this.rail = [];
    this.projs = [];
    this.enemies = [];
    this.cats = [];
    this.chainQueue = [];
    this.combo = 0; this.comboT = 0;
    this.feverGauge = 0; this.feverMax = 12; this.feverT = 0; this.feverCount = 0;
    this.smithT = 0;
    this.time = 0;
    this.kills = 0; this.killGold = 0; this.totalDamage = 0;
    this.lastTarget = null;
    this.paused = false;
    this.result = null;
    this.emergency = null;
    this.bannerT = 0; this.banner = null;
    this.bossCut = null;
    this.produced = 0;
    this.legendShow = null;
    this.hintT = 0;

    // 편성
    const squad = S.squad.slice(0, 2);
    const order = squad.slice().sort((a, b) => (CATS[b].melee ? 1 : 0) - (CATS[a].melee ? 1 : 0));
    const xs = [420, 190];
    order.forEach((id, i) => {
      const d = CATS[id], mul = catMul(S.cats[id]);
      this.cats.push({
        id, d, x: xs[i], homeX: xs[i], y: GROUND, baseHp: d.hp * mul, baseAtk: d.atk * mul, hp: d.hp * mul, maxHp: d.hp * mul,
        weapon: 0, armor: 0, cd: rand(0.2, 0.6), state: 'idle', animT: 0, down: 0, flash: 0, buffT: 0, poisonT: 0, poisonDps: 0,
        rageT: 0, shockT: 0, healT: 1.5, lunge: 0, bob: Math.random() * 6, sq: 0,
      });
    });

    // 보드 초기 배치
    if (this.tutorial === 0) {
      this.board[16].item = newItem('weapon', 1);
      this.board[18].item = newItem('weapon', 1);
    } else {
      const start = [['weapon', 1], ['weapon', 1], ['armor', 1], ['armor', 1], ['consumable', 1], ['special', 1], ['weapon', 2]];
      const cells = [...Array(35).keys()].sort(() => Math.random() - 0.5);
      start.forEach(([l, t], i) => this.board[cells[i]].item = newItem(l, t));
      this.board[cells[7]].item = { uid: ITEM_UID++, kind: 'chest', pop: 0.35, flyT: 0 };
    }

    this.buildWaves();
    this.state = 'intro';
    this.stateT = 0;
    this.waveIdx = -1;
    this.spawnQ = [];
    this.spawnT = 0;
    this.boss = null;
  }

  // ---------- 웨이브 구성 ----------
  buildWaves() {
    this.waves = [];
    if (this.mode === 'boss') {
      const key = WORLD_BOSS_ORDER[Math.floor(Date.now() / (7 * 86400000)) % 4];
      this.worldBoss = key;
      this.timeLimit = 90;
      this.waves.push({ boss: key, minions: [] });
      return;
    }
    if (this.mode === 'tower') {
      const pool = CHAPTERS[Math.min(4, Math.floor((this.floor - 1) / 3))].enemies.concat(CHAPTERS[(this.floor) % 5].enemies);
      for (let w = 0; w < 3; w++) this.waves.push({ list: Array.from({ length: 3 + w + Math.floor(this.floor / 2) }, () => pick(pool)) });
      if (this.floor % 5 === 0) this.waves.push({ boss: CHAPTERS[(this.floor / 5 - 1) % 5].boss, mid: true, minions: [pick(pool), pick(pool)] });
      else this.waves.push({ elite: pick(pool), minions: [pick(pool), pick(pool), pick(pool)] });
      return;
    }
    const chap = CHAPTERS[this.ch];
    const n = 3 + Math.floor(this.st / 4);
    for (let w = 0; w < 3; w++) {
      const list = [];
      for (let i = 0; i < n + w * 2; i++) list.push(this.st < 2 ? chap.enemies[0] : pick(chap.enemies));
      this.waves.push({ list });
    }
    const s = this.st + 1;
    if (s === STAGES_PER_CHAPTER) this.waves.push({ boss: chap.boss, minions: [chap.enemies[0], chap.enemies[1]] });
    else if (s % 5 === 0) this.waves.push({ boss: chap.boss, mid: true, minions: [chap.enemies[0]] });
    else this.waves.push({ elite: pick(chap.enemies), minions: [chap.enemies[0], chap.enemies[0]] });
  }

  stageName() {
    if (this.mode === 'boss') return '월드보스 도전';
    if (this.mode === 'tower') return `무한의 탑 ${this.floor}층`;
    return `${this.ch + 1}-${this.st + 1} ${CHAPTERS[this.ch].name}`;
  }

  startWave(i) {
    this.waveIdx = i;
    const w = this.waves[i];
    this.state = 'wave';
    this.stateT = 0;
    if (w.boss) {
      this.spawnQ = w.minions.slice();
      this.spawnT = 3.2;
      this.spawnBoss(w);
    } else if (w.elite) {
      this.spawnQ = w.minions.slice();
      this.spawnT = 1.5;
      this.spawnEnemy(w.elite, { elite: true });
      this.showBanner('정예 몬스터 등장!', '#ffb347');
      Audio2.sfx('warn');
    } else {
      this.spawnQ = w.list.slice();
      this.spawnT = 0.2;
      this.showBanner(`WAVE ${i + 1}`, '#fff');
      Audio2.sfx('wave');
    }
  }
  showBanner(s, color = '#fff', sub = '') { this.banner = { s, color, sub }; this.bannerT = 1.6; }

  spawnEnemy(key, o = {}) {
    const d = ENEMIES[key];
    // 초반 웨이브는 장비가 없으니 약하게, 뒤로 갈수록 강하게
    const wm = [0.45, 0.75, 1][this.waveIdx] ?? 1;
    const hpMul = this.scale.hp * (o.elite ? 7 : 1) * wm;
    const e = {
      key, d, name: (o.elite ? '정예 ' : '') + d.name, x: o.x || rand(1160, 1240), y: GROUND - (d.fly ? 150 : 0) + rand(-8, 8),
      hp: d.hp * hpMul, maxHp: d.hp * hpMul, atk: d.atk * this.scale.atk * (o.elite ? 2.2 : 1) * wm, cd: rand(0.5, 1),
      state: 'walk', animT: 0, flash: 0, S: d.s * (o.elite ? 1.45 : 1), speed: d.speed * rand(0.9, 1.1), knock: 0, bob: Math.random() * 6,
      shield: !!d.shield, elite: !!o.elite, spawnT: 0.3, atkKey: d.atkId, ranged: d.ranged || 0, fly: !!d.fly, armorR: d.armor || 0,
    };
    this.enemies.push(e);
    if (o.elite) { this.bossBar = e; }
    return e;
  }

  spawnBoss(w) {
    const d = BOSSES[w.boss];
    const hp = d.world ? 1e12 : d.hp * this.scale.hp * (w.mid ? 0.45 : 1) * (this.mode === 'tower' ? 0.8 : 1);
    const b = {
      key: w.boss, d, boss: true, world: !!d.world, name: (w.mid ? '부하 ' : '') + d.name, x: 1300, y: GROUND - (d.fly ? 120 : 0),
      hp, maxHp: hp, atk: d.atk * this.scale.atk * (w.mid ? 0.7 : 1), cd: 2.5, state: 'enter', animT: 0, flash: 0,
      S: d.s * (w.mid ? 0.8 : 1), speed: 260, knock: 0, bob: 0, shield: false, shieldHp: 0, atkKey: d.atkId, ranged: d.ranged || 0,
      fly: !!d.fly, armorR: 0, patternT: 9, thresholds: d.world ? [] : w.mid ? [0.5] : [0.7, 0.3], mid: !!w.mid, riddle: null, stun: 0, rageT: 0, dash: null,
      patterns: w.mid ? [d.patterns[0]] : d.patterns, rageCount: 0,
    };
    this.boss = b;
    this.bossBar = b;
    this.enemies.push(b);
    // 보스 등장 연출
    this.bossCut = { t: 0, name: b.name, tip: d.tip };
    FX.shake(28);
    FX.flash('#3a0a14', 0.5);
    Audio2.sfx('roar');
    Audio2.playBgm('boss');
  }

  // ---------- 보드 ----------
  emptyCells() { return this.board.map((c, i) => (!c.item && !c.frozen ? i : -1)).filter(i => i >= 0); }
  rollLine() {
    const r = Math.random() * 100;
    let acc = 0;
    for (const l of LINES) { acc += this.lineRates[l]; if (r < acc) return l; }
    return 'weapon';
  }
  produce(free = false) {
    if (this.result || this.tutorial === 0 || this.tutorial === 1) return;
    if (!free && this.energy < 1) { Toast.show('에너지가 부족해요!', '#ffd36b'); Audio2.sfx('full'); return; }
    const empty = this.emptyCells();
    if (!empty.length) {
      if (!free) { Toast.show('보드가 가득 찼어요! 먼저 합성하세요', '#ffb3a8'); Audio2.sfx('full'); this.boardShake = 0.3; }
      return;
    }
    if (!free) this.energy -= 1;
    this.smithT = 0.36;
    Audio2.sfx('produce');
    FX.sparks(210, 1840, '#ffcf5a', 14, -Math.PI / 2, 1.6);
    const count = Math.random() < this.doubleChance ? 2 : 1;
    for (let k = 0; k < count && empty.length; k++) {
      const idx = empty.splice(Math.floor(Math.random() * empty.length), 1)[0];
      this.produced++;
      let item;
      if (this.produced % 18 === 0) item = { uid: ITEM_UID++, kind: 'chest', pop: 0, flyT: 0 };
      else item = newItem(this.rollLine(), Math.random() < this.tier2Chance ? 2 : 1);
      this.recordTier(item);
      item.flyT = 0.32 + k * 0.08; item.flyMax = item.flyT; item.pop = 0;
      this.board[idx].item = item;
    }
    if (this.tutorial === 2) { this.tutProduced = (this.tutProduced || 0) + 1; if (this.tutProduced >= 3) this.advanceTutorial(); }
  }
  canUse(i) { const c = this.board[i]; return c.item && !c.frozen && !(c.item.flyT > 0); }

  mergeInto(fromItem, j, isChain, depth = 0) {
    const cell = this.board[j], it = cell.item;
    it.tier += 1;
    it.pop = 0.4;
    this.recordTier(it);
    const c = cellCenter(j);
    // 콤보
    this.combo = this.comboT > 0 ? this.combo + 1 : 1;
    this.comboT = 2.5;
    this.addFever(isChain ? 2 : 1);
    const col = LINE_COLOR[it.line];
    FX.sprite('ui.merge-glow', c.x, c.y, 250, 258, { life: 0.45, scale0: 0.4, scale1: 1.3, add: true });
    FX.burst(c.x, c.y, col, 18, 700, 12, 0.45);
    FX.stars(c.x, c.y, 5, 380, 34);
    FX.ring(c.x, c.y, col, 150, 0.35, 14);
    if (isChain) {
      Audio2.sfx('chain', depth + this.combo);
      FX.number(c.x, c.y - 40, `연쇄 x${depth + 1}!`, { size: 54, color: '#fff27a', stroke: '#8a3a00', life: 1 });
      FX.shake(6 + depth * 3);
    } else {
      Audio2.sfx('merge', this.combo);
      if (this.combo >= 2) FX.number(c.x, c.y - 30, `${this.combo} COMBO`, { size: 40, color: '#ffe8a8', stroke: '#6a3a10' });
      FX.shake(3);
    }
    // 인접 상자 열기
    for (const n of neighbors(j)) {
      const ci = this.board[n].item;
      if (ci && ci.kind === 'chest' && !(ci.flyT > 0)) {
        const nc = cellCenter(n);
        this.board[n].item = newItem(pick(LINES), randi(2, 3));
        FX.burst(nc.x, nc.y, '#ffe27a', 24, 800, 14, 0.5);
        FX.stars(nc.x, nc.y, 8, 450, 40);
        FX.number(nc.x, nc.y - 30, '상자 오픈!', { size: 40, color: '#ffe27a' });
        Audio2.sfx('chest');
      }
    }
    if (it.tier === MAX_TIER && !Save.data.codex[it.line]) {
      Save.data.codex[it.line] = true;
      Save.save();
      this.legendShow = { item: { ...it }, t: 0 };
      Audio2.sfx('legend');
      FX.flash('#fff6c8', 0.9);
    }
    if (it.tier < MAX_TIER) this.chainQueue.push({ cell: j, t: 0.24, depth: depth + 1, uid: it.uid });
    if (this.tutorial === 0) this.advanceTutorial();
  }
  // 같은 아이템 연결 그룹 (4방향)
  group(j, line, tier, exclude) {
    const seen = new Set([j]), q = [j];
    while (q.length) {
      const i = q.shift();
      for (const n of neighbors(i)) {
        if (seen.has(n) || n === exclude || !this.canUse(n)) continue;
        const it = this.board[n].item;
        if (it.kind === 'item' && it.line === line && it.tier === tier) { seen.add(n); q.push(n); }
      }
    }
    return [...seen];
  }
  processChains(dt) {
    for (const c of this.chainQueue) c.t -= dt;
    const ready = this.chainQueue.filter(c => c.t <= 0);
    this.chainQueue = this.chainQueue.filter(c => c.t > 0);
    for (const c of ready) {
      const it = this.board[c.cell].item;
      if (!it || it.uid !== c.uid || it.tier >= MAX_TIER || this.board[c.cell].frozen || (this.drag && this.drag.item === it)) continue;
      const n = neighbors(c.cell).find(n => this.canUse(n) && (!this.drag || this.drag.from !== n) && this.board[n].item.kind === 'item' && this.board[n].item.line === it.line && this.board[n].item.tier === it.tier);
      if (n === undefined) continue;
      const from = cellCenter(n), to = cellCenter(c.cell);
      const moving = this.board[n].item;
      this.board[n].item = null;
      FX.p({ x: from.x, y: from.y, img: `item.${moving.line}.${moving.tier}`, size: 90, life: 0.14, vx: (to.x - from.x) / 0.14, vy: (to.y - from.y) / 0.14, drag: 1, add: false, shrink: false });
      this.mergeInto(moving, c.cell, true, c.depth);
    }
  }
  recordTier(it) {
    const m = Save.data.maxTier || (Save.data.maxTier = {});
    if (it.kind === 'item' && it.tier > (m[it.line] || 0)) m[it.line] = it.tier;
  }
  modalLayer() { return this.paused || (this.result && this.result.shown) ? 1 : 0; }
  addFever(n) {
    if (this.feverT > 0) return;
    this.feverGauge += n;
    if (this.feverGauge >= this.feverMax) {
      this.feverGauge = 0;
      this.feverT = this.feverDur;
      this.feverCount++;
      Audio2.sfx('fever');
      Audio2.playBgm('fever');
      FX.flash('#ffb03a', 0.55);
      FX.shake(22);
      this.showBanner('FEVER TIME!', '#ffd23a', '공격력 2배 · 광폭화');
      for (const c of this.cats) if (!c.down) { FX.ring(c.x, c.y - 120, '#ffae3a', 260, 0.6, 26); FX.burst(c.x, c.y - 120, '#ffcf5a', 30, 900, 14, 0.7); }
    }
  }

  // ---------- 보급 ----------
  autoTarget(item) {
    const alive = this.cats.filter(c => !c.down);
    const all = this.cats;
    if (!all.length) return null;
    if (item.line === 'special') return null;
    if (item.line === 'consumable') {
      const healer = all.find(c => c.id === 'healer' && !c.down);
      if (healer) return healer;
      const downed = all.find(c => c.down);
      if (downed) return downed;
      return alive.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || all[0];
    }
    const pool = alive.length ? alive : all;
    if (item.line === 'armor') {
      const tank = pool.find(c => c.id === 'tank');
      if (tank && tank.armor < item.tier) return tank;
      return pool.slice().sort((a, b) => a.armor - b.armor || b.x - a.x)[0];
    }
    const dealers = pool.filter(c => c.d.prefer === 'weapon');
    const src = dealers.length ? dealers : pool;
    return src.slice().sort((a, b) => a.weapon - b.weapon)[0];
  }
  catAt(p) {
    return this.cats.find(c => Math.abs(p.x - c.x) < 110 && p.y > c.y - 280 && p.y < c.y + 30);
  }
  supply(item, p, direct) {
    const target = direct || this.autoTarget(item);
    this.lastTarget = target;
    Audio2.sfx('supply');
    if (this.emergency && !this.emergency.supplied) {
      this.emergency.supplied = true;
      FX.slow(0.6, 0.3);
      FX.flash('#fff', 0.5);
      this.showBanner('긴급 보급 성공!', '#7affc1', '반격 준비!');
    }
    if (this.boss && this.boss.riddle && item.line === this.boss.riddle) {
      this.boss.riddle = null;
      this.boss.stun = 2.5;
      FX.burst(this.boss.x, this.boss.y - 200, '#ffe27a', 40, 1000, 16, 0.7);
      this.showBanner('수수께끼 해제!', '#ffe27a', '보스가 기절했어요');
      Audio2.sfx('chest');
    }
    const r = { item, x: p.x, y: direct ? p.y : RAIL.cy, target, phase: direct ? 'fly' : 'rail', t: 0 };
    if (direct) { r.sx = p.x; r.sy = p.y; r.flyDur = 0.25; }
    this.rail.push(r);
    if (this.tutorial === 1) this.advanceTutorial();
  }
  updateRail(dt) {
    for (const r of this.rail) {
      r.t += dt;
      if (r.phase === 'rail') {
        r.x += this.railSpeed * dt;
        if (Math.random() < 0.6) FX.p({ x: r.x - 40, y: r.y + rand(-20, 20), vx: -200, vy: 0, size: rand(4, 8), color: LINE_COLOR[r.item.line], life: 0.3 });
        if (r.x >= RAIL.x1) { r.phase = 'fly'; r.sx = r.x; r.sy = r.y; r.t = 0; r.flyDur = 0.42; }
      } else {
        const k = clamp(r.t / r.flyDur, 0, 1);
        const tx = r.target ? r.target.x : 720, ty = r.target ? r.target.y - 130 : 420;
        const mx = (r.sx + tx) / 2, my = Math.min(r.sy, ty) - 220;
        const e = k;
        r.x = (1 - e) * (1 - e) * r.sx + 2 * (1 - e) * e * mx + e * e * tx;
        r.y = (1 - e) * (1 - e) * r.sy + 2 * (1 - e) * e * my + e * e * ty;
        FX.p({ x: r.x, y: r.y, size: rand(8, 14), color: LINE_COLOR[r.item.line], life: 0.35 });
        if (k >= 1) { r.done = true; this.applySupply(r.item, r.target, tx, ty); }
      }
    }
    this.rail = this.rail.filter(r => !r.done);
  }
  applySupply(item, cat, x, y) {
    const v = ITEM_VALUE[item.line](item.tier) * this.itemPower;
    const col = LINE_COLOR[item.line];
    if (item.line === 'special') {
      // 전선 전체 광역 공격
      const dmg = v * (this.feverT > 0 ? 2 : 1);
      FX.flash(item.tier >= 5 ? '#e9f6ff' : '#ffe0f4', 0.35 + item.tier * 0.05);
      FX.shake(10 + item.tier * 4);
      FX.stop(0.05 + item.tier * 0.01);
      FX.ring(x, y, col, 500 + item.tier * 60, 0.6, 40);
      FX.burst(x, y, col, 40 + item.tier * 6, 1400, 18, 0.7);
      FX.stars(x, y, 10, 700, 50);
      Audio2.sfx(item.tier >= 5 ? 'zap' : 'boom');
      if (item.tier >= 4) Audio2.sfx('boom');
      this.enemies.forEach(e => {
        if (item.tier >= 4) FX.bolt(e.x + rand(-40, 40), -40, e.x, e.y - 80, item.tier === 6 ? '#aee8ff' : item.tier === 4 ? '#ff9a4a' : '#d6b8ff');
        this.damageEnemy(e, dmg, { magic: true, crit: item.tier >= 6, special: true });
      });
      FX.number(x, y - 60, `${ITEM_NAMES.special[item.tier - 1]}!`, { size: 58, color: '#fff', stroke: '#7a2aa0', life: 1.1 });
      return;
    }
    if (!cat) return;
    const tank = cat.id === 'tank';
    cat.flash = 1;
    FX.sprite('ui.merge-glow', cat.x, cat.y - 130, 260, 270, { life: 0.45, scale0: 0.5, scale1: 1.2 });
    FX.burst(cat.x, cat.y - 130, col, 26, 800, 13, 0.55);
    FX.ring(cat.x, cat.y - 120, col, 200, 0.4, 16);
    Audio2.sfx('equip');
    if (item.line === 'weapon') {
      if (item.tier > cat.weapon) {
        const refund = cat.weapon ? Math.round(5 * TIER_MUL(cat.weapon)) : 0;
        cat.weapon = item.tier;
        FX.number(cat.x, cat.y - 300, `공격력 +${fmt(v)}`, { size: 50, color: '#ffb36b', stroke: '#5a2010', life: 1.2 });
        if (refund) this.gainGold(refund, cat.x, cat.y - 200);
      } else {
        FX.number(cat.x, cat.y - 300, `이미 더 좋은 무기!`, { size: 38, color: '#fff', stroke: '#5a2010' });
        this.gainGold(Math.round(5 * TIER_MUL(item.tier)), cat.x, cat.y - 200);
      }
    } else if (item.line === 'armor') {
      if (item.tier > cat.armor) {
        const refund = cat.armor ? Math.round(5 * TIER_MUL(cat.armor)) : 0;
        cat.armor = item.tier;
        this.recalcHp(cat);
        FX.number(cat.x, cat.y - 300, `방어력 +${fmt(ITEM_VALUE.armor(item.tier) * (tank ? 1.5 : 1))}`, { size: 50, color: '#8fc4ff', stroke: '#10305a', life: 1.2 });
        if (refund) this.gainGold(refund, cat.x, cat.y - 200);
      } else {
        FX.number(cat.x, cat.y - 300, `이미 더 좋은 방어구!`, { size: 38, color: '#fff', stroke: '#10305a' });
        this.gainGold(Math.round(5 * TIER_MUL(item.tier)), cat.x, cat.y - 200);
      }
    } else if (item.line === 'consumable') {
      const spread = cat.id === 'healer';
      const targets = spread ? this.cats : [cat];
      Audio2.sfx('heal');
      for (const t of targets) {
        const amt = v * (spread ? 1.2 : 1.4);
        if (t.down) { t.down = 0; t.hp = 0; FX.number(t.x, t.y - 340, '부활!', { size: 56, color: '#7affc1', stroke: '#0a4a2a' }); }
        t.hp = Math.min(t.maxHp, t.hp + amt);
        t.poisonT = 0;
        if (item.tier >= 3) t.buffT = 6 + item.tier;
        FX.sprite('ui.healing-aura', t.x, t.y - 120, 300, 290, { life: 0.8, scale0: 0.7, scale1: 1.2 });
        FX.number(t.x, t.y - 260, `+${fmt(amt)}`, { size: 50, color: '#7affc1', stroke: '#0a4a2a' });
        for (let i = 0; i < 10; i++) FX.p({ x: t.x + rand(-80, 80), y: t.y - rand(0, 100), vy: rand(-300, -120), vx: 0, size: rand(6, 11), color: '#9dffb5', life: 0.8, drag: 0.97 });
      }
      if (item.tier >= 3) FX.number(cat.x, cat.y - 330, '공격 버프!', { size: 40, color: '#fff27a', stroke: '#5a3a00' });
    }
  }
  recalcHp(c) {
    const tank = c.id === 'tank';
    const extra = c.armor ? ITEM_VALUE.armor(c.armor) * this.itemPower * 6 * (tank ? 1.5 : 1) : 0;
    const newMax = c.baseHp + extra;
    c.hp += newMax - c.maxHp;
    c.maxHp = newMax;
    c.hp = clamp(c.hp, 1, c.maxHp);
  }
  gainGold(n, x, y) {
    this.killGold += n;
    FX.collect(x, y, 'icon.gold', { x: 650, y: 150 }, Math.min(8, 1 + Math.floor(n / 4)), () => Audio2.sfx('coin'), false);
  }

  // ---------- 전투 계산 ----------
  catAtk(c) {
    let a = c.baseAtk + (c.weapon ? ITEM_VALUE.weapon(c.weapon) * this.itemPower * (c.shockT > 0 ? 0.5 : 1) : 0);
    if (this.feverT > 0) a *= 2;
    if (c.buffT > 0) a *= 1.3;
    if (c.rageT > 0) a *= 2;
    return a;
  }
  catDef(c) {
    return (c.d.def || 0) + (c.armor ? ITEM_VALUE.armor(c.armor) * (c.id === 'tank' ? 1.5 : 1) : 0);
  }
  enemyTarget() {
    const alive = this.cats.filter(c => !c.down);
    if (!alive.length) return null;
    return alive.find(c => c.id === 'tank') || alive.sort((a, b) => b.x - a.x)[0];
  }
  damageEnemy(e, dmg, o = {}) {
    if (e.dead || e.state === 'enter') return;
    if (e.shield && !o.magic) dmg *= 0.6;
    if (e.armorR) dmg *= 1 - e.armorR;
    if (e.boss) {
      if (e.d.meleeHalf && o.melee) dmg *= 0.5;
      if (e.d.harden) dmg *= Math.max(0.35, 1 - this.time / 140);
      if (e.riddle) dmg *= 0.1;
      if (e.shieldHp > 0) {
        const sd = dmg * (o.magic ? 2 : 1);
        e.shieldHp -= sd;
        FX.burst(e.x, e.y - 200, '#8fe3ff', 6, 400, 8, 0.3);
        if (e.shieldHp <= 0) {
          e.shieldHp = 0;
          FX.ring(e.x, e.y - 200, '#8fe3ff', 400, 0.5, 30);
          FX.shake(18);
          this.showBanner('보호막 파괴!', '#8fe3ff');
          Audio2.sfx('boom');
        }
        FX.number(e.x, e.y - e.S * 380, Math.round(sd), { size: 36, color: '#aee8ff', stroke: '#10304a' });
        return;
      }
    }
    dmg = Math.max(1, dmg * rand(0.92, 1.08));
    e.hp -= dmg;
    this.totalDamage += dmg;
    e.flash = 1;
    if (!e.boss) e.knock = Math.min(40, e.knock + (o.crit ? 40 : 14));
    const top = e.y - (e.boss ? 330 : 200) * e.S;
    const big = o.crit || o.special;
    FX.number(e.x + rand(-20, 20), top, Math.round(dmg), {
      size: big ? 64 : 42,
      color: this.feverT > 0 ? '#ffdf4a' : o.crit ? '#ffe14a' : o.magic ? '#e7c4ff' : '#ffffff',
      stroke: o.crit ? '#8a1a00' : '#3a1a10',
      vy: big ? -380 : -260,
      glow: this.feverT > 0 ? '#ff8a00' : undefined,
    });
    if (o.crit) { FX.shake(8); FX.stop(0.045); FX.number(e.x, top - 60, 'CRITICAL!', { size: 34, color: '#ff6a3a', stroke: '#fff', life: 0.7 }); }
    if (e.boss && e.hp > 0 && !e.world) {
      const ratio = e.hp / e.maxHp;
      if (e.thresholds.length && ratio <= e.thresholds[0]) { e.thresholds.shift(); this.bossPattern(e); }
    }
    if (e.hp <= 0 && !e.world) this.killEnemy(e);
  }
  killEnemy(e) {
    e.dead = true;
    e.deadT = 0;
    this.kills++;
    const gold = Math.round((e.d.gold || 30) * (1 + this.g * 0.08) * (e.elite ? 6 : 1) * (e.boss ? (e.mid ? 8 : 20) : 1));
    if (e.boss) {
      // 보스 처치: 슬로모션 → 폭발 → 골드 폭발 → 상자
      FX.slow(1.6, 0.2);
      FX.flash('#ffffff', 1);
      FX.shake(45);
      FX.punch(e.x, e.y - 200, 0.6);
      Audio2.sfx('bigboom');
      for (let i = 0; i < 5; i++) setTimeout(() => { FX.burst(e.x + rand(-120, 120), e.y - rand(80, 320), pick(['#ffcf5a', '#ff8a4c', '#fff']), 40, 1200, 20, 0.8); Audio2.sfx('boom'); }, i * 160);
      FX.ring(e.x, e.y - 200, '#ffe27a', 700, 0.8, 50);
      this.killGold += gold;
      FX.collect(e.x, e.y - 200, 'icon.gold', { x: 650, y: 150 }, 30, () => Audio2.sfx('coin'), false);
      FX.p({ x: e.x, y: e.y - 300, vx: -150, vy: -700, g: 1800, img: 'icon.chest', size: 150, life: 3, add: false, shrink: false, floor: GROUND - 60, fade: false });
      this.spawnQ = [];
      this.emergency = null;
      this.enemies.filter(o => o !== e && !o.dead).forEach(o => this.killEnemy(o));
      this.bossBar = null;
    } else {
      Audio2.sfx('die');
      FX.burst(e.x, e.y - 80, '#fff4d8', 16, 600, 12, 0.45);
      FX.smoke(e.x, e.y - 40, 5);
      FX.sparks(e.x, e.y - 80, '#ffd36b', 8, -Math.PI / 2, 2.5);
      this.gainGold(gold, e.x, e.y - 80);
      if (e.elite) { FX.shake(20); FX.slow(0.4, 0.3); this.bossBar = null; }
    }
    this.addFeverKill();
  }
  addFeverKill() { if (this.feverT <= 0) this.feverGauge = Math.min(this.feverMax - 0.01, this.feverGauge + 0.15); }
  damageCat(c, dmg, o = {}) {
    if (c.down) return;
    dmg = dmg * 100 / (100 + this.catDef(c));
    c.hp -= dmg;
    c.flash = 0.8;
    c.sq = 0.12;
    FX.number(c.x + rand(-20, 20), c.y - 240, Math.round(dmg), { size: 36, color: '#ff6a6a', stroke: '#fff', vy: -200 });
    if (c.hp <= 0) {
      c.hp = 0;
      c.down = 12;
      FX.burst(c.x, c.y - 100, '#ffffff', 20, 600, 12, 0.5);
      FX.shake(16);
      Audio2.sfx('meow');
      FX.number(c.x, c.y - 300, `${c.d.name} 쓰러짐!`, { size: 40, color: '#ffb3a8', stroke: '#4a1010', life: 1.3 });
    }
  }

  // ---------- 보스 패턴 ----------
  bossPattern(b) {
    if (this.emergency || this.result) return;
    const p = pick(b.patterns);
    this.emergency = { t: 2.2, max: 2.2, pattern: p, boss: b, supplied: false };
    Audio2.sfx('warn');
    FX.flash('#ff2a2a', 0.25);
    const label = { summon: '쥐 떼 소환!', charge: '돌진 공격!', poison: '독 안개!', riddle: '수수께끼 버프!', freeze: '보드 빙결!', armorbreak: '방어구 파괴!', suck: '아이템 흡입!', shieldup: '보호막 전개!', shock: '전기 충격!', rage: '광폭화!' }[p];
    this.showBanner(label, '#ff6a5a', '긴급 보급으로 대응하세요!');
  }
  execPattern(em) {
    const b = em.boss, ok = em.supplied;
    if (b.dead) return;
    if (ok) { for (const c of this.cats) if (!c.down) { c.rageT = 3.5; FX.ring(c.x, c.y - 120, '#7affc1', 220, 0.5, 20); } }
    const chapEnemies = this.mode === 'stage' ? CHAPTERS[this.ch].enemies : ['rat', 'roach'];
    switch (em.pattern) {
      case 'summon':
        for (let i = 0; i < (ok ? 2 : 4); i++) { const e = this.spawnEnemy(pick(chapEnemies), { x: b.x + rand(-40, 80) }); e.spawnT = 0.5; }
        FX.smoke(b.x, b.y - 30, 12);
        Audio2.sfx('roar');
        break;
      case 'charge': {
        const t = this.enemyTarget();
        if (!t) break;
        b.dash = { t: 0, from: b.x, to: t.x + 170, hit: false, ok };
        break;
      }
      case 'poison':
        if (!ok) for (const c of this.cats) { c.poisonT = 6; c.poisonDps = b.atk * 0.55; }
        for (let i = 0; i < 40; i++) FX.p({ x: rand(0, 700), y: rand(300, 650), vx: rand(-60, 60), vy: rand(-40, 40), size: rand(40, 90), color: 'rgba(160,90,220,0.35)', life: rand(1, 2), add: false, grow: true, drag: 0.98 });
        Audio2.sfx('fire');
        break;
      case 'riddle':
        b.riddle = pick(LINES);
        FX.ring(b.x, b.y - 200, LINE_COLOR[b.riddle], 300, 0.6, 30);
        this.showBanner(`${LINE_NAME[b.riddle]} 라인만 통해요!`, LINE_COLOR[b.riddle], `${LINE_NAME[b.riddle]} 아이템을 보급하면 해제`);
        break;
      case 'freeze': {
        const cells = [...Array(35).keys()].filter(i => !this.board[i].frozen).sort(() => Math.random() - 0.5).slice(0, ok ? 2 : 6);
        cells.forEach(i => { this.board[i].frozen = 7; const c = cellCenter(i); FX.burst(c.x, c.y, '#bfefff', 10, 400, 10, 0.4); });
        if (this.drag && cells.includes(this.drag.from)) this.cancelDrag();
        Audio2.sfx('freeze');
        FX.flash('#bfefff', 0.4);
        break;
      }
      case 'armorbreak':
        if (!ok) for (const c of this.cats) if (c.armor > 0) { c.armor--; this.recalcHp(c); FX.number(c.x, c.y - 300, '방어구 파괴!', { size: 42, color: '#8fc4ff', stroke: '#10203a' }); FX.sparks(c.x, c.y - 100, '#bfd8ff', 16); }
        FX.shake(20); Audio2.sfx('crit');
        break;
      case 'suck': {
        const cells = [...Array(35).keys()].filter(i => this.canUse(i) && (!this.drag || this.drag.from !== i)).sort(() => Math.random() - 0.5).slice(0, ok ? 1 : 3);
        cells.forEach(i => {
          const it = this.board[i].item, c = cellCenter(i);
          this.board[i].item = null;
          const key = it.kind === 'chest' ? 'icon.chest' : `item.${it.line}.${it.tier}`;
          FX.p({ x: c.x, y: c.y, img: key, size: 90, life: 5, add: false, shrink: false, fade: false, target: { x: b.x, y: b.y - 150 }, delay: 0, flyTime: 0.6, curve: rand(-100, 100) });
        });
        FX.number(W / 2, 1250, `아이템 ${cells.length}개 흡입!`, { size: 54, color: '#ff8a7a', stroke: '#3a0a0a' });
        Audio2.sfx('supply');
        break;
      }
      case 'shieldup':
        b.shieldHp = b.maxHp * (ok ? 0.06 : 0.14);
        b.shieldMax = b.shieldHp;
        FX.ring(b.x, b.y - 200, '#8fe3ff', 320, 0.6, 30);
        Audio2.sfx('freeze');
        break;
      case 'shock':
        if (!ok) for (const c of this.cats) { c.shockT = 6; FX.bolt(b.x, b.y - 200, c.x, c.y - 120, '#fff27a'); }
        Audio2.sfx('zap'); FX.flash('#fff27a', 0.4);
        break;
      case 'rage':
        b.rageT = ok ? 3 : 7;
        FX.flash('#ff2a2a', 0.4); FX.shake(25); Audio2.sfx('roar');
        break;
    }
  }

  // ---------- 튜토리얼 ----------
  advanceTutorial() {
    this.tutorial++;
    if (this.tutorial === 3) {
      this.tutorial = -1;
      this.showBanner('몬스터가 몰려와요!', '#fff', '합성하고 보급해서 막아내요');
      this.state = 'break'; this.stateT = 0; this.breakDur = 2;
    }
  }

  // ---------- 입력 ----------
  onDown(p) {
    if (this.paused || this.result || this.legendShow) return;
    const i = cellAt(p);
    if (i >= 0 && this.canUse(i)) {
      if (this.tutorial === 2) return;
      const it = this.board[i].item;
      this.drag = { from: i, item: it, x: p.x, y: p.y, moved: false };
      Audio2.sfx('pick');
    }
  }
  onMove(p) {
    if (!this.drag) return;
    this.drag.x = p.x; this.drag.y = p.y;
    if (Input.downPos && Math.hypot(p.x - Input.downPos.x, p.y - Input.downPos.y) > 20) this.drag.moved = true;
  }
  cancelDrag() { this.drag = null; }
  onUp(p) {
    const d = this.drag;
    if (!d) return false;
    this.drag = null;
    const from = d.from;
    if (this.board[from].item !== d.item) return true; // 드래그 중 사라짐
    if (!d.moved) {
      const it = d.item;
      if (it.kind === 'chest') Toast.show('옆에서 합성하면 상자가 열려요!');
      else Toast.show(`${ITEM_NAMES[it.line][it.tier - 1]} Lv.${it.tier} · ${LINE_NAME[it.line]}`);
      return true;
    }
    // 보급: 레일 또는 전장
    if (p.y < RAIL.y + RAIL.h + 10 && p.y > 150 && d.item.kind === 'item') {
      if (this.tutorial === 0) return true;
      const cat = p.y < RAIL.y ? this.catAt(p) : null;
      if (d.item.line !== 'special' && cat === undefined && p.y < RAIL.y) { /* 빈 전장: 자동 보급 */ }
      this.board[from].item = null;
      this.supply(d.item, p, d.item.line !== 'special' ? cat : null);
      return true;
    }
    const j = cellAt(p);
    if (j < 0 || j === from) { Audio2.sfx('drop'); return true; }
    const tc = this.board[j];
    if (tc.frozen) { Toast.show('얼어붙은 칸이에요!', '#bfefff'); return true; }
    if (tc.item && tc.item.flyT > 0) return true;
    if (this.tutorial === 1) return true;
    const a = d.item, b = tc.item;
    if (!b) {
      tc.item = a; this.board[from].item = null; a.pop = 0.2; Audio2.sfx('drop');
    } else if (a.kind === 'item' && b.kind === 'item' && a.line === b.line && a.tier === b.tier && a.tier < MAX_TIER) {
      this.board[from].item = null;
      // 5개 합성: 같은 아이템 5개 이상 연결 시 상위 2개
      const grp = this.group(j, b.line, b.tier, from);
      const baseTier = b.tier;
      if (grp.length >= 4) {
        const extra = grp.filter(g => g !== j).slice(0, 3);
        const bonus = extra[0];
        extra.forEach(g => {
          const c0 = cellCenter(g), c1 = cellCenter(j);
          FX.p({ x: c0.x, y: c0.y, img: `item.${b.line}.${baseTier}`, size: 90, life: 0.16, vx: (c1.x - c0.x) / 0.16, vy: (c1.y - c0.y) / 0.16, drag: 1, add: false, shrink: false });
          this.board[g].item = null;
        });
        const c = cellCenter(j);
        FX.number(c.x, c.y - 70, '5개 합성! 보너스!', { size: 56, color: '#ffe27a', stroke: '#7a3a00', life: 1.3 });
        FX.flash('#fff3c0', 0.3);
        this.mergeInto(a, j, false);
        const bi = newItem(b.line, baseTier + 1);
        this.recordTier(bi);
        this.board[bonus].item = bi;
        const bc = cellCenter(bonus);
        FX.burst(bc.x, bc.y, LINE_COLOR[b.line], 20, 700, 12, 0.5);
        this.addFever(2);
        if (bi.tier < MAX_TIER) this.chainQueue.push({ cell: bonus, t: 0.3, depth: 1, uid: bi.uid });
      } else {
        this.mergeInto(a, j, false);
      }
    } else {
      // 교환
      tc.item = a; this.board[from].item = b; a.pop = 0.2; b.pop = 0.2;
      Audio2.sfx('drop');
    }
    return true;
  }

  // ---------- 업데이트 ----------
  update(rawDt) {
    if (this.paused || this.result && this.result.shown) { FX.update(rawDt); return; }
    if (this.legendShow) {
      this.legendShow.t += rawDt;
      FX.update(rawDt);
      if (this.legendShow.t > 2.4) this.legendShow = null;
      return;
    }
    if (FX.hitstop > 0) { FX.hitstop -= rawDt; FX.update(rawDt * 0.2); return; }
    const dt = rawDt * FX.timeScale();
    this.time += this.state === 'intro' || this.state === 'tutorial' ? 0 : dt;
    if (this.bannerT > 0) this.bannerT -= rawDt;
    if (this.bossCut) { this.bossCut.t += rawDt; if (this.bossCut.t > 2.4) this.bossCut = null; }
    if (this.comboT > 0) this.comboT -= rawDt;
    if (this.smithT > 0) this.smithT -= rawDt;
    if (this.boardShake > 0) this.boardShake -= rawDt;

    // 보드 상태
    for (const c of this.board) {
      if (c.frozen > 0) { c.frozen -= dt; if (c.frozen <= 0) c.frozen = 0; }
      if (c.item) { if (c.item.pop > 0) c.item.pop -= rawDt; if (c.item.flyT > 0) { c.item.flyT -= rawDt; if (c.item.flyT <= 0) { c.item.pop = 0.3; Audio2.sfx('pop'); } } }
    }
    this.processChains(rawDt);

    // 에너지
    if (this.energy < this.energyMax) {
      this.regenT += dt;
      if (this.regenT >= this.regenEvery) { this.regenT = 0; this.energy++; }
    } else this.regenT = 0;
    if (this.autoEvery && this.tutorial < 0 && !this.result) {
      this.autoT += dt;
      if (this.autoT >= this.autoEvery) { this.autoT = 0; this.produce(true); }
    }

    // 피버
    if (this.feverT > 0) {
      this.feverT -= dt;
      if (Math.random() < 0.5) FX.p({ x: rand(0, W), y: GROUND + 20, vx: 0, vy: rand(-500, -250), size: rand(5, 10), color: pick(['#ffcf5a', '#ff8a4c', '#fff27a']), life: 0.8, drag: 0.98 });
      if (this.feverT <= 0) Audio2.playBgm(this.boss && !this.boss.dead ? 'boss' : 'battle');
    }

    // 긴급 보급
    if (this.emergency) {
      this.emergency.t -= dt;
      if (this.emergency.t <= 0) { const em = this.emergency; this.emergency = null; this.execPattern(em); }
    }

    this.updateFlow(dt);
    this.updateRail(dt);
    this.updateCats(dt);
    this.updateEnemies(dt);
    this.updateProjs(dt);
    FX.update(dt);
    this.checkEnd(rawDt);
  }

  updateFlow(dt) {
    this.stateT += dt;
    if (this.state === 'intro') {
      if (this.stateT > 1.4) {
        if (this.tutorial === 0) this.state = 'tutorial';
        else this.startWave(0);
      }
      return;
    }
    if (this.state === 'break') {
      if (this.stateT >= (this.breakDur || 8)) this.startWave(this.waveIdx + 1);
      return;
    }
    if (this.state !== 'wave') return;
    if (this.spawnQ.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawnEnemy(this.spawnQ.shift()); this.spawnT = rand(0.9, 1.5); }
    }
    const alive = this.enemies.some(e => !e.dead);
    if (!alive && !this.spawnQ.length && this.waveIdx >= 0) {
      if (this.waveIdx >= this.waves.length - 1) {
        if (!this.result) this.result = { win: true, t: 0 };
      } else {
        this.state = 'break';
        this.stateT = 0;
        this.breakDur = 8;
        Audio2.sfx('wave');
      }
    }
  }

  updateCats(dt) {
    const fever = this.feverT > 0;
    for (const c of this.cats) {
      c.flash = Math.max(0, c.flash - dt * 4);
      c.sq = Math.max(0, c.sq - dt);
      c.lunge = Math.max(0, c.lunge - dt * 120);
      for (const k of ['buffT', 'rageT', 'shockT']) if (c[k] > 0) c[k] -= dt;
      // 앞줄이 쓰러지면 뒷줄이 전진, 근접은 사거리 밖 적에게 돌진
      const front = this.cats[0];
      let wantX = c !== front && front.down ? front.homeX : c.homeX;
      if (c.d.melee && !c.down && c.state !== 'atk' && !this.findTarget(c)) {
        // 걸어오는 적은 기다리고, 멀리 멈춰 선 적(원거리 등)에게만 돌진
        const near = this.enemies.filter(e => !e.dead && e.state !== 'enter' && e.x < 1060).sort((a, b) => a.x - b.x)[0];
        if (near && near.state !== 'walk') wantX = Math.min(near.x - c.d.range + 30, 820);
      }
      if (c.state !== 'atk' && Math.abs(c.x - wantX) > 2) c.x += Math.sign(wantX - c.x) * Math.min(Math.abs(wantX - c.x), 320 * dt);
      if (c.down) {
        c.down -= dt;
        if (c.down <= 0) {
          c.down = 0; c.hp = c.maxHp * 0.4;
          FX.burst(c.x, c.y - 100, '#7affc1', 20, 500, 12, 0.5);
          FX.number(c.x, c.y - 300, '다시 일어났다냥!', { size: 38, color: '#7affc1', stroke: '#0a3a2a' });
        }
        continue;
      }
      if (c.poisonT > 0) {
        c.poisonT -= dt;
        c.hp -= c.poisonDps * dt;
        if (Math.random() < 0.15) FX.p({ x: c.x + rand(-50, 50), y: c.y - rand(40, 200), vy: -120, size: rand(8, 14), color: '#b36bff', life: 0.6 });
        if (c.hp <= 0) this.damageCat(c, 1);
      }
      // 힐러: 주기적 회복
      if (c.id === 'healer') {
        c.healT -= dt;
        if (c.healT <= 0) {
          c.healT = 2.6;
          const t = this.cats.filter(o => !o.down && o.hp < o.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          if (t) {
            const amt = c.d.heal * catMul(Save.data.cats.healer) * (1 + this.g * 0.06);
            t.hp = Math.min(t.maxHp, t.hp + amt);
            FX.sprite('ui.healing-aura', t.x, t.y - 120, 260, 250, { life: 0.6 });
            FX.number(t.x, t.y - 250, `+${fmt(amt)}`, { size: 34, color: '#7affc1', stroke: '#0a3a2a' });
          }
        }
      }
      c.animT += dt;
      if (c.state === 'atk') {
        const prep = 0.22 / (fever ? 1.5 : 1), strike = 0.14 / (fever ? 1.5 : 1);
        if (!c.struck && c.animT >= prep) { c.struck = true; c.lunge = c.d.melee ? 40 : 14; this.catStrike(c); }
        if (c.animT >= prep + strike) { c.state = 'idle'; c.animT = 0; }
        continue;
      }
      c.cd -= dt * (fever ? 1.5 : 1) * (c.rageT > 0 ? 1.4 : 1);
      if (c.cd <= 0) {
        const target = this.findTarget(c);
        if (target) {
          c.state = 'atk'; c.animT = 0; c.struck = false; c.target = target;
          c.cd = c.d.cd;
        } else c.cd = 0.1;
      }
    }
  }
  findTarget(c) {
    let best = null;
    for (const e of this.enemies) {
      if (e.dead || e.state === 'enter' || e.x > 1070) continue;
      const dist = e.x - c.x;
      const reach = c.d.melee ? c.d.range + (e.boss ? 250 * e.S : 40) : c.d.range;
      if (dist < -60 || dist > reach) continue;
      if (!best || e.x < best.x) best = e;
    }
    return best;
  }
  catStrike(c) {
    const e = c.target;
    if (!e || e.dead) return;
    const crit = Math.random() < c.d.crit + (this.feverT > 0 ? 0.15 : 0);
    const dmg = this.catAtk(c) * (crit ? 2.2 : 1);
    const ex = e.x - 30, ey = e.y - 140 * e.S - 30;
    if (c.d.melee) {
      this.damageEnemy(e, dmg, { crit, melee: true });
      FX.sprite('ui.sword-arc', ex - 20, ey, 260 * (crit ? 1.3 : 1), 250 * (crit ? 1.3 : 1), { life: 0.24, rot: rand(-0.3, 0.3), scale0: 0.7, scale1: 1.1, add: false });
      FX.sparks(ex, ey, crit ? '#fff27a' : '#ffe0a8', crit ? 16 : 8, 0, 1.4);
      Audio2.sfx(crit ? 'crit' : 'slash');
      Audio2.sfx('hit');
      if (c.id === 'tank') FX.ring(ex, ey, '#ffe0a8', 120, 0.25, 12);
    } else if (c.id === 'archer') {
      this.projs.push({ kind: 'arrow', x: c.x + 90, y: c.y - 150, target: e, speed: 2400, dmg, crit, color: '#fff2c0' });
      Audio2.sfx('arrow');
    } else if (c.id === 'wizard') {
      this.projs.push({ kind: 'fire', x: c.x + 110, y: c.y - 200, target: e, speed: 1300, dmg, crit, magic: true, aoe: c.d.aoe, color: '#ff8a3a' });
      Audio2.sfx('fire');
    } else if (c.id === 'healer') {
      this.projs.push({ kind: 'holy', x: c.x + 100, y: c.y - 170, target: e, speed: 1500, dmg, crit, magic: true, color: '#9dffb5' });
    }
  }
  updateProjs(dt) {
    for (const p of this.projs) {
      const t = p.target;
      const tx = t ? t.x - 20 : p.x + 100, ty = t ? t.y - 140 * t.S : p.y;
      if (t) { p.lx = tx; p.ly = ty; }
      const dx = (p.lx ?? tx) - p.x, dy = (p.ly ?? ty) - p.y, d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      p.ang = Math.atan2(dy, dx);
      if (d <= step || (t && t.dead && d < 30)) {
        p.done = true;
        if (p.hostile) this.hostileHit(p);
        else this.projHit(p);
        continue;
      }
      p.x += dx / d * step; p.y += dy / d * step;
      if (p.kind === 'fire') FX.p({ x: p.x, y: p.y, vx: rand(-60, 60), vy: rand(-60, 60), size: rand(14, 24), color: pick(['#ff8a3a', '#ffcf5a', '#ff5a2a']), life: 0.3 });
      else if (p.kind === 'holy') FX.p({ x: p.x, y: p.y, size: rand(8, 14), color: '#9dffb5', life: 0.25 });
      else if (p.kind === 'spore') FX.p({ x: p.x, y: p.y, size: rand(8, 14), color: p.color, life: 0.3 });
      else if (p.kind === 'arrow') FX.p({ x: p.x, y: p.y, size: 4, color: '#fff', life: 0.12 });
    }
    this.projs = this.projs.filter(p => !p.done);
  }
  projHit(p) {
    const e = p.target;
    if (p.aoe) {
      const cx = p.x, cy = p.y;
      FX.burst(cx, cy, '#ff8a3a', 26, 900, 18, 0.5);
      FX.ring(cx, cy, '#ffb35a', p.aoe * 1.2, 0.4, 24);
      FX.smoke(cx, cy, 4, 'rgba(90,60,50,0.5)');
      FX.shake(p.crit ? 12 : 6);
      Audio2.sfx('boom');
      for (const o of this.enemies) if (!o.dead && Math.abs(o.x - cx) < p.aoe) this.damageEnemy(o, p.dmg * (o === e ? 1 : 0.7), { crit: p.crit, magic: true });
      return;
    }
    if (!e || e.dead) return;
    FX.burst(p.x, p.y, p.color, 10, 500, 9, 0.3);
    if (p.kind === 'arrow') FX.sparks(p.x, p.y, '#fff2c0', p.crit ? 14 : 6, 0, 1.2);
    Audio2.sfx(p.crit ? 'crit' : 'hit');
    this.damageEnemy(e, p.dmg, { crit: p.crit, magic: p.magic });
  }
  hostileHit(p) {
    const c = p.target;
    FX.burst(p.x, p.y, p.color, 10, 400, 10, 0.3);
    if (!c || c.down) return;
    this.damageCat(c, p.dmg);
    if (p.poison) { c.poisonT = 3; c.poisonDps = p.dmg * 0.25; }
    Audio2.sfx('enemyhit');
  }

  updateEnemies(dt) {
    const target = this.enemyTarget();
    const melee = this.enemies.filter(e => !e.dead && !e.boss && !e.ranged).sort((a, b) => a.x - b.x);
    melee.forEach((e, i) => e.queue = i);
    for (const e of this.enemies) {
      e.flash = Math.max(0, e.flash - dt * 5);
      if (e.dead) { e.deadT += dt; continue; }
      if (e.spawnT > 0) e.spawnT -= dt;
      e.animT += dt;
      if (e.knock > 0) { e.x += e.knock * dt * 8; e.knock = Math.max(0, e.knock - dt * 200); }
      if (e.boss) { this.updateBoss(e, dt, target); continue; }
      if (!target) { e.state = 'walk'; e.x -= e.speed * dt * 0.3; continue; }
      const stopX = Math.min(980, e.ranged ? target.homeX + e.ranged : target.x + 150 + (e.queue || 0) * 60);
      if (e.state === 'atk') {
        if (!e.struck && e.animT >= 0.22) { e.struck = true; this.enemyStrike(e, target); }
        if (e.animT >= 0.36) { e.state = 'fight'; e.animT = 0; }
        continue;
      }
      if (e.x > stopX) {
        e.state = 'walk';
        e.x -= e.speed * dt;
        if (e.x < stopX) e.x = stopX;
      } else {
        e.state = 'fight';
        e.cd -= dt;
        const inRange = e.ranged ? true : e.x - target.x < 330;
        if (e.cd <= 0 && inRange) { e.state = 'atk'; e.animT = 0; e.struck = false; e.cd = e.d.cd * rand(0.9, 1.2); }
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead || e.deadT < 0.5);
  }
  enemyStrike(e, target) {
    if (e.ranged) {
      this.projs.push({ kind: 'spore', hostile: true, x: e.x - 60, y: e.y - 120 * e.S, target, speed: 1100, dmg: e.atk, poison: e.d.poison, color: e.d.poison ? '#c98bff' : '#b8c4ff' });
    } else {
      this.damageCat(target, e.atk);
      if (e.d.poison) { target.poisonT = 3; target.poisonDps = e.atk * 0.3; }
      FX.sparks(target.x + 60, target.y - 120, '#ffffff', 5, Math.PI, 1);
      Audio2.sfx('enemyhit');
    }
  }
  updateBoss(b, dt, target) {
    if (b.state === 'enter') {
      const home = 590 + 190 * b.S;
      b.x -= 380 * dt;
      if (Math.random() < 0.3) FX.smoke(b.x + 60, b.y, 1);
      if (b.x <= home) { b.x = home; b.homeX = home; b.state = 'fight'; FX.shake(20); FX.smoke(b.x, b.y, 10); Audio2.sfx('boom'); }
      return;
    }
    if (b.stun > 0) { b.stun -= dt; if (Math.random() < 0.2) FX.p({ x: b.x + rand(-60, 60), y: b.y - 360 * b.S, vy: -60, img: 'icon.star', size: 30, life: 0.6, add: false }); return; }
    if (b.rageT > 0) { b.rageT -= dt; if (Math.random() < 0.4) FX.p({ x: b.x + rand(-100, 100), y: b.y - rand(0, 300), vy: -300, size: rand(10, 20), color: '#ff3a2a', life: 0.5 }); }
    // 돌진
    if (b.dash) {
      const d = b.dash;
      d.t += dt;
      if (d.t < 0.35) { b.x = lerp(d.from, d.to, easeOut(d.t / 0.35)); FX.smoke(b.x + 80, b.y, 1); }
      else if (!d.hit) {
        d.hit = true;
        const mult = d.ok ? 0.8 : 2.8;
        for (const c of this.cats) this.damageCat(c, b.atk * mult);
        FX.shake(d.ok ? 15 : 38); FX.stop(0.12); FX.flash('#fff', 0.4);
        FX.ring(b.x - 120, b.y - 100, '#ffe0a8', 400, 0.4, 30);
        FX.sparks(b.x - 120, b.y - 100, '#fff', 30, Math.PI, 2);
        Audio2.sfx('bigboom');
        if (d.ok) FX.number(b.x - 150, b.y - 350, '방어 성공!', { size: 56, color: '#7affc1', stroke: '#0a3a2a' });
      } else if (d.t < 1.2) { b.x = lerp(d.to, b.homeX, easeOut((d.t - 0.6) / 0.6 > 0 ? (d.t - 0.6) / 0.6 : 0)); }
      else { b.x = b.homeX; b.dash = null; }
      return;
    }
    // 주기 패턴
    b.patternT -= dt;
    if (b.patternT <= 0) { b.patternT = b.world ? 11 : 13; this.bossPattern(b); }
    if (b.world && b.key === 'dog') {
      const n = Math.floor(this.time / 28);
      if (n > b.rageCount && n <= 3) { b.rageCount = n; this.emergency = null; this.execPattern({ boss: b, pattern: 'rage', supplied: false }); this.showBanner('암흑 광폭화!', '#ff3a2a'); }
    }
    if (!target) return;
    if (b.state === 'atk') {
      if (!b.struck && b.animT >= 0.3) {
        b.struck = true;
        if (b.ranged) this.projs.push({ kind: 'spore', hostile: true, x: b.x - 120, y: b.y - 220 * b.S, target, speed: 1000, dmg: b.atk, poison: true, color: '#b36bff' });
        else {
          this.damageCat(target, b.atk * (b.rageT > 0 ? 1.8 : 1));
          FX.shake(12);
          FX.sparks(target.x + 60, target.y - 120, '#fff', 12, Math.PI, 1.5);
          Audio2.sfx('crit');
        }
      }
      if (b.animT >= 0.5) { b.state = 'fight'; b.animT = 0; }
      return;
    }
    b.cd -= dt * (b.rageT > 0 ? 1.7 : 1);
    if (b.cd <= 0) { b.state = 'atk'; b.animT = 0; b.struck = false; b.cd = b.d.cd; }
  }

  checkEnd(rawDt) {
    if (!this.result) {
      if (this.cats.length && this.cats.every(c => c.down) && this.state !== 'intro') {
        this.result = { win: this.mode === 'boss' || (this.mode === 'tower' && this.floor > 1), t: 0, lost: true };
        FX.slow(1, 0.3);
        Audio2.sfx('lose');
      }
      if (this.mode === 'boss' && this.boss && this.boss.state !== 'enter' && this.time >= this.timeLimit) {
        this.result = { win: true, t: 0 };
      }
    }
    if (this.result && !this.result.shown) {
      this.result.t += rawDt;
      if (this.result.t > (this.result.win && !this.result.lost ? 2.2 : 1.6)) this.finish();
    }
  }

  finish() {
    const r = this.result, S = Save.data;
    r.shown = true;
    r.t = 0;
    Audio2.stopBgm();
    let gold = this.killGold, gems = 0;
    if (this.mode === 'stage') {
      const win = !r.lost;
      r.win = win;
      if (win) {
        const hpRatio = this.cats.reduce((a, c) => a + c.hp, 0) / this.cats.reduce((a, c) => a + c.maxHp, 0);
        const stars = 1 + (hpRatio >= 0.5 ? 1 : 0) + (this.time <= 150 || this.feverCount >= 2 ? 1 : 0);
        r.stars = stars;
        r.checks = [true, hpRatio >= 0.5, this.time <= 150 || this.feverCount >= 2];
        const key = `${this.ch}-${this.st}`;
        const prev = S.stars[key] || 0;
        if (!prev) gems += 5;
        if (stars === 3 && prev < 3) gems += 10;
        S.stars[key] = Math.max(prev, stars);
        gold += 60 + Math.round(this.g * 30);
        S.tutorialDone = true;
      } else gold = Math.round(gold * 0.5);
    } else if (this.mode === 'tower') {
      r.floor = this.floor;
      if (!r.lost) {
        gold += 50 + this.floor * 20;
        if (this.floor > S.towerBest) S.towerBest = this.floor;
      }
      r.win = !r.lost;
    } else {
      r.damage = Math.round(this.totalDamage);
      gold += Math.round(r.damage / 50);
      gems += 3;
      S.bossBest = Math.max(S.bossBest, r.damage);
      S.bossTotal = (S.bossTotal || 0) + r.damage;
      r.win = true;
    }
    r.gold = gold; r.gems = gems;
    S.gold += gold; S.gems += gems;
    S.plays++;
    Save.save();
    if (r.win) {
      Audio2.sfx('win');
      FX.flash('#fff6c8', 0.5);
    }
  }

  // ---------- 그리기 ----------
  draw() {
    const t = performance.now() / 1000;
    ctx.save();
    FX.applyCamera();
    img('bg.battle', 0, 0, W, H);
    if (this.boss && !this.boss.dead && !this.boss.world) {
      ctx.fillStyle = 'rgba(40,10,40,0.18)';
      ctx.fillRect(0, 0, W, 690);
    }
    this.drawField(t);
    ctx.restore();
    this.drawRail(t);
    this.drawBoard(t);
    this.drawBottom(t);
    this.drawHud(t);
    ctx.save();
    FX.applyCamera();
    FX.drawWorld();
    FX.drawTexts();
    ctx.restore();
    this.drawDrag();
    FX.drawParts(true);
    if (this.feverT > 0) this.drawFeverFrame(t);
    this.drawBanners(t);
    this.drawTutorial(t);
    if (this.legendShow) this.drawLegend();
    FX.drawOverlay();
    if (this.paused) this.drawPause();
    if (this.result && this.result.shown) this.drawResult();
  }

  drawField(t) {
    // 그림자
    for (const c of this.cats) img('ui.ground-shadow', c.x - 110, c.y - 18, 220, 40, 0.8);
    for (const e of this.enemies) if (!e.fly) img('ui.ground-shadow', e.x - 150 * e.S, GROUND - 16, 300 * e.S, 36, e.dead ? 0.3 : 0.7);
    // 몬스터 (먼 것부터)
    const list = this.enemies.slice().sort((a, b) => b.x - a.x);
    for (const e of list) this.drawEnemy(e, t);
    for (const c of this.cats) this.drawCat(c, t);
    // 투사체
    for (const p of this.projs) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.kind === 'arrow') {
        ctx.rotate(p.ang || 0);
        ctx.strokeStyle = '#6a4020'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(20, 0); ctx.stroke();
        ctx.fillStyle = '#e8e8f0'; ctx.beginPath(); ctx.moveTo(34, 0); ctx.lineTo(16, -9); ctx.lineTo(16, 9); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255,240,180,0.6)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(-40, 0); ctx.stroke();
      } else {
        ctx.globalCompositeOperation = 'lighter';
        const r = p.kind === 'fire' ? 30 : 20;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
        g.addColorStop(0, '#fff'); g.addColorStop(0.35, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
  }
  drawCat(c, t) {
    let key;
    const S = 0.6;
    let k = 1;
    const atk = c.state === 'atk';
    if (!atk) key = `anim.${c.d.anim}.idle-${Math.floor(t * 2.5 + c.bob) % 2}`;
    const sq = c.sq > 0 ? Math.sin(c.sq / 0.12 * Math.PI) * 0.08 : 0;
    const x = c.x + c.lunge;
    if (c.rageT > 0 || this.feverT > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, c.y - 120, 10, x, c.y - 120, 190);
      g.addColorStop(0, this.feverT > 0 ? 'rgba(255,170,40,0.55)' : 'rgba(120,255,190,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 200, c.y - 320, 400, 400);
      ctx.restore();
    }
    const so = { flash: c.flash, sx: 1 + sq, sy: 1 - sq, gray: !!c.down, alpha: c.down ? 0.55 : 1 };
    if (atk) drawCatAttack(c.d.atkId, c.struck ? 1 : 0, x, c.y, S, so);
    else drawSprite(key, x, c.y, S * k, so);
    if (c.poisonT > 0 && !c.down) { ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#9b4dff'; ctx.beginPath(); ctx.ellipse(x, c.y - 110, 110, 120, 0, 0, 7); ctx.fill(); ctx.restore(); }
    // HP 바와 장비
    const bw = 170, by = c.y - 245;
    bar(x - bw / 2, by, bw, 30, c.hp / c.maxHp, c.hp / c.maxHp > 0.35 ? 'ui.progress-mint' : 'ui.progress-red');
    let ix = x - bw / 2 + 20;
    if (c.weapon) { imgFit(`item.weapon.${c.weapon}`, ix, by - 26, 50, 42); ix += 48; }
    if (c.armor) { imgFit(`item.armor.${c.armor}`, ix, by - 26, 50, 42); ix += 48; }
    if (c.buffT > 0) imgFit('icon.sword', ix, by - 26, 36, 36, 0.6 + 0.4 * Math.sin(t * 10));
    if (c.shockT > 0) text('⚡', x + bw / 2 - 10, by - 26, { size: 34, color: '#ffe14a' });
    if (c.down) {
      text(`${Math.ceil(c.down)}`, x, c.y - 140, { size: 72, color: '#fff', stroke: '#4a1010' });
      text('소모품으로 부활!', x, c.y - 70, { size: 26, color: '#fff', stroke: '#4a1010' });
    }
    // 드래그 대상 표시
    if (this.drag && this.drag.moved && this.drag.item.kind === 'item' && this.drag.item.line !== 'special' && this.catAt(this.drag) === c) {
      ctx.save();
      ctx.strokeStyle = LINE_COLOR[this.drag.item.line]; ctx.lineWidth = 8; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -t * 60;
      ctx.beginPath(); ctx.ellipse(x, c.y - 120, 130, 160, 0, 0, 7); ctx.stroke();
      ctx.restore();
    }
  }
  drawEnemy(e, t) {
    const frame = e.state === 'atk' && e.struck ? 1 : 0;
    const key = `atk.${e.atkKey}.${frame}`;
    let y = e.y, sx = 1, sy = 1, alpha = 1;
    if (e.state === 'walk' || e.state === 'enter') {
      const ph = t * 10 + e.bob;
      y -= Math.abs(Math.sin(ph)) * 14;
      sy = 1 + Math.sin(ph * 2) * 0.03;
    } else if (!e.boss || e.state === 'fight') {
      sy = 1 + Math.sin(t * 4 + e.bob) * 0.02;
    }
    if (e.fly) y += Math.sin(t * 3 + e.bob) * 16;
    if (e.spawnT > 0) { const k = 1 - e.spawnT / 0.3; sx *= k; sy *= k; }
    if (e.dead) { const k = e.deadT / 0.5; alpha = 1 - k; sy *= 1 - k * 0.5; sx *= 1 + k * 0.3; }
    if (e.flash > 0.5) { sx *= 1.05; sy *= 0.94; }
    const lunge = e.state === 'atk' && e.struck ? -25 : 0;
    if (e.boss && e.rageT > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(e.x, y - 200, 20, e.x, y - 200, 330);
      g.addColorStop(0, 'rgba(255,40,40,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(e.x - 340, y - 540, 680, 680);
      ctx.restore();
    }
    drawSprite(key, e.x + lunge, y, e.S, { flash: e.flash, sx, sy, alpha });
    if (e.dead) return;
    if (e.boss && e.shieldHp > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 6);
      ctx.strokeStyle = '#8fe3ff'; ctx.lineWidth = 10; ctx.fillStyle = 'rgba(120,210,255,0.18)';
      ctx.beginPath(); ctx.ellipse(e.x, y - 200 * e.S, 230 * e.S, 250 * e.S, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    if (e.shield && !e.boss) {
      ctx.save(); ctx.globalAlpha = 0.3; ctx.strokeStyle = '#8fe3ff'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(e.x, y - 120 * e.S * 1.6, 150 * e.S * 1.6, 150 * e.S * 1.6, 0, 0, 7); ctx.stroke(); ctx.restore();
    }
    if (e.boss && e.riddle) {
      const bob = Math.sin(t * 5) * 8;
      UI.panel(e.x - 70, y - 480 * e.S - 90 + bob, 140, 120, 'lavender');
      imgFit(`item.${e.riddle}.1`, e.x, y - 480 * e.S - 30 + bob, 90, 70);
    }
    if (e.boss && e.stun > 0) text('기절!', e.x, y - 420 * e.S, { size: 44, color: '#ffe14a', stroke: '#4a2a00' });
    if (!e.boss && !e.elite && e.hp < e.maxHp) {
      const bw = 110 * Math.max(1, e.S * 1.6);
      bar(e.x - bw / 2, y - 250 * e.S - 20, bw, 22, e.hp / e.maxHp, 'ui.progress-red');
    }
    if (this.emergency && this.emergency.boss === e) {
      const k = Math.sin(t * 20) > 0;
      text('!', e.x, y - 470 * e.S, { size: 130, color: k ? '#ff3a2a' : '#ffe14a', stroke: '#fff', weight: 900 });
    }
  }
  drawRail(t) {
    const em = this.emergency;
    drawRailImage(RAIL.x, RAIL.y, RAIL.w, RAIL.h);
    // 흐르는 화살표 빛
    ctx.save();
    ctx.beginPath(); ctx.rect(RAIL.x0, RAIL.y + 58, RAIL.x1 - RAIL.x0 - 50, 42); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const off = (t * (this.ch === 2 && this.mode === 'stage' ? 120 : 300)) % 180;
    for (let x = RAIL.x0 - 180 + off; x < RAIL.x1; x += 180) {
      const g = ctx.createLinearGradient(x, 0, x + 120, 0);
      const c = em ? 'rgba(255,60,40,' : 'rgba(140,255,190,';
      g.addColorStop(0, c + '0)'); g.addColorStop(1, c + '0.35)');
      ctx.fillStyle = g; ctx.fillRect(x, RAIL.y + 58, 120, 42);
    }
    ctx.restore();
    if (em) {
      const a = 0.35 + 0.35 * Math.sin(t * 18);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ff3a2a'; ctx.lineWidth = 12;
      rrect(RAIL.x + 40, RAIL.y + 28, RAIL.w - 80, RAIL.h - 50, 24); ctx.stroke(); ctx.restore();
      text('긴급 보급!', 600, RAIL.cy, { size: 50, color: '#ff4a3a', stroke: '#fff', alpha: 0.6 + 0.4 * Math.sin(t * 18) });
      const k = em.t / em.max;
      ctx.save(); ctx.fillStyle = '#ff4a3a'; ctx.fillRect(RAIL.x0, RAIL.y + 106, (RAIL.x1 - RAIL.x0) * k, 8); ctx.restore();
    }
    UI.panel(28, 704, 227, 89, 'cream');
    text('보급 레일', 141, 748, { size: 34 });
    // 대상 초상화
    let tgt = this.lastTarget, spec = false;
    if (this.drag && this.drag.moved && this.drag.item.kind === 'item') {
      if (this.drag.item.line === 'special') spec = true;
      else tgt = this.catAt(this.drag) || this.autoTarget(this.drag.item);
    }
    const pulse = this.drag && this.drag.moved ? 1 + Math.sin(t * 10) * 0.04 : 1;
    ctx.save(); ctx.translate(886, 755); ctx.scale(pulse, pulse); ctx.translate(-886, -755);
    UI.panel(823, 696, 126, 119, spec ? 'lavender' : 'mint');
    if (spec) imgFit('icon.yarn', 886, 754, 80, 80);
    else if (tgt) imgFit(`char.cat-${tgt.id}`, 886, 754, 100, 96);
    else imgFit('icon.cat', 886, 754, 70, 70, 0.5);
    ctx.restore();
    for (const r of this.rail) {
      const s = r.phase === 'rail' ? 1 : 1 - clamp(r.t / r.flyDur, 0, 1) * 0.4;
      drawItem(r.item, r.x, r.y, 0.85 * s);
    }
  }
  drawBoard(t) {
    ctx.save();
    if (this.boardShake > 0) ctx.translate(Math.sin(this.boardShake * 80) * 10, 0);
    UI.panel(51, 832, 978, 823, 'cream');
    const hover = this.drag && this.drag.moved ? cellAt(this.drag) : -1;
    for (let i = 0; i < 35; i++) {
      const r = cellRect(i), c = this.board[i];
      imgFit('ui.board-cell', r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
      if (i === hover && hover !== this.drag.from) {
        const b = c.item;
        const good = b && b.kind === 'item' && b.line === this.drag.item.line && b.tier === this.drag.item.tier && b.tier < MAX_TIER && !c.frozen;
        if (good) img('ui.merge-glow', r.x - 30, r.y - 30, r.w + 60, r.h + 60, 0.6 + 0.3 * Math.sin(t * 12));
        else { ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff'; rrect(r.x + 6, r.y + 6, r.w - 12, r.h - 12, 18); ctx.fill(); ctx.restore(); }
      }
      const it = c.item;
      if (it && !(this.drag && this.drag.item === it)) {
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2 - 4;
        if (it.flyT > 0) {
          const k = 1 - it.flyT / it.flyMax;
          const x = lerp(SMITH_POS.x, cx, k), y = lerp(SMITH_POS.y, cy, k) - Math.sin(k * Math.PI) * 260;
          drawItem(it, x, y, 0.6 + k * 0.4);
        } else {
          const pop = it.pop > 0 ? 1 + Math.sin((1 - it.pop / 0.4) * Math.PI) * 0.35 : 1;
          // 합성 가능한 짝 표시(드래그 중)
          if (this.drag && this.drag.moved && it.kind === 'item' && it.line === this.drag.item.line && it.tier === this.drag.item.tier && it.tier < MAX_TIER) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 8);
            ctx.fillStyle = LINE_COLOR[it.line]; rrect(r.x + 8, r.y + 8, r.w - 16, r.h - 16, 20); ctx.fill(); ctx.restore();
          }
          if (it.tier >= 6 && it.kind === 'item') {
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 4 + i);
            const g = ctx.createRadialGradient(cx, cy, 5, cx, cy, 70); g.addColorStop(0, '#fff3a0'); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.fillRect(cx - 80, cy - 60, 160, 120); ctx.restore();
          }
          const wob = it.kind === 'chest' ? Math.sin(t * 6 + i) * 0.06 : 0;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(wob); ctx.scale(pop, pop);
          drawItem(it, 0, 0, 0.95);
          ctx.restore();
          if (it.kind === 'item') text(`Lv.${it.tier}`, r.x + r.w - 32, r.y + r.h - 20, { size: 22, color: '#6a4a2a', stroke: '#fff8e8', sw: 6 });
        }
      }
      if (c.frozen > 0) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#bfefff';
        rrect(r.x + 4, r.y + 4, r.w - 8, r.h - 8, 18); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke();
        ctx.restore();
        text(`❄ ${Math.ceil(c.frozen)}`, r.x + r.w / 2, r.y + r.h / 2, { size: 34, color: '#3a7aa0', stroke: '#fff' });
      }
    }
    ctx.restore();
    // 콤보 표시
    if (this.comboT > 0 && this.combo >= 2) {
      const a = Math.min(1, this.comboT);
      const s = 1 + Math.max(0, this.comboT - 2.2) * 1.5;
      ctx.save(); ctx.translate(900, 850); ctx.scale(s, s); ctx.rotate(0.08);
      text(`${this.combo} COMBO!`, 0, 0, { size: 50, color: '#ffe14a', stroke: '#8a3a00', alpha: a, weight: 900 });
      ctx.restore();
    }
  }
  drawBottom(t) {
    // 대장장이
    img('ui.ground-shadow', 44, 1880, 233, 31);
    if (this.smithT > 0) drawCatAttack('cat-smith', this.smithT > 0.18 ? 0 : 1, 160, 1905, 0.58);
    else drawSprite(`anim.smith.idle-${Math.floor(t * 2) % 2}`, 160, 1905, 0.58);
    imgFit('icon.forge', 200, 1850, 150, 110);
    // 생산 버튼
    const noEnergy = this.energy < 1;
    if (UI.button(329, 1726, 386, 162, '생산', { color: 'yellow', sub: '에너지 1', icon: 'icon.paw', size: 50, disabled: this.tutorial === 0 || this.tutorial === 1, pulse: this.tutorial === 2 || (!noEnergy && this.emptyCells().length > 20) })) this.produce();
    // 에너지
    UI.panel(744, 1686, 307, 94, 'dark');
    imgFit('icon.energy', 790, 1733, 60, 60);
    text(`${this.energy} / ${this.energyMax}`, 915, 1733, { size: 44, color: '#fff' });
    if (this.energy < this.energyMax) {
      ctx.save(); ctx.fillStyle = 'rgba(255,230,120,0.8)';
      ctx.fillRect(830, 1765, 190 * (this.regenT / this.regenEvery), 5); ctx.restore();
    }
    // 피버 게이지
    const fr = this.feverT > 0 ? this.feverT / this.feverDur : this.feverGauge / this.feverMax;
    bar(754, 1796, 287, 43, fr, this.feverT > 0 ? 'ui.progress-red' : 'ui.progress-gold');
    text(this.feverT > 0 ? `FEVER ${Math.ceil(this.feverT)}` : '피버', 897, 1818, { size: 28, color: '#fff', stroke: '#6a3a10' });
    if (this.feverGauge / this.feverMax > 0.75 && this.feverT <= 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t * 12);
      ctx.fillStyle = '#ffcf5a'; rrect(754, 1796, 287, 43, 20); ctx.fill(); ctx.restore();
    }
    text(this.autoEvery ? `자동 생산 ${Math.ceil(this.autoEvery - this.autoT)}초` : '', 897, 1872, { size: 26, color: '#fff', stroke: '#4a2a10' });
  }
  drawHud(t) {
    nine('ui.title-banner', 22, 18, 316, 104, 100, 0.45);
    text(this.stageName(), 180, 68, { size: 32, maxW: 260 });
    UI.panel(358, 25, 266, 83, 'dark');
    const wl = this.mode === 'boss' ? 'WORLD BOSS' : `WAVE ${Math.max(1, this.waveIdx + 1)} / ${this.waves.length}`;
    text(wl, 491, 67, { size: 38, color: '#fff' });
    imgFit('icon.clock', 690, 63, 73, 73);
    UI.panel(734, 25, 217, 83, 'dark');
    const tm = this.mode === 'boss' ? Math.max(0, this.timeLimit - this.time) : this.time;
    text(`${String(Math.floor(tm / 60)).padStart(2, '0')}:${String(Math.floor(tm % 60)).padStart(2, '0')}`, 842, 67, { size: 46, color: this.mode === 'boss' && tm < 15 ? '#ff7a6a' : '#fff' });
    if (UI.button(970, 23, 89, 89, '', { color: 'cream', icon: 'icon.pause', iconSize: 54 })) this.paused = true;
    // 골드
    UI.panel(620, 120, 200, 60, 'dark');
    imgFit('icon.gold', 650, 150, 44, 44);
    text(fmt(this.killGold), 740, 150, { size: 32, color: '#ffe27a' });
    // 아군 HP
    const hp = this.cats.reduce((a, c) => a + c.hp, 0), mx = this.cats.reduce((a, c) => a + c.maxHp, 0);
    imgFit('icon.paw', 50, 160, 56, 56);
    text('아군 HP', 90, 160, { size: 34, align: 'left', color: '#fff', stroke: '#4a2a10' });
    bar(35, 183, 435, 45, hp / mx, 'ui.progress-mint');
    text(`${fmt(hp)} / ${fmt(mx)}`, 252, 205, { size: 28, color: '#fff', stroke: '#2a5a3a' });
    // 적 HP
    const b = this.bossBar;
    if (b && !b.dead) {
      if (b.world) {
        text(b.name, 1030, 160, { size: 34, align: 'right', color: '#fff', stroke: '#5a1010' });
        bar(560, 183, 491, 45, 1 - (this.time / this.timeLimit) * 0.15, 'ui.progress-red');
        text(`누적 피해 ${shortNum(this.totalDamage)}`, 805, 205, { size: 28, color: '#fff', stroke: '#5a1010' });
      } else {
        text(b.name, 1030, 160, { size: 34, align: 'right', color: '#fff', stroke: '#5a1010' });
        bar(560, 183, 491, 45, b.hp / b.maxHp, 'ui.progress-red');
        if (b.shieldHp > 0) bar(560, 225, 491, 26, b.shieldHp / b.shieldMax, 'ui.progress-mint');
        text(`${shortNum(Math.max(0, b.hp))} / ${shortNum(b.maxHp)}`, 805, 205, { size: 28, color: '#fff', stroke: '#5a1010' });
      }
    } else if (this.state === 'wave' || this.state === 'break') {
      const rem = this.enemies.filter(e => !e.dead).length + this.spawnQ.length;
      text(this.state === 'break' ? '다음 웨이브 준비' : `남은 몬스터 ${rem}`, 1030, 250, { size: 32, align: 'right', color: '#fff', stroke: '#5a1010' });
    }
    if (this.state === 'break' && this.breakDur > 2) {
      const left = Math.ceil(this.breakDur - this.stateT);
      UI.panel(380, 240, 320, 150, 'mint');
      text(`정비 시간 ${left}`, 540, 282, { size: 38 });
      if (UI.button(430, 308, 220, 66, '바로 시작', { color: 'yellow', size: 28 })) this.stateT = this.breakDur;
    }
  }
  drawDrag() {
    const d = this.drag;
    if (!d || !d.moved) return;
    ctx.save();
    ctx.globalAlpha = 0.9;
    const sc = 1.25 + Math.sin(performance.now() / 100) * 0.03;
    drawItem(d.item, d.x, d.y - 40, sc);
    ctx.restore();
    if (d.item.kind === 'item' && d.y < RAIL.y + RAIL.h + 10) {
      const lbl = d.item.line === 'special' ? '놓으면 광역 공격!' : this.catAt(d) && d.y < RAIL.y ? `${this.catAt(d).d.name}에게 직접 보급` : '보급!';
      text(lbl, d.x, d.y - 120, { size: 36, color: '#fff', stroke: '#4a2a10' });
    }
  }
  drawFeverFrame(t) {
    ctx.save();
    const a = 0.35 + 0.15 * Math.sin(t * 10);
    const g = ctx.createRadialGradient(W / 2, H / 2, 600, W / 2, H / 2, 1200);
    g.addColorStop(0, 'rgba(255,150,30,0)'); g.addColorStop(1, `rgba(255,110,20,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const s = 1 + Math.sin(t * 8) * 0.05;
    ctx.save(); ctx.translate(170, 290); ctx.scale(s, s); ctx.rotate(-0.08);
    text('FEVER!', 0, 0, { size: 70, color: '#ffe14a', stroke: '#b23a00', weight: 900, shadow: '#ff8a00', blur: 30 });
    ctx.restore();
  }
  drawBanners(t) {
    if (this.state === 'intro') {
      const k = this.stateT / 1.4;
      const x = k < 0.25 ? lerp(-500, W / 2, easeOutBack(k / 0.25)) : k > 0.8 ? lerp(W / 2, W + 600, (k - 0.8) / 0.2) : W / 2;
      ctx.save(); ctx.fillStyle = 'rgba(40,20,10,0.5)'; ctx.fillRect(0, 380, W, 180); ctx.restore();
      text(this.stageName(), x, 440, { size: 64, color: '#fff', stroke: '#5a2a10', weight: 900 });
      text(this.mode === 'stage' ? CHAPTERS[this.ch].rule : this.mode === 'boss' ? '90초 동안 최대한 많은 피해를!' : '끝까지 버텨 보세요!', x, 510, { size: 34, color: '#ffe8b0', stroke: '#5a2a10' });
    }
    if (this.bannerT > 0 && this.banner) {
      const k = 1 - this.bannerT / 1.6;
      const s = k < 0.15 ? easeOutBack(k / 0.15) : 1;
      const a = k > 0.8 ? (1 - k) / 0.2 : 1;
      ctx.save();
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(42,18,10,0)'); g.addColorStop(0.2, 'rgba(42,18,10,0.6)'); g.addColorStop(0.8, 'rgba(42,18,10,0.6)'); g.addColorStop(1, 'rgba(42,18,10,0)');
      ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(0, 285, W, this.banner.sub ? 140 : 100);
      ctx.restore();
      ctx.save(); ctx.translate(W / 2, 335); ctx.scale(s, s);
      text(this.banner.s, 0, 0, { size: 64, color: this.banner.color, stroke: '#3a1a0a', weight: 900, alpha: a });
      ctx.restore();
      if (this.banner.sub) text(this.banner.sub, W / 2, 398, { size: 30, color: '#fff', stroke: '#3a1a0a', alpha: a });
    }
    if (this.bossCut) {
      const k = this.bossCut.t / 2.4;
      const a = k < 0.1 ? k / 0.1 : k > 0.85 ? (1 - k) / 0.15 : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(20,0,10,0.75)';
      ctx.beginPath(); ctx.moveTo(0, 300); ctx.lineTo(W, 250); ctx.lineTo(W, 560); ctx.lineTo(0, 610); ctx.fill();
      ctx.fillStyle = '#ff3a4a'; ctx.fillRect(0, 290, W, 8); ctx.fillRect(0, 600, W, 8);
      const x = lerp(W + 300, W / 2, easeOut(Math.min(1, k * 5))) - k * 60;
      const key = `atk.${BOSSES[this.boss.key].atkId}.0`;
      ctx.restore();
      ctx.save(); ctx.globalAlpha = a;
      drawSprite(key, lerp(-300, 250, easeOut(Math.min(1, k * 4))), 620, 0.75);
      ctx.restore();
      text('WARNING', x + 120, 350, { size: 50, color: '#ff4a5a', weight: 900, alpha: a * (0.6 + 0.4 * Math.sin(t * 20)) });
      text(this.bossCut.name, x + 120, 440, { size: 76, color: '#fff', stroke: '#8a0a1a', weight: 900, alpha: a, maxW: 640 });
      text(this.bossCut.tip, x + 120, 520, { size: 30, color: '#ffd0c0', alpha: a, maxW: 620 });
    }
  }
  drawTutorial(t) {
    if (this.tutorial < 0 || this.state === 'intro') return;
    const msgs = ['같은 아이템을 겹치면 합성돼요!', '합성한 무기를 보급 레일로 끌어 보급!', '생산 버튼으로 새 아이템을 만들어요 (3번)'];
    UI.panel(40, 1606, 700, 104, 'mint');
    text(msgs[this.tutorial], 390, 1658, { size: 32, maxW: 640 });
    let from, to;
    if (this.tutorial === 0) { from = cellCenter(16); to = cellCenter(18); }
    else if (this.tutorial === 1) { const i = this.board.findIndex(c => c.item && c.item.kind === 'item'); from = i >= 0 ? cellCenter(i) : cellCenter(18); to = { x: 600, y: 752 }; }
    else { from = to = { x: 522, y: 1807 }; }
    const k = (t % 1.6) / 1.6;
    const m = k < 0.2 ? 0 : k > 0.8 ? 1 : (k - 0.2) / 0.6;
    const x = lerp(from.x, to.x, easeOut(m)), y = lerp(from.y, to.y, easeOut(m));
    const press = this.tutorial === 2 ? Math.sin(t * 8) * 10 : 0;
    img('ui.tutorial-hand', x - 40, y - 10 + press, 150, 160);
  }
  drawLegend() {
    const L = this.legendShow, k = Math.min(1, L.t / 0.4);
    ctx.save();
    ctx.fillStyle = `rgba(20,10,30,${0.75 * k})`; ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, 800);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      ctx.rotate(Math.PI / 8 + L.t * 0.02);
      ctx.fillStyle = 'rgba(255,220,120,0.12)';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-60, -900); ctx.lineTo(60, -900); ctx.fill();
    }
    ctx.restore();
    ctx.save(); ctx.translate(W / 2, 800); const s = easeOutBack(k) * 3.2; ctx.scale(s, s);
    drawItem(L.item, 0, 0, 1);
    ctx.restore();
    text('전설 등급 제작!', W / 2, 1120, { size: 80, color: '#ffe14a', stroke: '#6a2a00', weight: 900, alpha: k });
    text(`${ITEM_NAMES[L.item.line][MAX_TIER - 1]} · 도감 등록`, W / 2, 1210, { size: 42, color: '#fff', alpha: k });
    if (Math.random() < 0.5) FX.p({ x: rand(200, 880), y: rand(500, 1100), img: 'icon.star', size: rand(20, 50), life: 0.8, vy: -80, add: false, ui: true });
  }
  drawPause() {
    UI.layer = 1;
    ctx.save(); ctx.fillStyle = 'rgba(30,15,10,0.6)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    UI.panel(170, 560, 740, 760, 'cream');
    imgFit('icon.pause', W / 2, 700, 120, 120);
    text('잠시 쉬어갈까요?', W / 2, 820, { size: 56 });
    text(this.stageName(), W / 2, 890, { size: 32, color: '#8a6a4a' });
    if (UI.button(290, 950, 500, 120, '계속하기', { color: 'yellow' })) this.paused = false;
    if (UI.button(290, 1080, 500, 110, '다시 시작', { color: 'mint' })) Game.startBattle(this.restartOpts());
    if (UI.button(290, 1200, 500, 100, '전투 나가기', { color: 'peach' })) { Game.go('lobby'); }
    UI.layer = 0;
  }
  restartOpts() { return { mode: this.mode, ch: this.ch, st: this.st, floor: this.mode === 'tower' ? 1 : this.floor, free: this.mode !== 'stage' }; }
  drawResult() {
    UI.layer = 1;
    const r = this.result;
    r.t += 1 / 60;
    const k = Math.min(1, r.t / 0.4);
    ctx.save(); ctx.fillStyle = `rgba(30,15,10,${0.65 * k})`; ctx.fillRect(0, 0, W, H); ctx.restore();
    const y0 = lerp(H, 380, easeOutBack(k));
    const win = r.win && !(this.mode === 'stage' && r.lost);
    UI.panel(110, y0, 860, 1180, win ? 'cream' : 'lavender');
    if (win) {
      imgFit('ui.victory-laurel', W / 2, y0 + 130, 560, 350);
      const title = this.mode === 'boss' ? '도전 완료!' : this.mode === 'tower' ? (r.lost ? `${r.floor - 1}층 돌파!` : `${r.floor}층 돌파!`) : '승리했어요!';
      text(title, W / 2, y0 + 140, { size: 76, color: '#fff', stroke: '#8a4a10', weight: 900 });
    } else {
      imgFit('char.cat-healer', W / 2, y0 + 150, 300, 260);
      text('다시 도전해 볼까요?', W / 2, y0 + 300, { size: 60, color: '#fff', stroke: '#4a2a5a', weight: 900 });
    }
    let y = y0 + 360;
    if (this.mode === 'stage' && win) {
      for (let i = 0; i < 3; i++) {
        const st = r.t - 0.5 - i * 0.35;
        const on = i < r.stars;
        if (st > 0 && !r['s' + i]) { r['s' + i] = true; if (on) { Audio2.sfx('star', i); FX.stars(W / 2 + (i - 1) * 190, y + 20, 10, 500, 50, true); } }
        const s = st > 0 ? easeOutBack(Math.min(1, st / 0.3)) : 0;
        ctx.save(); ctx.translate(W / 2 + (i - 1) * 190, y + 20 - (i === 1 ? 30 : 0)); ctx.scale(s, s);
        ctx.globalAlpha = on ? 1 : 0.3;
        if (!on) ctx.filter = 'grayscale(1)';
        img('icon.star', -80, -80, 160, 160);
        ctx.restore();
      }
      y += 140;
      const labels = ['스테이지 클리어', '아군 체력 50% 이상', '150초 내 클리어 또는 피버 2회'];
      labels.forEach((l, i) => {
        imgFit(r.checks[i] ? 'icon.check' : 'icon.close', 260, y + i * 56, 40, 40);
        text(l, 300, y + i * 56, { size: 32, align: 'left', color: r.checks[i] ? '#5a3a22' : '#aa9a8a' });
      });
      y += 190;
    } else if (this.mode === 'boss') {
      text('누적 피해량', W / 2, y + 20, { size: 36, color: '#8a6a4a' });
      const shown = Math.min(1, r.t / 1.5) * r.damage;
      text(fmt(shown), W / 2, y + 100, { size: 96, color: '#e0503a', stroke: '#fff', weight: 900 });
      text(`최고 기록 ${fmt(Save.data.bossBest)}`, W / 2, y + 190, { size: 32, color: '#8a6a4a' });
      y += 290;
    } else if (this.mode === 'tower') {
      text(`최고 기록 ${Save.data.towerBest}층`, W / 2, y + 60, { size: 48 });
      y += 170;
    } else {
      text('고양이를 성장시키거나 합성을 더 빠르게!', W / 2, y + 30, { size: 34, color: '#4a2a5a' });
      text(`팁: ${this.boss ? BOSSES[this.boss.key].tip : '방어구는 뚱냥이에게 1.5배 효과'}`, W / 2, y + 90, { size: 30, color: '#7a4a8a', maxW: 780 });
      y += 190;
    }
    // 보상
    UI.panel(200, y, 680, 130, 'mint');
    const gk = Math.min(1, r.t / 1.2);
    imgFit('icon.gold', 290, y + 65, 70, 70);
    text(fmt(r.gold * gk), 440, y + 65, { size: 48 });
    imgFit('icon.gem', 610, y + 65, 70, 70);
    text(fmt(r.gems * gk), 720, y + 65, { size: 48 });
    y += 170;
    const bx = 200, bw = 680;
    if (this.mode === 'stage') {
      if (win) {
        const hasNext = this.st < STAGES_PER_CHAPTER - 1 || this.ch < CHAPTERS.length - 1;
        if (hasNext && UI.button(bx, y, bw, 130, '다음 스테이지', { color: 'yellow', sub: '에너지 5', pulse: true })) {
          const n = this.st < STAGES_PER_CHAPTER - 1 ? { ch: this.ch, st: this.st + 1 } : { ch: this.ch + 1, st: 0 };
          Game.startBattle({ mode: 'stage', ...n });
        }
      } else if (UI.button(bx, y, bw, 130, '다시 도전', { color: 'yellow', sub: '에너지 5', pulse: true })) Game.startBattle(this.restartOpts());
    } else if (this.mode === 'tower') {
      if (!r.lost) { if (UI.button(bx, y, bw, 130, `${this.floor + 1}층 도전`, { color: 'yellow', pulse: true })) Game.startBattle({ mode: 'tower', floor: this.floor + 1, free: true }); }
      else if (UI.button(bx, y, bw, 130, '1층부터 다시', { color: 'yellow', sub: '에너지 5' })) Game.startBattle({ mode: 'tower', floor: 1 });
    } else if (UI.button(bx, y, bw, 130, '고양이 성장하기', { color: 'yellow' })) Game.go('cats');
    if (UI.button(bx, y + 150, bw, 110, this.mode === 'stage' ? '스테이지 선택' : '모드 선택', { color: 'mint' })) Game.go(this.mode === 'stage' ? 'stages' : 'modes');
    if (UI.button(bx, y + 270, bw, 100, '로비로', { color: 'cream' })) Game.go('lobby');
    UI.layer = 0;
  }
}
