/* ================= BODY KIT: shared human geometry =================
   Shaped (lofted) torsos, faces with nose / ears / eyes / lips, hair styles, tapered limbs, hands, shoes. Every part is a non-indexed
   BufferGeometry with a baked vertex-colour tint (1 = take the instance / material colour as it is; < 1 darker seams, belts, cuffs).
   Used by the street pedestrians (InstancedMesh parts, 07_peds.js) and by the articulated cutscene people (crPerson, 08_courtroom.js).
   Conventions: +z is the front of the person, y is up, limbs hang down -y from their joint, the head's origin is the chin. */
const Body = { G: null, NECK: 0.568 };      // NECK = height of the chin above the spine pivot (the head's origin)
const _bv = new THREE.Vector3(), _bq = new THREE.Quaternion(), _be = new THREE.Euler(), _bs = new THREE.Vector3();
const _bt = (c) => (Array.isArray(c) ? c : [c, c, c]);
function bodyMx(x, y, z, rx, ry, rz, sx, sy, sz) {
  _bq.setFromEuler(_be.set(rx || 0, ry || 0, rz || 0, 'YXZ'));
  return new THREE.Matrix4().compose(_bv.set(x || 0, y || 0, z || 0), _bq, _bs.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz));
}
/* tiny mesh builder: lofted rings (superellipse cross-sections), ellipsoids, boxes, arbitrary geometry; normals are smoothed per primitive */
class BB {
  constructor() { this.p = []; this.c = []; this.i = []; }
  _v(x, y, z, c, M) {
    if (M) { _bv.set(x, y, z).applyMatrix4(M); x = _bv.x; y = _bv.y; z = _bv.z; }
    this.p.push(x, y, z); this.c.push(c[0], c[1], c[2]); return this.p.length / 3 - 1;
  }
  /* rings: { y (position along the axis), a (half width, x), b (half depth, z / height), x, z (or v for axis z) centre offsets, e (superellipse exponent), c (tint) } */
  loft(rings, o) {
    o = o || {}; const seg = o.seg || 14, M = o.M || null, ax = o.axis || 'y', arc = o.arc || null, n = rings.length, cols = arc ? seg + 1 : seg, base = this.p.length / 3;
    for (const r of rings) {
      const k = 2 / (r.e || 2), c = _bt(r.c == null ? 1 : r.c);
      for (let s = 0; s < cols; s++) {
        const t = arc ? arc[0] + (arc[1] - arc[0]) * s / seg : s / seg * TAU, cs = Math.cos(t), sn = Math.sin(t);
        const px = r.a * Math.sign(cs) * Math.pow(Math.abs(cs), k), pz = r.b * Math.sign(sn) * Math.pow(Math.abs(sn), k);
        if (ax === 'y') this._v((r.x || 0) + px, r.y, (r.z || 0) + pz, c, M); else this._v((r.x || 0) + px, (r.v || 0) + pz, r.y, c, M);
      }
    }
    const dir = Math.sign(rings[n - 1].y - rings[0].y) || 1, flip = (dir < 0) !== (ax === 'z');
    for (let j = 0; j < n - 1; j++) for (let s = 0; s < (arc ? seg : cols); s++) {
      const s2 = arc ? s + 1 : (s + 1) % seg, a = base + j * cols + s, b = base + j * cols + s2, c = base + (j + 1) * cols + s, d = base + (j + 1) * cols + s2;
      if (flip) this.i.push(a, b, c, b, d, c); else this.i.push(a, c, b, b, c, d);
    }
    const cp = o.cap === false ? [0, 0] : Array.isArray(o.cap) ? o.cap : [1, 1];
    if (!arc) for (const j of [0, n - 1]) {
      if (!cp[j ? 1 : 0]) continue;
      const r = rings[j], c = _bt(r.c == null ? 1 : r.c), want = (j === 0 ? -dir : dir);
      const ctr = ax === 'y' ? this._v(r.x || 0, r.y, r.z || 0, c, M) : this._v(r.x || 0, r.v || 0, r.y, c, M), b0 = this.p.length / 3;
      for (let s = 0; s < seg; s++) { const q = base + j * cols + s; this._v(this.p[q * 3], this.p[q * 3 + 1], this.p[q * 3 + 2], c, null); }
      for (let s = 0; s < seg; s++) {
        const s2 = (s + 1) % seg, up = ax === 'y' ? want > 0 : want < 0;
        if (up) this.i.push(ctr, b0 + s2, b0 + s); else this.i.push(ctr, b0 + s, b0 + s2);
      }
    }
  }
  /* ellipsoid (or a cap of one: t0..t1 measured from the bottom pole 0 to the top pole PI), rot = [rx, ry, rz] about its own centre */
  ell(cx, cy, cz, rx, ry, rz, c, rot, o) {
    o = o || {}; const lat = o.lat || 6, t0 = o.t0 == null ? 0 : o.t0, t1 = o.t1 == null ? Math.PI : o.t1, rings = [];
    for (let j = 0; j <= lat; j++) { const th = t0 + (t1 - t0) * j / lat; rings.push({ y: -ry * Math.cos(th), a: Math.max(1e-5, rx * Math.sin(th)), b: Math.max(1e-5, rz * Math.sin(th)), c }); }
    const M = bodyMx(cx, cy, cz, rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0); if (o.M) M.premultiply(o.M);
    this.loft(rings, { seg: o.seg || 10, M, cap: false });
  }
  box(cx, cy, cz, sx, sy, sz, c, rot, M0) {
    const M = bodyMx(cx, cy, cz, rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0); if (M0) M.premultiply(M0); c = _bt(c);
    const h = [sx / 2, sy / 2, sz / 2], F = [[[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]];
    for (const f of F) { const o = this.p.length / 3; for (const q of f) this._v(q[0] * h[0], q[1] * h[1], q[2] * h[2], c, M); this.i.push(o, o + 1, o + 2, o, o + 2, o + 3); }
  }
  /* any indexed BufferGeometry (torus for glasses, say) */
  add(geo, M, c) {
    const pa = geo.attributes.position, o = this.p.length / 3; c = _bt(c);
    for (let k = 0; k < pa.count; k++) this._v(pa.getX(k), pa.getY(k), pa.getZ(k), c, M);
    const ix = geo.index.array; for (let k = 0; k < ix.length; k++) this.i.push(o + ix[k]);
  }
  geo() {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i); g.computeVertexNormals(); const n = g.toNonIndexed(); g.dispose(); n.computeBoundingBox(); n.computeBoundingSphere(); return n;
  }
}

/* x-mirrored copy of a (non-indexed) geometry with the winding fixed, for left-hand parts */
function mirrorGeo(g) {
  const m = g.clone(), P = m.attributes.position, N = m.attributes.normal, C = m.attributes.color;
  for (let k = 0; k < P.count; k++) { P.setX(k, -P.getX(k)); if (N) N.setX(k, -N.getX(k)); }
  for (let k = 0; k + 2 < P.count; k += 3) for (const A of [P, N, C]) if (A) for (let c = 0; c < A.itemSize; c++) { const t = A.array[(k + 1) * A.itemSize + c]; A.array[(k + 1) * A.itemSize + c] = A.array[(k + 2) * A.itemSize + c]; A.array[(k + 2) * A.itemSize + c] = t; }
  m.computeBoundingBox(); m.computeBoundingSphere(); return m;
}

Body.init = function () {
  if (Body.G) return Body.G;
  const G = Body.G = { hair: {}, hairH: {}, hairT: {} }, R = (rows) => rows.map((r) => ({ y: r[0], a: r[1], b: r[2], z: r[3], e: r[4], c: r[5] }));
  /* ---- torsos (origin = spine pivot at the waist, shoulders at y .46, neck base at .53) ---- */
  const TM = [[-0.03, 0.17, 0.108, -0.004, 2.6, 0.84], [0.01, 0.168, 0.107, -0.004, 2.6, 0.95], [0.10, 0.152, 0.098, -0.002, 2.5, 1], [0.21, 0.164, 0.103, 0, 2.4, 1], [0.32, 0.181, 0.112, 0.004, 2.4, 1], [0.41, 0.19, 0.106, 0.002, 2.5, 1], [0.46, 0.19, 0.092, -0.002, 2.6, 0.98], [0.495, 0.148, 0.076, -0.006, 2.3, 0.97], [0.515, 0.075, 0.058, -0.008, 2.1, 1.1], [0.53, 0.058, 0.052, -0.006, 2, 1.1]];
  const TF = [[-0.03, 0.178, 0.108, -0.004, 2.6, 0.84], [0.01, 0.176, 0.107, -0.004, 2.6, 0.95], [0.10, 0.132, 0.092, -0.002, 2.4, 1], [0.21, 0.15, 0.1, 0.002, 2.3, 1], [0.30, 0.168, 0.116, 0.016, 2.3, 1], [0.36, 0.172, 0.118, 0.02, 2.3, 1], [0.42, 0.172, 0.104, 0.006, 2.4, 1], [0.46, 0.172, 0.088, -0.002, 2.5, 0.98], [0.495, 0.136, 0.072, -0.006, 2.3, 0.97], [0.515, 0.07, 0.054, -0.008, 2.1, 1.1], [0.53, 0.054, 0.05, -0.006, 2, 1.1]];
  const TC = [[-0.30, 0.212, 0.145, -0.004, 2.4, 0.78], [-0.26, 0.208, 0.14, -0.004, 2.4, 0.9], [-0.12, 0.192, 0.125, -0.004, 2.4, 1], [0.05, 0.168, 0.108, -0.002, 2.4, 1], [0.12, 0.166, 0.106, 0, 2.4, 1], [0.22, 0.176, 0.112, 0, 2.4, 1], [0.32, 0.192, 0.12, 0.004, 2.4, 1], [0.41, 0.2, 0.112, 0.002, 2.5, 1], [0.46, 0.2, 0.098, -0.002, 2.6, 0.98], [0.495, 0.154, 0.082, -0.006, 2.3, 0.97], [0.515, 0.082, 0.064, -0.008, 2.1, 1.12], [0.532, 0.064, 0.056, -0.006, 2, 1.12]];
  for (const [k, rows] of [['torsoM', TM], ['torsoF', TF], ['torsoC', TC]]) { const b = new BB(); b.loft(R(rows), { seg: 16 }); G[k] = b.geo(); }
  /* ---- pelvis with belt, skirt ---- */
  { const b = new BB();
    b.loft(R([[-0.115, 0.152, 0.098, 0, 2.4, 0.85], [-0.06, 0.168, 0.108, 0, 2.4, 0.95], [0.02, 0.17, 0.108, 0, 2.5, 1], [0.04, 0.166, 0.106, 0, 2.6, 0.36], [0.062, 0.166, 0.106, 0, 2.6, 0.36], [0.075, 0.158, 0.1, 0, 2.5, 1], [0.1, 0.15, 0.096, 0, 2.5, 1]]), { seg: 16 });
    b.box(0, 0.051, 0.106, 0.034, 0.026, 0.01, [2.2, 2.0, 1.4]); G.hips = b.geo(); }
  { const b = new BB(); b.loft(R([[0.07, 0.168, 0.108, 0, 2.5, 1], [0.0, 0.176, 0.114, 0, 2.4, 1], [-0.12, 0.2, 0.14, 0, 2.3, 1], [-0.24, 0.235, 0.178, 0, 2.2, 0.98], [-0.33, 0.255, 0.198, 0, 2.2, 0.9], [-0.345, 0.256, 0.2, 0, 2.2, 0.7]]), { seg: 20 }); G.skirt = b.geo(); }
  /* ---- legs: thigh (hip -> knee), shin (knee -> ankle), shoe ---- */
  { const b = new BB(); b.loft(R([[0.03, 0.09, 0.092, 0, 2, 0.9], [-0.06, 0.094, 0.096, 0, 2, 1], [-0.17, 0.086, 0.09, 0, 2, 1], [-0.3, 0.07, 0.076, 0, 2, 1], [-0.4, 0.061, 0.066, 0, 2, 1], [-0.43, 0.059, 0.062, 0, 2, 0.96]]), { seg: 12, cap: [1, 0] });
    b.ell(0, -0.43, 0, 0.058, 0.05, 0.06, 0.98, null, { seg: 10 }); G.thigh = b.geo(); }
  { const b = new BB(); b.loft(R([[0, 0.057, 0.059, 0, 2, 1], [-0.07, 0.058, 0.066, -0.006, 2, 1], [-0.13, 0.059, 0.07, -0.011, 2, 1], [-0.23, 0.05, 0.058, -0.006, 2, 1], [-0.34, 0.04, 0.043, -0.001, 2, 1], [-0.395, 0.036, 0.039, 0, 2, 0.8], [-0.43, 0.036, 0.039, 0, 2, 0.8]]), { seg: 12, cap: [0, 1] }); G.shin = b.geo(); }
  { const b = new BB();
    const upper = [[-0.06, 0.028, 0.03, -0.036], [-0.045, 0.04, 0.04, -0.033], [0, 0.046, 0.045, -0.029], [0.06, 0.049, 0.04, -0.036], [0.12, 0.05, 0.033, -0.043], [0.17, 0.044, 0.028, -0.048], [0.2, 0.03, 0.02, -0.053]];
    b.loft(upper.map((r) => ({ y: r[0], a: r[1], b: r[2], v: r[3], e: 2.3, c: 1 })), { seg: 12, axis: 'z' });
    const sole = [[-0.062, 0.032, 0.011, -0.065], [-0.04, 0.045, 0.012, -0.065], [0.09, 0.052, 0.012, -0.065], [0.17, 0.047, 0.012, -0.065], [0.206, 0.03, 0.009, -0.065]];
    b.loft(sole.map((r) => ({ y: r[0], a: r[1], b: r[2], v: r[3], e: 3, c: 0.42 })), { seg: 10, axis: 'z' }); G.foot = b.geo(); }
  /* ---- arms: upper arm (shirt part), lower upper arm (sleeve or skin), forearm, hand ---- */
  { const b = new BB(); b.loft(R([[0.012, 0.028, 0.03, 0, 2, 0.94], [0.004, 0.042, 0.046, 0, 2, 1], [-0.016, 0.052, 0.055, 0, 2, 1], [-0.05, 0.055, 0.057, 0, 2, 1], [-0.1, 0.051, 0.052, 0, 2, 1], [-0.17, 0.047, 0.048, 0, 2, 0.88]]), { seg: 14 }); b.ell(0, -0.018, 0, 0.05, 0.044, 0.052, 1, null, { seg: 10 }); G.uarm = b.geo(); }
  { const b = new BB(); b.loft(R([[-0.17, 0.047, 0.048, 0, 2, 0.94], [-0.24, 0.045, 0.046, 0, 2, 1], [-0.3, 0.04, 0.041, 0, 2, 1]]), { seg: 12 }); b.ell(0, -0.31, 0, 0.042, 0.04, 0.042, 1, null, { seg: 10 }); G.uarm2 = b.geo(); }
  { const b = new BB(); b.loft(R([[0.012, 0.042, 0.043, 0, 2, 1], [-0.05, 0.046, 0.047, 0, 2, 1], [-0.12, 0.042, 0.043, 0, 2, 1], [-0.22, 0.032, 0.032, 0, 2, 1], [-0.28, 0.028, 0.027, 0, 2, 0.84], [-0.3, 0.028, 0.027, 0, 2, 0.84]]), { seg: 12 }); G.farm = b.geo(); }
  { const b = new BB();   // hand: flat palm (thin in x, wide in z), four fingers and a thumb; origin at the wrist, hangs down -y, thumb forward (+z), fingers curl toward the body's middle (-x)
    b.loft(R([[0.01, 0.022, 0.024, 0, 2, 0.95], [-0.01, 0.0175, 0.028, 0.001, 2.2, 1], [-0.04, 0.0135, 0.033, 0.002, 2.4, 1], [-0.077, 0.0105, 0.033, 0.002, 2.6, 0.96]]), { seg: 10 });
    const fin = (z, len, curl, w) => { const P = [], N = [], W = [], H = [], m = 5; for (let q = 0; q < m; q++) { const s = q / (m - 1), a = curl * s * s, last = q === m - 1; P.push([-a * 0.6 * len, -0.074 - len * s * (1 - 0.12 * s), z]); N.push([1, 0, 0]); W.push(last ? 0 : w * (1 - 0.18 * s)); H.push(last ? 0 : 0.0074 * (1 - 0.2 * s)); } b.tube(P, N, W, H, [0.95, 1], 6); };
    fin(0.0245, 0.07, 0.35, 0.0072); fin(0.0082, 0.078, 0.45, 0.0074); fin(-0.0085, 0.073, 0.5, 0.0071); fin(-0.0245, 0.058, 0.55, 0.0064);
    b.tube([[0.001, -0.016, 0.026], [0.0, -0.036, 0.042], [-0.003, -0.053, 0.049], [-0.006, -0.067, 0.05]], [[1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0]], [0.0112, 0.0102, 0.0092, 0], [0.0095, 0.0088, 0.008, 0], [0.95, 1], 6);
    G.hand = b.geo(); G.handL = mirrorGeo(G.hand); }
  /* ---- head (origin = chin / neck top), neck included; face detail baked into the same mesh ----
     The profile is a smooth (Hermite) curve through these rows, so the hair kit can sit exactly on it; the face is then sculpted with a few soft
     bumps and dents (eye sockets, brow ridge, cheekbones, cheek hollows, temples, chin, mouth line) before the nose, lips, ears and eyelids go on. */
  const HR = [[0, 0.034, 0.045, 0.05, 2.2, 0.97], [0.012, 0.056, 0.066, 0.04, 2.2, 0.98], [0.035, 0.072, 0.085, 0.022, 2.2, 1], [0.065, 0.079, 0.096, 0.01, 2.2, 1], [0.105, 0.082, 0.102, 0.004, 2.2, 1], [0.14, 0.082, 0.104, 0, 2.2, 1], [0.18, 0.08, 0.101, -0.004, 2.2, 1], [0.215, 0.069, 0.088, -0.008, 2.2, 1], [0.238, 0.044, 0.058, -0.008, 2.2, 1], [0.247, 0.015, 0.022, -0.008, 2.2, 1]];
  Body.HR = HR;
  const fz = (y) => { const r = headRingAt(HR, y); return r[3] + r[2]; };
  const gau = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
  { const b = new BB();
    const YS = [0, 0.006, 0.013, 0.022, 0.032, 0.044, 0.056, 0.068, 0.08, 0.092, 0.105, 0.118, 0.13, 0.142, 0.155, 0.168, 0.18, 0.192, 0.204, 0.214, 0.223, 0.231, 0.238, 0.243, 0.247];
    const rows = YS.map((y) => { const r = headRingAt(HR, y); let c = 1; for (let k = 0; k < HR.length - 1; k++) if (y >= HR[k][0] && y <= HR[k + 1][0]) { c = HR[k][5] + (HR[k + 1][5] - HR[k][5]) * (y - HR[k][0]) / (HR[k + 1][0] - HR[k][0]); break; } return [y, r[1], r[2], r[3], r[4], c]; });
    b.loft(R(rows), { seg: 28 });
    for (let k = 0; k < b.p.length / 3; k++) {            // sculpt the face
      const x = b.p[k * 3], y = b.p[k * 3 + 1], z = b.p[k * 3 + 2], rz = z - headRingAt(HR, Math.min(y, 0.247))[3], ang = Math.atan2(x, rz), m = Math.max(0, 1 - Math.abs(ang) / 1.15), mm = m * m * (3 - 2 * m);
      let d = 0, dk = 0;
      for (const sx of [-1, 1]) { d -= 0.0046 * gau(x, y, sx * 0.033, 0.128, 0.021, 0.0165) * mm; dk += 0.1 * gau(x, y, sx * 0.033, 0.128, 0.02, 0.016) * mm; d += 0.0033 * gau(x, y, sx * 0.06, 0.092, 0.02, 0.017) * mm; d -= 0.0021 * gau(x, y, sx * 0.05, 0.06, 0.018, 0.017) * mm; d -= 0.0026 * gau(x, y, sx * 0.075, 0.15, 0.012, 0.02); }
      d += 0.0042 * Math.exp(-(((y - 0.1475) / 0.0125) ** 2)) * Math.exp(-((x / 0.058) ** 4)) * mm;
      d += 0.0028 * gau(x, y, 0, 0.004, 0.022, 0.016) * mm;
      d -= 0.0018 * Math.exp(-(((y - 0.0455) / 0.004) ** 2)) * Math.exp(-((x / 0.021) ** 4)) * mm;
      const hl = Math.hypot(x, rz) || 1; b.p[k * 3] += x / hl * d; b.p[k * 3 + 2] += rz / hl * d; if (dk) { const c = 1 - dk; b.c[k * 3] *= c; b.c[k * 3 + 1] *= c; b.c[k * 3 + 2] *= c; }
    }
    b.loft(R([[-0.16, 0.058, 0.054, -0.016, 2, 0.96], [-0.1, 0.055, 0.052, -0.013, 2, 1], [-0.04, 0.05, 0.048, -0.01, 2, 0.94], [0.0, 0.045, 0.046, -0.006, 2, 0.9], [0.03, 0.042, 0.045, -0.004, 2, 0.9]]), { seg: 14 });
    b.ell(0, 0.108, fz(0.108) - 0.003, 0.0085, 0.026, 0.0105, 0.99, [-0.35, 0, 0], { seg: 8 });                     // nose bridge
    b.ell(0, 0.083, fz(0.083) + 0.009, 0.0115, 0.0095, 0.0125, 0.97, null, { seg: 8 });                            // nose tip
    for (const sx of [-1, 1]) {
      b.ell(sx * 0.0105, 0.0815, fz(0.08) + 0.002, 0.0065, 0.006, 0.008, 0.9, null, { seg: 6 });                    // nostril wing
      b.ell(sx * 0.0072, 0.0745, fz(0.0745) + 0.0158, 0.0042, 0.0026, 0.0048, 0.42, null, { seg: 6, lat: 3 });      // nostril
      b.ell(sx * 0.0815, 0.105, -0.003, 0.0085, 0.026, 0.0165, 0.95, [0, 0, -sx * 0.12], { seg: 8 });               // ear
      b.ell(sx * 0.0845, 0.108, 0.0, 0.0045, 0.016, 0.009, 0.8, [0, 0, -sx * 0.12], { seg: 6, lat: 3 });            // ear hollow
      b.ell(sx * 0.033, 0.1315, fz(0.1315) - 0.0082, 0.0148, 0.0105, 0.0095, 0.965, null, { seg: 10, lat: 4, t0: Math.PI * 0.68, t1: Math.PI });  // upper eyelid
      b.ell(sx * 0.033, 0.1235, fz(0.1235) - 0.0085, 0.0145, 0.0042, 0.0085, 0.95, null, { seg: 10, lat: 3, t0: 0, t1: Math.PI * 0.3 });          // lower lid
    }
    b.ell(0, 0.052, fz(0.052) - 0.0055, 0.024, 0.006, 0.0085, [0.97, 0.66, 0.66], null, { seg: 8 });               // upper lip
    b.ell(0, 0.04, fz(0.04) - 0.0065, 0.02, 0.006, 0.0085, [0.95, 0.6, 0.6], null, { seg: 8 });                     // lower lip
    b.ell(0, 0.0455, fz(0.0455) - 0.0035, 0.019, 0.0016, 0.006, 0.5, null, { seg: 8 });                             // mouth line
    G.head = b.geo(); }
  { const b = new BB();   // eyes: white + iris + pupil (absolute colours, instance colour stays white), sunk a little into the sockets
    for (const sx of [-1, 1]) { const z = fz(0.128) - 0.0098; b.ell(sx * 0.033, 0.128, z, 0.0135, 0.0088, 0.0075, [0.88, 0.86, 0.82], null, { seg: 10 }); b.ell(sx * 0.033, 0.128, z + 0.0018, 0.0068, 0.0068, 0.0075, [0.1, 0.07, 0.05], null, { seg: 8 }); b.ell(sx * 0.033, 0.128, z + 0.0034, 0.0032, 0.0032, 0.0075, [0.01, 0.01, 0.01], null, { seg: 6, lat: 4 }); }
    G.eyes = b.geo(); }
  { const b = new BB(); for (const sx of [-1, 1]) b.ell(sx * 0.034, 0.1535, fz(0.1535) - 0.0012, 0.026, 0.0048, 0.0075, 1, [0, 0, -sx * 0.14], { seg: 8, lat: 4 }); G.brow = b.geo(); }
  /* ---- hair: built on the real scalp surface, see 06_hair.js (G.hair = merged, G.hairH = head part, G.hairT = swinging tail segments) ---- */
  buildHair(G, HR);
  { const b = new BB(), ra = (y) => { for (let k = 0; k < HR.length - 1; k++) if (y >= HR[k][0] && y <= HR[k + 1][0]) { const t = (y - HR[k][0]) / (HR[k + 1][0] - HR[k][0]); return [HR[k][1] * (1 - t) + HR[k + 1][1] * t, HR[k][2] * (1 - t) + HR[k + 1][2] * t, HR[k][3] * (1 - t) + HR[k + 1][3] * t]; } return [0.05, 0.05, 0]; };
    const ring = (y, c) => { const q = ra(y); return { y, a: q[0] + 0.006, b: q[1] + 0.006, z: q[2], e: 2.2, c }; };
    b.loft([ring(0.042, 0.96), ring(0.028, 1), ring(0.012, 1), ring(-0.004, 0.9)], { seg: 14, arc: [Math.PI / 2 - 1.85, Math.PI / 2 + 1.85], cap: false });
    for (const arc of [[Math.PI / 2 - 1.85, Math.PI / 2 - 1.05], [Math.PI / 2 + 1.05, Math.PI / 2 + 1.85]]) b.loft([ring(0.105, 0.92), ring(0.085, 1), ring(0.065, 1), ring(0.044, 1)], { seg: 5, arc, cap: false });
    b.ell(0, 0.062, fz(0.062) - 0.0045, 0.03, 0.0075, 0.011, 1, null, { seg: 8, lat: 4 }); G.beard = b.geo(); }
  /* ---- glasses (frames + optional lens discs), backpack ---- */
  { const b = new BB(), tor = new THREE.TorusGeometry(0.027, 0.0036, 6, 14), z = fz(0.128) + 0.006;
    for (const sx of [-1, 1]) {
      b.add(tor, bodyMx(sx * 0.0435, 0.128, z, 0, 0, 0, 1.06, 0.88, 1), 1);
      b.box(sx * 0.077, 0.13, z - 0.054, 0.004, 0.004, 0.108, 1, [0, -sx * 0.083, 0]);
    }
    b.box(0, 0.132, z, 0.02, 0.004, 0.004, 1); G.gls = b.geo(); tor.dispose(); }
  { const b = new BB(); for (const sx of [-1, 1]) b.ell(sx * 0.0435, 0.128, fz(0.128) + 0.006, 0.0275, 0.0225, 0.003, 1, null, { seg: 10, lat: 3 }); G.lens = b.geo(); }
  { const b = new BB();
    b.loft(R([[0.04, 0.104, 0.06, -0.175, 3.2, 0.9], [0.15, 0.124, 0.075, -0.18, 3.2, 1], [0.32, 0.124, 0.075, -0.178, 3.2, 1], [0.46, 0.106, 0.062, -0.172, 3.2, 0.9]]), { seg: 14 });
    b.box(0, 0.11, -0.222, 0.13, 0.1, 0.03, 0.82);
    for (const sx of [-1, 1]) b.box(sx * 0.09, 0.31, 0.112, 0.03, 0.3, 0.012, 0.42, [0.05, 0, 0]);
    G.bag = b.geo(); }
  return G;
};
