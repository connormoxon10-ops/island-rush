/* ================= CAR-VS-CAR COLLISIONS + BOT DRIVERS =================
   Crash: one impulse-based resolver for every pair of cars that matters: the player, the race bots and the traffic. Each car is three
   circles along its length (as the static collision uses) with a real mass and yaw inertia, so a hit moves BOTH cars: equal and opposite
   impulses along the contact normal (restitution about 0.3, less at low speed), a tangential friction impulse that makes glancing hits spin
   them, and a positional push-out split by mass. Traffic cars that get hit turn into free bodies (they brake, skid, spin and stay where they
   end up as wrecks until the player has left), so a crash leaves a real mess instead of a car that shrugs it off.
   Bots: each bot is a full copy of the player's car state, driven through the same stepCar() physics with its own car's numbers. The AI
   follows the track's racing line with pure-pursuit steering, takes a corner-speed profile worked out from the line's curvature and its own
   grip/brakes, and looks ahead for cars to pass or follow. */
function newCarState() {
  return {
    x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, w: 0, vy: 0, vyPrev: 0, air: false, airT: 0, pitch: 0, roll: 0, steer: 0, steerIn: 0, thr: 0, brk: 0, hand: 0, nit: false,
    gear: 1, rpm: 900, shift: 0, rev: false, nitro: 100, health: 100, axL: 0, ayL: 0, speed: 0, kmh: 0, slip: 0, driftAng: 0, drifting: false, spin: false, braking: false,
    surf: { h: 0, mu: 1, rr: 0.02, rough: 0.02, road: true, water: false }, sY: 0, sV: 0, onRoad: true, utR: 0, delta: 0, dmax: 0.3, crashFlag: 0, cx: 0, cz: 0, landImpact: 0
  };
}
const wrapPi = (a) => { a %= TAU; return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a; };
const DYN_CIRC = [[1.5, 0.95], [0, 0.95], [-1.5, 0.95]];

/* ---------- the resolver ---------- */
const Crash = { bodies: [], np: 0, fxT: 0, hits: 0, last: 0, lastSev: 0 };
function crashBody(i) { return Crash.bodies[i] || (Crash.bodies[i] = { cs: null, imp: 0, hx: 0, hz: 0 }); }
/* mass-and-shape adapters: fill a body from a player/bot state or a traffic car */
function crashLoadState(B, kind, o, c, P, circ) {
  B.kind = kind; B.o = o; B.x = c.x; B.z = c.z; B.yaw = c.yaw; B.vx = c.vx; B.vz = c.vz; B.w = c.w; B.m = P.m; B.I = P.Iz; B.cs = circ; B.rad = Math.abs(circ[0][0]) + circ[0][1]; B.imp = 0; B.ip = 1; B.free = true;
}
function crashLoadDyn(B, d) {
  B.kind = 'dyn'; B.o = d; B.x = d.x; B.z = d.z; B.yaw = d.yaw; B.vx = d.vx; B.vz = d.vz; B.w = d.free ? d.w : 0; B.m = d.mass || 1450; B.I = d.inertia || 2500; B.cs = DYN_CIRC; B.rad = 2.5; B.imp = 0; B.free = !!d.free; B.ip = d.free ? 1 : 0; B.v0x = d.vx; B.v0z = d.vz;
}
function crashPair(A, B, mu) {
  const dx = A.x - B.x, dz = A.z - B.z, rr = A.rad + B.rad; if (dx * dx + dz * dz > rr * rr) return;
  const sA = Math.sin(A.yaw), cA = Math.cos(A.yaw), sB = Math.sin(B.yaw), cB = Math.cos(B.yaw), iA = 1 / A.m, iB = 1 / B.m;
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
    const ca = A.cs[a], cb = B.cs[b], pax = A.x + sA * ca[0], paz = A.z + cA * ca[0], pbx = B.x + sB * cb[0], pbz = B.z + cB * cb[0];
    const ex = pax - pbx, ez = paz - pbz, R2 = ca[1] + cb[1], d2 = ex * ex + ez * ez; if (d2 >= R2 * R2) continue;
    let d = Math.sqrt(d2), nx, nz; if (d < 1e-3) { const l = Math.hypot(dx, dz) || 1; nx = dx / l; nz = dz / l; d = 0; } else { nx = ex / d; nz = ez / d; }
    const pen = R2 - d, cpx = pbx + nx * (cb[1] - pen * 0.5), cpz = pbz + nz * (cb[1] - pen * 0.5);
    const rAx = cpx - A.x, rAz = cpz - A.z, rBx = cpx - B.x, rBz = cpz - B.z;
    const vAx = A.vx + A.w * rAz, vAz = A.vz - A.w * rAx, vBx = B.vx + B.w * rBz, vBz = B.vz - B.w * rBx;
    const vn = (vAx - vBx) * nx + (vAz - vBz) * nz, jA = rAz * nx - rAx * nz, jB = rBz * nx - rBx * nz;
    const den = iA + iB + jA * jA / A.I + jB * jB / B.I;
    if (vn < 0) {
      const e = 0.32 * sstep(1.2, 5, -vn), jn = -(1 + e) * vn / den;
      A.vx += jn * nx * iA; A.vz += jn * nz * iA; A.w += jn * jA / A.I; B.vx -= jn * nx * iB; B.vz -= jn * nz * iB; B.w -= jn * jB / B.I;
      /* tangential friction (paint on paint): a glancing hit drags the cars round */
      const tx = -nz, tz = nx, wAx = A.vx + A.w * rAz, wAz = A.vz - A.w * rAx, wBx = B.vx + B.w * rBz, wBz = B.vz - B.w * rBx, vt = (wAx - wBx) * tx + (wAz - wBz) * tz;
      const kA = rAz * tx - rAx * tz, kB = rBz * tx - rBx * tz, dT = iA + iB + kA * kA / A.I + kB * kB / B.I, jt = clamp(-vt / dT, -mu * jn, mu * jn);
      A.vx += jt * tx * iA; A.vz += jt * tz * iA; A.w += jt * kA / A.I; B.vx -= jt * tx * iB; B.vz -= jt * tz * iB; B.w -= jt * kB / B.I;
      const sev = -vn; if (sev > A.imp) { A.imp = sev; A.hx = cpx; A.hz = cpz; A.nx = nx; A.nz = nz; } if (sev > B.imp) { B.imp = sev; B.hx = cpx; B.hz = cpz; B.nx = -nx; B.nz = -nz; }
    }
    const corr = Math.max(0, pen - 0.005) * 0.7, wa = iA * A.ip, wb = iB * B.ip, ws = wa + wb;
    if (ws > 0) { A.x += nx * corr * wa / ws; A.z += nz * corr * wa / ws; B.x -= nx * corr * wb / ws; B.z -= nz * corr * wb / ws; }
  }
}
/* one substep: resolve the player and every bot against each other and against nearby traffic */
Crash.run = function (c) {
  const bd = Crash.bodies; let n = 0; const P = CARP;
  const pl = crashBody(n++); crashLoadState(pl, 'player', c, c, P, CIRC);
  const bots = Bots.list, nb = Bots.on ? bots.length : 0;
  for (let i = 0; i < nb; i++) { const b = bots[i]; crashLoadState(crashBody(n++), 'bot', b, b.c, b.P, b.circ); }
  const nr = n;
  /* traffic within reach of a racer (and wrecks, which keep sliding into each other) */
  const L = Dyn.list;
  for (let i = 0; i < L.length; i++) {
    const d = L[i]; if (d.kind !== 'traffic') continue; let near = false;
    for (let k = 0; k < nr; k++) { const r = bd[k], dx = d.x - r.x, dz = d.z - r.z; if (dx * dx + dz * dz < 144) { near = true; break; } }
    if (near || (d.free && (Math.abs(d.vx) + Math.abs(d.vz) > 0.5))) crashLoadDyn(crashBody(n++), d);
  }
  if (n < 2) return;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const A = bd[i], B = bd[j]; if (A.kind === 'dyn' && B.kind === 'dyn' && !A.free && !B.free) continue; crashPair(A, B, 0.34); }
  /* write back */
  for (let i = 0; i < n; i++) {
    const B = bd[i];
    if (B.kind === 'player') { c.x = B.x; c.z = B.z; c.vx = B.vx; c.vz = B.vz; c.w = B.w; if (B.imp > c.crashFlag) { c.crashFlag = B.imp; c.cx = B.hx; c.cz = B.hz; } if (B.imp > 0.5) Crash.note(B.imp); }
    else if (B.kind === 'bot') { const b = B.o, bc = b.c; bc.x = B.x; bc.z = B.z; bc.vx = B.vx; bc.vz = B.vz; bc.w = B.w; if (B.imp > b.imp) { b.imp = B.imp; b.hx = B.hx; b.hz = B.hz; } }
    else { const d = B.o, dv = Math.hypot(B.vx - B.v0x, B.vz - B.v0z); if (d.free) { d.x = B.x; d.z = B.z; d.vx = B.vx; d.vz = B.vz; d.w = B.w; if (B.imp > 1) d.hitT = 1; if (B.imp > (d.imp || 0)) { d.imp = B.imp; d.hx = B.hx; d.hz = B.hz; } } else if (B.imp > 0.4 && dv > 0.8) Crash.wreck(d, B); }
  }
};
Crash.note = function (sev) { Crash.last = App.time; Crash.lastSev = Math.max(sev, Crash.lastSev); Crash.hits++; };
/* a traffic car that has been properly hit stops following its road and becomes a free body */
Crash.wreck = function (d, B) {
  d.free = true; d.x = B.x; d.z = B.z; d.vx = B.vx; d.vz = B.vz; d.w = B.w; d.age = 0; d.rest = 0; d.mass = d.mass || 1450; d.inertia = d.inertia || 2500; d.hitT = 1; d.imp = B.imp; d.hx = B.hx; d.hz = B.hz; d.stun = 99;
  d.v = Math.hypot(d.vx, d.vz); d.brake = true; d.mesh.userData.brake = true;
};
/* free-body traffic: locked wheels scrub speed along the heading, side-slip dies fast, spin decays; scenery and barriers still push back */
const _fcs = { x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, w: 0, crashFlag: 0, cx: 0, cz: 0 }, _FPS = { m: 1450, Iz: 2500 }, _gsF = { h: 0, mu: 1, rr: 0, rough: 0, road: false, water: false };
Crash.freeStep = function (d, dt) {
  const s = Math.sin(d.yaw), co = Math.cos(d.yaw); let vf = d.vx * s + d.vz * co, vr = d.vx * co - d.vz * s;
  const dec = 7.2 * dt; vf = vf > 0 ? Math.max(0, vf - dec) : Math.min(0, vf + dec); vr *= Math.exp(-4.2 * dt);
  d.vx = vf * s + vr * co; d.vz = vf * co - vr * s; d.w *= Math.exp(-1.15 * dt); const wd = 1.6 * dt; d.w = d.w > 0 ? Math.max(0, d.w - wd) : Math.min(0, d.w + wd);
  d.x += d.vx * dt; d.z += d.vz * dt; d.yaw += d.w * dt;
  groundAt(d.x, d.z, _gsF); d.y += (_gsF.h + (d.road && d.road.kind ? 0.12 : 0.12) - d.y) * Math.min(1, dt * 12);
  const f = _fcs; f.x = d.x; f.z = d.z; f.y = d.y; f.yaw = d.yaw; f.vx = d.vx; f.vz = d.vz; f.w = d.w; f.crashFlag = 0; collideStatic(f, _FPS, DYN_CIRC);
  if (f.crashFlag > 0) { d.x = f.x; d.z = f.z; d.vx = f.vx; d.vz = f.vz; d.w = f.w; if (f.crashFlag > 3 && App.time - (d.sndT || 0) > 0.3) { d.sndT = App.time; Crash.fx(f.crashFlag * 0.6, f.cx, d.y + 0.5, f.cz); } }
  d.v = Math.hypot(d.vx, d.vz); const sp = d.v; d.rest = sp < 0.4 && Math.abs(d.w) < 0.1 ? d.rest + dt : 0; d.age += dt;
  const m = d.mesh; m.position.set(d.x, d.y, d.z); m.rotation.set(0, d.yaw, 0, 'YXZ'); m.userData.v = vf; m.userData.brake = true;
  d.dx = Math.sin(d.yaw); d.dz = Math.cos(d.yaw);
};
/* sparks + a crunch for impacts away from the player; quiet with distance */
Crash.fx = function (sev, x, y, z) {
  const dd = Math.hypot(x - Pl.x, z - Pl.z); if (dd > 120 || sev < 2) return; sparks(x, y, z, Math.min(26, Math.round(sev * 1.6)), 2 + sev * 0.4); if (Snd.ok) Snd.crash(sev * (1 - dd / 140));
};

/* ================= bots ================= */
const Bots = { list: [], on: false, go: false, time: 0, K: { fr: 1.0, ab: 0.9, tc: 1.5, look: 40, tg: 2, lift: 0.45, curv: 1.02, limMin: 0.82, limUp: 0.004 } };
const _bl = { i: 0, t: 0, s: 0, d: 0, l: 0 };
/* corner-speed profile along the racing line for one car: friction-limited cornering with aero downforce, then a backward braking pass */
Bots.profile = function (b) {
  const n = Track.n, P = b.P, T = b.T, lk = Track.lk, ll = Track.ll, v = new Float32Array(n), sk = b.skill;
  const fr = Bots.K.fr * sk, aB = Bots.K.ab * G * T.mu * T.brk * (0.84 + 0.16 * sk) + 0.8;
  /* top speed: thrust against drag in top gear, capped by the rev limiter */
  const ratio = P.gears[P.gears.length - 1] * P.fd, F = T.Tmax * 0.86 * ratio * 0.9 / P.rw, vTh = Math.sqrt(Math.max(1, (F - 0.02 * P.m * G) / Math.max(0.05, T.cd))), vRpm = P.red / 60 * TAU * P.rw / ratio;
  b.vtop = Math.min(vTh, vRpm * 0.97);
  for (let i = 0; i < n; i++) {
    const k = Math.abs(lk[i]) * Bots.K.curv; let vc = b.vtop;
    if (k > 1e-4) { const den = k * P.m - T.mu * fr * T.cl; vc = den > 1e-3 ? Math.sqrt(T.mu * fr * P.m * G / den) : b.vtop; }
    v[i] = Math.min(vc, b.vtop);
  }
  /* backward braking pass: the decel on offer shrinks as the tyres are already busy cornering (friction circle) */
  for (let pass = 0; pass < 3; pass++) for (let i = n - 1; i >= 0; i--) {
    const j = (i + 1) % n, vj = v[j], ayMax = 0.95 * T.mu * (G + T.cl * vj * vj / P.m), use = Math.min(1, vj * vj * Math.abs(lk[i]) * 1.08 / ayMax), lim = Math.sqrt(vj * vj + 2 * aB * Math.sqrt(Math.max(0.1, 1 - use * use)) * ll[i]);
    if (lim < v[i]) v[i] = lim;
  }
  b.aBcap = 0.9 * G * T.mu * T.brk;
  b.allow = v;
};
Bots.make = function (def, hex, name, skill, i) {
  const P = Object.assign({ awd: false, rsf: 0.5, ab: 0.5, cf: 10.2, cr: 12.2 }, def.p, { L: def.p.a + def.p.b }), T = { Tmax: def.t.Tmax, mu: def.t.mu, cd: def.t.cd, cl: def.t.cl || 0, brk: def.t.brk, off: def.t.off };
  const hl = def.hl, hw = def.body.W / 2, circ = [[hl - 0.45, hw + 0.09], [0, hw + 0.09], [-(hl - 0.45), hw + 0.09]];
  const b = { def, name, P, T, circ, c: newCarState(), skill, i, idx: 0, prog: 0, sPrev: 0, l: 0, off: 0, offT: 0, noseT: 0, stuckT: 0, wrongT: 0, pace: 1, rb: 1, imp: 0, hx: 0, hz: 0, hitT: 0, fin: false, go: false, reactT: 0.15 + Math.random() * 0.3, hex, lap: 0, tFin: 0, laps: [], best: 0, lapStart: 0, mood: Math.random() * TAU, smokeT: 0, lim: 0.94, limMax: 1.0, rbLo: 0.95, rbHi: 1.05, nitroOn: false, cover: false, push: 0, defT: 0, lapse: 0, slidT: 0 };
  b.mesh = buildCarModel(def, hex, { lod: 1 }); b.mesh.visible = true; scene.add(b.mesh);
  Bots.profile(b); return b;
};
/* apply a difficulty tier (08_race.js RACE_DIFF) to a bot: how hard it pushes, whether it uses nitro and covers the line, how much it catches up, a little extra car */
Bots.tier = function (b, D) {
  b.limMax = D.lim; b.lim = Math.min(D.lim, 0.95); b.rbLo = Math.max(1, D.rb[0]); b.rbHi = D.rb[1] + 0.04; b.nitroOn = !!D.nit; b.cover = !!D.cover; b.push = D.push || 0;
  b.reactT = D.react[0] + Math.random() * D.react[1];
  if (D.pw !== 1) b.T.Tmax *= D.pw; if (D.gr !== 1) b.T.mu *= D.gr;
  /* dynamic edge: the rivals are always set up to out-run the player's car and keep finding more the harder they are pushed (Bots.edge) */
  b.T0 = { Tmax: b.T.Tmax, mu: b.T.mu }; b.edge0 = D.edge || 0.04; b.edge = b.edge0; b.pwF = 1; b.grF = 1; b.tk = 1; b.profT = Math.random() * 0.6; b.pr = 0.88;
  Bots.profile(b);
};
/* Rivals are always faster than the player, and the gap in pace widens the better the player drives:
   - floor: a bot's power and grip never sit below the player's own car (upgrades included) plus a margin,
   - catch-up: behind the player, or the player running faster than the bot's own plan at that spot, raises the edge quickly; it only relaxes slowly and never below the tier's base edge. */
Bots.edge = function (b, dt, me) {
  const T0 = b.T0; if (!T0) return;
  const gap = me.prog - b.prog, pi = (me.idx | 0) % Track.n, vp = b.allow[pi], plan = vp >= b.vtop * 0.97 ? vp : vp * b.lim;
  b.pr += (clamp(Math.abs(car.speed) / Math.max(6, plan), 0, 1.4) - b.pr) * Math.min(1, dt / 5);
  const want = b.edge0 + clamp(gap / 110, 0, 1) * 0.17 + clamp((b.pr - 0.88) * 1.1, 0, 0.13);
  b.edge += clamp(want - b.edge, -dt * 0.012, dt * 0.08); b.edge = clamp(b.edge, b.edge0, 0.34); b.tk = 1 + 0.3 * b.edge;
  b.profT -= dt; if (b.profT > 0) return;
  const pw = clamp(Math.max(1 + 2.2 * b.edge, 1.07 * tune.Tmax / T0.Tmax), 1, 1.85), gr = clamp(Math.max(1 + 0.8 * b.edge, 1.035 * tune.mu / T0.mu), 1, 1.32);
  if (Math.abs(pw - b.pwF) > 0.004 || Math.abs(gr - b.grF) > 0.002) { b.pwF = pw; b.grF = gr; b.T.Tmax = T0.Tmax * pw; b.T.mu = T0.mu * gr; Bots.profile(b); }
  b.profT = 0.7;
};
Bots.place = function (b, o) {
  const c = b.c; c.x = o.x; c.z = o.z; c.yaw = o.yaw; c.vx = c.vz = c.w = c.speed = 0; groundAt(c.x, c.z, _gsF); c.y = _gsF.h; c.vy = c.vyPrev = 0; c.air = false; c.pitch = c.roll = 0; c.sY = c.sV = 0;
  c.steer = c.steerIn = 0; c.thr = 0; c.brk = 1; c.gear = 1; c.rpm = 900; c.shift = 0; c.rev = false; c.axL = c.ayL = 0; c.crashFlag = 0; c.hand = 1;
  Track.locate(c.x, c.z, o.i, _bl); b.idx = _bl.i; b.sPrev = _bl.s; b.prog = _bl.s > Track.L / 2 ? _bl.s - Track.L : _bl.s; b.stuckT = 0; b.wrongT = 0; b.off = 0; b.offT = 0; b.go = false; b.fin = false; b.resets = 0;
  b.mesh.position.set(c.x, c.y, c.z); b.mesh.rotation.set(0, c.yaw, 0, 'YXZ');
};
/* take one car off the track (a knocked-out car in an elimination race) */
Bots.drop = function (b) { const i = Bots.list.indexOf(b); if (i < 0) return; scene.remove(b.mesh); disposeCar(b.mesh); Bots.list.splice(i, 1); };
Bots.clear = function () { for (const b of Bots.list) { scene.remove(b.mesh); disposeCar(b.mesh); } Bots.list.length = 0; Bots.on = false; };
/* drop a bot back on the racing line, facing the right way, when it is stuck, facing backwards or lost */
Bots.reset = function (b, why) {
  const c = b.c, n = Track.n, i = Track.nearestIdx(c.x, c.z), lx = Track.lx[i], lz = Track.lz[i];
  /* never drop it on top of another car: slide forward until the spot is clear */
  let j = i, tries = 0; const clearAt = (x, z) => { for (const o of Bots.list) if (o !== b && Math.hypot(o.c.x - x, o.c.z - z) < 6) return false; return Math.hypot(car.x - x, car.z - z) > 6; };
  while (!clearAt(Track.lx[j % n], Track.lz[j % n]) && tries < 30) { j += 2; tries++; }
  j %= n; c.x = Track.lx[j]; c.z = Track.lz[j]; c.yaw = Math.atan2(Track.ltx[j], Track.ltz[j]); c.vx = Math.sin(c.yaw) * 6; c.vz = Math.cos(c.yaw) * 6; c.w = 0; c.speed = 6; c.steer = 0; c.thr = 0.5; c.brk = 0; c.rev = false; c.gear = 1;
  b.stuckT = 0; b.wrongT = 0; b.off = 0; b.offT = 0; b.idx = j; b.sPrev = Track.cum[j]; b.resets = (b.resets || 0) + 1; (Bots.rlog || (Bots.rlog = [])).push([b.name, why, Math.round(b.prog), +Bots.time.toFixed(1)]);
};
Bots.think = function (b, dt, others) {
  const c = b.c, P = b.P, n = Track.n, ll = Track.ll, KK = Bots.K;
  Track.locate(c.x, c.z, b.idx, _bl); b.idx = _bl.i; b.l = _bl.l; b.s = _bl.s;
  let ds = _bl.s - b.sPrev; if (ds < -Track.L / 2) ds += Track.L; else if (ds > Track.L / 2) ds -= Track.L; b.prog += ds; b.sPrev = _bl.s;
  const v = Math.max(0.01, c.speed), sy = Math.sin(c.yaw), cy = Math.cos(c.yaw);
  if (!b.go) { c.thr = 0; c.brk = 1; c.steer = 0; c.hand = 1; return; }
  c.hand = 0;
  /* other cars: the nearest blocker ahead, anyone alongside, and a car right on the tail */
  let block = null, bAlong = 99, side = 0, chase = null, cAlong = -99;
  const reach = clamp(24 + v * 0.45, 26, 58);
  for (let k = 0; k < others.length; k++) {
    const o = others[k]; if (o === b.c) continue; const rx = o.x - c.x, rz = o.z - c.z, along = rx * sy + rz * cy, lat = rx * cy - rz * sy;
    if (along > -4.2 && along < reach && Math.abs(lat) < 3.6) { if (along > 0 && along < bAlong) { bAlong = along; block = { o, lat, along }; } if (along < 5 && along > -4.2) side += lat > 0 ? -1 : 1; }
    else if (along <= -4.2 && along > -17 && Math.abs(lat) < 3.4 && along > cAlong) { cAlong = along; chase = { o, lat, along }; }
  }
  /* lateral line offset: dodge a car ahead (towards the side with room, on the outside of the next bend when it can), hold clear of one alongside, cover a car on the tail on the straights, drift back to the line when free */
  const lineOff = Track.off[b.idx], room = TRK.HW - 2.0, kHere = Track.lk[b.idx];
  b.defT = Math.max(0, (b.defT || 0) - dt);
  if (block) {
    let dir = block.lat > 0 ? -1 : 1; if (Math.abs(block.lat) < 0.3) dir = b.mood > Math.PI ? 1 : -1;
    if (Math.abs(lineOff + dir * 3.2) > room) dir = -dir;
    b.offT = clamp(dir * 3.4, -room - lineOff, room - lineOff); b.holdT = 1.1;
  } else if (side !== 0) { b.offT = clamp(side * 1.6, -room - lineOff, room - lineOff); b.holdT = 0.5; }
  else if (b.cover && chase && b.defT <= 0 && Math.abs(kHere) < 0.0025 && v > 28 && Math.abs(chase.lat) > 0.4) { b.offT = clamp(b.off + clamp(chase.lat * 0.9, -2.4, 2.4), -room - lineOff, room - lineOff); b.holdT = 1.4; b.defT = 4.5; }
  else { b.holdT = (b.holdT || 0) - dt; if (b.holdT <= 0) b.offT = 0; }
  b.off += clamp(b.offT - b.off, -2.8 * dt, 2.8 * dt); b.off = clamp(b.off, -room - lineOff, room - lineOff);
  /* pure pursuit toward a point on the (offset) line, with the yaw rate the line asks for as a damper */
  const Ld = clamp(6 + v * 0.55, 8, 40); let t = b.idx, acc = 0, guard = 0; while (acc < Ld && guard++ < 60) { acc += ll[t % n]; t++; } t %= n;
  const tx = Track.lx[t] + Track.nx[t] * b.off, tz = Track.lz[t] + Track.nz[t] * b.off, dx = tx - c.x, dz = tz - c.z, dist = Math.max(4, Math.hypot(dx, dz));
  const err = wrapPi(Math.atan2(dx, dz) - c.yaw), dEs = Math.atan2(2 * P.L * Math.sin(err), dist);
  const wDes = v * Track.lk[(b.idx + Math.max(1, Math.round(v * 0.25 / 4))) % n], dEd = -0.07 * (c.w - wDes) * clamp(v / 25, 0.3, 1.4);
  let steerT = clamp((dEs + dEd) / Math.max(0.05, c.dmax || 0.3), -1, 1);
  c.steerIn = steerT; c.steer += clamp(steerT - c.steer, -dt * lerp(7, 3.2, clamp(v / 40, 0, 1)), dt * lerp(7, 3.2, clamp(v / 40, 0, 1)));
  /* speed plan: the corner-speed profile, scaled by this driver's learned limit (corners only, never the top speed) and the pace/rubber-band factor */
  const al = b.allow, pm = b.pace * b.rb, lim = b.lim, vTop = b.vtop * 0.97, aC = 0.5 + 0.0007 * v * v;
  const plan = (i) => { const vp = al[i % n]; return (vp >= vTop ? vp : vp * lim) * pm; };
  let areq = 0, dsum = 0;
  for (let k = 1; k <= KK.look; k++) { dsum += ll[(b.idx + k - 1) % n]; const vj = plan(b.idx + k); if (vj < v) { const a = (v * v - vj * vj) / (2 * dsum); if (a > areq) areq = a; } }
  let vt = plan(b.idx + 2);
  if (b.fin) vt = Math.min(vt, 26);
  if (block && !b.fin) { const o = block.o, ov = o.vx * sy + o.vz * cy, gap = block.along - 4.6; if (Math.abs(block.lat) < 2.4 && gap < 7 + v * 0.3) vt = Math.min(vt, Math.max(ov * 0.97, 3) + Math.max(0, gap - 2) * 0.9 + (b.push || 0)); }
  if (Math.abs(err) > 0.55 && v > 6) vt = Math.min(vt, 9 + 5 / Math.abs(err));
  const use = Math.min(1, Math.abs(c.ayL) / (b.T.mu * G)), e = vt - v;
  let brk = clamp((areq - aC) / Math.max(1, b.aBcap - aC), 0, 1) + (e < -1.5 ? clamp((-e - 1.5) / 10, 0, 0.5) : 0);
  brk = Math.min(brk, Math.sqrt(Math.max(0.08, 1 - use * use)));
  const bT = brk > 0.04 ? brk : 0, tT = (e > 0 && areq < Math.max(0.5, aC)) ? Math.min(clamp(e / KK.tg + 0.12, 0, 1), clamp(1 - (0.99 - b.skill) * KK.tc, 0.4, 1)) * (1 - KK.lift * sstep(0.62, 0.95, use)) : 0;
  c.brk += clamp(bT - c.brk, -dt * 14, dt * 9); c.thr += clamp(tT - c.thr, -dt * 12, dt * 7);
  if (c.slip > 0.45 && v > 8) { c.thr *= 0.4; c.brk *= 0.5; }
  /* nitro on the long straights when the tank has some, as the player would */
  c.nit = !!(b.nitroOn && c.nitro > 6 && tT > 0.95 && e > 5 && c.brk < 0.03 && Math.abs(c.steer) < 0.14 && v > 9 && !b.fin);
  /* learning the limit: clean running creeps the limit up, a slide / kerb / wall hit takes some of it back (never for being shunted) */
  b.lapse = Math.max(0, (b.lapse || 0) - dt);
  const slid = c.slip > 0.38 && v > 12, wide = Math.abs(b.l) > TRK.HW + 0.9 && v > 14, hit = b.wallHit > 1.5 && b.hitT <= 0;
  b.slidT = slid ? (b.slidT || 0) + dt : 0;
  if ((b.slidT > 0.22 || wide || hit) && b.lapse <= 0) { if (Bots.dbg) (b.ilog || (b.ilog = [])).push([Math.round(b.s), Math.round(v * 3.6), Math.round(al[b.idx] * 3.6), +b.lim.toFixed(2), slid ? 'slide' : wide ? 'wide' : 'hit', +c.slip.toFixed(2), +b.l.toFixed(1), +c.thr.toFixed(2), +c.brk.toFixed(2)].join(' ')); b.lim = Math.max(KK.limMin, b.lim - (hit ? 0.05 : 0.035)); b.lapse = 2.5; b.slidT = 0; }
  else if (b.lapse <= 0 && b.hitT <= 0) b.lim = Math.min(b.limMax, b.lim + KK.limUp * dt);
  /* trouble: wedged, facing backwards or off the circuit */
  const along = sy * Track.ltx[b.idx] + cy * Track.ltz[b.idx];
  b.stuckT = v < 1.5 && !b.fin ? b.stuckT + dt : 0; b.wrongT = along < -0.2 && v > 1 ? b.wrongT + dt : (along < -0.2 ? b.wrongT + dt * 0.5 : 0);
  if (b.stuckT > 2.6 || b.wrongT > 1.8 || Math.abs(b.l) > TRK.WALL + 1) Bots.reset(b, b.stuckT > 2.6 ? 'stuck' : b.wrongT > 1.8 ? 'wrong' : 'off');
};
/* once per frame: decide controls, rubber-band, track state */
Bots.update = function (dt, ref) {
  if (!Bots.on) return; const bs = Bots.list; Bots.time += dt;
  const others = Bots._oth || (Bots._oth = []); others.length = 0; others.push(car); for (const b of bs) others.push(b.c);
  for (const b of bs) {
    if (!b.go && Bots.go) { b.reactT -= dt; if (b.reactT <= 0) b.go = true; }
    /* mild rubber band: trail the player by 150 m and the bot finds a few per cent, lead by 150 and it eases */
    const gap = ref != null ? ref - b.prog : 0; b.rb = clamp(1 + gap / 2200, b.rbLo, b.rbHi);
    if (ref != null && Race.me && b.T0) Bots.edge(b, dt, Race.me);
    const cc = b.c; if (cc.nitroUse) cc.nitro = Math.max(0, cc.nitro - 24 * dt); else cc.nitro = Math.min(100, cc.nitro + (cc.drifting ? 14 : 3.2) * dt);
    b.hitT = Math.max(0, b.hitT - dt); if (b.imp > 1.5 && Bots.time - (b.fxT || 0) > 0.25) { b.fxT = Bots.time; b.hitT = 0.6; Crash.fx(b.imp, b.hx, b.c.y + 0.5, b.hz); } b.imp = 0;
    b.wallHit = b.c.crashFlag; b.c.crashFlag = 0;
    Bots.think(b, dt, others);
  }
};
Bots.step = function (h) { const bs = Bots.list; for (let i = 0; i < bs.length; i++) { const b = bs[i], c = b.c; stepCar(h * (b.tk || 1), c, b.P, b.T, b.circ); } };
Bots.visual = function (dt) {
  if (!Bots.on) return;
  for (const b of Bots.list) {
    const c = b.c, m = b.mesh; m.position.set(c.x, c.y + c.sY * 0.4, c.z); m.rotation.set(-c.pitch, c.yaw, c.roll, 'YXZ'); m.userData.cs = c; m.userData.v = c.speed; m.userData.brake = c.brk > 0.25 && !c.rev; m.userData.steer = clamp(c.delta || 0, -0.6, 0.6);
    b.smokeT -= dt; const dd = Math.hypot(c.x - Pl.x, c.z - Pl.z);
    if (dd < 90 && b.smokeT <= 0 && (c.drifting || c.spin || (c.braking && Math.abs(c.speed) > 25)) && !c.air) {
      b.smokeT = 0.03; const s = Math.sin(c.yaw), co = Math.cos(c.yaw);
      for (const sx of [-1, 1]) { const x = c.x - s * b.P.b + co * sx * b.P.track / 2, z = c.z - co * b.P.b - s * sx * b.P.track / 2; emit(Part.smoke, x, c.y + 0.15, z, c.vx * 0.2 + (Math.random() - 0.5), 0.8 + Math.random() * 0.6, c.vz * 0.2 + (Math.random() - 0.5), 1.4 + Math.random() * 0.6, 0.6, 2.4, 0.8, 0.8, 0.8, 0.4, -0.4); }
    }
  }
};
