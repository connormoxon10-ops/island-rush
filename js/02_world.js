/* ================= WORLD DATA ================= */
const CHUNK = 160, GRID = 32, WORLD_R = 3000, SEGC = 64;
const TOWN_NAMES = ['Port Marlow', 'Redstone', 'Eastvale', 'Cape Harlow', 'Summit Ridge', 'Lakeshore', 'Fairhaven'];
const towns = [], roads = [], segs = [], segHash = new Map(), roadsByChunk = new Map(), links = [];
const NR = { seg: -1, d: 1e9, h: 0, t: 0, halfW: 0, flat: 0, infl: 0 };
const ckey = (cx, cz) => (cx + 512) * 1024 + (cz + 512);
const sk = (ix, iz) => (ix + 2048) * 4096 + (iz + 2048);

function rawHeight(x, z) {
  const rr = Math.sqrt(x * x + z * z);
  const warp = noise2(x * 0.0011 + 5.3, z * 0.0011 - 2.1) * 420 + noise2(x * 0.0045, z * 0.0045) * 70;
  const edge = sstep(2000, 2800, rr + warp);
  const n1 = fbm(x * 0.0009, z * 0.0009, 4);
  let h = 26 + n1 * 30;
  const mm = sstep(0.02, 0.42, fbm(x * 0.0007 + 11.7, z * 0.0007 - 4.2, 3) + 0.08);
  const rid = 1 - Math.abs(noise2(x * 0.0026 + 3.1, z * 0.0026 + 9.7) * 1.35);
  h += mm * Math.pow(clamp(rid, 0, 1), 2.0) * (95 + 60 * noise2(x * 0.0011, z * 0.0011 + 8));
  h += fbm(x * 0.018, z * 0.018, 3) * 2.6 + noise2(x * 0.08, z * 0.08) * 0.35;
  const lk = fbm(x * 0.0017 - 40, z * 0.0017 + 17, 3);
  h -= sstep(0.24, 0.42, lk) * 36 * (1 - mm * 0.9);
  return lerp(h, -24, edge);
}

function makeTown(id, cx, cz) {
  const N = 6, cell = 84, half = N * cell / 2;
  let hs = 0; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) hs += rawHeight(cx + i * half * 0.5, cz + j * half * 0.5);
  const baseH = Math.max(6, hs / 25);
  const R1 = half * 1.42 + 14;
  return { id, name: TOWN_NAMES[id % TOWN_NAMES.length], cx, cz, N, cell, half, baseH, R1, R2: R1 + 160, x0: cx - half, z0: cz - half };
}

function genTowns() {
  const r = mulberry32(20241);
  for (let tries = 0; tries < 9000 && towns.length < 7; tries++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 1900;
    const cx = Math.round(Math.cos(a) * d / 10) * 10, cz = Math.round(Math.sin(a) * d / 10) * 10;
    const relax = tries > 3500 ? 1 : 0;
    const h = rawHeight(cx, cz);
    if (h < 9 || h > (relax ? 70 : 52)) continue;
    let hmin = 1e9, hmax = -1e9;
    for (let k = 0; k < 12; k++) { const aa = k * TAU / 12, rr = k % 2 ? 230 : 330; const hh = rawHeight(cx + Math.cos(aa) * rr, cz + Math.sin(aa) * rr); hmin = Math.min(hmin, hh); hmax = Math.max(hmax, hh); }
    if (hmin < 3 || hmax - hmin > (relax ? 40 : 28)) continue;
    let ok = true; for (const t of towns) if (Math.hypot(t.cx - cx, t.cz - cz) < (relax ? 800 : 1050)) { ok = false; break; }
    if (!ok) continue;
    towns.push(makeTown(towns.length, cx, cz));
  }
}

function terrainNoRoad(x, z) {
  let h = Biome.shape(x, z, rawHeight(x, z));
  for (let k = 0; k < towns.length; k++) {
    const T = towns[k]; const dx = x - T.cx, dz = z - T.cz;
    if (Math.abs(dx) > T.R2 || Math.abs(dz) > T.R2) continue;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < T.R2) { const w = 1 - sstep(T.R1, T.R2, d); h += (T.baseH - h) * w; }
  }
  if (Air.s) h = Air.flat(x, z, h);
  if (Track.s) h = Track.flat(x, z, h);
  return Dock.s ? Dock.flat(x, z, h) : h;
}

function nearestRoad(x, z) {
  NR.seg = -1; NR.d = 1e9;
  const arr = segHash.get(sk(Math.floor(x / SEGC), Math.floor(z / SEGC)));
  if (!arr) return;
  let best = 1e18, bi = -1, bt = 0;
  for (let k = 0; k < arr.length; k++) {
    const s = segs[arr[k]];
    const px = x - s.ax, pz = z - s.az;
    let t = (px * s.dx + pz * s.dz) * s.il2; t = t < 0 ? 0 : (t > 1 ? 1 : t);
    const qx = px - s.dx * t, qz = pz - s.dz * t;
    const d2 = qx * qx + qz * qz;
    if (d2 < best) { best = d2; bi = arr[k]; bt = t; }
  }
  if (bi >= 0) { const s = segs[bi]; NR.seg = bi; NR.d = Math.sqrt(best); NR.t = bt; NR.h = s.ah + (s.bh - s.ah) * bt; NR.halfW = s.halfW; NR.flat = s.halfW + 6; NR.infl = s.halfW + 34; }
}

function terrainHeight(x, z) {
  if (Rally.on) return RY.heightAt(x, z);
  if (Drag.on) return DG.Y;
  if (Derby.on) return DD.Y;   /* the rally stage replaces the island while it is running */
  let h = terrainNoRoad(x, z);
  nearestRoad(x, z);
  if (NR.seg >= 0 && NR.d < NR.infl) { const w = 1 - sstep(NR.flat, NR.infl, NR.d); h += (NR.h - h) * w; }
  return h;
}

function townAt(x, z, m) {
  for (let k = 0; k < towns.length; k++) { const T = towns[k]; if (Math.abs(x - T.cx) < T.half + m && Math.abs(z - T.cz) < T.half + m) return T; }
  return null;
}

/* ground sample with surface properties (used by physics) */
function groundAt(x, z, o) {
  if (Rally.on) { RY.ground(x, z, o); return; }
  if (Drag.on) { Drag.ground(x, z, o); return; }
  if (Derby.on) { Derby.ground(x, z, o); return; }
  if (Track.s && x >= Track.s.x0 && x <= Track.s.x1 && z >= Track.s.z0 && z <= Track.s.z1) {   /* the whole race site is one flat height: skip the terrain noise */
    const pv = Track.paved(x, z); o.h = Track.s.H0 + (pv ? 0.07 : 0); o.mu = pv ? 1.0 : 0.74; o.rr = pv ? 0.014 : 0.05; o.rough = pv ? 0.012 : 0.22; o.road = pv; o.water = false; return;
  }
  let h = terrainHeight(x, z);
  let mu = 0.72, rr = 0.045, rough = 0.35, road = false;
  if (NR.seg >= 0) {
    if (NR.d <= NR.halfW + 0.3) { road = true; h += 0.12 * (1 - sstep(NR.halfW - 0.3, NR.halfW + 0.3, NR.d)); mu = 1.0; rr = 0.015; rough = 0.02; }
    else if (NR.d <= NR.flat + 1) { mu = 0.82; rr = 0.03; rough = 0.14; }
  }
  if (Air.s && Air.paved(x, z)) { road = true; h += 0.07; mu = 1.0; rr = 0.014; rough = 0.015; }
  if (Dock.s && Dock.deck(x, z)) { road = true; h = MARINA.DY; mu = 1.0; rr = 0.02; rough = 0.03; }
  if (!road && mu < 0.8) {
    if (townAt(x, z, 8)) { mu = 0.95; rr = 0.025; rough = 0.06; }
    else if (h < 2.4) { mu = 0.55; rr = 0.09; rough = 0.3; }
    else if (h > 90) { mu = 0.78; rr = 0.05; rough = 0.5; }
  }
  if (towns.length) { mu *= road ? Biome.mod(x, z, 'grip') : Biome.mod(x, z, 'gripOff'); if (!road && Biome.w0 < 0.9) rr *= 1 + (1 - Biome.mod(x, z, 'gripOff')) * 0.8; }
  o.h = h; o.mu = mu; o.rr = rr; o.rough = rough; o.road = road; o.water = h < -0.4;
}

/* ---------------- roads ---------------- */
function addRoad(kind, pts, halfW, extra) {
  const r = Object.assign({ kind, pts, halfW, id: roads.length, cum: [0], len: 0 }, extra || {});
  for (let i = 1; i < pts.length; i++) r.cum.push(r.cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  r.len = r.cum[r.cum.length - 1];
  roads.push(r);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]; const dx = b.x - a.x, dz = b.z - a.z; const l2 = dx * dx + dz * dz;
    segs.push({ ax: a.x, az: a.z, dx, dz, il2: l2 > 0 ? 1 / l2 : 0, ah: a.h, bh: b.h, halfW, road: r.id, i });
  }
  return r;
}

function resample(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]; const d = Math.hypot(b.x - a.x, b.z - a.z); const n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) { const t = k / n; out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }); }
  }
  return out;
}

function gateFor(T, O) {
  const dirx = O.cx - T.cx, dirz = O.cz - T.cz, dl = Math.hypot(dirx, dirz) || 1;
  let best = null, bd = -9;
  for (let i = 0; i <= T.N; i++) for (let j = 0; j <= T.N; j++) {
    if (i !== 0 && i !== T.N && j !== 0 && j !== T.N) continue;
    const nx = T.x0 + i * T.cell, nz = T.z0 + j * T.cell;
    const vx = nx - T.cx, vz = nz - T.cz, vl = Math.hypot(vx, vz);
    const sc = (vx * dirx + vz * dirz) / (vl * dl);
    if (sc > bd) {
      bd = sc;
      let ox = 0, oz = 0; if (i === 0) ox = -1; else if (i === T.N) ox = 1; if (j === 0) oz = -1; else if (j === T.N) oz = 1;
      const ol = Math.hypot(ox, oz) || 1;
      best = { x: nx, z: nz, ox: ox / ol, oz: oz / ol };
    }
  }
  return best;
}

function makeHighway(ia, ib, idx) {
  const A = towns[ia], B = towns[ib];
  const ga = gateFor(A, B), gb = gateFor(B, A);
  const P1 = { x: ga.x + ga.ox * 70, z: ga.z + ga.oz * 70 }, P2 = { x: gb.x + gb.ox * 70, z: gb.z + gb.oz * 70 };
  const dx = P2.x - P1.x, dz = P2.z - P1.z, L = Math.hypot(dx, dz) || 1;
  const nx = -dz / L, nz = dx / L;
  const n = Math.max(6, Math.round(L / 30));
  const mid = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const dev = Math.sin(Math.PI * t) * (L * 0.12 * noise2(t * 2.3 + idx * 7.7, idx * 3.1 + 0.5) + L * 0.05 * noise2(t * 6.3 + idx * 2.3, idx * 5.9 + 1.5));
    mid.push({ x: P1.x + dx * t + nx * dev, z: P1.z + dz * t + nz * dev });
  }
  const pts = resample([{ x: ga.x, z: ga.z }, ...mid, { x: gb.x, z: gb.z }], 30);
  const N = pts.length; const h = new Float32Array(N);
  for (let i = 0; i < N; i++) h[i] = terrainNoRoad(pts[i].x, pts[i].z);
  for (let pass = 0; pass < 6; pass++) { const t = Float32Array.from(h); for (let i = 2; i < N - 2; i++) h[i] = (t[i - 2] + 2 * t[i - 1] + 3 * t[i] + 2 * t[i + 1] + t[i + 2]) / 9; }
  const K = 8;
  for (let i = 0; i < Math.min(K, N); i++) { const w = i / K; h[i] = lerp(A.baseH, h[i], w); h[N - 1 - i] = lerp(B.baseH, h[N - 1 - i], w); }
  h[0] = A.baseH; h[N - 1] = B.baseH;
  const maxStep = 0.075 * 30;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < N - 1; i++) h[i] = clamp(h[i], h[i - 1] - maxStep, h[i - 1] + maxStep);
    for (let i = N - 2; i > 0; i--) h[i] = clamp(h[i], h[i + 1] - maxStep, h[i + 1] + maxStep);
  }
  for (let i = 0; i < N; i++) { pts[i].h = Math.max(h[i], 2.4); }
  pts[0].h = A.baseH; pts[N - 1].h = B.baseH;
  const r = addRoad('hw', pts, 6.5, { a: ia, b: ib, gateA: ga, gateB: gb, name: 'Route ' + (idx + 1) });
  return r;
}

function segIntersect(a, b, c, d) {
  const o = (p, q, r) => (q.cx - p.cx) * (r.cz - p.cz) - (q.cz - p.cz) * (r.cx - p.cx);
  return (o(a, b, c) * o(a, b, d) < 0) && (o(c, d, a) * o(c, d, b) < 0);
}

function genLinks() {
  const n = towns.length, pairs = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push({ a: i, b: j, d: Math.hypot(towns[i].cx - towns[j].cx, towns[i].cz - towns[j].cz) });
  pairs.sort((p, q) => p.d - q.d);
  const uf = []; for (let i = 0; i < n; i++) uf.push(i);
  const find = (x) => { while (uf[x] !== x) { uf[x] = uf[uf[x]]; x = uf[x]; } return x; };
  const deg = new Array(n).fill(0);
  for (const p of pairs) { if (find(p.a) !== find(p.b)) { uf[find(p.a)] = find(p.b); links.push(p); deg[p.a]++; deg[p.b]++; p.used = true; } }
  let extra = 0;
  for (const p of pairs) {
    if (p.used || extra >= 3 || p.d > 1800 || deg[p.a] >= 3 || deg[p.b] >= 3) continue;
    let cross = false;
    for (const l of links) { if (l.a === p.a || l.a === p.b || l.b === p.a || l.b === p.b) continue; if (segIntersect(towns[p.a], towns[p.b], towns[l.a], towns[l.b])) { cross = true; break; } }
    if (!cross) { links.push(p); p.used = true; deg[p.a]++; deg[p.b]++; extra++; }
  }
}

function makeTownStreets(T) {
  const step = T.cell / 2;
  for (let i = 0; i <= T.N; i++) {
    const x = T.x0 + i * T.cell, pts = [];
    for (let k = 0; k <= T.N * 2; k++) pts.push({ x, z: T.z0 + k * step, h: T.baseH });
    addRoad('st', pts, 7, { town: T.id, axis: 'z' });
    const z = T.z0 + i * T.cell, p2 = [];
    for (let k = 0; k <= T.N * 2; k++) p2.push({ x: T.x0 + k * step, z, h: T.baseH });
    addRoad('st', p2, 7, { town: T.id, axis: 'x' });
  }
}

function buildHash() {
  for (let si = 0; si < segs.length; si++) {
    const s = segs[si]; const infl = s.halfW + 34;
    const x0 = Math.min(s.ax, s.ax + s.dx) - infl, x1 = Math.max(s.ax, s.ax + s.dx) + infl;
    const z0 = Math.min(s.az, s.az + s.dz) - infl, z1 = Math.max(s.az, s.az + s.dz) + infl;
    for (let ix = Math.floor(x0 / SEGC); ix <= Math.floor(x1 / SEGC); ix++) for (let iz = Math.floor(z0 / SEGC); iz <= Math.floor(z1 / SEGC); iz++) {
      const k = sk(ix, iz); let a = segHash.get(k); if (!a) { a = []; segHash.set(k, a); } a.push(si);
    }
    const mx = s.ax + s.dx / 2, mz = s.az + s.dz / 2; const key = ckey(Math.floor(mx / CHUNK), Math.floor(mz / CHUNK));
    let arr = roadsByChunk.get(key); if (!arr) { arr = []; roadsByChunk.set(key, arr); } arr.push([s.road, s.i]);
  }
}

function genWorld() {
  genTowns();
  genLinks();
  links.forEach((l, i) => { const r = makeHighway(l.a, l.b, i); l.road = r.id; l.len = r.len; });
  towns.forEach(makeTownStreets);
  Air.pick(); Air.spur(); Dock.pick(); Dock.spur(); Track.pick(); Track.spur();
  buildHash();
}

/* nearest road point anywhere (ring search through the hash) */
function findNearestRoadPoint(x, z, out) {
  const ix = Math.floor(x / SEGC), iz = Math.floor(z / SEGC);
  let best = 1e18, bs = -1, bt = 0;
  for (let r = 0; r < 60; r++) {
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const arr = segHash.get(sk(ix + dx, iz + dz)); if (!arr) continue;
      for (let k = 0; k < arr.length; k++) {
        const s = segs[arr[k]]; const px = x - s.ax, pz = z - s.az;
        let t = (px * s.dx + pz * s.dz) * s.il2; t = t < 0 ? 0 : (t > 1 ? 1 : t);
        const qx = px - s.dx * t, qz = pz - s.dz * t; const d2 = qx * qx + qz * qz;
        if (d2 < best) { best = d2; bs = arr[k]; bt = t; }
      }
    }
    if (bs >= 0 && r * SEGC > Math.sqrt(best) + SEGC) break;
  }
  if (bs < 0) return false;
  const s = segs[bs], l = Math.sqrt(s.dx * s.dx + s.dz * s.dz) || 1;
  out.x = s.ax + s.dx * bt; out.z = s.az + s.dz * bt; out.tx = s.dx / l; out.tz = s.dz / l;
  out.h = lerp(s.ah, s.bh, bt); out.road = s.road; out.s = roads[s.road].cum[s.i] + l * bt; out.dist = Math.sqrt(best);
  return true;
}

/* position along a road at arc length s (clamped) */
function roadPoint(r, s, out) {
  s = clamp(s, 0, r.len);
  let lo = 0, hi = r.cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.cum[m] <= s) lo = m; else hi = m; }
  const a = r.pts[lo], b = r.pts[hi]; const l = r.cum[hi] - r.cum[lo] || 1; const t = (s - r.cum[lo]) / l;
  out.x = a.x + (b.x - a.x) * t; out.z = a.z + (b.z - a.z) * t; out.h = a.h + (b.h - a.h) * t;
  out.tx = (b.x - a.x) / l; out.tz = (b.z - a.z) / l; out.seg = lo;
  return out;
}

/* ---------- town graph routing (for GPS) ---------- */
function townPath(from, to) {
  const n = towns.length, dist = new Array(n).fill(1e9), prev = new Array(n).fill(-1), prevLink = new Array(n).fill(-1), done = new Array(n).fill(false);
  dist[from] = 0;
  for (let it = 0; it < n; it++) {
    let u = -1; for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] >= 1e9) break; done[u] = true;
    links.forEach((l, li) => { let v = -1; if (l.a === u) v = l.b; else if (l.b === u) v = l.a; if (v >= 0 && dist[u] + l.len < dist[v]) { dist[v] = dist[u] + l.len; prev[v] = u; prevLink[v] = li; } });
  }
  const path = []; let c = to;
  while (c !== from && prev[c] >= 0) { path.unshift({ link: prevLink[c], from: prev[c], to: c }); c = prev[c]; }
  return { dist: dist[to], hops: path };
}
