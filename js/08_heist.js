/* ================= GOLD RUSH: steal the golden car off the freight train =================
   The last wagon of the freight train (07_rail.js) is a boxcar with its side door slid open and its rear doors swung wide, and inside it rides the Aurum
   Spectre, a one-off gold hypercar. Out in the country, beside the viaduct where it runs lowest, somebody has built a big wooden kicker ramp aimed
   square at the line.
     idle      a gold beam marks the start of the run-up (and the map shows it). Drive into it to begin.
     armed     the train slows for the grade and the HUD counts down to the open door reaching the ramp, next to how long you will take to reach the lip
               at your speed. Floor it up the ramp at the right moment and fly in through the door. Miss (or bounce off a wagon) and line up again;
               the train comes round again a few seconds later.
     aboard    you are in, your car sliding to a stop beside the gold one. F: get out, and take it (that is grand theft auto: three stars).
     ride      the Aurum faces the open rear doors. Throttle: drive it out of the back onto the viaduct, then get off the line and home.
     escape    get it into your garage. Do that and it is yours, with a $250,000 payday. Wreck it or get busted and it is gone (you can try again).
   Your own car stays behind in the wagon and is valet-parked back at your garage, as when you jack a car. */
const Heist = { phase: 'idle', site: null, ride: null, built: false, group: null, marker: null, eta: 0, you: 0, tries: 0, msgT: 0, wasAir: false, prev: null, left: null, gold: null };
const HEIST = { LAT: 13, RL: 24, RW: 6.2, RUN: 70, V: 16, VN: 22, REWARD: 250000, ID: 'aurum', GOLD: 0xd8aa30 };

/* the golden car: an Aether X chassis made faster and lighter, all in gold. It only shows in the garage once it is yours */
(function heistReg() {
  const B = CAR_BY_ID.hyper; if (!B || CAR_BY_ID[HEIST.ID]) return;
  const d = { id: HEIST.ID, name: 'Aurum Spectre', cls: 'Gold hypercar', price: 0, paint: 2, dy: B.dy, snd: { f: 1.5, lp: 1.8 }, dial: 440, gold: true, stolen: true, rank: 0,
    blurb: 'A one-off: the Aether X chassis, lightened, retuned and finished all over in real gold leaf. Taken off a moving freight train. Nobody else on the island has one.',
    p: Object.assign({}, B.p, { m: 1280, gears: B.p.gears.slice() }), t: Object.assign({}, B.t, { Tmax: 1080, mu: 1.55 }), stats: { spd: 10, acc: 10, hdl: 10, off: 1 },
    body: Object.assign({}, B.body, { rim: [0.86, 0.66, 0.22], rimStyle: 'five' }) };
  CARS.push(d); CAR_BY_ID[d.id] = d; const b = d.body; d.top = (b.y0 != null ? b.y0 : 0.36) + b.H + 0.1 + b.C; d.hl = b.L / 2;
})();
/* real gold on a car's paint material */
function heistGild(m) { m.color.copy(lc(HEIST.GOLD)); m.metalness = 0.95; m.roughness = 0.2; if (m.clearcoat != null) { m.clearcoat = 1; m.clearcoatRoughness = 0.08; } m.envMapIntensity = 1.1; }

/* ---------- the site: where the deck runs lowest over flat, open, dry ground with nothing in the way of a run-up ---------- */
Heist.plan = function () {
  const P = Rail.pts, n = P.n; let best = null, bc = 1e9;
  for (let i = 0; i < n; i += 5) {
    const j = (i + 1) % n, tx = P.x[j] - P.x[i], tz = P.z[j] - P.z[i], l = Math.hypot(tx, tz), rx = tz / l, rz = -tx / l;   /* the right-hand side, where the door is */
    let ok = true, gmin = 1e9, gmax = -1e9;
    for (let u = HEIST.LAT - 2; u <= HEIST.LAT + HEIST.RL + HEIST.RUN; u += 6) for (const w of [-6, 0, 6]) {
      const x = P.x[i] + rx * u + tx / l * w, z = P.z[i] + rz * u + tz / l * w, h = terrainHeight(x, z);
      if (h < 1.5 || (NR.seg >= 0 && NR.d < NR.halfW + 6) || townAt(x, z, 60) || Rail.dist(x, z) < u - 4) { ok = false; break; }
      gmin = Math.min(gmin, h); gmax = Math.max(gmax, h);
    }
    if (!ok) continue;
    const g0 = terrainHeight(P.x[i] + rx * HEIST.LAT, P.z[i] + rz * HEIST.LAT), floor = P.y[i] + 0.21 + RAIL_WAGON.Y0 + 0.12, c = (floor - g0 - 10) ** 2 + (gmax - gmin) * 0.8 + Math.max(0, floor - g0 - 12) * 4;
    if (c < bc) { bc = c; best = { i, tx: tx / l, tz: tz / l, rx, rz, floor, g0 }; }
  }
  if (!best) return;
  const S = Heist.site = best, i = S.i;
  S.s = i * Rail.dsR; S.cx = P.x[i]; S.cz = P.z[i];
  /* the ramp: RL long, rising as a curve to a lip about three metres under the wagon floor, its lip HEIST.LAT from the middle of the line */
  S.lipX = S.cx + S.rx * HEIST.LAT; S.lipZ = S.cz + S.rz * HEIST.LAT; S.bx = S.lipX + S.rx * HEIST.RL; S.bz = S.lipZ + S.rz * HEIST.RL;
  S.g = terrainHeight(S.bx, S.bz); S.RH = clamp(S.floor - S.g - 3.2, 4.5, 8.5);
  S.sx = S.bx + S.rx * HEIST.RUN; S.sz = S.bz + S.rz * HEIST.RUN;   /* the start of the run-up */
  S.yaw = Math.atan2(-S.rx, -S.rz);                                   /* facing the line */
};
/* the ramp's surface under (x, z), or -1e9 off it */
Heist.rampH = function (x, z) {
  const S = Heist.site; if (!S) return -1e9; const dx = x - S.bx, dz = z - S.bz, u = -(dx * S.rx + dz * S.rz), w = dx * S.rz - dz * S.rx;   /* u: 0 at the foot .. RL at the lip */
  if (u < 0 || u > HEIST.RL || Math.abs(w) > HEIST.RW / 2) return -1e9; const k = u / HEIST.RL; return S.g + S.RH * k * k;
};
/* ground for the player's car: the ramp, and the viaduct deck once up on it */
Heist.ground = function (x, z, c, o) {
  if (!Heist.site) return; const h = Heist.rampH(x, z); if (h > o.h) { o.h = h; o.mu = 1.0; o.rr = 0.02; o.rough = 0.05; o.road = true; o.water = false; }
  Rail.deck(x, z, c.y, o);
};
/* no trees on the run-up and the ramp */
Heist.clearTree = function (x, z) { const S = Heist.site; if (!S) return false; const dx = x - S.cx, dz = z - S.cz, u = dx * S.rx + dz * S.rz, w = dx * S.rz - dz * S.rx; return u > 4 && u < HEIST.LAT + HEIST.RL + HEIST.RUN + 14 && Math.abs(w) < 9; };

/* ---------- the things in the world: the ramp, the gold beam, the gold car in the wagon ---------- */
Heist.build = function () {
  const S = Heist.site; if (!S || Heist.built) return; Heist.built = true;
  const gb = new GB(S.bx, S.bz, false), WOOD = lc(0xa9784a), WOOD2 = lc(0x7a5434), YEL = lc(0xf2c81e), BLK = lc(0x15171c), N = 16, hw = HEIST.RW / 2;
  const at = (u, w, y) => [S.bx - S.rx * u + S.rz * w, y, S.bz - S.rz * u - S.rx * w, 0, 0];
  for (let k = 0; k < N; k++) {
    const u0 = HEIST.RL * k / N, u1 = HEIST.RL * (k + 1) / N, h0 = S.g + S.RH * (u0 / HEIST.RL) ** 2, h1 = S.g + S.RH * (u1 / HEIST.RL) ** 2, c = k % 2 ? WOOD : WOOD2;
    gb.quadA(at(u0, -hw, h0), at(u1, -hw, h1), at(u1, hw, h1), at(u0, hw, h0), 0, 1, 0, c.r, c.g, c.b);                              /* the deck */
    for (const sd of [-1, 1]) gb.quadA(at(u0, sd * hw, S.g - 0.5), at(u1, sd * hw, S.g - 0.5), at(u1, sd * hw, h1), at(u0, sd * hw, h0), sd * S.rz, 0, -sd * S.rx, WOOD2.r, WOOD2.g, WOOD2.b);   /* the sides */
    if (k === N - 1) { gb.quadA(at(u1, -hw, S.g - 0.5), at(u1, hw, S.g - 0.5), at(u1, hw, h1), at(u1, -hw, h1), -S.rx, 0, -S.rz, WOOD2.r, WOOD2.g, WOOD2.b);   /* the back of the lip */
      for (let q = 0; q < 6; q++) { const w0 = -hw + q * HEIST.RW / 6, w1 = w0 + HEIST.RW / 6, c2 = q % 2 ? YEL : BLK; gb.quadA(at(u1 - 0.6, w0, h1 - 0.24 + 0.01), at(u1, w0, h1 + 0.01), at(u1, w1, h1 + 0.01), at(u1 - 0.6, w1, h1 - 0.24 + 0.01), 0, 1, 0, c2.r, c2.g, c2.b); } }   /* the striped lip */
  }
  const m = gb.mesh(MAT.prop, true, true); m.position.set(S.bx, 0, S.bz);
  Heist.group = new THREE.Group(); Heist.group.name = 'heist'; Heist.group.add(m); scene.add(Heist.group);
  /* trestles under the lip, so it reads as built, and two lamps that light green when the timing is right */
  const tg = new GB(S.bx, S.bz, false), box = RailG.box, M4 = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, S.yaw, 0)), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  for (let k = 3; k <= N; k += 3) { const u = HEIST.RL * k / N, h = S.RH * (u / HEIST.RL) ** 2; for (const sd of [-1, 1]) { const p = at(u, sd * (hw - 0.3), 0); M4.compose(V.set(p[0], S.g + h / 2 - 0.2, p[2]), Q, Sc.set(0.25, h + 0.4, 0.25)); tg.geo(box, M4, WOOD2, 0.2); } }
  const tm = tg.mesh(MAT.prop, true, true); tm.position.set(S.bx, 0, S.bz); Heist.group.add(tm);
  Heist.lamps = []; for (const sd of [-1, 1]) { const p = at(HEIST.RL - 0.3, sd * (hw + 0.4), 0), l = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3020 })); l.position.set(p[0], S.g + S.RH + 0.9, p[2]);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, S.RH + 0.9, 6), new THREE.MeshStandardMaterial({ color: 0x333333 })); pole.position.set(p[0], S.g + (S.RH + 0.9) / 2, p[2]); Heist.group.add(l, pole); Heist.lamps.push(l); }
  /* the gold beam at the start of the run-up */
  const b = Heist.marker = makeBeam('#ffd23a', 6, 60); b.position.set(S.sx, terrainHeight(S.sx, S.sz) + 30, S.sz); Heist.group.add(b);
  /* the Aurum in the heist wagon, facing its open rear doors */
  Heist.placeGold();
};
Heist.placeGold = function () {
  const t = Rail.heist; if (!t) return; if (Heist.gold) { t.m.remove(Heist.gold); disposeCar(Heist.gold); Heist.gold = null; }
  if (save.owned[HEIST.ID] || (save.car === HEIST.ID && Heist.phase !== 'idle')) return;
  const g = Heist.gold = buildCarModel(CAR_BY_ID[HEIST.ID], HEIST.GOLD, { static: true });
  g.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshPhysicalMaterial) heistGild(o.material); });
  g.position.set(0, RAIL_WAGON.Y0 + 0.12, -4.0); g.rotation.y = Math.PI; t.m.add(g);
};

/* ---------- the run ---------- */
/* seconds until the middle of the open door passes the ramp's line (forward along the line, wrapping round the loop) */
Heist.doorEta = function () {
  const S = Heist.site, t = Rail.heist; let d = S.s - (Rail.s - t.off + (RAIL_WAGON.DOOR[0] + RAIL_WAGON.DOOR[1]) / 2); d = ((d % Rail.L) + Rail.L) % Rail.L; if (d > Rail.L - 60) d -= Rail.L; return d / Math.max(1, Rail.v);
};
/* bring the train round: the open door arrives in `sec` seconds (only while every vehicle is well out of sight of the player) */
Heist.cue = function (sec) {
  const S = Heist.site, t = Rail.heist, want = S.s - (RAIL_WAGON.DOOR[0] + RAIL_WAGON.DOOR[1]) / 2 + t.off - sec * Rail.v, far = (s) => { const q = {}; for (const v of Rail.train) { Rail.at(s - v.off, q); if (Math.hypot(q.x - Pl.x, q.z - Pl.z) < 380) return false; } return true; };
  if (far(Rail.s) && far(want)) { Rail.s = ((want % Rail.L) + Rail.L) % Rail.L; Rail.update(0); return true; } return false;
};
Heist.start = function () {
  Heist.phase = 'armed'; Heist.tries = 0; Rail.v = HEIST.V; Heist.cue(32); Snd.beep(700, 0.2);
  UI.banner('GOLD RUSH', 'The freight is coming · hit the ramp and fly in through the open door');
  UI.toast('Watch the timer: when DOOR and YOU match, you will meet it', 'info');
};
Heist.stop = function () { Heist.phase = 'idle'; Rail.v = HEIST.VN; Heist.ride = null; if (Target.label === 'Your garage') Target.on = false; };
Heist.miss = function (why) {
  if (Heist.phase !== 'armed') return; Heist.tries++; Heist.msgT = 3; Snd.fail(); UI.toast(why + ' · line up for another go', 'bad');
};
/* is the car (its middle, in the wagon's own frame) in through the open door, or inside? */
Heist.inside = function (t, L) {
  if (t !== Rail.heist || Heist.phase !== 'armed') return false; const D = RAIL_WAGON.DOOR, W = RAIL_WAGON.W, y = L.y - 0.6 - RAIL_WAGON.Y0;
  return L.z > D[0] - 0.6 && L.z < D[1] + 0.6 && L.x < W / 2 + 1.0 && L.x > -W / 2 && y > -0.6 && y < RAIL_WAGON.DOORH;
};
const _hsL = {}, _hsW = {};
Heist.update = function (dt) {
  const S = Heist.site; if (!S || !Heist.built || Rally.on || Derby.on || Drag.on) return;
  const c = car, ph = Heist.phase, near = Math.hypot(Pl.x - S.sx, Pl.z - S.sz), t = Rail.heist;
  Heist.marker.visible = ph === 'idle' && !save.owned[HEIST.ID]; Heist.msgT -= dt;
  if (ph === 'idle') { if (!save.owned[HEIST.ID] && !Foot.on && !Fly.on && !Boat.on && !Mi && !Race.on && near < 9 && c.wrecked <= 0 && App.mode === 'play') Heist.start(); return; }
  if (ph === 'armed') {
    const dl = Math.hypot(Pl.x - S.cx, Pl.z - S.cz); if (dl > 420 || Foot.on || c.wrecked > 0) { Heist.stop(); UI.toast('Gold Rush called off', 'info'); return; }
    Heist.eta = Heist.doorEta(); if (Heist.eta < -1.5 || Heist.eta > Rail.L / Rail.v - 30) Heist.cue(22);   /* it went by: bring it round again */
    /* how long you will take to the lip at this speed, plus the flight to the door */
    const dx = S.lipX - c.x, dz = S.lipZ - c.z, along = -(dx * S.rx + dz * S.rz) <= 0 ? Math.hypot(dx, dz) : 0, sp = Math.max(2, Math.hypot(c.vx, c.vz)); Heist.you = along / sp + HEIST.LAT / sp * 0.9;
    const good = Math.abs(Heist.you - Heist.eta) < 0.3 && Heist.eta < 8; for (const l of Heist.lamps) l.material.color.setHex(good ? 0x30ff50 : Heist.eta < 10 ? 0xffb020 : 0xff3020);
    /* in through the door? */
    Rail.toLocal(t, c.x, c.y + 0.6, c.z, _hsL);
    if (Heist.inside(t, _hsL) && _hsL.x < RAIL_WAGON.W / 2 - 0.4) { Heist.catch(_hsL); return; }
    /* a miss: past the line, or down on the ground after the jump */
    if (Heist.rampH(c.x, c.z) > -1e8) Heist.rampT = App.time;
    if (c.air) Heist.wasAir = App.time - (Heist.rampT || -9) < 3; else if (Heist.wasAir) { Heist.wasAir = false; if (Heist.rampH(c.x, c.z) < -1e8) Heist.miss(Rail.deck(c.x, c.z, c.y, { h: -1e9 }) ? 'Landed on the tracks' : 'Missed the door'); }
    return;
  }
  if (ph === 'escape') {
    if (c.wrecked > 0 || save.car !== HEIST.ID) { Heist.fail('The Aurum was wrecked'); return; }
    if (Police.phase === 'busted') { Heist.fail('Busted with the Aurum'); return; }
    Target.on = true; Target.x = GAR.ox; Target.z = GAR.oz - 6; Target.label = 'Your garage';
    if (GAR.inside) Heist.win();
  }
};
/* in through the door: from here the wagon carries the car (no physics until it drives out) */
Heist.catch = function (L) {
  const c = car, t = Rail.heist; Heist.phase = 'aboard'; Heist.prev = save.car;
  const ly = c.yaw - t.yaw; Heist.ride = { t: 0, x0: L.x, z0: clamp(L.z, 0.6, 6.4), y0: L.y - 0.6, a0: Math.atan2(Math.sin(ly), Math.cos(ly)), x: 0, z: clamp(L.z, 1.2, 5.8), a: 0, v: 0 };
  c.vx = c.vz = 0; Cam.shake = 1.6; Snd.crash(9); App.dmg = Math.min(1, App.dmg + 0.25); c.health = Math.max(20, c.health - 6);
  UI.banner('YOU’RE IN!', 'Get out and take the Aurum Spectre · F'); Snd.win();
};
/* every step while the wagon has the car: ease to a stop where it landed, then sit there; once the Aurum is yours, roll it out of the back on the throttle */
Heist.rideStep = function (dt) {
  const R = Heist.ride, c = car, t = Rail.heist; R.t += dt; const k = Math.min(1, R.t / 0.7), e = k * k * (3 - 2 * k);
  let lx = R.x0 + (R.x - R.x0) * e, lz = R.z0 + (R.z - R.z0) * e, ly = R.y0 * (1 - e) + RAIL_WAGON.Y0 + 0.12 * e, la = R.a0 + angDiff(R.a0, R.a) * e;
  if (Heist.phase === 'ride') {
    R.v = Math.max(0, Math.min(9, R.v + (c.thr > 0.1 ? 6 * c.thr : -4) * dt)); R.z -= R.v * dt; lz = R.z; lx = 0; la = Math.PI; ly = RAIL_WAGON.Y0 + 0.12;
    if (R.z < -t.L / 2 - 2.6) {   /* out of the back: the car is its own again, carried along at the train's speed less what it drove out at */
      Rail.toWorld(t, 0, RAIL_WAGON.Y0 + 0.12, R.z, _hsW); const s = Math.sin(t.yaw), co = Math.cos(t.yaw), vf = Rail.v - R.v;
      c.x = _hsW.x; c.z = _hsW.z; c.y = _hsW.y; c.yaw = t.yaw + Math.PI; c.vx = s * vf; c.vz = co * vf; c.vy = -0.5; c.w = 0; c.speed = -vf; c.air = true;
      Heist.ride = null; Heist.phase = 'escape'; UI.banner('GET IT HOME', 'Lose the police and drive the Aurum into your garage'); return;
    }
  }
  Rail.toWorld(t, lx, ly, lz, _hsW); const s = Math.sin(t.yaw), co = Math.cos(t.yaw);
  c.x = _hsW.x; c.y = _hsW.y; c.z = _hsW.z; c.yaw = t.yaw + la; c.vx = s * Rail.v; c.vz = co * Rail.v; c.vy = 0; c.w = 0; c.speed = 0; c.air = false; c.airCd = 0.3;
  if (c.wh) for (let i = 0; i < 4; i++) c.wh[i] = c.y;
  if (c.surf) { c.surf.water = false; c.surf.road = true; }
};
/* F in the wagon: out of your car and into the gold one */
Heist.key = function (code) {
  if (Heist.phase === 'aboard' || Heist.phase === 'ride') { if (code === 'KeyF' && Heist.phase === 'aboard' && Heist.ride.t > 0.7) Heist.take(); return /^(KeyF|KeyR|KeyE|Enter)$/.test(code); }
  return false;
};
Heist.take = function () {
  const t = Rail.heist, prev = save.car, R = Heist.ride;
  /* your own car stays parked in the wagon (it is valet-parked back at the garage) */
  const left = Heist.left = buildCarModel(CAR_BY_ID[prev], curColor(prev), { static: true }); left.position.set(R.x, RAIL_WAGON.Y0 + 0.12, R.z); left.rotation.y = R.a; t.m.add(left);
  if (Heist.gold) { t.m.remove(Heist.gold); disposeCar(Heist.gold); Heist.gold = null; }
  save.heist = { prev }; applyCar(HEIST.ID, true); car.health = 100; car.nitro = tune.nitroMax;
  R.x0 = R.x = 0; R.z0 = R.z = -4.0; R.a0 = R.a = Math.PI; R.y0 = RAIL_WAGON.Y0 + 0.12; R.t = 1; R.v = 0;
  Heist.phase = 'ride'; Snd.door(); Wanted.crime('Grand theft auto', 3); writeSave();
  UI.banner('GRAND THEFT AURUM', 'Throttle to drive it out of the back of the wagon');
};
Heist.win = function () {
  const prev = (save.heist && save.heist.prev) || 'rook'; save.owned[HEIST.ID] = true; save.money += HEIST.REWARD; save.heist = { done: 1, prev }; GAR.dirty = true; Home.refresh(); writeSave();
  Heist.clearLeft(); Heist.stop(); Target.on = false; Snd.win(); Cam.shake = 0.6;
  UI.banner('THE AURUM IS YOURS', money(HEIST.REWARD) + ' · the Aurum Spectre is in your garage'); UI.toast('Gold Rush complete · +' + money(HEIST.REWARD), 'good');
};
Heist.fail = function (why) {
  const prev = (save.heist && save.heist.prev) || 'rook'; Heist.clearLeft(); Heist.stop(); Target.on = false; save.heist = { prev: null };
  if (save.car === HEIST.ID) { applyCar(save.owned[prev] ? prev : 'rook', true); if (car.wrecked <= 0) { const slot = save.gar.slots[save.car]; if (slot != null) { const p = Home.bayWorld(slot, CUR); spawnAt(p.x, p.z, p.yaw); } } }
  writeSave(); Heist.placeGold(); UI.toast(why + ' · the gold car is gone · Gold Rush can be tried again', 'bad');
};
Heist.clearLeft = function () { if (Heist.left && Rail.heist) { Rail.heist.m.remove(Heist.left); disposeCar(Heist.left); } Heist.left = null; };
/* loading a save that stopped in the middle of the escape: back to your own car */
Heist.setup = function () {
  Heist.plan(); if (!Heist.site) return; Heist.build();
  if (save.car === HEIST.ID && !save.owned[HEIST.ID]) { const prev = (save.heist && save.heist.prev) || 'rook'; save.car = save.owned[prev] ? prev : 'rook'; save.heist = { prev: null }; }
};
/* the HUD line while it runs */
Heist.prompt = function (pr) {
  const ph = Heist.phase; if (ph === 'idle') return false; let h;
  if (ph === 'armed') { const d = Heist.eta, y = Heist.you, good = Math.abs(y - d) < 0.3 && d < 8; h = '<em>GOLD RUSH</em> door in ' + (d > 0 ? d.toFixed(1) + ' s' : 'now') + ' · you ' + (y < 60 ? y.toFixed(1) + ' s' : '—') + (good ? ' · <b style="color:#4f6">GO!</b>' : '') + (Heist.msgT > 0 ? ' · missed, again' : ''); }
  else if (ph === 'aboard') h = TouchIn.on ? '<em>CAR</em> take the Aurum Spectre' : '<em>F</em> Get out and take the Aurum Spectre';
  else if (ph === 'ride') h = '<em>THROTTLE</em> drive the Aurum out of the back of the wagon';
  else h = '<em>GOLD RUSH</em> get the Aurum into your garage · ' + Math.round(Math.hypot(GAR.ox - Pl.x, GAR.oz - Pl.z)) + ' m';
  if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false; return true;
};
/* the map: the railway, and the gold marker */
Heist.drawMini = function (g) {
  if (Rail.pts) { const P = Rail.pts, p = new Path2D(); p.moveTo(P.x[0], P.z[0]); for (let i = 8; i < P.n; i += 8) p.lineTo(P.x[i], P.z[i]); p.closePath(); g.strokeStyle = 'rgba(40,30,24,0.9)'; g.lineWidth = 9; g.stroke(p); g.setLineDash([14, 10]); g.strokeStyle = '#d8c8a8'; g.lineWidth = 4; g.stroke(p); g.setLineDash([]); }
  const S = Heist.site; if (!S || save.owned[HEIST.ID]) return; g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(S.sx, S.sz, 26, 0, TAU); g.fill();
};
Heist.drawFull = function (g, k) {
  if (Rail.pts) { const P = Rail.pts; g.save(); g.beginPath(); for (let i = 0; i <= P.n; i += 8) { const s = FM.toScreen(P.x[i % P.n], P.z[i % P.n]); if (i) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); } g.closePath(); g.strokeStyle = 'rgba(30,22,18,0.85)'; g.lineWidth = 4 * k; g.stroke(); g.setLineDash([6 * k, 5 * k]); g.strokeStyle = '#e0d2b4'; g.lineWidth = 2 * k; g.stroke(); g.setLineDash([]); g.restore(); }
  const S = Heist.site; if (!S || save.owned[HEIST.ID]) return; const s = FM.toScreen(S.sx, S.sz), r = 7 * k;
  g.save(); g.fillStyle = '#ffd23a'; g.strokeStyle = '#06090e'; g.lineWidth = 2.5 * k; g.beginPath(); g.arc(s[0], s[1], r, 0, TAU); g.fill(); g.stroke();
  g.font = '700 ' + Math.round(13 * k) + 'px Rajdhani, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3.5 * k; g.strokeText('GOLD RUSH', s[0], s[1] - 16 * k); g.fillStyle = '#ffd23a'; g.fillText('GOLD RUSH', s[0], s[1] - 16 * k); g.restore();
};
