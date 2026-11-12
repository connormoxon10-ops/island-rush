/* ================= RALLY RIVALS =================
   Three rival drivers share Hollow Pines with you. Each is a full car state (newCarState) driven through the very same stepCar() physics, with the same
   Ridgeback RS numbers, the same loose-surface grip, the same driving assist and the same trunks, jumps and plank walls as the player: nobody cheats.
   The driver steers by pure pursuit along a racing line (RR.line: out wide, clip the apex, run out), and takes a corner-speed plan worked out along that line from its curvature,
   the surface grip and the camber (a banked bend is taken faster, an off-camber one slower), with a backward braking pass. The better drivers brake later and harder and use nitro on
   the straights from the same tank and refill rate as the player.
   A rival's pace is the lateral-g it is willing to corner at: Rookie 0.74-0.86 g (about 2:18-2:20), Pro 0.98-1.1 g (about 2:09-2:15), Elite 1.3-1.5 g (about 2:02-2:04).
   They line up on the grid with you, dodge a slower car in front, shove and get shoved (the circuit's car-vs-car resolver, Crash.run, is reused), smash the same
   plank walls (they take the outer lanes through a wall so its middle is left for you; the planks you break yourself are counted separately: RW sim.mine) and get put back on the road if they stick or leave it.
   Positions are ranked by distance along the stage until a car finishes, then by finish time; when you cross the line the cars still out on the stage are
   given an estimated finish time from their own speed profile, so the results table always has four times. */
const RR_TIERS = [
  { n: 'Rookie', ay: [0.74, 0.8, 0.86], brk: 6.2, nit: 0, prize: 0.7 },
  { n: 'Pro', ay: [0.98, 1.04, 1.1], brk: 7.0, nit: 0.5, prize: 1 },
  { n: 'Elite', ay: [1.3, 1.4, 1.5], brk: 8.0, nit: 1, prize: 1.5 }
];
const RR_NAMES = ['Vega Ruiz', 'Mika Tanaka', 'Dex Calloway', 'Ines Varga', 'Boone Hart', 'Sloane Okafor', 'Rafe Lindqvist', 'Nova Reyes', 'Tobias Wren'];
/* [metres behind the start line, lateral offset]: two rivals in the front row, one beside you in the second row; the player sits at RR_ME */
const RR_SLOTS = [[3, -2.1], [3, 2.1], [10, 2.1]], RR_ME = [10, -2.1];
const RR = { list: [], cars: [], on: false, go: false, base: null, profs: {}, tier: 1, hudT: 0 };
const _rrL = { i: 0, s: 0, d: 0, l: 0 }, _rrQ = {}, _rrG = { h: 0 }, _rrCar = { x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, L: 4, W: 1.9, own: false };

Rally.rivalLevel = function () { const v = save.rally.rivals; return v == null ? 2 : clamp(v | 0, 0, 3); };
Rally.gridSlot = function () { return RR.on || Rally.rivalLevel() > 0 ? RR_ME : [7, 0]; };

/* The racing line: a lateral offset for every 3 m of road. An elastic band is pulled tight between the road edges (each point moves toward the middle of its neighbours and is kept
   1.5 m inside the edge), which swings the line out before a bend, clips the inside at the apex and lets it run wide on the exit. It is held to the middle over the jumps. Along that line
   we then record the curvature, the grip of the surface and how much the road's camber helps (banked into the bend) or hurts (off-camber). */
RR.line = function () {
  const DS = 3, S0 = Math.max(0, RY.startS - 30), N = Math.ceil((RY.finishS + 90 - S0) / DS) + 1, q = {}, o = {};
  const cx = new Float32Array(N), cz = new Float32Array(N), nx = new Float32Array(N), nz = new Float32Array(N), room = new Float32Array(N), off = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const s = S0 + i * DS; RY.at(s, 0, q); cx[i] = q.x; cz[i] = q.z; nx[i] = q.tz; nz[i] = -q.tx;
    let r = Math.max(0.3, RY.hw[q.i] - 1.5);
    for (const f of RY.feats) if (f.k === 'jump') r *= 1 - sstep(f.s0 - f.up - 40, f.s0 - f.up - 10, s) * (1 - sstep(f.s0 + f.down + 10, f.s0 + f.down + 45, s));
    r *= sstep(RY.startS + 10, RY.startS + 70, s) * (1 - sstep(RY.finishS - 60, RY.finishS - 10, s));
    room[i] = r;
  }
  for (let it = 0; it < 500; it++) for (let i = 2; i < N - 2; i++) {
    /* the middle of the neighbours one and two samples away, measured across the road at this sample */
    const mx = (cx[i - 1] + nx[i - 1] * off[i - 1] + cx[i + 1] + nx[i + 1] * off[i + 1]) * 0.34 + (cx[i - 2] + nx[i - 2] * off[i - 2] + cx[i + 2] + nx[i + 2] * off[i + 2]) * 0.16;
    const mz = (cz[i - 1] + nz[i - 1] * off[i - 1] + cz[i + 1] + nz[i + 1] * off[i + 1]) * 0.34 + (cz[i - 2] + nz[i - 2] * off[i - 2] + cz[i + 2] + nz[i + 2] * off[i + 2]) * 0.16;
    const want = (mx - cx[i]) * nx[i] + (mz - cz[i]) * nz[i]; off[i] = clamp(off[i] + (want - off[i]) * 0.9, -room[i], room[i]);
  }
  const px = new Float32Array(N), pz = new Float32Array(N), k = new Float32Array(N), mu = new Float32Array(N), help = new Float32Array(N);
  for (let i = 0; i < N; i++) { px[i] = cx[i] + nx[i] * off[i]; pz[i] = cz[i] + nz[i] * off[i]; }
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - 2), m = Math.max(1, Math.min(N - 2, i)), b = Math.min(N - 1, i + 2);
    const y0 = Math.atan2(px[m] - px[a], pz[m] - pz[a]), y1 = Math.atan2(px[b] - px[m], pz[b] - pz[m]), len = Math.hypot(px[b] - px[a], pz[b] - pz[a]) || 1;
    k[i] = i < 2 || i > N - 3 ? 0 : wrapPi(y1 - y0) / (len * 0.5);                 /* + = turning left */
    RY.ground(px[i], pz[i], o); mu[i] = o.mu || 0.8;
    const cs = (RY.heightAt(px[i] + nx[i] * 0.8, pz[i] + nz[i] * 0.8) - RY.heightAt(px[i] - nx[i] * 0.8, pz[i] - nz[i] * 0.8)) / 1.6;   /* + = the left side is higher */
    help[i] = clamp(-cs * Math.sign(k[i]), -0.4, 0.4) * sstep(0.004, 0.012, Math.abs(k[i]));
  }
  RR.base = { DS, S0, N, off, k, mu, help, room };
};
RR.lineOff = function (s) { const B = RR.base, f = clamp((s - B.S0) / B.DS, 0, B.N - 1.001), i = Math.floor(f); return lerp(B.off[i], B.off[i + 1], f - i); };
/* corner-speed profile for one driver: v[i] is the speed to hold at line sample i, tog[i] the time left to the end of the stage. ay = the lateral g the driver corners at on flat
   ground (a banked bend adds to it, an off-camber one takes away), dec = how hard they brake (m/s^2) */
RR.profile = function (ay, dec) {
  dec = dec || 6.5; const key = ay.toFixed(3) + '/' + dec; if (RR.profs[key]) return RR.profs[key];
  if (!RR.base) RR.line();
  const B = RR.base, N = B.N, DS = B.DS, v = new Float32Array(N), tog = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const h = B.help[i], sn = h / Math.sqrt(1 + h * h), cs = 1 / Math.sqrt(1 + h * h), a0 = ay * Math.min(1.1, B.mu[i]), a = Math.max(0.3 * a0, a0 * (cs + a0 * sn) + sn) * G;
    v[i] = Math.min(66, Math.sqrt(a / Math.max(Math.abs(B.k[i]), 1e-4)));
  }
  for (let i = N - 2; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * dec * DS));
  for (let i = N - 2; i >= 0; i--) tog[i] = tog[i + 1] + DS / (0.93 * Math.max(8, v[i]));
  return (RR.profs[key] = { v, tog });
};
RR.at = function (b) { const B = RR.base; return clamp(Math.round((b.s - B.S0) / B.DS), 0, B.N - 1); };

RR.make = function (i, name, hex, ay, off0) {   /* (ay and the profile are set again by RR.setup for the chosen level) */
  const def = CAR_BY_ID.ridge, P = Object.assign({ awd: false, rsf: 0.5, ab: 0.5, cf: 10.2, cr: 12.2 }, def.p, { L: def.p.a + def.p.b });
  const T = { Tmax: def.t.Tmax, mu: def.t.mu, cd: def.t.cd, cl: def.t.cl || 0, brk: def.t.brk, off: def.t.off };
  const hl = def.hl, hw = def.body.W / 2, circ = [[hl - 0.45, hw + 0.09], [0, hw + 0.09], [-(hl - 0.45), hw + 0.09]];
  const b = { i, name, hex, def, P, T, circ, c: newCarState(), ay, prof: RR.profile(ay), off0, off: off0, offT: off0, dev: off0, holdT: 0, nitK: 0, hint: 0, s: 0, lat: 0, dist: 0, sec: 0, fin: false, tFin: 0, imp: 0, hx: 0, hz: 0, stuckT: 0, offRoadT: 0, resets: 0, mood: Math.random() * TAU, dustT: 0 };
  b.mesh = buildCarModel(def, hex, { lod: 1 }); b.mesh.visible = true; scene.add(b.mesh);
  return b;
};
RR.place = function (b, s, off) {
  const q = RY.at(s, off, _rrQ), c = b.c; RY.ground(q.x, q.z, _rrG);
  c.x = q.x; c.z = q.z; c.yaw = q.yaw; c.y = _rrG.h; c.vx = c.vz = c.w = c.speed = 0; c.vy = c.vyPrev = 0; c.air = false; c.airT = 0; c.airCd = 0; c.pitch = c.roll = 0; c.sY = c.sV = 0;
  c.steer = c.steerIn = 0; c.thr = 0; c.brk = 1; c.hand = 1; c.nit = false; c.gear = 1; c.rpm = 900; c.shift = 0; c.rev = false; c.axL = c.ayL = 0; c.utR = 0; c.crashFlag = 0; c.health = 100; c.wrecked = 0;
  b.hint = q.i; b.s = s; b.off = b.offT = b.dev = off; b.holdT = 0; c.nitro = 100; b.fin = false; b.tFin = 0; b.stuckT = 0; b.offRoadT = 0; b.imp = 0;
  b.mesh.position.set(c.x, c.y, c.z); b.mesh.rotation.set(0, c.yaw, 0, 'YXZ');
};
RR.clear = function () {
  for (const b of RR.list) { scene.remove(b.mesh); disposeCar(b.mesh); }
  RR.list.length = 0; RR.cars.length = 0; RR.on = false; RR.go = false;
};
/* (re)build the field for the chosen rival level and put everyone on the grid. Called every time the stage is reset to the countdown. */
RR.setup = function () {
  const lv = Rally.rivalLevel(); if (!lv) { RR.clear(); return; }
  const tier = RR_TIERS[lv - 1]; RR.tier = lv - 1;
  if (!RR.list.length) {
    const used = curPaint('ridge'), idx = PAINTS.map((_, i) => i).filter((i) => i !== used), nm = RR_NAMES.slice().sort(() => Math.random() - 0.5);
    for (let k = 0; k < 3; k++) RR.list.push(RR.make(k, nm[k], PAINTS[idx[(k * 2 + 1) % idx.length]], tier.ay[k], RR_SLOTS[k][1]));
  }
  RR.cars.length = 0; RR.cars.push(car);
  RR.list.forEach((b, k) => { b.ay = tier.ay[k] * (0.985 + Math.random() * 0.03); b.prof = RR.profile(b.ay, tier.brk); b.nitK = tier.nit; RR.place(b, RY.startS - RR_SLOTS[k][0], RR_SLOTS[k][1]); RR.cars.push(b.c); });
  RR.on = true; RR.go = false;
};

/* ---------- the driver ---------- */
RR.think = function (b, h) {
  const c = b.c, P = b.P; c.crashFlag = 0;
  RY.locate(c.x, c.z, b.hint, _rrL); b.hint = _rrL.i; b.s = _rrL.s; b.lat = _rrL.l; b.dist = _rrL.d; b.sec = RY.sec[_rrL.i] || 0;
  if (!RR.go) { c.thr = 0; c.brk = 1; c.hand = 1; c.steer = 0; c.steerIn = 0; return; }
  c.hand = 0;
  const spd = Math.abs(c.speed), sn = Math.sin(c.yaw), cs = Math.cos(c.yaw), hw = RY.hw[_rrL.i];
  /* plank walls: take the outer lanes (left, right, left...) so the middle of the wall is still there for the player to smash */
  let wl = false; for (let k = 0; k < RY.walls.length; k++) { const ws = RY.walls[k].s; if (b.s > ws - 45 && b.s < ws + 12) { wl = true; break; } }
  const room = wl ? Math.max(0.5, hw - 1.4) : Math.max(0.4, hw - 1.5);
  if (!b.fin && b.s >= RY.finishS) { b.fin = true; b.tFin = Rally.clock; }
  const Ld = clamp(spd * 0.42 + 5, 7, 30), sL = Math.min(b.s + Ld, RY.finishS + 30);
  /* where the driver wants to be: on the racing line (the grid lane fades out over the first 120 m); at a plank wall, in an outer lane */
  const lineHere = RR.lineOff(b.s), lineL = RR.lineOff(sL), gridK = 1 - sstep(RY.startS + 15, RY.startS + 120, b.s);
  const devBase = wl ? (b.i % 2 === 0 ? -2.5 : 2.5) - lineL : b.off0 * gridK;
  /* a slower car ahead: move off the line to pass it on the side with more road (not at a wall: stay in the lane and queue), and do not drive up its exhaust */
  let blk = null, bA = 99; const reach = 14 + spd * 0.45;
  for (let k = 0; k < RR.cars.length; k++) {
    const o = RR.cars[k]; if (o === c) continue; const rx = o.x - c.x, rz = o.z - c.z, along = rx * sn + rz * cs, lat = rx * cs - rz * sn;
    if (along > 0.5 && along < reach && Math.abs(lat) < 2.4 && along < bA && Math.abs(o.speed) < spd + 3) { bA = along; blk = { lat, along, v: Math.abs(o.speed) }; }
  }
  if (blk && !b.fin && !wl) {
    const here = b.lat + blk.lat; let dir = here > 0 ? -1 : 1;                    /* the blocker's place across the road: pass on the wider side */
    if (Math.abs(here + dir * 2.5) > room) dir = -dir; b.offT = clamp(here + dir * 2.5, -room, room) - lineL; b.holdT = 1.1;
  } else { b.holdT -= h; if (b.holdT <= 0) b.offT = devBase; }
  b.dev += clamp(b.offT - b.dev, -3.4 * h, 3.4 * h); b.off = clamp(lineHere + b.dev, -room, room);
  /* steering: pure pursuit toward a point on that line */
  const q = RY.at(sL, clamp(lineL + b.dev, -room, room), _rrQ);
  const al = wrapPi(Math.atan2(q.x - c.x, q.z - c.z) - c.yaw), mu = c.surf.mu || 0.8, maxS = clamp(1.5 * mu * G * P.L / Math.max(spd * spd, 1) + 0.05, 0.07, 0.56);
  const st = clamp(Math.atan(P.L * 2 * Math.sin(al) / Ld) / maxS * 1.15, -1, 1);
  c.steerIn = st; c.steer = approach(c.steer, st, 11 * h);
  /* speed: the profile a short way ahead, eased behind a slower car, parked once across the line */
  const B = RR.base, ix = clamp(Math.round((b.s + spd * 0.35 - B.S0) / B.DS), 0, B.N - 1);
  let vt = b.fin ? 0 : b.prof.v[ix]; if (blk && blk.along < 7 + spd * 0.08 && !b.fin) vt = Math.min(vt, Math.max(8, blk.v + 3));
  const th = clamp((vt - spd) * 0.8 + 0.35, 0, 1), br = spd > vt + 0.8 ? Math.min(1, (spd - vt - 0.8) * 0.45) : 0;
  c.thr = approach(c.thr, br > 0 ? 0 : th, (th > c.thr ? 7 : 12) * h); c.brk = approach(c.brk, spd < 3 ? 0 : br, (br > c.brk ? 10 : 14) * h);
  /* nitro, on the same tank and refill rate as the player's: down the straights, when there is speed to gain and the wheel is nearly straight */
  c.nit = b.nitK > 0 && !b.fin && !c.air && vt - spd > (b.nitK >= 1 ? 5 : 9) && Math.abs(st) < 0.3 && c.nitro > (c.nit ? 0 : 30);
  c.nitro = c.nitroUse ? Math.max(0, c.nitro - 24 * h) : Math.min(100, c.nitro + 3.2 * h);
  if (b.fin && spd < 3) { c.thr = 0; c.brk = 0; c.hand = 1; }
  /* stuck against a trunk or out in the trees: back on the road */
  if (spd < 1.5 && !b.fin) b.stuckT += h; else b.stuckT = Math.max(0, b.stuckT - 2 * h);
  if (b.dist > hw + 9 && !c.air && !b.fin) b.offRoadT += h; else b.offRoadT = Math.max(0, b.offRoadT - h);   /* (a car that has finished may roll off the end of the road) */
  if (b.stuckT > 2.2 || b.offRoadT > 3) RR.recover(b, b.stuckT > 2.2 ? 'stuck' : 'off the road');
};
RR.recover = function (b, why) {
  (RR.rlog || (RR.rlog = [])).push([b.name, why, Math.round(b.s), +Rally.clock.toFixed(1), +Math.abs(b.c.speed).toFixed(1), +b.dist.toFixed(1)]);
  const s = b.s + 3; RR.place(b, s, b.off0); const c = b.c; c.vx = Math.sin(c.yaw) * 10; c.vz = Math.cos(c.yaw) * 10; c.speed = 10; c.thr = 0.6; c.brk = 0; c.hand = 0; c.gear = 2; b.resets++;
};

/* one physics sub-step for every rival (called from Rally.sub after the player's own step) */
RR.sub = function (pc, h) {
  const sim = Rally.sim;
  for (let k = 0; k < RR.list.length; k++) {
    const b = RR.list[k], c = b.c;
    RR.think(b, h); stepCar(h, c, b.P, b.T, b.circ); Rally.assist(c, h, true);
    if (sim) {
      const r = _rrCar; r.x = c.x; r.y = c.y; r.z = c.z; r.yaw = c.yaw; r.vx = c.vx; r.vz = c.vz; r.L = b.def.body.L; r.W = b.def.body.W;
      const took = RW.carStep(sim, r); if (took > 0) { c.vx *= 1 - took; c.vz *= 1 - took; } if (sim.live.length) RW.bulldoze(sim, r);
    }
  }
  /* cars shove each other (the circuit's resolver, fed this field instead of the circuit bots) */
  const sl = Bots.list, so = Bots.on; Bots.list = RR.list; Bots.on = true; Crash.run(pc); Bots.list = sl; Bots.on = so;
};

/* ---------- order, results, per-frame ---------- */
RR.order = function () {
  const arr = [{ me: true, name: 'You', s: Rally.s, fin: Rally.phase === 'done', t: Rally.clock + Rally.penalty, v: Math.abs(car.speed) }];
  for (const b of RR.list) arr.push({ b, name: b.name, s: b.s, fin: b.fin, t: b.tFin, v: Math.abs(b.c.speed) });
  arr.sort((a, z) => (a.fin !== z.fin ? (a.fin ? -1 : 1) : a.fin ? a.t - z.t : z.s - a.s));
  return arr;
};
/* the final table when the player crosses the line: cars still out there get a finish time from their own profile */
RR.results = function () {
  const me = Rally.clock + Rally.penalty, arr = [{ me: true, name: 'You', t: me, est: false }];
  for (const b of RR.list) arr.push({ name: b.name, t: b.fin ? b.tFin : Rally.clock + b.prof.tog[RR.at(b)], est: !b.fin });
  arr.sort((a, z) => a.t - z.t); return arr;
};
RR.visual = function (dt) {
  if (!RR.on) return;
  for (const b of RR.list) {
    const c = b.c, m = b.mesh; m.position.set(c.x, c.y + c.sY * 0.4, c.z); m.rotation.set(-c.pitch, c.yaw, c.roll, 'YXZ');
    m.userData.v = c.speed; m.userData.brake = c.brk > 0.25 && !c.rev; m.userData.steer = clamp(c.delta || 0, -0.6, 0.6);
    const dd = Math.hypot(c.x - car.x, c.z - car.z), spd = Math.abs(c.speed); b.dustT -= dt;
    if (!RYP.ok || dd > 110 || c.air || spd < 6 || b.dustT > 0) continue;
    b.dustT = 0.04 + 0.6 / spd; const sn = Math.sin(c.yaw), co = Math.cos(c.yaw), sv = Rally.sec; Rally.sec = b.sec;
    for (const side of [-1, 1]) Rally.puff(c.x - sn * b.P.b + co * side * b.P.track / 2, c.y + 0.25, c.z - co * b.P.b - sn * side * b.P.track / 2, -c.vx * 0.12 + (Math.random() - 0.5), 0.6 + Math.random() * 0.8, -c.vz * 0.12 + (Math.random() - 0.5), 1.2 + Math.random() * 0.8, 0.7, 3, 0.22 * clamp(spd / 30, 0.3, 1));
    Rally.sec = sv;
  }
};
