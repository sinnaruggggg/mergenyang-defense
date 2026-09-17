// 메인 루프와 씬 전환
'use strict';
const Game = {
  scenes: { title: TitleScene, lobby: LobbyScene, cats: CatsScene, growth: GrowthScene, modes: ModesScene, stages: StagesScene, shop: ShopScene, ranking: RankingScene },
  scene: null, name: '', popup: null,
  fade: 0, fadeDir: 0, next: null,
  go(name, arg) {
    if (this.fadeDir) return;
    this.next = () => this.enter(name, arg);
    this.fadeDir = 1;
  },
  enter(name, arg) {
    this.popup = null;
    FX.clear();
    this.name = name;
    this.scene = name === 'battle' ? arg : this.scenes[name];
    if (this.scene.enter && name !== 'battle') this.scene.enter(arg);
    Input.handlers = this.scene;
    Input.click = null;
    Input.clicks.length = 0;
    Save.save();
  },
  startBattle(opts) {
    const S = Save.data;
    Save.tickEnergy();
    if (opts.mode === 'boss') {
      if ((S.bossTries || 0) <= 0) { Toast.show('오늘의 도전 횟수를 모두 썼어요', '#ffd36b'); return; }
      S.bossTries--;
    } else if (!opts.free) {
      if (S.energy < 5) { Toast.show('에너지가 부족해요!', '#ffd36b'); this.popup = 'energy'; return; }
      S.energy -= 5;
    }
    Save.save();
    const b = new Battle(opts);
    this.next = () => {
      this.enter('battle', b);
      Audio2.playBgm('battle');
    };
    this.fadeDir = 1;
    Audio2.sfx('supply');
  },
};

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(dt);
  requestAnimationFrame(frame);
}
// 한 프레임 처리 (테스트에서 직접 호출 가능)
function tick(dt) {
  // 전환 페이드
  if (Game.fadeDir === 1) {
    Game.fade += dt * 6;
    if (Game.fade >= 1) { Game.fade = 1; Game.fadeDir = -1; Game.next && Game.next(); Game.next = null; }
  } else if (Game.fadeDir === -1) {
    Game.fade -= dt * 4;
    if (Game.fade <= 0) { Game.fade = 0; Game.fadeDir = 0; }
  }
  const sc = Game.scene;
  Input.click = Input.clicks.shift() || null;
  if (sc) {
    if (!Game.popup) sc.update(dt);
    else if (Game.name !== 'battle') FX.update(dt);
    Toast.update(dt);
    UI.active = Game.popup ? 2 : sc.modalLayer ? sc.modalLayer() : 0;
    if (Game.fadeDir) UI.active = -1;
    UI.layer = 0;
    ctx.save();
    sc.draw();
    ctx.restore();
    drawPopup();
    Toast.draw && Game.name === 'battle' && Toast.draw();
  }
  if (Game.fade > 0) {
    ctx.save();
    ctx.globalAlpha = Game.fade;
    ctx.fillStyle = '#2a160c';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  Input.click = null;
}

function drawLoading(p) {
  ctx.fillStyle = '#f6e7cf';
  ctx.fillRect(0, 0, W, H);
  text('머지냥 디펜스', W / 2, 820, { size: 96, color: '#7a3a16', weight: 900 });
  ctx.fillStyle = '#e0c8a8';
  rrect(190, 960, 700, 40, 20); ctx.fill();
  ctx.fillStyle = '#f0a040';
  rrect(190, 960, 700 * p, 40, 20); ctx.fill();
  text(`고양이들이 망치를 챙기는 중... ${Math.round(p * 100)}%`, W / 2, 1060, { size: 34, color: '#7a5636' });
}

async function boot() {
  Save.load();
  Audio2.bgmOn = Save.data.settings.bgm !== false;
  Audio2.sfxOn = Save.data.settings.sfx !== false;
  drawLoading(0);
  try {
    const f = new FontFace('NK', 'url(../art/raster-ui-v3/fonts/NotoSansKR.ttf)');
    document.fonts.add(await f.load());
  } catch (e) { console.warn('폰트 로드 실패, 시스템 글꼴 사용', e); }
  await loadImages(buildAssetMap(), drawLoading);
  // 오래 떠나 있었으면 방치 보상 유지, 첫 실행이면 기준 시각 설정
  if (!Save.data.lastSeen) Save.data.lastSeen = Date.now();
  Game.enter('title');
  requestAnimationFrame(frame);
}
addEventListener('beforeunload', () => Save.save());
boot();
