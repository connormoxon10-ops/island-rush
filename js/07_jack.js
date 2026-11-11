/* ================= CARJACKING =================
   On foot, walk up to a traffic car (it stops for a walker standing in its lane) and press F: you drag the driver out, take the car and the
   police get +2 stars. The car becomes your active car and the car you came in is valet-parked in your garage (the game only ever has one
   car in the world). A stolen car is "hot" until you drive it into your own garage, where a panel offers Keep (it joins your garage and can be
   driven any time), Sell (cash) or Scrap (upgrade tokens). Tokens buy upgrade levels in the Garage tab.
   Every stolen car is its own car definition (ids j1, j2 ...) built on a traffic body, registered at runtime into CARS / CAR_BY_ID.
   save.stolen[id] = { vi, cc, v, tok }  every stolen car that exists;  save.jack = { id, prev }  the one still in hand (not stashed yet). */
const JACK_MODELS = [
  { vi: 0, name: 'Meridian', cls: 'Sedan', val: [640, 980], tok: 4, rank: 0, dy: 0.02, snd: { f: 0.86, lp: 0.92 }, blurb: 'Family sedan. Dull, dependable and nobody will miss it.',
    p: { m: 1450, a: 1.3, b: 1.3, Iz: 2500, rw: 0.33, fd: 3.6, gears: [3.5, 2.1, 1.45, 1.1, 0.88], idle: 850, red: 6200, track: 1.56, cgh: 0.55, rd: 0.1, rsf: 0.52, cf: 10.0, cr: 12.2 },
    t: { Tmax: 350, mu: 1.08, cd: 0.62, brk: 0.95, off: 1.0 }, stats: { spd: 4, acc: 4, hdl: 4, off: 3 } },
  { vi: 1, name: 'Pico', cls: 'Hatchback', val: [420, 700], tok: 3, rank: 0, dy: 0, snd: { f: 1.05, lp: 1.1 }, blurb: 'Tiny commuter hatch. Light, easy to park, slow to get anywhere.',
    p: { m: 1100, a: 1.15, b: 1.15, Iz: 1600, rw: 0.31, fd: 3.9, gears: [3.4, 2.0, 1.4, 1.08, 0.88], idle: 900, red: 6600, track: 1.5, cgh: 0.5, rd: 0.05, rsf: 0.52, cf: 10.0, cr: 12.4 },
    t: { Tmax: 235, mu: 1.1, cd: 0.5, brk: 1.0, off: 0.95 }, stats: { spd: 3, acc: 3, hdl: 5, off: 2 } },
  { vi: 2, name: 'Ridgeline', cls: 'SUV', val: [900, 1500], tok: 5, rank: 0, dy: 0.2, snd: { f: 0.72, lp: 0.8 }, blurb: 'Tall family SUV. Roomy, thirsty and happy on a dirt road.',
    p: { m: 2000, a: 1.4, b: 1.4, Iz: 3700, rw: 0.38, fd: 3.55, gears: [3.5, 2.05, 1.4, 1.05, 0.82], idle: 800, red: 5600, track: 1.64, cgh: 0.78, rd: 0.4, awd: true, rsf: 0.5, cf: 9.6, cr: 12.6 },
    t: { Tmax: 430, mu: 1.04, cd: 0.9, brk: 0.9, off: 1.2 }, stats: { spd: 4, acc: 3, hdl: 3, off: 6 } },
  { vi: 3, name: 'Carrier', cls: 'Van', val: [560, 900], tok: 4, rank: 0, dy: 0.3, snd: { f: 0.62, lp: 0.7 }, blurb: 'Panel van. Plenty of room for whatever you were not supposed to take.',
    p: { m: 2300, a: 1.55, b: 1.45, Iz: 4800, rw: 0.36, fd: 3.7, gears: [3.6, 2.1, 1.4, 1.0, 0.8], idle: 800, red: 5400, track: 1.66, cgh: 0.9, rd: 0.9, rsf: 0.5, cf: 9.4, cr: 12.8 },
    t: { Tmax: 400, mu: 0.98, cd: 1.1, brk: 0.85, off: 0.95 }, stats: { spd: 3, acc: 2, hdl: 2, off: 4 } }
];
const Jack = { tgt: null, hint: '', busy: false, d: null, t: 0, side: 1, vic: null, vicT: 0, open: false, stashT: 0, declined: false, conf: '', cool: 0, ox: 0, oz: 0, cx: 0, cz: 0, door: false, shoved: false, dir: 1 };
const JACK_SAY = ['HEY! That is my car!', 'Get off! Somebody help!', 'What are you doing?! Stop!', 'No! Not the car, please!', 'Thief! He is taking my car!'];
const tokCost = (l) => 3 + 3 * l;
const jackNearestPaint = (hex) => {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255; let bi = 0, bd = 1e9;
  for (let i = 0; i < PAINTS.length; i++) { const h = PAINTS[i], d = ((h >> 16) & 255) - r, e = ((h >> 8) & 255) - g, f = (h & 255) - b, s = d * d + e * e + f * f; if (s < bd) { bd = s; bi = i; } }
  return bi;
};

/* ---------- stolen car definitions ---------- */
Jack.reg = function (id, r) {
  if (CAR_BY_ID[id]) return CAR_BY_ID[id];
  const M = JACK_MODELS[r.vi], T = TRAFFIC_DEFS[r.vi];
  const d = { id, name: M.name, cls: M.cls, price: 0, paint: r.cc, dy: M.dy, snd: M.snd, dial: 280, blurb: M.blurb, p: Object.assign({}, M.p), t: Object.assign({}, M.t), stats: M.stats, body: Object.assign({}, T.body), stolen: true, vi: r.vi, rank: M.rank };
  d.body.rim = d.body.rim.slice();
  CARS.push(d); CAR_BY_ID[id] = d; const b = d.body; d.top = (b.y0 != null ? b.y0 : 0.36) + b.H + 0.1 + b.C; d.hl = b.L / 2; return d;
};
Jack.worth = (id) => { const r = save.stolen[id]; return r ? Math.round(r.v / 10) * 10 : 0; };
Jack.name = (id) => { const d = CAR_BY_ID[id]; return d ? d.name : 'car'; };
Jack.canStash = () => !!save.jack && GAR.inside && App.mode === 'play' && !Race.on && !Mi && Fare.phase === 'idle' && car.wrecked <= 0 && !Jack.busy && !Fly.on && !Boat.on && !GAR.edit;

/* ---------- finding a car to take ---------- */
const _jl = { lx: 0, lz: 0, hw: 0, hl: 0 };
function jackLocal(d, out) {
  const V = CAR_VARIANTS[d.vi || 0], s = Math.sin(d.yaw), co = Math.cos(d.yaw), dx = Foot.x - d.x, dz = Foot.z - d.z;
  out.lz = dx * s + dz * co; out.lx = dx * co - dz * s; out.hw = V.W / 2; out.hl = V.L / 2; return out;
}
Jack.scan = function () {
  const F = Foot; Jack.tgt = null; Jack.hint = '';
  if (!F.on || F.state !== 'walk' || Talk.on || Jack.busy || App.mode !== 'play' || Mi || Race.on || Police.hold || GAR.edit || Fare.phase !== 'idle') return;
  const fs = Math.sin(F.yaw), fc = Math.cos(F.yaw); let best = 9, bd = null, slow = true;
  for (const d of Dyn.list) {
    if (d.kind !== 'traffic' || d.free || d.jack || !d.mesh) continue;
    const dx = d.x - F.x, dz = d.z - F.z; if (dx * dx + dz * dz > 36) continue;
    const L = jackLocal(d, _jl), ex = Math.max(0, Math.abs(L.lx) - L.hw), ez = Math.max(0, Math.abs(L.lz) - L.hl), dist = Math.hypot(ex, ez);
    if (dist > 1.9 || dist >= best) continue;
    if (!F.tp && dist > 0.6) { const q = Math.hypot(dx, dz) || 1; if ((dx * fs + dz * fc) / q < 0.25) continue; }
    best = dist; bd = d; slow = Math.abs(d.v) < 3.2;
  }
  if (bd && slow) Jack.tgt = bd; else if (bd) Jack.hint = 'That car is moving · step into its lane to stop it';
};

/* ---------- the carjacking itself ---------- */
Jack.begin = function () {
  const d = Jack.tgt, F = Foot; if (!d || Jack.busy || !F.on) return;
  if (save.jack) { UI.toast('Stash the stolen ' + Jack.name(save.jack.id) + ' in your garage first', 'bad'); return; }
  const L = jackLocal(d, _jl); Jack.side = L.lx < 0 ? -1 : 1;
  Jack.busy = true; Jack.d = d; d.jack = true; Jack.t = 0; Jack.door = false; Jack.shoved = false;
  Jack.ox = F.x; Jack.oz = F.z;
  const s = Math.sin(d.yaw), co = Math.cos(d.yaw), rx = co * Jack.side, rz = -s * Jack.side;
  Jack.cx = d.x + rx * (L.hw + 0.78) + s * 0.35; Jack.cz = d.z + rz * (L.hw + 0.78) + co * 0.35;
  Jack.rx = rx; Jack.rz = rz;
  Cam.shake = Math.max(Cam.shake, 0.25);
};
Jack.victim = function (d) {
  /* borrow a pedestrian from the pool and put them in the driver's seat; they get thrown out and run away */
  let p = null, idx = -1;
  for (let i = 0; i < Peds.list.length; i++) { const q = Peds.list[i]; if (!q.keep && !q.own && !q.reg && (q.state === 'walk' || q.state === 'stand' || q.state === 'wait') && Math.hypot(q.x - Foot.x, q.z - Foot.z) > 12) { p = q; idx = i; break; } }
  if (!p) {
    if (Peds.list.length >= Peds.cap - 1) return null;
    p = { app: pedRandomLook(), x: 0, z: 0, y: 0, yaw: 0, v: 0, vt: 1.3, ph: 0, state: 'walk', wait: 0, tilt: 0, jx: 0, jz: 0, t: 0, vx: 0, vz: 0, vy: 0, spin: 0, phone: false, runner: false, onRoad: false, seed: Math.random() * 20, fleeT: 0, T: towns[0], a: { i: 0, j: 0, sx: 1, sz: 1 }, prev: null };
    Peds.list.push(p); idx = Peds.list.length - 1;
  } else { Rel.release(p); p.reg = null; p.pers = null; p.app = pedRandomLook(); }
  Fight.clear(p); pedLook(p, idx);
  const s = Math.sin(d.yaw), co = Math.cos(d.yaw);
  p.x = d.x - co * 0.45 + s * 0.35; p.z = d.z + s * 0.45 + co * 0.35;   /* the driver's seat: left of centre, a little forward */
  groundAt(p.x, p.z, _fgr); p.T = Object.assign({}, p.T, { baseH: _fgr.h }); p.y = d.y + 0.55;
  p.keep = true; p.crossing = false; p.onRoad = false; p.pn = 0; p.phone = false; p.wave = 0; p.v = 0; p.yaw = Math.atan2(Jack.rx, Jack.rz) + Math.PI;
  p.state = 'down'; p.t = 0; p.air = true; p.tilt = 0; p.spin = (Math.random() < 0.5 ? -1 : 1) * 5.2;
  p.vx = Jack.rx * 2.3 - s * 1.5; p.vz = Jack.rz * 2.3 - co * 1.5; p.vy = 2.7;
  Jack.vic = p; Jack.vicT = 0; return p;
};
Jack.take = function () {
  const d = Jack.d, F = Foot, vi = d.vi || 0, M = JACK_MODELS[vi];
  const id = 'j' + (++save.jn), r = { vi, cc: jackNearestPaint(d.hex != null ? d.hex : PAINTS[0]), v: Math.round((M.val[0] + Math.random() * (M.val[1] - M.val[0])) / 10) * 10, tok: M.tok };
  save.stolen[id] = r; const def = Jack.reg(id, r);
  const x = d.x, z = d.z, yaw = d.yaw, prev = save.car, prevName = CUR.name;
  const i = Dyn.list.indexOf(d); if (i >= 0) Dyn.list.splice(i, 1); removeDyn(d);
  save.jack = { id, prev };
  applyCar(id, true); spawnAt(x, z, yaw);
  car.health = 100; car.nitro = Math.min(car.nitro, tune.nitroMax);
  Jack.d = null; Jack.busy = false; Jack.tgt = null; Jack.stashT = 0; Jack.declined = false;
  const n = Math.min(5, Wanted.stars + 2); Wanted.crime('Carjacking', n);
  GAR.dirty = true; Home.refresh(); writeSave(); Snd.door();
  UI.toast('Carjacked a ' + def.name + ' · wanted +2 · your ' + prevName + ' was valet-parked at the garage', 'bad');
  UI.toast('Drive it into your garage to keep, sell or scrap it', 'info');
};
Jack.update = function (dt) {
  const d = Jack.d, F = Foot; if (!Jack.busy) return;
  if (!d || !F.on || F.state !== 'walk' || App.mode !== 'play' || Police.hold) { Jack.abort(); return; }
  Jack.t += dt; const t = Jack.t;
  /* step up to the door and face the driver */
  const a = Math.min(1, t / 0.4), e = a * a * (3 - 2 * a);
  F.x = Jack.ox + (Jack.cx - Jack.ox) * e; F.z = Jack.oz + (Jack.cz - Jack.oz) * e; groundAt(F.x, F.z, _fgr); F.y = _fgr.h; F.vx = F.vz = F.vy = 0; F.speed = 0; F.air = false;
  const want = Math.atan2(d.x - F.x, d.z - F.z); let dy = want - F.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); F.yaw += dy * Math.min(1, dt * 14); F.body = F.yaw;
  if (t >= 0.38 && !Jack.door) { Jack.door = true; Fight.t = 0; Fight.done = true; Fight.hand ^= 1; Snd.door(); }
  if (t >= 0.52 && !Jack.shoved) {
    Jack.shoved = true; Snd.crash(4); Cam.shake = Math.max(Cam.shake, 0.9);
    const p = Jack.victim(d); UI.toast('Driver: "' + JACK_SAY[(Math.random() * JACK_SAY.length) | 0] + '"', 'bad');
    if (p) Snd.whoosh();
  }
  if (t >= 1.15) Jack.take();
};
Jack.abort = function () {
  const d = Jack.d; if (d) { d.jack = false; } Jack.d = null; Jack.busy = false;
};

/* the thrown-out driver: lies in the road for a while, gets up and runs, then goes back into the crowd */
Jack.tickVictim = function (dt) {
  const p = Jack.vic; if (!p) return;
  Jack.vicT += dt;
  if (Peds.list.indexOf(p) < 0) { Jack.vic = null; return; }
  const far = Math.hypot(p.x - Pl.x, p.z - Pl.z) > 70;
  if (p.state === 'flee' && !p.jlong) { p.jlong = true; p.fleeT = 7; }
  if (far || (p.state === 'flee' && p.fleeT < 0.5) || Jack.vicT > 40) { p.jlong = false; p.keep = false; Fight.release(p); Jack.vic = null; }
};

/* ---------- per-frame ---------- */
Jack.tick = function (dt) {
  Jack.scan(); if (Jack.busy) Jack.update(dt);
  Jack.tickVictim(dt);
  if (Jack.canStash() && Math.abs(car.speed) < 3) {
    Jack.stashT += dt;
    if (Jack.stashT > 0.7 && !Jack.declined && !Jack.open) Jack.openPanel();
  } else { Jack.stashT = 0; if (!GAR.inside) Jack.declined = false; }
};

/* ---------- the stash panel (reuses the race lobby overlay) ---------- */
Jack.openPanel = function () {
  if (!Jack.canStash() || App.mode !== 'play') return;
  for (const k in Keys) Keys[k] = false; for (const k of ['l', 'r', 'gas', 'brk', 'nit', 'hand']) TouchIn[k] = 0;
  Jack.open = true; Race.phase = 'off'; UI.setMode('rlobby'); Jack.paint(); Snd.beep(620, 0.06);
};
Jack.close = function () { if (!Jack.open) return; Jack.open = false; Jack.declined = true; UI.setMode('play'); Snd.beep(420, 0.05); };
Jack.paint = function () {
  const J = save.jack; if (!J) { Jack.close(); return; }
  const id = J.id, d = CAR_BY_ID[id], r = save.stolen[id], img = carThumb(d, curPaint(id)), worth = Jack.worth(id);
  E.rlTitle.textContent = 'Stolen vehicle'; E.rlSub.textContent = 'Your garage'; E.rlCash.textContent = money(save.money) + ' · ' + save.tokens + ' tokens';
  E.rlPanel.classList.add('jk');
  E.rlBody.innerHTML = '<p class="rlp">You made it home. Nobody is looking at the ' + esc(d.name) + ' in here. What do you want to do with it?</p>' +
    '<div class="jkcar">' + (img ? '<img alt="' + esc(d.name) + '" src="' + img + '">' : '') + '<div><h3>' + esc(d.name) + '</h3><small>' + esc(d.cls) + ' · stolen</small><div class="jkst">' + ['spd', 'acc', 'hdl', 'off'].map((k) => '<span>' + ({ spd: 'Speed', acc: 'Accel', hdl: 'Handling', off: 'Off-road' })[k] + '<i><b style="width:' + d.stats[k] * 10 + '%"></b></i></span>').join('') + '</div></div></div>' +
    '<div class="jkopts">' +
    '<button type="button" class="jkopt pri" data-act="jk-keep"><b>Keep it</b><span>Park it in your garage · drive it any time</span><kbd>1</kbd></button>' +
    '<button type="button" class="jkopt" data-act="jk-sell"><b>Sell it</b><span>The chop shop pays <em>' + money(worth) + '</em></span><kbd>2</kbd></button>' +
    '<button type="button" class="jkopt" data-act="jk-scrap"><b>Scrap it</b><span>Strip it for <em>' + r.tok + ' upgrade tokens</em></span><kbd>3</kbd></button></div>' +
    '<p class="rlp dim">Upgrade tokens buy engine, tyre, nitro and armour levels in the Garage tab, instead of cash. Selling or scrapping puts your ' + esc(Jack.name(J.prev)) + ' back in the driver\'s seat.</p>';
  E.rlFoot.innerHTML = '<button class="btn" type="button" data-act="jk-close">Not now</button><span></span>';
};
Jack.key = function (code) {
  if (code === 'Escape' || code === 'KeyE') Jack.close(); else if (code === 'Digit1' || code === 'Enter') Jack.keep(); else if (code === 'Digit2') Jack.sell(); else if (code === 'Digit3') Jack.scrap();
};
Jack.click = function (b) {
  const a = b.dataset.act;
  if (a === 'jk-keep') Jack.keep(); else if (a === 'jk-sell') Jack.sell(); else if (a === 'jk-scrap') Jack.scrap(); else if (a === 'jk-close') Jack.close();
};
Jack.done = function () { Jack.open = false; Jack.declined = true; UI.setMode('play'); };
Jack.keep = function () {
  const J = save.jack; if (!J) return; const id = J.id, d = CAR_BY_ID[id];
  save.owned[id] = true; save.cc[id] = save.stolen[id].cc; save.jack = null;
  GAR.dirty = true; Home.refresh(); writeSave(); Jack.done(); Snd.beep(900, 0.12);
  UI.toast('Kept the ' + d.name + ' · it is part of your garage now', 'good');
};
/* back to the car you came in: it is parked in its bay, so that is where you climb out */
Jack.restore = function (prev) {
  prev = save.owned[prev] ? prev : 'rook';
  applyCar(prev, true); car.nitro = Math.min(car.nitro, tune.nitroMax);
  const slot = save.gar.slots[prev];
  if (slot != null) { const p = Home.bayWorld(slot, CAR_BY_ID[prev]); spawnAt(p.x, p.z, p.yaw); }
  GAR.dirty = true; Home.refresh();
};
Jack.drop = function (id) { delete save.stolen[id]; delete save.cc[id]; delete save.owned[id]; if (save.gar.slots) delete save.gar.slots[id]; if (save.cos && save.cos.car) delete save.cos.car[id]; };
Jack.sell = function () {
  const J = save.jack; if (!J) return; const id = J.id, nm = Jack.name(id), v = Jack.worth(id), prev = J.prev;
  save.money += v; save.jack = null; Jack.drop(id); Jack.restore(prev); writeSave(); Jack.done(); Snd.beep(1100, 0.12);
  UI.toast('Sold the ' + nm + ' for ' + money(v), 'good');
};
Jack.scrap = function () {
  const J = save.jack; if (!J) return; const id = J.id, nm = Jack.name(id), n = save.stolen[id].tok, prev = J.prev;
  save.tokens += n; save.jack = null; Jack.drop(id); Jack.restore(prev); writeSave(); Jack.done(); Snd.beep(1000, 0.12);
  UI.toast('Scrapped the ' + nm + ' · +' + n + ' upgrade tokens (' + save.tokens + ')', 'good');
};

/* ---------- kept stolen cars (Garage tab) ---------- */
Jack.sellKept = function (id) {
  const r = save.stolen[id]; if (!r || !save.owned[id] || id === save.car) return;
  const nm = Jack.name(id), v = Jack.worth(id); save.money += v; Jack.drop(id); GAR.dirty = true; Home.refresh(); writeSave(); Snd.beep(1100, 0.12); UI.toast('Sold the ' + nm + ' for ' + money(v), 'good');
};
Jack.scrapKept = function (id) {
  const r = save.stolen[id]; if (!r || !save.owned[id] || id === save.car) return;
  const nm = Jack.name(id); save.tokens += r.tok; Jack.drop(id); GAR.dirty = true; Home.refresh(); writeSave(); Snd.beep(1000, 0.12); UI.toast('Scrapped the ' + nm + ' · +' + r.tok + ' upgrade tokens (' + save.tokens + ')', 'good');
};
Jack.buyTok = function (k) {
  const l = save.up[k], c = tokCost(l); if (l >= 5 || save.tokens < c) return false;
  save.tokens -= c; save.up[k]++; refreshTune(); writeSave(); Snd.beep(900, 0.1); return true;
};

/* ---------- busted: the police impound a hot car ---------- */
Jack.lose = function () {
  const J = save.jack; if (!J) return false;
  const nm = Jack.name(J.id), prev = J.prev; save.jack = null; Jack.drop(J.id);
  applyCar(save.owned[prev] ? prev : 'rook', true); car.nitro = Math.min(car.nitro, tune.nitroMax);
  GAR.dirty = true; Home.refresh(); writeSave();
  UI.toast('The ' + nm + ' was impounded · your ' + CUR.name + ' is back', 'bad'); return true;
};
