/* ================= HUMANS: one skinned body per person =================
   Every person in the game (street pedestrians, you on foot, the people in the courtroom, shop and police scenes) is a Human: ONE continuous mesh skinned to a
   29-bone skeleton, so elbows, knees, hips, shoulders, waist and neck bend as skin and cloth do instead of as separate rigid parts.
     skeleton   hips > tor > chest > neck > head; arms (arm, el, hand); legs (leg, kn, foot); jaw and eyelids; and "soft" bones that carry no pose of their own and are
                driven by physics: chest tissue (bustL/R), belly, glutes (gluL/R), a three-link hair chain, a skirt/coat hem and a backpack.
                Bones sit at rest with no rotation, limbs hanging down -y and +z forward, so a pose is just rotation.x/y/z on a bone ('YXZ' order).
     mesh       lofted rings (superellipse cross-sections) built straight in the skeleton's rest space, each vertex weighted to up to four bones by where it is.
                Pieces (body by sex and outfit, head by sex, hair by style, glasses, hats, bag) are built once, cached, and concatenated per person.
     look       per person: vertex tints from a palette (skin, hair, top, sleeves, trousers, lower legs, shoes, iris, lips ...) and, on the head, how much hair
                covers each vertex. The shader does the rest from the rest-pose position: skin mottling and pores, a soft noisy HAIRLINE (the hair volume's
                thickness goes to zero exactly where that coverage ends, so there is never a hard edge on the forehead), brows, stubble and beards, hair strands,
                woven cloth, and eyes with an iris, limbal ring, pupil and catch-light.
     physics    Human.physics(): the soft bones are damped springs chasing their rest point (so tissue lags and settles when the body accelerates) and the hair,
                hem and bag are pendulums under gravity. Human.rag*(): a 13-point Verlet ragdoll with stick constraints and ground contact that takes over when
                someone is knocked down, then blends back into the animation as they get up. Children get the hair, hem and bag motion only. */
const Human = {}, HU = { pieces: {}, mat: null, live: new Set(), n: 0 };
const HU_BONES = [['hips', -1, 0, 0.955, 0], ['tor', 0, 0, 0.085, 0], ['chest', 1, 0, 0.25, 0], ['neck', 2, 0, 0.265, -0.005], ['head', 3, 0, 0.053, 0.009],
  ['armL', 2, -1, 0.208, 0], ['elL', 5, 0, -0.31, 0], ['handL', 6, 0, -0.3, 0], ['armR', 2, 1, 0.208, 0], ['elR', 8, 0, -0.31, 0], ['handR', 9, 0, -0.3, 0],
  ['legL', 0, -0.098, -0.02, 0], ['knL', 11, 0, -0.43, 0], ['footL', 12, 0, -0.43, 0], ['legR', 0, 0.098, -0.02, 0], ['knR', 14, 0, -0.43, 0], ['footR', 15, 0, -0.43, 0],
  ['jaw', 4, 0, 0.09, -0.012], ['lid', 4, 0, 0.128, 0.09],
  ['bustL', 2, -0.078, 0.085, 0.07], ['bustR', 2, 0.078, 0.085, 0.07], ['belly', 1, 0, 0.09, 0.09], ['gluL', 0, -0.085, -0.035, -0.08], ['gluR', 0, 0.085, -0.035, -0.08],
  ['hair1', 4, 0, 0.07, -0.09], ['hair2', 24, 0, -0.12, -0.012], ['hair3', 25, 0, -0.12, 0], ['hem', 0, 0, -0.08, 0], ['bag', 2, 0, 0.08, -0.15]];
const HU_I = {}; HU_BONES.forEach((b, i) => { HU_I[b[0]] = i; });
/* rest heights of the joints above the ground: hips, tor (waist), chest, neck, head (chin), shoulder, elbow, wrist, hip joint, knee, ankle */
const HU_Y = { H: 0.955, T: 1.04, C: 1.29, N: 1.555, HD: 1.608, S: 1.498, E: 1.188, W: 0.888, J: 0.935, K: 0.505, A: 0.075 };
const HU_REG = { skin: 0, cloth: 1, shoe: 2, hair: 3, eye: 4, lip: 5, hard: 6 };
const HU_SL = { skin: 0, hair: 1, top: 2, arm: 3, bot: 4, leg: 5, shoe: 6, iris: 7, lip: 8, hat: 9, glass: 10, bag: 11, white: 12, inner: 13, tie: 14, hat2: 15, thigh: 16, dark: 17, skin2: 18 };
const _hv = new THREE.Vector3(), _hv2 = new THREE.Vector3(), _hv3 = new THREE.Vector3(), _hv4 = new THREE.Vector3(), _hq = new THREE.Quaternion(), _hq2 = new THREE.Quaternion(), _hq3 = new THREE.Quaternion(), _he = new THREE.Euler(), _hm = new THREE.Matrix4(), _hm3 = new THREE.Matrix3();
function huMx(x, y, z, rx, ry, rz, sx, sy, sz) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x || 0, y || 0, z || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')), new THREE.Vector3(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz));
}

/* ---------------- mesh builder: positions, region/slot/shade/uv per vertex (7 floats), four bone weights per vertex ---------------- */
class HuB {
  constructor() { this.p = []; this.a = []; this.w = []; this.i = []; this.n = 0; this.reg = 0; this.slot = 0; this.wf = null; this.M = null; }
  use(reg, slot, wf, M) { this.reg = reg; this.slot = slot; this.wf = wf; this.M = M || null; return this; }
  _v(x, y, z, c, u, v) {
    if (this.M) { _hv.set(x, y, z).applyMatrix4(this.M); x = _hv.x; y = _hv.y; z = _hv.z; }
    this.p.push(x, y, z); if (c == null) c = 1;
    if (typeof c === 'number') this.a.push(this.reg, this.slot, c, c, c, u || 0, v || 0); else this.a.push(this.reg, this.slot, c[0], c[1], c[2], u || 0, v || 0);
    const w = this.wf(x, y, z), t = [];
    for (let k = 0; k < w.length; k += 2) if (w[k + 1] > 0.004) t.push([w[k], w[k + 1]]);
    if (!t.length) t.push([w[0], 1]);
    t.sort((A, B) => B[1] - A[1]); if (t.length > 4) t.length = 4; let s = 0; for (const e of t) s += e[1];
    for (let k = 0; k < 4; k++) { const e = t[k]; this.w.push(e ? e[0] : 0, e ? e[1] / s : 0); }
    return this.n++;
  }
  /* rings: { y (along the axis), a (half width x), b (half depth), x, z (or v when the axis is z) centre, e (superellipse exponent), c (shade), sl / rg (switch slot / region from this ring on) } */
  loft(rings, o) {
    o = o || {}; const seg = o.seg || 14, ax = o.axis || 'y', arc = o.arc || null, n = rings.length, cols = arc ? seg + 1 : seg, base = this.n;
    for (let j = 0; j < n; j++) {
      const r = rings[j], k = 2 / (r.e || 2); if (r.sl != null) this.slot = r.sl; if (r.rg != null) this.reg = r.rg;
      for (let s = 0; s < cols; s++) {
        const t = arc ? arc[0] + (arc[1] - arc[0]) * s / seg : o.warp ? Math.PI / 2 + TAU * (s / seg - 0.5) - o.warp * Math.sin(TAU * (s / seg - 0.5)) : s / seg * TAU, cs = Math.cos(t), sn = Math.sin(t);   /* warp packs the columns toward the front, where the face needs them */
        const px = r.a * Math.sign(cs) * Math.pow(Math.abs(cs), k), pz = r.b * Math.sign(sn) * Math.pow(Math.abs(sn), k);
        if (ax === 'y') this._v((r.x || 0) + px, r.y, (r.z || 0) + pz, r.c, s / seg, j / (n - 1)); else this._v((r.x || 0) + px, (r.v || 0) + pz, r.y, r.c, s / seg, j / (n - 1));
      }
    }
    for (let j = 0; j < n - 1; j++) for (let s = 0; s < (arc ? seg : cols); s++) {
      const s2 = arc ? s + 1 : (s + 1) % seg, a = base + j * cols + s, b = base + j * cols + s2, c = base + (j + 1) * cols + s, d = base + (j + 1) * cols + s2;
      this.i.push(a, c, b, b, c, d);
    }
    if (o.cap && !arc) for (const j of [0, n - 1]) {
      if (!o.cap[j ? 1 : 0]) continue; const r = rings[j], ctr = ax === 'y' ? this._v(r.x || 0, r.y, r.z || 0, r.c, 0.5, j ? 1 : 0) : this._v(r.x || 0, r.v || 0, r.y, r.c, 0.5, j ? 1 : 0);
      for (let s = 0; s < seg; s++) this.i.push(ctr, base + j * cols + s, base + j * cols + (s + 1) % seg);
    }
  }
  /* ellipsoid (or a cap of it, t0..t1 from the bottom pole 0 to the top pole PI), turned by rot = [rx, ry, rz] about its centre */
  ell(cx, cy, cz, rx, ry, rz, c, rot, o) {
    o = o || {}; const lat = o.lat || 6, t0 = o.t0 == null ? 0 : o.t0, t1 = o.t1 == null ? Math.PI : o.t1, rings = [], M0 = this.M;
    for (let j = 0; j <= lat; j++) { const th = t0 + (t1 - t0) * j / lat; rings.push({ y: -ry * Math.cos(th), a: Math.max(1e-5, rx * Math.sin(th)), b: Math.max(1e-5, rz * Math.sin(th)), c }); }
    const M = huMx(cx, cy, cz, rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0); if (M0) M.premultiply(M0);
    this.M = M; this.loft(rings, { seg: o.seg || 10 }); this.M = M0;
  }
  box(cx, cy, cz, sx, sy, sz, c, rot) {
    const M0 = this.M, M = huMx(cx, cy, cz, rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0); if (M0) M.premultiply(M0); this.M = M;
    const h = [sx / 2, sy / 2, sz / 2], F = [[[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]];
    for (const f of F) { const o = this.n; for (const q of f) this._v(q[0] * h[0], q[1] * h[1], q[2] * h[2], c, 0, 0); this.i.push(o, o + 1, o + 2, o, o + 2, o + 3); }
    this.M = M0;
  }
  /* round tube through points with a radius at each (0 closes it to a tip) */
  tube(P, rad, c, seg) {
    seg = seg || 6; const n = P.length, base = this.n, T = new THREE.Vector3(), U = new THREE.Vector3(), V = new THREE.Vector3();
    for (let j = 0; j < n; j++) {
      const a = P[Math.max(0, j - 1)], b = P[Math.min(n - 1, j + 1)]; T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      U.set(1, 0, 0); if (Math.abs(T.x) > 0.9) U.set(0, 0, 1); U.cross(T).normalize(); V.crossVectors(T, U);
      for (let s = 0; s < seg; s++) { const t = s / seg * TAU, cs = Math.cos(t) * rad[j], sn = Math.sin(t) * rad[j]; this._v(P[j][0] + U.x * cs + V.x * sn, P[j][1] + U.y * cs + V.y * sn, P[j][2] + U.z * cs + V.z * sn, c, s / seg, j / (n - 1)); }
    }
    for (let j = 0; j < n - 1; j++) for (let s = 0; s < seg; s++) { const s2 = (s + 1) % seg, a = base + j * seg + s, b = base + j * seg + s2, d = base + (j + 1) * seg + s, e = base + (j + 1) * seg + s2; this.i.push(a, d, b, b, d, e); }
  }
  /* any indexed BufferGeometry */
  add(geo, M, c) {
    const pa = geo.attributes.position, o = this.n, M0 = this.M; this.M = M0 && M ? M.clone().premultiply(M0) : M || M0;
    for (let k = 0; k < pa.count; k++) this._v(pa.getX(k), pa.getY(k), pa.getZ(k), c, 0, 0);
    const ix = geo.index.array; for (let k = 0; k < ix.length; k++) this.i.push(o + ix[k]); this.M = M0;
  }
  shift(x, y, z) { for (let k = 0; k < this.n; k++) { this.p[k * 3] += x; this.p[k * 3 + 1] += y; this.p[k * 3 + 2] += z; } }
  done(extra) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setIndex(this.i); g.computeVertexNormals();
    const o = Object.assign({ n: this.n, p: new Float32Array(this.p), nr: new Float32Array(g.attributes.normal.array), a: new Float32Array(this.a), w: new Float32Array(this.w), i: new Uint32Array(this.i) }, extra || null); g.dispose(); return o;
  }
}

/* ---------------- where each vertex's weight goes (rest-space position -> [bone, weight, ...]) ---------------- */
function huWeights(sex, W) {
  const I = HU_I, Y = HU_Y, s = sstep, kb = sex === 'F' ? 0.8 : sex === 'M' ? 0.3 : 0, ks = sex === 'K' ? 0 : 1;
  const g2 = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
  return {
    torso(x, y, z) {
      const t1 = s(Y.T - 0.04, Y.T + 0.07, y), t2 = s(Y.T + 0.17, Y.T + 0.33, y), t3 = s(Y.N - 0.04, Y.N + 0.02, y), ax = Math.abs(x), L = x < 0;
      let hp = 1 - t1, tr = t1 * (1 - t2), ch = t2 * (1 - t3); const nk = t2 * t3;
      const am = ch * s(W - 0.075, W + 0.005, ax) * s(Y.S - 0.11, Y.S - 0.02, y) * 0.5; ch -= am;
      const bm = ch * kb * g2(ax, y, 0.078, Y.C + 0.085, 0.052, 0.058) * s(0.015, 0.075, z); ch -= bm;
      const be = ks * 0.55 * g2(x, y, 0, Y.T + 0.09, 0.12, 0.1) * s(0.02, 0.085, z), b1 = tr * be, b2 = hp * be; tr -= b1; hp -= b2;
      const lg = hp * s(Y.H - 0.02, Y.H - 0.22, y) * s(0.01, 0.09, ax) * 0.5; hp -= lg;   /* a long coat's skirts follow the thighs */
      return [I.hips, hp, I.tor, tr, I.chest, ch, I.neck, nk, L ? I.armL : I.armR, am, L ? I.bustL : I.bustR, bm, I.belly, b1 + b2, L ? I.legL : I.legR, lg];
    },
    pelvis(x, y, z) {
      const ax = Math.abs(x), L = x < 0, up = s(Y.H + 0.04, Y.H + 0.12, y) * 0.5; let hp = 1 - up;
      const lm = hp * s(Y.H - 0.02, Y.H - 0.13, y) * s(0.02, 0.1, ax) * 0.75; hp -= lm;
      const gm = hp * ks * 0.5 * g2(ax, y, 0.085, Y.H - 0.035, 0.065, 0.075) * s(-0.02, -0.085, z); hp -= gm;
      return [I.hips, hp, I.tor, up, L ? I.legL : I.legR, lm, L ? I.gluL : I.gluR, gm];
    },
    skirt(x, y, z) { const t = s(Y.H + 0.05, Y.H - 0.3, y); return [I.hips, 1 - t * 0.8, x < 0 ? I.legL : I.legR, t * 0.45, I.hem, t * 0.35]; },
    leg(sx) {
      const lg = sx < 0 ? I.legL : I.legR, kn = sx < 0 ? I.knL : I.knR, ft = sx < 0 ? I.footL : I.footR;
      return (x, y) => { const h = s(Y.J - 0.14, Y.J + 0.04, y) * 0.55, k = s(Y.K + 0.07, Y.K - 0.07, y), a = s(Y.A + 0.06, Y.A - 0.01, y); return [I.hips, h, lg, (1 - h) * (1 - k), kn, k * (1 - a), ft, k * a]; };
    },
    arm(sx) {
      const am = sx < 0 ? I.armL : I.armR, el = sx < 0 ? I.elL : I.elR, hd = sx < 0 ? I.handL : I.handR;
      return (x, y) => { const c = s(Y.S - 0.07, Y.S + 0.03, y) * 0.4, e = s(Y.E + 0.06, Y.E - 0.06, y), w = s(Y.W + 0.04, Y.W - 0.02, y); return [I.chest, c, am, (1 - c) * (1 - e), el, e * (1 - w), hd, e * w]; };
    },
    one(b) { const r = [b, 1]; return () => r; },
    /* the three below take HEAD-space positions (the head and hair are built round the chin and moved up afterwards) */
    head(x, y, z) { const jw = s(0.052, 0.03, y) * s(0.0, 0.05, z) * 0.92; return [I.head, 1 - jw, I.jaw, jw]; },
    neck(x, y) { const c = s(-0.055, -0.15, y), t = s(-0.1, 0.0, y); return [I.chest, c, I.neck, (1 - c) * (1 - t), I.head, (1 - c) * t]; },
    hair(x, y) { const w1 = s(0.09, 0.0, y), w2 = s(-0.02, -0.09, y), w3 = s(-0.14, -0.2, y); return [I.head, 1 - w1, I.hair1, w1 * (1 - w2), I.hair2, w2 * (1 - w3), I.hair3, w2 * w3]; }
  };
}

/* ---------------- body: torso, pelvis, legs, feet, arms, hands, clothes ---------------- */
const HU_TM = [[-0.03, 0.17, 0.108, -0.004, 2.6, 0.84], [0.01, 0.168, 0.107, -0.004, 2.6, 0.95], [0.10, 0.152, 0.098, -0.002, 2.5, 1], [0.21, 0.164, 0.103, 0, 2.4, 1], [0.32, 0.181, 0.112, 0.004, 2.4, 1], [0.41, 0.19, 0.106, 0.002, 2.5, 1], [0.46, 0.19, 0.092, -0.002, 2.6, 0.98], [0.495, 0.148, 0.076, -0.006, 2.3, 0.97], [0.515, 0.075, 0.058, -0.008, 2.1, 1.06], [0.53, 0.058, 0.052, -0.006, 2, 1.06]];
const HU_TF = [[-0.03, 0.178, 0.108, -0.004, 2.6, 0.84], [0.01, 0.176, 0.107, -0.004, 2.6, 0.95], [0.10, 0.132, 0.092, -0.002, 2.4, 1], [0.21, 0.15, 0.1, 0.002, 2.3, 1], [0.30, 0.168, 0.116, 0.016, 2.3, 1], [0.36, 0.172, 0.118, 0.02, 2.3, 1], [0.42, 0.172, 0.104, 0.006, 2.4, 1], [0.46, 0.172, 0.088, -0.002, 2.5, 0.98], [0.495, 0.136, 0.072, -0.006, 2.3, 0.97], [0.515, 0.07, 0.054, -0.008, 2.1, 1.06], [0.53, 0.054, 0.05, -0.006, 2, 1.06]];
const HU_TC = [[-0.30, 0.212, 0.145, -0.004, 2.4, 0.78], [-0.26, 0.208, 0.14, -0.004, 2.4, 0.9], [-0.12, 0.192, 0.125, -0.004, 2.4, 1], [0.05, 0.168, 0.108, -0.002, 2.4, 1], [0.12, 0.166, 0.106, 0, 2.4, 1], [0.22, 0.176, 0.112, 0, 2.4, 1], [0.32, 0.192, 0.12, 0.004, 2.4, 1], [0.41, 0.2, 0.112, 0.002, 2.5, 1], [0.46, 0.2, 0.098, -0.002, 2.6, 0.98], [0.495, 0.154, 0.082, -0.006, 2.3, 0.97], [0.515, 0.082, 0.064, -0.008, 2.1, 1.08], [0.532, 0.064, 0.056, -0.006, 2, 1.08]];
const HU_HIPS = [[-0.115, 0.152, 0.098, 0, 2.4, 0.85], [-0.06, 0.168, 0.108, 0, 2.4, 0.95], [0.02, 0.17, 0.108, 0, 2.5, 1], [0.04, 0.166, 0.106, 0, 2.6, 0.4], [0.062, 0.166, 0.106, 0, 2.6, 0.4], [0.075, 0.158, 0.1, 0, 2.5, 1], [0.1, 0.15, 0.096, 0, 2.5, 1]];
const HU_SKIRT = [[0.07, 0.168, 0.108, 0, 2.5, 1], [0.0, 0.176, 0.114, 0, 2.4, 1], [-0.12, 0.2, 0.14, 0, 2.3, 1], [-0.24, 0.235, 0.178, 0, 2.2, 0.98], [-0.33, 0.255, 0.198, 0, 2.2, 0.9], [-0.345, 0.256, 0.2, 0, 2.2, 0.7]];
function huBody(sex, outfit, q) {
  const key = 'b' + sex + outfit + q; if (HU.pieces[key]) return HU.pieces[key];
  const B = new HuB(), Y = HU_Y, R = HU_REG, S = HU_SL, W = sex === 'M' ? 0.19 : 0.172, Wt = huWeights(sex, W), sg = (n) => (q ? n : Math.max(6, Math.round(n * 0.5)));
  const rows = (T) => T.map((r) => ({ y: r[0], a: r[1], b: r[2], z: r[3], e: r[4], c: r[5] })), long = outfit === 'coat' || outfit === 'robe', lim = sex === 'M' ? 1 : sex === 'F' ? 0.9 : 0.94;
  /* torso (shoulders at .46 above the waist, neck base at .53); a coat or robe hangs to mid thigh */
  B.use(R.cloth, S.top, Wt.torso, huMx(0, Y.T, 0)); B.loft(rows(long ? HU_TC : sex === 'F' ? HU_TF : HU_TM), { seg: sg(22) });
  /* pelvis with a belt, then a skirt or the long skirts of a robe */
  B.use(R.cloth, outfit === 'robe' ? S.top : S.bot, Wt.pelvis, huMx(0, Y.H, 0)); B.loft(rows(HU_HIPS), { seg: sg(20) });
  if (outfit === 'skirt') { B.use(R.cloth, S.bot, Wt.skirt, huMx(0, Y.H, 0)); B.loft(rows(HU_SKIRT), { seg: sg(24) }); }
  if (outfit === 'robe') { B.use(R.cloth, S.top, Wt.skirt, huMx(0, Y.H, 0, 0, 0, 0, 1.12, 2.05, 1.08)); B.loft(rows(HU_SKIRT), { seg: sg(24) }); }
  for (const sx of [-1, 1]) {
    /* leg: one tube from the hip joint to the ankle, so the knee bends as cloth; the thigh and the lower leg are separate palette slots (shorts, skirts, tights) */
    B.use(R.cloth, S.thigh, Wt.leg(sx), huMx(sx * 0.098, Y.J, 0));
    const lr = (y, a, b, z, c, sl) => ({ y, a: a * (sex === 'M' ? 1 : 0.96), b, z: z || 0, e: 2, c: c == null ? 1 : c, sl });
    B.loft([lr(0.03, 0.09, 0.092, 0, 0.9, S.thigh), lr(-0.06, 0.094, 0.096), lr(-0.17, 0.086, 0.09), lr(-0.3, 0.07, 0.076), lr(-0.4, 0.061, 0.066), lr(-0.4, 0.061, 0.066, 0, 0.9, S.leg), lr(-0.432, 0.059, 0.064, 0.003),
      lr(-0.5, 0.058, 0.066, -0.006), lr(-0.56, 0.059, 0.07, -0.011), lr(-0.66, 0.05, 0.058, -0.006), lr(-0.77, 0.04, 0.043, -0.001), lr(-0.825, 0.036, 0.039, 0, 0.86), lr(-0.862, 0.036, 0.039, 0, 0.86)], { seg: sg(14), cap: [1, 0] });
    /* shoe: upper and sole */
    B.use(R.shoe, S.shoe, Wt.one(sx < 0 ? HU_I.footL : HU_I.footR), huMx(sx * 0.098, Y.A, 0));
    B.loft([[-0.06, 0.028, 0.03, -0.036], [-0.045, 0.04, 0.04, -0.033], [0, 0.046, 0.045, -0.029], [0.06, 0.049, 0.04, -0.036], [0.12, 0.05, 0.033, -0.043], [0.17, 0.044, 0.028, -0.048], [0.2, 0.03, 0.02, -0.053]].map((r) => ({ y: r[0], a: r[1], b: r[2], v: r[3], e: 2.3, c: 1 })), { seg: sg(12), axis: 'z', cap: [1, 1] });
    B.loft([[-0.062, 0.032, 0.011, -0.065], [-0.04, 0.045, 0.012, -0.065], [0.09, 0.052, 0.012, -0.065], [0.17, 0.047, 0.012, -0.065], [0.206, 0.03, 0.009, -0.065]].map((r) => ({ y: r[0], a: r[1], b: r[2], v: r[3], e: 3, c: 0.42 })), { seg: sg(10), axis: 'z', cap: [1, 1] });
    /* arm: one tube from the shoulder to the wrist; the lower part is its own slot (long or short sleeves) */
    B.use(R.cloth, S.top, Wt.arm(sx), huMx(sx * W, Y.S, 0));
    const ar = (y, a, b, c, sl) => ({ y, a: a * lim, b: b * lim, e: 2, c: c == null ? 1 : c, sl });
    B.ell(0, -0.018, 0, 0.05 * lim, 0.044, 0.052 * lim, 1, null, { seg: sg(10) });
    B.loft([ar(0.012, 0.028, 0.03, 0.94, S.top), ar(0.004, 0.042, 0.046), ar(-0.016, 0.052, 0.055), ar(-0.05, 0.055, 0.057), ar(-0.1, 0.051, 0.052), ar(-0.165, 0.048, 0.049, 0.9), ar(-0.17, 0.047, 0.048, 0.92, S.arm), ar(-0.24, 0.045, 0.046), ar(-0.31, 0.042, 0.043),
      ar(-0.36, 0.045, 0.046), ar(-0.43, 0.042, 0.043), ar(-0.53, 0.032, 0.032), ar(-0.59, 0.028, 0.027, 0.92), ar(-0.612, 0.027, 0.026, 0.9)], { seg: sg(12), cap: [0, 1] });
    /* hand: flat palm, four fingers and a thumb (a mitten in the far version), built as a right hand and mirrored */
    B.use(R.skin, S.skin, Wt.one(sx < 0 ? HU_I.handL : HU_I.handR), huMx(sx * W, Y.W, 0, 0, 0, 0, sx, 1, 1));
    const pr = (y, a, b, z, e, c) => ({ y, a, b, z, e, c });
    if (q) {
      B.loft([pr(0.012, 0.022, 0.024, 0, 2, 0.97), pr(-0.01, 0.0175, 0.028, 0.001, 2.2, 1), pr(-0.04, 0.0135, 0.033, 0.002, 2.4, 1.02), pr(-0.077, 0.0105, 0.033, 0.002, 2.6, 1.03)], { seg: 10, cap: [0, 1] });
      const fin = (z, len, curl, w) => { const P = [], Rr = []; for (let k = 0; k < 5; k++) { const t = k / 4, a = curl * t * t; P.push([-a * 0.6 * len, -0.074 - len * t * (1 - 0.12 * t), z]); Rr.push(k === 4 ? 0.0012 : w * (1 - 0.18 * t)); } B.tube(P, Rr, [1.03, 0.98, 0.97], 6); };
      fin(0.0245, 0.07, 0.35, 0.0076); fin(0.0082, 0.078, 0.45, 0.0078); fin(-0.0085, 0.073, 0.5, 0.0075); fin(-0.0245, 0.058, 0.55, 0.0068);
      B.tube([[0.001, -0.016, 0.026], [0.0, -0.036, 0.042], [-0.003, -0.053, 0.049], [-0.006, -0.067, 0.05]], [0.0108, 0.0098, 0.0088, 0.0015], [1.03, 0.98, 0.97], 6);
    } else B.loft([pr(0.012, 0.022, 0.024, 0, 2, 1), pr(-0.04, 0.014, 0.033, 0.002, 2.4, 1), pr(-0.11, 0.012, 0.03, 0.002, 2.4, 1), pr(-0.145, 0.006, 0.016, 0, 2, 1)], { seg: 6, cap: [0, 1] });
  }
  /* a suit shows a shirt front, a tie and lapels; a robe a white bib */
  if (outfit.slice(0, 4) === 'suit') {
    const zf = (sex === 'F' ? 0.108 : 0.103) + 0.008; B.use(R.cloth, S.inner, Wt.torso, huMx(0, Y.T, 0)); B.box(0, 0.37, zf, 0.1, 0.25, 0.012, 1);
    if (outfit === 'suitt') { B.slot = S.tie; B.box(0, 0.345, zf + 0.007, 0.04, 0.23, 0.01, 1); B.box(0, 0.462, zf + 0.007, 0.05, 0.04, 0.014, 0.85); }
    B.slot = S.top; B.box(-0.066, 0.43, zf + 0.003, 0.055, 0.13, 0.01, 0.92, [0, 0, 0.42]); B.box(0.066, 0.43, zf + 0.003, 0.055, 0.13, 0.01, 0.92, [0, 0, -0.42]);
  } else if (outfit === 'robe') { B.use(R.cloth, S.white, Wt.torso, huMx(0, Y.T, 0)); B.box(0, 0.33, 0.124, 0.16, 0.3, 0.012, 1); B.box(0, 0.5, 0.0, 0.17, 0.05, 0.13, 1); }
  return (HU.pieces[key] = B.done());
}

/* ---------------- head ---------------- */
/* skull profile: [height above the chin, half width, half depth, centre z, superellipse exponent]; a smooth curve through these rows */
const HU_HR = [[0, 0.034, 0.045, 0.05, 2.2], [0.012, 0.056, 0.066, 0.04, 2.2], [0.035, 0.072, 0.085, 0.022, 2.2], [0.065, 0.079, 0.096, 0.01, 2.2], [0.105, 0.082, 0.102, 0.004, 2.2], [0.14, 0.082, 0.104, 0, 2.2], [0.18, 0.08, 0.101, -0.004, 2.2], [0.215, 0.069, 0.088, -0.008, 2.2], [0.238, 0.044, 0.058, -0.008, 2.2], [0.247, 0.015, 0.022, -0.008, 2.2]];
function huRing(y) {
  const T = HU_HR, n = T.length; if (y <= T[0][0]) return T[0]; if (y >= T[n - 1][0]) return T[n - 1];
  let k = 0; while (y > T[k + 1][0]) k++;
  const r0 = T[Math.max(0, k - 1)], r1 = T[k], r2 = T[k + 1], r3 = T[Math.min(n - 1, k + 2)], h = r2[0] - r1[0], t = (y - r1[0]) / h, t2 = t * t, t3 = t2 * t, o = [y];
  for (let c = 1; c < 5; c++) { const m1 = (r2[c] - r0[c]) / ((r2[0] - r0[0]) || 1) * h, m2 = (r3[c] - r1[c]) / ((r3[0] - r1[0]) || 1) * h; o.push((2 * t3 - 3 * t2 + 1) * r1[c] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * r2[c] + (t3 - t2) * m2); }
  return o;
}
/* a point on the skull at height y and angle t (PI/2 = the face, 0 = the right ear) */
function huSkull(y, t, out) { const r = huRing(y), k = 2 / r[4], cs = Math.cos(t), sn = Math.sin(t); out[0] = r[1] * Math.sign(cs) * Math.pow(Math.abs(cs), k); out[1] = r[3] + r[2] * Math.sign(sn) * Math.pow(Math.abs(sn), k); return out; }
const huFz = (y) => { const r = huRing(y); return r[3] + r[2]; };
const HU_HEADK = { M: { jaw: 1.03, brow: 1.25, lip: 0.9, eye: 1, cheek: 1 }, F: { jaw: 0.94, brow: 0.6, lip: 1.25, eye: 1.07, cheek: 1.15 }, K: { jaw: 0.95, brow: 0.4, lip: 1.05, eye: 1.16, cheek: 1.3 } };
function huHead(sex, q) {
  const key = 'h' + sex + q; if (HU.pieces[key]) return HU.pieces[key];
  const B = new HuB(), R = HU_REG, S = HU_SL, Wt = huWeights(sex, 0.19), K = HU_HEADK[sex], gau = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
  /* neck, then the skull as one loft, sculpted: eye sockets, brow ridge, cheekbones, cheek hollows, temples, chin, the bridge and ball of the nose, lips */
  B.use(R.skin, S.skin, Wt.neck); B.loft([[-0.16, 0.058, 0.054, -0.016, 0.96], [-0.1, 0.055, 0.052, -0.013, 1], [-0.04, 0.05, 0.048, -0.01, 0.95], [0.0, 0.045, 0.046, -0.006, 0.9], [0.03, 0.042, 0.045, -0.004, 0.9]].map((r) => ({ y: r[0], a: r[1], b: r[2], z: r[3], e: 2, c: r[4] })), { seg: q ? 16 : 8 });
  B.use(R.skin, S.skin, Wt.head);
  const YS = q ? [0, 0.005, 0.011, 0.018, 0.026, 0.034, 0.041, 0.0455, 0.05, 0.056, 0.063, 0.07, 0.077, 0.084, 0.092, 0.1, 0.108, 0.116, 0.1225, 0.128, 0.1335, 0.14, 0.147, 0.1535, 0.16, 0.168, 0.178, 0.19, 0.202, 0.213, 0.223, 0.231, 0.238, 0.243, 0.247] : [0, 0.013, 0.032, 0.056, 0.08, 0.105, 0.128, 0.155, 0.18, 0.204, 0.223, 0.238, 0.247];
  const seg = q ? 52 : 16, v0 = B.n;
  B.loft(YS.map((y) => { const r = huRing(y); return { y, a: r[1] * (y < 0.075 ? lerp(K.jaw, 1, y / 0.075) : 1), b: r[2], z: r[3], e: r[4], c: 1 }; }), { seg, cap: [0, 1], warp: q ? 0.7 : 0.4 });
  for (let k = v0; k < B.n; k++) {
    const x = B.p[k * 3], y = B.p[k * 3 + 1], z = B.p[k * 3 + 2], rz = z - huRing(Math.min(y, 0.247))[3], ang = Math.atan2(x, rz), m = Math.max(0, 1 - Math.abs(ang) / 1.15), mm = m * m * (3 - 2 * m);
    let d = 0, sh = [1, 1, 1];
    for (const sx of [-1, 1]) {
      const so = gau(x, y, sx * 0.033, 0.128, 0.021, 0.0165) * mm; d -= 0.0052 * so; sh[0] -= 0.1 * so; sh[1] -= 0.12 * so; sh[2] -= 0.12 * so;            /* eye socket, a little shadowed */
      const ck = gau(x, y, sx * 0.058, 0.09, 0.021, 0.018) * mm; d += 0.0034 * K.cheek * ck; sh[1] -= 0.05 * ck; sh[2] -= 0.045 * ck;                   /* cheekbone, a little flushed */
      d -= 0.0022 * gau(x, y, sx * 0.05, 0.058, 0.018, 0.017) * mm; d -= 0.0026 * gau(x, y, sx * 0.075, 0.15, 0.012, 0.02);                              /* cheek hollow, temple */
      d += 0.0012 * gau(x, y, sx * 0.019, 0.053, 0.008, 0.012) * mm;                                                                                    /* corners of the mouth */
    }
    d += 0.0042 * K.brow * Math.exp(-(((y - 0.1475) / 0.0125) ** 2)) * Math.exp(-((x / 0.058) ** 4)) * mm;                                               /* brow ridge */
    d += 0.003 * gau(x, y, 0, 0.004, 0.022, 0.016) * mm;                                                                                                /* chin */
    const nb = Math.exp(-((x / 0.0085) ** 2)) * sstep(0.074, 0.09, y) * (1 - sstep(0.118, 0.146, y)) * mm, nt = gau(x, y, 0, 0.083, 0.0115, 0.0098) * mm;
    d += nb * (0.0065 + 0.0075 * (1 - sstep(0.082, 0.136, y))) + 0.0125 * nt; sh[1] -= 0.04 * nt; sh[2] -= 0.04 * nt;                                    /* nose: bridge and ball, part of the skin */
    for (const sx of [-1, 1]) d += 0.0052 * gau(x, y, sx * 0.0112, 0.0805, 0.0058, 0.0062) * mm;                                                        /* nostril wings */
    d -= 0.0016 * gau(x, y, 0, 0.066, 0.0045, 0.008) * mm;                                                                                              /* philtrum */
    const hl = Math.hypot(x, rz) || 1; B.p[k * 3] += x / hl * d; B.p[k * 3 + 2] += rz / hl * d; B.a[k * 7 + 2] = sh[0]; B.a[k * 7 + 3] = sh[1]; B.a[k * 7 + 4] = sh[2];
  }
  for (const sx of [-1, 1]) {
    B.slot = S.skin2; if (q) B.ell(sx * 0.0072, 0.0748, huFz(0.0748) + 0.0152, 0.0042, 0.0026, 0.0048, 0.32, null, { seg: 6, lat: 3 });                                    /* nostril */
    B.ell(sx * 0.0815, 0.105, -0.003, 0.0085, 0.026, 0.0165, [1.0, 0.9, 0.9], [0, 0, -sx * 0.12], { seg: q ? 10 : 6 });                                  /* ear */
    if (q) B.ell(sx * 0.0845, 0.108, 0.0, 0.0045, 0.016, 0.009, [0.72, 0.6, 0.6], [0, 0, -sx * 0.12], { seg: 6, lat: 3 });
    if (q) B.ell(sx * 0.033, 0.1232, huFz(0.1232) - 0.0085, 0.0145 * K.eye, 0.0042, 0.0085, [0.92, 0.88, 0.88], null, { seg: 12, lat: 3, t0: 0, t1: Math.PI * 0.3 });   /* lower lid */
  }
  /* lips: the lower one opens with the jaw; a dark line between them */
  B.use(R.lip, S.lip, Wt.one(HU_I.head)); B.ell(0, 0.0518, huFz(0.052) - 0.0052, 0.0235, 0.0058 * K.lip, 0.0086, [1, 0.94, 0.94], null, { seg: q ? 12 : 6 });
  B.use(R.lip, S.lip, Wt.one(HU_I.jaw)); B.ell(0, 0.0402, huFz(0.04) - 0.0062, 0.02, 0.0062 * K.lip, 0.0088, 1, null, { seg: q ? 12 : 6 });
  B.use(R.skin, S.dark, Wt.one(HU_I.head)); B.ell(0, 0.0458, huFz(0.0455) - 0.0042, 0.0195, 0.003, 0.0058, 1, null, { seg: 8, lat: 3 });
  /* eyes: flattened globes sunk in the sockets; uv = offset from the pupil in iris radii, which is all the shader needs */
  const ez = huFz(0.128) - 0.0098, e0 = B.n; B.use(R.eye, S.iris, Wt.one(HU_I.head));
  for (const sx of [-1, 1]) B.ell(sx * 0.033, 0.128, ez, 0.0135 * K.eye, 0.0088 * K.eye, 0.0078, 1, null, { seg: q ? 14 : 8, lat: q ? 7 : 4 });
  for (let k = e0; k < B.n; k++) { const x = B.p[k * 3], y = B.p[k * 3 + 1]; B.a[k * 7 + 5] = (x - Math.sign(x) * 0.033) / (0.0064 * K.eye); B.a[k * 7 + 6] = (y - 0.128) / (0.0064 * K.eye); }
  /* upper lids hang on the lid bone: turning it closes the eyes. The lower edge is dark (lashes) */
  if (q) { B.use(R.skin, S.skin2, Wt.one(HU_I.lid)); for (const sx of [-1, 1]) { const l0 = B.n; B.ell(sx * 0.033, 0.1312, huFz(0.1315) - 0.0082, 0.0152 * K.eye, 0.0108 * K.eye, 0.0098, 0.97, null, { seg: 14, lat: 5, t0: Math.PI * 0.66, t1: Math.PI }); for (let k = l0; k < l0 + 14; k++) { B.a[k * 7 + 2] = 0.2; B.a[k * 7 + 3] = 0.16; B.a[k * 7 + 4] = 0.14; } } }
  B.shift(0, HU_Y.HD, 0.004);
  return (HU.pieces[key] = B.done({ head: true }));
}

/* ---------------- hair ---------------- */
/* Hair coverage of a point on the head (head space), 0..1. The hairline is an elevation that depends on the direction round the head: across the forehead (higher at
   the temples, a slight peak in the middle), down in front of the ears as sideburns, and low across the nape. H = hairline shape for this person. */
function huHL(sex, st, old, kid) {
  const H = { front: sex === 'M' ? 0.66 : 0.61, temple: sex === 'M' ? 0.1 : 0.02, peak: sex === 'M' ? 0.05 : 0.02, side: sex === 'M' ? -0.3 : -0.12, nape: -0.85, bald: 0, crown: 0.55, dens: 1 };
  if (kid) { H.front = 0.6; H.temple = 0; H.side = -0.08; }
  if (old && sex === 'M') { H.front += 0.1; H.temple += 0.12; }
  if (st === 'buzz') H.dens = 0.6; else if (st === 'bald') { if (old) { H.bald = 1; H.dens = 0.8; } else H.dens = 0.3; }
  return H;
}
function huCov(x, y, z, H, wide) {
  const dy = y - 0.135, dz = z + 0.004, r = Math.hypot(x, dy, dz) || 1, el = Math.asin(clamp(dy / r, -1, 1)), az = Math.abs(Math.atan2(x, dz));
  let b = H.front + H.temple * Math.exp(-(((az - 0.72) / 0.22) ** 2)) - H.peak * Math.exp(-((az / 0.16) ** 2));
  b = lerp(b, H.side, sstep(0.85, 1.25, az)); b = lerp(b, H.nape, sstep(1.75, 2.2, az));
  let c = wide ? sstep(b + 0.03, b + 0.42, el) : sstep(b - 0.07, b + 0.07, el);   /* wide: how far in from the hairline, for the taper of the hair's thickness */
  if (H.bald) c *= 1 - H.bald * sstep(H.crown - 0.1, H.crown + 0.1, Math.asin(clamp((dy + 0.3 * dz) / r, -1, 1)));
  return c;
}
/* how thick the hair stands off the scalp for a style, by height on the head and angle (0 = this style is painted on the scalp only) */
const HU_HAIR = { short: [0.017, 0.009, 0.003], slick: [0.008, 0.007, 0.001], curly: [0.03, 0.026, 0.012], long: [0.016, 0.014, 0.003], pony: [0.009, 0.008, 0.002], bun: [0.009, 0.008, 0.002], buzz: null, bald: null };
function huHair(st, sex, hat, q) {
  const T = HU_HAIR[st === 'rim' ? 'short' : st] === undefined ? HU_HAIR.short : HU_HAIR[st]; if (!T) return null;
  const key = 'r' + st + sex + (hat ? 1 : 0) + q; if (HU.pieces[key]) return HU.pieces[key];
  const B = new HuB(), R = HU_REG, S = HU_SL, Wt = huWeights(sex, 0.19), H = huHL(sex, st, false, sex === 'K'), sk = [0, 0], seg = q ? 32 : 12;
  B.use(R.hair, S.hair, Wt.one(HU_I.head));
  /* the cap: the skull pushed out by the hair's thickness, which fades to nothing where the coverage ends, so the visible hairline is the soft one painted on the skin */
  const YS = q ? [0.03, 0.045, 0.06, 0.075, 0.09, 0.105, 0.12, 0.135, 0.15, 0.165, 0.18, 0.195, 0.207, 0.218, 0.228, 0.236, 0.242, 0.2469] : [0.04, 0.08, 0.12, 0.16, 0.195, 0.225, 0.2469], base = B.n;
  for (let j = 0; j < YS.length; j++) for (let s = 0; s < seg; s++) {
    const y = YS[j], t = s / seg * TAU; huSkull(y, t, sk); const x = sk[0], z = sk[1], c = huCov(x, y, z, H), up = sstep(0.1, 0.2, y);
    let th = lerp(T[1], T[0], up) + T[2] * (noise2(t * 3.1 + 5, y * 60) - 0.5) * 2; if (hat && y > 0.11) th = Math.min(th, 0.004);
    th = c < 0.6 ? -0.005 : lerp(-0.003, th, huCov(x, y, z, H, 1));   /* under the skin until well inside the painted hair, then thin at the hairline and thicker toward the crown */
    const nx = x, ny = (y - 0.13) * 0.9, nz = z + 0.004, nl = Math.hypot(nx, ny, nz) || 1;
    B._v(x + nx / nl * th, y + ny / nl * th, z + nz / nl * th, 0.92 + 0.16 * noise2(t * 9, y * 40), s / seg, y * 4);
  }
  for (let j = 0; j < YS.length - 1; j++) for (let s = 0; s < seg; s++) { const s2 = (s + 1) % seg, a = base + j * seg + s, b = base + j * seg + s2, c = base + (j + 1) * seg + s, d = base + (j + 1) * seg + s2; B.i.push(a, c, b, b, c, d); }
  if (st === 'long') {
    /* a curtain from the widest part of the head down past the shoulders, round the back from ear to ear; it swings on the hair chain */
    B.use(R.hair, S.hair, Wt.hair); const ys = q ? [0.13, 0.09, 0.05, 0.0, -0.05, -0.1, -0.15, -0.2, -0.235] : [0.13, 0.05, -0.05, -0.15, -0.235], cs = q ? 18 : 8, b0 = B.n, a0 = Math.PI / 2 + 1.18, a1 = Math.PI / 2 + TAU - 1.18;
    for (let j = 0; j < ys.length; j++) for (let s = 0; s <= cs; s++) {
      const y = ys[j], t = a0 + (a1 - a0) * s / cs; huSkull(Math.max(y, 0.1), t, sk); const fall = sstep(0.1, -0.1, y), k = 1 + 0.16 * lerp(1, 0.86, sstep(0, -0.235, y)) + 0.04 * fall, tip = j === ys.length - 1 ? 0.9 : 1;
      B._v(sk[0] * k * tip, y, (sk[1] + 0.004) * k * tip - 0.004 - 0.012 * fall, 0.88 + 0.2 * noise2(t * 8, y * 9), s / cs * 0.6, y * 4);
    }
    for (let j = 0; j < ys.length - 1; j++) for (let s = 0; s < cs; s++) { const a = b0 + j * (cs + 1) + s, b = a + 1, c = a + cs + 1, d = c + 1; B.i.push(a, c, b, b, c, d); }
  } else if (st === 'pony') {
    B.use(R.hair, S.hair, Wt.hair); B.tube([[0, 0.175, -0.098], [0, 0.14, -0.135], [0, 0.05, -0.16], [0, -0.07, -0.152], [0, -0.17, -0.14], [0, -0.215, -0.136]], [0.026, 0.031, 0.029, 0.024, 0.014, 0.002], 1, q ? 10 : 6);
    B.use(R.hard, S.dark, Wt.one(HU_I.head)); B.tube([[0, 0.168, -0.102], [0, 0.152, -0.122]], [0.03, 0.03], 1, 8);
  } else if (st === 'bun') B.ell(0, 0.205, -0.088, 0.045, 0.04, 0.045, 1, [0.5, 0, 0], { seg: q ? 12 : 8 });
  B.shift(0, HU_Y.HD, 0.004);
  return (HU.pieces[key] = B.done());
}
function huGlasses(lens) {
  const key = 'g' + (lens ? 1 : 0); if (HU.pieces[key]) return HU.pieces[key];
  const B = new HuB(), Wt = huWeights('M', 0.19), tor = new THREE.TorusGeometry(0.027, 0.0034, 6, 16), z = huFz(0.128) + 0.007; B.use(HU_REG.hard, HU_SL.glass, Wt.one(HU_I.head));
  for (const sx of [-1, 1]) { B.add(tor, huMx(sx * 0.0435, 0.128, z, 0, 0, 0, 1.06, 0.88, 1), 1); B.box(sx * 0.077, 0.13, z - 0.054, 0.004, 0.004, 0.108, 1, [0, -sx * 0.083, 0]); if (lens) B.ell(sx * 0.0435, 0.128, z, 0.0275, 0.0225, 0.003, 1, null, { seg: 10, lat: 3 }); }
  B.box(0, 0.132, z, 0.02, 0.004, 0.004, 1); tor.dispose(); B.shift(0, HU_Y.HD, 0.004); return (HU.pieces[key] = B.done());
}
const HU_HAT = {
  cap: { y: 0.125, z: -0.004, rx: -0.12, sx: 1.03, sy: 1.0, sz: 1.1, br: [0.078, 0.062], by: 0.168, bz: 0.104 }, beanie: { y: 0.11, z: 0, rx: -0.05, sx: 1.08, sy: 1.22, sz: 1.12 },
  hard: { y: 0.125, z: 0, rx: 0, sx: 1.06, sy: 1.08, sz: 1.12, br: [0.1, 0.09], by: 0.15, bz: 0.092 }, straw: { y: 0.135, z: 0, rx: 0, sx: 1.0, sy: 0.72, sz: 1.06, br: [0.24, 0.24], by: 0.158, bz: 0 },
  cowboy: { y: 0.142, z: 0, rx: 0, sx: 0.98, sy: 0.88, sz: 1.04, br: [0.215, 0.2], by: 0.158, bz: 0.01 }, top: { y: 0.15, z: 0, rx: 0, sx: 0.9, sy: 1.5, sz: 0.95, br: [0.17, 0.17], by: 0.158, bz: 0 }
};
function huHat(k) {
  const hs = HU_HAT[k] || HU_HAT.cap, key = 't' + k; if (HU.pieces[key]) return HU.pieces[key];
  const B = new HuB(), Wt = huWeights('M', 0.19), dome = new THREE.SphereGeometry(0.12, 14, 8, 0, TAU, 0, Math.PI * 0.55), brim = new THREE.CylinderGeometry(0.6, 1, 0.05, 20);
  B.use(HU_REG.cloth, HU_SL.hat, Wt.one(HU_I.head)); B.add(dome, huMx(0, hs.y + 0.004, hs.z, hs.rx, 0, 0, hs.sx * 0.95, hs.sy * 1.14, hs.sz * 0.95), 1);
  if (hs.br) { B.slot = HU_SL.hat2; B.add(brim, huMx(0, hs.by - 0.012, hs.bz, 0, 0, 0, hs.br[0], 1, hs.br[1]), 1); }
  dome.dispose(); brim.dispose(); B.shift(0, HU_Y.HD, 0.004); return (HU.pieces[key] = B.done());
}
function huBag() {
  if (HU.pieces.bag) return HU.pieces.bag; const B = new HuB(), I = HU_I, w = [I.bag, 0.6, I.chest, 0.4]; B.use(HU_REG.cloth, HU_SL.bag, () => w, huMx(0, HU_Y.T, 0));
  B.loft([[0.04, 0.104, 0.06, -0.175, 3.2, 0.9], [0.15, 0.124, 0.075, -0.18, 3.2, 1], [0.32, 0.124, 0.075, -0.178, 3.2, 1], [0.46, 0.106, 0.062, -0.172, 3.2, 0.9]].map((r) => ({ y: r[0], a: r[1], b: r[2], z: r[3], e: r[4], c: r[5] })), { seg: 14, cap: [1, 1] });
  B.box(0, 0.11, -0.222, 0.13, 0.1, 0.03, 0.82); B.wf = huWeights('M', 0.19).torso; for (const sx of [-1, 1]) B.box(sx * 0.09, 0.31, 0.112, 0.03, 0.3, 0.012, 0.42, [0.05, 0, 0]);
  return (HU.pieces.bag = B.done());
}

/* ---------------- the material: one for everybody ---------------- */
function huMaterial() {
  if (HU.mat) return HU.mat;
  const m = HU.mat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, skinning: true, side: THREE.DoubleSide });
  m.extensions = { derivatives: true }; m.customProgramCacheKey = () => 'human2';
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; attribute vec3 aTint2; attribute vec3 aInfo; attribute vec2 aUv;\nvarying vec3 vTint; varying vec3 vTint2; varying vec3 vInfo; varying vec2 vUvH; varying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vTint = aTint; vTint2 = aTint2; vInfo = aInfo; vUvH = aUv; vRest = position;');
    sh.fragmentShader = 'varying vec3 vTint; varying vec3 vTint2; varying vec3 vInfo; varying vec2 vUvH; varying vec3 vRest;\n' + RYG_NOISE + '\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
      float reg_ = floor(vInfo.x + 0.5), hRough_ = 0.8, hg_ = 0.0, hCatch_ = 0.0, hBump_ = 0.012; vec3 col_ = vTint;
      vec2 q_ = vRest.xy + vRest.zz * vec2(0.37, 0.61);
      if (reg_ < 0.5) {
        /* skin: mottling and pores; then whatever hair grows here (scalp, brows, beard) through a noisy threshold, which is what makes the hairline soft and irregular */
        float mott_ = rf_(q_ * 55.0), pore_ = rn_(q_ * 950.0);
        col_ *= 0.95 + 0.07 * mott_ + 0.035 * (pore_ - 0.5); hRough_ = 0.5 + 0.14 * mott_; hg_ = (pore_ - 0.5) * 0.9;
        float st_ = rn_(vec2(atan(vRest.x, vRest.z) * 150.0, vRest.y * 60.0)), st2_ = rn_(q_ * 1300.0);
        float m1_ = smoothstep(0.36, 0.64, vInfo.y + (st_ - 0.5) * 0.44), m2_ = smoothstep(0.42, 0.6, vInfo.z + (st2_ - 0.5) * 0.5), hm_ = max(m1_, m2_);
        col_ = mix(col_, vTint2 * (0.5 + 0.75 * st_), hm_); hRough_ = mix(hRough_, 0.6, hm_); hg_ += hm_ * (st_ - 0.5) * 1.5;
      } else if (reg_ < 1.5) {
        float wv_ = rn_(q_ * 1200.0), wr_ = rf_(q_ * 21.0); col_ *= 0.86 + 0.17 * wr_ + 0.07 * (wv_ - 0.5); hRough_ = 0.9; hg_ = (wv_ - 0.5) * 0.7 + (wr_ - 0.5) * 3.0;
      } else if (reg_ < 2.5) { col_ *= 0.88 + 0.22 * rf_(q_ * 40.0); hRough_ = 0.42; }
      else if (reg_ < 3.5) {
        float st_ = rn_(vec2(vUvH.x * 320.0, vUvH.y * 6.0)), st2_ = rn_(vec2(vUvH.x * 80.0, vUvH.y * 2.0)); col_ *= 0.45 + 0.6 * st_ + 0.4 * st2_; hRough_ = 0.36 + 0.26 * st_; hg_ = (st_ - 0.5) * 2.2 + (st2_ - 0.5) * 1.5; hBump_ = 0.02;
      } else if (reg_ < 4.5) {
        float r_ = length(vUvH), fib_ = rn_(vec2(atan(vUvH.y, vUvH.x) * 9.0, r_ * 3.0));
        vec3 scl_ = vec3(0.9, 0.88, 0.85) * (1.0 - 0.3 * smoothstep(1.5, 2.6, r_)) - vec3(0.0, 0.05, 0.05) * smoothstep(0.55, 0.8, rf_(vUvH * 2.5)) * smoothstep(1.2, 2.2, r_);
        vec3 iris_ = vTint * (0.5 + 0.95 * fib_) * (1.0 - 0.6 * smoothstep(0.72, 1.0, r_));
        col_ = mix(iris_, scl_, smoothstep(0.95, 1.06, r_)); col_ = mix(vec3(0.008), col_, smoothstep(0.34, 0.43, r_));
        hRough_ = 0.07; hBump_ = 0.0; hCatch_ = 1.0 - smoothstep(0.1, 0.18, length(vUvH - vec2(-0.3, 0.34)));
      } else if (reg_ < 5.5) { col_ *= 0.9 + 0.16 * rn_(vec2(vRest.x * 900.0, vRest.y * 120.0)); hRough_ = 0.34; }
      else hRough_ = 0.3;
      diffuseColor.rgb *= col_;`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = hRough_;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = perturbN_(-vViewPosition, normal, vec2(dFdx(hg_), dFdy(hg_)) * hBump_ * (1.0 - smoothstep(6.0, 22.0, length(vViewPosition))), faceDirection);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += vec3(hCatch_) * 0.22;`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      if (reg_ < 0.5 || (reg_ > 4.5 && reg_ < 5.5)) {   /* light scattered under the skin: a warm glow where the surface turns away, so faces never go chalky or grey at the edge */
        float fr_ = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.6);
        reflectedLight.directDiffuse += reflectedLight.directDiffuse * vec3(0.6, 0.17, 0.1) * fr_ + reflectedLight.indirectDiffuse * vec3(0.32, 0.1, 0.06) * fr_;
        reflectedLight.indirectDiffuse *= vec3(1.07, 1.0, 0.95);
      }`);
  };
  return m;
}

/* ---------------- one person ---------------- */
const huC = (c, d) => (c ? [c.r, c.g, c.b] : d);
const HU_IRIS = [[0.07, 0.035, 0.015], [0.1, 0.05, 0.02], [0.05, 0.028, 0.012], [0.07, 0.13, 0.2], [0.09, 0.14, 0.09], [0.13, 0.1, 0.045]];
/* spec: { kid, fem, old, s, hs, stout, skin, hair, shirt, pants, shoe (THREE.Color), sleeve (long), shorts, skirt (0 / 1 skirt / 2 dress), tights, coat, robe, suit, tie, inner,
           hst (hair style), beard, glasses, glassC, sun, hat { k, c, bc }, bag, bagc, seed } */
Human.palette = function (o) {
  const P = [], S = HU_SL, skin = huC(o.skin, [0.8, 0.6, 0.45]), top = huC(o.shirt, [0.5, 0.5, 0.5]), bot = o.skirt === 2 || o.robe ? top : huC(o.pants, [0.1, 0.1, 0.12]), sd = Math.floor((o.seed || 0) * 97) % 6;
  const tights = [0.03 + 0.25 * skin[0], 0.03 + 0.25 * skin[1], 0.035 + 0.25 * skin[2]], bare = o.skirt && !o.tights, lum = skin[0] + skin[1] + skin[2];
  P[S.skin] = skin; P[S.hair] = huC(o.hair, [0.05, 0.035, 0.025]); P[S.top] = top; P[S.arm] = o.sleeve || o.coat || o.robe || o.suit ? top : skin; P[S.bot] = bot;
  P[S.thigh] = o.skirt ? (bare ? skin : tights) : bot; P[S.leg] = o.skirt ? (bare ? skin : tights) : o.shorts ? skin : bot; P[S.shoe] = huC(o.shoe, [0.02, 0.02, 0.025]);
  P[S.iris] = o.iris ? huC(o.iris) : HU_IRIS[lum > 1.25 ? sd : sd % 3]; P[S.lip] = [skin[0] * 0.9, skin[1] * (o.fem ? 0.5 : 0.62), skin[2] * (o.fem ? 0.52 : 0.62)];
  P[S.hat] = o.hat ? huC(o.hat.c, [0.2, 0.2, 0.2]) : [0.2, 0.2, 0.2]; P[S.hat2] = o.hat ? huC(o.hat.bc || o.hat.c, [0.2, 0.2, 0.2]) : [0.2, 0.2, 0.2];
  P[S.glass] = huC(o.glassC, [0.004, 0.004, 0.006]); P[S.bag] = huC(o.bagc, [0.2, 0.2, 0.25]); P[S.white] = [0.9, 0.9, 0.88]; P[S.inner] = huC(o.inner, [0.9, 0.9, 0.9]); P[S.tie] = huC(o.tie, [0.4, 0.05, 0.06]);
  P[S.dark] = [skin[0] * 0.22, skin[1] * 0.14, skin[2] * 0.13]; P[S.skin2] = skin;
  return P;
};
function huGeo(parts, pal, H, o) {
  let nv = 0, ni = 0; for (const p of parts) { nv += p.n; ni += p.i.length; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), tint = new Float32Array(nv * 3), tint2 = new Float32Array(nv * 3), info = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
  const hc = pal[HU_SL.hair], Y = HU_Y, beard = o.beard ? 1 : 0, stub = !o.fem && !o.kid ? 0.2 : 0; let vo = 0, io = 0;
  for (const p of parts) {
    pos.set(p.p, vo * 3); nor.set(p.nr, vo * 3);
    for (let k = 0; k < p.n; k++) {
      const a = k * 7, v = vo + k, c = pal[p.a[a + 1]] || pal[0];
      tint[v * 3] = c[0] * p.a[a + 2]; tint[v * 3 + 1] = c[1] * p.a[a + 3]; tint[v * 3 + 2] = c[2] * p.a[a + 4]; tint2[v * 3] = hc[0]; tint2[v * 3 + 1] = hc[1]; tint2[v * 3 + 2] = hc[2];
      info[v * 3] = p.a[a]; uv[v * 2] = p.a[a + 5]; uv[v * 2 + 1] = p.a[a + 6];
      for (let q = 0; q < 4; q++) { si[v * 4 + q] = p.w[k * 8 + q * 2]; sw[v * 4 + q] = p.w[k * 8 + q * 2 + 1]; }
      if (p.head && p.a[a] === 0 && p.a[a + 1] === 0) {
        /* how much hair grows at this point of the head: scalp (y), and brows / beard / stubble (z) */
        const x = p.p[k * 3], y = p.p[k * 3 + 1] - Y.HD, z = p.p[k * 3 + 2] - 0.004, ax = Math.abs(x);
        info[v * 3 + 1] = y > 0.02 ? huCov(x, y, z, H) * H.dens : 0;
        let f = z > 0.04 ? 0.95 * Math.exp(-(((ax - 0.034) / 0.02) ** 2) - (((y - 0.1545 + 0.09 * (ax - 0.034)) / 0.0052) ** 2)) : 0;
        if (beard || stub) {
          const az = Math.abs(Math.atan2(x, z + 0.004)), jawl = sstep(0.088, 0.062, y) * sstep(1.95, 1.6, az) * sstep(-0.11, -0.06, y), mou = Math.exp(-((x / 0.022) ** 2) - (((y - 0.0455) / 0.0085) ** 2)), mus = Math.exp(-((x / 0.03) ** 4) - (((y - 0.0615) / 0.0075) ** 2)) * (z > 0.05 ? 1 : 0);
          f = Math.max(f, (beard ? 0.9 : stub) * Math.max(jawl * (1 - mou), mus));
        }
        info[v * 3 + 2] = f;
      }
    }
    for (let k = 0; k < p.i.length; k++) idx[io + k] = p.i[k] + vo;
    vo += p.n; io += p.i.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('aTint', new THREE.BufferAttribute(tint, 3)); g.setAttribute('aTint2', new THREE.BufferAttribute(tint2, 3));
  g.setAttribute('aInfo', new THREE.BufferAttribute(info, 3)); g.setAttribute('aUv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.setIndex(new THREE.BufferAttribute(idx, 1)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 2.2); g.boundingBox = new THREE.Box3(new THREE.Vector3(-2, -1.3, -2), new THREE.Vector3(2, 3.1, 2));
  return g;
}
Human.make = function (o) {
  const sex = o.kid ? 'K' : o.fem ? 'F' : 'M', outfit = o.robe ? 'robe' : o.coat ? 'coat' : o.skirt ? 'skirt' : o.suit ? (o.tie ? 'suitt' : 'suit') : 'std', st = o.hst || 'short', W = sex === 'M' ? 0.19 : 0.172;
  const parts = (q) => { const L = [huBody(sex, outfit, q), huHead(sex, q)], hp = huHair(st, sex, !!o.hat, q); if (hp) L.push(hp); if (o.glasses && q) L.push(huGlasses(!!(o.glassC || o.sun))); if (o.hat) L.push(huHat(o.hat.k || 'cap')); if (o.bag) L.push(huBag()); return L; };
  const pal = Human.palette(o), H = huHL(sex, st, !!o.old, !!o.kid), geoHi = huGeo(parts(1), pal, H, o), geoLo = huGeo(parts(0), pal, H, o);
  const root = new THREE.Group(), bones = [], rest = [], b = {};
  for (const d of HU_BONES) { const bn = new THREE.Bone(); bn.name = d[0]; bn.rotation.order = 'YXZ'; bn.position.set(d[0].slice(0, 3) === 'arm' ? d[2] * W : d[2], d[3], d[4]); (d[1] < 0 ? root : bones[d[1]]).add(bn); bones.push(bn); rest.push(bn.position.clone()); b[d[0]] = bn; }
  const mesh = new THREE.SkinnedMesh(geoHi, huMaterial()); mesh.castShadow = true; mesh.receiveShadow = false; root.add(mesh); root.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));
  const s = o.s || 1, inst = { root, mesh, bones, rest, b, spec: o, sex, s, stout: o.stout || 1, geoHi, geoLo, far: false, soft: [], pend: [], rag: null, from: null, blink: 0, blinkT: 1 + Math.random() * 4, id: ++HU.n };
  root.scale.set(s * inst.stout, s, s); if (o.hs && o.hs !== 1) b.head.scale.setScalar(o.hs);
  /* physics bones. Soft tissue: [bone, natural frequency Hz, damping ratio, the furthest it may move in metres]; adults only */
  if (sex !== 'K') {
    const big = clamp((inst.stout - 0.9) / 0.24, 0, 1), sf = (n, hz, zeta, max) => inst.soft.push({ bone: b[n], rest: rest[HU_I[n]], pos: new THREE.Vector3(), vel: new THREE.Vector3(), w2: (TAU * hz) ** 2, c: 2 * zeta * TAU * hz, max, init: false });
    if (sex === 'F') { sf('bustL', 2.7, 0.3, 0.016); sf('bustR', 2.7, 0.3, 0.016); } else { sf('bustL', 4.4, 0.42, 0.004 + 0.006 * big); sf('bustR', 4.4, 0.42, 0.004 + 0.006 * big); }
    sf('belly', 3.1, 0.34, 0.005 + 0.012 * big); sf('gluL', 3.5, 0.36, 0.007 + 0.004 * big); sf('gluR', 3.5, 0.36, 0.007 + 0.004 * big);
  }
  /* pendulums: [bone, where its tip is, stiffness toward the rest pose, damping, widest swing] */
  const pd = (n, tip, k, damp, max) => inst.pend.push({ bone: b[n], tipL: tip.clone(), dir0: tip.clone().normalize(), len: tip.length(), tip: new THREE.Vector3(), prev: new THREE.Vector3(), k, damp, max, init: false });
  if (st === 'long' || st === 'pony') { pd('hair1', rest[HU_I.hair2], 60, 0.1, 0.9); pd('hair2', rest[HU_I.hair3], 30, 0.08, 0.9); pd('hair3', new THREE.Vector3(0, -0.1, 0), 20, 0.08, 1.0); }
  if (outfit === 'skirt' || outfit === 'robe') pd('hem', new THREE.Vector3(0, -0.3, 0), 45, 0.12, 0.45);
  if (o.bag) pd('bag', new THREE.Vector3(0, -0.2, 0), 160, 0.2, 0.18);
  return inst;
};
Human.dispose = function (h) { if (h.root.parent) h.root.parent.remove(h.root); h.geoHi.dispose(); h.geoLo.dispose(); h.mesh.skeleton.dispose(); };
Human.lod = function (h, far) { if (h.far !== far) { h.far = far; h.mesh.geometry = far ? h.geoLo : h.geoHi; h.mesh.castShadow = !far; } };
/* a short string that changes whenever a person's look does */
Human.sig = function (o) {
  const c = (x) => (x ? ((x.r * 255) | 0) + ',' + ((x.g * 255) | 0) + ',' + ((x.b * 255) | 0) : '-');
  return [o.kid ? 1 : 0, o.fem ? 1 : 0, o.old ? 1 : 0, o.s, o.hs, o.stout, c(o.skin), c(o.hair), c(o.shirt), c(o.pants), c(o.shoe), o.sleeve ? 1 : 0, o.shorts ? 1 : 0, o.skirt | 0, o.tights ? 1 : 0, o.coat ? 1 : 0, o.hst, o.beard ? 1 : 0, o.glasses ? 1 : 0, c(o.glassC), o.sun ? 1 : 0, o.hat ? o.hat.k + c(o.hat.c) + c(o.hat.bc) : 0, o.bag ? c(o.bagc) : 0].join('|');
};

/* ---------------- secondary motion ---------------- */
/* Call after the bones are posed. dt in seconds. Soft tissue and pendulums live in world space, so they feel every acceleration of the body under them. */
Human.physics = function (h, dt) {
  if (!h.soft.length && !h.pend.length) return; dt = Math.min(dt, 1 / 30); h.root.updateMatrixWorld(true); const sc = h.s;
  for (const s of h.soft) {
    const bn = s.bone, par = bn.parent; _hv.copy(s.rest).applyMatrix4(par.matrixWorld);
    if (!s.init || s.pos.distanceToSquared(_hv) > 0.2) { s.pos.copy(_hv); s.vel.set(0, 0, 0); s.init = true; }
    _hv2.copy(_hv).sub(s.pos).multiplyScalar(s.w2).addScaledVector(s.vel, -s.c); s.vel.addScaledVector(_hv2, dt); s.pos.addScaledVector(s.vel, dt);
    _hv2.copy(s.pos).sub(_hv); const m = _hv2.length(), mx = s.max * sc; if (m > mx) { _hv2.multiplyScalar(mx / m); s.pos.copy(_hv).add(_hv2); s.vel.multiplyScalar(0.7); }
    _hm3.setFromMatrix4(_hm.copy(par.matrixWorld).invert()); bn.position.copy(s.rest).add(_hv2.applyMatrix3(_hm3));
  }
  for (const s of h.pend) {
    const bn = s.bone, par = bn.parent; if (par.isBone && par.parent) { par.updateMatrix(); par.matrixWorld.multiplyMatrices(par.parent.matrixWorld, par.matrix); }
    _hv.copy(bn.position).applyMatrix4(par.matrixWorld); _hv2.copy(bn.position).add(s.tipL).applyMatrix4(par.matrixWorld);   /* anchor, and where the tip rests */
    if (!s.init || s.tip.distanceToSquared(_hv2) > 1) { s.tip.copy(_hv2); s.prev.copy(_hv2); s.init = true; }
    _hv3.copy(s.tip).sub(s.prev).multiplyScalar(1 - s.damp); s.prev.copy(s.tip);
    s.tip.add(_hv3); s.tip.y -= 9.8 * dt * dt; s.tip.addScaledVector(_hv3.copy(_hv2).sub(s.tip), Math.min(1, s.k * dt * dt * 10));
    _hv3.copy(s.tip).sub(_hv); const L = s.len * sc; _hv3.setLength(L); s.tip.copy(_hv).add(_hv3);
    par.matrixWorld.decompose(_hv4, _hq, _hv2); _hv3.normalize().applyQuaternion(_hq.invert()); _hq2.setFromUnitVectors(s.dir0, _hv3);
    const ang = 2 * Math.acos(clamp(Math.abs(_hq2.w), 0, 1)); if (ang > s.max) { _hq3.set(0, 0, 0, 1).slerp(_hq2, s.max / ang); _hq2.copy(_hq3); s.tip.lerp(s.prev, 0.5); }
    bn.quaternion.copy(_hq2);
  }
};
/* blink and breathe (call every frame with the game time) */
Human.alive = function (h, dt, time, seed) {
  h.blinkT -= dt; if (h.blinkT <= 0) { h.blinkT = 1.8 + Math.random() * 4.5; h.blink = 0.16; }
  if (h.blink > 0) { h.blink -= dt; h.b.lid.rotation.x = 0.95 * Math.sin(Math.PI * clamp(1 - h.blink / 0.16, 0, 1)); } else h.b.lid.rotation.x = 0;
  const br = 1 + 0.012 * Math.sin(time * 1.9 + seed * 1.3); h.b.chest.scale.set(br, 1, 1 + (br - 1) * 1.6);
};

/* ---------------- ragdoll ---------------- */
/* 13 points: hip and shoulder corners of the trunk, head, elbows, hands, knees, feet. Sticks hold the lengths, the trunk is cross-braced, a few minimum
   distances stand in for joint limits. Verlet integration, ground contact with friction. The bones are then aimed at the points. */
const HU_RAG = { pts: [['legL', 0.1], ['legR', 0.1], ['armL', 0.09], ['armR', 0.09], ['head', 0.1], ['elL', 0.05], ['elR', 0.05], ['handL', 0.04], ['handR', 0.04], ['knL', 0.06], ['knR', 0.06], ['footL', 0.05], ['footR', 0.05]],
  sticks: [[0, 1, 1], [2, 3, 1], [0, 2, 1], [1, 3, 1], [0, 3, 1], [1, 2, 1], [4, 2, 1], [4, 3, 1], [4, 0, 0.6], [4, 1, 0.6], [2, 5, 1], [3, 6, 1], [5, 7, 1], [6, 8, 1], [0, 9, 1], [1, 10, 1], [9, 11, 1], [10, 12, 1]],
  mins: [[7, 2, 0.14], [8, 3, 0.14], [11, 0, 0.3], [12, 1, 0.3], [9, 10, 0.13], [11, 12, 0.11], [5, 0, 0.16], [6, 1, 0.16], [9, 4, 0.35], [10, 4, 0.35]] };
Human.ragStart = function (h, vx, vy, vz, gy) {
  h.root.updateMatrixWorld(true); const R = h.rag = { p: [], q: [], r: [], len: [], gy, t: 0, still: 0 }, sc = h.s;
  for (const d of HU_RAG.pts) { const v = new THREE.Vector3().setFromMatrixPosition(h.b[d[0]].matrixWorld); if (d[0] === 'head') v.y += 0.12 * sc; R.p.push(v); R.r.push(d[1] * sc); }
  /* rest lengths come from the skeleton, not from the pose the person happened to be in */
  const rp = HU_RAG.pts.map((d) => { const v = new THREE.Vector3(); let i = HU_I[d[0]]; while (i >= 0) { v.add(h.rest[i]); i = HU_BONES[i][1]; } if (d[0] === 'head') v.y += 0.12; return v.multiplyScalar(sc); });
  for (const s of HU_RAG.sticks) R.len.push(rp[s[0]].distanceTo(rp[s[1]]));
  /* everybody leaves with the hit's velocity plus a tumble about the horizontal axis across it */
  const com = new THREE.Vector3(); for (const p of R.p) com.add(p); com.multiplyScalar(1 / R.p.length);
  const sp = Math.hypot(vx, vz) || 1, ax = vz / sp, az = -vx / sp, om = 2.5 + Math.min(5, sp * 0.45), dt = 1 / 60;
  for (const p of R.p) { const rx = p.x - com.x, ry = p.y - com.y, rz = p.z - com.z, wx = ax * om, wz = az * om; R.q.push(new THREE.Vector3(p.x - (vx + (0 * rz - wz * ry) + (Math.random() - 0.5) * 0.6) * dt, p.y - (vy + (wz * rx - wx * rz)) * dt, p.z - (vz + (wx * ry - 0 * rx) + (Math.random() - 0.5) * 0.6) * dt)); }
  h.from = null;
};
Human.ragStep = function (h, dt) {
  const R = h.rag; if (!R) return; dt = Math.min(dt, 1 / 30); const n = 2, hh = dt / n, P = R.p, Q = R.q; R.t += dt; let move = 0;
  for (let it = 0; it < n; it++) {
    for (let i = 0; i < P.length; i++) { const p = P[i], q = Q[i], vx = (p.x - q.x) * 0.992, vy = (p.y - q.y) * 0.992, vz = (p.z - q.z) * 0.992; q.copy(p); p.x += vx; p.y += vy - 9.8 * hh * hh; p.z += vz; move += Math.abs(vx) + Math.abs(vy) + Math.abs(vz); }
    for (let k = 0; k < 6; k++) {
      for (let j = 0; j < HU_RAG.sticks.length; j++) { const s = HU_RAG.sticks[j], a = P[s[0]], b = P[s[1]]; _hv.copy(b).sub(a); const d = _hv.length() || 1e-6, f = (d - R.len[j]) / d * 0.5 * s[2]; a.addScaledVector(_hv, f); b.addScaledVector(_hv, -f); }
      for (const m of HU_RAG.mins) { const a = P[m[0]], b = P[m[1]]; _hv.copy(b).sub(a); const d = _hv.length() || 1e-6, mn = m[2] * h.s; if (d < mn) { const f = (d - mn) / d * 0.5; a.addScaledVector(_hv, f); b.addScaledVector(_hv, -f); } }
      for (let i = 0; i < P.length; i++) { const p = P[i], q = Q[i], g = R.gy + R.r[i]; if (p.y < g) { p.y = g; if (q.y < g) q.y = g + (q.y - g) * 0.3; q.x += (p.x - q.x) * 0.22; q.z += (p.z - q.z) * 0.22; } }
    }
  }
  R.still = move / (P.length * n) < 0.0016 ? R.still + dt : 0;
};
/* aim a bone: its -y axis along `dir`, its z as near `fwd` as it can be; world quaternion out */
function huAim(dir, fwd, flip, out) {
  _hv.copy(dir).normalize(); if (!flip) _hv.negate();            /* _hv = the bone's +y */
  _hv2.copy(fwd); _hv3.crossVectors(_hv, _hv2); if (_hv3.lengthSq() < 1e-6) _hv3.set(1, 0, 0); _hv3.normalize(); _hv2.crossVectors(_hv3, _hv).normalize();
  _hm.makeBasis(_hv3, _hv, _hv2); return out.setFromRotationMatrix(_hm);
}
const _hW = []; for (let i = 0; i < HU_BONES.length; i++) _hW.push(new THREE.Quaternion());
Human.ragApply = function (h) {
  const R = h.rag; if (!R) return; const P = R.p, b = h.b, W = _hW, I = HU_I, sc = h.s, X = new THREE.Vector3(), Yv = new THREE.Vector3(), Z = new THREE.Vector3(), cH = new THREE.Vector3(), cS = new THREE.Vector3(), Zc = new THREE.Vector3(), Xc = new THREE.Vector3();
  cH.copy(P[0]).add(P[1]).multiplyScalar(0.5); cS.copy(P[2]).add(P[3]).multiplyScalar(0.5);
  /* the root stands under the pelvis, unturned; everything else is worked out in the world and converted on the way down the skeleton */
  h.root.position.set(cH.x, R.gy, cH.z); h.root.rotation.set(0, 0, 0); h.root.scale.set(sc, sc, sc);
  const basis = (a, bq, out, zOut, xOut) => { X.copy(bq).sub(a).normalize(); Yv.copy(cS).sub(cH).normalize(); Z.crossVectors(X, Yv).normalize(); Yv.crossVectors(Z, X); _hm.makeBasis(X, Yv, Z); out.setFromRotationMatrix(_hm); if (zOut) zOut.copy(Z); if (xOut) xOut.copy(X); };
  basis(P[0], P[1], W[I.hips], Z, null); const Zp = Z.clone(); basis(P[2], P[3], W[I.chest], Zc, Xc);
  W[I.tor].copy(W[I.hips]).slerp(W[I.chest], 0.5);
  Yv.copy(cS).sub(cH).normalize(); b.hips.position.set(0, (cH.y - R.gy) / sc + 0.02, 0); b.hips.position.addScaledVector(_hv4.set(0, 1, 0).sub(Yv), -0.02);
  _hv4.copy(P[4]).sub(cS); huAim(_hv4, Zc, true, W[I.head]); W[I.neck].copy(W[I.chest]).slerp(W[I.head], 0.5);
  const limb = (bi, a, c, fwd) => { _hv4.copy(c).sub(a); huAim(_hv4, fwd, false, W[bi]); };
  limb(I.armL, P[2], P[5], Zc); limb(I.elL, P[5], P[7], Zc); limb(I.armR, P[3], P[6], Zc); limb(I.elR, P[6], P[8], Zc);
  limb(I.legL, P[0], P[9], Zp); limb(I.knL, P[9], P[11], Zp); limb(I.legR, P[1], P[10], Zp); limb(I.knR, P[10], P[12], Zp);
  W[I.handL].copy(W[I.elL]); W[I.handR].copy(W[I.elR]); W[I.footL].copy(W[I.knL]); W[I.footR].copy(W[I.knR]);
  for (const k of [I.hips, I.tor, I.chest, I.neck, I.head, I.armL, I.elL, I.handL, I.armR, I.elR, I.handR, I.legL, I.knL, I.footL, I.legR, I.knR, I.footR]) {
    const par = HU_BONES[k][1]; if (par < 0) h.bones[k].quaternion.copy(W[k]); else h.bones[k].quaternion.copy(_hq.copy(W[par]).invert().multiply(W[k]));
  }
  b.footL.rotateX(0.35); b.footR.rotateX(0.35); b.tor.position.copy(h.rest[I.tor]);
};
/* the ragdoll ends: remember the pose so the animation can be blended in over it */
Human.ragEnd = function (h) {
  if (!h.rag) return; h.from = { q: h.bones.map((bn) => bn.quaternion.clone()), hp: h.b.hips.position.clone(), rp: h.root.position.clone(), rq: h.root.quaternion.clone() }; h.rag = null;
};
/* k = 0 the remembered pose, 1 the pose just written into the bones */
Human.blend = function (h, k) {
  const F = h.from; if (!F) return; if (k >= 1) { h.from = null; return; }
  for (let i = 0; i < 17; i++) h.bones[i].quaternion.copy(_hq.copy(F.q[i]).slerp(h.bones[i].quaternion, k));
  h.b.hips.position.copy(_hv.copy(F.hp).lerp(h.b.hips.position, k)); h.root.position.copy(_hv.copy(F.rp).lerp(h.root.position, k)); h.root.quaternion.copy(_hq.copy(F.rq).slerp(h.root.quaternion, k));
};

/* ---------------- a still copy of a posed person (for crowds that never move): plain geometry with vertex colours ---------------- */
Human.bake = function (h) {
  h.root.updateMatrixWorld(true); const g = h.mesh.geometry, P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, T = g.attributes.aTint, n = P.count;
  const inv = new THREE.Matrix4().copy(h.mesh.matrixWorld).invert(), BM = h.bones.map((bn, i) => new THREE.Matrix4().multiplyMatrices(inv, bn.matrixWorld).multiply(h.mesh.skeleton.boneInverses[i]));
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), v = new THREE.Vector3(), a = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    a.set(0, 0, 0); for (let q = 0; q < 4; q++) { const w = SW.array[k * 4 + q]; if (w > 0) a.addScaledVector(v.fromBufferAttribute(P, k).applyMatrix4(BM[SI.array[k * 4 + q]]), w); }
    pos[k * 3] = a.x; pos[k * 3 + 1] = a.y; pos[k * 3 + 2] = a.z; const reg = g.attributes.aInfo.getX(k), hm = reg < 0.5 ? Math.max(g.attributes.aInfo.getY(k), g.attributes.aInfo.getZ(k)) > 0.5 ? 1 : 0 : 0;
    col[k * 3] = hm ? g.attributes.aTint2.getX(k) : reg === 4 ? 0.5 : T.getX(k); col[k * 3 + 1] = hm ? g.attributes.aTint2.getY(k) : reg === 4 ? 0.48 : T.getY(k); col[k * 3 + 2] = hm ? g.attributes.aTint2.getZ(k) : reg === 4 ? 0.45 : T.getZ(k);
  }
  const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.BufferAttribute(pos, 3)); o.setAttribute('color', new THREE.BufferAttribute(col, 3)); o.setIndex(g.index); o.computeVertexNormals(); const r = o.toNonIndexed(); o.dispose(); return r;
};
