// 메뉴 씬: 타이틀, 로비, 고양이, 성장, 모드, 스테이지, 상점, 랭킹
'use strict';

// ---------- 공통 UI ----------
function topBar() {
  const S = Save.data;
  Save.tickEnergy();
  const slots = [
    { icon: 'icon.energy', v: `${S.energy}/50`, x: 20, onPlus: () => Game.popup = 'energy' },
    { icon: 'icon.gold', v: shortNum(S.gold), x: 360 },
    { icon: 'icon.gem', v: fmt(S.gems), x: 700, onPlus: () => Game.go('shop') },
  ];
  for (const s of slots) {
    UI.panel(s.x, 18, 320, 76, 'dark');
    imgFit(s.icon, s.x + 42, 56, 58, 58);
    text(s.v, s.x + 170, 57, { size: 36, color: '#fff' });
    if (s.onPlus && UI.hit(s.x, 18, 320, 76)) { Audio2.sfx('click'); s.onPlus(); }
  }
  if (S.energy < 50) {
    const eta = Math.ceil(Save.energyEta() / 1000);
    text(`+1 ${Math.floor(eta / 60)}:${String(eta % 60).padStart(2, '0')}`, 180, 108, { size: 22, color: '#fff', stroke: '#3a2a1a' });
  }
}
function header(title, sub, back = 'lobby') {
  if (UI.button(24, 118, 110, 100, '', { color: 'cream', icon: 'icon.back', iconSize: 60 })) Game.go(back);
  nine('ui.title-banner', 150, 108, 780, 124, 100, 0.5);
  text(title, W / 2, 170, { size: 50 });
  if (UI.button(946, 118, 110, 100, '', { color: 'cream', icon: 'icon.gear', iconSize: 60 })) Game.popup = 'settings';
  if (sub) {
    UI.panel(170, 236, 740, 62, 'cream');
    text(sub, W / 2, 267, { size: 30, color: '#7a5636', maxW: 680 });
  }
}
const TABS = [
  { id: 'lobby', label: '대장간', icon: 'icon.forge' },
  { id: 'cats', label: '고양이', icon: 'icon.cat' },
  { id: 'modes', label: '전투', icon: 'icon.sword' },
  { id: 'shop', label: '상점', icon: 'icon.shop' },
  { id: 'ranking', label: '랭킹', icon: 'icon.trophy' },
];
function tabBar(active) {
  if(active==='lobby'){
    imgFit('lobby.ui.reward',540,1830,1000,157);
    TABS.forEach((t,i)=>{
      const x=140+i*200;
      if(t.id===active)imgFit('lobby.ui.mint',x,1815,174,62);
      imgFit(t.icon,x,1807,66,66);
      text(t.label,x,1865,{size:27,color:t.id===active?'#315737':'#634c39'});
      if(UI.hit(x-95,1760,190,142)&&t.id!==active){Audio2.sfx('click');Game.go(t.id);}
    });return;
  }
  const compact = active === 'lobby', py = compact ? 1800 : 1745;
  UI.panel(10, py, 1060, compact ? 115 : 170, 'cream');
  const w = 1000 / TABS.length;
  TABS.forEach((t, i) => {
    const x = 40 + i * w, on = t.id === active || (active === 'stages' && t.id === 'modes') || (active === 'growth' && t.id === 'lobby');
    if (on) nine('ui.button-mint-selected', x + 6, py + 10, w - 12, compact ? 98 : 132, 45, 0.6);
    const b = on ? Math.sin(performance.now() / 200) * 4 : 0;
    imgFit(t.icon, x + w / 2, py + (compact ? 42 : 67) + b, compact ? 62 : (on ? 84 : 72), compact ? 62 : (on ? 84 : 72));
    text(t.label, x + w / 2, py + (compact ? 92 : 127), { size: compact ? 25 : 28, color: on ? '#2a5a3a' : '#7a5636' });
    if (UI.hit(x, py + 10, w, compact ? 105 : 150) && !on) { Audio2.sfx('click'); Game.go(t.id); }
  });
}
function idleCat(id, x, y, S, t, o = {}) {
  const k = (IDLE_K[CATS[id] ? CATS[id].anim : id] || 1) * (((CATS[id] || {}).view) || 1);
  drawSprite(`anim.${CATS[id] ? CATS[id].anim : id}.idle-${Math.floor(t * 2.5 + (o.phase || 0)) % 2}`, x, y, S * k, o);
}
function walkSprite(atkId, x, y, S, t, o = {}) {
  const frame = Math.floor(t * 5 + (o.phase || 0)) % 2;
  drawSprite(`walk.${atkId}.${frame}`, x, y, S, o);
}

// ---------- 타이틀 ----------
const TitleScene = {
  enter() { this.t = 0; this.hits = 0; Audio2.playBgm('lobby'); },
  update(dt) {
    this.t += dt;
    const cyc = this.t % 1.1;
    if (cyc < this.lastCyc) {
      FX.sparks(560, 1370, '#ffcf5a', 18, -Math.PI / 2, 2.4);
      FX.burst(560, 1370, '#ffb35a', 10, 400, 10, 0.4);
      Audio2.sfx('produce');
    }
    this.lastCyc = cyc;
    if (Math.random() < 0.3) FX.p({ x: rand(60, 300), y: rand(700, 900), vx: rand(-20, 20), vy: rand(-160, -60), size: rand(3, 7), color: pick(['#ffb35a', '#ffe08a']), life: rand(1, 2), drag: 0.99 });
    FX.update(dt);
  },
  draw() {
    const t = this.t;
    ctx.save(); FX.applyCamera();
    img('bg.workshop', 0, 0, W, H);
    ctx.fillStyle = 'rgba(40,20,10,0.15)'; ctx.fillRect(0, 0, W, H);
    // 로고
    const s = 1 + Math.sin(t * 2) * 0.02;
    ctx.save(); ctx.translate(W / 2, 380); ctx.scale(s, s);
    nine('ui.title-banner', -440, -150, 880, 300, 110, 0.9);
    text('머지냥 디펜스', 0, -12, { size: 116, color: '#fff4dc', stroke: '#7a3a16', sw: 20, weight: 900 });
    text('MERGE NYANG DEFENSE', 0, 88, { size: 34, color: '#7a4a22' });
    ctx.restore();
    // 캐릭터들
    img('ui.ground-shadow', 50, 1455, 280, 50, 0.8);
    idleCat('warrior', 190, 1480, 0.72, t, {});
    img('ui.ground-shadow', 720, 1455, 300, 50, 0.8);
    idleCat('healer', 870, 1480, 0.75, t, { phase: 1 });
    const cyc = t % 1.1;
    img('ui.ground-shadow', 400, 1480, 320, 50, 0.8);
    imgFit('title.empty-anvil', 660, 1452, 250, 184);
    if (cyc < 0.18) drawCatAttack('cat-smith', 1, 520, 1510, 0.9, { sy: cyc < 0.1 ? 0.95 : 1 });
    else drawCatAttack('cat-smith', 0, 520, 1510, 0.9);
    FX.drawWorld();
    ctx.restore();
    const a = 0.55 + 0.45 * Math.sin(t * 4);
    ctx.save(); ctx.translate(W / 2, 1680); ctx.rotate(Math.sin(t * 3) * 0.03);
    UI.panel(-300, -60, 600, 120, 'cream');
    text('터치하여 시작', 0, 0, { size: 50, alpha: a });
    ctx.restore();
    text('고양이가 만들고, 고양이가 싸운다!', W / 2, 1820, { size: 32, color: '#fff', stroke: '#4a2a10' });
    text('v1.0 · 웹 프로토타입', W / 2, 1880, { size: 22, color: '#fff', stroke: '#4a2a10' });
    FX.drawOverlay();
    if (UI.hit(0, 0, W, H)) {
      Audio2.unlock();
      Audio2.sfx('produce'); Audio2.sfx('meow');
      FX.flash('#fff', 0.6);
      Game.go('lobby');
    }
  },
};

// ---------- 로비 ----------
const LobbyScene = {
  enter() {
    Audio2.playBgm('lobby');
    this.t = 0;
    const sq = Save.data.squad;
    this.walkers = [];
  },
  offlineGold() {
    const S = Save.data;
    const mins = Math.min(480, (Date.now() - S.lastSeen) / 60000);
    const totalStars = Object.values(S.stars).reduce((a, b) => a + b, 0);
    return { gold: Math.floor(mins * (4 + totalStars * 0.6)), mins };
  },
  update(dt) {
    this.t += dt;
    for (const w of this.walkers) WorkshopRoom.update(w, dt, this.walkers);
    FX.update(dt);
  },
  onDown(p) {
    for (const w of this.walkers) {
      if (Math.abs(p.x - w.x) < 110 && p.y > w.y - 260 && p.y < w.y) {
        w.jump = 0.5;
        Audio2.sfx('meow');
        for (let i = 0; i < 5; i++) FX.p({ x: w.x + rand(-40, 40), y: w.y - 250, vx: rand(-100, 100), vy: rand(-300, -150), img: 'icon.heart', size: rand(30, 50), life: 1, add: false, g: 100 });
      }
    }
  },
  draw() {
    const S = Save.data, t = this.t;
    const room = IMG['lobby.ui.main-background'];
    if (room) {
      const scale = Math.max(W / room.width, H / room.height);
      img('lobby.ui.main-background', (W - room.width * scale) / 2, (H - room.height * scale) / 2, room.width * scale, room.height * scale);
    }
    // Large waist-up portrait, bottom tucked behind the reward card.
    imgFit('lobby.ui.smith', 570, 897, 720, 720);
    topBar();
    nine('ui.title-banner', 150, 108, 780, 124, 100, 0.5);
    text('냥이들의 대장간', W / 2, 170, { size: 52 });
    if (UI.button(946, 118, 110, 100, '', { color: 'cream', icon: 'icon.gear', iconSize: 60 })) Game.popup = 'settings';
    if (UI.button(24, 250, 200, 80, '도감', { color: 'cream', icon: 'icon.book', size: 30 })) Game.popup = 'codex';
    if (UI.button(856, 250, 200, 80, '도움말', { color: 'mint', icon: 'icon.help', size: 30 })) Game.popup = 'help';
    ctx.save(); FX.drawWorld(); ctx.restore();
    // 방치 보상
    const off = this.offlineGold();
    imgFit('lobby.ui.reward',540,1210,1000,157);
    imgFit('icon.chest', 120, 1210, 106, 106);
    text('방치 보상', 195, 1177, { size: 34, align: 'left' });
    text(`${Math.floor(off.mins / 60)}시간 ${Math.floor(off.mins % 60)}분 · 최대 8시간`, 195, 1220, { size: 25, align: 'left', color: '#8a6a4a' });
    text(`${fmt(off.gold)} 골드`,195,1251,{size:24,align:'left',color:'#98651b'});
    imgFit('lobby.ui.gold',880,1210,245,69,off.gold<1?.55:1);
    text('받기',880,1207,{size:29,color:off.gold<1?'#8e795e':'#65441c'});
    if (off.gold>0 && UI.hit(758,1175,245,69)) {
      S.gold += off.gold; S.lastSeen = Date.now(); Save.save();
      FX.collect(880, 1210, 'icon.gold', { x: 400, y: 56 }, 20, () => Audio2.sfx('coin'));
      Toast.show(`골드 ${fmt(off.gold)} 획득!`, '#ffe27a');
    }
    // 공방 레벨
    const lvl = 1 + [...FORGE_UPGRADES.map(u => Save.up('forge', u.id)), ...SMITH_UPGRADES.map(u => Save.up('smith', u.id))].reduce((a, b) => a + b, 0);
    imgFit('lobby.ui.level',540,1375,1000,147);
    text(`공방 Lv.${lvl}`, 90, 1343, { size: 34, align: 'left' });
    text(`전투력 ${fmt(Save.power())}`, 990, 1343, { size: 28, align: 'right', color: '#8a6a4a' });
    const maxLv = 1 + FORGE_UPGRADES.reduce((a, u) => a + u.max, 0) + SMITH_UPGRADES.reduce((a, u) => a + u.max, 0);
    bar(90, 1373, 900, 25, lvl / maxLv, 'ui.progress-mint');
    text('장비를 만들며 공방을 성장시키세요',90,1420,{size:23,align:'left',color:'#8a6a4a'});
    imgFit('lobby.ui.gold',285,1526,490,137);
    imgFit('lobby.ui.mint',795,1526,490,137);
    imgFit('icon.forge',140,1526,78,78);
    imgFit('icon.paw',649,1526,70,70);
    text('대장간 성장',335,1524,{size:34});
    text('머지냥이 성장',848,1524,{size:32});
    if (UI.hit(40,1458,490,137)) Game.go('growth', 'forge');
    if (UI.hit(550,1458,490,137)) Game.go('growth', 'smith');
    // 진행 상황 + 모험
    const ch = Save.unlockedChapter(), st = Save.unlockedStage(ch);
    imgFit('lobby.ui.adventure',540,1673,1000,136);
    imgFit('icon.sword',304,1664,76,76);
    text('모험 떠나기',595,1650,{size:44});
    text(`다음: ${ch+1}-${st+1} ${CHAPTERS[ch].name}`,595,1693,{size:24,color:'#86612f'});
    if (UI.hit(40,1605,1000,136)) Game.go('modes');
    tabBar('lobby');
    Toast.draw();
    FX.drawParts(true);
  },
};

// ---------- 고양이 ----------
const CatsScene = {
  enter() { this.sel = this.sel || Save.data.squad[0]; this.t = 0; },
  update(dt) { this.t += dt; FX.update(dt); },
  draw() {
    const S = Save.data, t = this.t;
    img('bg.town', 0, 0, W, H);
    topBar();
    header('우리 고양이들', '레벨업하고 출전할 고양이 2마리를 골라요');
    // 출전 중
    UI.panel(30, 310, 1020, 420, 'mint');
    text('출전 중인 고양이', 80, 360, { size: 36, align: 'left' });
    text(`편성 ${S.squad.length} / 2`, 1000, 360, { size: 30, align: 'right', color: '#2a5a3a' });
    S.squad.forEach((id, i) => {
      const x = 290 + i * 500;
      img('ui.ground-shadow', x - 110, 640, 220, 36, 0.8);
      idleCat(id, x, 660, 0.58, t, { phase: i });
      text(`${CATS[id].name} Lv.${S.cats[id]}`, x, 700, { size: 32 });
    });
    // 보유 고양이
    text('보유 고양이', 60, 780, { size: 36, align: 'left', color: '#fff', stroke: '#4a2a10' });
    CAT_IDS.forEach((id, i) => {
      const x = 30 + i * 206, y = 810, on = this.sel === id;
      if (on) nine('ui.button-yellow-selected', x - 6, y - 6, 208, 262, 60, 0.6);
      UI.panel(x, y, 196, 250, S.squad.includes(id) ? 'mint' : 'cream');
      imgFit(`char.cat-${id}`, x + 98, y + 100, 170, 160);
      text(CATS[id].name, x + 98, y + 200, { size: 28, maxW: 170 });
      text(`Lv.${S.cats[id]}`, x + 98, y + 232, { size: 24, color: '#8a6a4a' });
      if (S.squad.includes(id)) imgFit('icon.flag', x + 170, y + 30, 44, 44);
      if (UI.hit(x, y, 196, 250)) { this.sel = id; Audio2.sfx('meow'); }
    });
    // 상세
    const id = this.sel, d = CATS[id], lv = S.cats[id], mul = catMul(lv), nmul = catMul(lv + 1);
    UI.panel(30, 1080, 1020, 650, 'cream');
    img('ui.ground-shadow', 90, 1420, 260, 40, 0.8);
    const cyc = t % 1.2;
    if (cyc < 0.25) drawCatAttack(`cat-${id}`, 1, 220, 1440, 0.62);
    else idleCat(id, 220, 1440, 0.62, t);
    text(`${d.name}`, 400, 1140, { size: 48, align: 'left' });
    text(`Lv.${lv} · ${d.role}`, 400, 1195, { size: 30, align: 'left', color: '#8a6a4a' });
    const rows = [
      ['icon.heart', '체력', Math.round(d.hp * mul), Math.round(d.hp * nmul)],
      ['icon.sword', '공격력', Math.round(d.atk * mul), Math.round(d.atk * nmul)],
      ['icon.clock', '공격 속도', `${d.cd}초`, null],
      ['icon.star', '치명타', `${Math.round(d.crit * 100)}%`, null],
    ];
    rows.forEach((r, i) => {
      const y = 1250 + i * 58;
      imgFit(r[0], 420, y, 42, 42);
      text(r[1], 460, y, { size: 30, align: 'left' });
      text(`${r[2]}`, 800, y, { size: 30, align: 'right' });
      if (r[3] !== null) text(`→ ${r[3]}`, 820, y, { size: 30, align: 'left', color: '#2a9a5a' });
    });
    text(d.desc, 540, 1500, { size: 28, color: '#7a5636', maxW: 940 });
    const cost = catLevelCost(lv);
    if (UI.button(60, 1560, 470, 140, `레벨업`, { color: 'yellow', sub: `골드 ${fmt(cost)}`, disabled: S.gold < cost, onDisabled: () => Toast.show('골드가 부족해요', '#ffd36b') })) {
      S.gold -= cost; S.cats[id]++; Save.save();
      Audio2.sfx('equip');
      FX.burst(220, 1320, '#ffe27a', 30, 800, 14, 0.6);
      FX.stars(220, 1320, 10, 500, 44, true);
      FX.ring(220, 1320, '#ffe27a', 250, 0.5, 20);
      Toast.show(`${d.name} Lv.${S.cats[id]}!`, '#ffe27a');
    }
    const inSquad = S.squad.includes(id);
    if (UI.button(550, 1560, 470, 140, inSquad ? '출전 중' : '출전시키기', { color: inSquad ? 'cream' : 'mint', disabled: inSquad })) {
      S.squad = [S.squad[S.squad.length - 1], id].filter(Boolean).slice(-2);
      Save.save();
      Toast.show(`${d.name} 출전!`);
    }
    tabBar('cats');
    FX.drawParts(false);
    FX.drawParts(true);
    Toast.draw();
  },
};

// ---------- 성장 ----------
const GrowthScene = {
  enter(tab) { this.tab = tab || this.tab || 'forge'; this.t = 0; },
  update(dt) { this.t += dt; FX.update(dt); },
  draw() {
    const S = Save.data;
    img('bg.workshop', 0, 0, W, H);
    ctx.fillStyle = 'rgba(40,20,10,0.25)'; ctx.fillRect(0, 0, W, H);
    topBar();
    header(this.tab === 'forge' ? '대장간 성장' : '머지냥이 성장', this.tab === 'forge' ? '생산 단계와 에너지를 키워요' : '대장장이 냥이의 솜씨를 키워요');
    if (UI.button(60, 320, 470, 100, '대장간', { color: this.tab === 'forge' ? 'yellow' : 'cream', icon: 'icon.forge' })) this.tab = 'forge';
    if (UI.button(550, 320, 470, 100, '머지냥이', { color: this.tab === 'smith' ? 'yellow' : 'cream', icon: 'icon.paw' })) this.tab = 'smith';
    const list = this.tab === 'forge' ? FORGE_UPGRADES : SMITH_UPGRADES;
    list.forEach((u, i) => {
      const y = 450 + i * 250, lv = Save.up(this.tab, u.id), max = lv >= u.max, cost = Math.round(u.cost(lv));
      UI.panel(30, y, 1020, 230, 'cream');
      UI.panel(60, y + 30, 170, 170, 'peach');
      imgFit(u.icon, 145, y + 115, 110, 110);
      text(u.name, 260, y + 65, { size: 40, align: 'left' });
      text(`Lv.${lv} / ${u.max}`, 1010, y + 65, { size: 30, align: 'right', color: '#8a6a4a' });
      text(u.desc(lv), 260, y + 120, { size: 28, align: 'left', color: '#7a5636' });
      if (!max) text(`다음: ${u.desc(lv + 1)}`, 260, y + 165, { size: 26, align: 'left', color: '#2a9a5a' });
      bar(260, y + 185, 400, 30, lv / u.max, 'ui.progress-gold');
      if (UI.button(700, y + 105, 320, 110, max ? '최대 레벨' : '강화', { color: 'yellow', sub: max ? '' : `골드 ${fmt(cost)}`, disabled: max || S.gold < cost, onDisabled: () => !max && Toast.show('골드가 부족해요', '#ffd36b') })) {
        S.gold -= cost;
        S[this.tab][u.id] = lv + 1;
        Save.save();
        Audio2.sfx('produce'); Audio2.sfx('equip');
        FX.sparks(145, y + 115, '#ffcf5a', 20, -Math.PI / 2, 3);
        FX.burst(145, y + 115, '#ffe27a', 20, 600, 12, 0.5);
        Game.popup = 'upgraded';
        this.lastUp = u;
      }
    });
    tabBar('growth');
    FX.drawParts(false);
    Toast.draw();
  },
};

// ---------- 모드 ----------
const ModesScene = {
  enter() { this.t = 0; Audio2.playBgm('lobby'); },
  update(dt) { this.t += dt; },
  draw() {
    const S = Save.data;
    img('bg.town', 0, 0, W, H);
    topBar();
    header('모험을 떠나요', '함께 만들고, 함께 지켜요');
    const ch1Clear = (S.stars['0-19'] || 0) > 0;
    const towerOpen = (S.stars['0-4'] || 0) > 0;
    const bossOpen = (S.stars['0-9'] || 0) > 0;
    const today = new Date().toDateString();
    if (S.bossDay !== today) { S.bossDay = today; S.bossTries = 3; }
    const wb = BOSSES[WORLD_BOSS_ORDER[Math.floor(Date.now() / (7 * 86400000)) % 4]];
    const cards = [
      { img: 'ui.mode-solo', name: '개인 디펜스', sub: `${CHAPTERS[Save.unlockedChapter()].name} ${Save.unlockedChapter() + 1}-${Save.unlockedStage(Save.unlockedChapter()) + 1}`, open: true, go: () => Game.go('stages') },
      { img: 'ui.mode-tower', name: '무한의 탑', sub: towerOpen ? `최고 ${S.towerBest}층` : '1-5 클리어 시 해금', open: towerOpen, go: () => Game.startBattle({ mode: 'tower', floor: 1 }) },
      { img: 'ui.mode-boss', name: '월드보스', sub: bossOpen ? `${wb.name} · 남은 ${S.bossTries}회` : '1-10 클리어 시 해금', open: bossOpen, go: () => Game.startBattle({ mode: 'boss' }) },
      { img: 'ui.mode-coop', name: '멀티 디펜스', sub: '서버 연동 후 오픈', open: false, online: true },
      { img: 'ui.mode-duel', name: '1:1 대전', sub: '서버 연동 후 오픈', open: false, online: true },
      { img: 'ui.mode-team', name: '팀 대전', sub: '서버 연동 후 오픈', open: false, online: true },
    ];
    cards.forEach((c, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 30 + col * 345, y = 330 + row * 700, w = 330, h = 680;
      const pr = UI.pressed(x, y, w, h) ? 0.97 : 1;
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(pr, pr); ctx.translate(-(x + w / 2), -(y + h / 2));
      UI.panel(x, y, w, h, c.open ? 'cream' : 'lavender');
      ctx.save();
      if (!c.open) ctx.filter = 'grayscale(0.7)';
      imgFit(c.img, x + w / 2, y + 250, w - 40, 440);
      ctx.restore();
      text(c.name, x + w / 2, y + 510, { size: 40, maxW: w - 40 });
      text(c.sub, x + w / 2, y + 560, { size: 24, color: '#7a5636', maxW: w - 40 });
      if (!c.open) imgFit('icon.lock', x + w / 2, y + 250, 120, 120);
      ctx.restore();
      if (UI.button(x + 40, y + 590, w - 80, 76, c.open ? '입장' : '잠김', { color: c.open ? 'yellow' : 'cream', disabled: !c.open, size: 32, onDisabled: () => Toast.show(c.online ? '온라인 모드는 서버 연동 후 열려요' : c.sub) })) c.go();
    });
    tabBar('modes');
    Toast.draw();
  },
};

// ---------- 스테이지 ----------
const StagesScene = {
  enter() { this.ch = this.ch === undefined ? Save.unlockedChapter() : Math.min(this.ch, Save.unlockedChapter()); this.t = 0; this.prep = null; },
  update(dt) { this.t += dt; },
  modalLayer() { return this.prep !== null ? 1 : 0; },
  draw() {
    const S = Save.data, ch = this.ch, chap = CHAPTERS[ch];
    img('bg.town', 0, 0, W, H);
    topBar();
    header(`${ch + 1}. ${chap.name}`, chap.rule, 'modes');
    const maxCh = Save.unlockedChapter();
    if (UI.button(30, 320, 150, 100, '', { color: 'cream', icon: 'icon.back', iconSize: 50, disabled: ch <= 0 })) this.ch--;
    UI.panel(200, 320, 680, 100, 'mint');
    text(`챕터 ${ch + 1} · 별 ${Save.chapterStars(ch)} / 60`, 540, 370, { size: 36 });
    if (UI.button(900, 320, 150, 100, '', { color: ch < maxCh ? 'yellow' : 'cream', icon: 'icon.play', iconSize: 50, disabled: ch >= maxCh, onDisabled: () => Toast.show(ch >= CHAPTERS.length - 1 ? '마지막 챕터예요' : '이전 챕터 보스를 쓰러뜨리세요') })) this.ch++;
    // 보스 미리보기
    UI.panel(30, 440, 1020, 260, 'cream');
    drawSprite(`atk.${BOSSES[chap.boss].atkId}.${Math.floor(this.t * 1.5) % 2}`, 180, 690, 0.48);
    text(`챕터 보스 · ${BOSSES[chap.boss].name}`, 340, 510, { size: 36, align: 'left' });
    text(BOSSES[chap.boss].tip, 340, 560, { size: 26, align: 'left', color: '#7a5636' });
    chap.enemies.forEach((e, i) => drawSprite(`atk.${ENEMIES[e].atkId}.0`, 420 + i * 160, 690, 0.3));
    text('등장 몬스터', 780, 650, { size: 26, color: '#8a6a4a' });
    const unlocked = Save.unlockedStage(ch);
    for (let s = 0; s < STAGES_PER_CHAPTER; s++) {
      const col = s % 4, row = Math.floor(s / 4);
      const x = 40 + col * 255, y = 725 + row * 200;
      const stars = S.stars[`${ch}-${s}`] || 0;
      const open = s <= unlocked;
      const boss = (s + 1) % 5 === 0;
      const cur = s === unlocked && !stars;
      if (UI.button(x, y, 240, 180, '', { color: !open ? 'cream' : boss ? 'peach' : cur ? 'yellow' : 'mint', disabled: !open, pulse: cur, onDisabled: () => Toast.show('이전 스테이지를 먼저 클리어하세요') })) this.prep = s;
      if (!open) { imgFit('icon.lock', x + 120, y + 80, 70, 70); continue; }
      text(`${ch + 1}-${s + 1}`, x + 120, y + 62, { size: 44, color: '#5a3a22' });
      if (boss) imgFit(s + 1 === 20 ? 'icon.crown' : 'icon.rat', x + 205, y + 38, 54, 54);
      for (let k = 0; k < 3; k++) imgFit('icon.star', x + 72 + k * 48, y + 118, 44, 44, k < stars ? 1 : 0.25);
    }
    tabBar('stages');
    if (this.prep !== null) this.drawPrep();
    Toast.draw();
  },
  drawPrep() {
    UI.layer = 1;
    const S = Save.data, ch = this.ch, s = this.prep;
    ctx.save(); ctx.fillStyle = 'rgba(30,15,10,0.6)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    UI.panel(60, 330, 960, 1280, 'cream');
    text(`${ch + 1}-${s + 1} 출전 준비`, W / 2, 420, { size: 58 });
    const boss = (s + 1) % 5 === 0;
    text(boss ? (s + 1 === 20 ? `챕터 보스: ${BOSSES[CHAPTERS[ch].boss].name}` : `중간 보스: 부하 ${BOSSES[CHAPTERS[ch].boss].name}`) : '일반 3웨이브 + 정예 1웨이브', W / 2, 485, { size: 30, color: boss ? '#c04030' : '#7a5636' });
    UI.panel(110, 530, 860, 330, 'peach');
    text('등장 몬스터', W / 2, 575, { size: 30 });
    const ens = CHAPTERS[ch].enemies;
    ens.forEach((e, i) => { drawSprite(`atk.${ENEMIES[e].atkId}.0`, 300 + i * 240, 830, 0.42); });
    if (boss) drawSprite(`atk.${BOSSES[CHAPTERS[ch].boss].atkId}.0`, 810, 850, 0.5);
    text('출전 고양이', 140, 910, { size: 34, align: 'left' });
    const rec = recommendedCats(ch);
    text(`추천: ${rec.map(r => CATS[r].name).join(' + ')}`, 940, 910, { size: 26, align: 'right', color: '#2a9a5a' });
    S.squad.forEach((id, i) => {
      const x = 110 + i * 440;
      UI.panel(x, 950, 420, 300, rec.includes(id) ? 'mint' : 'cream');
      idleCat(id, x + 210, 1200, 0.45, this.t, { phase: i });
      text(`${CATS[id].name} Lv.${S.cats[id]}`, x + 210, 1225, { size: 28 });
    });
    const stars = S.stars[`${ch}-${s}`] || 0;
    text(stars ? `최고 기록 ★${stars}` : '첫 클리어 보상: 보석 5', W / 2, 1290, { size: 30, color: '#8a6a4a' });
    if (UI.button(110, 1330, 420, 120, '편성 변경', { color: 'mint', icon: 'icon.cat' })) { this.prep = null; Game.go('cats'); }
    if (UI.button(550, 1330, 420, 120, '출전!', { color: 'yellow', sub: '에너지 5', pulse: true })) { Game.startBattle({ mode: 'stage', ch, st: s }); }
    if (UI.button(340, 1480, 400, 100, '닫기', { color: 'cream' })) this.prep = null;
    UI.layer = 0;
  },
};

// ---------- 상점 ----------
const ShopScene = {
  enter() { this.t = 0; },
  update(dt) { this.t += dt; FX.update(dt); },
  draw() {
    const S = Save.data, t = this.t;
    img('bg.shop', 0, 0, W, H);
    topBar();
    header('냥냥 상점', '오늘의 작은 선물을 만나보세요');
    imgFit('shop.merchant', 540, 525, 510, 510);
    const today = new Date().toDateString();
    const free = S.dailyChest !== today;
    UI.panel(30, 720, 1020, 190, 'cream');
    imgFit('icon.chest', 140, 815, 140, 130);
    text('일일 무료 상자', 250, 780, { size: 40, align: 'left' });
    text('매일 골드와 보석을 받아요', 250, 840, { size: 28, align: 'left', color: '#7a5636' });
    if (UI.button(780, 760, 240, 110, free ? '받기' : '내일 다시', { color: 'yellow', disabled: !free, pulse: free })) {
      const g = randi(300, 800) * (1 + Save.unlockedChapter()), gem = randi(5, 20);
      S.gold += g; S.gems += gem; S.dailyChest = today; Save.save();
      Audio2.sfx('chest');
      FX.collect(140, 815, 'icon.gold', { x: 400, y: 56 }, 16, () => Audio2.sfx('coin'));
      FX.collect(140, 815, 'icon.gem', { x: 740, y: 56 }, 8, () => Audio2.sfx('coin'));
      Toast.show(`골드 ${fmt(g)} · 보석 ${gem} 획득!`, '#ffe27a');
    }
    const items = [
      { icon: 'icon.energy', name: '에너지 50', price: 30, color: 'mint', buy: () => { S.energy = Math.min(99, S.energy + 50); } },
      { icon: 'icon.gold', name: `골드 ${fmt(2500 * (1 + Save.unlockedChapter()))}`, price: 50, color: 'peach', buy: () => { S.gold += 2500 * (1 + Save.unlockedChapter()); } },
      { icon: 'icon.gold', name: `골드 ${fmt(12000 * (1 + Save.unlockedChapter()))}`, price: 200, color: 'lavender', buy: () => { S.gold += 12000 * (1 + Save.unlockedChapter()); } },
    ];
    items.forEach((it, i) => {
      const x = 30 + i * 345, y = 940;
      UI.panel(x, y, 330, 420, it.color);
      imgFit(it.icon, x + 165, y + 130, 160, 160);
      text(it.name, x + 165, y + 260, { size: 34, maxW: 290 });
      if (UI.button(x + 30, y + 300, 270, 100, `${it.price}`, { color: 'yellow', icon: 'icon.gem', iconSize: 44, disabled: S.gems < it.price, onDisabled: () => Toast.show('보석이 부족해요', '#ffd36b') })) {
        S.gems -= it.price; it.buy(); Save.save();
        Audio2.sfx('chest');
        FX.burst(x + 165, y + 130, '#ffe27a', 30, 700, 14, 0.5);
        Toast.show(`${it.name} 구매 완료!`, '#ffe27a');
      }
    });
    UI.panel(30, 1390, 1020, 330, 'cream');
    imgFit('icon.gem', 130, 1480, 110, 110);
    text('보석 충전 · 시즌 패스 · 스킨', 230, 1450, { size: 36, align: 'left' });
    text('실제 결제는 Google Play 출시 버전에서 제공돼요', 230, 1505, { size: 26, align: 'left', color: '#7a5636' });
    text('보석은 스테이지 첫 클리어·별 3개·월드보스로 모을 수 있어요', 70, 1580, { size: 26, align: 'left', color: '#7a5636' });
    if (UI.button(70, 1615, 940, 90, '패키지 · 광고 제거 (준비 중)', { color: 'cream', disabled: true, size: 30, onDisabled: () => Toast.show('출시 버전에서 만나요!') }));
    tabBar('shop');
    FX.drawParts(false);
    FX.drawParts(true);
    Toast.draw();
  },
};

// ---------- 랭킹 ----------
const NPC_NAMES = ['구름냥', '별빛냥', '고등어냥', '초코냥', '치즈냥', '두부냥', '호박냥', '보리냥', '까망냥', '망고냥', '모찌냥', '나비냥'];
const RankingScene = {
  enter() { this.tab = this.tab || 'tower'; this.t = 0; },
  update(dt) { this.t += dt; },
  board() {
    const S = Save.data;
    const my = this.tab === 'tower' ? S.towerBest : this.tab === 'boss' ? S.bossBest : Save.power();
    const base = this.tab === 'tower' ? 60 : this.tab === 'boss' ? 2500000 : 60000;
    const list = NPC_NAMES.map((n, i) => ({ name: n, v: Math.round(base * Math.pow(0.78, i)), cat: CAT_IDS[i % 5] }));
    list.push({ name: '나 (집사)', v: my, cat: S.squad[0], me: true });
    return list.sort((a, b) => b.v - a.v);
  },
  draw() {
    img('bg.town', 0, 0, W, H);
    topBar();
    header('랭킹', '이 기기 기록 기준 · 온라인 랭킹은 서버 연동 후');
    const tabs = [['tower', '무한의 탑'], ['boss', '월드보스'], ['power', '전투력']];
    tabs.forEach(([id, l], i) => { if (UI.button(40 + i * 340, 320, 320, 100, l, { color: this.tab === id ? 'mint' : 'cream' })) this.tab = id; });
    const list = this.board();
    const unit = this.tab === 'tower' ? '층' : this.tab === 'boss' ? '피해' : '전투력';
    // 상위 3 단상
    const podium = [[1, 540, 700], [0, 220, 760], [2, 860, 790]];
    for (const [i, x, y] of podium) {
      const e = list[i];
      if (!e) continue;
      UI.panel(x - 140, y, 280, 180, e.me ? 'mint' : 'cream');
      idleCat(e.cat, x, y + 10, 0.42, this.t, { phase: i });
      imgFit(i === 0 ? 'icon.crown' : 'icon.trophy', x, y - 250, 70, 70);
      text(`${i + 1}위 ${e.name}`, x, y + 60, { size: 30, maxW: 250 });
      text(`${shortNum(e.v)} ${unit}`, x, y + 120, { size: 26, color: '#8a6a4a' });
    }
    list.slice(3, 8).forEach((e, i) => {
      const y = 1010 + i * 118;
      UI.panel(40, y, 1000, 108, e.me ? 'mint' : 'cream');
      text(`${i + 4}`, 110, y + 54, { size: 40 });
      imgFit(`char.cat-${e.cat}`, 210, y + 54, 90, 86);
      text(e.name, 280, y + 54, { size: 34, align: 'left' });
      text(`${fmt(e.v)} ${unit}`, 1000, y + 54, { size: 30, align: 'right', color: '#8a6a4a' });
    });
    const myRank = list.findIndex(e => e.me) + 1;
    UI.panel(40, 1640, 1000, 100, 'peach');
    text(`내 순위 ${myRank}위`, 90, 1690, { size: 36, align: 'left' });
    text(`${fmt(list[myRank - 1].v)} ${unit}`, 1000, 1690, { size: 34, align: 'right' });
    tabBar('ranking');
    Toast.draw();
  },
};

// ---------- 공용 팝업 ----------
function drawPopup() {
  const p = Game.popup;
  if (!p) return;
  UI.layer = 2;
  const S = Save.data;
  ctx.save(); ctx.fillStyle = 'rgba(30,15,10,0.6)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  const close = () => { Game.popup = null; };
  if (p === 'settings') {
    UI.panel(140, 500, 800, 900, 'cream');
    text('설정', W / 2, 590, { size: 60 });
    if (UI.button(220, 680, 640, 120, `배경음악 ${Audio2.bgmOn ? 'ON' : 'OFF'}`, { color: Audio2.bgmOn ? 'mint' : 'cream' })) { Audio2.bgmOn = !Audio2.bgmOn; S.settings.bgm = Audio2.bgmOn; Audio2.applySettings(); Save.save(); }
    if (UI.button(220, 820, 640, 120, `효과음 ${Audio2.sfxOn ? 'ON' : 'OFF'}`, { color: Audio2.sfxOn ? 'mint' : 'cream' })) { Audio2.sfxOn = !Audio2.sfxOn; S.settings.sfx = Audio2.sfxOn; Audio2.applySettings(); Save.save(); }
    if (UI.button(220, 960, 640, 120, '타이틀로', { color: 'cream' })) { close(); Game.go('title'); }
    if (UI.button(220, 1100, 640, 110, '데이터 초기화', { color: 'peach' })) Game.popup = 'reset';
    if (UI.button(340, 1250, 400, 110, '닫기', { color: 'yellow' })) close();
  } else if (p === 'reset') {
    UI.panel(140, 650, 800, 600, 'lavender');
    text('정말 초기화할까요?', W / 2, 770, { size: 54, color: '#fff', stroke: '#4a2a5a' });
    text('모든 진행 상황이 사라져요', W / 2, 850, { size: 32, color: '#fff' });
    if (UI.button(200, 950, 330, 120, '초기화', { color: 'peach' })) { Save.reset(); close(); Game.go('title'); }
    if (UI.button(550, 950, 330, 120, '취소', { color: 'mint' })) close();
  } else if (p === 'energy') {
    UI.panel(140, 600, 800, 720, 'cream');
    text('에너지 충전', W / 2, 700, { size: 58 });
    imgFit('icon.energy', W / 2, 860, 180, 180);
    text(`현재 ${S.energy} / 50 · 2분마다 1 회복`, W / 2, 1000, { size: 32, color: '#7a5636' });
    if (UI.button(220, 1060, 640, 130, '에너지 50 충전', { color: 'yellow', icon: 'icon.gem', sub: '보석 30', disabled: S.gems < 30, onDisabled: () => Toast.show('보석이 부족해요', '#ffd36b') })) {
      S.gems -= 30; S.energy = Math.min(99, S.energy + 50); Save.save(); Audio2.sfx('chest'); Toast.show('에너지 충전 완료!', '#7affc1'); close();
    }
    if (UI.button(340, 1210, 400, 90, '닫기', { color: 'cream' })) close();
  } else if (p === 'upgraded') {
    const u = GrowthScene.lastUp;
    UI.panel(140, 620, 800, 640, 'cream');
    imgFit('icon.star', W / 2, 760, 180, 180);
    text('공방이 성장했어요!', W / 2, 910, { size: 56 });
    if (u) text(`${u.name} Lv.${Save.up(GrowthScene.tab, u.id)}`, W / 2, 990, { size: 36, color: '#2a9a5a' });
    if (u) text(u.desc(Save.up(GrowthScene.tab, u.id)), W / 2, 1050, { size: 30, color: '#7a5636' });
    if (UI.button(290, 1110, 500, 120, '좋아요', { color: 'yellow' })) close();
  } else if (p === 'codex') {
    UI.panel(40, 300, 1000, 1350, 'cream');
    text('수집 도감', W / 2, 390, { size: 56 });
    const maxT = S.maxTier || {};
    LINES.forEach((l, li) => {
      text(LINE_NAME[l], 80, 450 + li * 285, { size: 32, align: 'left', color: LINE_COLOR[l], stroke: '#4a2a10' });
      for (let tIdx = 1; tIdx <= MAX_TIER; tIdx++) {
        const x = 80 + ((tIdx - 1) % 8) * 116, y = 470 + li * 285 + Math.floor((tIdx - 1) / 8) * 108;
        imgFit('ui.board-cell', x + 54, y + 60, 108, 108);
        const got = (maxT[l] || 0) >= tIdx;
        ctx.save(); if (!got) { ctx.filter = 'brightness(0) opacity(0.3)'; }
        imgFit(`item.${l}.${tIdx}`, x + 54, y + 55, 90, 80);
        ctx.restore();
        text(`${tIdx}`, x + 90, y + 100, { size: 22, color: '#6a4a2a' });
      }
    });
    const cnt = LINES.reduce((a, l) => a + (maxT[l] || 0), 0);
    text(`수집률 ${cnt} / ${LINES.length * MAX_TIER}`, W / 2, 1580, { size: 34 });
    if (UI.hit(0, 0, W, H)) close();
  } else if (p === 'help') {
    UI.panel(60, 330, 960, 1300, 'cream');
    text('머지냥 디펜스 플레이 방법', W / 2, 420, { size: 48 });
    const lines = [
      ['icon.paw', '생산', '에너지 1로 대장장이 냥이가 아이템을 만들어요'],
      ['icon.star', '합성', '같은 라인·같은 단계 2개를 겹치면 다음 단계!'],
      ['icon.check', '연쇄 · 5개 합성', '옆에 같은 아이템이 있으면 자동 연쇄, 5개면 상위 2개'],
      ['icon.flag', '보급', '레일에 놓으면 자동 배달, 고양이 위에 놓으면 지정 배달'],
      ['icon.sword', '장비', '무기=공격력, 방어구=방어·체력 (뚱냥이 1.5배)'],
      ['icon.heart', '소모품', '회복·부활·버프, 성직냥이는 전체에 퍼뜨려요'],
      ['icon.yarn', '특수', '장착하지 않고 즉시 화면 전체 광역 공격'],
      ['icon.energy', '피버', '합성으로 게이지를 채우면 8초간 공격력 2배'],
      ['icon.rat', '보스', '"!" 경고 중 보급하면 긴급 보급 성공 → 반격'],
    ];
    lines.forEach(([ic, a, b], i) => {
      const y = 520 + i * 118;
      imgFit(ic, 130, y, 70, 70);
      text(a, 190, y - 22, { size: 34, align: 'left' });
      text(b, 190, y + 24, { size: 26, align: 'left', color: '#7a5636', maxW: 790 });
    });
    if (UI.button(340, 1500, 400, 100, '알겠어요', { color: 'yellow' })) close();
  }
  UI.layer = 0;
}
