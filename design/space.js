// ================================================================
//  우주 테마 : 천체를 뿌리면 각자 퍼지고, 결국 선으로 이어져 '하늘의 지도'가 된다
//  index.html 이 Space.start() / Space.pick() / Space.reset() ... 을 부른다
//  (지금 4단계까지 : 기본 구조·망점·크레용 선 도구 + 별·별자리 연결선 + 유성·혜성 + 토성·나선은하)
// ================================================================
const Space = (() => {

// ── 색 : 이 7개만 쓴다 ──
const PAL = { pink: '#FF4FA3', cyan: '#22B5E8', yellow: '#FFD93B', red: '#F0433A',
              orange: '#FF8A1F', cobalt: '#2A3FD0', emerald: '#1FA463' };
const BG = '#0c111c';                         // 배경 그림이 뜨기 전에 보일 색 (배경 그림의 평균 색)
const BG_IMG = 'img/space_bg.webp';           // 우주 배경 그림 (화면을 꽉 채운다)

// ── 조절값 ──
const CELL = 7;             // 망점 격자 간격(px). 작을수록 촘촘하다
const PLATE = {             // 판 어긋남(px) : 색마다 조금씩 틀어진 채로 찍힌다 (리소 인쇄 흉내)
  pink: [1.5, 0], cyan: [-1, 1], yellow: [0, -1.5], red: [1, 1],
  orange: [-1.5, -.5], cobalt: [0, 0], emerald: [.5, 1.5] };
const JITTER = 1.4;         // 크레용 선 흔들림(px)
const MAX_PARTS = 3000;     // 파티클(망점 먼지·별가루) 최대 개수. 넘치면 오래된 것부터 사라진다
const MAX_BODIES = 150;     // 천체(별로 남은 점 포함) 최대 개수. 넘치면 오래된 것부터 사라진다
const SIZE = { star: 64, comet: 120, meteor: 46, saturn: 140, galaxy: 160, supernova: 125, point: 16 };  // 천체 가로 크기(px, 화면 높이 800 기준)
const SATURN_TILT = 20 * Math.PI / 180;   // 토성이 랜덤으로 기울어지는 최대 각도 (지금은 ±20도)
const HEADING = 3 * Math.PI / 4;   // 혜성·유성 그림이 원래 향하는 방향 (왼쪽 아래). 이동 방향에 맞춰 이만큼 빼고 돌린다

// ── 별 ──
const STAR_KIDS = [1, 2];          // 별 하나가 퍼뜨리는 새끼 별 수 (최소, 최대)
const STAR_EVERY = [2, 4];         // 새끼 별이 하나씩 생기는 간격(초) (최소, 최대)
const STAR_KID_DIST = [55, 100];   // 새끼 별이 생기는 거리(px, 화면 높이 800 기준). 부모 가까이에만 생긴다
const STAR_KID_ROOM = 40;          // 다른 천체와 이만큼(px)은 떨어진 자리에만 생긴다 (겹치지 않게)
const STAR_KID_SIZE = [.4, .65];   // 새끼 별 크기 (원본의 몇 배)
const TWINKLE_SIZE = .05;          // 반짝일 때 크기가 변하는 정도 (5%)
const TWINKLE_ALPHA = .18;         // 반짝일 때 투명도가 변하는 정도

// ── 별자리 연결선 : 뿌린 것에서 바로 뻗어 나간다 ──
const LINK_DIST = 190;     // 이 거리(px, 화면 높이 800 기준) 안에 있는 점끼리 이어진다
const LINK_MAX = 3;        // 한 점에 이어지는 선은 최대 3개 (거미줄이 아니라 별자리처럼)
const LINK_ON_PLACE = 2;   // 클릭해서 놓으면 가까운 점 몇 개까지 선을 뻗는지
const LINK_DELAY = .12;    // 놓은 뒤 선이 뻗기 시작하기까지(초)
const LINK_SPEED = 320;    // 펜으로 긋는 속도(px/초)
const LINK_WIDTH = 2.2;    // 선 굵기(px)
const DRAG_GAP = 70;       // 별을 고르고 드래그하면 이 간격(px)마다 별이 놓이고 앞 별과 이어진다

// ── 유성 : 한 번 클릭하면 여러 개가 같은 방향으로 쏟아지고, 짧게 날아가다 멈춰서 남는다 ──
const METEOR_COUNT = [2, 14];      // 한 번에 쏟아지는 개수 (최소, 최대). 그냥 클릭하면 최소 개수
const METEOR_PER = 35;             // 이만큼(px) 더 길게 그을 때마다 유성이 하나씩 늘어난다
const METEOR_GAP = [.06, .2];      // 하나씩 떨어지는 시간차(초)
const METEOR_RUN = [120, 240];     // 날아가는 거리(px). 그 뒤 멈춘다 (화면 밖으로는 안 나간다)
const METEOR_TIME = [.45, .8];     // 그 거리를 날아가는 시간(초). 빠르게 출발해 서서히 멈춘다
const METEOR_TAIL = 150;           // 꼬리 길이(px)
const METEOR_SPREAD = 90;          // 유성우가 옆으로 퍼지는 폭(px)

// ── 혜성 : 균사처럼 빠르게 뻗어 나갔다 멈추고, 지나간 자리의 꼬리 선은 뒤쪽부터 옅어지며 사라진다 ──
const COMET_RUN = [220, 340];      // 날아가는 거리(px). 그 뒤 멈춘다
const COMET_TIME = [1, 1.6];       // 그 거리를 날아가는 시간(초)
const COMET_CURVE = .5;            // 날아가는 동안 휘는 정도(라디안). 클수록 많이 휜다
const COMET_SPREAD = .35;          // 지나간 자리의 꼬리 4가닥이 다 벌어지기까지(초)
const COMET_COLORS = ['cyan', 'pink', 'yellow', 'emerald'];   // 꼬리 4가닥 색
const COMET_LINE_HOLD = .12;       // 지나간 자리의 선이 그대로 진하게 있는 시간(초). 짧을수록 꼬리가 짧다
const COMET_LINE_FADE = .45;       // 그 뒤 선이 옅어져 사라지기까지(초)
const COMET_DUST_EVERY = .08;      // 날아가는 동안 꼬리 끝에서 먼지가 떨어지는 간격(초)
const COMET_DUST_LIFE = [2, 4];    // 그 먼지가 옅어져 사라지기까지(초)
const COMET_STAR = 0;              // 먼지가 별자리에 이어지는 작은 별 점으로 남을 확률 (0 이면 안 남는다. 다시 쓰려면 .08 정도)
const COMET_STAR_MAX = 3;          // 혜성 하나가 남기는 별 점 최대 개수

// ── 토성 : 둥실 떠 있고, 몇 초마다 고리 모양 파문이 퍼진다 ──
const SATURN_FLOAT = 6;            // 위아래로 떠 있는 폭(px)
const SATURN_RING_TILT = -.2;      // 그림 속 고리가 기울어진 각도(라디안). 파문도 이 기울기로 퍼진다
const SATURN_RING_RATIO = .3;      // 고리 타원의 납작한 정도 (세로 ÷ 가로)
const RIPPLE_EVERY = [3, 4.5];     // 파문이 생기는 간격(초)
const RIPPLE_LIFE = 3.5;           // 파문이 퍼지다 사라지기까지(초)
const RIPPLE_GROW = 3.2;           // 파문이 토성 고리의 몇 배까지 커지는지
const RIPPLE_LINK = true;          // 퍼지는 파문이 다른 천체에 닿으면 토성과 선으로 잇는다

// ── 나선은하 : 천천히 돌고, 팔 끝에서 별가루가 나선을 따라 흘러나간다 ──
const GALAXY_SPIN = -.30;          // 처음 도는 속도(라디안/초). 음수 = 반시계 방향 (팔이 휜 방향의 반대). 반대로 돌리려면 부호만 바꾼다
const GALAXY_SETTLE = 3;           // 이 시간(초)에 걸쳐 회전·커짐이 서서히 느려져 완전히 멈춘다
const GALAXY_GROW = 0.7;           // 멈출 때까지 이만큼 커진다 (1.3 = 1.3배)
const GALAXY_TIPS = [[.49, -.27], [-.49, .27]];   // 그림 속 두 팔 끝 위치 (가운데 기준, 그림 가로 크기의 몇 배)
const GALAXY_DISC_ANGLE = -.49;    // 그림 속 은하 원반이 기운 각도(라디안). 별가루 나선도 이 원반 위에 그려진다
const GALAXY_DISC_RATIO = .45;     // 원반이 비스듬해 납작해 보이는 정도 (세로 ÷ 가로)
const GALAXY_PITCH = .6;           // 나선이 벌어지는 정도. 클수록 팔이 빨리 바깥으로 풀린다
const GALAXY_DUST_EVERY = .045;    // 별가루가 나오는 간격(초). 단, 나선이 멈추기 전에 다 나오도록 필요하면 더 촘촘해진다
const GALAXY_DUST_MAX = 170;       // 은하 하나가 내보내는 별가루 수 (다 나오면 멈춘다)
const GALAXY_DUST_ARC = [.2, 1.5]; // 별가루가 팔 끝에서 나선을 따라 나아가는 길이(라디안). 이만큼 가서 멈춘다
const GALAXY_DUST_TIME = [.25, .7];// 그 길을 가는 시간(초). 짧을수록 빠르게 뻗는다
const GALAXY_DUST_WIDTH = .012;    // 나선 줄기의 폭 (그림 가로 크기의 몇 배). 작을수록 가늘고 날렵하다

// ── 상태 ──
let cv, ctx, active = false, kind = null;
let bodies = [], parts = [], links = [], seq = 0;
let later = [];                     // 조금 뒤에 할 일 (유성우가 시간차로 떨어질 때) : [{ t: 시각, fn }]
let shake = 0;                      // 화면 흔들림 세기 (초신성에서 쓴다)
let sample = false;                 // S 키 : 스타일 견본 보기
let now = 0, last = 0;

const sprites = {};
for (const k in SIZE) if (ASSETS[`img/space/${k}.webp`]) { sprites[k] = new Image(); sprites[k].src = ASSETS[`img/space/${k}.webp`]; }   // assets.js 에 담아 둔 그림

// 배경 : 화면 크기에 맞춰 한 번 그려 두고(bgCache), 매 프레임엔 그걸 붙이기만 한다
const bgPic = new Image(), bgCache = document.createElement('canvas');
bgPic.onload = () => makeBg();
bgPic.src = ASSETS[BG_IMG];
function makeBg() {
  if (!bgPic.complete || !bgPic.width) return;
  const W = bgCache.width = innerWidth * devicePixelRatio, H = bgCache.height = innerHeight * devicePixelRatio;
  const s = Math.max(W / bgPic.width, H / bgPic.height);        // 꽉 채우기 (가운데 맞춤, 넘치는 부분은 잘림)
  bgCache.getContext('2d').drawImage(bgPic, (W - bgPic.width * s) / 2, (H - bgPic.height * s) / 2, bgPic.width * s, bgPic.height * s);
}

const unit = () => innerHeight / 800;                         // 화면 크기에 맞춘 배율
const rand = (a, b) => a + Math.random() * (b - a);
// 같은 숫자를 넣으면 늘 같은 0~1 값 : 선의 흔들림을 고정해서 매 프레임 떨리지 않게 한다
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
// 부드러운 흔들림 (-1~1) : 18px 마다 정한 값 사이를 매끄럽게 잇는다
function wobble(seed, s, wave = 18) {
  const k = s / wave, i = Math.floor(k), f = k - i, e = f * f * (3 - 2 * f);
  return (hash(seed * 53 + i) * (1 - e) + hash(seed * 53 + i + 1) * e) * 2 - 1;
}

// ================================================================
//  스타일 도구
// ================================================================

// 망점 하나. 색마다 정해진 만큼 어긋나게 찍는다
function dot(x, y, r, color) {
  if (r < .3) return;
  const [dx, dy] = PLATE[color];
  ctx.fillStyle = PAL[color];
  ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 6.2832); ctx.fill();
}

// 망점 면 : (cx, cy) 둘레 R 안의 격자 칸마다, density(x, y) (0~1) 만큼 큰 원을 찍는다
// 농도는 오직 원의 크기로만 표현한다 (빛 번짐·그라데이션 없이)
function dotField(cx, cy, R, density, color, cell = CELL) {
  const x0 = Math.floor((cx - R) / cell) * cell, y0 = Math.floor((cy - R) / cell) * cell;
  const [dx, dy] = PLATE[color];
  ctx.fillStyle = PAL[color]; ctx.beginPath();
  for (let y = y0; y <= cy + R; y += cell)
    for (let x = x0; x <= cx + R; x += cell) {
      const d = density(x, y);
      if (d <= .02) continue;
      const r = cell * .5 * Math.sqrt(Math.min(1, d));
      ctx.moveTo(x + dx + r, y + dy); ctx.arc(x + dx, y + dy, r, 0, 6.2832);
    }
  ctx.fill();
}

// 크레용 선 : 점들을 따라 살짝 흔들리며 긋고, 양 끝은 망점처럼 끊어지며 사라진다
//  pts      : [{x, y}, ...] 지나갈 점들
//  progress : 0~1, 펜으로 긋듯 앞에서부터 얼마나 그렸는지
//  seed     : 선마다 다른 숫자. 같은 선은 늘 같은 모양으로 흔들린다
//  ends     : 끝이 망점으로 부서지는 길이(px)
//  alpha    : 전체 진하기 (Dry 로 옅어질 때)
function crayonPath(pts, { color = 'cobalt', width = 2, progress = 1, seed = 1, ends = 16, alpha = 1 } = {}) {
  // 1) 일정 간격(4px)으로 다시 나누고, 점마다 옆으로 살짝 흔든다
  const S = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  if (total < 1) return;
  const step = 4, drawn = total * Math.min(1, progress);
  let seg = 1, segStart = 0;
  for (let s = 0; s <= drawn; s += step) {
    while (seg < pts.length - 1 && segStart + Math.hypot(pts[seg].x - pts[seg - 1].x, pts[seg].y - pts[seg - 1].y) < s) {
      segStart += Math.hypot(pts[seg].x - pts[seg - 1].x, pts[seg].y - pts[seg - 1].y); seg++;
    }
    const a = pts[seg - 1], b = pts[seg], L = Math.hypot(b.x - a.x, b.y - a.y) || 1, t = Math.min(1, (s - segStart) / L);
    const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L, i = Math.round(s / step);
    const j = wobble(seed, s) * JITTER + (hash(seed * 91 + i) - .5) * .5;   // 완만한 흔들림 + 아주 잔 떨림
    S.push({ x: a.x + (b.x - a.x) * t + nx * j, y: a.y + (b.y - a.y) * t + ny * j, s, nx, ny, i });
  }
  // 2) 양 끝에서 얼마나 '단단한' 선인지 (0 이면 끝, 1 이면 가운데)
  const fadeLen = Math.min(ends, total * .3);
  const solid = s => Math.min(1, s / fadeLen, (total - s) / fadeLen);

  ctx.strokeStyle = PAL[color]; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // 가운데 단단한 부분 : 두 번 겹쳐 그어 크레용 결을 낸다 (두 번째는 살짝 옆, 더 가늘게)
  for (const pass of [0, 1]) {
    ctx.lineWidth = pass ? width * .55 : width;
    ctx.globalAlpha = (pass ? .55 : 1) * alpha;
    ctx.beginPath(); let on = false;
    for (const p of S) {
      if (solid(p.s) < 1) { on = false; continue; }
      const o = pass ? (hash(seed * 7 + p.i) - .5) * 1.6 + .8 : 0;
      const x = p.x + p.nx * o, y = p.y + p.ny * o;
      on ? ctx.lineTo(x, y) : ctx.moveTo(x, y); on = true;
    }
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;
  // 끝부분 : 끝으로 갈수록 점이 작아지고 사이가 벌어진다
  for (const p of S) {
    const k = solid(p.s);
    if (k >= 1) continue;
    const gap = 1 + Math.round((1 - k) * 3);
    if (p.i % gap) continue;
    dot(p.x, p.y, width * .5 * (.35 + .65 * k), color);
  }
  ctx.globalAlpha = 1;
}
const crayonLine = (x1, y1, x2, y2, o) => crayonPath([{ x: x1, y: y1 }, { x: x2, y: y2 }], o);

// 튕기듯 커지는 움직임 (0 → 살짝 넘쳤다가 → 1)
function popIn(t, over = 1.7) {
  if (t >= 1) return 1;
  t -= 1; return 1 + (over + 1) * t * t * t + over * t * t;
}

// 파티클 추가 : 넘치면 오래된 것부터 지운다
function addPart(p) {
  p.dim = 1; parts.push(p);
  if (parts.length > MAX_PARTS) parts.splice(0, parts.length - MAX_PARTS);
  return p;
}

// ================================================================
//  천체
// ================================================================
// 천체마다 init(처음), update(매 프레임), draw(그리기) 를 따로 정할 수 있다. 없으면 기본 동작
// link: true 인 천체는 별자리 연결선의 점이 된다
const TYPES = {
  // 별 : 튕기듯 나타나 아주 느리게 반짝이고, 몇 초마다 주변에 작은 별을 2~4개 퍼뜨린다
  star: {
    link: true,
    init(b) {
      b.rot = rand(0, Math.PI * 2);                  // 놓일 때마다 방향이 랜덤
      b.ph = rand(0, Math.PI * 2);                   // 반짝임 박자를 별마다 다르게
      b.gen ??= 0;                                   // 0 : 클릭한 별, 1 : 새끼 별 (새끼는 더 퍼뜨리지 않는다)
      if (b.gen == 0) { b.kids = Math.round(rand(...STAR_KIDS)); b.next = now + rand(...STAR_EVERY); }
    },
    update(b, age) {
      // 반짝임 : 크기와 투명도가 아주 천천히, 미세하게 바뀐다
      b.scale = popIn(Math.min(1, age / .6)) * (1 + TWINKLE_SIZE * Math.sin(now * 1.1 + b.ph));
      b.alpha = 1 - TWINKLE_ALPHA * (.5 + .5 * Math.sin(now * .7 + b.ph * 2));
      if (b.kids > 0 && now >= b.next) { b.kids--; b.next = now + rand(...STAR_EVERY); spawnKidStar(b); }
    },
  },
  supernova: { init: b => b.rot = rand(0, Math.PI * 2) },   // 놓일 때마다 방향이 랜덤
  // 나선은하 : 랜덤 각도로 놓여 돌면서 조금씩 커지다(최대 1.3배) 서서히 멈춘다.
  //            두 팔 끝에서 핑크·시안 망점 별가루가 팔의 나선을 그대로 이어 가늘게 뻗어 나가고, 은하와 함께 멈춰 남는다
  galaxy: {
    init(b) { b.rot = rand(0, Math.PI * 2); b.dust = 0; b.tip = 0; },
    update(b, age, dt) {
      const k = Math.min(1, age / GALAXY_SETTLE);
      b.rot += GALAXY_SPIN * dt * (1 - k) * (1 - k);                 // 점점 느려지다 멈춘다
      b.settled = k >= 1;
      b.scale = popIn(Math.min(1, age / .6)) * (1 + (GALAXY_GROW - 1) * easeOut(k));
      // 별가루는 나선이 멈추기 전에 다 나오고 다 뻗도록, 멈추는 시간(GALAXY_SETTLE)의 75% 안에 모두 내보낸다
      // (흐른 시간에 맞춰 내보낼 개수를 정하므로, 화면이 버벅여도 멈출 때는 다 나와 있다)
      const every = Math.min(GALAXY_DUST_EVERY, GALAXY_SETTLE * .75 / GALAXY_DUST_MAX);
      const due = Math.min(GALAXY_DUST_MAX, Math.floor(Math.max(0, age - .3) / every));
      while (b.dust < due) { b.dust++; galaxyDust(b, age); }
    },
  },
  // 토성 : 뒤집히지 않게 살짝만 기울인다 (SATURN_TILT 안에서 랜덤)
  // 토성 : 둥실 위아래로 떠 있고, 몇 초마다 고리와 같은 기울기의 시안·에메랄드 망점 파문이 퍼진다.
  //        퍼지는 파문이 다른 천체에 닿으면 토성과 그 천체가 선으로 이어진다
  saturn: {
    init(b) { b.rot = rand(-SATURN_TILT, SATURN_TILT); b.y0 = b.y; b.ph = rand(0, 6.28); b.ripples = []; b.next = now + 1; },
    update(b, age) {
      b.scale = popIn(Math.min(1, age / .6));
      b.y = b.y0 + Math.sin(now * .6 + b.ph) * SATURN_FLOAT * unit();
      if (now >= b.next) { b.next = now + rand(...RIPPLE_EVERY); b.ripples.push({ born: now, hit: new Set(), last: 0 }); }
      b.ripples = b.ripples.filter(r => now - r.born < RIPPLE_LIFE);
      if (RIPPLE_LINK) for (const r of b.ripples) rippleTouch(b, r);
    },
    draw(b) { for (const r of b.ripples) drawRipple(b, r); drawSprite(b); },
  },

  // 별로 남은 점 : 혜성 먼지·유성이 남기는 아주 작은 노랑 망점 별. 별자리 연결망에 합류한다
  point: {
    link: true,
    init(b) { b.ph = rand(0, Math.PI * 2); },
    update(b, age) {
      b.scale = popIn(Math.min(1, age / .5));
      b.alpha = 1 - TWINKLE_ALPHA * (.5 + .5 * Math.sin(now * .9 + b.ph));
    },
    draw(b) {
      const u = unit() * b.scale;
      ctx.globalAlpha = b.alpha * b.dim;
      dot(b.x, b.y, 2.8 * u, 'yellow');                                  // 가운데 큰 망점
      for (let k = 0; k < 4; k++)                                        // 둘레에 작은 망점 4개 (반짝이는 모양)
        dot(b.x + Math.cos(k * Math.PI / 2 + b.ph) * 5.5 * u, b.y + Math.sin(k * Math.PI / 2 + b.ph) * 5.5 * u, .9 * u, 'yellow');
      ctx.globalAlpha = 1;
    },
  },

  // 유성 : 빠르게 출발해 짧게 날아가다 화면 안에서 멈춘다. 꼬리는 노랑 → 주황 → 빨강으로 가늘어지다 망점으로 부서진다.
  //        멈추면 주황 망점 파편이 잠깐 튀고, 꼬리는 머리 쪽으로 줄어들며 망점 자국을 남긴다. 유성은 그 자리에 그림으로 남는다 (별자리 선은 잇지 않는다)
  meteor: {
    init(b) {
      b.dir ??= rand(0, Math.PI * 2); b.rot = b.dir - HEADING;   // 뾰족한 끝이 날아가는 방향을 본다
      b.x0 = b.x; b.y0 = b.y; b.trav = 0; b.tail = 0;
      b.run = Math.min(rand(...METEOR_RUN) * unit(), roomAhead(b.x, b.y, b.dir));
      b.T = rand(...METEOR_TIME);
      if (b.still) { b.stopped = now; b.tail0 = 0; }    // 그냥 클릭 : 날아가지 않고 그 자리에 톡 생긴다
    },
    update(b, age) {
      b.scale = popIn(Math.min(1, age / (b.still ? .6 : .15)));
      if (!b.stopped) {
        const p = Math.min(1, age / b.T);
        b.trav = b.run * easeOut(p);
        b.x = b.x0 + Math.cos(b.dir) * b.trav; b.y = b.y0 + Math.sin(b.dir) * b.trav;
        b.tail = Math.min(b.trav, METEOR_TAIL * unit());
        if (p >= 1) meteorStop(b);
      } else {
        b.tail = b.tail0 * Math.max(0, 1 - (now - b.stopped) / .5);   // 꼬리가 머리 쪽으로 0.5초 동안 줄어든다
      }
    },
    draw(b) { if (b.tail > 1) meteorTail(b); drawSprite(b); },
  },

  // 혜성 : 클릭한 곳에서 (드래그하면 그 방향으로) 균사처럼 빠르게 뻗어 나가다 서서히 멈춘다.
  //        머리가 지나간 자리에 4가닥 물결 선이 그어지고, 지나가자마자 뒤쪽부터 옅어지며 사라진다 (흔적처럼).
  //        혜성 그림은 그 자리에 남는다 (별자리 선은 잇지 않는다)
  comet: {
    init(b) {
      b.rot = b.dir - HEADING; b.dir0 = b.dir; b.pn = 0;
      b.path = [{ x: b.x, y: b.y, t: now, i: 0, nx: -Math.sin(b.dir), ny: Math.cos(b.dir) }];
      b.turn = rand(-1, 1) * COMET_CURVE; b.T = rand(...COMET_TIME); b.trav = 0;
      b.run = Math.min(rand(...COMET_RUN) * unit(), roomAhead(b.x, b.y, b.dir));
      b.dropT = 0; b.stars = 0;
      // 가닥마다 길이·흔들림·물결 박자를 조금씩 다르게
      // side : 가닥끼리 벌어지는 정도, amp : 물결 크기, freq : 물결 촘촘함, len : 가닥이 남는 시간 배율
      b.strands = COMET_COLORS.map((color, i) => ({ color, seed: b.id * 10 + i, len: rand(.7, 1.15), amp: rand(6, 14),
                                                     freq: rand(.02, .045), ph: rand(0, 6.28), side: (i - 1.5) * 10 + rand(-3, 3) }));
    },
    update(b, age, dt) {
      b.scale = popIn(Math.min(1, age / .6));
      if (!b.stopped) {
        // 빠르게 출발해 서서히 멈춘다 (균사가 뻗듯이)
        const p = Math.min(1, age / b.T), tr = b.run * easeOut(p), step = tr - b.trav;
        b.trav = tr; b.dir = b.dir0 + b.turn * easeOut(p); b.rot = b.dir - HEADING;
        b.x += Math.cos(b.dir) * step; b.y += Math.sin(b.dir) * step;
        // 지나온 자리 : 빠르게 움직여도 4px 마다 빠짐없이 점을 채워 넣고, 지나간 시각(t)과 그때의 옆 방향(nx, ny)을 적어 둔다
        for (let p0 = b.path[0], gap; (gap = Math.hypot(b.x - p0.x, b.y - p0.y)) >= 4; p0 = b.path[0])
          b.path.unshift({ x: p0.x + (b.x - p0.x) * 4 / gap, y: p0.y + (b.y - p0.y) * 4 / gap, t: now,
                           i: ++b.pn, nx: -Math.sin(b.dir), ny: Math.cos(b.dir) });
        // 날아가는 동안 꼬리 쪽에서 먼지가 떨어져 천천히 옅어진다. (COMET_STAR 를 켜면 가끔 별 점으로 남는다)
        if ((b.dropT -= dt) <= 0) {
          b.dropT = COMET_DUST_EVERY;
          const s = b.strands[Math.floor(Math.random() * 4)], end = strandAt(b, s, b.path[b.path.length - 1]);
          if (b.path.length > 6) {
            const life = rand(...COMET_DUST_LIFE);
            addPart({ x: end.x + rand(-4, 4), y: end.y + rand(-4, 4), vx: rand(-6, 6), vy: rand(-6, 6),
                      r: rand(1.2, 2.6) * unit(), color: s.color, life, fadeOut: life, drag: .99 });
            if (Math.random() < COMET_STAR && b.stars < COMET_STAR_MAX) { b.stars++; place('point', end.x, end.y, {}, 1); }
          }
        }
        if (p >= 1) b.stopped = now;
      }
      // 다 사라진 옛 자리는 지운다
      while (b.path.length > 1 && now - b.path[b.path.length - 1].t > (COMET_LINE_HOLD + COMET_LINE_FADE) * 1.15) b.path.pop();
    },
    draw(b) { for (const s of b.strands) cometStrand(b, s); drawSprite(b); },
  },
};

const easeOut = t => 1 - Math.pow(1 - t, 3);   // 빠르게 출발해서 서서히 멈추는 움직임

// ── 토성 파문 ──
// 파문 하나의 지금 모양 : k (0 → 1, 얼마나 퍼졌나), 타원의 가로·세로 반지름, 기울기
function rippleShape(b, r) {
  const k = Math.min(1, (now - r.born) / RIPPLE_LIFE), g = 1 + (RIPPLE_GROW - 1) * easeOut(k);
  const rx = b.w * b.scale * .5 * g;
  return { k, rx, ry: rx * SATURN_RING_RATIO, tilt: b.rot + SATURN_RING_TILT };
}

// 파문 그리기 : 타원을 따라 시안(바깥)·에메랄드(안쪽) 망점 두 줄. 퍼질수록 망점이 작아져 옅어진다
function drawRipple(b, r) {
  const { k, rx, ry, tilt } = rippleShape(b, r), dens = (1 - k) * .9;
  if (dens <= .02) return;
  const c = Math.cos(tilt), s = Math.sin(tilt), rad = CELL * .5 * Math.sqrt(dens);
  ctx.globalAlpha = b.dim;
  for (const [color, sc] of [['cyan', 1], ['emerald', .92]]) {
    const ax = rx * sc, ay = ry * sc, n = Math.max(12, Math.round(2 * Math.PI * Math.sqrt((ax * ax + ay * ay) / 2) / CELL));
    const [dx, dy] = PLATE[color];
    ctx.fillStyle = PAL[color]; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const t = i / n * Math.PI * 2, ex = Math.cos(t) * ax, ey = Math.sin(t) * ay;
      const x = b.x + ex * c - ey * s + dx, y = b.y + ex * s + ey * c + dy;
      ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, 6.2832);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// 퍼지는 파문 안에 들어온 천체가 있으면 토성과 선으로 잇는다 (유성·혜성은 빼고, 한 파문에 한 번씩)
function rippleTouch(b, r) {
  const { rx, ry, tilt } = rippleShape(b, r), c = Math.cos(-tilt), s = Math.sin(-tilt);
  for (const o of bodies) {
    if (o === b || o.dead || r.hit.has(o) || o.type == 'meteor' || o.type == 'comet') continue;
    const dx = o.x - b.x, dy = o.y - b.y, lx = dx * c - dy * s, ly = dx * s + dy * c;
    if ((lx / rx) ** 2 + (ly / ry) ** 2 > 1) continue;
    r.hit.add(o);
    if (!links.some(l => crosses(b, o, l.a, l.b))) link(b, o, now, true);
  }
}

// ── 은하 별가루 ──
// 별가루는 은하 원반 위의 나선 궤도를 따라간다. 원반은 그림처럼 기울고 납작하므로,
// 그림 좌표 ↔ 원반 좌표를 오가며 계산한다 (그림 가로 크기 = 1 기준)
const DC = Math.cos(GALAXY_DISC_ANGLE), DS = Math.sin(GALAXY_DISC_ANGLE);
const toDisc = (x, y) => [x * DC + y * DS, (-x * DS + y * DC) / GALAXY_DISC_RATIO];
const fromDisc = (x, y) => { y *= GALAXY_DISC_RATIO; return [x * DC - y * DS, x * DS + y * DC]; };

// 팔 끝에서 별가루 하나 : 팔의 나선을 그대로 이어 바깥으로 빠르게 뻗어 나가다 멈춘다.
// 모두 같은 궤도 위를 가기 때문에 가늘고 날렵한 줄기가 된다
function galaxyDust(b, age) {
  const [dx, dy] = toDisc(...GALAXY_TIPS[b.tip++ % 2]);
  const T = Math.min(rand(...GALAXY_DUST_TIME), Math.max(.12, GALAXY_SETTLE - age));   // 나선이 멈출 때 같이 다 뻗어 있도록
  const p = addPart({ x: b.x, y: b.y, vx: 0, vy: 0, g: b, th0: Math.atan2(dy, dx), r0: Math.hypot(dx, dy), age: 0,
            arc: rand(...GALAXY_DUST_ARC), T, j: rand(-1, 1) * GALAXY_DUST_WIDTH,
            r: rand(.8, 1.7) * unit(), color: Math.random() < .5 ? 'pink' : 'cyan', life: Infinity, upd: spiralStep });
  spiralStep(p, 0);   // 바로 팔 끝 자리에 놓는다
}

// 별가루 움직임 : 은하와 함께 돌고 커지며, 자기 길(arc)만큼 나선을 따라간다. 은하가 멈추면 같이 멈춘다
function spiralStep(p, dt) {
  const g = p.g;
  if (g.dead) { p.upd = null; return; }
  p.age += dt;
  const u = easeOut(Math.min(1, p.age / p.T)), turn = -Math.sign(GALAXY_SPIN) || 1;   // 팔이 휜 방향으로
  const th = p.th0 + turn * p.arc * u, r = p.r0 * Math.exp(GALAXY_PITCH * p.arc * u) + p.j;
  const [lx, ly] = fromDisc(Math.cos(th) * r, Math.sin(th) * r);
  const w = g.w * g.scale, c = Math.cos(g.rot), s = Math.sin(g.rot);
  p.x = g.x + (lx * c - ly * s) * w; p.y = g.y + (lx * s + ly * c) * w;
  if (u >= 1 && g.settled) p.upd = null;                      // 은하도 멈추고 자기 길도 다 가면 그 자리에 남는다
}

// (x, y) 에서 dir 방향으로 화면 안에 머물 수 있는 거리 (아래 버튼 줄은 피한다)
function roomAhead(x, y, dir, m = 40) {
  const c = Math.cos(dir), s = Math.sin(dir);
  let t = Infinity;
  if (c > 1e-6) t = Math.min(t, (innerWidth - m - x) / c);
  if (c < -1e-6) t = Math.min(t, (m - x) / c);
  if (s > 1e-6) t = Math.min(t, (innerHeight * .85 - y) / s);
  if (s < -1e-6) t = Math.min(t, (m - y) / s);
  return Math.max(0, t);
}

// 유성이 멈출 때 : 파편이 잠깐 튀고, 꼬리 자리에 망점 자국이 남는다
function meteorStop(b) {
  b.stopped = now; b.tail0 = b.tail;
  for (let k = 0; k < 9; k++) {
    const a = rand(0, Math.PI * 2), s = rand(40, 140) * unit();
    addPart({ x: b.x, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(1, 2.4) * unit(),
              color: Math.random() < .7 ? 'orange' : 'yellow', life: rand(.35, .7), fadeOut: .7, drag: .9 });
  }
  // 꼬리 자국 : 머리 쪽은 큰 노랑, 멀어질수록 작은 빨강 망점 (계속 남는다)
  const ux = Math.cos(b.dir), uy = Math.sin(b.dir), hx = b.x - ux * b.w * .3, hy = b.y - uy * b.w * .3;
  for (let s = 0; s < b.tail; s += 7) {
    const t = s / b.tail;
    addPart({ x: hx - ux * s + rand(-1.5, 1.5), y: hy - uy * s + rand(-1.5, 1.5), vx: 0, vy: 0, life: Infinity,
              r: (1.8 - 1.3 * t) * unit(), color: t < .3 ? 'yellow' : t < .6 ? 'orange' : 'red' });
  }
}

// 혜성 꼬리 한 가닥에서, 지나온 자리 p 에 그어진 점.
// 머리가 지나간 그 자리에 고정돼 있고, 시간이 지나며 옆으로 조금씩 벌어지고 물결이 커진다 (연기처럼)
function strandAt(b, s, p) {
  const g = Math.min(1, (now - p.t) / COMET_SPREAD);
  const off = (s.side + Math.sin(p.i * 4 * s.freq + s.ph) * s.amp) * g
            + (hash(s.seed * 97 + p.i) - .5) * 1.2;   // 크레용처럼 아주 살짝 흔들림
  return { x: p.x + p.nx * off, y: p.y + p.ny * off, t: p.t };
}

// 혜성 꼬리 한 가닥 그리기 : 머리가 지나간 자리에 선이 그어지고, 곧 뒤쪽부터 옅어지며 사라진다
const cometFade = (age, s) => {
  const hold = COMET_LINE_HOLD * s.len, fade = COMET_LINE_FADE * s.len;   // 가닥마다 길이가 조금씩 다르다
  return age < hold ? 1 : Math.max(0, 1 - (age - hold) / fade);
};
function cometStrand(b, s) {
  ctx.strokeStyle = PAL[s.color]; ctx.lineWidth = 2.2 * unit(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let prev = null, lvl = -1;
  for (const p of b.path) {                          // 머리 쪽부터 (그림에 가려지는 부분도 이어서 그린다)
    const q = strandAt(b, s, p);
    const a = Math.round(cometFade(now - q.t, s) * 8) / 8;   // 진하기를 8단계로 나눠, 같은 진하기끼리 한 번에 긋는다
    if (a !== lvl) {
      if (lvl > 0) ctx.stroke();
      lvl = a; ctx.globalAlpha = a * b.dim; ctx.beginPath();
      const o = prev || q; ctx.moveTo(o.x, o.y);
    }
    if (a > 0) ctx.lineTo(q.x, q.y);
    prev = q;
  }
  if (lvl > 0) ctx.stroke();
  ctx.globalAlpha = 1;
}

// 유성 꼬리 : 직선. 머리 쪽은 굵은 노랑 → 주황 → 가는 빨강, 맨 끝은 망점으로 부서진다
function meteorTail(b) {
  const L = b.tail, ux = Math.cos(b.dir), uy = Math.sin(b.dir), step = 4;
  const hx = b.x - ux * b.w * .3, hy = b.y - uy * b.w * .3;            // 머리 그림 바로 뒤에서 시작
  ctx.lineCap = 'round'; ctx.globalAlpha = b.dim;
  for (let s = 0, i = 0; s < L; s += step, i++) {
    const t = s / L, j = (hash(b.id * 31 + i) - .5) * .8;              // 아주 살짝만 흔들리는 직선
    const x = hx - ux * s - uy * j, y = hy - uy * s + ux * j;
    if (t < .8) {
      const c = t < .3 ? 'yellow' : t < .58 ? 'orange' : 'red';
      ctx.strokeStyle = PAL[c]; ctx.lineWidth = (5 - 3.8 * t / .8) * unit();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - ux * step, y - uy * step); ctx.stroke();
    } else {
      const k = (1 - t) / .2;                                            // 1 → 0 : 끝으로 갈수록 작고 듬성듬성
      if (i % (1 + Math.round((1 - k) * 2))) continue;
      dot(x, y, (.5 + 1.5 * k) * unit(), i % 2 ? 'red' : 'orange');
    }
  }
  ctx.globalAlpha = 1;
}

// 유성우 : 누른 자리 둘레에서 여러 개가 시간차를 두고 그은 방향으로 쏟아진다
// len : 그은 길이(px). 살짝 그으면 적게, 길게 그으면 많이 쏟아진다
function meteorShower(x, y, dir, len = 0) {
  const n = Math.min(METEOR_COUNT[1], METEOR_COUNT[0] + Math.floor(len / (METEOR_PER * unit())));
  const nx = -Math.sin(dir), ny = Math.cos(dir);                        // 날아가는 방향의 옆 방향
  let t = now;
  for (let k = 0; k < n; k++) {
    const side = rand(-1, 1) * METEOR_SPREAD * unit(), back = rand(0, 80) * unit();
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));             // 출발점도 화면 안으로
    const px = clamp(x + nx * side - Math.cos(dir) * back, 40, innerWidth - 40);
    const py = clamp(y + ny * side - Math.sin(dir) * back, 40, innerHeight * .85);
    later.push({ t, fn: () => addBody('meteor', px, py, { dir, w: SIZE.meteor * unit() * rand(.7, 1.1) }) });
    t += rand(...METEOR_GAP);
  }
}

function addBody(type, x, y, opt = {}) {
  const b = { id: ++seq, type, x, y, born: now, rot: 0, scale: 0, alpha: 1, dim: 1, w: SIZE[type] * unit(), ...opt };
  bodies.push(b);
  if (bodies.length > MAX_BODIES) bodies.splice(0, bodies.length - MAX_BODIES).forEach(o => o.dead = true);   // 지워진 천체는 선도 같이 사라진다
  TYPES[type].init?.(b);
  return b;
}

// 새끼 별 : 부모 바로 둘레에서, 다른 천체와 겹치지 않고 부모와 선으로 이어질 수 있는 자리에만 생긴다.
// 그런 자리가 없으면 (부모 선이 꽉 찼거나 다른 선과 엇갈리면) 생기지 않는다 → 동떨어진 별이 생기지 않는다
function spawnKidStar(p) {
  if (degree(p) >= LINK_MAX) { p.kids = 0; return; }
  for (let k = 0; k < 10; k++) {
    const a = rand(0, Math.PI * 2), d = rand(...STAR_KID_DIST) * unit();
    const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    if (x < 20 || y < 20 || x > innerWidth - 20 || y > innerHeight * .85) continue;   // 화면 밖·아래 버튼 줄은 피한다
    if (bodies.some(o => o !== p && Math.hypot(o.x - x, o.y - y) < STAR_KID_ROOM * unit())) continue;
    const spot = { x, y };
    if (links.some(l => crosses(p, spot, l.a, l.b))) continue;
    // 부모 별에서 새끼 별 쪽으로 선이 뻗어 나간다
    const kid = addBody('star', x, y, { gen: 1, w: p.w * rand(...STAR_KID_SIZE), dim: p.dim });
    link(p, kid, now, true);
    return;
  }
}

// ================================================================
//  별자리 연결선 : 가까운 점끼리 하나씩, 펜으로 긋듯 이어진다
// ================================================================
// 두 선분이 서로 가로지르는지 (끝점을 같이 쓰는 건 괜찮다)
function crosses(a, b, c, d) {
  if (a === c || a === d || b === c || b === d) return false;
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return o(a, b, c) != o(a, b, d) && o(c, d, a) != o(c, d, b);
}

// 별자리의 점 : link: true 인 천체 (b.node 를 켜면 다른 천체도 점이 될 수 있다)
const isNode = o => TYPES[o.type].link || o.node;
const degree = n => links.reduce((k, l) => k + (l.a === n || l.b === n), 0);
const linked = (a, b) => links.some(l => (l.a === a && l.b === b) || (l.a === b && l.b === a));

// a 에서 b 쪽으로 펜으로 긋는 선 하나 (start 초부터 그리기 시작). 못 이으면 false
//  force : 드래그로 이은 별처럼, 엇갈림·거리와 상관없이 꼭 이을 때
function link(a, b, start = now, force = false) {
  if (!a || !b || a === b || a.dead || b.dead || linked(a, b)) return false;
  if (degree(a) >= LINK_MAX || degree(b) >= LINK_MAX) return false;
  if (!force && (Math.hypot(a.x - b.x, a.y - b.y) > LINK_DIST * unit() || links.some(l => crosses(a, b, l.a, l.b)))) return false;
  links.push({ a, b, born: start, seed: ++seq });
  return true;
}

// 방금 놓은 점 b 에서 가까운 점들로 n 개까지 선을 뻗는다 (가까운 순서, 엇갈리지 않게)
function linkFrom(b, n, start = now) {
  const near = bodies.filter(o => o !== b && isNode(o) && !o.dead)
                     .sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y));
  let made = 0;
  for (const o of near) { if (made >= n) break; if (link(b, o, start + made * .25)) made++; }
}

function drawLinks() {
  for (const l of links) {
    const { a, b } = l, d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d < 1) continue;
    const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
    const ra = a.w * .22, rb = b.w * .22;            // 별 그림 바로 바깥에서 시작하고 끝난다
    if (d - ra - rb < 10) continue;
    crayonLine(a.x + ux * ra, a.y + uy * ra, b.x - ux * rb, b.y - uy * rb, {
      color: 'cobalt', width: LINK_WIDTH, seed: l.seed, alpha: Math.min(a.dim, b.dim),
      progress: Math.max(0, now - l.born) * LINK_SPEED * unit() / (d - ra - rb) });
  }
}

// 그림 그리기 : 가운데 기준, b.rot 만큼 돌리고 b.scale 만큼 키운다
function drawSprite(b) {
  const img = sprites[b.type];
  if (!img.complete || b.scale <= 0) return;
  const w = b.w * b.scale, h = w * img.height / img.width;
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.globalAlpha = b.alpha * b.dim;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// ================================================================
//  매 프레임
// ================================================================
function frame(t) {
  requestAnimationFrame(frame);
  if (!active) return;
  now = t / 1000;
  const dt = Math.min(.12, now - (last || now)); last = now;   // 화면이 버벅여도 실제 시간대로 움직이게 (너무 큰 점프만 막는다)

  // 1) 움직임
  later = later.filter(j => j.t > now || (j.fn(), false));   // 때가 된 일은 하고 지운다 (유성우)
  for (const b of bodies) {
    const age = now - b.born;
    if (TYPES[b.type].update) TYPES[b.type].update(b, age, dt);
    else b.scale = popIn(Math.min(1, age / .6));
  }
  for (const p of parts) {
    if (p.upd) p.upd(p, dt);                                  // 따로 움직이는 파티클 (은하 별가루)
    else { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= p.drag ?? 1; p.vy *= p.drag ?? 1; }
    p.life -= dt;
  }
  parts = parts.filter(p => p.life > 0);
  shake *= .9;
  // 다 지나간 유성·혜성은 지우고, 사라진 점에 붙은 선도 같이 지운다
  bodies = bodies.filter(b => !b.dead);
  links = links.filter(l => !l.a.dead && !l.b.dead);

  // 2) 그리기
  const dpr = devicePixelRatio;
  const sx = (Math.random() - .5) * shake, sy = (Math.random() - .5) * shake;
  ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
  ctx.globalAlpha = 1; ctx.fillStyle = BG;
  ctx.fillRect(-20, -20, innerWidth + 40, innerHeight + 40);
  if (bgCache.width) ctx.drawImage(bgCache, 0, 0, innerWidth, innerHeight);

  // 선은 맨 아래, 그 위에 망점, 맨 위에 천체 그림
  drawLinks();
  // dim : Dry 로 옅어진 정도 (1 → .7 → .4). 새로 뿌린 것은 1 이라 진하게 나온다
  for (const p of parts) { ctx.globalAlpha = p.dim; dot(p.x, p.y, p.r * (p.fadeOut ? Math.min(1, p.life / p.fadeOut) : 1), p.color); }
  ctx.globalAlpha = 1;
  for (const b of bodies) (TYPES[b.type].draw || drawSprite)(b);
  if (sample) drawSample();
}

// S 키로 켜는 스타일 견본 : 망점 농도, 판 어긋남, 크레용 선, 펜으로 긋는 선
function drawSample() {
  const x = 40, y = 110;
  ctx.fillStyle = 'rgba(20,22,43,.9)'; ctx.fillRect(x - 20, y - 30, 560, 300);
  // 망점 면 두 장을 겹쳐서 판 어긋남 보기 (시안 위에 핑크)
  dotField(x + 70, y + 60, 60, (px, py) => 1 - Math.hypot(px - x - 70, py - y - 60) / 60, 'cyan');
  dotField(x + 110, y + 60, 60, (px, py) => 1 - Math.hypot(px - x - 110, py - y - 60) / 60, 'pink');
  // 왼쪽 → 오른쪽으로 옅어지는 망점 띠 (농도 = 원의 크기)
  dotField(x + 330, y + 30, 120, (px, py) => (Math.abs(py - y - 30) < 22 && px > x + 210 && px < x + 450) ? 1 - (px - x - 210) / 240 : 0, 'yellow');
  // 7가지 색 크레용 선
  Object.keys(PAL).forEach((c, i) => crayonLine(x, y + 140 + i * 16, x + 240, y + 130 + i * 16, { color: c, seed: i + 1 }));
  // 펜으로 긋듯 그려지는 선 (2초마다 다시)
  crayonPath([{ x: x + 280, y: y + 240 }, { x: x + 360, y: y + 150 }, { x: x + 450, y: y + 200 }, { x: x + 520, y: y + 120 }],
             { color: 'cobalt', width: 2.4, progress: (now % 2.5) / 2, seed: 42 });
}

// ================================================================
//  index.html 에서 부르는 것들
// ================================================================
function resize() {
  cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
  makeBg();
}

let down = null;   // 누른 자리 (혜성 드래그 방향에 쓴다)
let trail = null;  // 별을 드래그할 때 마지막으로 놓은 별

// 클릭해서 천체를 놓는다. 별자리에 들어가는 천체면 놓자마자 가까운 점으로 선이 뻗는다
function place(type, x, y, opt, n = LINK_ON_PLACE) {
  const b = addBody(type, x, y, opt);
  if (TYPES[type].link) linkFrom(b, n, now + LINK_DELAY);
  return b;
}

return {
  PAL, BG,
  // 처음 한 번 : 캔버스 연결
  start(canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    resize(); addEventListener('resize', resize);
    cv.addEventListener('pointerdown', e => {
      if (!kind) return;
      down = { x: e.clientX, y: e.clientY };
      // 유성·혜성은 손을 뗄 때 그은 방향을 보고 출발한다 (아래 pointerup). 나머지는 누르는 순간 놓인다
      if (kind != 'comet' && kind != 'meteor') { const b = place(kind, e.clientX, e.clientY); if (kind == 'star') trail = b; down = null; }
    });
    // 별을 누른 채 그으면 지나간 길을 따라 별이 놓이고, 앞 별과 바로 이어진다 (손으로 별자리 그리기)
    cv.addEventListener('pointermove', e => {
      if (!trail || !e.buttons) return;
      const g = DRAG_GAP * unit();
      for (let d; (d = Math.hypot(e.clientX - trail.x, e.clientY - trail.y)) >= g;) {
        const x = trail.x + (e.clientX - trail.x) * g / d, y = trail.y + (e.clientY - trail.y) * g / d;
        const b = addBody('star', x + rand(-8, 8), y + rand(-8, 8), { gen: 1, w: SIZE.star * unit() * rand(.5, .9) });
        link(trail, b, now, true);
        trail = b;
      }
    });
    addEventListener('pointerup', () => trail = null);
    cv.addEventListener('pointerup', e => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y, dragged = Math.hypot(dx, dy) > 20;
      // 유성 : 그냥 클릭하면 그 자리에 하나가 톡 생기고, 드래그하면 그은 방향으로 쏟아진다
      if (kind == 'meteor') dragged ? meteorShower(down.x, down.y, Math.atan2(dy, dx), Math.hypot(dx, dy))
                                    : addBody('meteor', down.x, down.y, { still: true });
      // 혜성 : 드래그했으면 그 방향, 그냥 클릭이면 왼쪽 아래
      else addBody('comet', down.x, down.y, { dir: dragged ? Math.atan2(dy, dx) : HEADING });
      down = null;
    });
    addEventListener('keydown', e => { if (active && (e.key == 's' || e.key == 'S')) sample = !sample; });
    requestAnimationFrame(frame);
  },
  set active(v) { active = v; last = 0; },
  get active() { return active; },
  pick(k) { kind = k; },                                   // 아래 버튼에서 천체를 고를 때
  reset() { bodies = []; parts = []; links = []; later = []; shake = 0; },
  // Dry : 이미 있는 것만 옅게 (1번째 → 70%, 2번째 → 40%)
  dry(n) { const k = (1 - n * .3) / (1 - (n - 1) * .3); for (const o of [...bodies, ...parts]) o.dim *= k; },
  canvas: () => cv,                                        // Save 가 이 캔버스를 그대로 저장한다
  debug: () => ({ bodies, links, parts }),                 // 확인용 (콘솔에서 Space.debug())
};
})();
