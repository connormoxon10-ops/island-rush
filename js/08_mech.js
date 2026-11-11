/* ---------- mechanic: repair quick-time events — or skip them by paying the rush rate ---------- */
/* After a crash the bill goes through Mech.offer(kind, base, cb). The player picks "fix it yourself" (four short mini-games that cut the bill
   by up to 55 %) or "rush job" (a flat premium, no work). Everything runs on one 2D canvas over an opaque workshop screen; the 3D sim is paused. */
const MECH_KIND = {
  car: { shop: 'Pit Stop Garage', tint: '#c23b3b', dif: 1.0, steps: ['hammer', 'bolts', 'wire', 'weld'], txt: { hammer: 'Bang out the dents', bolts: 'Refit the wheel nuts', wire: 'Reconnect the wiring', weld: 'Weld the exhaust' } },
  plane: { shop: 'Hangar Maintenance', tint: '#c9d2dd', dif: 1.2, steps: ['bolts', 'wire', 'weld', 'hammer'], txt: { bolts: 'Re-torque the panel screws', wire: 'Rewire the avionics', weld: 'Weld the wing spar', hammer: 'Straighten the fuselage skin' } },
  boat: { shop: 'Marina Boatyard', tint: '#e4dfcf', dif: 1.1, steps: ['hammer', 'weld', 'wire', 'bolts'], txt: { hammer: 'Patch the hull', weld: 'Weld the keel plate', wire: 'Fix the engine wiring', bolts: 'Tighten the prop shaft' } },
};
const MECH_HOW = {
  hammer: ['Hit SPACE (or click / tap) when the marker is inside the green zone.', 'Four swings, and the marker speeds up every time.'],
  bolts: ['HOLD SPACE (or hold click / touch) to build torque, then let go inside the green band.', 'Too little leaves it loose; right to the top strips the nut.'],
  wire: ['Press the number (or tap the terminal) that matches the colour of the loose wire.', 'Six wires, and the fuse is already burning.'],
  weld: ['Keep the torch on the seam: W / S or the arrow keys (mouse or touch: just move up and down).', 'The metal only fuses while you are on the line.'],
};
const MECH_COL = [{ c: '#ff4d5e', n: 'RED' }, { c: '#33d4ff', n: 'BLUE' }, { c: '#4be08a', n: 'GREEN' }, { c: '#ffb02e', n: 'AMBER' }];
const MECH_DISP = "'Chakra Petch', 'Arial Black', Impact, sans-serif", MECH_UI = "'Rajdhani', 'Arial Narrow', sans-serif";

const Mech = {
  on: false, ph: 'off', busy: false, lock: 0, cv: null, g: null, sc: 1.5, bgc: null, kind: 'car', base: 0, name: '', cb: null, steps: [], si: 0, sc2: [], job: null, sub: 'intro', st: 0, t: 0,
  sel: 0, dp2: 0, pt: [], latch: { press: false, rel: false, pick: 0, click: null }, ptr: { x: 480, y: 270, down: false, use: false }, dp: 0, rp: 0, avg: 0, dif: 1, mk: {}, tint: '#c23b3b', tid: 0,
};
function _mkRR(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function _mkShade(hex, k) { const n = parseInt(hex.slice(1), 16), r = clamp(Math.round(((n >> 16) & 255) * k), 0, 255), gg = clamp(Math.round(((n >> 8) & 255) * k), 0, 255), b = clamp(Math.round((n & 255) * k), 0, 255); return 'rgb(' + r + ',' + gg + ',' + b + ')'; }
const _mkTri = (p) => 1 - Math.abs((((p % 2) + 2) % 2) - 1);   /* 0 → 1 → 0 triangle wave, period 2 */
function _mkRate(q) { return q >= 0.85 ? ['PERFECT', '#4be08a'] : q >= 0.6 ? ['GOOD', '#a8e05a'] : q >= 0.25 ? ['WEAK', '#ffb02e'] : ['MISS', '#ff4d5e']; }
function _mkShape(g, k, x, y, r) {
  g.beginPath();
  if (k === 0) g.arc(x, y, r, 0, 6.283);
  else if (k === 1) { g.moveTo(x, y - r * 1.1); g.lineTo(x + r, y + r * 0.8); g.lineTo(x - r, y + r * 0.8); g.closePath(); }
  else if (k === 2) g.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
  else { g.moveTo(x, y - r * 1.15); g.lineTo(x + r * 0.9, y); g.lineTo(x, y + r * 1.15); g.lineTo(x - r * 0.9, y); g.closePath(); }
}

/* ---------- pricing ---------- */
Mech.price = (b, avg) => Math.max(5, Math.round(b * (1 - 0.55 * clamp(avg, 0, 1)) / 5) * 5);
Mech.rushPrice = (b) => Math.max(b + 40, Math.round(b * 1.6 / 5) * 5);
Mech.grade = (a) => (a >= 0.93 ? ['S', 'Flawless work', '#4be08a'] : a >= 0.8 ? ['A', 'Great work', '#a8e05a'] : a >= 0.62 ? ['B', 'Solid repair', '#ffd24a'] : a >= 0.4 ? ['C', 'Patched up', '#ffb02e'] : ['D', 'Held together with tape', '#ff4d5e']);

/* ---------- setup ---------- */
Mech.init = function () {
  const cv = E.mechCv; Mech.cv = cv; cv.width = Math.round(960 * Mech.sc); cv.height = Math.round(540 * Mech.sc); Mech.g = cv.getContext('2d');
  /* the workshop wall is painted once */
  const bc = document.createElement('canvas'); bc.width = cv.width; bc.height = cv.height; const g = bc.getContext('2d'); g.scale(Mech.sc, Mech.sc);
  let gr = g.createLinearGradient(0, 0, 0, 540); gr.addColorStop(0, '#1a2230'); gr.addColorStop(0.72, '#0d1219'); gr.addColorStop(1, '#080b10'); g.fillStyle = gr; g.fillRect(0, 0, 960, 540);
  g.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 96; y < 440; y += 26) for (let x = 15; x < 960; x += 26) { g.beginPath(); g.arc(x, y, 2, 0, 6.283); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, 960, 72); g.fillRect(0, 492, 960, 48);
  g.fillStyle = 'rgba(255,176,46,0.9)'; g.fillRect(0, 71, 960, 2); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 492, 960, 1);
  gr = g.createRadialGradient(480, 270, 180, 480, 270, 620); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = gr; g.fillRect(0, 0, 960, 540);
  Mech.bgc = bc;
  E.mech.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || Mech.busy || Mech.lock > 0) return;
    if (b.dataset.act === 'diy') Mech.choose('diy'); else if (b.dataset.act === 'rush') Mech.choose('rush'); else if (b.dataset.act === 'pay') Mech.pay();
  });
  const pos = (e) => { const r = cv.getBoundingClientRect(); Mech.ptr.x = (e.clientX - r.left) / Math.max(1, r.width) * 960; Mech.ptr.y = (e.clientY - r.top) / Math.max(1, r.height) * 540; };
  cv.addEventListener('pointerdown', (e) => {
    if (!Mech.on || Mech.ph !== 'job') return; e.preventDefault(); pos(e); Mech.ptr.down = true; Mech.ptr.use = true; Mech.latch.press = true; Mech.latch.click = { x: Mech.ptr.x, y: Mech.ptr.y };
    try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
  });
  cv.addEventListener('pointermove', (e) => { if (!Mech.on) return; pos(e); if (e.pointerType === 'mouse' || Mech.ptr.down) Mech.ptr.use = true; });
  const up = (e) => { if (!Mech.ptr.down) return; pos(e); Mech.ptr.down = false; Mech.latch.rel = true; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keyup', (e) => { if (Mech.on && (e.code === 'Space' || e.code === 'Enter')) Mech.latch.rel = true; });
};

/* the offer: opens the shop screen. Returns true if the screen opened; otherwise the bill was settled on the spot (cb still runs). */
Mech.offer = function (kind, base, cb, opts) {
  opts = opts || {}; base = Math.max(0, Math.round(base || 0));
  if (base <= 0 || devOn('god')) { if (cb) cb(0, 'free'); UI.toast('Repaired · no charge', 'info'); return false; }
  if (App.mode !== 'play' || Mech.on || !Mech.g) { const fee = Math.min(base, save.money); save.money -= fee; writeSave(); if (cb) cb(fee, 'flat'); UI.toast('Repaired' + (fee ? ' · fee ' + money(fee) : ''), 'info'); return false; }
  const K = MECH_KIND[kind] || MECH_KIND.car;
  Mech.kind = kind; Mech.base = base; Mech.name = opts.name || ''; Mech.cb = cb || null; Mech.steps = K.steps.slice(); Mech.dif = K.dif; Mech.tint = K.tint; Mech.tid = 1000 + Math.floor(Math.random() * 9000);
  Mech.si = 0; Mech.sc2 = []; Mech.job = null; Mech.pt.length = 0; Mech.sel = 0; Mech.busy = false; Mech.lock = 0.7; Mech.t = 0; Mech.avg = 0;
  Mech.dp = Mech.price(base, 1); Mech.rp = Mech.rushPrice(base);
  Mech.latch.press = Mech.latch.rel = false; Mech.latch.pick = 0; Mech.latch.click = null; Mech.ptr.down = false; Mech.ptr.use = false;
  for (const k in Keys) Keys[k] = false;
  Mech.on = true; Mech.ph = 'est'; UI.setMode('mech'); Mech.paint(); Snd.beep(520, 0.05);
  setTimeout(() => UI.fade(false), 250);
  return true;
};

/* ---------- screens (HTML) ---------- */
Mech.paint = function () {
  const K = MECH_KIND[Mech.kind], rec = save.mech;
  E.mechCash.textContent = money(save.money);
  E.mechStage.hidden = Mech.ph !== 'job'; E.mechPanel.hidden = Mech.ph === 'job';
  if (Mech.ph === 'est') {
    E.mechTitle.textContent = K.shop; E.mechSub.textContent = 'Repair estimate';
    const can = save.money >= Mech.rp;
    E.mechBody.innerHTML = '<div class="mtk"><div class="mtkh"><span>Work order</span><b>#' + Mech.tid + '</b></div><h3>' + esc(Mech.name || (Mech.kind === 'car' ? 'Your car' : Mech.kind === 'plane' ? 'Your aircraft' : 'Your boat')) + '</h3>' +
      '<ol class="mjobs">' + Mech.steps.map((s, i) => '<li><i>' + (i + 1) + '</i>' + esc(K.txt[s]) + '</li>').join('') + '</ol>' +
      '<div class="mtkb"><span>Standard repair bill</span><b>' + money(Mech.base) + '</b></div></div>' +
      '<div class="mopts">' +
      '<button type="button" class="mopt' + (Mech.sel === 0 ? ' pri' : '') + '" data-act="diy"><b>Do the work</b><span>Four quick hands-on jobs. Do them well and the bill drops by up to 55%.</span><em>' + money(Mech.dp) + ' – ' + money(Mech.base) + '</em><kbd>1</kbd></button>' +
      '<button type="button" class="mopt' + (Mech.sel === 1 ? ' pri' : '') + '"' + (can ? '' : ' disabled') + ' data-act="rush"><b>Rush job</b><span>' + (can ? 'Skip the work. The crew drops everything and does it for a premium.' : 'The crew wants ' + money(Mech.rp) + ' up front. You are short.') + '</span><em>' + money(Mech.rp) + '</em><kbd>2</kbd></button></div>' +
      '<p class="rlp dim">' + (rec.jobs ? 'Your record · ' + rec.jobs + ' job' + (rec.jobs === 1 ? '' : 's') + ' · avg ' + Math.round(rec.sum / rec.jobs * 100) + '% · best ' + Math.round(rec.best * 100) + '% · saved ' + money(rec.saved) : 'First time under the bonnet? Nobody will mind if you just pay the rush rate.') + '</p>';
    E.mechFoot.innerHTML = '<span>↑ ↓ choose · Enter confirm · 1 / 2 quick pick</span>';
  } else if (Mech.ph === 'res') {
    const G = Mech.grade(Mech.avg), pay = Math.min(Mech.dp2, save.money);
    E.mechTitle.textContent = K.shop; E.mechSub.textContent = 'Job complete';
    E.mechBody.innerHTML = '<div class="mres"><div class="mgrade" style="--gc:' + G[2] + '">' + G[0] + '</div><div><h3>' + G[1] + '</h3><small>Overall ' + Math.round(Mech.avg * 100) + '%</small></div></div>' +
      '<div class="msteps">' + Mech.steps.map((s, i) => { const q = Mech.sc2[i] || 0, R = _mkRate(q); return '<div><span>' + esc(K.txt[s]) + '</span><i><b style="width:' + Math.round(q * 100) + '%;background:' + R[1] + '"></b></i><em>' + Math.round(q * 100) + '%</em></div>'; }).join('') + '</div>' +
      '<div class="mtkb big"><span>Standard bill <s>' + money(Mech.base) + '</s></span><b>' + money(pay) + '</b></div>' +
      '<p class="rlp dim">' + (Mech.base - Mech.dp2 > 0 ? 'Your own labour saved ' + money(Mech.base - Mech.dp2) + '.' : 'Not much to knock off this time.') + (Mech.dp2 > save.money ? ' You can only cover ' + money(save.money) + ', so that is all the shop takes.' : '') + '</p>';
    E.mechFoot.innerHTML = '<button class="btn primary" type="button" data-act="pay">Pay ' + money(pay) + ' · Enter</button>';
  }
};

Mech.choose = function (how) {
  if (Mech.ph !== 'est' || Mech.busy) return;
  if (how === 'rush') { if (save.money < Mech.rp) { Snd.clank(); UI.toast('Not enough cash for the rush rate', 'bad'); return; } Mech.settle(Mech.rp, 'rush'); return; }
  Mech.ph = 'job'; Mech.si = 0; Mech.sc2 = []; Mech.paint(); Mech.startJob(); Snd.beep(660, 0.05);
};
Mech.startJob = function () {
  const s = Mech.steps[Mech.si]; Mech.job = Mech.mk[s](Mech.dif); Mech.sub = 'intro'; Mech.st = 0;
  Mech.latch.press = Mech.latch.rel = false; Mech.latch.pick = 0; Mech.latch.click = null;
};
Mech.pay = function () { if (Mech.ph !== 'res' || Mech.busy) return; Mech.settle(Math.min(Mech.dp2, save.money), 'diy'); };
/* take the money, black out, hand the vehicle back to whoever asked */
Mech.settle = function (amount, how) {
  if (Mech.busy) return; Mech.busy = true; amount = Math.min(Math.round(amount), save.money); save.money -= amount;
  const m = save.mech; if (how === 'rush') m.rush++; else { m.jobs++; m.sum += Mech.avg; m.best = Math.max(m.best, Mech.avg); m.saved += Math.max(0, Mech.base - amount); }
  writeSave(); Snd.win(); UI.fade(true);
  const msg = how === 'rush' ? 'Rush job done · ' + money(amount) : 'Repaired · ' + money(amount) + ' · grade ' + Mech.grade(Mech.avg)[0];
  setTimeout(() => {
    Mech.on = false; Mech.ph = 'off'; Mech.busy = false; Mech.job = null; Mech.pt.length = 0; E.mechStage.hidden = true; UI.setMode('play'); for (const k in Keys) Keys[k] = false;
    const cb = Mech.cb; Mech.cb = null; if (cb) cb(amount, how); UI.toast(msg, 'info'); setTimeout(() => UI.fade(false), 250);
  }, 500);
};

/* ---------- input ---------- */
Mech.key = function (code) {
  if (Mech.busy || !Mech.on) return;
  if (Mech.ph === 'est') {
    if (Mech.lock > 0) return;
    if (code === 'Digit1' || code === 'Numpad1') Mech.choose('diy'); else if (code === 'Digit2' || code === 'Numpad2') Mech.choose('rush');
    else if (code === 'ArrowUp' || code === 'KeyW' || code === 'ArrowLeft' || code === 'KeyA') { Mech.sel = 0; Mech.paint(); Snd.beep(520, 0.03); }
    else if (code === 'ArrowDown' || code === 'KeyS' || code === 'ArrowRight' || code === 'KeyD' || code === 'Tab') { Mech.sel = 1; Mech.paint(); Snd.beep(520, 0.03); }
    else if (code === 'Enter' || code === 'Space') Mech.choose(Mech.sel === 1 ? 'rush' : 'diy');
  } else if (Mech.ph === 'res') { if (Mech.lock <= 0 && (code === 'Enter' || code === 'Space')) Mech.pay(); }
  else if (Mech.ph === 'job') {
    if (code === 'Space' || code === 'Enter') Mech.latch.press = true;
    else if (/^(Digit|Numpad)[1-4]$/.test(code)) Mech.latch.pick = +code.slice(-1);
  }
};

/* ---------- per-frame ---------- */
Mech.frame = function (dt) {
  if (!Mech.on) return; Mech.t += dt; if (Mech.lock > 0) Mech.lock -= dt;
  if (Mech.ph === 'job') Mech.run(dt);
  for (let i = Mech.pt.length - 1; i >= 0; i--) { const p = Mech.pt[i]; p.l -= dt; if (p.l <= 0) { Mech.pt.splice(i, 1); continue; } p.vy += (p.gy === undefined ? 520 : p.gy) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  if (Mech.ph === 'job') Mech.draw();
};
Mech.run = function (dt) {
  const L = Mech.latch, P = Mech.ptr, K = Keys;
  const inp = { press: L.press, rel: L.rel, pick: L.pick, click: L.click, held: !!(K.Space || K.Enter || P.down), up: !!(K.KeyW || K.ArrowUp), down: !!(K.KeyS || K.ArrowDown), py: P.y, use: P.use };
  L.press = L.rel = false; L.pick = 0; L.click = null; Mech.st += dt;
  if (Mech.sub === 'intro') { if (Mech.st > 2.4 || (Mech.st > 0.8 && inp.press)) { Mech.sub = 'run'; Mech.st = 0; } }
  else if (Mech.sub === 'run') { const J = Mech.job; J.update(dt, inp); if (J.done) { Mech.sub = 'outro'; Mech.st = 0; Mech.sc2[Mech.si] = clamp(J.score, 0, 1); } }
  else if (Mech.sub === 'outro') {
    if (Mech.st > 1.5 || (Mech.st > 0.7 && inp.press)) {
      Mech.si++;
      if (Mech.si >= Mech.steps.length) {
        Mech.avg = Mech.sc2.reduce((a, b) => a + b, 0) / Mech.steps.length; Mech.dp2 = Mech.price(Mech.base, Mech.avg); Mech.ph = 'res'; Mech.lock = 0.8; Mech.paint(); Snd.win();
      } else Mech.startJob();
    }
  }
};
Mech.spark = function (x, y, n, col, sp, life) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = (0.3 + Math.random()) * (sp || 220); Mech.pt.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, l: (life || 0.55) * (0.5 + Math.random() * 0.7), m: life || 0.55, c: col || '#ffcf5a', r: 1.4 + Math.random() * 1.8 }); }
};

/* ---------- drawing: shared chrome ---------- */
Mech.draw = function () {
  const g = Mech.g, sc = Mech.sc; g.setTransform(sc, 0, 0, sc, 0, 0); g.drawImage(Mech.bgc, 0, 0, 960, 540);
  const K = MECH_KIND[Mech.kind], s = Mech.steps[Mech.si], J = Mech.job;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#ffb02e'; g.font = '700 15px ' + MECH_UI; g.textAlign = 'left'; g.fillText((K.shop + ' · step ' + (Mech.si + 1) + ' of ' + Mech.steps.length).toUpperCase(), 28, 28);
  g.fillStyle = '#eef2f7'; g.font = '400 30px ' + MECH_DISP; g.fillText(K.txt[s], 28, 58);
  for (let i = 0; i < Mech.steps.length; i++) {
    const x = 960 - 40 - (Mech.steps.length - 1 - i) * 34, done = i < Mech.si || (i === Mech.si && Mech.sub === 'outro'), cur = i === Mech.si;
    g.beginPath(); g.arc(x, 38, 11, 0, 6.283); g.fillStyle = done ? _mkRate(Mech.sc2[i] || 0)[1] : cur ? 'rgba(255,176,46,0.25)' : 'rgba(255,255,255,0.08)'; g.fill(); g.lineWidth = 2; g.strokeStyle = cur ? '#ffb02e' : 'rgba(255,255,255,0.18)'; g.stroke();
  }
  if (J) J.draw(g);
  for (const p of Mech.pt) { g.globalAlpha = clamp(p.l / p.m * 1.4, 0, 1); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); } g.globalAlpha = 1;
  /* footer hint */
  g.textAlign = 'center'; g.font = '700 18px ' + MECH_UI; g.fillStyle = '#93a0b2'; const hw = MECH_HOW[s]; if (Mech.sub === 'run') g.fillText(hw[0], 480, 521);
  if (Mech.sub === 'intro') {
    g.fillStyle = 'rgba(5,8,12,0.82)'; g.fillRect(0, 73, 960, 419);
    g.fillStyle = '#eef2f7'; g.font = '400 54px ' + MECH_DISP; g.fillText(K.txt[s].toUpperCase(), 480, 240);
    g.fillStyle = '#ffd24a'; g.font = '700 25px ' + MECH_UI; g.fillText(hw[0], 480, 296);
    g.fillStyle = '#93a0b2'; g.font = '700 20px ' + MECH_UI; g.fillText(hw[1], 480, 330);
    g.fillStyle = 'rgba(255,255,255,' + (0.45 + 0.4 * Math.sin(Mech.t * 5)).toFixed(2) + ')'; g.font = '700 16px ' + MECH_UI; g.fillText(Mech.st > 0.8 ? 'PRESS SPACE OR TAP TO START' : '', 480, 400);
  } else if (Mech.sub === 'outro') {
    const q = clamp(Mech.sc2[Mech.si] || 0, 0, 1), R = _mkRate(q), a = clamp(Mech.st * 5, 0, 1);
    g.fillStyle = 'rgba(5,8,12,' + (0.6 * a).toFixed(2) + ')'; g.fillRect(0, 73, 960, 419); g.globalAlpha = a;
    g.fillStyle = R[1]; g.font = '400 92px ' + MECH_DISP; g.fillText(Math.round(q * 100) + '%', 480, 290);
    g.fillStyle = '#eef2f7'; g.font = '700 28px ' + MECH_UI; g.fillText(R[0] === 'MISS' ? 'BARELY TOUCHED IT' : R[0] === 'WEAK' ? 'MESSY, BUT IT HOLDS' : R[0] === 'GOOD' ? 'NICE JOB' : 'SPOT ON', 480, 336); g.globalAlpha = 1;
  }
};
/* floating verdicts ("PERFECT", "MISS") shared by the hammer and the bolts */
function _mkFloat(g, f) {
  if (!f) return; const a = clamp(1 - f.t / 0.9, 0, 1); if (a <= 0) return;
  g.globalAlpha = a; g.fillStyle = f.c; g.font = '400 34px ' + MECH_DISP; g.textAlign = 'center'; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 5; g.strokeText(f.s, f.x, f.y - f.t * 60); g.fillText(f.s, f.x, f.y - f.t * 60); g.globalAlpha = 1;
}

/* ============ mini-game 1: hammer out the dent (timing) ============ */
Mech.mk.hammer = function (dif) {
  const J = { N: 4, n: 0, zc: 0.3 + Math.random() * 0.4, zw: 0.22 / Math.pow(dif, 0.8), ph: Math.random() * 2, spd: 0.5 * Math.pow(dif, 0.7), dent: 1, q: [], sw: -1, pend: -1, fl: null, t: 0, done: false, score: 0, lim: 26, fin: 0 };
  J.pos = () => _mkTri(J.ph);
  J.update = function (dt, inp) {
    if (J.fl) J.fl.t += dt;
    if (J.done) return; J.t += dt; J.ph += J.spd * 2 * dt;
    if (J.sw >= 0) {
      J.sw += dt;
      if (J.pend >= 0 && J.sw > 0.15) {
        const q = J.pend; J.pend = -1; J.q.push(q); J.dent = 1 - J.q.reduce((a, b) => a + b, 0) / J.N; const R = _mkRate(q); J.fl = { s: R[0], c: R[1], x: 480, y: 232, t: 0 };
        Mech.spark(488, 262, Math.round(6 + q * 22), q > 0.25 ? '#ffd88a' : '#9aa6b5', 260); if (q > 0.5) Snd.clank(); else Snd.pop();
      }
      if (J.sw > 0.55) { J.sw = -1; J.n++; if (J.n >= J.N) { J.done = true; J.score = J.q.reduce((a, b) => a + b, 0) / J.N; } else { J.zc = 0.2 + Math.random() * 0.6; J.spd *= 1.1; J.zw *= 0.95; } }
    } else if (inp.press) {
      const d = Math.abs(J.pos() - J.zc), h = J.zw / 2, q = d <= h ? 1 - 0.45 * (d / h) : clamp(0.3 - (d - h) * 2.2, 0, 0.3);
      J.sw = 0; J.pend = q;
    }
    if (J.t > J.lim && !J.done) { while (J.q.length < J.N) J.q.push(0); J.done = true; J.score = J.q.reduce((a, b) => a + b, 0) / J.N; }
  };
  J.draw = function (g) {
    const tint = Mech.tint, px = 250, py = 120, pw = 440, ph = 250;
    /* the panel */
    let gr = g.createLinearGradient(0, py, 0, py + ph); gr.addColorStop(0, _mkShade(tint, 1.28)); gr.addColorStop(0.5, tint); gr.addColorStop(1, _mkShade(tint, 0.62));
    g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 28; g.shadowOffsetY = 12; _mkRR(g, px, py, pw, ph, 26); g.fillStyle = gr; g.fill(); g.restore();
    g.save(); _mkRR(g, px, py, pw, ph, 26); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1; for (let y = py + 6; y < py + ph; y += 5) { g.beginPath(); g.moveTo(px, y); g.lineTo(px + pw, y); g.stroke(); }
    const cx = px + pw / 2 + 10, cy = py + ph / 2 + 6, d = J.dent;
    gr = g.createRadialGradient(cx - 12, cy - 12, 8, cx, cy, 128); gr.addColorStop(0, 'rgba(0,0,0,' + (0.62 * d).toFixed(3) + ')'); gr.addColorStop(0.6, 'rgba(0,0,0,' + (0.22 * d).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px, py, pw, ph);
    g.lineWidth = 7; g.lineCap = 'round'; const rr = 52 + 40 * d;
    g.strokeStyle = 'rgba(0,0,0,' + (0.5 * d).toFixed(3) + ')'; g.beginPath(); g.arc(cx, cy, rr, 3.4, 5.4); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,' + (0.5 * d).toFixed(3) + ')'; g.beginPath(); g.arc(cx, cy, rr, 0.25, 2.25); g.stroke();
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 2; _mkRR(g, px, py, pw, ph, 26); g.stroke();
    for (const [rx, ry] of [[px + 26, py + 26], [px + pw - 26, py + 26], [px + 26, py + ph - 26], [px + pw - 26, py + ph - 26]]) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(rx, ry, 6, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(rx - 1, ry - 1, 3, 0, 6.283); g.fill(); }
    /* the hammer swings from a pivot above the panel's right edge */
    const pvx = 700, pvy = 112, L = 224, a0 = 0.95, up = a0 + 0.55; let a = up - 0.06 * Math.sin(Mech.t * 3);
    if (J.sw >= 0) { const s = J.sw; a = s < 0.15 ? up + (a0 - up) * Math.pow(s / 0.15, 2.2) : a0 + (up - a0) * clamp((s - 0.2) / 0.35, 0, 1) * 0.85; }
    g.save(); g.translate(pvx, pvy); g.rotate(a);
    gr = g.createLinearGradient(-9, 0, 9, 0); gr.addColorStop(0, '#9a6a36'); gr.addColorStop(1, '#5a3517'); g.fillStyle = gr; _mkRR(g, -9, -14, 18, L + 6, 6); g.fill();
    gr = g.createLinearGradient(0, L - 12, 0, L + 24); gr.addColorStop(0, '#dde3ea'); gr.addColorStop(1, '#6d7886'); g.fillStyle = gr; _mkRR(g, -44, L - 12, 88, 36, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; g.stroke();
    g.restore();
    _mkFloat(g, J.fl);
    /* the timing bar */
    const bx = 190, bw = 580, by = 432;
    g.fillStyle = 'rgba(0,0,0,0.55)'; _mkRR(g, bx - 8, by - 8, bw + 16, 50, 10); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.1)'; _mkRR(g, bx, by, bw, 34, 6); g.fill();
    g.fillStyle = 'rgba(75,224,138,0.35)'; _mkRR(g, bx + (J.zc - J.zw / 2) * bw, by, J.zw * bw, 34, 6); g.fill(); g.strokeStyle = '#4be08a'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#4be08a'; g.fillRect(bx + J.zc * bw - 1.5, by + 4, 3, 26);
    const mx = bx + J.pos() * bw; g.fillStyle = '#fff'; g.fillRect(mx - 3, by - 8, 6, 50); g.beginPath(); g.moveTo(mx - 9, by - 12); g.lineTo(mx + 9, by - 12); g.lineTo(mx, by - 1); g.closePath(); g.fill();
    for (let i = 0; i < J.N; i++) { const q = J.q[i]; g.beginPath(); g.arc(480 - (J.N - 1) * 14 + i * 28, 402, 7, 0, 6.283); g.fillStyle = q === undefined ? 'rgba(255,255,255,0.14)' : _mkRate(q)[1]; g.fill(); }
  };
  return J;
};

/* ============ mini-game 2: torque the bolts (hold & release) ============ */
Mech.mk.bolts = function (dif) {
  const J = { N: 5, bi: 0, tq: 0, hold: false, zl: 0.5, zw: 0.18 / Math.pow(dif, 0.7), rate: 0.62 * Math.pow(dif, 0.6), q: [], nut: [], cool: 0, fl: null, t: 0, done: false, score: 0, lim: 40, tk: 0, strip: 0, tx: 0 };
  const ORDER = [0, 2, 4, 1, 3], CX = 330, CY = 290, R = 98;
  for (let i = 0; i < J.N; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / J.N; J.nut.push({ x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R, rot: Math.random() * 1.0, st: 0 }); }
  const zone = () => { J.zl = 0.32 + Math.random() * 0.4; J.zw = (0.2 - J.bi * 0.011) / Math.pow(dif, 0.7); }; zone();
  J.cur = () => J.nut[ORDER[Math.min(J.bi, J.N - 1)]];
  const release = () => {
    const n = J.cur(), tq = J.tq, zh = J.zl + J.zw; let q;
    if (tq >= 1) q = 0; else if (tq >= J.zl && tq <= zh) q = 1 - 0.45 * Math.abs(tq - (J.zl + J.zw / 2)) / (J.zw / 2); else if (tq < J.zl) q = clamp(tq / J.zl, 0, 1) * 0.35; else q = clamp(0.45 - (tq - zh) * 3.5, 0, 0.45);
    J.hold = false; J.q.push(q); n.st = 1; n.q = q; n.spin = 0.35; const Rt = _mkRate(q); J.fl = { s: tq >= 1 ? 'STRIPPED' : q < 0.35 && tq < J.zl ? 'LOOSE' : Rt[0], c: Rt[1], x: n.x, y: n.y - 30, t: 0 };
    if (q > 0.25) { Mech.spark(n.x, n.y, Math.round(4 + q * 12), '#ffd88a', 200); Snd.clank(); } else Snd.pop();
    J.bi++; J.tq = 0; J.cool = 0.6; if (J.bi >= J.N) { J.done = true; J.score = J.q.reduce((a, b) => a + b, 0) / J.N; } else zone();
  };
  J.update = function (dt, inp) {
    if (J.fl) J.fl.t += dt; for (const n of J.nut) if (n.spin > 0) { n.spin -= dt; n.rot += dt * 9; }
    if (J.done) return; J.t += dt; J.cool -= dt;
    if (!J.hold && J.cool <= 0 && inp.press) { J.hold = true; J.tq = 0; }
    if (J.hold) {
      J.tq += J.rate * (1 + 0.07 * J.bi) * dt; J.cur().rot += dt * (3 + J.tq * 7); J.tk -= dt; if (J.tk <= 0) { Snd.ratchet(); J.tk = 0.11 - J.tq * 0.05; }
      if (J.tq >= 1) { J.tq = 1; release(); } else if (inp.rel || !inp.held) release();
    }
    if (J.t > J.lim && !J.done) { while (J.q.length < J.N) J.q.push(0); J.done = true; J.score = J.q.reduce((a, b) => a + b, 0) / J.N; }
  };
  J.draw = function (g) {
    /* flange plate */
    g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 26; g.shadowOffsetY = 10; let gr = g.createRadialGradient(CX - 40, CY - 50, 20, CX, CY, 170); gr.addColorStop(0, '#9aa5b3'); gr.addColorStop(0.6, '#5d6773'); gr.addColorStop(1, '#2f363f');
    g.beginPath(); g.arc(CX, CY, 168, 0, 6.283); g.fillStyle = gr; g.fill(); g.restore();
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(CX, CY, 168, 0, 6.283); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2; for (const r of [150, 60]) { g.beginPath(); g.arc(CX, CY, r, 0, 6.283); g.stroke(); }
    gr = g.createRadialGradient(CX - 8, CY - 8, 4, CX, CY, 46); gr.addColorStop(0, '#39414c'); gr.addColorStop(1, '#161a20'); g.fillStyle = gr; g.beginPath(); g.arc(CX, CY, 46, 0, 6.283); g.fill();
    const cur = J.cur();
    for (let i = 0; i < J.N; i++) {
      const n = J.nut[i], isCur = n === cur && !J.done; g.save(); g.translate(n.x, n.y);
      g.beginPath(); g.arc(0, 0, 31, 0, 6.283); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill();
      if (isCur) { g.beginPath(); g.arc(0, 0, 38 + 3 * Math.sin(Mech.t * 6), 0, 6.283); g.strokeStyle = 'rgba(255,176,46,0.9)'; g.lineWidth = 3; g.stroke(); }
      g.rotate(n.rot); g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); } g.closePath();
      const col = n.st ? _mkRate(n.q)[1] : '#aab3be'; gr = g.createLinearGradient(-24, -24, 24, 24); gr.addColorStop(0, n.st ? col : '#e3e8ee'); gr.addColorStop(1, n.st ? _mkShade(col.length === 7 ? col : '#808890', 0.55) : '#707a86'); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(0, 0, 11, 0, 6.283); g.fillStyle = '#12161b'; g.fill(); g.restore();
    }
    /* the wrench on the live nut */
    if (!J.done) { g.save(); g.translate(cur.x, cur.y); g.rotate(cur.rot * 0.35 + 0.9); gr = g.createLinearGradient(0, -12, 0, 12); gr.addColorStop(0, '#dfe5ec'); gr.addColorStop(1, '#7d8794'); g.fillStyle = gr; _mkRR(g, 0, -11, 190, 22, 10); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(0, 0, 33, 0, 6.283); g.fill(); g.stroke(); g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + cur.rot - cur.rot * 0.35 - 0.9; g.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); } g.closePath(); g.fillStyle = 'rgba(8,10,14,0.85)'; g.fill(); g.restore(); }
    _mkFloat(g, J.fl);
    /* torque gauge */
    const gx = 730, gy = 118, gw = 50, gh = 330;
    g.fillStyle = 'rgba(0,0,0,0.55)'; _mkRR(g, gx - 10, gy - 10, gw + 20, gh + 20, 10); g.fill(); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(gx, gy, gw, gh);
    g.fillStyle = 'rgba(255,77,94,0.45)'; g.fillRect(gx, gy, gw, gh * 0.05);
    const zy = gy + gh - (J.zl + J.zw) * gh; g.fillStyle = 'rgba(75,224,138,0.38)'; g.fillRect(gx, zy, gw, J.zw * gh); g.strokeStyle = '#4be08a'; g.lineWidth = 2; g.strokeRect(gx, zy, gw, J.zw * gh);
    if (J.hold || J.tq > 0) { const inz = J.tq >= J.zl && J.tq <= J.zl + J.zw; g.fillStyle = inz ? '#4be08a' : J.tq > J.zl + J.zw ? '#ff4d5e' : '#ffb02e'; const h = J.tq * gh; g.fillRect(gx + 8, gy + gh - h, gw - 16, h); g.fillStyle = '#fff'; g.fillRect(gx - 6, gy + gh - h - 2, gw + 12, 4); }
    g.fillStyle = '#93a0b2'; g.font = '700 15px ' + MECH_UI; g.textAlign = 'center'; g.fillText('TORQUE', gx + gw / 2, gy + gh + 32); g.fillText('STRIP', gx + gw / 2, gy - 18);
    for (let i = 0; i < J.N; i++) { const q = J.q[i]; g.beginPath(); g.arc(330 - (J.N - 1) * 14 + i * 28, 478, 7, 0, 6.283); g.fillStyle = q === undefined ? 'rgba(255,255,255,0.14)' : _mkRate(q)[1]; g.fill(); }
  };
  return J;
};

/* ============ mini-game 3: reconnect the wiring (match the colour) ============ */
Mech.mk.wire = function (dif) {
  const J = { N: 6, i: 0, seq: [], q: [], tl: 0, lim: 0, res: null, gap: 0, t: 0, done: false, score: 0, fl: null }, TX = (k) => 105 + k * 190, TY = 352, TW = 170, TH = 118;
  let last = -1; for (let i = 0; i < J.N; i++) { let k; do { k = Math.floor(Math.random() * 4); } while (k === last); J.seq.push(k); last = k; }
  const begin = () => { J.lim = clamp(2.7 / Math.pow(dif, 0.6) - J.i * 0.14, 1.35, 3); J.tl = J.lim; J.res = null; }; begin();
  const resolve = (k) => {
    const ok = k === J.seq[J.i]; const q = ok ? 0.55 + 0.45 * clamp(J.tl / J.lim, 0, 1) : 0; J.q.push(q); J.res = { ok, k: k < 0 ? J.seq[J.i] : k, t: 0, to: k < 0 }; J.gap = 0.55; if (ok) { Mech.spark(TX(k) + TW / 2, TY + 20, 16, MECH_COL[k].c, 240); Snd.beep(600 + q * 500, 0.06); } else { Mech.spark(TX(Math.max(0, k)) + TW / 2, TY + 20, 10, '#ff4d5e', 200); Snd.clank(); }
  };
  J.update = function (dt, inp) {
    if (J.res) J.res.t += dt; if (J.done) return; J.t += dt;
    if (J.gap > 0) { J.gap -= dt; if (J.gap <= 0) { J.i++; if (J.i >= J.N) { J.done = true; J.score = J.q.reduce((a, b) => a + b, 0) / J.N; } else begin(); } return; }
    J.tl -= dt; let k = -1; if (inp.pick) k = inp.pick - 1;
    if (inp.click) for (let m = 0; m < 4; m++) if (inp.click.x >= TX(m) && inp.click.x <= TX(m) + TW && inp.click.y >= TY - 8 && inp.click.y <= TY + TH + 8) k = m;
    if (k >= 0) resolve(k); else if (J.tl <= 0) resolve(-1);
  };
  J.draw = function (g) {
    /* harness box and the loose wire */
    g.fillStyle = '#222a35'; _mkRR(g, 80, 110, 220, 150, 12); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < 5; i++) { g.fillStyle = i < J.N - J.i ? '#ffb02e' : 'rgba(255,255,255,0.1)'; g.fillRect(100 + i * 38, 130, 24, 14); }
    g.fillStyle = '#93a0b2'; g.font = '700 14px ' + MECH_UI; g.textAlign = 'left'; g.fillText('FUSE BOX', 100, 168);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(100, 188, 180, 52); g.fillStyle = '#93a0b2'; g.fillText('WIRE ' + Math.min(J.i + 1, J.N) + ' / ' + J.N, 112, 220);
    const k = J.i < J.N ? J.seq[J.i] : J.seq[J.N - 1], col = MECH_COL[k].c, sw = Math.sin(Mech.t * 7) * (J.res ? 0 : 6);
    const ex = 560 + sw, ey = 218 + Math.cos(Mech.t * 5) * 4;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 20; g.beginPath(); g.moveTo(300, 190); g.bezierCurveTo(400, 190, 420, 250, ex, ey); g.stroke();
    g.strokeStyle = col; g.lineWidth = 14; g.beginPath(); g.moveTo(300, 190); g.bezierCurveTo(400, 190, 420, 250, ex, ey); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(300, 184); g.bezierCurveTo(400, 184, 420, 244, ex, ey - 5); g.stroke();
    g.fillStyle = '#d99a54'; _mkRR(g, ex - 2, ey - 6, 30, 12, 3); g.fill(); g.fillStyle = '#ffe2a8'; g.fillRect(ex + 12, ey - 3, 14, 3);
    if (!J.res && Math.random() < 0.5) Mech.spark(ex + 26, ey, 1, '#fff2b0', 120, 0.25);
    /* fuse timer */
    const f = clamp(J.tl / J.lim, 0, 1); g.fillStyle = 'rgba(255,255,255,0.1)'; _mkRR(g, 300, 290, 360, 14, 7); g.fill(); g.fillStyle = f > 0.5 ? '#4be08a' : f > 0.25 ? '#ffb02e' : '#ff4d5e'; _mkRR(g, 300, 290, Math.max(10, 360 * f), 14, 7); g.fill();
    /* terminals */
    for (let m = 0; m < 4; m++) {
      const x = TX(m), hit = J.res && J.res.k === m, good = hit && J.res.ok, bad = hit && !J.res.ok;
      g.fillStyle = good ? 'rgba(75,224,138,0.28)' : bad ? 'rgba(255,77,94,0.3)' : 'rgba(255,255,255,0.07)'; _mkRR(g, x, TY, TW, TH, 12); g.fill(); g.strokeStyle = good ? '#4be08a' : bad ? '#ff4d5e' : 'rgba(255,255,255,0.18)'; g.lineWidth = good || bad ? 3 : 2; g.stroke();
      g.fillStyle = MECH_COL[m].c; _mkShape(g, m, x + TW / 2, TY + 50, 26); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#eef2f7'; g.font = '700 22px ' + MECH_UI; g.textAlign = 'center'; g.fillText(MECH_COL[m].n, x + TW / 2, TY + 104);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.arc(x + 20, TY + 22, 14, 0, 6.283); g.fill(); g.fillStyle = '#fff'; g.font = '700 19px ' + MECH_UI; g.fillText(String(m + 1), x + 20, TY + 29);
    }
    /* the connecting wire after a pick */
    if (J.res) { const r = J.res, tx = TX(r.k) + TW / 2, a = clamp(r.t * 5, 0, 1); g.strokeStyle = r.ok ? MECH_COL[r.k].c : '#ff4d5e'; g.lineWidth = 8; g.globalAlpha = a; g.beginPath(); g.moveTo(ex, ey); g.quadraticCurveTo(ex, TY - 40, tx, TY + 6); g.stroke(); g.globalAlpha = 1;
      g.textAlign = 'center'; g.font = '400 34px ' + MECH_DISP; g.fillStyle = r.ok ? '#4be08a' : '#ff4d5e'; g.fillText(r.ok ? 'CONNECTED' : r.to ? 'TOO SLOW' : 'SHORTED', 480, 282); }
    for (let i = 0; i < J.N; i++) { const q = J.q[i]; g.beginPath(); g.arc(480 - (J.N - 1) * 14 + i * 28, 478, 7, 0, 6.283); g.fillStyle = q === undefined ? 'rgba(255,255,255,0.14)' : q > 0 ? _mkRate(q)[1] : '#ff4d5e'; g.fill(); }
  };
  return J;
};

/* ============ mini-game 4: weld the seam (steady tracking) ============ */
Mech.mk.weld = function (dif) {
  const X0 = 100, X1 = 860, T = 7.5, SEG = 190, tol = 25 / Math.pow(dif, 0.5), a1 = 58 * Math.min(1.3, dif), f1 = 0.9 + Math.random() * 0.5, p1 = Math.random() * 6.283, a2 = 24, f2 = 2.2 + Math.random() * 1.0, p2 = Math.random() * 6.283;
  const J = { t: 0, u: 0, ty: 285, vy: 0, ok: 0, seg: new Int8Array(SEG).fill(-1), k0: 0, done: false, score: 0, tk: 0, on: true, hot: 0 };
  J.sy = (u) => 285 + (a1 * Math.sin(u * f1 * 6.283 + p1) + a2 * Math.sin(u * f2 * 6.283 + p2)) * Math.min(1, u * 6);
  J.update = function (dt, inp) {
    if (J.done) return; J.t += dt; J.u = Math.min(1, J.t / T);
    let want = 0; if (inp.up) want -= 1; if (inp.down) want += 1;
    if (want !== 0) { J.vy += (want * 340 - J.vy) * Math.min(1, dt * 10); Mech.ptr.use = false; J.ty += J.vy * dt; }
    else if (inp.use) { J.vy = 0; J.ty += (inp.py - J.ty) * Math.min(1, dt * 13); }
    else { J.vy += (0 - J.vy) * Math.min(1, dt * 10); J.ty += J.vy * dt; }
    J.ty = clamp(J.ty, 150, 425);
    J.on = Math.abs(J.ty - J.sy(J.u)) < tol; if (J.on) J.ok += dt;
    const k = Math.min(SEG - 1, Math.floor(J.u * SEG)); for (let j = J.k0; j <= k; j++) J.seg[j] = J.on ? 1 : 0; J.k0 = k + 1;
    const tx = X0 + J.u * (X1 - X0);
    if (J.on) { Mech.spark(tx, J.ty, 2, '#ffd88a', 190, 0.4); J.tk -= dt; if (J.tk <= 0) { Snd.ratchet(); J.tk = 0.12; } } else if (Math.random() < dt * 20) Mech.spark(tx, J.ty, 1, '#ff6a4a', 90, 0.3);
    if (J.t >= T) { J.done = true; J.score = clamp((J.ok / T - 0.18) / 0.75, 0, 1); }
  };
  J.draw = function (g) {
    const pts = []; for (let i = 0; i <= 64; i++) { const u = i / 64; pts.push([X0 + u * (X1 - X0), J.sy(u)]); }
    /* two plates meeting at the seam */
    const plate = (top) => { g.beginPath(); g.moveTo(X0 - 30, top ? 118 : 452); g.lineTo(X1 + 30, top ? 118 : 452); g.lineTo(X1 + 30, J.sy(1)); for (let i = 64; i >= 0; i--) g.lineTo(pts[i][0], pts[i][1]); g.lineTo(X0 - 30, J.sy(0)); g.closePath(); };
    for (const top of [true, false]) { const gr = g.createLinearGradient(0, top ? 118 : 452, 0, 285); gr.addColorStop(0, _mkShade('#8a94a1', top ? 0.8 : 0.7)); gr.addColorStop(1, _mkShade('#8a94a1', top ? 1.1 : 0.95)); g.fillStyle = gr; plate(top); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1; for (let y = 124; y < 450; y += 6) { g.beginPath(); g.moveTo(X0 - 30, y); g.lineTo(X1 + 30, y); g.stroke(); }
    /* the gap, the guide band, the weld bead */
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(75,224,138,0.12)'; g.lineWidth = tol * 2; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    g.strokeStyle = '#05070a'; g.lineWidth = 7; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    const cur = Math.min(J.seg.length - 1, Math.floor(J.u * SEG));
    for (let k = 0; k < J.k0 && k <= cur; k++) {
      const u = k / SEG, x = X0 + u * (X1 - X0), y = J.sy(u), age = J.k0 - k; if (J.seg[k] === 1) {
        const hot = clamp(1 - age / 26, 0, 1); g.fillStyle = 'rgb(' + Math.round(154 + 101 * hot) + ',' + Math.round(160 + 10 * hot) + ',' + Math.round(168 - 98 * hot) + ')'; g.beginPath(); g.arc(x, y, 7.5, 0, 6.283); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(x - 1.5, y - 2, 3, 0, 6.283); g.fill();
      } else { g.fillStyle = 'rgba(70,30,20,0.55)'; g.beginPath(); g.arc(x, y, 5, 0, 6.283); g.fill(); }
    }
    /* torch */
    const tx = X0 + J.u * (X1 - X0), ty = J.ty;
    g.save(); g.translate(tx, ty); g.rotate(-0.62);
    let gr = g.createLinearGradient(0, -8, 0, 8); gr.addColorStop(0, '#c9d1da'); gr.addColorStop(1, '#68717d'); g.fillStyle = gr; _mkRR(g, 10, -8, 118, 16, 6); g.fill(); g.fillStyle = '#b87333'; g.fillRect(2, -5, 14, 10); g.fillStyle = '#2a2f36'; _mkRR(g, 118, -11, 52, 22, 8); g.fill();
    g.restore();
    gr = g.createRadialGradient(tx, ty, 1, tx, ty, J.on ? 26 : 14); gr.addColorStop(0, J.on ? '#ffffff' : '#ffd0c0'); gr.addColorStop(0.35, J.on ? 'rgba(130,200,255,0.95)' : 'rgba(255,120,80,0.8)'); gr.addColorStop(1, 'rgba(60,120,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(tx, ty, J.on ? 26 : 14, 0, 6.283); g.fill();
    /* meters */
    g.fillStyle = 'rgba(0,0,0,0.55)'; _mkRR(g, 100, 470, 760, 12, 6); g.fill(); g.fillStyle = '#ffb02e'; _mkRR(g, 100, 470, Math.max(10, 760 * J.u), 12, 6); g.fill();
    g.textAlign = 'left'; g.font = '700 18px ' + MECH_UI; g.fillStyle = J.on ? '#4be08a' : '#ff4d5e'; g.fillText(J.on ? 'ON THE SEAM' : 'OFF THE LINE', 100, 112); g.textAlign = 'right'; g.fillStyle = '#93a0b2'; g.fillText('WELDED ' + Math.round(J.ok / Math.max(0.001, J.t) * 100) + '%', 860, 112);
  };
  return J;
};
