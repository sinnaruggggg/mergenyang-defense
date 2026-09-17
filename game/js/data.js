// 게임 데이터 테이블과 에셋 목록 (기획서 기준)
'use strict';
const PATH_UI = '../art/raster-ui-v3/assets/';
const PATH_ANIM = '../art/raster-ui-v3/animations/';
const PATH_ATK = '../art/attack-motion-v4/characters/';

const LINES = ['weapon', 'armor', 'consumable', 'special'];
const LINE_NAME = { weapon: '무기', armor: '방어구', consumable: '소모품', special: '특수' };
const LINE_COLOR = { weapon: '#ff8a4c', armor: '#6fa8ff', consumable: '#5fd18b', special: '#d78bff' };
const ITEM_FILES = {
  weapon: ['twig', 'wood-sword', 'fishbone-dagger', 'iron-sword', 'flame-sword', 'ice-sword', 'royal-sword', 'churu-blade', 'claw-dagger', 'crystal-rapier', 'fishbone-greatsword', 'paw-rune-staff', 'moon-bow', 'royal-trident', 'rainbow-saber', 'pawblade'],
  armor: ['cardboard', 'leather', 'pot-lid', 'chainmail', 'iron-armor', 'knight-armor', 'royal-armor', 'cat-tower-armor', 'acorn-helmet', 'fish-vest', 'shell-armor', 'moon-knight', 'crystal-armor', 'royal-cape', 'rainbow-guard', 'star-tower'],
  consumable: ['anchovy', 'fish', 'tuna-can', 'fish-fillet', 'sashimi', 'salmon-bowl', 'churu', 'gold-churu', 'healing-sardine', 'spicy-soup', 'moon-milk', 'crystal-snack', 'salmon-platter', 'rainbow-churu', 'royal-feast', 'golden-banquet'],
  special: ['fluff', 'yarn', 'fur-bomb', 'fire-fur', 'lightning-fur', 'ice-fur', 'star-fur', 'giant-fur', 'wind-hairball', 'moon-yarn', 'crystal-paw-bomb', 'rainbow-lightning', 'comet-fur', 'catnip-vortex', 'paw-meteor', 'galaxy-hairball'],
};
const ITEM_NAMES = {
  weapon: ['나뭇가지', '나무검', '생선뼈 단검', '철검', '불꽃검', '얼음검', '왕실의 검', '전설의 츄르 블레이드', '발톱 단검', '수정 레이피어', '생선뼈 대검', '발바닥 룬 지팡이', '달빛 활', '왕실 삼지창', '무지개 츄르 세이버', '전설의 발바닥검'],
  armor: ['골판지', '가죽 조끼', '냄비뚜껑', '사슬 갑옷', '철갑', '기사 갑옷', '왕실 갑옷', '황금 캣타워 갑옷', '도토리 투구', '생선 조끼', '조개 갑옷', '달 기사 갑옷', '수정 캣아머', '왕실 망토 갑옷', '무지개 수호갑', '별빛 캣타워 갑옷'],
  consumable: ['멸치', '고등어', '통조림', '생선 살', '참치회', '연어 덮밥', '츄르', '황금 츄르', '치유 정어리', '매운 생선 수프', '달우유 그릇', '수정 간식', '구운 연어 플래터', '무지개 츄르 팩', '왕실 만찬', '황금 생선 연회'],
  special: ['털뭉치', '털실', '털폭탄', '불꽃 헤어볼', '번개 헤어볼', '얼음 헤어볼', '별빛 헤어볼', '거대 헤어볼', '바람 헤어볼', '달빛 털실 구슬', '수정 발바닥 폭탄', '무지개 번개 구슬', '별똥 털뭉치', '캣닢 소용돌이', '왕실 발바닥 운석', '은하 헤어볼'],
};
const TIER_MUL = t => Math.pow(2.2, t - 1);
const MAX_TIER = 16;
const ITEM_VALUE = {
  weapon: t => Math.round(7 * TIER_MUL(t)),          // 공격력 +
  armor: t => Math.round(3 * TIER_MUL(t)),           // 방어력 + (체력은 x6 · 스테이지 보정)
  consumable: t => Math.round(30 * TIER_MUL(t)),     // 회복량
  special: t => Math.round(28 * TIER_MUL(t)),        // 광역 피해
};

const CATS = {
  warrior: { name: '전사냥이', role: '근접 딜러', atkId: 'cat-warrior', anim: 'warrior', hp: 130, atk: 13, cd: 0.55, range: 190, crit: 0.12, prefer: 'weapon', melee: true, desc: '빠른 공격 속도로 적을 베어요' },
  tank: { view: 1.3, name: '뚱냥이', role: '탱커', atkId: 'cat-tank', anim: 'tank', hp: 240, atk: 8, cd: 0.9, range: 180, crit: 0.05, def: 6, prefer: 'armor', melee: true, desc: '몬스터를 끌어모으고 방어구 효과 1.5배' },
  archer: { name: '궁사냥이', role: '원거리 딜러', atkId: 'cat-archer', anim: 'archer', hp: 95, atk: 12, cd: 0.8, range: 720, crit: 0.32, prefer: 'weapon', desc: '후열에서 높은 치명타로 저격해요' },
  healer: { name: '성직냥이', role: '힐러', atkId: 'cat-healer', anim: 'healer', hp: 110, atk: 6, cd: 1.0, range: 680, crit: 0.05, prefer: 'consumable', heal: 14, desc: '소모품 효과를 아군 전체에 퍼뜨려요' },
  wizard: { name: '마법사냥이', role: '광역 딜러', atkId: 'cat-wizard', anim: 'wizard', hp: 95, atk: 11, cd: 1.35, range: 680, crit: 0.1, aoe: 190, magic: true, prefer: 'weapon', desc: '화염구로 여러 몬스터를 동시에 태워요' },
};
const CAT_IDS = ['warrior', 'tank', 'archer', 'healer', 'wizard'];

// 일반 몬스터: s=표시 배율, fly=공중, ranged=원거리 사거리
const ENEMIES = {
  rat: { name: '쥐 병사', atkId: 'enemy-rat', hp: 60, atk: 7, cd: 1.1, speed: 95, s: 0.62, gold: 3 },
  roach: { name: '바퀴벌레', atkId: 'enemy-roach', hp: 42, atk: 5, cd: 0.7, speed: 165, s: 0.5, gold: 2 },
  mushroom: { name: '독버섯', atkId: 'enemy-mushroom', hp: 80, atk: 5, cd: 1.6, speed: 70, s: 0.55, ranged: 360, poison: true, gold: 3 },
  crow: { name: '까마귀', atkId: 'enemy-crow', hp: 55, atk: 6, cd: 1.3, speed: 130, s: 0.45, ranged: 400, fly: true, gold: 3 },
  scorpion: { name: '전갈', atkId: 'enemy-scorpion', hp: 115, atk: 9, cd: 1.2, speed: 85, s: 0.48, poison: true, gold: 4 },
  mummy: { name: '미라 개', atkId: 'enemy-mummy', hp: 150, atk: 8, cd: 1.3, speed: 70, s: 0.58, gold: 4 },
  bat: { name: '얼음 박쥐', atkId: 'enemy-bat', hp: 60, atk: 7, cd: 0.9, speed: 170, s: 0.45, fly: true, gold: 3 },
  penguin: { name: '펭귄 기사', atkId: 'enemy-penguin', hp: 160, atk: 10, cd: 1.2, speed: 80, s: 0.6, armor: 0.25, gold: 5 },
  vacuum: { name: '청소기 로봇', atkId: 'enemy-vacuum', hp: 170, atk: 9, cd: 1.2, speed: 75, s: 0.55, shield: true, gold: 5 },
  drone: { name: '드론', atkId: 'enemy-drone', hp: 75, atk: 7, cd: 1.4, speed: 120, s: 0.45, ranged: 400, fly: true, shield: true, gold: 5 },
};

const BOSSES = {
  rat: { name: '쥐왕 찍찍대제', atkId: 'boss-rat', hp: 1500, atk: 22, cd: 1.6, s: 1.0, patterns: ['summon', 'charge'], tip: '광역 공격으로 쥐 떼를 정리하세요' },
  witch: { name: '까마귀 마녀', atkId: 'boss-witch', hp: 1700, atk: 18, cd: 1.5, s: 1.0, ranged: 520, patterns: ['poison', 'summon'], tip: '소모품을 연속 보급하세요' },
  sphinx: { name: '스핑크스 개', atkId: 'boss-sphinx', hp: 2000, atk: 24, cd: 1.6, s: 1.1, patterns: ['riddle', 'charge'], tip: '표시된 라인 아이템을 긴급 합성!' },
  crab: { name: '거대 얼음 게', atkId: 'boss-crab', hp: 2300, atk: 26, cd: 1.8, s: 1.1, patterns: ['freeze', 'armorbreak'], tip: '빙결 전에 합성, 방어구를 재보급' },
  mech: { name: '메카 진공청소기', atkId: 'boss-mech', hp: 2600, atk: 25, cd: 1.6, s: 1.2, shield: true, patterns: ['suck', 'shieldup'], tip: '흡입 전에 합성, 마법으로 보호막 해제' },
  // 월드보스
  eel: { name: '고대 뱀장어 킹', atkId: 'boss-eel', hp: 1e9, atk: 20, cd: 1.5, s: 1.05, patterns: ['shock', 'charge'], world: true, tip: '방어구 탱커 + 마법사냥이' },
  whale: { name: '하늘 고래', atkId: 'boss-whale', hp: 1e9, atk: 18, cd: 1.5, s: 1.3, fly: true, meleeHalf: true, patterns: ['charge', 'summon'], world: true, tip: '근접 피해 절반! 궁사·마법사' },
  golem: { name: '쓰레기산 골렘', atkId: 'boss-golem', hp: 1e9, atk: 22, cd: 1.7, s: 1.15, harden: true, patterns: ['summon', 'charge'], world: true, tip: '시간이 지날수록 단단해져요. 초반 폭딜!' },
  dog: { name: '암흑 개대왕', atkId: 'boss-dog', hp: 1e9, atk: 24, cd: 1.4, s: 1.15, patterns: ['rage', 'charge'], world: true, tip: '광폭화를 버티는 생존 조합' },
};
const WORLD_BOSS_ORDER = ['eel', 'whale', 'golem', 'dog'];

const CHAPTERS = [
  { name: '고양이 마을', enemies: ['rat', 'roach'], boss: 'rat', rule: '기본 규칙 학습' },
  { name: '어두운 숲', enemies: ['mushroom', 'crow'], boss: 'witch', rule: '독 상태이상 → 소모품이 중요' },
  { name: '사막 피라미드', enemies: ['scorpion', 'mummy'], boss: 'sphinx', rule: '모래폭풍: 보급 레일이 느려져요' },
  { name: '얼음 동굴', enemies: ['bat', 'penguin'], boss: 'crab', rule: '빙결: 보드 칸이 얼어붙어요' },
  { name: '로봇 공장', enemies: ['vacuum', 'drone'], boss: 'mech', rule: '방어막 몬스터 → 마법이 필요' },
];
const STAGES_PER_CHAPTER = 20;

// 스테이지 난이도 배율
function stageScale(g) {
  return { hp: 1 + g * 0.2 + g * g * 0.0025, atk: 1 + g * 0.06 + g * g * 0.0006 };
}
function recommendedCats(ch) {
  return [['warrior', 'wizard'], ['tank', 'healer'], ['archer', 'tank'], ['tank', 'warrior'], ['wizard', 'tank']][ch];
}

// 성장 항목
const FORGE_UPGRADES = [
  { id: 'startTier', name: '생산 시작 단계', icon: 'icon.forge', max: 10, desc: l => `2단계 아이템 생산 확률 ${l * 8}%`, cost: l => 300 * Math.pow(1.7, l) },
  { id: 'energyMax', name: '에너지 최대치', icon: 'icon.energy', max: 10, desc: l => `전투 시작 에너지 ${20 + l * 2}`, cost: l => 200 * Math.pow(1.6, l) },
  { id: 'energyRegen', name: '에너지 회복 속도', icon: 'icon.clock', max: 10, desc: l => `${(2.6 - l * 0.16).toFixed(2)}초마다 1 회복`, cost: l => 250 * Math.pow(1.65, l) },
  { id: 'autoMerge', name: '자동 생산', icon: 'icon.gear', max: 8, desc: l => l ? `${14 - l}초마다 무료 생산` : '대장장이 냥이가 스스로 생산', cost: l => 600 * Math.pow(1.8, l) },
];
const SMITH_UPGRADES = [
  { id: 'double', name: '한 번에 여러 개', icon: 'icon.paw', max: 10, desc: l => `2개 생산 확률 ${l * 6}%`, cost: l => 350 * Math.pow(1.7, l) },
  { id: 'weaponRate', name: '좋은 라인 확률', icon: 'icon.sword', max: 5, desc: l => `무기·방어구 확률 +${l * 3}%`, cost: l => 400 * Math.pow(1.8, l) },
  { id: 'fever', name: '피버 지속 시간', icon: 'icon.star', max: 5, desc: l => `피버 ${8 + l}초`, cost: l => 500 * Math.pow(1.8, l) },
];
// 합성 해금: 처음엔 4단계까지, 공방 레벨이 오를수록 한 단계씩
const FREE_MERGE_TIER = 4;
const MERGE_UNLOCK = [2, 4, 7, 10, 14, 18, 23, 28, 34, 40, 47, 54];
const workshopLevel = () => 1 + [...FORGE_UPGRADES.map(u => Save.up('forge', u.id)), ...SMITH_UPGRADES.map(u => Save.up('smith', u.id))].reduce((a, b) => a + b, 0);
const maxMergeTier = lvl => Math.min(MAX_TIER, FREE_MERGE_TIER + MERGE_UNLOCK.filter(v => v <= lvl).length);
const nextMergeUnlock = lvl => { const t = maxMergeTier(lvl) + 1; return t > MAX_TIER ? null : { tier: t, level: MERGE_UNLOCK[t - FREE_MERGE_TIER - 1] }; };
const catLevelCost = lv => Math.round(120 * Math.pow(1.32, lv - 1));
const catMul = lv => 1 + (lv - 1) * 0.25;

// ---------- 에셋 목록 ----------
function buildAssetMap() {
  const m = {};
  // 2.5D 대장간은 평면 배경과 전경 오브젝트를 분리한다.
  m['workshop2.bg'] = 'assets/workshop-2p5d/background.png';
  ['background','forge','bench','table','left-front','right-front','mage','scout','warrior'].forEach(id => m['workshop.approved.' + id] = `assets/workshop-approved/${id}.png`);
  m['workshop.approved.background']='assets/workshop-marked/background-live.png';
  ['reward','level','gold','mint','adventure'].forEach(id=>m['lobby.ui.'+id]=`assets/workshop-ui/${id}.png`);
  m['lobby.ui.main-background']='assets/workshop-ui/main-background.png';
  m['lobby.ui.smith']='assets/workshop-ui/smith-game-waist-up.png';
  m['shop.merchant']='assets/shop-merchant.png';
  ['forge','weapons','small-barrel','right-workbench','central-table','left-chest','right-armor'].forEach(id=>m['workshop.approved.'+id]=`assets/workshop-marked/${id}.png`);
  ['forge', 'bench', 'barrel', 'anvil', 'crates', 'lamp'].forEach(id => m[`workshop2.${id}`] = `assets/workshop-2p5d/${id}-grounded.png`);
  ['battle', 'shop', 'town', 'workshop'].forEach(b => m['bg.' + b] = PATH_UI + `backgrounds/${b}.png`);
  ['board-cell', 'ground-shadow', 'healing-aura', 'merge-glow', 'panel-cream', 'panel-dark', 'panel-lavender', 'panel-mint', 'panel-peach',
    'progress-gold', 'progress-mint', 'progress-red', 'progress-track', 'supply-rail', 'sword-arc', 'title-banner', 'tutorial-hand', 'victory-laurel',
    'mode-boss', 'mode-coop', 'mode-duel', 'mode-solo', 'mode-team', 'mode-tower'].forEach(u => m['ui.' + u] = PATH_UI + `ui/${u}.png`);
  ['cream', 'mint', 'peach', 'yellow'].forEach(c => ['normal', 'pressed', 'disabled', 'selected'].forEach(s => m[`ui.button-${c}-${s}`] = PATH_UI + `ui/button-${c}-${s}.png`));
  ['back', 'book', 'bow', 'can', 'cat', 'check', 'chest', 'clock', 'close', 'crown', 'energy', 'flag', 'forge', 'gear', 'gem', 'gold', 'heart', 'help', 'lock', 'mail',
    'pause', 'paw', 'people', 'play', 'plus', 'rat', 'scroll', 'shield', 'shop', 'star', 'sword', 'ticket', 'tree', 'trophy', 'wand', 'yarn'].forEach(i => m['icon.' + i] = PATH_UI + `icons/${i}.png`);
  LINES.forEach(l => ITEM_FILES[l].forEach((f, i) => {
    const t = i + 1;
    m[`item.${l}.${t}`] = t <= 8 ? PATH_UI + `items/item-${l}-${t}-${f}.png` : `assets/items-extra/item-${l}-${t}.png`;
  }));
  ['cat-archer', 'cat-healer', 'cat-smith', 'cat-tank', 'cat-warrior', 'cat-wizard', 'boss-rat', 'boss-eel'].forEach(c => m['char.' + c] = PATH_UI + `characters/${c}.png`);
  ['warrior', 'tank', 'archer', 'healer', 'wizard', 'smith'].forEach(a => ['idle-0', 'idle-1', 'action-0', 'action-1'].forEach(f => m[`anim.${a}.${f}`] = PATH_ANIM + `${a}/${f}.png`));
  const atkIds = ['cat-warrior', 'cat-tank', 'cat-archer', 'cat-healer', 'cat-wizard', 'cat-smith'];
  Object.values(ENEMIES).forEach(e => atkIds.push(e.atkId));
  Object.values(BOSSES).forEach(b => atkIds.push(b.atkId));
  atkIds.forEach(id => { m[`atk.${id}.0`] = PATH_ATK + `${id}/attack-0.png`; m[`atk.${id}.1`] = PATH_ATK + `${id}/attack-1.png`; });
  // 걷기 프레임은 원본 비트맵을 이동만 시켜 체격·실루엣을 고정한다.
  [...new Set(atkIds)].forEach(id => [0, 1].forEach(f => m[`walk.${id}.${f}`] = `assets/walk/${id}-walk-${f}.png`));
  return m;
}

// ---------- 저장 ----------
const SAVE_KEY = 'mergenyang-save-v1';
const Save = {
  data: null,
  defaults() {
    return {
      gold: 800, gems: 50, energy: 50, energyTime: Date.now(), lastSeen: Date.now(),
      cats: { warrior: 1, tank: 1, archer: 1, healer: 1, wizard: 1 },
      squad: ['warrior', 'healer'],
      forge: {}, smith: {},
      stars: {}, // "ch-st": 0~3
      tutorialDone: false,
      towerBest: 0, bossBest: 0, bossTotal: 0,
      codex: {}, dailyChest: '', settings: { bgm: true, sfx: true },
      plays: 0,
    };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { d = null; }
    this.data = Object.assign(this.defaults(), d || {});
    this.data.cats = Object.assign(this.defaults().cats, this.data.cats);
    return this.data;
  },
  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* 저장 불가 환경 */ }
  },
  reset() { this.data = this.defaults(); this.save(); },
  up(kind, id) { return (this.data[kind] && this.data[kind][id]) || 0; },
  // 로비 에너지: 2분마다 1 회복
  tickEnergy() {
    const d = this.data, per = 120000;
    if (d.energy >= 50) { d.energyTime = Date.now(); return; }
    const n = Math.floor((Date.now() - d.energyTime) / per);
    if (n > 0) { d.energy = Math.min(50, d.energy + n); d.energyTime += n * per; }
  },
  energyEta() { return Math.max(0, 120000 - (Date.now() - this.data.energyTime)); },
  unlockedChapter() {
    let ch = 0;
    while (ch < CHAPTERS.length - 1 && (this.data.stars[`${ch}-${STAGES_PER_CHAPTER - 1}`] || 0) > 0) ch++;
    return ch;
  },
  unlockedStage(ch) {
    let s = 0;
    while (s < STAGES_PER_CHAPTER - 1 && (this.data.stars[`${ch}-${s}`] || 0) > 0) s++;
    return s;
  },
  chapterStars(ch) {
    let n = 0;
    for (let s = 0; s < STAGES_PER_CHAPTER; s++) n += this.data.stars[`${ch}-${s}`] || 0;
    return n;
  },
  power() {
    return CAT_IDS.reduce((a, c) => a + Math.round((CATS[c].atk * 8 + CATS[c].hp) * catMul(this.data.cats[c])), 0);
  },
};
