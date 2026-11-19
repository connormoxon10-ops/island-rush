/* ================= GOLD RUSH: steal the prize cars off the freight trains =================
   Three freight trains run round the island (07_rail.js). The last wagon of each is a boxcar with its side door slid open and its rear doors swung wide,
   and inside each rides a different one-off car: the Aurum Spectre (a gold hypercar) on the Gold Line, the Argent Wraith (a chrome hypercar) on the
   Silver Line and the Rubis 440 (a candy-ruby muscle car) on the Ruby Line. Out in the country, beside the viaduct where it runs low, somebody has built
   three big wooden kicker ramps aimed square at the line, well apart round the loop: one for each train (the map shows each in its car's colour).
     idle      a gold beam marks the start of the run-up (and the map shows it). Drive into it to begin.
     armed     the train slows for the grade and the HUD counts down to the open door reaching the ramp, next to how long you will take to reach the lip
               at your speed. Floor it up the ramp at the right moment and fly in through the door. Miss (or bounce off a wagon) and line up again;
               the train comes round again a few seconds later.
     aboard    you are in, your car sliding to a stop beside the gold one. F: get out, and take it (that is grand theft auto: three stars).
     ride      the prize car faces the open rear doors. Throttle: drive it out of the back onto the viaduct, then get off the line and home.
     escape    get it into your garage. Do that and it is yours, with a big payday. Wreck it or get busted and it is gone (you can try again).
   Your own car stays behind in the wagon and is valet-parked back at your garage, as when you jack a car. */
const Heist = { phase: 'idle', k: 0, sites: [], site: null, ride: null, built: false, group: null, markers: [], eta: 0, you: 0, tries: 0, msgT: 0, wasAir: false, prev: null, left: null, golds: [], lamps: [] };
const HEIST = { LAT: 13, RL: 24, RW: 6.2, RUN: 70, FOOT: 6, V: 16, VN: 22, REWARD: 250000, ID: 'aurum', GOLD: 0xd8aa30 };
/* the three prize cars, one per train (train k, ramp k). fin: the finish all over the car (colour, metalness, roughness, clearcoat roughness) */
const HEIST_PRIZES = [
  { id: 'aurum', base: 'hyper', name: 'Aurum Spectre', short: 'Aurum', cls: 'Gold hypercar', title: 'GOLD RUSH', col: 0xd8aa30, css: '#ffd23a', fin: [0.95, 0.2, 0.08], reward: 250000, snd: { f: 1.5, lp: 1.8 }, dial: 440,
    p: { m: 1280 }, t: { Tmax: 1080, mu: 1.55 }, rim: [0.86, 0.66, 0.22], rimStyle: 'five', stats: { spd: 10, acc: 10, hdl: 10, off: 1 },
    blurb: 'A one-off: the Aether X chassis, lightened, retuned and finished all over in real gold leaf. Taken off a moving freight train. Nobody else on the island has one.' },
  { id: 'argent', base: 'phantom', name: 'Argent Wraith', short: 'Argent', cls: 'Chrome hypercar', title: 'SILVER RUSH', col: 0xd6dbe2, css: '#dfe8f2', fin: [1.0, 0.07, 0.04], reward: 200000, snd: { f: 1.38, lp: 1.6 }, dial: 400,
    p: { m: 0.9 }, t: { Tmax: 1.2, mu: 1.04 }, rim: [0.12, 0.12, 0.14], rimStyle: 'tri', stats: { spd: 10, acc: 9, hdl: 9, off: 1 },
    blurb: 'A one-off: the Phantom R chassis stripped, retuned and polished all over to a mirror. It rode the Silver Line in a boxcar until somebody jumped in after it.' },
  { id: 'rubis', base: 'muscle', name: 'Rubis 440', short: 'Rubis', cls: 'Ruby muscle car', title: 'RUBY RUSH', col: 0x9e0f24, css: '#ff4a62', fin: [0.55, 0.16, 0.05], reward: 150000, snd: { f: 0.62, lp: 0.72 }, dial: 340,
    p: { m: 0.88 }, t: { Tmax: 1.3, mu: 1.06 }, rim: [0.86, 0.86, 0.9], rimStyle: 'five', stats: { spd: 9, acc: 10, hdl: 6, off: 3 },
    blurb: 'A one-off: a Hammerhead 440 with a bigger block, a lighter shell and deep candy-ruby paint you could fall into. Taken off the Ruby Line, through the door.' }
];
/* the prize cars: each a known chassis made faster and lighter, in its own finish. They only show in the garage once they are yours.
   p and t: absolute values on the Aurum (as it always was), multipliers on the others */
(function heistReg() {
  HEIST_PRIZES.forEach((P, k) => {
    const B = CAR_BY_ID[P.base]; if (!B || CAR_BY_ID[P.id]) return; const mul = k > 0, sc = (o, f) => { const r = Object.assign({}, o); for (const q in f) r[q] = mul ? o[q] * f[q] : f[q]; return r; };
    const d = { id: P.id, name: P.name, cls: P.cls, price: 0, paint: 2, dy: B.dy, snd: P.snd, dial: P.dial, prize: k, gold: k === 0, stolen: true, rank: 0, blurb: P.blurb,
      p: Object.assign(sc(B.p, P.p), { gears: B.p.gears.slice() }), t: sc(B.t, P.t), stats: P.stats, body: Object.assign({}, B.body, { rim: P.rim, rimStyle: P.rimStyle }) };
    CARS.push(d); CAR_BY_ID[d.id] = d; const b = d.body; d.top = (b.y0 != null ? b.y0 : 0.36) + b.H + 0.1 + b.C; d.hl = b.L / 2;
  });
})();
/* the prize's finish on a car's paint material: real gold, a mirror chrome or a deep candy ruby */
function heistGild(m, k) { const P = HEIST_PRIZES[k || 0]; m.color.copy(lc(P.col)); m.metalness = P.fin[0]; m.roughness = P.fin[1]; if (m.clearcoat != null) { m.clearcoat = 1; m.clearcoatRoughness = P.fin[2]; } m.envMapIntensity = k === 1 ? 1.4 : 1.1; }
Heist.P = () => HEIST_PRIZES[Heist.k];
Heist.wagon = () => (Rail.trains ? Rail.trains[Heist.k].heist : null);
Object.defineProperty(Heist, 'gold', { get: () => Heist.golds[Heist.k] || null });

/* ---------- the sites: where the deck runs low over flat, open, dry ground with nothing in the way of a run-up; three of them, well apart round the loop ---------- */
Heist.plan = function () {
  const P = Rail.pts, n = P.n, cand = [];
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
    const gb = terrainHeight(P.x[i] + rx * (HEIST.LAT + HEIST.RL), P.z[i] + rz * (HEIST.LAT + HEIST.RL)), fit = Math.abs(floor - gb - 3.2 - 6.6);   /* how far off the usual 6.6 m ramp it is */
    cand.push({ i, tx: tx / l, tz: tz / l, rx, rz, floor, g0, c, fit });
  }
  /* the best site first (the Aurum's), then the best others that need a ramp of about the same height (so the jump times the same), each a sixth of the loop from the rest */
  cand.sort((a, b) => a.c - b.c); const sep = (a, b) => { const d = Math.abs(a.i - b.i); return Math.min(d, n - d) > n / 6; };
  Heist.sites = [];
  /* the best three sites that all take the usual ramp and are all well apart (the cheapest such trio); failing that, greedily */
  const good = cand.filter((q) => q.fit < 1.0).slice(0, 60); let bestT = null, bc = 1e18;
  for (let a = 0; a < good.length; a++) for (let b = a + 1; b < good.length; b++) { if (!sep(good[a], good[b])) continue; for (let c = b + 1; c < good.length; c++) { const C = good[a].c + good[b].c + good[c].c; if (C < bc && sep(good[a], good[c]) && sep(good[b], good[c])) { bc = C; bestT = [good[a], good[b], good[c]]; } } }
  if (bestT && HEIST_PRIZES.length === 3) Heist.sites = bestT;
  for (const pass of [1.0, 2.0, 1e9]) for (const q of cand) { if (Heist.sites.length >= HEIST_PRIZES.length) break; if (q.fit > pass || Heist.sites.includes(q) || !Heist.sites.every((o) => sep(o, q))) continue; Heist.sites.push(q); }
  Heist.cand = cand; Heist.sites.forEach((S, k) => Heist.site1(S, k)); Heist.site = Heist.sites[0] || null; Heist.k = 0;
};
Heist.site1 = function (S, k) {
  const P = Rail.pts, i = S.i; S.k = k;
  S.s = i * Rail.dsR; S.cx = P.x[i]; S.cz = P.z[i];
  /* the ramp: RL long, rising as a curve to a lip about three metres under the wagon floor, its lip HEIST.LAT from the middle of the line */
  S.lipX = S.cx + S.rx * HEIST.LAT; S.lipZ = S.cz + S.rz * HEIST.LAT; S.bx = S.lipX + S.rx * HEIST.RL; S.bz = S.lipZ + S.rz * HEIST.RL;
  S.g = terrainHeight(S.bx, S.bz); S.RH = clamp(S.floor - S.g - 3.2, 4.5, 8.5);
  S.sx = S.bx + S.rx * HEIST.RUN; S.sz = S.bz + S.rz * HEIST.RUN;   /* the start of the run-up */
  S.yaw = Math.atan2(-S.rx, -S.rz);                                   /* facing the line */
};
/* a ramp's surface under (x, z), or -1e9 off it (any ramp, or just site S) */
Heist.rampH = function (x, z, S) {
  if (!S) { let h = -1e9; for (const q of Heist.sites) h = Math.max(h, Heist.rampH(x, z, q)); return h; } const dx = x - S.bx, dz = z - S.bz, u = -(dx * S.rx + dz * S.rz), w = dx * S.rz - dz * S.rx;   /* u: 0 at the foot .. RL at the lip */
  if (u < 0 || u > HEIST.RL || Math.abs(w) > HEIST.RW / 2) return -1e9; const k = u / HEIST.RL; return S.g + S.RH * k * k;
};
/* ground for the player's car: the ramp, and the viaduct deck once up on it */
Heist.ground = function (x, z, c, o) {
  if (!Heist.site) return; let h = -1e9;
  /* the ramp's foot sits at the ground's height under its middle; on a run-up that slopes across, that left a step on the low side, which kicked the car into the air
     at the foot and, depending on the frame, over the lip. Its first few metres ease from the ground into the ramp instead */
  for (const S of Heist.sites) { let q = Heist.rampH(x, z, S); if (q < -1e8) continue; const dx = x - S.bx, dz = z - S.bz, u = -(dx * S.rx + dz * S.rz); if (u < HEIST.FOOT) q = o.h + (q - o.h) * sstep(0, HEIST.FOOT, u); h = Math.max(h, q); }
  if (h > o.h) { o.h = h; o.mu = 1.0; o.rr = 0.02; o.rough = 0.05; o.road = true; o.water = false; }
  Rail.deck(x, z, c.y, o);
};
/* no trees on the run-up and the ramp */
Heist.clearTree = function (x, z, m) { for (const S of Heist.sites) if (Heist.clearTree1(x, z, S, m || 0)) return true; return false; };
Heist.clearTree1 = function (x, z, S, m) { const dx = x - S.cx, dz = z - S.cz, u = dx * S.rx + dz * S.rz, w = dx * S.rz - dz * S.rx; return u > 4 - m && u < HEIST.LAT + HEIST.RL + HEIST.RUN + 14 + m && Math.abs(w) < 9 + m; };

/* ---------- the things in the world: the ramp, the gold beam, the gold car in the wagon ---------- */
Heist.build = function () {
  if (!Heist.sites.length || Heist.built) return; Heist.built = true; Heist.group = new THREE.Group(); Heist.group.name = 'heist'; scene.add(Heist.group);
  for (const S of Heist.sites) Heist.build1(S);
  Heist.placeGold();
};
Heist.build1 = function (S) {
  const gb = new GB(S.bx, S.bz, false), WOOD = lc(0xa9784a), WOOD2 = lc(0x7a5434), YEL = lc(0xf2c81e), BLK = lc(0x15171c), N = 16, hw = HEIST.RW / 2;
  const at = (u, w, y) => [S.bx - S.rx * u + S.rz * w, y, S.bz - S.rz * u - S.rx * w, 0, 0];
  for (let k = 0; k < N; k++) {
    const u0 = HEIST.RL * k / N, u1 = HEIST.RL * (k + 1) / N, h0 = S.g + S.RH * (u0 / HEIST.RL) ** 2, h1 = S.g + S.RH * (u1 / HEIST.RL) ** 2, c = k % 2 ? WOOD : WOOD2;
    gb.quadA(at(u0, -hw, h0), at(u1, -hw, h1), at(u1, hw, h1), at(u0, hw, h0), 0, 1, 0, c.r, c.g, c.b);                              /* the deck */
    for (const sd of [-1, 1]) gb.quadA(at(u0, sd * hw, S.g - 0.5), at(u1, sd * hw, S.g - 0.5), at(u1, sd * hw, h1), at(u0, sd * hw, h0), sd * S.rz, 0, -sd * S.rx, WOOD2.r, WOOD2.g, WOOD2.b);   /* the sides */
    if (k === N - 1) { gb.quadA(at(u1, -hw, S.g - 0.5), at(u1, hw, S.g - 0.5), at(u1, hw, h1), at(u1, -hw, h1), -S.rx, 0, -S.rz, WOOD2.r, WOOD2.g, WOOD2.b);   /* the back of the lip */
      for (let q = 0; q < 6; q++) { const w0 = -hw + q * HEIST.RW / 6, w1 = w0 + HEIST.RW / 6, c2 = q % 2 ? YEL : BLK; gb.quadA(at(u1 - 0.6, w0, h1 - 0.24 + 0.01), at(u1, w0, h1 + 0.01), at(u1, w1, h1 + 0.01), at(u1 - 0.6, w1, h1 - 0.24 + 0.01), 0, 1, 0, c2.r, c2.g, c2.b); } }   /* the striped lip */
  }
  const m = gb.mesh(MAT.prop, true, true); m.position.set(S.bx, 0, S.bz); Heist.group.add(m);
  /* trestles under the lip, so it reads as built, and two lamps that light green when the timing is right */
  const tg = new GB(S.bx, S.bz, false), box = RailG.box, M4 = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, S.yaw, 0)), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  for (let k = 3; k <= N; k += 3) { const u = HEIST.RL * k / N, h = S.RH * (u / HEIST.RL) ** 2; for (const sd of [-1, 1]) { const p = at(u, sd * (hw - 0.3), 0); M4.compose(V.set(p[0], S.g + h / 2 - 0.2, p[2]), Q, Sc.set(0.25, h + 0.4, 0.25)); tg.geo(box, M4, WOOD2, 0.2); } }
  const tm = tg.mesh(MAT.prop, true, true); tm.position.set(S.bx, 0, S.bz); Heist.group.add(tm);
  const lamps = Heist.lamps[S.k] = []; for (const sd of [-1, 1]) { const p = at(HEIST.RL - 0.3, sd * (hw + 0.4), 0), l = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3020 })); l.position.set(p[0], S.g + S.RH + 0.9, p[2]);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, S.RH + 0.9, 6), new THREE.MeshStandardMaterial({ color: 0x333333 })); pole.position.set(p[0], S.g + (S.RH + 0.9) / 2, p[2]); Heist.group.add(l, pole); lamps.push(l); }
  /* a beam in the prize's colour at the start of the run-up */
  const b = Heist.markers[S.k] = makeBeam(HEIST_PRIZES[S.k].css, 6, 60); b.position.set(S.sx, terrainHeight(S.sx, S.sz) + 30, S.sz); Heist.group.add(b);
};
/* each prize car in its train's heist wagon, facing the open rear doors (all of them, or just prize k) */
Heist.placeGold = function (k) {
  if (k == null) { for (let q = 0; q < HEIST_PRIZES.length; q++) Heist.placeGold(q); return; }
  const tr = Rail.trains && Rail.trains[k], P = HEIST_PRIZES[k]; if (!tr) return; const t = tr.heist, old = Heist.golds[k]; if (old) { t.m.remove(old); disposeCar(old); Heist.golds[k] = null; }
  if (save.owned[P.id] || (save.car === P.id && Heist.phase !== 'idle')) return;
  const g = Heist.golds[k] = buildCarModel(CAR_BY_ID[P.id], P.col, { static: true });
  g.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshPhysicalMaterial) heistGild(o.material, k); });
  g.position.set(0, RAIL_WAGON.Y0 + 0.12, -4.0); g.rotation.y = Math.PI; t.m.add(g);
};

/* ---------- the run ---------- */
/* seconds until the middle of the open door passes the ramp's line (forward along the line, wrapping round the loop) */
Heist.doorEta = function () {
  const S = Heist.site, t = Heist.wagon(); let d = S.s - (Rail.s - t.off + (RAIL_WAGON.DOOR[0] + RAIL_WAGON.DOOR[1]) / 2); d = ((d % Rail.L) + Rail.L) % Rail.L; if (d > Rail.L - 60) d -= Rail.L; return d / Math.max(1, Rail.v);
};
/* bring the train round: the open door arrives in `sec` seconds (only while every vehicle is well out of sight of the player) */
Heist.cue = function (sec) {
  const S = Heist.site, t = Heist.wagon(), want = S.s - (RAIL_WAGON.DOOR[0] + RAIL_WAGON.DOOR[1]) / 2 + t.off - sec * Rail.v, far = (s) => { const q = {}; for (const v of Rail.train) { Rail.at(s - v.off, q); if (Math.hypot(q.x - Pl.x, q.z - Pl.z) < 380) return false; } return true; };
  if (far(Rail.s) && far(want)) { Rail.s = ((want % Rail.L) + Rail.L) % Rail.L; Rail.update(0); return true; } return false;
};
Heist.start = function (k) {
  if (k != null) { Heist.k = k; Heist.site = Heist.sites[k]; } const P = Heist.P();
  Heist.phase = 'armed'; Heist.tries = 0; Rail.v = HEIST.V; Heist.cue(32); Snd.beep(700, 0.2);
  UI.banner(P.title, 'The ' + Rail.trains[Heist.k].name + ' is coming with the ' + P.name + ' · hit the ramp and fly in through the open door');
  UI.toast('Watch the timer: when DOOR and YOU match, you will meet it', 'info');
};
Heist.stop = function () { Heist.phase = 'idle'; Rail.v = HEIST.VN; Heist.ride = null; if (Target.label === 'Your garage') Target.on = false; };
Heist.miss = function (why) {
  if (Heist.phase !== 'armed') return; Heist.tries++; Heist.msgT = 3; Snd.fail(); UI.toast(why + ' · line up for another go', 'bad');
};
/* is the car (its middle, in the wagon's own frame) in through the open door, or inside? */
Heist.inside = function (t, L) {
  if (t !== Heist.wagon() || Heist.phase !== 'armed') return false; const D = RAIL_WAGON.DOOR, W = RAIL_WAGON.W, y = L.y - 0.6 - RAIL_WAGON.Y0;
  return L.z > D[0] - 0.6 && L.z < D[1] + 0.6 && L.x < W / 2 + 1.0 && L.x > -W / 2 && y > -0.6 && y < RAIL_WAGON.DOORH;
};
const _hsL = {}, _hsW = {};
Heist.update = function (dt) {
  if (!Heist.site || !Heist.built || Rally.on || Derby.on || Drag.on) return;
  const c = car, ph = Heist.phase; Heist.msgT -= dt;
  Heist.sites.forEach((q, k) => { Heist.markers[k].visible = ph === 'idle' && !save.owned[HEIST_PRIZES[k].id]; });
  if (ph === 'idle') {
    if (Foot.on || Fly.on || Boat.on || Mi || Race.on || Dunes.on || c.wrecked > 0 || App.mode !== 'play') return;
    Heist.sites.forEach((q, k) => { if (Heist.phase === 'idle' && !save.owned[HEIST_PRIZES[k].id] && Math.hypot(Pl.x - q.sx, Pl.z - q.sz) < 9) Heist.start(k); }); return;
  }
  const S = Heist.site, P = Heist.P(), t = Heist.wagon();
  if (ph === 'armed') {
    const dl = Math.hypot(Pl.x - S.cx, Pl.z - S.cz); if (dl > 420 || Foot.on || c.wrecked > 0) { Heist.stop(); UI.toast('Gold Rush called off', 'info'); return; }
    /* it went by, or is a long way off: bring it round again (once nothing of any train is in sight, so it is not seen to jump) */
    Heist.eta = Heist.doorEta(); Heist.cueT = (Heist.cueT || 0) - dt; if ((Heist.eta < -1.5 || Heist.eta > 40) && Heist.cueT <= 0) { Heist.cueT = 0.5; Heist.cue(22); }
    /* how long you will take to the lip at this speed, plus the flight to the door */
    const dx = S.lipX - c.x, dz = S.lipZ - c.z, along = -(dx * S.rx + dz * S.rz) <= 0 ? Math.hypot(dx, dz) : 0, sp = Math.max(2, Math.hypot(c.vx, c.vz)); Heist.you = along / sp + HEIST.LAT / sp * 0.9;
    const good = Math.abs(Heist.you - Heist.eta) < 0.3 && Heist.eta < 8; for (const l of Heist.lamps[Heist.k]) l.material.color.setHex(good ? 0x30ff50 : Heist.eta < 10 ? 0xffb020 : 0xff3020);
    /* in through the door? */
    Rail.toLocal(t, c.x, c.y + 0.6, c.z, _hsL);
    if (Heist.inside(t, _hsL) && _hsL.x < RAIL_WAGON.W / 2 - 0.4) { Heist.catch(_hsL); return; }
    /* a miss: past the line, or down on the ground after the jump */
    if (Heist.rampH(c.x, c.z, S) > -1e8) Heist.rampT = App.time;
    if (c.air) Heist.wasAir = App.time - (Heist.rampT || -9) < 3; else if (Heist.wasAir) { Heist.wasAir = false; if (Heist.rampH(c.x, c.z) < -1e8) Heist.miss(Rail.deck(c.x, c.z, c.y, { h: -1e9 }) ? 'Landed on the tracks' : 'Missed the door'); }
    return;
  }
  if (ph === 'escape') {
    if (c.wrecked > 0 || save.car !== P.id) { Heist.fail('The ' + P.short + ' was wrecked'); return; }
    if (Police.phase === 'busted') { Heist.fail('Busted with the ' + P.short); return; }
    Target.on = true; Target.x = GAR.ox; Target.z = GAR.oz - 6; Target.label = 'Your garage';
    if (GAR.inside) Heist.win();
  }
};
/* in through the door: from here the wagon carries the car (no physics until it drives out) */
Heist.catch = function (L) {
  const c = car, t = Heist.wagon(); Heist.phase = 'aboard'; Heist.prev = save.car;
  const ly = c.yaw - t.yaw; Heist.ride = { t: 0, x0: L.x, z0: clamp(L.z, 0.6, 6.4), y0: L.y - 0.6, a0: Math.atan2(Math.sin(ly), Math.cos(ly)), x: 0, z: clamp(L.z, 1.2, 5.8), a: 0, v: 0 };
  c.vx = c.vz = 0; Cam.shake = 1.6; Snd.crash(9); App.dmg = Math.min(1, App.dmg + 0.25); c.health = Math.max(20, c.health - 6);
  UI.banner('YOU’RE IN!', 'Get out and take the ' + Heist.P().name + ' · F'); Snd.win();
};
/* every step while the wagon has the car: ease to a stop where it landed, then sit there; once the Aurum is yours, roll it out of the back on the throttle */
Heist.rideStep = function (dt) {
  const R = Heist.ride, c = car, t = Heist.wagon(); R.t += dt; const k = Math.min(1, R.t / 0.7), e = k * k * (3 - 2 * k);
  let lx = R.x0 + (R.x - R.x0) * e, lz = R.z0 + (R.z - R.z0) * e, ly = R.y0 * (1 - e) + RAIL_WAGON.Y0 + 0.12 * e, la = R.a0 + angDiff(R.a0, R.a) * e;
  if (Heist.phase === 'ride') {
    R.v = Math.max(0, Math.min(9, R.v + (c.thr > 0.1 ? 6 * c.thr : -4) * dt)); R.z -= R.v * dt; lz = R.z; lx = 0; la = Math.PI; ly = RAIL_WAGON.Y0 + 0.12;
    if (R.z < -t.L / 2 - 2.6) {   /* out of the back: the car is its own again, carried along at the train's speed less what it drove out at */
      Rail.toWorld(t, 0, RAIL_WAGON.Y0 + 0.12, R.z, _hsW); const s = Math.sin(t.yaw), co = Math.cos(t.yaw), vf = Rail.v - R.v;
      c.x = _hsW.x; c.z = _hsW.z; c.y = _hsW.y; c.yaw = t.yaw + Math.PI; c.vx = s * vf; c.vz = co * vf; c.vy = -0.5; c.w = 0; c.speed = -vf; c.air = true;
      Heist.ride = null; Heist.phase = 'escape'; UI.banner('GET IT HOME', 'Lose the police and drive the ' + Heist.P().short + ' into your garage'); return;
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
  const t = Heist.wagon(), prev = save.car, R = Heist.ride;
  /* your own car stays parked in the wagon (it is valet-parked back at the garage) */
  const left = Heist.left = buildCarModel(CAR_BY_ID[prev], curColor(prev), { static: true }); left.position.set(R.x, RAIL_WAGON.Y0 + 0.12, R.z); left.rotation.y = R.a; t.m.add(left);
  const P = Heist.P(); if (Heist.gold) { t.m.remove(Heist.gold); disposeCar(Heist.gold); Heist.golds[Heist.k] = null; }
  save.heist = { prev, k: Heist.k }; applyCar(P.id, true); car.health = 100; car.nitro = tune.nitroMax;
  R.x0 = R.x = 0; R.z0 = R.z = -4.0; R.a0 = R.a = Math.PI; R.y0 = RAIL_WAGON.Y0 + 0.12; R.t = 1; R.v = 0;
  Heist.phase = 'ride'; Snd.door(); Wanted.crime('Grand theft auto', 3); writeSave();
  UI.banner('GRAND THEFT ' + P.short.toUpperCase(), 'Throttle to drive it out of the back of the wagon');
};
Heist.win = function () {
  const P = Heist.P(), prev = (save.heist && save.heist.prev) || 'rook'; save.owned[P.id] = true; save.money += P.reward; save.heist = { done: 1, prev }; GAR.dirty = true; Home.refresh(); writeSave();
  Heist.clearLeft(); Heist.stop(); Target.on = false; Snd.win(); Cam.shake = 0.6;
  UI.banner('THE ' + P.short.toUpperCase() + ' IS YOURS', money(P.reward) + ' · the ' + P.name + ' is in your garage'); UI.toast(P.title.charAt(0) + P.title.slice(1).toLowerCase() + ' complete · +' + money(P.reward), 'good');
};
Heist.fail = function (why) {
  const prev = (save.heist && save.heist.prev) || 'rook'; Heist.clearLeft(); Heist.stop(); Target.on = false; save.heist = { prev: null };
  if (save.car === Heist.P().id) { applyCar(save.owned[prev] ? prev : 'rook', true); if (car.wrecked <= 0) { const slot = save.gar.slots[save.car]; if (slot != null) { const p = Home.bayWorld(slot, CUR); spawnAt(p.x, p.z, p.yaw); } } }
  writeSave(); Heist.placeGold(Heist.k); UI.toast(why + ' · the ' + Heist.P().short + ' is back on its train · try again', 'bad');
};
Heist.clearLeft = function () { if (Heist.left && Heist.wagon()) { Heist.wagon().m.remove(Heist.left); disposeCar(Heist.left); } Heist.left = null; };
/* loading a save that stopped in the middle of the escape: back to your own car */
Heist.setup = function () {
  Heist.plan(); if (!Heist.site) return; Heist.build();
  const d = CAR_BY_ID[save.car]; if (d && d.prize != null && !save.owned[save.car]) { const prev = (save.heist && save.heist.prev) || 'rook'; save.car = save.owned[prev] ? prev : 'rook'; save.heist = { prev: null }; }
};
/* the HUD line while it runs */
Heist.prompt = function (pr) {
  const ph = Heist.phase; if (ph === 'idle') return false; const P = Heist.P(); let h;
  if (ph === 'armed') { const d = Heist.eta, y = Heist.you, good = Math.abs(y - d) < 0.3 && d < 8; h = '<em>' + P.title + '</em> door in ' + (d > 0 ? d.toFixed(1) + ' s' : 'now') + ' · you ' + (y < 60 ? y.toFixed(1) + ' s' : '—') + (good ? ' · <b style="color:#4f6">GO!</b>' : '') + (Heist.msgT > 0 ? ' · missed, again' : ''); }
  else if (ph === 'aboard') h = TouchIn.on ? '<em>CAR</em> take the ' + P.name : '<em>F</em> Get out and take the ' + P.name;
  else if (ph === 'ride') h = '<em>THROTTLE</em> drive the ' + P.short + ' out of the back of the wagon';
  else h = '<em>' + P.title + '</em> get the ' + P.short + ' into your garage · ' + Math.round(Math.hypot(GAR.ox - Pl.x, GAR.oz - Pl.z)) + ' m';
  if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false; return true;
};
/* the map: the railway, and the gold marker */
Heist.drawMini = function (g) {
  if (Rail.pts) { const P = Rail.pts, p = new Path2D(); p.moveTo(P.x[0], P.z[0]); for (let i = 8; i < P.n; i += 8) p.lineTo(P.x[i], P.z[i]); p.closePath(); g.strokeStyle = 'rgba(40,30,24,0.9)'; g.lineWidth = 9; g.stroke(p); g.setLineDash([14, 10]); g.strokeStyle = '#d8c8a8'; g.lineWidth = 4; g.stroke(p); g.setLineDash([]); }
  Heist.sites.forEach((S, k) => { const P = HEIST_PRIZES[k]; if (save.owned[P.id]) return; g.fillStyle = P.css; g.beginPath(); g.arc(S.sx, S.sz, 26, 0, TAU); g.fill(); });
};
Heist.drawFull = function (g, k) {
  if (Rail.pts) { const P = Rail.pts; g.save(); g.beginPath(); for (let i = 0; i <= P.n; i += 8) { const s = FM.toScreen(P.x[i % P.n], P.z[i % P.n]); if (i) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); } g.closePath(); g.strokeStyle = 'rgba(30,22,18,0.85)'; g.lineWidth = 4 * k; g.stroke(); g.setLineDash([6 * k, 5 * k]); g.strokeStyle = '#e0d2b4'; g.lineWidth = 2 * k; g.stroke(); g.setLineDash([]); g.restore(); }
  Heist.sites.forEach((S, q) => { const P = HEIST_PRIZES[q]; if (save.owned[P.id]) return; const s = FM.toScreen(S.sx, S.sz), r = 7 * k;
    g.save(); g.fillStyle = P.css; g.strokeStyle = '#06090e'; g.lineWidth = 2.5 * k; g.beginPath(); g.arc(s[0], s[1], r, 0, TAU); g.fill(); g.stroke();
    g.font = '700 ' + Math.round(13 * k) + 'px Rajdhani, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3.5 * k; g.strokeText(P.title, s[0], s[1] - 16 * k); g.fillStyle = P.css; g.fillText(P.title, s[0], s[1] - 16 * k); g.restore(); });
};
