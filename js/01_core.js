/* ================= CORE UTILS ================= */
const TAU = Math.PI * 2, DEG = Math.PI / 180, G = 9.81;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = (id) => document.getElementById(id);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ihash(a, b, c) { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul((c | 0) + 1013, 2147483629); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }

const PERM = new Uint8Array(512);
(function () { const r = mulberry32(90210); const p = []; for (let i = 0; i < 256; i++) p.push(i); for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; })();
const GX = [1, -1, 1, -1, 1, -1, 0, 0], GY = [1, 1, -1, -1, 0, 0, 1, -1];
function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const X = xi & 255, Y = yi & 255;
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const a = PERM[PERM[X] + Y] & 7, b = PERM[PERM[X + 1] + Y] & 7, c = PERM[PERM[X] + Y + 1] & 7, d = PERM[PERM[X + 1] + Y + 1] & 7;
  const n00 = GX[a] * xf + GY[a] * yf, n10 = GX[b] * (xf - 1) + GY[b] * yf, n01 = GX[c] * xf + GY[c] * (yf - 1), n11 = GX[d] * (xf - 1) + GY[d] * (yf - 1);
  const x1 = n00 + (n10 - n00) * u, x2 = n01 + (n11 - n01) * u;
  return x1 + (x2 - x1) * v;
}
function fbm(x, y, o) { let s = 0, a = 1, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * noise2(x * f, y * f); n += a; a *= 0.5; f *= 2.03; } return s / n; }

const lc = (hex) => new THREE.Color(hex).convertSRGBToLinear();

/* ================= SAVE ================= */
const SAVE_KEY = 'island-rush-v1';
const save = { money: 600, rep: 0, law: { won: 0, part: 0, lost: 0, settled: 0, paid: 0 }, done: {}, up: { eng: 0, tire: 0, nit: 0, arm: 0 }, color: 0, car: 'rook', owned: { rook: true }, cc: {}, cos: { own: {}, car: {}, out: {} }, rel: {}, gar: { wall: 0, ext: 1, trim: 0, floor: 0, light: 0, neon: 3, sign: 'HOME GARAGE', bays: 4, decor: { posters: 1, tools: 1, tyres: 1, rug: 1, trophies: 1, plants: 1 }, slots: {} },
  air: { own: { sparrow: true }, hrs: 0, ldg: 0, best: 0, view: 1 }, boat: { own: {}, hrs: 0, view: 1 }, vm: { done: {}, kills: 0, rings: 0 }, ven: { rec: {}, souv: {} }, col: { got: {}, n: 0, fish: {}, prize: {} }, race: { races: 0, wins: 0, podiums: 0, bestLap: 0, earned: 0, best: {} },
  tokens: 0, stolen: {}, jack: null, jn: 0, mech: { jobs: 0, sum: 0, rush: 0, best: 0, saved: 0 }, wk: { slots: [null, null, null], cur: null, flights: 0, done: {}, best: { alt: 0, spd: 0 } },
  set: { quality: 'high', traffic: 'high', music: true, vol: 0.8, units: 'kmh', fov: 76, cycle: 1, shake: true, hud: true, dev: false, suits: 'on', finv: false, fassist: true } };
/* developer mode: session-only cheat/debug state (only active while save.set.dev is on) */
const Dev = { god: false, nit: false, power: 1, grip: 1, ts: 1, hud: false, hbox: false, free: false, fx: 0, fy: 0, fz: 0, fyaw: 0, fpitch: 0, ema: 0.016, t: 0 };
const devOn = (k) => !!(save.set.dev && Dev[k]);
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s) { save.money = s.money != null ? s.money : save.money; save.rep = s.rep || 0; save.done = s.done || {}; Object.assign(save.up, s.up || {}); save.color = s.color || 0; Object.assign(save.set, s.set || {}); Object.assign(save.law, s.law || {});
      if (s.gar) { const g = s.gar, d = save.gar; for (const k of ['wall', 'ext', 'trim', 'floor', 'light', 'neon']) if (Number.isInteger(g[k]) && g[k] >= 0) d[k] = g[k]; if (typeof g.sign === 'string' && g.sign) d.sign = g.sign.slice(0, 16); if (g.bays === 6 || g.bays === 8) d.bays = g.bays; d.seen = g.seen ? 1 : 0; Object.assign(d.decor, g.decor || {}); d.slots = Object.assign({}, g.slots || {}); }
      Object.assign(save.owned, s.owned || {}); save.owned.rook = true; Object.assign(save.cc, s.cc || {}); if (!s.cc && s.color) save.cc.rook = s.color;
      if (s.cos) { const c = s.cos; save.cos = { own: Object.assign({}, c.own || {}), car: {}, out: Object.assign({}, c.out || {}) }; for (const id in (c.car || {})) { const r = c.car[id] || {}; save.cos.car[id] = Object.assign({}, r, { kit: Object.assign({}, r.kit || {}) }); } }
      if (s.rel && typeof s.rel === 'object') { save.rel = {}; for (const id in s.rel) { const r = s.rel[id] || {}; save.rel[id] = { pts: +r.pts || 0, met: r.met | 0, ch: r.ch | 0, cd: Object.assign({}, r.cd || {}), waved: +r.waved || 0, gift: +r.gift || 0, grudge: +r.grudge || 0, last: +r.last || 0, g4: r.g4 | 0, g5: r.g5 | 0 }; } }
      if (s.air && typeof s.air === 'object') { const a = s.air; save.air = { own: Object.assign({ sparrow: true }, a.own || {}), hrs: +a.hrs || 0, ldg: a.ldg | 0, best: +a.best || 0, view: [0, 1, 2].includes(a.view) ? a.view : 1 }; save.air.own.sparrow = true; }
      if (s.boat && typeof s.boat === 'object') { const b = s.boat; save.boat = { own: Object.assign({}, b.own || {}), hrs: +b.hrs || 0, view: [0, 1, 2].includes(b.view) ? b.view : 1 }; }
      if (s.vm && typeof s.vm === 'object') { const v = s.vm, d = {}; for (const id in (v.done || {})) { const r = v.done[id] || {}; d[id] = { stars: clamp(r.stars | 0, 0, 3), best: r.best == null ? null : +r.best, n: r.n | 0 }; } save.vm = { done: d, kills: v.kills | 0, rings: v.rings | 0 }; }
      if (s.ven && typeof s.ven === 'object') { const v = s.ven, rec = {}, so = {}; for (const k in (v.rec || {})) { const r = v.rec[k] || {}; rec[k] = { w: r.w | 0, l: r.l | 0, best: +r.best || 0, n: r.n | 0, earned: +r.earned || 0 }; if (r.x && typeof r.x === 'object') rec[k].x = Object.assign({}, r.x); } for (const k in (v.souv || {})) if (v.souv[k]) so[k] = 1; save.ven = { rec, souv: so }; }
      if (s.col && typeof s.col === 'object') { const c = s.col, got = {}; for (const k in (c.got || {})) if (c.got[k]) got[k] = c.got[k] === 1 ? 1 : +c.got[k] || 1; save.col = { got, n: Object.keys(got).length, fish: Object.assign({}, c.fish || {}), prize: Object.assign({}, c.prize || {}) }; }
      if (s.race && typeof s.race === 'object') { const r = s.race, b = {}; for (const k in (r.best || {})) if (+r.best[k] > 0) b[k] = +r.best[k]; save.race = { races: r.races | 0, wins: r.wins | 0, podiums: r.podiums | 0, bestLap: +r.bestLap || 0, earned: +r.earned || 0, best: b }; }
      if (s.wk && typeof s.wk === 'object') { const w = s.wk; save.wk = { slots: [0, 1, 2].map((i) => (w.slots && w.slots[i] && Array.isArray(w.slots[i].parts) ? w.slots[i] : null)), cur: w.cur && Array.isArray(w.cur.parts) ? w.cur : null, flights: Math.max(0, w.flights | 0), done: w.done && typeof w.done === 'object' ? w.done : {}, best: { alt: Math.max(0, +(w.best && w.best.alt) || 0), spd: Math.max(0, +(w.best && w.best.spd) || 0) } }; }
      if (s.mech && typeof s.mech === 'object') { const m = s.mech; save.mech = { jobs: Math.max(0, m.jobs | 0), sum: Math.max(0, +m.sum || 0), rush: Math.max(0, m.rush | 0), best: clamp(+m.best || 0, 0, 1), saved: Math.max(0, m.saved | 0) }; }
      /* stolen cars: every instance lives in save.stolen (kept ones are also owned, the one still in hand is save.jack) */
      save.tokens = Math.max(0, s.tokens | 0); save.jn = Math.max(0, s.jn | 0); save.stolen = {}; save.jack = null;
      if (s.stolen && typeof s.stolen === 'object') for (const id in s.stolen) { const r = s.stolen[id] || {}; if (/^j\d+$/.test(id) && r.vi >= 0 && r.vi <= 3) { save.stolen[id] = { vi: r.vi | 0, cc: clamp(r.cc | 0, 0, 7), v: Math.max(50, +r.v || 300), tok: Math.max(1, r.tok | 0) }; Jack.reg(id, save.stolen[id]); } }
      for (const id of Object.keys(save.owned)) if (/^j\d+$/.test(id) && !save.stolen[id]) delete save.owned[id];
      if (s.jack && s.jack.id && save.stolen[s.jack.id] && !save.owned[s.jack.id]) save.jack = { id: s.jack.id, prev: save.owned[s.jack.prev] ? s.jack.prev : 'rook' };
      for (const id in save.stolen) if (!save.owned[id] && !(save.jack && save.jack.id === id)) delete save.stolen[id];
      save.car = (s.car && (save.owned[s.car] || (save.jack && save.jack.id === s.car))) ? s.car : 'rook'; }
  } catch (e) { /* storage unavailable */ }
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }
