/* ================= THE ISLAND RAILWAY: a train that runs right round the island =================
   One closed loop of track on a concrete viaduct, about 10 km round, kept away from the towns, the airfield, the marina and the raceway and off the high
   ground (Rail.build chooses it before the world's chunks are made, so no tree grows through the deck). The deck runs at least seven metres over the
   ground with a gentle grade, on piers every 30 m (the piers are solid; the deck is overhead, so traffic drives under it).
   The train is a diesel locomotive and seven coaches, every vehicle full size: a coach is 18 m long, 3 m wide and 4 m tall, four car lengths, against
   a car's 4.5 m. Each vehicle sits on its two bogies on the curve and the grade, and the whole train runs round at about 80 km/h. */
const Rail = { pts: null, L: 0, DS: 2, group: null, train: [], s: 0, v: 22, built: false, hash: null, piers: [] };
const RAIL = { R0: 1650, N: 64, CLR: 7.3, DECK: 1.3, W: 5.2, GAUGE: 1.435, GRADE: 0.035, PIER: 30, BOG: 6.4 };

/* the route: a ring of control points, each at the radius that is cheapest (near the middle radius, clear of towns and sites, on land, not on the peaks),
   relaxed against its neighbours so the line sweeps, then a closed spline resampled every 2 m */
Rail.plan = function () {
  const N = RAIL.N, rad = new Float32Array(N), cost = (k, r) => {
    const a = k / N * TAU, x = Math.sin(a) * r, z = Math.cos(a) * r; let c = ((r - RAIL.R0) / 450) ** 2;
    for (const T of towns) { const d = Math.hypot(x - T.cx, z - T.cz) - (T.half * 1.5 + 110); if (d < 0) c += 40 - d / 8; }
    for (const S of [Air.s && { x: (Air.s.x0 + Air.s.x1) / 2, z: (Air.s.z0 + Air.s.z1) / 2, r: Math.hypot(Air.s.x1 - Air.s.x0, Air.s.z1 - Air.s.z0) / 2 + 260 }, Track.s && { x: (Track.s.x0 + Track.s.x1) / 2, z: (Track.s.z0 + Track.s.z1) / 2, r: Math.hypot(Track.s.x1 - Track.s.x0, Track.s.z1 - Track.s.z0) / 2 + 120 }, Dock.s && { x: Dock.s.ox, z: Dock.s.oz, r: 260 }]) {
      if (!S) continue; const d = Math.hypot(x - S.x, z - S.z) - S.r; if (d < 0) c += 40 - d / 8; }
    const h = terrainNoRoad(x, z); if (h < 2) c += 4; if (h > 60) c += (h - 60) / 8; return c;
  };
  const R = []; for (let r = 1000; r <= 2250; r += 25) R.push(r);
  for (let k = 0; k < N; k++) { let b = RAIL.R0, bc = 1e9; for (const r of R) { const c = cost(k, r); if (c < bc) { bc = c; b = r; } } rad[k] = b; }
  const cache = new Map(), cc = (k, r) => { const key = k * 4096 + r; let v = cache.get(key); if (v == null) { v = cost(k, r); cache.set(key, v); } return v; };
  for (let it = 0; it < 8; it++) for (let k = 0; k < N; k++) { const a = rad[(k + N - 1) % N], b = rad[(k + 1) % N]; let best = rad[k], bc = 1e9;
    for (const r of R) { const c = cc(k, r) + 0.00045 * ((r - a) ** 2 + (r - b) ** 2); if (c < bc) { bc = c; best = r; } } rad[k] = best; }
  const P = []; for (let k = 0; k < N; k++) { const a = k / N * TAU; P.push([Math.sin(a) * rad[k], Math.cos(a) * rad[k]]); }
  /* closed Catmull-Rom, sampled finely, then resampled at equal 2 m steps */
  const fine = []; for (let k = 0; k < N; k++) { const p0 = P[(k + N - 1) % N], p1 = P[k], p2 = P[(k + 1) % N], p3 = P[(k + 2) % N];
    for (let t = 0; t < 1; t += 1 / 60) { const t2 = t * t, t3 = t2 * t, f = (i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3); fine.push([f(0), f(1)]); } }
  let Lf = 0; const cum = [0]; for (let i = 1; i <= fine.length; i++) { const a = fine[i - 1], b = fine[i % fine.length]; Lf += Math.hypot(b[0] - a[0], b[1] - a[1]); cum.push(Lf); }
  const n = Math.floor(Lf / Rail.DS), x = new Float32Array(n), z = new Float32Array(n), y = new Float32Array(n), g = new Float32Array(n); let j = 0;
  for (let i = 0; i < n; i++) { const s = i * Lf / n; while (cum[j + 1] < s) j++; const t = (s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]), a = fine[j], b = fine[(j + 1) % fine.length]; x[i] = a[0] + (b[0] - a[0]) * t; z[i] = a[1] + (b[1] - a[1]) * t; }
  /* height: clear the ground (and any road) by the clearance anywhere within 20 m along, never below the sea wall, and no steeper than the grade */
  for (let i = 0; i < n; i++) g[i] = Math.max(terrainHeight(x[i], z[i]), 0);
  const w = Math.round(20 / Rail.DS); for (let i = 0; i < n; i++) { let m = -1e9; for (let k = -w; k <= w; k++) m = Math.max(m, g[(i + k + n) % n]); y[i] = Math.max(m + RAIL.CLR + RAIL.DECK, 9); }
  const dy = RAIL.GRADE * Lf / n; for (let pass = 0; pass < 4; pass++) { for (let i = 1; i < 2 * n; i++) { const a = i % n, b = (i - 1) % n; y[a] = Math.max(y[a], y[b] - dy); } for (let i = 2 * n - 2; i >= 0; i--) { const a = i % n, b = (i + 1) % n; y[a] = Math.max(y[a], y[b] - dy); } }
  for (let pass = 0; pass < 3; pass++) { const t = Float32Array.from(y); for (let i = 0; i < n; i++) y[i] = Math.max(y[i], (t[(i + n - 2) % n] + t[(i + n - 1) % n] + t[i] + t[(i + 1) % n] + t[(i + 2) % n]) / 5); }   /* (only ever raised, so the clearance holds) */
  Rail.pts = { x, z, y, g, n }; Rail.L = Lf; Rail.dsR = Lf / n;
  /* a coarse hash of the line, for "is this point under the track?" (trees, the beach, tests) */
  const H = Rail.hash = new Map(); for (let i = 0; i < n; i++) { const key = Math.floor(x[i] / 50) * 4096 + Math.floor(z[i] / 50); let L = H.get(key); if (!L) H.set(key, L = []); L.push(i); }
  /* piers every 30 m: solid (cars and walkers bump into them) */
  Rail.piers = []; const step = Math.round(RAIL.PIER / Rail.dsR), clear = (i) => { terrainHeight(x[i], z[i]); return !(NR.seg >= 0 && NR.d < NR.halfW + 3); };
  for (let i0 = 0; i0 < n - step / 2; i0 += step) {   /* a pier never stands in a road: it moves along a little, or the span is left longer */
    let i = -1; for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4]) { const q = (i0 + k + n) % n; if (clear(q)) { i = q; break; } } if (i < 0) continue;
    Rail.piers.push({ i, x: x[i], z: z[i], g: g[i], top: y[i] - RAIL.DECK }); }
};
/* the nearest point of the line to (x, z): distance, or 1e9 if it is not within ~50 m */
Rail.dist = function (x, z) {
  if (!Rail.hash) return 1e9; const P = Rail.pts, cx = Math.floor(x / 50), cz = Math.floor(z / 50); let best = 1e9;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const L = Rail.hash.get((cx + a) * 4096 + cz + b); if (!L) continue; for (const i of L) { const d = (P.x[i] - x) ** 2 + (P.z[i] - z) ** 2; if (d < best) best = d; } }
  return Math.sqrt(best);
};
/* position on the line at distance s (wraps): x, y (top of the rail), z and the direction */
Rail.at = function (s, o) {
  const P = Rail.pts, n = P.n, f = (((s % Rail.L) + Rail.L) % Rail.L) / Rail.dsR, i = Math.floor(f) % n, j = (i + 1) % n, t = f - Math.floor(f);
  o.x = P.x[i] + (P.x[j] - P.x[i]) * t; o.z = P.z[i] + (P.z[j] - P.z[i]) * t; o.y = P.y[i] + (P.y[j] - P.y[i]) * t + 0.21; return o;
};
/* pier footprints for a chunk's solids */
Rail.solids = function (ch, x0, z0, x1, z1) { for (const p of Rail.piers || []) if (p.x >= x0 && p.x < x1 && p.z >= z0 && p.z < z1) colCyl(ch, p.x, p.z, 1.15 + 0.03 * (p.top - p.g), p.g - 1, p.top, 2); };

/* ---------- the viaduct ---------- */
function railTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#6d665d'; x.fillRect(0, 0, 64, 128); for (let i = 0; i < 900; i++) { const v = 80 + Math.random() * 70 | 0; x.fillStyle = 'rgb(' + v + ',' + (v - 6) + ',' + (v - 14) + ')'; x.fillRect(Math.random() * 64, Math.random() * 128, 2, 2); }   /* ballast */
  for (let k = 0; k < 2; k++) { const y0 = k * 64 + 22; x.fillStyle = '#4a3a2c'; x.fillRect(4, y0, 56, 20); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(4, y0 + 16, 56, 4); }   /* two sleepers per 1.2 m */
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
Rail.buildViaduct = function () {
  const P = Rail.pts, n = P.n, SEG = 200, grp = Rail.group, CON = lc(0xb9b5ad), COND = lc(0x8f8b84);
  const bedMat = new THREE.MeshStandardMaterial({ map: railTex(), roughness: 0.95, metalness: 0, side: THREE.DoubleSide }), steel = new THREE.MeshStandardMaterial({ color: 0x9a9da2, roughness: 0.35, metalness: 0.8, side: THREE.DoubleSide });
  for (let a = 0; a < n; a += SEG) {
    const b = Math.min(n, a + SEG), cx = P.x[a], cz = P.z[a];
    const gb = new GB(cx, cz, false), bed = { p: [], n: [], u: [] }, rl = { p: [], n: [] };
    const side = (i) => { const j = (i + 1) % n, k = (i + n - 1) % n, tx = P.x[j] - P.x[k], tz = P.z[j] - P.z[k], l = Math.hypot(tx, tz) || 1; return [tz / l, -tx / l]; };   /* the right-hand normal */
    for (let i = a; i < b + 1; i++) {
      const i0 = (i - 1 + n) % n, i1 = i % n; if (i === a) continue; const A = side(i0), B = side(i1), ya = P.y[i0], yb = P.y[i1];
      const q = (o0, h0, o1, h1, col, nx, ny) => { gb.quadA([P.x[i0] + A[0] * o0, ya + h0, P.z[i0] + A[1] * o0, 0, 0], [P.x[i1] + B[0] * o0, yb + h0, P.z[i1] + B[1] * o0, 0, 0], [P.x[i1] + B[0] * o1, yb + h1, P.z[i1] + B[1] * o1, 0, 0], [P.x[i0] + A[0] * o1, ya + h1, P.z[i0] + A[1] * o1, 0, 0], nx * A[0], ny, nx * A[1], col.r, col.g, col.b); };
      const W = RAIL.W / 2;
      q(-W, 0, -1.6, 0, CON, 0, 1); q(1.6, 0, W, 0, CON, 0, 1);                       /* the deck either side of the ballast */
      q(W, 0, W, -RAIL.DECK, COND, 1, 0); q(-W, 0, -W, -RAIL.DECK, COND, -1, 0);       /* its faces */
      q(-W, -RAIL.DECK, W, -RAIL.DECK, COND, 0, -1);                                    /* underneath */
      q(W - 0.22, 0, W - 0.22, 0.95, CON, -1, 0); q(W, 0, W, 0.95, CON, 1, 0); q(W - 0.22, 0.95, W, 0.95, CON, 0, 1);       /* parapets */
      q(-W + 0.22, 0, -W + 0.22, 0.95, CON, 1, 0); q(-W, 0, -W, 0.95, CON, -1, 0); q(-W, 0.95, -W + 0.22, 0.95, CON, 0, 1);
      /* the ballast bed with its sleepers (textured, 1.2 m per repeat) */
      const v0 = (i - 1) * Rail.dsR / 1.2, v1 = i * Rail.dsR / 1.2;
      for (const [V, Q, o, v] of [[A, i0, -1.6, v0], [B, i1, -1.6, v1], [B, i1, 1.6, v1], [A, i0, 1.6, v0]]) { bed.p.push(P.x[Q] + V[0] * o - cx, P.y[Q] + 0.05, P.z[Q] + V[1] * o - cz); bed.n.push(0, 1, 0); bed.u.push(o > 0 ? 1 : 0, v); }
      /* two rails: a head on a web */
      for (const o of [-RAIL.GAUGE / 2, RAIL.GAUGE / 2]) for (const [o0, h0, o1, h1, nx, ny] of [[o - 0.035, 0.21, o + 0.035, 0.21, 0, 1], [o - 0.035, 0.08, o - 0.035, 0.21, -1, 0], [o + 0.035, 0.08, o + 0.035, 0.21, 1, 0]]) {
        const V = [[P.x[i0] + A[0] * o0, ya + h0, P.z[i0] + A[1] * o0], [P.x[i1] + B[0] * o0, yb + h0, P.z[i1] + B[1] * o0], [P.x[i1] + B[0] * o1, yb + h1, P.z[i1] + B[1] * o1], [P.x[i0] + A[0] * o1, ya + h1, P.z[i0] + A[1] * o1]];
        for (const k of [0, 1, 2, 0, 2, 3]) { rl.p.push(V[k][0] - cx, V[k][1], V[k][2] - cz); rl.n.push(nx * A[0], ny, nx * A[1]); } }
    }
    /* the piers in this stretch: a tapered column, a hammerhead cap, and a footing */
    for (const pr of Rail.piers) { if (pr.i < a || pr.i >= b) continue; const S = side(pr.i), yaw = Math.atan2(S[1], -S[0]) + Math.PI / 2, hgt = pr.top - pr.g + 1;
      _railM.compose(_railV.set(pr.x, pr.g - 1 + hgt / 2, pr.z), _railQ.setFromEuler(_railE.set(0, yaw, 0)), _railS.set(1.5 + 0.045 * hgt, hgt, 1.9 + 0.06 * hgt)); gb.geo(RailG.box, _railM, CON, 0.35);   /* tall piers are thicker */
      _railM.compose(_railV.set(pr.x, pr.top - 0.35, pr.z), _railQ, _railS.set(2.4, 0.7, 4.6)); gb.geo(RailG.box, _railM, COND, 0.1);
      _railM.compose(_railV.set(pr.x, pr.g + 0.15, pr.z), _railQ, _railS.set(2.6 + 0.05 * hgt, 0.5, 3.0 + 0.07 * hgt)); gb.geo(RailG.box, _railM, COND, 0); }
    const m = gb.mesh(MAT.prop, true, true); m.position.set(cx, 0, cz); grp.add(m);
    const bg = new THREE.BufferGeometry(), idx = []; bg.setAttribute('position', new THREE.Float32BufferAttribute(bed.p, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(bed.n, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(bed.u, 2));
    for (let k = 0; k < bed.p.length / 3; k += 4) idx.push(k, k + 1, k + 2, k, k + 2, k + 3); bg.setIndex(idx); bg.computeBoundingSphere();
    const bm = new THREE.Mesh(bg, bedMat); bm.position.set(cx, 0, cz); bm.receiveShadow = true; grp.add(bm);
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rl.p, 3)); rg.setAttribute('normal', new THREE.Float32BufferAttribute(rl.n, 3)); rg.computeBoundingSphere();
    const rm = new THREE.Mesh(rg, steel); rm.position.set(cx, 0, cz); grp.add(rm);
  }
};
const _railM = new THREE.Matrix4(), _railV = new THREE.Vector3(), _railQ = new THREE.Quaternion(), _railE = new THREE.Euler(0, 0, 0, 'YXZ'), _railS = new THREE.Vector3();
const RailG = {};

/* ---------- the train ---------- */
/* one vehicle, built along +z with its middle at the origin and the top of the rail at y = 0. loco: the nose with the cab is at +z */
function railVehicle(loco, L) {
  const gb = new GB(0, 0, false), B = RailG.box, C = RailG.cyl, put = (g, x, y, z, sx, sy, sz, col, sh, rx, ry, rz) => { _railM.compose(_railV.set(x, y, z), _railQ.setFromEuler(_railE.set(rx || 0, ry || 0, rz || 0)), _railS.set(sx, sy, sz)); gb.geo(g, _railM, col, sh || 0); };
  const BODY = loco ? lc(0xc8302a) : lc(0xe9e6df), BAND = loco ? lc(0xf2c81e) : lc(0x1f5fa8), ROOF = lc(0x8c9096), WIN = lc(0x1b2430), DARK = lc(0x26282c), WHL = lc(0x3a3c40), GLASS = lc(0x30485e), LAMP = lc(0xfff2c0);
  const W = 3.0, y0 = 1.1, H = 3.0, half = L / 2;
  put(B, 0, y0 + H / 2, loco ? -0.5 : 0, W, H, loco ? L - 1 : L, BODY, 0.15);                        /* the body */
  put(B, 0, y0 + 0.55, 0, W + 0.02, 0.32, L - 0.2, BAND, 0);                                          /* the livery band */
  put(C, 0, y0 + H, loco ? -0.5 : 0, W / 2, (loco ? L - 1 : L) - 0.1, 0.34, ROOF, 0.1, Math.PI / 2, 0, 0);   /* the curved roof */
  put(B, 0, y0 - 0.25, 0, W - 0.3, 0.5, L - 1.6, DARK, 0);                                            /* the underframe and tanks */
  if (!loco) {
    for (let k = 0; k < 7; k++) { const z = -half + 2.6 + k * ((L - 5.2) / 6); put(B, W / 2 + 0.005, y0 + 1.75, z, 0.02, 0.85, 1.6, WIN, 0); put(B, -W / 2 - 0.005, y0 + 1.75, z, 0.02, 0.85, 1.6, WIN, 0); }   /* windows */
    for (const z of [-half + 1.1, half - 1.1]) for (const sd of [-1, 1]) put(B, sd * (W / 2 + 0.01), y0 + 1.25, z, 0.02, 2.1, 0.95, lc(0x9aa0a6), 0);   /* doors */
    for (const z of [-half - 0.15, half + 0.15]) put(B, 0, y0 + 1.5, z, 1.2, 2.3, 0.3, DARK, 0);       /* gangways */
  } else {
    put(B, 0, y0 + H / 2 - 0.2, half - 0.75, W - 0.1, H - 0.4, 1.5, BODY, 0.1);                     /* the cab */
    put(B, 0, y0 + H - 0.55, half - 0.02, W - 0.5, 0.75, 0.04, GLASS, 0, -0.35, 0, 0);                /* the windscreen */
    for (const sd of [-1, 1]) { put(B, sd * (W / 2 + 0.005), y0 + H - 0.6, half - 1.0, 0.02, 0.7, 1.0, GLASS, 0); put(B, sd * 0.85, y0 + 0.6, half + 0.01, 0.3, 0.2, 0.04, LAMP, 0); }
    put(B, 0, y0 + 0.2, half + 0.1, W - 0.2, 0.5, 0.25, DARK, 0);                                      /* the buffer beam */
    for (let k = 0; k < 6; k++) for (const sd of [-1, 1]) put(B, sd * (W / 2 + 0.005), y0 + 2.1, -half + 2.5 + k * 1.6, 0.02, 0.5, 1.2, DARK, 0);   /* engine-room grilles */
    put(B, 0, y0 + H + 0.32, -1.5, 1.0, 0.25, 3.0, DARK, 0);                                           /* the exhaust and fans */
  }
  for (const zb of [-RAIL.BOG, RAIL.BOG]) {                                                             /* the bogies: a frame and four wheels */
    put(B, 0, 0.55, zb, 2.3, 0.35, 2.8, DARK, 0);
    for (const dz of [-0.95, 0.95]) for (const sd of [-1, 1]) put(C, sd * RAIL.GAUGE / 2, 0.46, zb + dz, 0.46, 0.14, 0.46, WHL, 0, 0, 0, Math.PI / 2);
  }
  const m = gb.mesh(MAT.prop, true, false); m.matrixAutoUpdate = true; return m;
}
Rail.build = function () {
  if (Rail.built) return; Rail.built = true;
  RailG.box = ni(new THREE.BoxGeometry(1, 1, 1)); RailG.cyl = ni(new THREE.CylinderGeometry(1, 1, 1, 14, 1));
  Rail.plan(); Rail.group = new THREE.Group(); Rail.group.name = 'railway'; scene.add(Rail.group); Rail.buildViaduct();
  const cars = [[true, 19]]; for (let k = 0; k < 7; k++) cars.push([false, 18]);
  let off = 0; Rail.train = cars.map(([loco, L]) => { const m = railVehicle(loco, L); Rail.group.add(m); const o = { m, L, off: off + L / 2 }; off += L + 0.6; return o; });
  Rail.s = Rail.L * 0.37; Rail.update(0);
};
const _rlA = {}, _rlB = {};
Rail.update = function (dt) {
  if (!Rail.built) return;
  Rail.s = (Rail.s + Rail.v * dt) % Rail.L;
  for (const t of Rail.train) {
    const sc = Rail.s - t.off; Rail.at(sc + RAIL.BOG, _rlA); Rail.at(sc - RAIL.BOG, _rlB);
    const dx = _rlA.x - _rlB.x, dz = _rlA.z - _rlB.z, dy = _rlA.y - _rlB.y, d = Math.hypot(dx, dz);
    t.m.position.set((_rlA.x + _rlB.x) / 2, (_rlA.y + _rlB.y) / 2, (_rlA.z + _rlB.z) / 2); t.m.rotation.set(-Math.atan2(dy, d), Math.atan2(dx, dz), 0, 'YXZ');
  }
};
