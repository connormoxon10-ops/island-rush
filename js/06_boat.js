/* ================= BOAT MODELS =================
   Tern (open fishing skiff), Surge (jet ski), Marlin (bowrider speedboat) and Odyssey (cabin cruiser with a flybridge).
   Every hull is lofted from stations along its length (keel, chine, waterline, stripe, sheer) with its own vertex colours, then closed
   with a transom, a flat or cambered deck where it has one, and an inner shell where it is open. Models face +Z, the left side is +X,
   and y = 0 is the waterline. Fittings are merged per material; the skipper is a separate small group so it can follow the outfit. */
const BSPEC = {
  tern: { id: 'tern', name: 'Tern', role: 'Fishing skiff', blurb: 'Slow, stable and cheap. Hard to get wrong.', cost: 800, slip: 0, L: 4.8, B: 1.9, free: 0.62, draft: 0.22, bow: 2.0,
    Vmax: 13, acc: 3.4, yawMax: 1.3, kr: 3.4, kLat: 2.5, boost: false, hump: 0.035, rev: 0.4, eye: [0, 1.78, -0.9], chase: [8.2, 3.0], far: [18, 7], wake: 0.7, tag: 2.6,
    hull: { deck: [], floor: 0.16, chine: 0.84, wall: 0.06 }, snd: { f: 30, lp: 520, hiss: 0.5, saw: 'sawtooth' } },
  surge: { id: 'surge', name: 'Surge', role: 'Jet ski', blurb: 'Light, twitchy and very fast for its size.', cost: 1900, slip: 1, L: 3.2, B: 1.15, free: 0.4, draft: 0.17, bow: 2.2,
    Vmax: 26, acc: 9.5, yawMax: 2.05, kr: 5.2, kLat: 1.1, boost: true, hump: 0.09, rev: 0.25, eye: [0, 1.5, -0.15], chase: [6.4, 2.3], far: [15, 5.5], wake: 0.9, tag: 2.0,
    hull: { deck: [[0, 1]], floor: 0.1, chine: 0.78, wall: 0.05 }, snd: { f: 62, lp: 900, hiss: 0.9, saw: 'sawtooth' } },
  marlin: { id: 'marlin', name: 'Marlin', role: 'Bowrider', blurb: 'A proper speedboat. Planes at speed and carves hard.', cost: 4200, slip: 2, L: 6.6, B: 2.4, free: 0.78, draft: 0.34, bow: 2.4,
    Vmax: 30, acc: 6.8, yawMax: 1.1, kr: 2.7, kLat: 2.0, boost: true, hump: 0.15, rev: 0.3, eye: [-0.62, 1.55, -0.55], chase: [10.2, 3.6], far: [23, 8.5], wake: 1.2, tag: 3.0,
    hull: { deck: [[0.58, 1]], floor: 0.24, chine: 0.82, wall: 0.07 }, snd: { f: 46, lp: 760, hiss: 0.8, saw: 'sawtooth' } },
  odyssey: { id: 'odyssey', name: 'Odyssey', role: 'Cabin cruiser', blurb: 'Heavy, comfortable and slow to turn. Plenty of flybridge.', cost: 9800, slip: 3, L: 11.6, B: 3.9, free: 1.05, draft: 0.7, bow: 2.5,
    Vmax: 17, acc: 2.7, yawMax: 0.58, kr: 1.4, kLat: 3.4, boost: false, hump: 0.02, rev: 0.3, eye: [-0.45, 4.4, -0.05], chase: [17, 6.2], far: [34, 12.5], wake: 1.7, tag: 6.2,
    hull: { deck: [[0.2, 1]], floor: 0.3, chine: 0.8, wall: 0.1 }, snd: { f: 26, lp: 420, hiss: 0.6, saw: 'sawtooth' } }
};
const BIDS = ['tern', 'surge', 'marlin', 'odyssey'];
const BLIV = {
  tern: [{ hull: 0xaeb6b8, acc: 0xe06a22, deck: 0xd8d6cc }, { hull: 0x2d5a86, acc: 0xf0f0ea, deck: 0xd8d6cc }],
  surge: [{ hull: 0xf2f2f0, acc: 0x18b6d8, deck: 0x20242a }, { hull: 0xe8402e, acc: 0x15181c, deck: 0x20242a }],
  marlin: [{ hull: 0xf4f4f2, acc: 0x1c5fb8, deck: 0xe9e6dc }, { hull: 0x1c2a44, acc: 0xe9b32a, deck: 0xe9e6dc }],
  odyssey: [{ hull: 0xf6f6f3, acc: 0x15766f, deck: 0xcfcabd }, { hull: 0xf6f6f3, acc: 0x7a1f2b, deck: 0xcfcabd }]
};
const BM = { ready: false };
function boatInit() {
  if (BM.ready) return; BM.ready = true;
  BM.paint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.26, metalness: 0.06, side: THREE.DoubleSide });
  BM.fit = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.12, side: THREE.DoubleSide });
  BM.glass = new THREE.MeshStandardMaterial({ color: lc(0x1d3447), roughness: 0.06, metalness: 0.6, transparent: true, opacity: 0.46, side: THREE.DoubleSide, depthWrite: false });
  BM.glow = (size) => new THREE.PointsMaterial({ size, map: MAT.glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: 1, fog: false });
  try { Env.reg(BM.paint); Env.reg(BM.glass); } catch (e) { /* environment probe not ready yet */ }
}
const _bc = (h) => { const k = new THREE.Color(h); k.convertSRGBToLinear(); return [k.r, k.g, k.b]; };
const _bk = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

/* ---- hull: stations -> strips ---- */
function boatSheer(S, t) { return S.free * (0.9 + 0.1 * (1 - t) + 0.34 * Math.pow(t, 2.4)); }
function boatDeckY(S, z) { return boatSheer(S, clamp((z + S.L / 2) / S.L, 0, 1)) + 0.04; }
function boatHalfBeam(S, t) { return S.B / 2 * (t < 0.5 ? 0.93 + 0.07 * Math.sin(t / 0.5 * Math.PI / 2) : Math.pow(Math.max(0, 1 - Math.pow((t - 0.5) / 0.5, S.bow)), 0.62)); }
function boatHull(S, liv) {
  const H = S.hull, L = S.L, N = 24, pos = [], col = [], idx = [], A = _bc(liv.hull), AC = _bc(liv.acc), DK = _bc(liv.deck), AF = [0.05, 0.055, 0.07];
  const st = []; for (let k = 0; k <= N; k++) {
    const t = k / N, hb = boatHalfBeam(S, t), kk = t < 0.45 ? 0.78 + 0.22 * (t / 0.45) : t < 0.78 ? 1 : 1 - sstep(0.78, 1.0, t) * 0.96, ky = -S.draft * kk, sy = boatSheer(S, t);
    st.push({ t, z: -L / 2 + t * L, hb, ky, sy, covered: H.deck.some((r) => t >= r[0] - 1e-6 && t <= r[1] + 1e-6) });
  }
  const P = (s) => [[0, s.ky], [s.hb * H.chine, s.ky * 0.3], [s.hb * 0.975, 0], [s.hb * 0.985, 0.12], [s.hb, s.sy]];
  const strip = (pa, pb, ca, cb) => {   /* pa, pb: station -> [x, y, z] */
    const base = pos.length / 3;
    for (let k = 0; k <= N; k++) { const a = pa(st[k]), b = pb(st[k]); pos.push(a[0], a[1], a[2], b[0], b[1], b[2]); col.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2]); }
    for (let k = 0; k < N; k++) { const i = base + k * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
  };
  const stripIf = (pa, pb, ca, cb, openOnly, closedOnly) => {   /* only the segments that are open / covered */
    const base = pos.length / 3; let any = false;
    for (let k = 0; k <= N; k++) { const a = pa(st[k]), b = pb(st[k]); pos.push(a[0], a[1], a[2], b[0], b[1], b[2]); col.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2]); }
    for (let k = 0; k < N; k++) { const cov = st[k].covered && st[k + 1].covered, opn = !st[k].covered && !st[k + 1].covered; if ((openOnly && !opn) || (closedOnly && !cov)) continue; const i = base + k * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); any = true; }
    return any;
  };
  /* outer shell, both sides */
  for (const sd of [1, -1]) {
    const pt = (j) => (s) => { const p = P(s)[j]; return [sd * p[0], p[1], s.z]; };
    strip(pt(0), pt(1), AF, AF); strip(pt(1), pt(2), AF, AF); strip(pt(2), pt(3), AC, AC); strip(pt(3), pt(4), A, A);
  }
  /* decks and interior */
  const w = H.wall, fl = H.floor, cam = 0.07;
  const camX = (sd) => (s) => [sd * s.hb, s.sy, s.z], ctr = (s) => [0, s.sy + cam, s.z];
  stripIf(camX(1), ctr, DK, _bk(DK, 1.04), false, true); stripIf(ctr, camX(-1), _bk(DK, 1.04), DK, false, true);
  for (const sd of [1, -1]) {
    stripIf((s) => [sd * s.hb, s.sy + 0.01, s.z], (s) => [sd * Math.max(0, s.hb - w - 0.03), s.sy + 0.01, s.z], A, A, true, false);                    /* gunwale top */
    stripIf((s) => [sd * Math.max(0, s.hb - w - 0.03), s.sy, s.z], (s) => [sd * Math.max(0, s.hb - w - 0.09), fl, s.z], _bk(DK, 0.94), _bk(DK, 0.7), true, false);   /* inner wall */
  }
  stripIf((s) => [Math.max(0, s.hb - w - 0.09), fl, s.z], (s) => [-Math.max(0, s.hb - w - 0.09), fl, s.z], _bk(DK, 0.62), _bk(DK, 0.62), true, false);                    /* floor */
  const quad = (a, b, c, d, cc) => { const i = pos.length / 3; for (const p of [a, b, c, d]) { pos.push(p[0], p[1], p[2]); col.push(cc[0], cc[1], cc[2]); } idx.push(i, i + 1, i + 2, i, i + 2, i + 3); };
  /* transom and, where the stern is open, its inner face; bulkheads where open water meets deck */
  { const s = st[0], r = P(s), ring = [...r.map((p) => [p[0], p[1], s.z]), ...r.slice().reverse().map((p) => [-p[0], p[1], s.z])], c0 = pos.length / 3, mid = [0, (s.ky + s.sy) / 2, s.z];
    pos.push(mid[0], mid[1], mid[2]); col.push(A[0], A[1], A[2]); for (const p of ring) { pos.push(p[0], p[1], p[2]); col.push(A[0], A[1], A[2]); } for (let i = 0; i < ring.length; i++) idx.push(c0, c0 + 1 + i, c0 + 1 + ((i + 1) % ring.length)); }
  if (!st[0].covered) { const s = st[0], x = Math.max(0, s.hb - w - 0.09); quad([x, fl, s.z + 0.05], [-x, fl, s.z + 0.05], [-(s.hb - w - 0.03), s.sy, s.z + 0.05], [s.hb - w - 0.03, s.sy, s.z + 0.05], _bk(DK, 0.85)); }
  for (let k = 0; k < N; k++) if (st[k].covered !== st[k + 1].covered) { const s = st[st[k].covered ? k : k + 1], x = Math.max(0, s.hb - w - 0.09); quad([x, fl, s.z], [-x, fl, s.z], [-(s.hb - w - 0.03), s.sy + cam, s.z], [s.hb - w - 0.03, s.sy + cam, s.z], _bk(DK, 0.82)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g.toNonIndexed();
}

/* ---- fitting helpers (local boat coordinates) ---- */
function bBox(gb, x0, y0, z0, x1, y1, z1, c) { gb.box(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1), c[0], c[1], c[2]); gb.quadA([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], 0, -1, 0, c[0] * 0.5, c[1] * 0.5, c[2] * 0.5); }
function bCyl(gb, a, b, r, c, seg) { const [g, m] = cylBetween(a, b, r, seg || 7); gb.geo(g, m, new THREE.Color(c[0], c[1], c[2]), 0); }
function bGlass(list, p0, p1, p2, p3) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...p0, ...p1, ...p2, ...p0, ...p2, ...p3], 3)); g.computeVertexNormals(); list.push(g); }
function bMergeGlass(list) {
  if (!list.length) return null; let n = 0; for (const g of list) n += g.attributes.position.count; const p = new Float32Array(n * 3), nn = new Float32Array(n * 3); let o = 0;
  for (const g of list) { p.set(g.attributes.position.array, o * 3); nn.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nn, 3)); const m = new THREE.Mesh(g, BM.glass); m.renderOrder = 2; return m;
}
function bWheel(gb, x, y, z, r, tilt, c) { const g = ni(new THREE.TorusGeometry(r, r * 0.09, 6, 14)); _m4.compose(_p3.set(x, y, z), _q.setFromEuler(_e.set(tilt, 0, 0)), _s3.set(1, 1, 1)); gb.geo(g, _m4, new THREE.Color(c[0], c[1], c[2]), 0); _q.identity(); bCyl(gb, [x, y, z - 0.01], [x, y - 0.1, z - r * 0.1 - 0.2 * Math.sin(tilt)], r * 0.1, c, 6); }
function bSeat(gb, x, z, y, w, d, hgt, c, back) { bBox(gb, x - w / 2, y, z - d / 2, x + w / 2, y + hgt, z + d / 2, c); if (back) bBox(gb, x - w / 2, y + hgt, z - d / 2, x + w / 2, y + hgt + back, z - d / 2 + 0.12, c); }
function bOutboard(gb, x, z, y, big, c) {
  const k = big ? 1.5 : 1;
  bBox(gb, x - 0.2 * k, y, z - 0.16 * k, x + 0.2 * k, y + 0.62 * k, z + 0.2 * k, c); bBox(gb, x - 0.22 * k, y + 0.5 * k, z - 0.18 * k, x + 0.22 * k, y + 0.54 * k, z + 0.22 * k, _bk(c, 0.5));
  bBox(gb, x - 0.1 * k, y - 0.6 * k, z - 0.08 * k, x + 0.1 * k, y, z + 0.1 * k, _bk(c, 0.85)); bBox(gb, x - 0.05, y - 0.78 * k, z - 0.26 * k, x + 0.05, y - 0.62 * k, z + 0.2 * k, _bk(c, 0.6)); bBox(gb, x - 0.3 * k, y - 0.72 * k, z - 0.05, x + 0.3 * k, y - 0.67 * k, z + 0.05, [0.5, 0.52, 0.55]);
}
function navLights(S, pts) {   /* red to port... in model terms: left is +x */
  const P = [], C = []; for (const p of pts) { P.push(p[0], p[1], p[2]); C.push(p[3], p[4], p[5]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeBoundingSphere();
  const m = new THREE.Points(g, BM.glow(0.9)); m.frustumCulled = false; m.renderOrder = 4; m.visible = false; return m;
}
function boatFinish(root, gbs, extra) { for (const [gb, mat] of gbs) if (gb.count) { const m = gb.mesh(mat, true, true); m.frustumCulled = true; root.add(m); } for (const m of extra || []) if (m) root.add(m); }

/* ================= TERN: open aluminium skiff with a tiller outboard ================= */
function buildTern(liv) {
  boatInit(); const S = BSPEC.tern, root = new THREE.Group(), parts = { wheel: null, skip: { x: 0, y: 0.16, z: -1.15, sit: false } }, gb = new GB(0, 0, false);
  const A = _bc(liv.hull), AC = _bc(liv.acc), DK = _bc(liv.deck), wood = [0.62, 0.45, 0.28], dk = [0.1, 0.11, 0.13], glass = [];
  const hull = new THREE.Mesh(boatHull(S, liv), BM.paint); hull.castShadow = true; root.add(hull);
  const fl = S.hull.floor;
  bSeat(gb, 0, 0.7, fl, 1.4, 0.38, 0.34, wood); bSeat(gb, 0, -0.35, fl, 1.5, 0.34, 0.34, wood); bBox(gb, -0.68, fl, -1.0, 0.68, fl + 0.02, 0.2, [0.3, 0.28, 0.25]);
  bBox(gb, -0.4, fl, 1.5, 0.4, fl + 0.3, 1.9, _bk(DK, 0.8));   /* bow locker */
  bOutboard(gb, 0, -2.38, 0.38, false, AC);
  bCyl(gb, [0, 0.82, -2.3], [0.1, 0.9, -1.55], 0.025, dk, 5); bCyl(gb, [0.1, 0.9, -1.55], [0.1, 0.9, -1.4], 0.04, wood, 6);   /* tiller */
  for (const sd of [-1, 1]) { bCyl(gb, [sd * 0.9, S.free * 0.92, -0.3], [sd * 0.9, S.free + 0.34, -0.3], 0.025, dk, 5); bCyl(gb, [sd * 0.9, S.free * 0.92, 0.9], [sd * 0.9, S.free + 0.3, 0.9], 0.025, dk, 5); }
  bBox(gb, -0.05, boatSheer(S, 1) - 0.18, 2.34, 0.05, boatSheer(S, 1) + 0.04, 2.4, [0.2, 0.2, 0.22]);   /* stem fitting */
  bBox(gb, -0.9, fl, -2.3, 0.9, fl + 0.5, -2.22, _bk(A, 0.9));
  const nav = navLights(S, [[0.2, S.free + 0.1, 1.6, 1, 0.12, 0.1], [-0.2, S.free + 0.1, 1.6, 0.15, 1, 0.3], [0, 1.9, -2.4, 1, 0.95, 0.85]]);
  boatFinish(root, [[gb, BM.fit]], [bMergeGlass(glass), nav]); parts.nav = nav; return { root, spec: S, parts };
}

/* ================= SURGE: jet ski ================= */
function buildSurge(liv) {
  boatInit(); const S = BSPEC.surge, root = new THREE.Group(), parts = { skip: { x: 0, y: 0.76, z: -0.55, sit: 'ride' } }, gb = new GB(0, 0, false);
  const A = _bc(liv.hull), AC = _bc(liv.acc), DK = _bc(liv.deck), dk = [0.07, 0.075, 0.085], glass = [];
  const hull = new THREE.Mesh(boatHull(S, liv), BM.paint); hull.castShadow = true; root.add(hull);
  const yd = (z) => boatDeckY(S, z);
  bBox(gb, -0.27, yd(-0.3), -1.25, 0.27, yd(-0.3) + 0.3, 0.05, dk);                                    /* seat */
  bBox(gb, -0.22, yd(-0.3) + 0.3, -1.2, 0.22, yd(-0.3) + 0.34, 0.0, _bk(AC, 0.9));
  for (const sd of [-1, 1]) { bBox(gb, sd * 0.36, yd(-0.5) - 0.02, -1.35, sd * 0.52, yd(-0.5) + 0.02, -0.1, [0.05, 0.05, 0.06]); bBox(gb, sd * 0.05 + sd * 0.0, yd(0.7), 0.35, sd * 0.12, yd(0.7) + 0.02, 1.2, _bk(AC, 0.9)); }
  bBox(gb, -0.22, yd(0.55), 0.35, 0.22, yd(0.55) + 0.34, 0.85, _bk(A, 0.92));                         /* steering pod */
  bCyl(gb, [0, yd(0.55) + 0.3, 0.55], [0, yd(0.55) + 0.62, 0.45], 0.035, dk, 6);                        /* column */
  bCyl(gb, [-0.34, yd(0.55) + 0.66, 0.43], [0.34, yd(0.55) + 0.66, 0.43], 0.025, dk, 6); for (const sd of [-1, 1]) bCyl(gb, [sd * 0.34, yd(0.55) + 0.66, 0.43], [sd * 0.38, yd(0.55) + 0.6, 0.3], 0.03, [0.15, 0.15, 0.17], 6);
  bBox(gb, -0.11, yd(0.55) + 0.3, 0.38, 0.11, yd(0.55) + 0.4, 0.52, [0.03, 0.04, 0.05]);              /* gauge */
  for (const sd of [-1, 1]) bBox(gb, sd * 0.36, yd(0.5) + 0.38, 0.5, sd * 0.4, yd(0.5) + 0.5, 0.56, dk);   /* mirrors */
  bGlass(glass, [-0.2, yd(0.75) + 0.02, 0.8], [0.2, yd(0.75) + 0.02, 0.8], [0.15, yd(0.75) + 0.34, 0.6], [-0.15, yd(0.75) + 0.34, 0.6]);
  bCyl(gb, [0, 0.12, -1.6], [0, 0.12, -1.8], 0.14, [0.45, 0.47, 0.5], 10);                            /* jet nozzle */
  bBox(gb, -0.4, boatSheer(S, 0.12) - 0.02, -1.62, 0.4, boatSheer(S, 0.12) + 0.04, -1.3, _bk(AC, 0.9));
  const nav = navLights(S, [[0.18, S.free + 0.04, 1.25, 1, 0.12, 0.1], [-0.18, S.free + 0.04, 1.25, 0.15, 1, 0.3]]);
  boatFinish(root, [[gb, BM.fit]], [bMergeGlass(glass), nav]); parts.nav = nav; parts.bars = null; return { root, spec: S, parts };
}

/* ================= MARLIN: bowrider speedboat ================= */
function buildMarlin(liv) {
  boatInit(); const S = BSPEC.marlin, root = new THREE.Group(), parts = { wheel: null, skip: { x: -0.62, y: 0.74, z: -0.85, sit: true } }, gb = new GB(0, 0, false);
  const A = _bc(liv.hull), AC = _bc(liv.acc), DK = _bc(liv.deck), dk = [0.07, 0.075, 0.085], seatC = _bk(AC, 0.9), cream = [0.82, 0.8, 0.72], glass = [], fl = S.hull.floor, yd = (z) => boatDeckY(S, z);
  const hull = new THREE.Mesh(boatHull(S, liv), BM.paint); hull.castShadow = true; root.add(hull);
  /* helm console on the right (starboard = -x), passenger console on the left, windshield across the front of the cockpit */
  bBox(gb, -1.1, fl, 0.0, -0.15, fl + 1.0, 0.6, _bk(A, 0.96)); bBox(gb, 0.15, fl, 0.0, 1.1, fl + 0.9, 0.5, _bk(A, 0.96)); bBox(gb, -1.12, fl + 1.0, -0.05, -0.12, fl + 1.07, 0.66, _bk(AC, 0.9));
  bBox(gb, -0.78, fl + 1.07, 0.18, -0.4, fl + 1.2, 0.5, [0.04, 0.05, 0.06]);                              /* dash */
  bWheel(gb, -0.62, fl + 1.02, 0.02, 0.2, -0.9, [0.12, 0.12, 0.14]);
  const wz = 0.62, wy = fl + 1.0;
  bGlass(glass, [-1.18, wy, wz - 0.02], [1.18, wy, wz - 0.02], [1.1, wy + 0.62, wz - 0.3], [-1.1, wy + 0.62, wz - 0.3]);
  for (const x of [-1.18, 0, 1.18]) bCyl(gb, [x, wy, wz - 0.02], [x * 0.93, wy + 0.62, wz - 0.3], 0.025, [0.72, 0.74, 0.78], 6);
  bCyl(gb, [-1.1, wy + 0.62, wz - 0.3], [1.1, wy + 0.62, wz - 0.3], 0.03, [0.72, 0.74, 0.78], 6);
  /* seating: two buckets behind the consoles, a rear bench, a sun pad over the engine */
  bSeat(gb, -0.62, -0.72, fl, 0.62, 0.55, 0.5, cream, 0.5); bSeat(gb, 0.62, -0.72, fl, 0.62, 0.55, 0.5, cream, 0.5);
  bSeat(gb, 0, -2.1, fl, 2.0, 0.55, 0.45, cream, 0.45); bBox(gb, -0.95, fl, -3.0, 0.95, fl + 0.5, -2.55, _bk(A, 0.96)); bBox(gb, -0.9, fl + 0.5, -3.0, 0.9, fl + 0.58, -2.6, seatC);
  /* bow: seat cushions and a ski-tow post, cleats, an anchor roller */
  bBox(gb, -0.7, yd(1.0) + 0.0, 0.95, 0.7, yd(1.0) + 0.1, 1.9, seatC); bCyl(gb, [0, yd(-0.2) , -3.2], [0, yd(-0.2) + 0.55, -3.2], 0.03, [0.8, 0.8, 0.82], 6);
  bBox(gb, -0.06, yd(3.2) - 0.02, 3.0, 0.06, yd(3.2) + 0.1, 3.3, [0.7, 0.72, 0.75]);
  for (const sd of [-1, 1]) bBox(gb, sd * 0.35, yd(2.4), 2.4, sd * 0.45, yd(2.4) + 0.1, 2.56, [0.75, 0.77, 0.8]);
  /* swim platform with a ladder */
  bBox(gb, -1.0, 0.04, -3.75, 1.0, 0.12, -3.3, DK); bCyl(gb, [0.8, 0.12, -3.74], [0.8, 0.7, -3.74], 0.025, [0.8, 0.82, 0.85], 6); bCyl(gb, [0.55, 0.12, -3.74], [0.55, 0.7, -3.74], 0.025, [0.8, 0.82, 0.85], 6);
  for (const sd of [-1, 1]) bBox(gb, sd * 1.0 - 0.02, boatSheer(S, 0.0) - 0.02, -3.32, sd * 1.0 + 0.02, boatSheer(S, 0.0) + 0.16, -2.9, [0.75, 0.77, 0.8]);
  /* stripe on the deck and cleats */
  bBox(gb, -0.12, yd(2.0) + 0.01, 1.5, 0.12, yd(2.0) + 0.03, 3.0, AC);
  const nav = navLights(S, [[0.4, yd(3.1) + 0.05, 3.1, 1, 0.12, 0.1], [-0.4, yd(3.1) + 0.05, 3.1, 0.15, 1, 0.3], [0, 2.3, -3.1, 1, 0.95, 0.85]]);
  bCyl(gb, [0, fl + 0.5, -3.1], [0, 2.2, -3.1], 0.025, [0.8, 0.82, 0.85], 6);
  boatFinish(root, [[gb, BM.fit]], [bMergeGlass(glass), nav]); parts.nav = nav; return { root, spec: S, parts };
}

/* ================= ODYSSEY: cabin cruiser with a flybridge ================= */
function buildOdyssey(liv) {
  boatInit(); const S = BSPEC.odyssey, root = new THREE.Group(), parts = { skip: { x: -0.45, y: 3.63, z: 0.0, sit: true } }, gb = new GB(0, 0, false);
  const A = _bc(liv.hull), AC = _bc(liv.acc), DK = _bc(liv.deck), dk = [0.07, 0.075, 0.085], cream = [0.84, 0.82, 0.74], steel = [0.76, 0.78, 0.82], glass = [], fl = S.hull.floor, yd = (z) => boatDeckY(S, z);
  const hull = new THREE.Mesh(boatHull(S, liv), BM.paint); hull.castShadow = true; root.add(hull);
  /* aft cockpit */
  bSeat(gb, 0, -5.45, fl, 3.1, 0.55, 0.5, cream, 0.4); bBox(gb, -0.6, fl, -4.6, 0.6, fl + 0.5, -3.9, _bk(DK, 0.7)); bBox(gb, -0.7, fl + 0.5, -4.7, 0.7, fl + 0.56, -3.8, [0.55, 0.38, 0.22]);
  bBox(gb, -1.7, 0.04, -6.4, 1.7, 0.12, -5.85, DK);                                                      /* swim platform */
  for (const sd of [-1, 1]) bCyl(gb, [sd * 1.0, 0.12, -6.38], [sd * 1.0, 0.8, -6.38], 0.03, steel, 6);
  /* cabin: shell, side windows, front screen, roof */
  const cy0 = yd(-3.2), cw = 1.55, cz0 = -3.4, cz1 = 2.1, ch = 1.9;
  bBox(gb, -cw, cy0, cz0, cw, cy0 + ch, cz1, cream);
  for (const sd of [-1, 1]) { const x = sd * (cw + 0.012); for (let i = 0; i < 4; i++) { const z0 = cz0 + 0.5 + i * 1.28; bGlass(glass, [x, cy0 + 0.75, z0], [x, cy0 + 0.75, z0 + 1.1], [x, cy0 + 1.5, z0 + 1.1], [x, cy0 + 1.5, z0]); } }
  bGlass(glass, [-cw + 0.15, cy0 + 0.7, cz1 + 0.012], [cw - 0.15, cy0 + 0.7, cz1 + 0.012], [cw - 0.3, cy0 + 1.55, cz1 + 0.012], [-cw + 0.3, cy0 + 1.55, cz1 + 0.012]);
  bBox(gb, -cw - 0.12, cy0 + ch, cz0 - 0.2, cw + 0.12, cy0 + ch + 0.14, cz1 + 0.12, _bk(A, 0.97));      /* roof slab */
  bBox(gb, -cw - 0.02, cy0 + 0.35, cz0, cw + 0.02, cy0 + 0.42, cz1, AC);                                 /* stripe */
  /* flybridge: deck, helm, seats, windscreen, rails, hardtop on posts */
  const fy = cy0 + ch + 0.14, fz0 = cz0 + 0.2, fz1 = cz0 + 4.2;
  bBox(gb, -1.2, fy, fz0, 1.2, fy + 0.06, fz1 + 0.5, DK);
  bBox(gb, -1.0, fy + 0.06, fz1 - 0.4, 0.1, fy + 0.9, fz1 + 0.3, _bk(A, 0.97)); bBox(gb, -1.02, fy + 0.9, fz1 - 0.45, 0.12, fy + 0.96, fz1 + 0.34, AC);
  bWheel(gb, -0.45, fy + 0.95, fz1 - 0.12, 0.2, -0.9, [0.12, 0.12, 0.14]);
  bSeat(gb, -0.45, fz1 - 0.8, fy + 0.06, 0.6, 0.55, 0.45, cream, 0.5); bSeat(gb, 0.62, fz1 - 0.8, fy + 0.06, 0.6, 0.55, 0.45, cream, 0.5); bSeat(gb, 0, fz0 + 0.5, fy + 0.06, 2.0, 0.55, 0.42, cream, 0.4);
  bGlass(glass, [-1.1, fy + 0.96, fz1 + 0.46], [1.1, fy + 0.96, fz1 + 0.46], [1.05, fy + 1.55, fz1 + 0.2], [-1.05, fy + 1.55, fz1 + 0.2]);
  for (const x of [-1.1, 1.1]) bCyl(gb, [x, fy + 0.06, fz1 + 0.46], [x * 0.95, fy + 1.55, fz1 + 0.2], 0.03, steel, 6);
  for (const x of [-1.1, 1.1]) for (const z of [fz0 + 0.1, fz1 - 0.3]) bCyl(gb, [x, fy + 0.06, z], [x, fy + 2.2, z], 0.04, steel, 6);
  bBox(gb, -1.3, fy + 2.2, fz0 - 0.1, 1.3, fy + 2.32, fz1 + 0.1, _bk(A, 0.97));
  for (const sd of [-1, 1]) bCyl(gb, [sd * 1.2, fy + 1.0, fz0], [sd * 1.2, fy + 1.0, fz1 + 0.4], 0.025, steel, 5);
  /* radar arch and mast */
  bCyl(gb, [-0.9, fy + 2.32, fz0 + 0.5], [-0.9, fy + 3.0, fz0 + 0.5], 0.04, steel, 6); bCyl(gb, [0.9, fy + 2.32, fz0 + 0.5], [0.9, fy + 3.0, fz0 + 0.5], 0.04, steel, 6); bCyl(gb, [-0.9, fy + 3.0, fz0 + 0.5], [0.9, fy + 3.0, fz0 + 0.5], 0.04, steel, 6);
  bBox(gb, -0.3, fy + 3.0, fz0 + 0.38, 0.3, fy + 3.12, fz0 + 0.62, [0.92, 0.92, 0.94]); bCyl(gb, [0, fy + 2.32, fz1 - 0.6], [0, fy + 3.6, fz1 - 0.6], 0.03, steel, 6);
  /* foredeck: rails, anchor, cleats */
  for (let i = 0; i < 6; i++) { const z = 2.6 + i * 0.5, t = (z + S.L / 2) / S.L, x = boatHalfBeam(S, t) - 0.12, y = boatDeckY(S, z); if (x < 0.15) break; for (const sd of [-1, 1]) bCyl(gb, [sd * x, y, z], [sd * x, y + 0.6, z], 0.022, steel, 5); }
  for (const sd of [-1, 1]) { let prev = null; for (let i = 0; i < 6; i++) { const z = 2.6 + i * 0.5, t = (z + S.L / 2) / S.L, x = boatHalfBeam(S, t) - 0.12; if (x < 0.15) break; const p = [sd * x, boatDeckY(S, z) + 0.6, z]; if (prev) bCyl(gb, prev, p, 0.02, steel, 5); prev = p; } }
  bBox(gb, -0.06, yd(5.6) - 0.02, 5.3, 0.06, yd(5.6) + 0.2, 5.7, steel); for (const sd of [-1, 1]) bBox(gb, sd * 0.6, yd(3.5), 3.4, sd * 0.7, yd(3.5) + 0.12, 3.62, steel);
  bBox(gb, -0.5, yd(2.6), 2.2, 0.5, yd(2.6) + 0.05, 3.6, _bk(DK, 0.9));
  const nav = navLights(S, [[0.5, yd(5.0) + 0.1, 5.0, 1, 0.12, 0.1], [-0.5, yd(5.0) + 0.1, 5.0, 0.15, 1, 0.3], [0, fy + 3.65, fz1 - 0.6, 1, 0.95, 0.85], [0, fy + 0.5, fz0, 1, 0.95, 0.85]]);
  boatFinish(root, [[gb, BM.fit]], [bMergeGlass(glass), nav]); parts.nav = nav; return { root, spec: S, parts };
}

/* ---- a small low-poly skipper at the helm (rebuilt from the player's outfit when boarding) ---- */
function boatSkipper(app, sk) {
  const g = new THREE.Group(), gb = new GB(0, 0, false), sh = app && app.shirt ? app.shirt : new THREE.Color(0.3, 0.4, 0.6), pt = app && app.pants ? app.pants : new THREE.Color(0.1, 0.1, 0.14), sn = app && app.skin ? app.skin : new THREE.Color(0.8, 0.6, 0.45), hr = app && app.hair ? app.hair : new THREE.Color(0.1, 0.08, 0.06);
  const C = (c) => [c.r, c.g, c.b], x = sk.x, y = sk.y, z = sk.z;
  if (sk.sit) {
    bBox(gb, x - 0.2, y + 0.06, z - 0.1, x + 0.2, y + 0.24, z + 0.55, C(pt)); bBox(gb, x - 0.2, y - 0.0, z + 0.4, x + 0.2, y + 0.2, z + 0.58, C(pt));
    bBox(gb, x - 0.22, y + 0.2, z - 0.12, x + 0.22, y + 0.78, z + 0.1, C(sh));
    for (const sd of [-1, 1]) { const a = [x + sd * 0.26, y + 0.7, z]; bCyl(gb, a, [x + sd * 0.2, y + 0.45, z + 0.5], 0.05, C(sh), 6); }
    const hy = y + 0.92; bBox(gb, x - 0.12, hy, z - 0.1, x + 0.12, hy + 0.24, z + 0.12, C(sn)); bBox(gb, x - 0.13, hy + 0.2, z - 0.12, x + 0.13, hy + 0.27, z + 0.13, C(hr)); bBox(gb, x - 0.13, hy + 0.04, z - 0.12, x + 0.13, hy + 0.27, z - 0.04, C(hr));
  } else {
    for (const sd of [-1, 1]) bBox(gb, x + sd * 0.12 - 0.08, y, z - 0.1, x + sd * 0.12 + 0.08, y + 0.82, z + 0.1, C(pt));
    bBox(gb, x - 0.22, y + 0.82, z - 0.12, x + 0.22, y + 1.38, z + 0.12, C(sh));
    for (const sd of [-1, 1]) bCyl(gb, [x + sd * 0.26, y + 1.28, z], [x + sd * 0.18, y + 0.98, z + 0.45], 0.05, C(sh), 6);
    const hy = y + 1.45; bBox(gb, x - 0.12, hy, z - 0.1, x + 0.12, hy + 0.24, z + 0.12, C(sn)); bBox(gb, x - 0.13, hy + 0.2, z - 0.12, x + 0.13, hy + 0.27, z + 0.13, C(hr)); bBox(gb, x - 0.13, hy + 0.04, z - 0.12, x + 0.13, hy + 0.27, z - 0.04, C(hr));
  }
  const m = gb.mesh(BM.fit, true, true); g.add(m); return g;
}

const Boats = {
  /* two liveries per type, the second used for the 'for sale' unit's neighbour where it matters */
  create(id, hue) {
    boatInit(); const L = BLIV[id][hue || 0] || BLIV[id][0];
    const o = id === 'tern' ? buildTern(L) : id === 'surge' ? buildSurge(L) : id === 'marlin' ? buildMarlin(L) : buildOdyssey(L);
    const holder = new THREE.Group(); holder.add(o.root); o.root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    return { holder, model: o.root, parts: o.parts, spec: o.spec, id, hue: hue || 0 };
  }
};
