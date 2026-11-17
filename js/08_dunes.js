/* ================= DUNE DASH: a dune-buggy race track on the beach =================
   A stretch of low coast is shaped into sand dunes (a height grid baked once, before the world's chunks are made, then blended into the terrain), and a
   closed 800 m course winds over them between orange-and-white marker poles, over rolling dunes and three jump dunes, under a start arch. It is
   on the map. Drive into the orange beam by the start line and press E: you are lent a Sandviper dune buggy and race five rival buggies over three
   laps. The rivals drive the same car physics (stepCar) with a pure-pursuit driver and a corner-speed plan for the course. R puts you back on the
   course. Prize money by finishing position; your own car is given back at the end. */
const Dunes = { s: null, on: false, phase: 'off', near: false, bots: [], group: null, built: false, laps: 3, t: 0, count: 0, me: null, prev: null, res: null, msgT: 0 };
const DUNE = { W: 360, D: 190, GS: 2, BLEND: 50, HW: 7, BASE: 1.6, CAR: 'buggy', N: 5, PRIZE: [3000, 1800, 1100, 600, 300, 150],
  /* the course, local metres (u along the shore, v inland), a closed loop */
  PTS: [[-140, -55], [-60, -70], [30, -66], [110, -55], [150, -25], [150, 25], [118, 58], [62, 66], [26, 36], [-12, 22], [-46, 52], [-100, 66], [-148, 48], [-162, 0]],
  JUMPS: [0.12, 0.43, 0.8], NAMES: ['Kai Moana', 'Sunny Alvarez', 'Reef Okoro', 'Marlo Quinn', 'Tide Bennett'], COLS: [0x18a89a, 0xff6fa8, 0xf2c81e, 0x7a3fd1, 0x2a9d4a] };

/* ---------- the site: low, open coast with the sea close by ---------- */
Dunes.plan = function () {
  let best = null, bc = 1e9;
  for (let a = 0; a < TAU; a += 0.035) {
    const sx = Math.sin(a), sz = Math.cos(a); let r = 2900; while (r > 1200 && terrainNoRoad(sx * r, sz * r) < 0.8) r -= 8; if (r <= 1200) continue;
    /* inland is down the slope from the shore point; the site's middle sits 110 m in */
    const x0 = sx * r, z0 = sz * r, gx = terrainNoRoad(x0 + 4, z0) - terrainNoRoad(x0 - 4, z0), gz = terrainNoRoad(x0, z0 + 4) - terrainNoRoad(x0, z0 - 4), gl = Math.hypot(gx, gz) || 1;
    const vx = gx / gl, vz = gz / gl, ux = vz, uz = -vx, cx = x0 + vx * (DUNE.D / 2 + 20), cz = z0 + vz * (DUNE.D / 2 + 20);
    let ok = true, hs = 0, h2 = 0, n = 0;
    for (let u = -DUNE.W / 2 - 20; u <= DUNE.W / 2 + 20 && ok; u += 20) for (let v = -DUNE.D / 2 - 10; v <= DUNE.D / 2 + 20; v += 20) {
      const x = cx + ux * u + vx * v, z = cz + uz * u + vz * v, h = terrainHeight(x, z);
      if (h < 0.4 || h > 26 || (NR.seg >= 0 && NR.d < NR.halfW + 12) || townAt(x, z, 90) || (Rail.hash && Rail.dist(x, z) < 40) ||
        (Air.s && x > Air.s.x0 - 80 && x < Air.s.x1 + 80 && z > Air.s.z0 - 80 && z < Air.s.z1 + 80) || (Track.s && x > Track.s.x0 - 80 && x < Track.s.x1 + 80 && z > Track.s.z0 - 80 && z < Track.s.z1 + 80) || (Dock.s && Math.hypot(x - Dock.s.ox, z - Dock.s.oz) < 260) || (Heist.site && Math.hypot(x - Heist.site.cx, z - Heist.site.cz) < 240)) { ok = false; break; }
      hs += h; h2 += h * h; n++;
    }
    if (!ok) continue; const m = hs / n, c = h2 / n - m * m + m * 0.3; if (c < bc) { bc = c; best = { cx, cz, ux, uz, vx, vz, base: Math.max(DUNE.BASE, m * 0.25) }; }
  }
  if (!best) return; const S = Dunes.s = best;
  /* the course: a closed spline sampled every 2 m */
  const P = DUNE.PTS, N = P.length, fine = [];
  for (let k = 0; k < N; k++) { const p0 = P[(k + N - 1) % N], p1 = P[k], p2 = P[(k + 1) % N], p3 = P[(k + 2) % N];
    for (let t = 0; t < 1; t += 1 / 40) { const t2 = t * t, t3 = t2 * t, f = (i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3); fine.push([f(0), f(1)]); } }
  let L = 0; const cum = [0]; for (let i = 1; i <= fine.length; i++) { const a = fine[i - 1], b = fine[i % fine.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); cum.push(L); }
  const n = Math.floor(L / 2), cu = new Float32Array(n), cv = new Float32Array(n); let j = 0;
  for (let i = 0; i < n; i++) { const s = i * L / n; while (cum[j + 1] < s) j++; const t = (s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]), a = fine[j], b = fine[(j + 1) % fine.length]; cu[i] = a[0] + (b[0] - a[0]) * t; cv[i] = a[1] + (b[1] - a[1]) * t; }
  S.n = n; S.L = L; S.ds = L / n; S.px = new Float32Array(n); S.pz = new Float32Array(n); S.tx = new Float32Array(n); S.tz = new Float32Array(n); S.k = new Float32Array(n);
  for (let i = 0; i < n; i++) { S.px[i] = S.cx + S.ux * cu[i] + S.vx * cv[i]; S.pz[i] = S.cz + S.uz * cu[i] + S.vz * cv[i]; }
  for (let i = 0; i < n; i++) { const a = (i + n - 1) % n, b = (i + 1) % n, tx = S.px[b] - S.px[a], tz = S.pz[b] - S.pz[a], l = Math.hypot(tx, tz) || 1; S.tx[i] = tx / l; S.tz[i] = tz / l; }
  for (let i = 0; i < n; i++) { const a = (i + n - 3) % n, b = (i + 3) % n, d = Math.atan2(S.tx[b], S.tz[b]) - Math.atan2(S.tx[a], S.tz[a]); S.k[i] = Math.atan2(Math.sin(d), Math.cos(d)) / (6 * S.ds); }
  /* the dunes: a height grid over the site. Rolling dunes everywhere (low on the course itself so it stays drivable), three jump dunes across the course */
  const W = DUNE.W + 2 * DUNE.BLEND, D = DUNE.D + 2 * DUNE.BLEND, gw = Math.ceil(W / DUNE.GS) + 1, gh = Math.ceil(D / DUNE.GS) + 1, H = new Float32Array(gw * gh), K = new Float32Array(gw * gh);
  S.gw = gw; S.gh = gh; S.u0 = -W / 2; S.v0 = -D / 2; S.H = H; S.K = K;
  const near = (u, v) => { let best = 1e9, bi = 0; for (let i = 0; i < n; i += 2) { const d = (cu[i] - u) ** 2 + (cv[i] - v) ** 2; if (d < best) { best = d; bi = i; } } for (let i = Math.max(0, bi - 3); i < Math.min(n, bi + 4); i++) { const d = (cu[i] - u) ** 2 + (cv[i] - v) ** 2; if (d < best) { best = d; bi = i; } } return [Math.sqrt(best), bi]; };
  const jumps = DUNE.JUMPS.map((f) => Math.round(f * n));
  for (let gj = 0; gj < gh; gj++) for (let gi = 0; gi < gw; gi++) {
    const u = S.u0 + gi * DUNE.GS, v = S.v0 + gj * DUNE.GS, [d, bi] = near(u, v), onT = 1 - sstep(DUNE.HW - 1, DUNE.HW + 9, d);
    let h = 1.7 * (1 + Math.sin(u * 0.052 + v * 0.021)) * (0.55 + 0.45 * Math.sin(v * 0.047 - u * 0.013 + 1.3)) + 0.7 * fbm(u * 0.03 + 5, v * 0.03 - 2, 2);
    h = h * (1 - 0.55 * onT) + 0.35 * Math.sin((bi * S.ds) * 0.16) * onT;     /* softer, regular rollers on the course */
    for (const jI of jumps) { let a = (bi - jI) * S.ds; if (a > S.L / 2) a -= S.L; if (a < -S.L / 2) a += S.L; if (a > -18 && a < 10 && d < DUNE.HW + 6) {   /* up a long face, off a sharp crest */
      const up = a < 0 ? sstep(-18, 0, a) : 1 - sstep(0, 10, a); h += 2.6 * up * (1 - sstep(DUNE.HW + 1, DUNE.HW + 6, d)); } }
    H[gj * gw + gi] = S.base + Math.max(0, h); K[gj * gw + gi] = onT;
  }
  S.jumps = jumps; S.cu = cu; S.cv = cv;
  /* the start: on the first long straight; the race office beam beside it */
  S.start = 12; const st = S.start; S.ox = S.px[st] + S.tz[st] * (DUNE.HW + 16); S.oz = S.pz[st] - S.tx[st] * (DUNE.HW + 16);
};
/* the site's local frame */
function duneLocal(x, z, o) { const S = Dunes.s, dx = x - S.cx, dz = z - S.cz; o.u = dx * S.ux + dz * S.uz; o.v = dx * S.vx + dz * S.vz; return o; }
const _duL = { u: 0, v: 0 };
/* the dunes blended into the land (from 02_world.js terrainNoRoad) */
Dunes.shape = function (x, z, h) {
  const S = Dunes.s; if (!S) return h; duneLocal(x, z, _duL); const W2 = DUNE.W / 2 + DUNE.BLEND, D2 = DUNE.D / 2 + DUNE.BLEND;
  if (Math.abs(_duL.u) > W2 || Math.abs(_duL.v) > D2) return h;
  const w = (1 - sstep(DUNE.W / 2, W2, Math.abs(_duL.u))) * (1 - sstep(DUNE.D / 2, D2, Math.abs(_duL.v))); if (w <= 0) return h;
  const gx = (_duL.u - S.u0) / DUNE.GS, gz = (_duL.v - S.v0) / DUNE.GS, i = Math.min(S.gw - 2, Math.max(0, Math.floor(gx))), j = Math.min(S.gh - 2, Math.max(0, Math.floor(gz))), fx = gx - i, fz = gz - j, k = j * S.gw + i, H = S.H;
  const t = (H[k] * (1 - fx) + H[k + 1] * fx) * (1 - fz) + (H[k + S.gw] * (1 - fx) + H[k + S.gw + 1] * fx) * fz;
  return h + (t - h) * w;
};
/* how much of (x, z) is dune sand (1 inside), and how much is the packed course (for the ground colour and grip) */
Dunes.sand = function (x, z) { const S = Dunes.s; if (!S) return 0; duneLocal(x, z, _duL); return (1 - sstep(DUNE.W / 2 + 10, DUNE.W / 2 + DUNE.BLEND, Math.abs(_duL.u))) * (1 - sstep(DUNE.D / 2 + 10, DUNE.D / 2 + DUNE.BLEND, Math.abs(_duL.v))); };
Dunes.course = function (x, z) {
  const S = Dunes.s; if (!S) return 0; duneLocal(x, z, _duL); const gx = Math.round((_duL.u - S.u0) / DUNE.GS), gz = Math.round((_duL.v - S.v0) / DUNE.GS);
  if (gx < 0 || gz < 0 || gx >= S.gw || gz >= S.gh) return 0; return S.K[gz * S.gw + gx];
};
Dunes.ground = function (x, z, o) { const s = Dunes.sand(x, z); if (s < 0.3 || o.road) return; const k = Dunes.course(x, z); o.mu = 0.66 + 0.12 * k; o.rr = 0.06 - 0.02 * k; o.rough = 0.3; };
Dunes.clearTree = function (x, z) { return Dunes.sand(x, z) > 0.05; };

/* ---------- the world: poles, the start arch, the beam ---------- */
Dunes.build = function () {
  const S = Dunes.s; if (!S || Dunes.built) return; Dunes.built = true;
  const gb = new GB(S.cx, S.cz, false), box = ni(new THREE.BoxGeometry(1, 1, 1)), cyl = ni(new THREE.CylinderGeometry(1, 1, 1, 8, 1)), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'YXZ'), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  const put = (g, x, y, z, yaw, sx, sy, sz, col, rz) => { M.compose(V.set(x, y, z), Q.setFromEuler(E.set(0, yaw, rz || 0)), Sc.set(sx, sy, sz)); gb.geo(g, M, col, 0.2); };
  const OR = lc(0xff7a1a), WH = lc(0xf4f4f0), RED = lc(0xd8262a), BLK = lc(0x15171c), YEL = lc(0xf2c81e), TYRE = lc(0x1a1b1e);
  for (let i = 0; i < S.n; i += 7) for (const sd of [-1, 1]) {
    const x = S.px[i] + S.tz[i] * sd * (DUNE.HW + 1.2), z = S.pz[i] - S.tx[i] * sd * (DUNE.HW + 1.2), y = terrainHeight(x, z), yaw = Math.atan2(S.tx[i], S.tz[i]), c = ((i / 7) | 0) % 2 ? OR : WH;
    put(cyl, x, y + 1.0, z, 0, 0.04, 2.0, 0.04, c); put(box, x + S.tx[i] * 0.3, y + 1.75, z + S.tz[i] * 0.3, yaw, 0.02, 0.36, 0.55, c);   /* a pole with a pennant */
    if (Math.abs(S.k[i]) > 0.02 && sd === Math.sign(S.k[i]) * -1) for (let q = 0; q < 3; q++) put(cyl, x + S.tz[i] * sd * 0.8, y + 0.13 + q * 0.25, z - S.tx[i] * sd * 0.8, 0, 0.4, 0.24, 0.4, q % 2 ? RED : TYRE);   /* tyre stacks on the outside of bends */
  }
  /* the start / finish arch over the course, checkered */
  const st = S.start, ax = S.px[st], az = S.pz[st], yaw = Math.atan2(S.tx[st], S.tz[st]), y0 = terrainHeight(ax, az), half = DUNE.HW + 1.8;
  for (const sd of [-1, 1]) { const x = ax + S.tz[st] * sd * half, z = az - S.tx[st] * sd * half; put(box, x, y0 + 3.2, z, yaw, 0.6, 6.4, 0.6, OR); }
  put(box, ax, y0 + 6.2, az, yaw, half * 2 + 0.6, 1.4, 0.4, WH);
  for (let q = 0; q < 16; q++) for (let r2 = 0; r2 < 2; r2++) if ((q + r2) % 2) { const o = -half + (q + 0.5) * (half * 2 / 16); put(box, ax + S.tz[st] * o + S.tx[st] * 0.21, y0 + 5.85 + r2 * 0.7, az - S.tx[st] * o + S.tz[st] * 0.21, yaw, half * 2 / 16, 0.7, 0.02, BLK); }
  for (let q = 0; q < 14; q++) { const o = -DUNE.HW + (q + 0.5) * (DUNE.HW * 2 / 14); put(box, ax + S.tz[st] * o, terrainHeight(ax + S.tz[st] * o, az - S.tx[st] * o) + 0.03, az - S.tx[st] * o, yaw, DUNE.HW * 2 / 14, 0.04, 0.8, q % 2 ? BLK : WH); }   /* the line */
  /* jump dunes get yellow-and-black marker boards */
  for (const jI of S.jumps) { const i = (jI - 12 + S.n) % S.n; for (const sd of [-1, 1]) { const x = S.px[i] + S.tz[i] * sd * (DUNE.HW + 2.5), z = S.pz[i] - S.tx[i] * sd * (DUNE.HW + 2.5), y = terrainHeight(x, z); put(box, x, y + 0.9, z, Math.atan2(S.tx[i], S.tz[i]), 1.2, 0.8, 0.06, YEL); put(cyl, x, y + 0.4, z, 0, 0.04, 0.8, 0.04, BLK); } }
  const m = gb.mesh(MAT.prop, true, true); m.position.set(S.cx, 0, S.cz);
  Dunes.group = new THREE.Group(); Dunes.group.name = 'dunes'; Dunes.group.add(m); scene.add(Dunes.group);
  const b = Dunes.beam = makeBeam('#ff9a2a', 5, 50); b.position.set(S.ox, terrainHeight(S.ox, S.oz) + 25, S.oz); Dunes.group.add(b);
};
Dunes.setup = function () { Dunes.plan(); if (Dunes.s) Dunes.build(); };

/* ---------- the race ---------- */
/* nearest course sample to (x, z), searching round a hint */
Dunes.locate = function (x, z, hint) {
  const S = Dunes.s, n = S.n; let best = 1e18, bi = hint | 0; const win = hint == null ? n : 40;
  for (let k = -win; k <= win; k++) { const i = ((hint == null ? 0 : hint) + k + n * 4) % n, d = (S.px[i] - x) ** 2 + (S.pz[i] - z) ** 2; if (d < best) { best = d; bi = i; } }
  return bi;
};
/* the corner-speed plan for a rival buggy: friction-limited through the curvature, a backward braking pass */
function duneProfile(b) {
  const S = Dunes.s, n = S.n, v = new Float32Array(n), mu = b.T.mu * 0.66 * b.skill, top = 30 * b.skill;
  for (let i = 0; i < n; i++) { const k = Math.abs(S.k[i]); v[i] = k > 1e-4 ? Math.min(top, Math.sqrt(mu * G / k)) : top; }
  for (let p = 0; p < 2; p++) for (let i = n - 1; i >= 0; i--) { const j = (i + 1) % n, lim = Math.sqrt(v[j] * v[j] + 2 * 5.5 * S.ds); if (lim < v[i]) v[i] = lim; }
  for (const jI of S.jumps) for (let k = -10; k <= 2; k++) { const i = (jI + k + n) % n; v[i] = Math.min(v[i], 22 * b.skill); }   /* steady up the jump faces */
  b.allow = v;
}
function dunePlace(c, i, lat) {
  const S = Dunes.s; i = ((i % S.n) + S.n) % S.n; const x = S.px[i] + S.tz[i] * lat, z = S.pz[i] - S.tx[i] * lat;
  c.x = x; c.z = z; c.yaw = Math.atan2(S.tx[i], S.tz[i]); c.vx = c.vz = c.w = c.speed = 0; c.y = terrainHeight(x, z); c.vy = c.vyPrev = 0; c.air = false; c.pitch = c.roll = 0; c.sY = c.sV = 0;
  c.steer = c.steerIn = 0; c.thr = 0; c.brk = 1; c.gear = 1; c.rpm = 900; c.shift = 0; c.rev = false; c.crashFlag = 0; c.hand = 1;
}
Dunes.start = function () {
  const S = Dunes.s, def = CAR_BY_ID[DUNE.CAR]; if (!S || !def || Dunes.on) return;
  Dunes.prev = save.car; applyCar(DUNE.CAR, true); car.health = 100; car.nitro = tune.nitroMax;
  Dunes.on = true; Dunes.phase = 'grid'; Dunes.count = 3.6; Dunes.t = 0; Dunes.res = null; Dunes.bots = [];
  const slots = [[0, -2.6], [0, 2.6], [-8, -2.6], [-8, 2.6], [-16, -2.6], [-16, 2.6]], me = 3;   /* you start in the middle of the grid */
  for (let k = 0; k < DUNE.N + 1; k++) {
    const sl = slots[k], i = S.start - 4 + Math.round(sl[0] / S.ds);
    if (k === me) { spawnAt(S.px[(i + S.n) % S.n], S.pz[(i + S.n) % S.n], 0); dunePlace(car, i, sl[1]); Dunes.me = { name: 'You', c: car, prog: i - S.start, idx: (i + S.n) % S.n, lap: 0, fin: false, me: true }; continue; }
    const q = Dunes.bots.length, P = Object.assign({ awd: false, rsf: 0.5, ab: 0.5, cf: 10.2, cr: 12.2 }, def.p, { L: def.p.a + def.p.b }), T = { Tmax: def.t.Tmax * (1.02 + 0.03 * q), mu: def.t.mu, cd: def.t.cd, cl: def.t.cl || 0, brk: def.t.brk, off: def.t.off };
    const hl = def.hl, hw = def.body.W / 2, b = { name: DUNE.NAMES[q], P, T, circ: [[hl - 0.45, hw + 0.09], [0, hw + 0.09], [-(hl - 0.45), hw + 0.09]], c: newCarState(), skill: 0.88 + 0.03 * q, lane: (q % 3 - 1) * 2.2, fin: false, lap: 0, stuck: 0 };
    duneProfile(b); dunePlace(b.c, i, sl[1]); b.idx = (i + S.n) % S.n; b.prog = i - S.start; b.mesh = buildCarModel(def, DUNE.COLS[q], { lod: 1 }); scene.add(b.mesh); Dunes.bots.push(b);
  }
  UI.banner('DUNE DASH', DUNE.N + ' rivals · ' + Dunes.laps + ' laps over the dunes'); Snd.beep(660, 0.15);
};
Dunes.end = function (quit) {
  for (const b of Dunes.bots) { scene.remove(b.mesh); disposeCar(b.mesh); } Dunes.bots = [];
  Dunes.on = false; Dunes.phase = 'off'; const prev = Dunes.prev && save.owned[Dunes.prev] ? Dunes.prev : 'rook'; applyCar(prev, true); car.health = 100;
  const S = Dunes.s; spawnAt(S.ox + S.tx[S.start] * 6, S.oz + S.tz[S.start] * 6, Math.atan2(S.tx[S.start], S.tz[S.start])); if (quit) UI.toast('Left the Dune Dash', 'info');
};
/* everyone's progress round the course, in metres (unwrapped): laps and places come from this one number */
function duneTrack(e) {
  const S = Dunes.s, i = Dunes.locate(e.c.x, e.c.z, e.idx); let d = i - e.idx; if (d > S.n / 2) d -= S.n; if (d < -S.n / 2) d += S.n; e.idx = i; e.prog += d;
  const lap = Math.floor(e.prog / S.n); if (lap > e.lap) { e.lap = lap; if (e.me && lap < Dunes.laps) { UI.toast('Lap ' + (lap + 1) + ' of ' + Dunes.laps, 'info'); Snd.beep(880, 0.08); } }
  if (!e.fin && e.prog >= Dunes.laps * S.n) { e.fin = true; e.time = Dunes.t; }
}
Dunes.order = function () { const all = [Dunes.me].concat(Dunes.bots); return all.sort((a, b) => (b.fin && a.fin ? a.time - b.time : b.fin ? 1 : a.fin ? -1 : b.prog - a.prog)); };
Dunes.update = function (dt) {
  const S = Dunes.s; if (!S || !Dunes.built) return;
  if (!Dunes.on) {
    Dunes.beam.visible = true; Dunes.near = !Foot.on && !Fly.on && !Boat.on && !Mi && !Race.on && App.mode === 'play' && Math.hypot(car.x - S.ox, car.z - S.oz) < 9 && Math.abs(car.speed) < 7 && Heist.phase === 'idle'; return;
  }
  Dunes.beam.visible = false; Dunes.near = false;
  if (Foot.on || car.wrecked > 0 || Math.hypot(car.x - S.cx, car.z - S.cz) > 420) { Dunes.end(true); return; }
  if (Dunes.phase === 'grid') {
    car.vx = car.vz = car.w = 0; car.speed = 0; for (const b of Dunes.bots) { b.c.vx = b.c.vz = 0; }
    const was = Math.ceil(Dunes.count - 0.6); Dunes.count -= dt; const now = Math.ceil(Dunes.count - 0.6);
    if (now !== was) { if (now >= 1) { UI.banner(String(now), 'Dune Dash'); Snd.beep(520, 0.1); } else { UI.banner('GO!', 'Dune Dash'); Snd.beep(880, 0.3); Dunes.phase = 'run'; } }
    return;
  }
  Dunes.t += dt; duneTrack(Dunes.me);
  for (const b of Dunes.bots) { duneTrack(b); duneThink(b, dt); }
  /* the player against the rivals: shove apart */
  const all = [car].concat(Dunes.bots.map((b) => b.c));
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const a = all[i], c = all[j], dx = c.x - a.x, dz = c.z - a.z, d = Math.hypot(dx, dz); if (d < 2.4 && d > 0.01 && Math.abs(a.y - c.y) < 1.5) { const nx = dx / d, nz = dz / d, p = (2.4 - d) / 2; a.x -= nx * p; a.z -= nz * p; c.x += nx * p; c.z += nz * p; const rv = (c.vx - a.vx) * nx + (c.vz - a.vz) * nz; if (rv < 0) { a.vx += nx * rv * 0.5; a.vz += nz * rv * 0.5; c.vx -= nx * rv * 0.5; c.vz -= nz * rv * 0.5; } } }
  if (Dunes.me.fin && !Dunes.res) Dunes.finish();
  else if (Dunes.res) { Dunes.endT -= dt; if (Dunes.endT <= 0) Dunes.end(false); }
};
function duneThink(b, dt) {
  const S = Dunes.s, c = b.c, n = S.n, v = Math.max(0.01, c.speed);
  if (b.fin) { c.thr = 0; c.brk = 0.6; }
  const look = Math.round(clamp(5 + v * 0.3, 5, 18)), t = (b.idx + look) % n, lat = b.lane + 1.2 * Math.sin(Dunes.t * 0.3 + b.skill * 20);
  const tx = S.px[t] + S.tz[t] * lat, tz = S.pz[t] - S.tx[t] * lat, dx = tx - c.x, dz = tz - c.z, dist = Math.max(4, Math.hypot(dx, dz));
  const err = Math.atan2(Math.sin(Math.atan2(dx, dz) - c.yaw), Math.cos(Math.atan2(dx, dz) - c.yaw)), dEs = Math.atan2(2 * b.P.L * Math.sin(err), dist);
  const st = clamp(dEs / Math.max(0.05, c.dmax || 0.35), -1, 1); c.steerIn = st; c.steer += clamp(st - c.steer, -dt * 6, dt * 6);
  if (b.fin) return;
  let vt = b.allow[(b.idx + 3) % n]; if (Math.abs(err) > 0.6) vt = Math.min(vt, 8);
  const e = vt - v; c.thr += clamp((e > 0 ? clamp(e / 3 + 0.3, 0, 1) : 0) - c.thr, -dt * 10, dt * 6); c.brk += clamp((e < -1.5 ? clamp(-e / 8, 0, 1) : 0) - c.brk, -dt * 12, dt * 8); c.hand = 0;
  b.stuck = v < 1.2 ? b.stuck + dt : 0;
  const along = Math.sin(c.yaw) * S.tx[b.idx] + Math.cos(c.yaw) * S.tz[b.idx];
  if (b.stuck > 2.5 || along < -0.3 || Math.hypot(c.x - S.px[b.idx], c.z - S.pz[b.idx]) > 30) { dunePlace(c, b.idx + 2, b.lane); c.brk = 0; c.vx = Math.sin(c.yaw) * 6; c.vz = Math.cos(c.yaw) * 6; c.speed = 6; b.stuck = 0; }
}
Dunes.step = function (h) { if (Dunes.phase !== 'run') return; for (const b of Dunes.bots) stepCar(h, b.c, b.P, b.T, b.circ); };
Dunes.visual = function () { for (const b of Dunes.bots) { const c = b.c, m = b.mesh; m.position.set(c.x, c.y + (c.sY || 0) * 0.4, c.z); m.rotation.set(-c.pitch, c.yaw, c.roll, 'YXZ'); m.userData.cs = c; m.userData.v = c.speed; m.userData.steer = clamp(c.delta || 0, -0.6, 0.6); } };
Dunes.finish = function () {
  const ord = Dunes.order(), pos = ord.indexOf(Dunes.me) + 1, prize = DUNE.PRIZE[pos - 1] || 0; Dunes.res = { pos, time: Dunes.me.time, prize };
  save.money += prize; const R = save.dune || (save.dune = { races: 0, wins: 0, best: 0 }); R.races++; if (pos === 1) R.wins++; if (!R.best || Dunes.me.time < R.best) R.best = Dunes.me.time; writeSave();
  UI.banner(pos === 1 ? 'DUNE DASH WON!' : 'FINISHED P' + pos, fmtLap(Dunes.me.time) + (prize ? ' · ' + money(prize) : '')); if (pos === 1) Snd.win(); else Snd.beep(900, 0.2);
  Dunes.endT = 4;   /* a few seconds to see the others home, then the buggy goes back */
};
/* E to race; R back onto the course */
Dunes.key = function (code) {
  if (!Dunes.on) { if (Dunes.near && (code === 'KeyE' || code === 'Enter')) { Dunes.start(); return true; } return false; }
  if (code === 'KeyR') { const i = Dunes.me.idx; dunePlace(car, i, 0); return true; }
  if (code === 'KeyF') return true;
  return false;
};
Dunes.prompt = function (pr) {
  let h = null;
  if (Dunes.on) { const ord = Dunes.order(), pos = ord.indexOf(Dunes.me) + 1, lap = Math.min(Dunes.laps, Dunes.me.lap + 1); h = '<em>DUNE DASH</em> P' + pos + ' / ' + ord.length + ' · lap ' + lap + ' / ' + Dunes.laps + ' · ' + fmtLap(Dunes.t) + ' · R: back on the course'; }
  else if (Dunes.near) h = (TouchIn.on ? '<em>TAP</em> ' : '<em>E</em> ') + 'Dune Dash · race five dune buggies over the dunes · ' + Dunes.laps + ' laps';
  if (!h) return false; if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false; return true;
};
Dunes.drawMini = function (g) {
  const S = Dunes.s; if (!S) return; const p = new Path2D(); p.moveTo(S.px[0], S.pz[0]); for (let i = 2; i < S.n; i += 2) p.lineTo(S.px[i], S.pz[i]); p.closePath();
  g.lineJoin = 'round'; g.strokeStyle = 'rgba(8,12,18,0.9)'; g.lineWidth = 20; g.stroke(p); g.strokeStyle = '#ffb35c'; g.lineWidth = 13; g.stroke(p);
};
Dunes.drawFull = function (g, k) {
  const S = Dunes.s; if (!S) return; g.save(); g.lineJoin = 'round'; g.beginPath(); for (let i = 0; i <= S.n; i += 2) { const s = FM.toScreen(S.px[i % S.n], S.pz[i % S.n]); if (i) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); } g.closePath();
  g.strokeStyle = 'rgba(6,9,14,0.9)'; g.lineWidth = Math.max(4 * k, DUNE.HW * 2 * FM.ppm + 3 * k); g.stroke(); g.strokeStyle = '#ffb35c'; g.lineWidth = Math.max(2.5 * k, DUNE.HW * 2 * FM.ppm); g.stroke();
  const s = FM.toScreen(S.ox, S.oz), r = 7 * k; g.fillStyle = '#ff9a2a'; g.strokeStyle = '#06090e'; g.lineWidth = 2.5 * k; g.beginPath(); g.arc(s[0], s[1], r, 0, TAU); g.fill(); g.stroke();
  g.font = Math.round(9 * k) + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('🏖', s[0], s[1] + 0.5 * k);
  g.font = '700 ' + Math.round(13 * k) + 'px Rajdhani, sans-serif'; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3.5 * k; g.strokeText('DUNE DASH', s[0], s[1] - 16 * k); g.fillText('DUNE DASH', s[0], s[1] - 16 * k);
  g.restore();
};
