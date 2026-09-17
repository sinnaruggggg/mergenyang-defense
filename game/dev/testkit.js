// 개발용 테스트 도구 (게임에는 포함되지 않음)
// 브라우저 콘솔에서: await fetch('dev/testkit.js').then(r => r.text()).then(eval)
window.run = n => { for (let i = 0; i < n; i++) tick(1 / 60); };
window.ptr = (type, x, y) => {
  const r = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new PointerEvent(type, { clientX: r.left + x * r.width / W, clientY: r.top + y * r.height / H, pointerId: 1, bubbles: true }));
};
window.drag = (x1, y1, x2, y2) => { ptr('pointerdown', x1, y1); ptr('pointermove', (x1 + x2) / 2, (y1 + y2) / 2); ptr('pointermove', x2, y2); ptr('pointerup', x2, y2); };
window.tap = (x, y) => { ptr('pointerdown', x, y); ptr('pointerup', x, y); run(1); };

// 단순 자동 플레이: 합성 → 보급 → 생산
window.botStep = () => {
  const b = Game.scene;
  if (!(b instanceof Battle) || b.result) return;
  const cells = b.board.map((c, i) => ({ c, i })).filter(o => o.c.item && o.c.item.kind === 'item' && b.canUse(o.i));
  for (const a of cells) for (const o of cells) {
    if (a.i !== o.i && a.c.item.line === o.c.item.line && a.c.item.tier === o.c.item.tier && a.c.item.tier < 8) {
      const p = cellCenter(a.i), q = cellCenter(o.i);
      drag(p.x, p.y, q.x, q.y);
      return;
    }
  }
  const need = b.emergency || b.emptyCells().length < 6 || b.cats.some(c => c.down || c.hp < c.maxHp * 0.4);
  const hold = Math.min(6, 3 + Math.floor(b.g / 25));
  const bigUp = it => { if (it.line === 'special') return it.tier >= 3 && b.enemies.length >= 3; if (it.line === 'consumable') return b.cats.some(c => c.hp < c.maxHp * 0.6); const t = b.autoTarget(it); return t && t[it.line] < it.tier - 1; };
  const sup = cells.filter(o => o.c.item.tier >= hold || bigUp(o.c.item) || need).sort((x, y) => y.c.item.tier - x.c.item.tier)[0];
  if (sup && b.state === 'wave') { const p = cellCenter(sup.i); drag(p.x, p.y, 600, 752); return; }
  if (b.energy > 0 && b.emptyCells().length) tap(522, 1807);
};
window.botRun = f => { for (let i = 0; i < f; i++) { if (i % 30 === 0) botStep(); tick(1 / 60); } };

// 지정 웨이브까지 빠르게 건너뛰기
window.skipTo = w => {
  const b = Game.scene;
  for (let i = 0; i < w; i++) {
    b.startWave(i); botRun(60 * 4);
    b.enemies.forEach(e => { if (!e.dead) b.killEnemy(e); });
    b.spawnQ = []; botRun(30);
  }
  b.result = null;
  b.startWave(w);
};

// 헤드리스 스테이지 시뮬레이션
window.sim = (opts, lv, squad) => {
  Save.data.energy = 99;
  Save.data.bossTries = 3; Save.data.bossDay = new Date().toDateString();
  Save.data.squad = squad || ['warrior', 'healer'];
  CAT_IDS.forEach(c => Save.data.cats[c] = lv);
  Save.data.tutorialDone = true;
  Game.fadeDir = 0;
  Game.startBattle(Object.assign({ free: true }, opts));
  Game.fade = 0; Game.fadeDir = 0; Game.next(); Game.next = null;
  const b = Game.scene;
  const marks = [];
  let i = 0, lastWave = -1;
  while (!(b.result && b.result.shown) && i < 60 * 400) {
    if (b.state === 'break') b.stateT = Math.max(b.stateT, 6);
    if (b.waveIdx !== lastWave) { lastWave = b.waveIdx; marks.push(Math.round(b.time)); }
    if (i % 30 === 0) botStep();
    b.update(1 / 60);
    i++;
  }
  FX.clear();
  const r = b.result;
  const name = b.stageName();
  return `${name} lv${lv}: ${r ? (r.lost ? 'LOSE' : 'WIN') + (r.stars ? '★' + r.stars : '') : 'TIMEOUT'} t${b.time.toFixed(0)} waves@${marks.join(',')} dmg${Math.round(b.totalDamage)} boss${b.boss ? Math.round(Math.max(0, b.boss.hp)) : '-'} cats:${b.cats.map(c => c.weapon + '/' + c.armor).join(' ')}`;
};
'testkit loaded';
