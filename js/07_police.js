/* ================= POLICE + WANTED LEVEL =================
   Crimes (punching someone who then phones it in, hitting an officer, running someone over fast, ramming a patrol car) put you on the
   wanted list. Nobody arrests you on the spot any more:
     - patrol cars drive the street grid to you (turning at junctions towards you, cutting straight across when close), ram you from 2 stars up,
       and when you stop (or are on foot) the officers get out and run you down;
     - an arrest only happens when the BUST meter fills: an officer next to you (or you boxed in by two cars) while you are not moving;
     - the longer you stay in their sight the more stars you get; the more stars the more, faster and pushier units: roadblocks from 3,
       a helicopter from 4, black SWAT SUVs at 5;
     - break line of sight and stay out of sight long enough (longer at higher levels), or hide in your own garage, and they lose you.
   Everything runs inside step() while playing. Public hooks: Wanted.crime / Wanted.set / Wanted.clear, Police.dispatch (an accuser's phone call),
   Police.arrest, Police.pedCop (an officer on foot), Police.copHit / Police.copRunOver. */
const WANT = {
  cars: [0, 1, 2, 3, 4, 5],                    /* chasing patrol cars */
  top: [0, 31, 39, 47, 55, 63],                /* patrol car top speed, m/s */
  acc: [0, 9, 11, 13, 15, 17],
  ram: [0, 2, 6, 8, 10, 12],                   /* how much faster than you they try to be when they come alongside */
  run: [0, 5.3, 5.7, 6.1, 6.5, 6.9],           /* officer on foot, m/s */
  esc: [0, 40, 44, 48, 52, 0],                 /* seconds in sight before the next star */
  cool: [0, 15, 21, 27, 34, 42],               /* seconds out of sight before they lose you */
  fine: [0, 300, 500, 800, 1200, 1800],
  cops: [0, 1, 1, 2, 2, 2],                    /* officers per car that gets out */
  gap: [0, 0, 6, 4.5, 3.2, 2.4]                /* seconds between reinforcements */
};
const WSAY = ['', 'Patrol cars are responding', 'More units · they will ram you', 'Roadblocks ahead', 'Helicopter overhead', 'SWAT · every unit in town'];
const Wanted = { stars: 0, esc: 0, cool: 0, seen: false, engaged: false, age: 0, bust: 0, why: '', blockT: 0, hideT: 0, ramT: 0, log: [], peak: 0, victimName: '' };
const Police = { on: false, phase: 'off', t: 0, hold: false, victim: null, units: [], heli: null, pool: [], fine: 0, reason: '', fl: 0, spawnT: 0, ram: false, done: false, checkT: 0, hudT: 0 };
const _plq = {}, _plr = {}, _pls = {}, _plp = {};

/* ---------- wanted level ---------- */
Wanted.announce = function (was) {
  const n = Wanted.stars; if (n === was) return; Wanted.peak = Math.max(Wanted.peak, n);
  UI.banner(n > was ? (was ? 'WANTED ' + n + ' · ' : 'WANTED · ') + WSAY[n] : 'WANTED LEVEL ' + n, '★'.repeat(n));
  if (n > was) Snd.beep(520 + n * 90, 0.16);
};
/* a crime: raises you to at least n stars (already that wanted? the heat builds faster instead) */
Wanted.crime = function (why, n, victim) {
  if (App.mode !== 'play' || Police.hold || Police.phase === 'busted') return false;
  if (victim && !Police.victim) Police.victim = victim; if (victim && victim.pers) Wanted.victimName = _fn(victim.pers);
  if (Wanted.log.indexOf(why) < 0) Wanted.log.push(why);
  const was = Wanted.stars; Wanted.why = why; Wanted.cool = 0;
  if (n > Wanted.stars) { Wanted.stars = Math.min(5, n); Wanted.esc = 0; } else if (Wanted.stars < 5) Wanted.esc += 10;
  if (!was) { Police.spawnT = 0; Wanted.blockT = 14; Wanted.bust = 0; Wanted.engaged = false; Wanted.age = 0; }
  Police.on = true; Wanted.announce(was); return true;
};
Wanted.set = function (n) {
  n = clamp(n | 0, 0, 5); if (n === 0) { Wanted.clear('Wanted level cleared'); return; }
  const was = Wanted.stars; Wanted.stars = n; Wanted.esc = 0; Wanted.cool = 0; Wanted.why = Wanted.why || 'Wanted'; Police.on = true;
  if (!was) { Police.spawnT = 0; Wanted.blockT = 8; Wanted.engaged = false; Wanted.age = 0; } Wanted.announce(was);
};
Wanted.raise = function () {
  if (Wanted.stars >= 5) return; const was = Wanted.stars; Wanted.stars++; Wanted.esc = 0; Wanted.cool = 0; Wanted.announce(was); Police.spawnT = Math.min(Police.spawnT, 0.8);
};
Wanted.clear = function (msg) {
  const was = Wanted.stars; Wanted.log.length = 0; Wanted.peak = 0; Wanted.victimName = ''; Wanted.stars = 0; Wanted.esc = 0; Wanted.cool = 0; Wanted.seen = false; Wanted.bust = 0; Wanted.hideT = 0; Wanted.engaged = false;
  Police.standDown(); if (was && msg) { UI.toast(msg, 'good'); UI.banner('ESCAPED', msg); }
};
Wanted.update = function (dt) {
  Wanted.ramT -= dt; const S = Wanted.stars; if (S <= 0) return;
  /* your own garage is a hideout */
  if (GAR.inside && !Foot.on && Math.abs(car.speed) < 6) { Wanted.hideT += dt; if (Wanted.hideT > 3) { Wanted.clear('Lost them · hiding in your garage'); return; } } else Wanted.hideT = 0;
  let seen = false;
  for (const u of Police.units) if (u.see) { seen = true; break; }
  if (!seen && Police.heli && Police.heli.see) seen = true;
  if (!seen) for (const u of Police.units) { for (const p of u.cops) if (Math.hypot(p.x - Pl.x, p.z - Pl.z) < 45) { seen = true; break; } if (seen) break; }
  Wanted.seen = seen; Wanted.age += dt; if (seen) Wanted.engaged = true;
  if (seen) {
    Wanted.cool = Math.max(0, Wanted.cool - dt * 2.5);
    if (S < 5) { Wanted.esc += dt * Biome.atm.heat; if (Wanted.esc >= WANT.esc[S]) Wanted.raise(); }
  } else if (Wanted.engaged || Wanted.age > 70) {
    Wanted.cool += dt; Wanted.esc = Math.max(0, Wanted.esc - dt * 0.5);
    if (Wanted.cool >= WANT.cool[S] * (1 - Rel.perk('tipoff'))) Wanted.clear('You lost the police');
  }
};

/* ---------- the vehicles ---------- */
Police.buildCar = function (kind) {
  const swat = kind === 'swat';
  const g = buildCarModel(TRAFFIC_DEFS[swat ? 2 : 0], swat ? 0x1f232a : 0xeef0f3, { lod: 1 }), S = g.userData.S, zc = (S.zFT + S.zRT) / 2, ry = S.yR + 0.015;
  const base = new GB(0, 0, false), dk = lc(0x14171c); base.box(-0.5, ry, zc - 0.17, 0.5, ry + 0.045, zc + 0.17, dk.r, dk.g, dk.b);
  /* door band so it reads as a police car (navy on white, pale on black) */
  const nv = lc(swat ? 0xd7dce4 : 0x1d2f57), hw = S.hw; for (const sx of [-1, 1]) base.box(Math.min(sx * (hw - 0.012), sx * (hw + 0.012)), S.ySill + 0.2, S.zRB + 0.55, Math.max(sx * (hw - 0.012), sx * (hw + 0.012)), S.ySill + 0.5, S.zFB - 0.3, nv.r, nv.g, nv.b);
  g.add(base.mesh(MAT.carTrim, false, false));
  const mR = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.02, 0.02) }), mB = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.02, 0.05, 0.3) });
  const box = (m, x) => { const o = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.3), m); o.position.set(x, ry + 0.095, zc); g.add(o); return o; };
  box(mR, -0.26); box(mB, 0.26);
  const spr = (c, x) => { const m = new THREE.SpriteMaterial({ map: MAT.glow, color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }), s = new THREE.Sprite(m); s.position.set(x, ry + 0.2, zc); s.scale.setScalar(3.4); g.add(s); return s; };
  g.userData.pl = { mR, mB, sR: spr(0xff2a22, -0.3), sB: spr(0x2a55ff, 0.3) }; g.userData.pk = kind;
  g.visible = false; scene.add(g); return g;
};
Police.getCar = function (kind) {
  const P = Police.pool; for (let i = 0; i < P.length; i++) if (P[i].userData.pk === kind) return P.splice(i, 1)[0];
  return Police.buildCar(kind);
};
Police.flash = function (u, on) {
  const L = u.g.userData.pl; if (!L) return; const ph = (Police.fl + u.ph) % 0.36, a = on && ph < 0.18, b = on && !a;
  L.mR.color.setRGB(a ? 3.4 : 0.3, a ? 0.06 : 0.02, a ? 0.05 : 0.02); L.mB.color.setRGB(b ? 0.1 : 0.02, b ? 0.4 : 0.05, b ? 3.6 : 0.3);
  L.sR.material.opacity = a ? 0.95 : 0; L.sB.material.opacity = b ? 0.95 : 0;
};
const _copLook = () => { const R = Math.random, r = (a) => a[(R() * a.length) | 0], fem = R() < 0.28, navy = lc(0x1c2f58); return { s: fem ? 0.97 : 1.02, hs: 1, skin: r(PSKIN), hair: r(PHAIR), shirt: lc(0x1f3a6e), pants: lc(0x141a2a), shoe: lc(0x0a0a0c), sleeve: true, bag: false, bagc: lc(0x1f3a6e), kid: false, stout: fem ? 0.98 : 1.06, fem, hst: fem ? (R() < 0.6 ? 'bun' : 'short') : (R() < 0.7 ? 'buzz' : 'short'), beard: !fem && R() < 0.15, old: false, skirt: 0, tights: false, coat: false, shorts: false, glasses: false, glassC: null, sun: false, hat: R() < 0.7 ? { k: 'cap', c: navy, bc: navy } : null }; };

Police.newUnit = function (kind, x, z, yaw, mode) {
  const g = Police.getCar(kind);
  const u = { k: kind, g, x, z, y: 0, yaw, v: 0, mode, rid: -1, road: null, s: 0, dir: 1, jx: -9999, jz: -9999, jT: 0, turn: null, hp: kind === 'swat' ? 170 : 100, cops: [], see: false, seeT: Math.random() * 0.25, stuck: 0, ph: Math.random() * 0.36, deadT: 0, leaveT: 0, kx: 0, kz: 0, age: 0, backT: 0, noDirect: 0, clr: false, clrT: 0, blk: mode === 'block', brake: false, parkT: 0, copT: 0, smokeT: 0,
    dyn: { x, z, y: 0, yaw, vx: 0, vz: 0, v: 0, kind: 'police', hit: 0, nx: 0, nz: 0, hv: 0 } };
  Dyn.extra.push(u.dyn); g.visible = true; Police.units.push(u); Police.place(u); return u;
};
Police.place = function (u) {
  placeVehicle(u.g, u.x, u.z, u.yaw, 2.6, 1.5); u.y = u.g.position.y; u.g.userData.v = u.v; u.g.userData.brake = u.brake;
  const d = u.dyn, sn = Math.sin(u.yaw), cs = Math.cos(u.yaw); d.x = u.x; d.z = u.z; d.y = u.y; d.yaw = u.yaw; d.vx = sn * u.v + u.kx; d.vz = cs * u.v + u.kz; d.v = u.v;
  if (Dyn.extra.indexOf(d) < 0) Dyn.extra.push(d);
};
Police.removeUnit = function (u) {
  for (const p of u.cops) Fight.release(p); u.cops.length = 0;
  const i = Dyn.extra.indexOf(u.dyn); if (i >= 0) Dyn.extra.splice(i, 1);
  u.g.visible = false; if (Police.pool.length < 8) Police.pool.push(u.g); else { scene.remove(u.g); disposeCar(u.g); }
  const k = Police.units.indexOf(u); if (k >= 0) Police.units.splice(k, 1);
};

/* ---------- collision helpers ---------- */
/* solid scenery (buildings, trees) near a point, ignoring water; R pads the point to a car's size */
function policeSolid(x, z, R) {
  const ccx = Math.floor(x / CHUNK), ccz = Math.floor(z / CHUNK);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const ch = Chunks.get(ccx + dx, ccz + dz); if (!ch) continue;
    for (const o of ch.cols.c) { const ex = x - o[0], ez = z - o[1], rr = o[2] + R; if (ex * ex + ez * ez < rr * rr) return true; }
    for (const o of ch.cols.b) if (x > o[0] - R && x < o[2] + R && z > o[1] - R && z < o[3] + R) return true;
  }
  return false;
}
Police.los = function (x0, z0, x1, z1) {
  const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.min(10, Math.ceil(d / 10)));
  for (let k = 1; k < n; k++) { const t = k / n; if (policeSolid(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, 0.3)) return false; }
  return true;
};
/* is the straight way from a car to a point open (car-sized) */
Police.clearWay = function (x0, z0, x1, z1) {
  const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.min(8, Math.ceil(d / 6)));
  for (let k = 1; k <= n; k++) { const t = k / n; if (policeSolid(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, 1.5)) return false; }
  return true;
};

/* ---------- road following ---------- */
Police.snap = function (u) {
  if (!findNearestRoadPoint(u.x, u.z, _plq)) return false;
  u.rid = _plq.road; u.road = roads[u.rid]; u.s = _plq.s;
  u.dir = (_plq.tx * (Pl.x - u.x) + _plq.tz * (Pl.z - u.z)) >= 0 ? 1 : -1; u.jx = u.x; u.jz = u.z; u.turn = null; return true;
};
/* arc length of the point on road r nearest to (x,z), searched around a hint */
Police.proj = function (r, x, z, hint) {
  const cum = r.cum, pts = r.pts; let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= hint) lo = m; else hi = m; }
  let best = 1e18, bs = hint;
  for (let i = Math.max(0, lo - 4); i <= Math.min(pts.length - 2, lo + 4); i++) {
    const a = pts[i], b = pts[i + 1], ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez || 1; let t = ((x - a.x) * ex + (z - a.z) * ez) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = a.x + ex * t - x, qz = a.z + ez * t - z, d2 = qx * qx + qz * qz; if (d2 < best) { best = d2; bs = cum[i] + Math.sqrt(l2) * t; }
  }
  return bs;
};
/* look down the road ahead (as far as we need to brake): is there a crossing street that heads clearly more towards the player? */
Police.plan = function (u) {
  const r = u.road, A = clamp(u.v * u.v / 26 + 12, 12, 95);
  for (let a = 6; a <= A; a += 7) {
    const sp = u.s + u.dir * a; if (sp < 3 || sp > r.len - 3) break;
    roadPoint(r, sp, _plp); const jx = _plp.x, jz = _plp.z; let hx = _plp.tx * u.dir, hz = _plp.tz * u.dir; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
    const arr = segHash.get(sk(Math.floor(jx / SEGC), Math.floor(jz / SEGC))); if (!arr) continue;
    const tp = Math.hypot(Pl.x - jx, Pl.z - jz) || 1, px = (Pl.x - jx) / tp, pz = (Pl.z - jz) / tp;
    let best = hx * px + hz * pz + 0.25, found = null;
    for (let k = 0; k < arr.length; k++) {
      const sg0 = segs[arr[k]]; if (sg0.road === u.rid) continue;
      let t = ((jx - sg0.ax) * sg0.dx + (jz - sg0.az) * sg0.dz) * sg0.il2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = sg0.ax + sg0.dx * t - jx, qz = sg0.az + sg0.dz * t - jz; if (qx * qx + qz * qz > 25) continue;
      const l = Math.sqrt(sg0.dx * sg0.dx + sg0.dz * sg0.dz) || 1, tx = sg0.dx / l, tz = sg0.dz / l;
      for (let sg = -1; sg <= 1; sg += 2) {
        if (tx * sg * hx + tz * sg * hz < -0.3) continue;              /* no instant U-turns */
        const sc = tx * sg * px + tz * sg * pz; if (sc > best) { best = sc; found = { rid: sg0.road, s: roads[sg0.road].cum[sg0.i] + l * t, dir: sg, atS: sp }; }
      }
    }
    if (found) return found;
  }
  return null;
};

/* ---------- placing units ---------- */
/* a road point 170-320 m out; "ahead" aims for the way you are driving so units come head-on */
Police.spawnPoint = function (ahead) {
  const mov = !Foot.on && Math.abs(car.speed) > 12, base = Math.atan2(car.vx, car.vz);
  for (let k = 0; k < 12; k++) {
    const a = ahead && mov && k < 8 ? base + (Math.random() - 0.5) * 0.9 : Math.random() * TAU, dist = 170 + Math.random() * 150;
    if (!findNearestRoadPoint(Pl.x + Math.sin(a) * dist, Pl.z + Math.cos(a) * dist, _pls)) continue;
    const dd = Math.hypot(_pls.x - Pl.x, _pls.z - Pl.z); if (_pls.dist > 70 || dd < 140 || dd > 430) continue;
    let ok = true; for (const o of Police.units) if (Math.hypot(o.x - _pls.x, o.z - _pls.z) < 28) { ok = false; break; } if (!ok) continue;
    return { x: _pls.x, z: _pls.z, tx: _pls.tx, tz: _pls.tz, road: _pls.road, s: _pls.s };
  }
  return null;
};
Police.spawnUnit = function (kind, ahead) {
  const P = Police.spawnPoint(ahead); if (!P) return null;
  const dir = (P.tx * (Pl.x - P.x) + P.tz * (Pl.z - P.z)) >= 0 ? 1 : -1;
  const u = Police.newUnit(kind, P.x, P.z, Math.atan2(P.tx * dir, P.tz * dir), 'drive');
  u.rid = P.road; u.road = roads[P.road]; u.s = P.s; u.dir = dir; u.v = 14; u.jx = P.x; u.jz = P.z; Police.place(u);
  return u;
};
Police.relocate = function (u) {
  const P = Police.spawnPoint(Wanted.stars >= 3); if (!P) { u.stuck = 0; return; }
  const dir = (P.tx * (Pl.x - P.x) + P.tz * (Pl.z - P.z)) >= 0 ? 1 : -1;
  for (const p of u.cops) Fight.release(p); u.cops.length = 0;
  u.x = P.x; u.z = P.z; u.yaw = Math.atan2(P.tx * dir, P.tz * dir); u.rid = P.road; u.road = roads[P.road]; u.s = P.s; u.dir = dir; u.v = 14; u.kx = u.kz = 0; u.mode = 'drive'; u.stuck = 0; u.jx = P.x; u.jz = P.z; Police.place(u);
};
/* a roadblock across the road ahead of you */
Police.placeBlock = function () {
  if (Foot.on || Math.abs(car.speed) < 14) return false;
  const sp = Math.abs(car.speed), hx = car.vx / sp, hz = car.vz / sp;
  for (const L of [270, 320, 230]) {
    if (!findNearestRoadPoint(Pl.x + hx * L, Pl.z + hz * L, _plr) || _plr.dist > 45) continue;
    const road = roads[_plr.road], rx = _plr.x, rz = _plr.z, tx = _plr.tx, tz = _plr.tz;
    if (Math.abs(tx * hx + tz * hz) < 0.55) continue;                     /* a road crossing ours: you would just pass it */
    if (Police.units.some((o) => o.blk && Math.hypot(o.x - rx, o.z - rz) < 60)) continue;
    const n = Wanted.stars >= 5 ? 4 : 3, span = road.halfW * 2 - 0.6, ax = tz, az = -tx;
    for (let i = 0; i < n; i++) {
      const lat = (i - (n - 1) / 2) * (span / n), x = rx + ax * lat, z = rz + az * lat;
      if (policeSolid(x, z, 1.2)) continue;
      const yaw = Math.atan2(ax, az) + (i % 2 ? 0.28 : -0.28) + (Math.random() < 0.5 ? 0 : Math.PI);
      const u = Police.newUnit('patrol', x, z, yaw, 'block'); u.blk = true; u.life = 70;
    }
    return true;
  }
  return false;
};

/* ---------- officers on foot ---------- */
Police.spawnCop = function (u, k) {
  let p = null, idx = -1;
  for (let i = 0; i < Peds.list.length; i++) { const q = Peds.list[i]; if (!q.keep && !q.own && !q.reg && (q.state === 'walk' || q.state === 'stand' || q.state === 'wait') && Math.hypot(q.x - Pl.x, q.z - Pl.z) > 10 && Math.hypot(q.x - u.x, q.z - u.z) > 3) { p = q; idx = i; break; } }
  if (!p) {
    if (Peds.list.length >= Peds.cap - 2) { for (let i = 0; i < Peds.list.length; i++) if (!Peds.list[i].keep) { p = Peds.list[i]; idx = i; break; } }
    else { const T = towns[0]; p = { app: _copLook(), x: 0, z: 0, y: 0, yaw: 0, v: 0, vt: 1.3, ph: 0, state: 'walk', wait: 0, tilt: 0, jx: 0, jz: 0, t: 0, vx: 0, vz: 0, vy: 0, spin: 0, phone: false, runner: false, onRoad: false, seed: Math.random() * 20, fleeT: 0, T, a: { i: 0, j: 0, sx: 1, sz: 1 }, prev: null }; Peds.list.push(p); idx = Peds.list.length - 1; }
  }
  if (!p) return null;
  Rel.release(p); p.reg = null; Fight.clear(p); p.app = _copLook(); pedLook(p, idx);
  const side = k % 2 ? 1 : -1, sn = Math.sin(u.yaw), cs = Math.cos(u.yaw);
  p.x = u.x + cs * 2.2 * side - sn * 0.5; p.z = u.z - sn * 2.2 * side - cs * 0.5; Fight.ground(p); p.T = Object.assign({}, p.T, { baseH: p.y - 0.09 });
  p.state = 'chase'; p.own = true; p.keep = true; p.cop = true; p.unit = u; p.v = 0; p.yaw = Math.atan2(Pl.x - p.x, Pl.z - p.z); p.tilt = 0; p.pers = null; p.stun = 0; p.hp = null; p.pn = 0; p.hitT = 0.8;
  return p;
};
Police.dismount = function (u) {
  const n = WANT.cops[Math.max(1, Wanted.stars)] || 1; let made = 0;
  for (let k = 0; k < n; k++) { const p = Police.spawnCop(u, k); if (p) { u.cops.push(p); made++; } }
  if (made) { u.mode = 'park'; u.parkT = 0; Snd.door(); }
  return made > 0;
};
Police.recall = function (u) { for (const p of u.cops) Fight.release(p); u.cops.length = 0; u.mode = 'drive'; u.stuck = 0; u.noDirect = 0; u.jT = 0; };

/* the officer on foot (called from updatePeds through Fight.pedUpdate) */
Police.pedCop = function (p, dt) {
  if (!p.cop || !Police.on) { Fight.release(p); return; }
  const dx = Pl.x - p.x, dz = Pl.z - p.z, d = Math.hypot(dx, dz), S = Math.max(1, Wanted.stars);
  if (Police.phase === 'busted' || p.state === 'arrest') { p.yaw += angDiff(p.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 9); p.v += (0 - p.v) * Math.min(1, dt * 8); Fight.ground(p); return; }
  if (p.stun > 0) { p.stun -= dt; p.v += (0 - p.v) * Math.min(1, dt * 8); Fight.ground(p); return; }
  p.yaw += angDiff(p.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 9);
  const vt = p.pn > 0 ? 0 : d > 1.4 ? WANT.run[S] + (d > 30 ? 0.9 : 0) : 0;
  p.v += (vt - p.v) * Math.min(1, dt * 6);
  if (p.v > 0.05) Fight.move(p, Math.sin(p.yaw) * p.v * dt, Math.cos(p.yaw) * p.v * dt); else Fight.ground(p);
  /* from 3 stars up an officer next to you on foot hits you with the baton */
  if (S >= 3 && Foot.on && Foot.state === 'walk' && d < 1.6 && p.pn <= 0) { p.hitT -= dt; if (p.hitT <= 0) { p.hitT = 1.35; p.pn = 0.001; p.hand ^= 1; p.pdone = false; Snd.whoosh(); } }
  if (p.pn > 0) {
    p.pn += dt / 0.5;
    if (!p.pdone && p.pn >= 0.4) { p.pdone = true; if (d < 1.8 && Foot.on) Fight.hitPlayer(p, dx / (d || 1), dz / (d || 1)); }
    if (p.pn >= 1) p.pn = 0;
  }
};
/* you punch an officer: two punches put them on the floor for a few seconds, and it is worth two stars at once */
Police.copHit = function (p, dx, dz) {
  Wanted.crime('Assaulting an officer', 2);
  if (p.hp == null) p.hp = 2; p.hp--; p.stun = 0.5; Fight.move(p, dx * 0.5, dz * 0.5);
  if (p.hp <= 0) Police.copDown(p, dx, dz);
};
Police.copRunOver = function (p, c) { Wanted.crime('Running over an officer', 4); Police.copDown(p, c.vx * 0.04, c.vz * 0.04); };
Police.copDown = function (p, dx, dz) {
  groundAt(p.x, p.z, _pls); p.T = Object.assign({}, p.T, { baseH: _pls.h });
  p.state = 'down'; p.t = 0; p.air = true; p.vx = dx * 2.6; p.vz = dz * 2.6; p.vy = 2.5; p.spin = (Math.random() < 0.5 ? -1 : 1) * 5; p.tilt = 0; p.crossing = false; p.onRoad = false;
  p.own = false; p.phone = false; p.pn = 0; p.hp = null; p.report = true; p.keep = true; Snd.crash(6); Cam.shake = Math.max(Cam.shake, 0.8);
};

/* ---------- a patrol car, one step ---------- */
Police.driveUnit = function (u, dt) {
  const S = Math.max(1, Wanted.stars), g = u.g, dx = Pl.x - u.x, dz = Pl.z - u.z, d = Math.hypot(dx, dz), dy = u.dyn, mode = u.mode;
  u.age += dt; u.seeT -= dt;
  if (u.seeT <= 0) { u.seeT = 0.25; u.see = mode !== 'dead' && mode !== 'leave' && d < 85 && (d < 24 || Police.los(u.x, u.z, Pl.x, Pl.z)); }
  /* shoved by the player's car */
  if (dy.hit > 0) {
    const hv = dy.hv; dy.hit = 0; u.kx += dy.nx * Math.min(hv, 14) * 0.45; u.kz += dy.nz * Math.min(hv, 14) * 0.45; u.v *= 0.85; u.backT = 0.7;
    if (hv > 5 && mode !== 'dead') {
      u.hp -= hv * 2.2 * (u.k === 'swat' ? 0.6 : 1); if (hv > 7 && Wanted.ramT <= 0) { Wanted.ramT = 3; Wanted.crime('Ramming police', 2); }
      if (u.hp <= 0) { u.mode = 'dead'; u.deadT = 0; for (const p of u.cops) Fight.release(p); u.cops.length = 0; Wanted.crime('Wrecked a patrol car', 3); UI.toast('Patrol car out of action', 'info'); sparks(u.x, u.y + 0.8, u.z, 22, 5); }
    }
  }
  const kk = Math.exp(-3.5 * dt); u.kx *= kk; u.kz *= kk;
  if (u.mode === 'dead') {
    u.deadT += dt; u.v += (0 - u.v) * Math.min(1, dt * 1.4); Police.flash(u, false); u.brake = true;
    u.smokeT -= dt; if (u.smokeT <= 0) { u.smokeT = 0.07; emit(Part.smoke, u.x + Math.sin(u.yaw) * 1.6, u.y + 1.0, u.z + Math.cos(u.yaw) * 1.6, (Math.random() - 0.5) * 0.6, 1.5, (Math.random() - 0.5) * 0.6, 1.8, 0.8, 2.6, 0.08, 0.08, 0.08, 0.5, -0.3); }
    u.x += (Math.sin(u.yaw) * u.v + u.kx) * dt; u.z += (Math.cos(u.yaw) * u.v + u.kz) * dt; Police.place(u); return;
  }
  Police.flash(u, true);
  if (u.mode === 'block') { u.x += u.kx * dt; u.z += u.kz * dt; Police.place(u); return; }
  if (u.mode === 'park') {
    u.parkT += dt; u.copT -= dt;
    if (u.copT <= 0) { u.copT = 0.5; u.cops = u.cops.filter((p) => p.cop && p.unit === u && Peds.list.indexOf(p) >= 0); }
    const pv = Foot.on ? 0 : Math.abs(car.speed); let far = 1e9; for (const p of u.cops) far = Math.min(far, Math.hypot(p.x - Pl.x, p.z - Pl.z));
    if (!u.cops.length || (pv > 8 && far > 40) || far > 90) Police.recall(u);
    u.v += (0 - u.v) * Math.min(1, dt * 5); u.brake = u.v > 0.5; u.x += (Math.sin(u.yaw) * u.v + u.kx) * dt; u.z += (Math.cos(u.yaw) * u.v + u.kz) * dt; Police.place(u); return;
  }
  /* ---- driving (chasing or leaving) ---- */
  const leaving = u.mode === 'leave', pc = !Foot.on, pv = pc ? Math.abs(car.speed) : 0, top = leaving ? 16 : WANT.top[S];
  let ax, az, vt = top, direct = false;
  u.backT -= dt; u.noDirect -= dt; u.clrT -= dt;
  if (!leaving && d < 40 && u.noDirect <= 0) { if (u.clrT <= 0) { u.clrT = 0.2; u.clr = Police.clearWay(u.x, u.z, Pl.x, Pl.z); } direct = u.clr; }
  if (direct) {
    const lead = pc ? clamp(d / Math.max(u.v, 8), 0, 0.9) : 0;
    ax = Pl.x + (pc ? car.vx * lead : 0); az = Pl.z + (pc ? car.vz * lead : 0);
    if (!pc || pv < 3) vt = Math.min(top, Math.sqrt(2 * 11 * Math.max(0, d - 7)));                         /* they are stopped: pull up beside them */
    else vt = Math.min(top, u.backT > 0 ? Math.max(8, pv - 5) : Math.max(14, pv + WANT.ram[S]));
    if (d < 26 && u.v < 9 && (!pc || pv < 3)) { if (Police.dismount(u)) return; }
  } else {
    if (!u.road && !Police.snap(u)) { u.stuck += dt; }
    if (u.road) {
      const r = u.road; u.s = Police.proj(r, u.x, u.z, u.s);
      if ((u.dir > 0 && u.s > r.len - 5) || (u.dir < 0 && u.s < 5)) { u.dir = -u.dir; u.jx = u.x; u.jz = u.z; u.turn = null; }
      if (!leaving) {
        u.jT -= dt; if (u.jT <= 0) { u.jT = 0.2; u.turn = Police.plan(u); }
        if (u.turn) { const rem = (u.turn.atS - u.s) * u.dir; if (rem <= 3) { u.rid = u.turn.rid; u.road = roads[u.rid]; u.s = u.turn.s; u.dir = u.turn.dir; u.turn = null; u.jT = 0.5; } else vt = Math.min(vt, Math.sqrt(144 + 26 * rem)); }
      }
      const endRem = u.dir > 0 ? r.len - u.s : u.s; if (endRem < 90) vt = Math.min(vt, Math.sqrt(64 + 26 * Math.max(0, endRem - 6)));
      if (r.kind === 'st') vt = Math.min(vt, 24 + 5 * S);
      const L = 9 + u.v * 0.55; roadPoint(u.road, u.s + u.dir * L, _plp); ax = _plp.x; az = _plp.z;
      /* off the road (knocked aside, cut a corner)? head back for it */
      if (Math.hypot(ax - u.x, az - u.z) > L * 2.4) Police.snap(u);
    } else { ax = Pl.x; az = Pl.z; }
  }
  /* steering and speed */
  const want = Math.atan2(ax - u.x, az - u.z), err = angDiff(u.yaw, want);
  u.yaw += clamp(err * 3.4, -1, 1) * (3.1 / (1 + u.v * 0.07)) * dt;
  vt *= clamp(1.2 - Math.abs(err) * 0.62, 0.26, 1);
  /* keep out of the car in front */
  for (const o of Police.units) { if (o === u || o.mode === 'dead') continue; const ox = o.x - u.x, oz = o.z - u.z, al = ox * Math.sin(u.yaw) + oz * Math.cos(u.yaw), lt = Math.abs(ox * Math.cos(u.yaw) - oz * Math.sin(u.yaw)); if (al > 0 && al < 9 + u.v * 0.5 && lt < 2.6) vt = Math.min(vt, Math.max(0, o.v * 0.9 - (9 - al) * 0.4)); }
  const pvv = u.v; u.v += clamp(vt - u.v, -17 * dt, WANT.acc[S] * dt); u.brake = u.v < pvv - 0.03;
  /* scenery in the way: bump, lose speed, take the road instead */
  const stepD = Math.max(0.5, u.v * dt) + 2.4, nx = u.x + Math.sin(u.yaw) * stepD, nz = u.z + Math.cos(u.yaw) * stepD;
  if (u.v > 2 && footBlockedAt(nx, nz)) { u.v *= 0.35; u.noDirect = 1.5; u.stuck += dt * 3; if (!leaving) Police.snap(u); }
  else { u.x += (Math.sin(u.yaw) * u.v + u.kx) * dt; u.z += (Math.cos(u.yaw) * u.v + u.kz) * dt; }
  if (u.v < 2.5 && d > 30 && !leaving) u.stuck += dt; else u.stuck = Math.max(0, u.stuck - dt * 2);
  if (u.stuck > 4 || (d > 440 && !leaving && S >= 3)) Police.relocate(u);
  Police.place(u);
  if (leaving) { u.leaveT += dt; if (u.leaveT > 9 || d > 300) Police.removeUnit(u); }
};

/* ---------- the helicopter (4 stars and up) ---------- */
const _plv1 = new THREE.Vector3(), _plv2 = new THREE.Vector3(), _plv3 = new THREE.Vector3(), _plQ = new THREE.Quaternion(), _pldn = new THREE.Vector3(0, -1, 0);
Police.buildHeli = function () {
  const col = (hex) => { const c = lc(hex); return [c.r, c.g, c.b]; }, N = col(0x1d2f57), W = col(0xeef0f3), D = col(0x14171c), GL = col(0x0c1a2a);
  const mP = Env.reg(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.2, envMapIntensity: 0.6 }));
  const bx = (G, c, x0, y0, z0, x1, y1, z1) => G.box(x0, y0, z0, x1, y1, z1, c[0], c[1], c[2]);
  const gP = new GB(0, 0, false), gT = new GB(0, 0, false), gG = new GB(0, 0, false);
  bx(gP, W, -0.8, 0.0, -1.7, 0.8, 1.45, 1.5); bx(gP, N, -0.82, 0.0, -1.7, 0.82, 0.38, 1.5); bx(gP, W, -0.62, 0.15, 1.5, 0.62, 1.15, 2.3);
  bx(gG, GL, -0.64, 0.5, 1.45, 0.64, 1.3, 2.33); bx(gG, GL, -0.84, 0.62, 0.1, 0.84, 1.3, 1.3);
  bx(gP, W, -0.22, 0.75, -4.7, 0.22, 1.1, -1.6); bx(gP, N, -0.09, 1.1, -4.8, 0.09, 2.0, -4.1);
  bx(gT, D, -0.4, 1.45, -0.6, 0.4, 1.72, 0.6); bx(gT, D, -0.06, 1.72, -0.06, 0.06, 2.05, 0.06);
  for (const sx of [-1, 1]) { bx(gT, D, sx * 0.95 - 0.05, -0.4, -1.4, sx * 0.95 + 0.05, -0.3, 1.6); bx(gT, D, sx * 0.7, -0.3, -0.85, sx * 0.9, 0.15, -0.75); bx(gT, D, sx * 0.7, -0.3, 0.75, sx * 0.9, 0.15, 0.85); }
  const g = new THREE.Group(); g.add(gP.mesh(mP, true, true), gT.mesh(MAT.carTrim, true, true), gG.mesh(MAT.carGlass, false, false));
  const rotor = new THREE.Group(), tail = new THREE.Group(), bl = new GB(0, 0, false), tb = new GB(0, 0, false);
  rotor.position.set(0, 2.05, 0); bx(bl, D, -4.6, 0, -0.14, 4.6, 0.04, 0.14); bx(bl, D, -0.14, 0.001, -4.6, 0.14, 0.041, 4.6); rotor.add(bl.mesh(MAT.carTrim, false, false));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.6, 28), new THREE.MeshBasicMaterial({ color: 0x9aa4b0, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; rotor.add(disc);
  tail.position.set(0.16, 1.5, -4.7); bx(tb, D, -0.03, -0.55, -0.06, 0.03, 0.55, 0.06); bx(tb, D, -0.03, -0.06, -0.55, 0.03, 0.06, 0.55); tail.add(tb.mesh(MAT.carTrim, false, false));
  g.add(rotor, tail);
  const spr = (c, x, y, z, s) => { const m = new THREE.SpriteMaterial({ map: MAT.glow, color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }), o = new THREE.Sprite(m); o.position.set(x, y, z); o.scale.setScalar(s); g.add(o); return o; };
  const sR = spr(0xff2a22, -0.5, 1.45, -3.9, 2.6), sB = spr(0x2a55ff, 0.5, 1.45, -3.9, 2.6), sN = spr(0xffffff, 0, 0.1, 2.0, 2.4);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 22, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  cone.frustumCulled = false;
  const spot = new THREE.Sprite(new THREE.SpriteMaterial({ map: MAT.glow, color: 0xdff0ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.4 })); spot.scale.setScalar(15);
  g.visible = cone.visible = spot.visible = false; scene.add(g, cone, spot);
  return { g, rotor, tail, cone, spot, sR, sB, sN, x: 0, y: 0, z: 0, vx: 0, vz: 0, yaw: 0, ang: 0, see: false, leaving: false, t: 0 };
};
Police.heliUpdate = function (dt) {
  const S = Wanted.stars; let H = Police.heli;
  if (!H && S >= 4 && Police.phase !== 'busted') {
    H = Police.heli = Police.heliObj || (Police.heliObj = Police.buildHeli()); const a = Math.random() * TAU;
    H.x = Pl.x + Math.sin(a) * 380; H.z = Pl.z + Math.cos(a) * 380; H.y = Math.max(terrainHeight(H.x, H.z), Pl.y) + 60; H.vx = H.vz = 0; H.yaw = a + Math.PI; H.ang = a; H.leaving = false; H.t = 0; H.see = false;
    H.g.visible = H.cone.visible = H.spot.visible = true;
  }
  if (!H) return;
  H.t += dt; if (S < 4) H.leaving = true;
  const dxp = Pl.x - H.x, dzp = Pl.z - H.z, dh = Math.hypot(dxp, dzp); let tx, tz, ty;
  if (H.leaving) { tx = H.x + Math.sin(H.yaw) * 300; tz = H.z + Math.cos(H.yaw) * 300; ty = H.y + 30; }
  else { H.ang += dt * 0.45; const lead = Foot.on ? 0 : 1.1; tx = Pl.x + Math.sin(H.ang) * 24 + (Foot.on ? 0 : car.vx * lead); tz = Pl.z + Math.cos(H.ang) * 24 + (Foot.on ? 0 : car.vz * lead); ty = Math.max(terrainHeight(Pl.x, Pl.z), Pl.y) + 46; }
  let wx = (tx - H.x) * 0.7, wz = (tz - H.z) * 0.7; const m = Math.hypot(wx, wz), sp = 46; if (m > sp) { wx *= sp / m; wz *= sp / m; }
  const k = Math.min(1, dt * 1.5); H.vx += (wx - H.vx) * k; H.vz += (wz - H.vz) * k; H.x += H.vx * dt; H.z += H.vz * dt;
  H.y += clamp((Math.max(terrainHeight(H.x, H.z) + 40, ty) - H.y) * 1.2, -12, 12) * dt;
  const want = H.leaving ? Math.atan2(H.vx, H.vz) : Math.atan2(dxp, dzp); H.yaw += angDiff(H.yaw, want) * Math.min(1, dt * 2.2);
  const fw = H.vx * Math.sin(H.yaw) + H.vz * Math.cos(H.yaw), sd = H.vx * Math.cos(H.yaw) - H.vz * Math.sin(H.yaw), g = H.g;
  g.position.set(H.x, H.y, H.z); g.rotation.set(clamp(fw / 46, -1, 1) * 0.2, H.yaw, -clamp(sd / 46, -1, 1) * 0.25, 'YXZ');
  H.rotor.rotation.y += dt * 30; H.tail.rotation.x += dt * 44;
  const a = (Police.fl % 0.5) < 0.25; H.sR.material.opacity = a ? 0.9 : 0; H.sB.material.opacity = a ? 0 : 0.9; H.sN.material.opacity = H.leaving ? 0 : 0.35;
  H.see = !H.leaving && dh < 150;
  /* search-light: a faint cone down to a pool of light on you */
  if (!H.leaving) {
    _plv1.set(H.x + Math.sin(H.yaw) * 1.2, H.y - 0.1, H.z + Math.cos(H.yaw) * 1.2); _plv2.set(Pl.x, Pl.y + 0.3, Pl.z); _plv3.subVectors(_plv2, _plv1); const len = _plv3.length() || 1; _plv3.multiplyScalar(1 / len);
    _plQ.setFromUnitVectors(_pldn, _plv3); H.cone.quaternion.copy(_plQ); H.cone.position.copy(_plv1).addScaledVector(_plv3, len / 2); H.cone.scale.set(4.5, len, 4.5);
    H.cone.material.opacity = 0.05 + 0.13 * env.lampOn; H.spot.position.set(Pl.x, Pl.y + 1.2, Pl.z); H.spot.material.opacity = 0.12 + 0.5 * env.lampOn; H.cone.visible = H.spot.visible = true;
  } else { H.cone.visible = H.spot.visible = false; if (H.t > 14 || dh > 700) { g.visible = false; Police.heli = null; } }
};

/* ---------- managing the force ---------- */
Police.manage = function (dt) {
  const S = Wanted.stars; let alive = 0, swat = 0, farU = null, farD = -1;
  for (const u of Police.units) if (!u.blk && u.mode !== 'dead' && u.mode !== 'leave') { alive++; if (u.k === 'swat') swat++; const d = Math.hypot(u.x - Pl.x, u.z - Pl.z); if (d > farD) { farD = d; farU = u; } }
  Police.spawnT -= dt;
  if (S > 0 && alive < WANT.cars[S] && Police.spawnT <= 0) {
    if (Police.spawnUnit(S >= 5 && swat < 2 ? 'swat' : 'patrol', alive > 0 && S >= 3)) Police.spawnT = alive === 0 ? 2.5 : WANT.gap[S]; else Police.spawnT = 1.5;
  } else if (alive > WANT.cars[S] && farU) { for (const p of farU.cops) Fight.release(p); farU.cops.length = 0; farU.mode = 'leave'; farU.leaveT = 0; if (!farU.road) Police.snap(farU); }
  if (S >= 3) { Wanted.blockT -= dt; if (Wanted.blockT <= 0) Wanted.blockT = Police.placeBlock() ? 42 - S * 3 : 3; }
  for (let i = Police.units.length - 1; i >= 0; i--) {
    const u = Police.units[i], d = Math.hypot(u.x - Pl.x, u.z - Pl.z);
    if (u.blk) { u.life -= dt; if (u.life <= 0 || (d > 110 && (Foot.on || car.vx * (u.x - Pl.x) + car.vz * (u.z - Pl.z) < 0))) Police.removeUnit(u); }
    else if (u.mode === 'dead' && u.deadT > 16) Police.removeUnit(u);
  }
};
Police.separate = function () {
  const L = Police.units;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j]; if (a.blk && b.blk) continue; const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz; if (d2 > 14 || d2 < 1e-4) continue;
    const d = Math.sqrt(d2), k = (3.75 - d) * 0.5 / d; if (!a.blk) { a.x -= dx * k; a.z -= dz * k; } if (!b.blk) { b.x += dx * k; b.z += dz * k; }
  }
};
/* the person who phoned it in calms down once a patrol car turns up */
Police.victimCheck = function () {
  const v = Police.victim; if (!v) return; if (v.state !== 'accuse') { Police.victim = null; return; }
  for (const u of Police.units) if (!u.blk && Math.hypot(u.x - v.x, u.z - v.z) < 45) { Fight.calm(v); Police.victim = null; return; }
};
/* the bust meter: an officer next to you while you are not getting away, or two cars boxing you in */
/* is this officer standing right next to the player's car (within a metre or so of its body) */
Police.byCar = function (p) {
  const dx = p.x - car.x, dz = p.z - car.z, sn = Math.sin(car.yaw), cs = Math.cos(car.yaw), lz = dx * sn + dz * cs, lx = dx * cs - dz * sn; return Math.abs(lx) < 2.3 && Math.abs(lz) < 3.7;
};
Police.bustUpdate = function (dt) {
  const S = Wanted.stars; if (S <= 0) { Wanted.bust = Math.max(0, Wanted.bust - dt); return; }
  const pc = !Foot.on, pv = pc ? Math.abs(car.speed) : 0; let near = 0;
  if (!pc || pv < 4.5) {
    for (const u of Police.units) for (const p of u.cops) if (p.state === 'chase' && (pc ? Police.byCar(p) : Math.hypot(p.x - Pl.x, p.z - Pl.z) < 2.1)) near++;
    if (pc && pv < 3) { let box = 0; for (const u of Police.units) if (!u.blk && u.mode !== 'dead' && Math.hypot(u.x - Pl.x, u.z - Pl.z) < 6.5) box++; if (box >= 2) near++; }
  }
  Wanted.bust = clamp(Wanted.bust + (near > 0 ? 0.32 + 0.16 * Math.min(near, 3) : -0.55) * dt, 0, 1);
  if (Wanted.bust >= 1) Police.arrest(Wanted.why || 'Wanted', WANT.fine[S] || 300);
};
Police.audio = function () {
  let dm = 1e9; for (const u of Police.units) if (u.mode !== 'dead') dm = Math.min(dm, Math.hypot(u.x - Pl.x, u.z - Pl.z));
  if (dm < 1e8) Snd.siren(Math.pow(clamp(1 - dm / 330, 0, 1), 1.4) * (Wanted.stars >= 3 ? 0.9 : 0.62));
  const H = Police.heli; if (H) Snd.heli(clamp(1 - Math.hypot(H.x - Pl.x, H.y - Pl.y, H.z - Pl.z) / 480, 0, 1));
};

/* ---------- the HUD under the minimap ---------- */
Police.hud = function (dt) {
  Police.hudT -= dt; if (Police.hudT > 0) return; Police.hudT = 0.1;
  const w = E.wanted; if (!w) return;
  const S = Wanted.stars, busted = Police.phase === 'busted', show = (S > 0 || busted) && App.mode === 'play';
  if (w.hidden === show) w.hidden = !show; if (!show) return;
  const bst = busted || Wanted.bust > 0.02, key = S + (Wanted.seen ? 'h' : 's') + (bst ? 'b' : '');
  if (w._k !== key) { w._k = key; E.wst.innerHTML = '★'.repeat(S) + '<s>' + '★'.repeat(5 - S) + '</s>'; w.className = (bst ? 'bust ' : '') + (Wanted.seen ? 'hot' : 'srch'); }
  let lab, frac, kind;
  if (busted) { lab = 'BUSTED'; frac = 1; kind = 'bust'; }
  else if (Wanted.bust > 0.02) { lab = 'BUSTING YOU · MOVE!'; frac = Wanted.bust; kind = 'bust'; }
  else if (Wanted.seen) { lab = S < 5 ? 'EVADE · next ★ in ' + Math.max(0, Math.ceil(WANT.esc[S] - Wanted.esc)) + ' s' : 'EVADE · maximum heat'; frac = S < 5 ? Wanted.esc / WANT.esc[S] : 1; kind = 'heat'; }
  else if (!Wanted.engaged && Wanted.age <= 70) { lab = 'POLICE ON THE WAY'; frac = 0; kind = 'heat'; }
  else { lab = 'SEARCHING · clear in ' + Math.max(0, Math.ceil(WANT.cool[S] * (1 - Rel.perk('tipoff')) - Wanted.cool)) + ' s'; frac = Wanted.cool / WANT.cool[S] * (1 - Rel.perk('tipoff')); kind = 'cool'; }
  if (E.wlab._v !== lab) { E.wlab._v = lab; E.wlab.textContent = lab; }
  const b = E.wbar; b.style.setProperty('--w', (clamp(frac, 0, 1) * 100).toFixed(0) + '%'); if (b._k !== kind) { b._k = kind; b.className = kind; }
};

/* ---------- per step ---------- */
Police.update = function (dt) {
  Police.fl += dt;
  if (Police.phase === 'busted') {
    Police.on = true; Police.t += dt;
    if (Bust.on) { Bust.update(dt); return; }
    for (const u of Police.units) { u.v *= Math.max(0, 1 - dt * 3); Police.flash(u, true); Police.place(u); }
    if (Police.t > 2.7 && Police.hold === true && !Police.done) { Police.done = true; Police.release(); }
    if (Police.t > 3.5) { UI.fade(false); Police.hold = false; Police.phase = 'off'; Police.on = false; Police.hud(1); }
    return;
  }
  if (Wanted.stars <= 0 && !Police.units.length && !Police.heli) { if (Police.hold) Police.hold = false; Police.on = false; Police.phase = 'off'; Police.hud(dt); return; }
  Police.on = true; Police.t += dt;
  Wanted.update(dt);
  Police.manage(dt);
  for (let i = Police.units.length - 1; i >= 0; i--) Police.driveUnit(Police.units[i], dt);
  Police.separate(); Police.heliUpdate(dt); Police.victimCheck(); Police.bustUpdate(dt); Police.audio();
  let near = 1e9; for (const u of Police.units) if (!u.blk) near = Math.min(near, Math.hypot(u.x - Pl.x, u.z - Pl.z));
  if (Police.phase !== 'busted') Police.phase = Wanted.stars <= 0 ? 'leave' : near > 70 ? 'enroute' : 'chase';
  Police.hud(dt);
};
Police.standDown = function () {
  for (const u of Police.units.slice()) {
    for (const p of u.cops) Fight.release(p); u.cops.length = 0;
    if (u.blk) { u.life = Math.min(u.life, 6); continue; }
    if (u.mode === 'dead') continue;
    u.mode = 'leave'; u.leaveT = 0; u.jT = 0; if (Police.snap(u)) u.dir = -u.dir;
  }
  if (Police.heli) Police.heli.leaving = true;
  if (Police.victim && Police.victim.state === 'accuse') Fight.calm(Police.victim); Police.victim = null;
};
Police.clearAll = function () {
  for (const u of Police.units.slice()) Police.removeUnit(u);
  const H = Police.heli; if (H) { H.g.visible = H.cone.visible = H.spot.visible = false; Police.heli = null; }
  if (Police.victim && Police.victim.state === 'accuse') Fight.calm(Police.victim); Police.victim = null;
};
Police.reset = function () {
  Police.clearAll(); Wanted.stars = 0; Wanted.esc = Wanted.cool = Wanted.bust = 0; Wanted.seen = false; Police.phase = 'off'; Police.on = false; Police.hold = false;
};
/* an accuser's phone call (Fight.pedAccuse) */
Police.dispatch = function (victim) {
  const ok = Wanted.crime('Assault', 1, victim); if (ok && victim) UI.toast(_fn(victim.pers) + ' called the police', 'bad'); return ok;
};
Police.test = function () { if (App.mode === 'play') Wanted.set(Wanted.stars > 0 ? Math.min(5, Wanted.stars + 1) : 1); };

/* ---------- busted ---------- */
Police.arrest = function (reason, fine) {
  if (Police.phase === 'busted' || App.mode !== 'play') return;
  Police.on = true; Police.phase = 'busted'; Police.t = 0; Police.hold = true; Police.done = false; Police.reason = reason;
  Police.fine = devOn('god') ? 0 : Math.min(save.money, Math.round((fine || WANT.fine[Math.max(1, Wanted.stars)] || 300) * Biome.atm.fine / 10) * 10);
  for (const u of Police.units) for (const p of u.cops) { p.state = 'arrest'; p.v = 0; }
  Fight.t = -1; for (const k in Keys) Keys[k] = false; for (const k of ['l', 'r', 'gas', 'brk', 'nit', 'hand']) TouchIn[k] = 0;
  Snd.fail();
  if (save.set.bust === 'quick') UI.fade(true, 'BUSTED', reason + (Police.fine ? ' · fine ' + money(Police.fine) : '')); else Bust.begin(reason);
};
/* screen is black: pay, clear the streets, and walk free next to your own car */
Police.release = function () {
  if (Police.fine) { save.money -= Police.fine; writeSave(); }
  Jack.lose();
  if (Foot.on) Foot.toCar();
  Police.clearAll(); Wanted.stars = 0; Wanted.esc = Wanted.cool = Wanted.bust = 0; Wanted.seen = false; Wanted.log.length = 0; Wanted.peak = 0; Wanted.victimName = '';
  if (car.wrecked > 0) Tow.repair();
  UI.toast('Released' + (Police.fine ? ' · fined ' + money(Police.fine) : ''), 'bad');
};
