/* ================= MARINA =================
   One harbour on the open coast: a levelled concrete quay with a boathouse, a dry-storage shed, fuel pumps, a car park and a sign gantry,
   a timber pier running out over a dredged basin, five finger piers making eight boat slips, a T-head, lamps and an access road to the
   nearest highway. The site is chosen once at world generation (before the highways get their heights). Everything is axis-aligned in the
   world, which keeps terrain shaping, colliders and the deck test trivial; the marina is simply turned to face whichever way the sea lies.
   Local coords: a runs along the shore, s runs out to sea (s = 0 is the quay's waterline row, s > 0 is water), world = O + a*A + s*S.
   Boats live in 06_boat.js and 07_boat.js. */
const MARINA = {
  H0: 1.25, DY: 1.35, DEPTH: -3.4, QW: 62, QL: 46, BL: 160,
  SLAB: [-58, 58, -44, 4], PIER: [-2.6, 2.6, 4, 66], THEAD: [-13, 13, 62.4, 66.4],
  FING: [14, 24, 34, 44, 54], FW: 0.7, FA: 20.6
};
const Dock = { s: null, fail: false, name: 'Marina', built: false, group: null, decks: [], boxes: [], cyls: [], poles: [], lots: [], slipN: 8 };

/* ---------- frame ---------- */
Dock.toWorld = function (a, s, out) { const D = Dock.s; out.x = D.ox + a * D.Ax + s * D.Sx; out.z = D.oz + a * D.Az + s * D.Sz; return out; };
Dock.toLocal = function (x, z, out) { const D = Dock.s, dx = x - D.ox, dz = z - D.oz; out.a = dx * D.Ax + dz * D.Az; out.s = dx * D.Sx + dz * D.Sz; return out; };
const _dkw = { x: 0, z: 0 }, _dkl = { a: 0, s: 0 };
const DOCKPAD = lc(0x8c8a82);

/* ---------- site selection (runs inside genWorld, after the highways exist) ---------- */
Dock.eval = function (ox, oz, Sx, Sz, relax) {
  const Ax = -Sz, Az = Sx, T = (a, s) => terrainNoRoad(ox + a * Ax + s * Sx, oz + a * Az + s * Sz);
  for (const t of towns) if (Math.hypot(t.cx - ox, t.cz - oz) < t.R2 + 90) return null;
  if (Air.s && Air.near(ox, oz, 300)) return null;
  let hmax = 0, hsum = 0, n = 0, bad = 0, tot = 0;
  for (let a = -70; a <= 70; a += 14) for (let s = -10; s >= -66; s -= 14) { const h = T(a, s); tot++; if (h < 0.25) bad++; else { hmax = Math.max(hmax, h); hsum += h; n++; } }
  for (let a = -60; a <= 60; a += 20) for (const s of [14, 40, 80, 120, 160, 190]) { tot++; if (T(a, s) > 0.3) bad++; }
  if (bad > tot * (relax ? 0.34 : 0.18) || n < 10) return null;
  if (hmax > (relax ? 34 : 22)) return null;
  return { hmax, hmean: hsum / n };
};
Dock.pick = function () {
  Dock.s = null; Dock.fail = false;
  const hw = []; for (const r of roads) if (r.kind === 'hw') for (const p of r.pts) hw.push(p);
  for (let pass = 0; pass < 2 && !Dock.s; pass++) {
    let best = null;
    for (let deg = 0; deg < 360; deg += 2) {
      const an = deg * DEG, ca = Math.cos(an), sa = Math.sin(an); let rs = 0;
      for (let r = 3300; r > 1000; r -= 6) if (terrainNoRoad(ca * r, sa * r) > 0.3) { rs = r; break; }
      if (!rs) continue;
      let Sx = 0, Sz = 0; if (Math.abs(ca) >= Math.abs(sa)) Sx = ca > 0 ? 1 : -1; else Sz = sa > 0 ? 1 : -1;
      const px = ca * rs, pz = sa * rs; let ox, oz;
      /* walk landward along the sea axis on grid-aligned rows until the first land row; that row is s = 0 */
      if (Sx) { oz = Math.round(pz / 5) * 5; let x = Math.round((px + Sx * 30) / 5) * 5, found = false; for (let i = 0; i < 40; i++, x -= Sx * 5) if (terrainNoRoad(x, oz) > 0.3) { ox = x; found = true; break; } if (!found) continue; }
      else { ox = Math.round(px / 5) * 5; let z = Math.round((pz + Sz * 30) / 5) * 5, found = false; for (let i = 0; i < 40; i++, z -= Sz * 5) if (terrainNoRoad(ox, z) > 0.3) { oz = z; found = true; break; } if (!found) continue; }
      const ev = Dock.eval(ox, oz, Sx, Sz, pass); if (!ev) continue;
      const ex = ox - Sx * 46, ez = oz - Sz * 46; let bd = 1e9; for (const p of hw) { const d = Math.hypot(p.x - ex, p.z - ez); if (d < bd) bd = d; }
      const score = bd + ev.hmax * 5 + Math.abs(ev.hmean - 6) * 6;
      if (!best || score < best.score) best = { ox, oz, Sx, Sz, score };
    }
    if (best) {
      const D = Dock.s = { ox: best.ox, oz: best.oz, Sx: best.Sx, Sz: best.Sz, Ax: -best.Sz, Az: best.Sx, bx0: 0, bx1: 0, bz0: 0, bz1: 0 };
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (const [a, s] of [[-140, -110], [140, -110], [-140, MARINA.BL + 70], [140, MARINA.BL + 70]]) { Dock.toWorld(a, s, _dkw); x0 = Math.min(x0, _dkw.x); x1 = Math.max(x1, _dkw.x); z0 = Math.min(z0, _dkw.z); z1 = Math.max(z1, _dkw.z); }
      D.bx0 = x0; D.bx1 = x1; D.bz0 = z0; D.bz1 = z1;
    }
  }
  if (!Dock.s) { Dock.fail = true; return; }
  let bd = 1e9; for (const T of towns) { const d = Math.hypot(T.cx - Dock.s.ox, T.cz - Dock.s.oz); if (d < bd) { bd = d; Dock.name = T.name + ' Marina'; } }
  Dock.plan();
};

/* the layout, in local coordinates, turned into world rectangles / solids */
Dock.rect = function (a0, a1, s0, s1) { const p = Dock.toWorld(a0, s0, {}), q = Dock.toWorld(a1, s1, {}); return [Math.min(p.x, q.x), Math.min(p.z, q.z), Math.max(p.x, q.x), Math.max(p.z, q.z)]; };
Dock.solidBox = function (a0, a1, s0, s1, yb, yt, rise, alongA) {
  const r = Dock.rect(a0, a1, s0, s1), D = Dock.s, ax = alongA ? (Math.abs(D.Ax) > 0.5 ? 1 : 2) : 0;
  const o = [r[0], r[1], r[2], r[3], yt, yb, rise || 0, ax, 0]; Dock.boxes.push(o); return o;
};
Dock.plan = function () {
  const M = MARINA, D = Dock.s, Y = M.DY;
  Dock.decks = [M.SLAB.slice(), M.PIER.slice(), M.THEAD.slice()];
  for (const f of M.FING) { Dock.decks.push([-M.FA, -M.PIER[1], f - M.FW, f + M.FW]); Dock.decks.push([M.PIER[1], M.FA, f - M.FW, f + M.FW]); }
  Dock.boxes = []; Dock.cyls = []; Dock.poles = []; Dock.lots = [];
  /* buildings: boathouse (ridge along the shore), dry-storage shed, fuel pumps */
  D.house = [-50, -28, -38, -22]; D.shed = [24, 54, -41, -22]; D.pumps = [[9.8, -3.2], [13.2, -3.2]];
  Dock.solidBox(D.house[0], D.house[1], D.house[2], D.house[3], Y, Y + 4.6, 1.9, true);
  Dock.solidBox(D.shed[0], D.shed[1], D.shed[2], D.shed[3], Y, Y + 7.6, 2.0, true);
  for (const p of D.pumps) Dock.solidBox(p[0] - 0.45, p[0] + 0.45, p[1] - 0.35, p[1] + 0.35, Y, Y + 1.7);
  for (const [a, s] of [[8.2, -5.7], [14.8, -5.7], [8.2, -0.8], [14.8, -0.8]]) Dock.cyls.push([a, s, 0.15, Y, Y + 3.5]);
  Dock.solidBox(8, 15, -6, -0.5, Y + 3.5, Y + 4.0);
  /* sign gantry over the access road, at the landward edge */
  D.gantry = { a: [-9, 9], s: -42.5 };
  for (const a of D.gantry.a) Dock.cyls.push([a, D.gantry.s, 0.32, Y, Y + 7.4]);
  Dock.solidBox(-9, 9, D.gantry.s - 0.25, D.gantry.s + 0.25, Y + 4.9, Y + 7.3);
  /* rails along the main pier (broken at the finger roots), the T-head and the quay edge */
  D.rails = [];
  const edges = [6, ...M.FING.flatMap((f) => [f - 1.5, f + 1.5]), 61.8]; for (let i = 0; i < edges.length; i += 2) for (const sd of [-1, 1]) D.rails.push([sd * 2.5 - 0.06, sd * 2.5 + 0.06, edges[i], edges[i + 1], 1.0]);
  D.rails.push([-13, 13, 66.3, 66.5, 1.0], [-13, -12.8, 62.5, 66.4, 1.0], [12.8, 13, 62.5, 66.4, 1.0]);
  for (const sd of [-1, 1]) D.rails.push([sd * 2.6, sd * 12.9, 62.5, 62.7, 1.0]);
  D.rails.push([-58, -3.2, 3.7, 3.95, 0.5], [3.2, 58, 3.7, 3.95, 0.5]);
  for (const r of D.rails) Dock.solidBox(r[0], r[1], r[2], r[3], Y, Y + r[4]);
  /* lamps */
  for (const s of [18, 38, 58]) for (const sd of [-1, 1]) Dock.poles.push([sd * 2.3, s, 5.2]);
  for (const a of [-50, -26, 26, 50]) Dock.poles.push([a, 2.6, 8.5]);
  for (const a of [-34, -8, 18, 44]) Dock.poles.push([a, -26, 8.5]);
  for (const p of Dock.poles) Dock.cyls.push([p[0], p[1], 0.18, Y, Y + p[2]]);
  /* parked cars (decor) */
  const rnd = mulberry32(88), cols = [0xa9322f, 0x2f4f8f, 0xd8d8d8, 0x222428, 0x3d7a4a, 0xc9a23a, 0x8c8f94]; D.cars = [];
  for (const row of [[-30, -24], [-30, -36]]) for (let a = -24; a <= 20; a += 3.1) {
    if (rnd() < 0.58) continue; const c = cols[(rnd() * cols.length) | 0]; D.cars.push({ a, s: row[0] + (rnd() - 0.5) * 0.5, c }); Dock.solidBox(a - 0.95, a + 0.95, row[0] - 2.2, row[0] + 2.2, Y, Y + 1.5);
  }
  /* crates by the shed */
  D.crates = [[22.4, -30, 2.2], [22.4, -34, 1.6], [56, -30, 2.0]].map((c) => ({ a: c[0], s: c[1], h: c[2] })); for (const c of D.crates) Dock.solidBox(c.a - 1.2, c.a + 1.2, c.s - 1.2, c.s + 1.2, Y, Y + c.h);
  /* eight slips: two sides of the pier, four rows between the five fingers */
  D.slips = []; for (let i = 0; i < Dock.slipN; i++) { const row = i >> 1, side = i & 1 ? 1 : -1; D.slips.push({ i, row, side, s: (M.FING[row] + M.FING[row + 1]) / 2 }); }
};
/* where a boat of length L sits in slip i (stern to the pier, bow out); returns world x, z and yaw */
Dock.slipPos = function (i, L, out) {
  const sl = Dock.s.slips[i], M = MARINA, a = sl.side * (M.PIER[1] + 0.9 + L / 2); Dock.toWorld(a, sl.s, _dkw); out.x = _dkw.x; out.z = _dkw.z;
  const D = Dock.s, fx = sl.side * D.Ax, fz = sl.side * D.Az; out.yaw = Math.atan2(fx, fz); return out;
};

/* ---------- terrain shaping ---------- */
Dock.flat = function (x, z, h) {
  const D = Dock.s; if (x < D.bx0 || x > D.bx1 || z < D.bz0 || z > D.bz1) return h;
  const dx = x - D.ox, dz = z - D.oz, a = Math.abs(dx * D.Ax + dz * D.Az), s = dx * D.Sx + dz * D.Sz, M = MARINA;
  const wa = 1 - sstep(0, 30, Math.max(a - M.QW, 0)); if (wa <= 0) return h;
  if (s <= 0) { const w = wa * (1 - sstep(0, 44, Math.max(-s - M.QL, 0))); return h + (M.H0 - h) * w; }
  const w = wa * (1 - sstep(0, 32, Math.max(s - M.BL, 0)));
  return h + (Math.min(h, M.DEPTH) - h) * w;
};
/* 1 on the levelled quay apron, fading out over its skirt (terrain colour) */
Dock.padW = function (x, z) {
  const D = Dock.s; if (!D || x < D.bx0 || x > D.bx1 || z < D.bz0 || z > D.bz1) return 0;
  const dx = x - D.ox, dz = z - D.oz, a = Math.abs(dx * D.Ax + dz * D.Az), s = dx * D.Sx + dz * D.Sz, M = MARINA; if (s > 0) return 0;
  return (1 - sstep(0, 14, Math.max(a - M.QW, 0))) * (1 - sstep(0, 12, Math.max(-s - M.QL, 0)));
};
/* no trees, rocks or grass on the apron */
Dock.clear = function (x, z, m) {
  const D = Dock.s; if (!D || x < D.bx0 || x > D.bx1 || z < D.bz0 || z > D.bz1) return false;
  const dx = x - D.ox, dz = z - D.oz, a = Math.abs(dx * D.Ax + dz * D.Az), s = dx * D.Sx + dz * D.Sz, M = MARINA;
  return a < M.QW + m && s > -M.QL - m && s < 16;
};
Dock.near = function (x, z, m) { const D = Dock.s; if (!D) return false; Dock.toLocal(x, z, _dkl); return Math.abs(_dkl.a) < MARINA.QW + m && _dkl.s > -MARINA.QL - m && _dkl.s < MARINA.BL + m; };
/* is there timber / concrete under this point (the quay, the pier, a finger)? pad grows every rectangle */
Dock.deck = function (x, z, pad) {
  const D = Dock.s; if (!D || x < D.bx0 || x > D.bx1 || z < D.bz0 || z > D.bz1) return false;
  const dx = x - D.ox, dz = z - D.oz, a = dx * D.Ax + dz * D.Az, s = dx * D.Sx + dz * D.Sz, L = Dock.decks, p = pad || 0;
  for (let i = 0; i < L.length; i++) { const r = L[i]; if (a >= r[0] - p && a <= r[1] + p && s >= r[2] - p && s <= r[3] + p) return true; }
  return false;
};
Dock.centre = function (out) { Dock.toWorld(0, 20, out); return out; };
Dock.dist = function (x, z) { const D = Dock.s; if (!D) return 1e9; Dock.centre(_dkw); return Math.hypot(x - _dkw.x, z - _dkw.z); };

/* ---------- colliders for one chunk ---------- */
Dock.cols = function (ch) {
  const D = Dock.s; if (!D || ch.x0 > D.bx1 || ch.x0 + CHUNK < D.bx0 || ch.z0 > D.bz1 || ch.z0 + CHUNK < D.bz0) return;
  for (const b of Dock.boxes) if (b[2] > ch.x0 && b[0] < ch.x0 + CHUNK && b[3] > ch.z0 && b[1] < ch.z0 + CHUNK) ch.cols.b.push(b.slice());
  for (const c of Dock.cyls) { Dock.toWorld(c[0], c[1], _dkw); if (_dkw.x > ch.x0 - c[2] && _dkw.x < ch.x0 + CHUNK + c[2] && _dkw.z > ch.z0 - c[2] && _dkw.z < ch.z0 + CHUNK + c[2]) colCyl(ch, _dkw.x, _dkw.z, c[2], c[3], c[4], 2); }
};

/* ---------- access road from the car park to the nearest highway ---------- */
Dock.spur = function () {
  const D = Dock.s; if (!D) return;
  Dock.toWorld(0, -41, _dkw); const sx = _dkw.x, sz = _dkw.z, p0x = sx - D.Sx * 40, p0z = sz - D.Sz * 40; let best = null, bd = 1e18;
  for (const r of roads) if (r.kind === 'hw') for (const p of r.pts) { const d = (p.x - p0x) * (p.x - p0x) + (p.z - p0z) * (p.z - p0z); if (d < bd) { bd = d; best = p; } }
  if (!best) return;
  const L = Math.sqrt(bd), nx0 = best.x - p0x, nz0 = best.z - p0z, px = -nz0 / (L || 1), pz = nx0 / (L || 1), n = Math.max(4, Math.round(L / 30)), mid = [{ x: sx, z: sz }, { x: p0x, z: p0z }];
  for (let i = 1; i < n; i++) {
    const t = i / n, dev = Math.sin(Math.PI * t) * (L * 0.07 * noise2(t * 2.1 + 9.3, 4.7) + L * 0.03 * noise2(t * 5.3 + 6.1, 8.9));
    mid.push({ x: p0x + nx0 * t + px * dev, z: p0z + nz0 * t + pz * dev });
  }
  mid.push({ x: best.x, z: best.z });
  const pts = resample(mid, 30), N = pts.length, h = new Float32Array(N), H0 = MARINA.H0 + 0.02;
  for (let i = 0; i < N; i++) h[i] = terrainNoRoad(pts[i].x, pts[i].z);
  for (let pass = 0; pass < 6; pass++) { const t = Float32Array.from(h); for (let i = 2; i < N - 2; i++) h[i] = (t[i - 2] + 2 * t[i - 1] + 3 * t[i] + 2 * t[i + 1] + t[i + 2]) / 9; }
  const K = 6; for (let i = 0; i < Math.min(K, N); i++) { const w = i / K; h[i] = lerp(H0, h[i], w); h[N - 1 - i] = lerp(best.h, h[N - 1 - i], w); }
  h[0] = H0; h[N - 1] = best.h;
  const maxStep = 0.075 * 30;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < N - 1; i++) h[i] = clamp(h[i], h[i - 1] - maxStep, h[i - 1] + maxStep);
    for (let i = N - 2; i > 0; i--) h[i] = clamp(h[i], h[i + 1] - maxStep, h[i + 1] + maxStep);
  }
  for (let i = 0; i < N; i++) pts[i].h = Math.max(h[i], 2.0);
  for (let i = 0; i < Math.min(3, N); i++) pts[i].h = H0;
  pts[N - 1].h = best.h;
  Dock.road = addRoad('hw', pts, 6.5, { name: 'Marina Road', spur: true });
};

/* ---------- map symbols ---------- */
Dock.rectPath = function (g, a0, a1, s0, s1) { Dock.toWorld(a0, s0, _dkw); g.moveTo(_dkw.x, _dkw.z); Dock.toWorld(a1, s0, _dkw); g.lineTo(_dkw.x, _dkw.z); Dock.toWorld(a1, s1, _dkw); g.lineTo(_dkw.x, _dkw.z); Dock.toWorld(a0, s1, _dkw); g.lineTo(_dkw.x, _dkw.z); g.closePath(); };
Dock.drawMini = function (g) {
  const D = Dock.s; if (!D) return;
  g.fillStyle = 'rgba(70,78,92,0.95)'; g.beginPath(); Dock.rectPath(g, -60, 60, -46, 6); g.fill();
  g.fillStyle = '#c9ced6'; g.beginPath(); Dock.rectPath(g, -58, 58, -44, 4); g.fill();
  g.fillStyle = '#a58a62'; g.beginPath(); Dock.rectPath(g, -2.6, 2.6, 4, 66); Dock.rectPath(g, -13, 13, 62.4, 66.4); for (const f of MARINA.FING) { Dock.rectPath(g, -MARINA.FA, -2.6, f - 0.7, f + 0.7); Dock.rectPath(g, 2.6, MARINA.FA, f - 0.7, f + 0.7); } g.fill();
  g.fillStyle = 'rgba(42,168,214,0.95)'; g.beginPath(); Dock.rectPath(g, D.house[0], D.house[1], D.house[2], D.house[3]); Dock.rectPath(g, D.shed[0], D.shed[1], D.shed[2], D.shed[3]); g.fill();
};
Dock.drawFull = function (g, k) {
  const D = Dock.s; if (!D) return; Dock.toWorld(0, 28, _dkw); const s = FM.toScreen(_dkw.x, _dkw.z), u = k * 1.15, x = s[0], y = s[1];
  g.save(); g.fillStyle = '#2aa8d6'; g.strokeStyle = '#06090e'; g.lineWidth = 2 * k; g.beginPath(); g.arc(x, y, 11 * u, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = '#fff'; g.lineWidth = 2.2 * u; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y - 5.5 * u); g.lineTo(x, y + 5.5 * u); g.moveTo(x - 3 * u, y - 2.5 * u); g.lineTo(x + 3 * u, y - 2.5 * u); g.moveTo(x - 5.5 * u, y + 1.5 * u); g.quadraticCurveTo(x - 4.5 * u, y + 6 * u, x, y + 6 * u); g.quadraticCurveTo(x + 4.5 * u, y + 6 * u, x + 5.5 * u, y + 1.5 * u); g.stroke();
  g.beginPath(); g.arc(x, y - 6.6 * u, 1.3 * u, 0, TAU); g.stroke();
  g.font = '700 ' + Math.round(13 * k) + 'px Rajdhani, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3.5 * k; g.strokeText(Dock.name.toUpperCase(), x, y - 20 * k); g.fillText(Dock.name.toUpperCase(), x, y - 20 * k);
  g.restore();
};
