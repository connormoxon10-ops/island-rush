/* ================= SCENERY: FOLIAGE ATLAS, TREE / BUSH / ROCK / GRASS SOURCES ================= */
const Wind = { t: { value: 0 } };
const TREE = {};

/* canvas -> DataTexture with colour bled under transparent pixels, so mip-mapped cut-outs never get dark fringes */
function alphaTex(c) {
  const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data, out = new Uint8Array(W * H * 4);
  let ar = 0, ag = 0, ab = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 220) { ar += d[i]; ag += d[i + 1]; ab += d[i + 2]; n++; }
  ar = (ar / Math.max(1, n)) | 0; ag = (ag / Math.max(1, n)) | 0; ab = (ab / Math.max(1, n)) | 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const si = ((H - 1 - y) * W + x) * 4, di = (y * W + x) * 4, a = d[si + 3];
    if (a > 0) { out[di] = d[si]; out[di + 1] = d[si + 1]; out[di + 2] = d[si + 2]; } else { out[di] = ar; out[di + 1] = ag; out[di + 2] = ab; }
    out[di + 3] = a;
  }
  const t = new THREE.DataTexture(out, W, H, THREE.RGBAFormat);
  t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.anisotropy = maxAniso; t.needsUpdate = true; return t;
}

/* one 512x512 atlas: leaf cluster | fir branch / palm frond | grass tuft (all near-white so vertex colours do the tinting) */
const FT = { leaf: [0, 0], fir: [1, 0], palm: [0, 1], grass: [1, 1] };
function makeFoliageAtlas() {
  const S = 256, c = mkCanvas(S * 2, S * 2), g = c.getContext('2d');
  const tile = (t, fn) => { g.save(); g.translate(t[0] * S, t[1] * S); g.beginPath(); g.rect(0, 0, S, S); g.clip(); fn(); g.restore(); };
  /* broadleaf cluster: layered leaves, dark behind / light in front */
  tile(FT.leaf, () => {
    const r = mulberry32(31);
    const leaf = (x, y, a, l, w, v) => {
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = `rgb(${v * 0.96 | 0},${v | 0},${v * 0.8 | 0})`;
      g.beginPath(); g.moveTo(0, -l); g.quadraticCurveTo(w, -l * 0.15, 0, l); g.quadraticCurveTo(-w, -l * 0.15, 0, -l); g.fill();
      g.strokeStyle = 'rgba(255,255,235,0.28)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -l * 0.85); g.lineTo(0, l * 0.85); g.stroke();
      g.strokeStyle = 'rgba(40,50,20,0.22)'; g.beginPath(); g.moveTo(-w * 0.9, 0); g.lineTo(0, -l * 0.15); g.lineTo(w * 0.9, 0); g.stroke();
      g.restore();
    };
    for (let pass = 0; pass < 3; pass++) {
      const n = pass === 0 ? 95 : pass === 1 ? 90 : 70;
      for (let i = 0; i < n; i++) {
        const ang = r() * TAU, rad = Math.sqrt(r()) * S * (0.46 - pass * 0.03), x = S / 2 + Math.cos(ang) * rad, y = S / 2 + Math.sin(ang) * rad;
        const edge = rad / (S * 0.46), v = (pass === 0 ? 150 : pass === 1 ? 190 : 225) + r() * 30 + edge * 8;
        leaf(x, y, ang + (r() - 0.5) * 2.4, 9 + r() * 8, 4.5 + r() * 4, Math.min(255, v));
      }
    }
  });
  /* conifer branch: stem from the bottom centre, feathered side-twigs, needle fans */
  tile(FT.fir, () => {
    const r = mulberry32(17); g.lineCap = 'round';
    const stemAt = (t) => [S / 2 + Math.sin(t * 2.6) * 6 * t, S - 5 - t * (S - 12)];
    g.strokeStyle = 'rgb(205,190,165)'; g.lineWidth = 3.2; g.beginPath(); for (let i = 0; i <= 30; i++) { const p = stemAt(i / 30); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); } g.stroke();
    const fan = (x, y, a, len, v) => {
      for (let k = -3; k <= 3; k++) {
        const aa = a + k * 0.2 + (r() - 0.5) * 0.12, l = len * (0.7 + r() * 0.45), vv = Math.min(255, v + (r() - 0.5) * 50);
        g.strokeStyle = `rgb(${vv * 0.9 | 0},${vv | 0},${vv * 0.78 | 0})`; g.lineWidth = 2.3;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(aa) * l, y - Math.cos(aa) * l); g.stroke();
      }
    };
    for (let i = 2; i < 30; i++) {
      const t = i / 30, p = stemAt(t), len = (1 - t * 0.8) * S * 0.46;
      for (const side of [-1, 1]) {
        const ta = side * (1.05 - 0.28 * t), ex = p[0] + Math.sin(ta) * len, ey = p[1] - Math.cos(ta) * len * 0.78 - 8;
        g.strokeStyle = 'rgb(170,150,120)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(ex, ey); g.stroke();
        for (let q = 0.3; q <= 1.001; q += 0.2) fan(p[0] + (ex - p[0]) * q, p[1] + (ey - p[1]) * q, ta * 0.8, 15 + (1 - t) * 8, 175 + q * 70);
      }
      fan(p[0], p[1], 0, 14, 235);
    }
    for (let k = -3; k <= 3; k++) { const p = stemAt(1); g.strokeStyle = 'rgb(235,245,225)'; g.lineWidth = 2.3; g.beginPath(); g.moveTo(p[0], p[1] + 4); g.lineTo(p[0] + k * 4, p[1] - 14); g.stroke(); }
  });
  /* palm frond: rib + broad tapered leaflets (filled shapes, so alpha-tested edges survive distance) */
  tile(FT.palm, () => {
    const r = mulberry32(53), rib = (t) => [S / 2 + Math.sin(t * 2.2) * 8 * t, S - 4 - t * (S - 10)];
    g.strokeStyle = 'rgb(215,222,170)'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i <= 30; i++) { const p = rib(i / 30); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); } g.stroke();
    for (let i = 2; i < 30; i++) {
      const t = i / 30, p = rib(t), len = Math.sin(Math.min(1, t * 1.05 + 0.1) * Math.PI) * S * 0.46 + 14, wd = 10 * (1 - t * 0.35);
      for (const side of [-1, 1]) {
        const v = 165 + r() * 80, ang = side * (1.05 - t * 0.4), ex = p[0] + Math.sin(ang) * len, ey = p[1] - Math.cos(ang) * len * 0.5 + len * 0.16, mx = (p[0] + ex) / 2, my = Math.min(p[1], ey) - 7;
        g.fillStyle = `rgb(${v * 0.9 | 0},${v | 0},${v * 0.72 | 0})`;
        g.beginPath(); g.moveTo(p[0], p[1] - wd * 0.5); g.quadraticCurveTo(mx, my - wd, ex, ey); g.quadraticCurveTo(mx, my + wd, p[0], p[1] + wd * 0.5); g.closePath(); g.fill();
      }
    }
  });
  /* grass tuft: tapered curved blades */
  tile(FT.grass, () => {
    const r = mulberry32(8);
    for (let i = 0; i < 46; i++) {
      const x0 = S * (0.14 + r() * 0.72), h = S * (0.4 + r() * 0.55), bend = (r() - 0.5) * S * 0.45, w = 3.4 + r() * 3.2, v = 150 + r() * 105;
      const tx = x0 + bend, ty = S - h;
      g.fillStyle = `rgb(${v * 0.92 | 0},${v | 0},${v * 0.74 | 0})`;
      g.beginPath(); g.moveTo(x0 - w, S); g.quadraticCurveTo(x0 + bend * 0.15 - w * 0.6, S - h * 0.55, tx, ty); g.quadraticCurveTo(x0 + bend * 0.15 + w * 0.6, S - h * 0.55, x0 + w, S); g.closePath(); g.fill();
    }
  });
  return alphaTex(c);
}
const tuv = (t, u, v) => [(t[0] + 0.02 + 0.96 * u) * 0.5, (1 - t[1]) * 0.5 + (0.02 + 0.96 * v) * 0.5];

/* ---------------- source-geometry builder (baked once; placed per instance through GB.geo) ---------------- */
class SB {
  constructor(uv) { this.p = []; this.n = []; this.c = []; this.u = uv ? [] : null; }
  v(x, y, z, nx, ny, nz, r, g, b, u, w) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(r, g, b); if (this.u) this.u.push(u || 0, w || 0); }
  /* two-triangle card centred on c with full width vector r and full height vector u; normals radiate from `org` with an upward bias (soft volumetric shading) or point straight up when org is null */
  card(tile, c, r, u, org, nUp, k0, k1, tint, vr) {
    const v0 = vr ? vr[0] : 0, v1 = vr ? vr[1] : 1, cs = [[-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 1], [-0.5, 0.5, 1]], V = [];
    for (let i = 0; i < 4; i++) {
      const a = cs[i][0], b = cs[i][1], tv = cs[i][2], x = c[0] + r[0] * a + u[0] * b, y = c[1] + r[1] * a + u[1] * b, z = c[2] + r[2] * a + u[2] * b;
      let nx = 0, ny = 1, nz = 0;
      if (org) { nx = x - org[0]; ny = y - org[1] + nUp; nz = z - org[2]; const l = 1 / (Math.hypot(nx, ny, nz) || 1); nx *= l; ny *= l; nz *= l; }
      const k = k0 + (k1 - k0) * tv, uv = tuv(tile, a + 0.5, v0 + (v1 - v0) * tv);
      V.push([x, y, z, nx, ny, nz, k, uv[0], uv[1]]);
    }
    for (const i of [0, 1, 2, 0, 2, 3]) { const q = V[i]; this.v(q[0], q[1], q[2], q[3], q[4], q[5], tint[0] * q[6], tint[1] * q[6], tint[2] * q[6], q[7], q[8]); }
  }
  /* tapered tube along a polyline (trunks, limbs); smooth radial normals, bark streaks baked into vertex colour */
  tube(pts, radii, sides, col, seed, ringVar) {
    const rnd = mulberry32(seed || 1), rings = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      const ax = Math.abs(ty) > 0.9 ? 1 : 0, ay = Math.abs(ty) > 0.9 ? 0 : 1;
      let sx = ty * 0 - tz * ay, sy = tz * ax - tx * 0, sz = tx * ay - ty * ax; const sl = Math.hypot(sx, sy, sz) || 1; sx /= sl; sy /= sl; sz /= sl;
      const qx = ty * sz - tz * sy, qy = tz * sx - tx * sz, qz = tx * sy - ty * sx, ring = [];
      const rv = ringVar ? 1 - ringVar * (i % 2) : 1;
      for (let j = 0; j < sides; j++) {
        const ang = j / sides * TAU, ca = Math.cos(ang), sa = Math.sin(ang), nx = sx * ca + qx * sa, ny = sy * ca + qy * sa, nz = sz * ca + qz * sa;
        const k = (0.74 + 0.36 * (0.5 + 0.5 * Math.sin(j * 2.9 + i * 1.7 + rnd() * 1.5))) * rv * (i === 0 ? 0.72 : 1);
        ring.push([pts[i][0] + nx * radii[i], pts[i][1] + ny * radii[i], pts[i][2] + nz * radii[i], nx, ny, nz, k]);
      }
      rings.push(ring);
    }
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < sides; j++) {
      const j1 = (j + 1) % sides, A = rings[i][j], B = rings[i][j1], C = rings[i + 1][j1], D = rings[i + 1][j];
      for (const V of [A, B, C, A, C, D]) this.v(V[0], V[1], V[2], V[3], V[4], V[5], col[0] * V[6], col[1] * V[6], col[2] * V[6]);
    }
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.u) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingBox(); return g;
  }
}
const _rv = (r) => { let x = r() - 0.5, y = r() - 0.5, z = r() - 0.5; const l = 1 / (Math.hypot(x, y, z) || 1); return [x * l, y * l, z * l]; };
const _nrm = (v) => { const l = 1 / (Math.hypot(v[0], v[1], v[2]) || 1); return [v[0] * l, v[1] * l, v[2] * l]; };
const _crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const _col3 = (hex, k) => { const c = lc(hex); return [c.r * (k || 1), c.g * (k || 1), c.b * (k || 1)]; };

/* ---- trees ---- */
function bakeOak(seed, hex, nCards, woodHex) {
  const r = mulberry32(seed), wood = new SB(false), leaf = new SB(true), T = THREE, WC = _col3(woodHex || 0x5d452d);
  const H = 2.2 + r() * 0.9, Rc = 2.1 + r() * 0.7, cy = H + Rc * 0.55, bend = (r() - 0.5) * 0.6, C = [bend * 0.2, cy, 0];
  wood.tube([[0, -0.3, 0], [bend * 0.2, H * 0.3, 0], [bend * 0.5, H * 0.62, bend * 0.2], [bend * 0.25, H, 0]], [0.62, 0.34, 0.25, 0.18], 6, WC, seed);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + r() * 0.8, out = 1.1 + r() * 0.7, ca = Math.cos(a), sa = Math.sin(a);
    wood.tube([[bend * 0.3, H * 0.74, 0], [ca * out, H * 0.74 + 0.9 + r() * 0.5, sa * out]], [0.14, 0.07], 5, WC, seed + i);
  }
  const core = new T.IcosahedronGeometry(1, 0), cg = ni(core); cg.applyMatrix4(new T.Matrix4().compose(new T.Vector3(C[0], cy - 0.15, 0), new T.Quaternion(), new T.Vector3(Rc * 0.5, Rc * 0.4, Rc * 0.5)));
  const tint = _col3(hex, 1.25);
  for (let k = 0; k < nCards; k++) {
    const d = _nrm([r() - 0.5, (r() - 0.3) * 0.95, r() - 0.5]), dist = Rc * (0.3 + 0.78 * r()), p = [C[0] + d[0] * dist, C[1] + d[1] * dist * 0.8, C[2] + d[2] * dist];
    const nrm = _nrm([d[0] + (r() - 0.5) * 0.5, d[1] + (r() - 0.5) * 0.5, d[2] + (r() - 0.5) * 0.5]);
    let right = _crs(nrm, [0, 1, 0]); if (Math.hypot(right[0], right[1], right[2]) < 0.1) right = [1, 0, 0]; right = _nrm(right);
    const up = _crs(right, nrm), roll = r() * TAU, cr = Math.cos(roll), sr = Math.sin(roll), s = 3.0 + r() * 1.2;
    const rr = [(right[0] * cr + up[0] * sr) * s, (right[1] * cr + up[1] * sr) * s, (right[2] * cr + up[2] * sr) * s], uu = [(-right[0] * sr + up[0] * cr) * s, (-right[1] * sr + up[1] * cr) * s, (-right[2] * sr + up[2] * cr) * s];
    const k0 = 0.5 + 0.55 * Math.min(1, dist / Rc) + 0.2 * d[1], hs = 0.9 + r() * 0.2;
    leaf.card(FT.leaf, p, rr, uu, C, 0.45, k0 * 0.92 * hs, (k0 + 0.1) * hs, tint);
  }
  return { wood: [{ g: wood.geo(), c: { r: 1, g: 1, b: 1 }, s: 0 }, { g: cg, c: lc(0x1f4a18), s: 0.55 }], leaf: leaf.geo(), sh: { tr: 0.46, top: H, can: [cy - Rc * 0.95, cy + Rc, Rc * 1.15 + 0.4, 0, 1] } };
}
function bakePine(seed, hex, scale, density, snow) {
  const r = mulberry32(seed), wood = new SB(false), leaf = new SB(true), T = THREE, tint = _col3(hex, 1.3);
  const H = (7.4 + r() * 2.4) * scale;
  wood.tube([[0, -0.3, 0], [0.04, H * 0.34, 0], [0, H * 0.7, 0.04], [0, H, 0]], [0.36 * scale, 0.22 * scale, 0.12 * scale, 0.03], 5, _col3(0x4d3724), seed);
  const mkc = (rad, h, y) => { const g = ni(new T.ConeGeometry(rad, h, 6, 1, true)); g.applyMatrix4(new T.Matrix4().makeTranslation(0, y + h / 2, 0)); return g; };
  const cc = snow ? [0xcfdcdc, 0xd8e4e4, 0xe4eeee] : [0x24542b, 0x27582e, 0x2b5e32], cores = [{ g: mkc(1.4 * scale, H * 0.46, 1.4), c: lc(cc[0]), s: 0.55 }, { g: mkc(1.0 * scale, H * 0.4, H * 0.33), c: lc(cc[1]), s: 0.5 }, { g: mkc(0.58 * scale, H * 0.32, H * 0.62), c: lc(cc[2]), s: 0.4 }];
  const TIERS = 6 + Math.round(density * 1.5);
  for (let i = 0; i < TIERS; i++) {
    const t = i / (TIERS - 1), y = 1.5 + t * (H - 2.6), rad = (2.2 * (1 - t * 0.86) + 0.3) * scale, cnt = Math.max(3, Math.round((4.7 - 2.1 * t) * (0.7 + 0.5 * density)));
    for (let j = 0; j < cnt; j++) {
      const a = (j + (i % 2) * 0.5) / cnt * TAU + (r() - 0.5) * 0.55, ox = Math.cos(a), oz = Math.sin(a), th = 0.42 + (1 - t) * 0.28 + (r() - 0.5) * 0.18, L = rad * 1.12 + 0.25, W = L * (0.95 + r() * 0.2);
      const up = [ox * Math.cos(th) * L, -Math.sin(th) * L, oz * Math.cos(th) * L], right = [-oz * W, 0, ox * W], at = [ox * 0.12, y + r() * 0.2, oz * 0.12], ctr = [at[0] + up[0] / 2, at[1] + up[1] / 2, at[2] + up[2] / 2];
      const kk = 0.62 + 0.4 * t + (r() - 0.5) * 0.14;
      leaf.card(FT.fir, ctr, right, up, [0, y - 1.1, 0], 0.5, kk * 0.55, kk * 1.08, tint);
      if (j % 2 === 0) { const fa = a + TAU / cnt * 0.5, fx = Math.cos(fa), fz = Math.sin(fa), fu = [fx * Math.cos(th) * L * 0.92, -Math.sin(th) * L * 0.92, fz * Math.cos(th) * L * 0.92]; leaf.card(FT.fir, [at[0] + fu[0] / 2, at[1] + fu[1] / 2, at[2] + fu[2] / 2], [0, W * 0.75, 0], fu, [0, y - 1.1, 0], 0.5, kk * 0.55, kk * 1.0, tint); }
    }
  }
  const top = [0, H - 1.1, 0];
  for (let q = 0; q < 2; q++) { const a = q * Math.PI / 2 + r(); leaf.card(FT.fir, [0, H - 0.2, 0], [Math.cos(a) * 1.0 * scale, 0, Math.sin(a) * 1.0 * scale], [0, 2.1 * scale, 0], top, 0.3, 0.8, 1.05, tint); }
  return { wood: [{ g: wood.geo(), c: { r: 1, g: 1, b: 1 }, s: 0 }, ...cores], leaf: leaf.geo(), sh: { tr: 0.3 * scale, top: H * 0.95, can: [0.9, H + 0.6 * scale, 2.3 * scale, 0.2 * scale, 0] } };
}
function bakePalm(seed, hex, nFr) {
  const r = mulberry32(seed), wood = new SB(false), leaf = new SB(true), tint = _col3(hex, 1.05);
  const H = 5.0 + r() * 1.7, lean = (r() - 0.5) * 1.8, pts = [], radii = [0.25, 0.2, 0.17, 0.15, 0.13, 0.12];
  for (let i = 0; i <= 5; i++) { const t = i / 5; pts.push([lean * t * t, H * t - (i === 0 ? 0.3 : 0), lean * 0.35 * t * t]); }
  wood.tube(pts, radii, 6, _col3(0x9a7a52), seed, 0.22);
  const crown = pts[5];
  for (let f = 0; f < nFr; f++) {
    const a = f / nFr * TAU + (r() - 0.5) * 0.5, ca = Math.cos(a), sa = Math.sin(a), e1 = 0.62 + r() * 0.25, e2 = e1 - 0.95 - r() * 0.2;
    const d1 = [ca * Math.cos(e1), Math.sin(e1), sa * Math.cos(e1)], d2 = [ca * Math.cos(e2), Math.sin(e2), sa * Math.cos(e2)], L1 = 2.0, L2 = 2.3, Wd = 1.9 + r() * 0.4, right = [-sa * Wd, 0, ca * Wd];
    const s0 = [crown[0], crown[1] - 0.05, crown[2]], s1 = [s0[0] + d1[0] * L1, s0[1] + d1[1] * L1, s0[2] + d1[2] * L1], org = [crown[0], crown[1] - 1.2, crown[2]], kf = 0.62 + r() * 0.22;
    leaf.card(FT.palm, [s0[0] + d1[0] * L1 / 2, s0[1] + d1[1] * L1 / 2, s0[2] + d1[2] * L1 / 2], right, [d1[0] * L1, d1[1] * L1, d1[2] * L1], org, 0.35, kf * 0.8, kf * 0.95, tint, [0, 0.5]);
    leaf.card(FT.palm, [s1[0] + d2[0] * L2 / 2, s1[1] + d2[1] * L2 / 2, s1[2] + d2[2] * L2 / 2], [right[0] * 0.9, 0, right[2] * 0.9], [d2[0] * L2, d2[1] * L2, d2[2] * L2], org, 0.35, kf * 0.95, kf, tint, [0.5, 1]);
  }
  return { wood: [{ g: wood.geo(), c: { r: 1, g: 1, b: 1 }, s: 0 }], leaf: leaf.geo(), sh: { tr: 0.23, top: H, can: [H - 2.0, H + 1.5, 3.4, 0, 1] } };
}
function bakeCactus(seed) {
  const r = mulberry32(seed), wood = new SB(false), G = _col3(0x4f8a46), H = 3.0 + r() * 1.6;
  wood.tube([[0, -0.3, 0], [0, H * 0.5, 0], [0, H, 0], [0, H + 0.2, 0]], [0.34, 0.3, 0.26, 0.1], 7, G, seed, 0.12);
  for (const sd of [-1, 1]) {
    if (r() < 0.25) continue; const y0 = 0.9 + r() * 1.2, out = 0.75 + r() * 0.3, up = 0.9 + r() * 0.9;
    wood.tube([[sd * 0.2, y0, 0], [sd * out, y0 + 0.05, 0], [sd * (out + 0.12), y0 + up * 0.5, 0], [sd * (out + 0.12), y0 + up, 0]], [0.17, 0.15, 0.14, 0.07], 6, G, seed + sd, 0.1);
  }
  return { wood: [{ g: wood.geo(), c: { r: 1, g: 1, b: 1 }, s: 0 }], leaf: new SB(true).geo(), sh: { tr: 0.32, top: H + 0.2, can: [0.9, Math.min(H, 2.7), 1.15, 1.15, 0] } };
}
function bakeBush(seed, hex, n) {
  const r = mulberry32(seed), leaf = new SB(true), tint = _col3(hex, 1.25), C = [0, 0.55, 0];
  for (let k = 0; k < n; k++) {
    const d = _nrm([r() - 0.5, r() * 0.8 - 0.1, r() - 0.5]), dist = 0.25 + r() * 0.5, p = [d[0] * dist, 0.5 + d[1] * dist * 0.7, d[2] * dist], nrm = _nrm([d[0], d[1] + 0.5, d[2]]);
    let right = _crs(nrm, [0, 1, 0]); if (Math.hypot(right[0], right[1], right[2]) < 0.1) right = [1, 0, 0]; right = _nrm(right);
    const up = _crs(right, nrm), s = 1.3 + r() * 0.7, kk = 0.6 + 0.5 * dist + 0.25 * d[1];
    leaf.card(FT.leaf, p, [right[0] * s, right[1] * s, right[2] * s], [up[0] * s, up[1] * s, up[2] * s], C, 0.6, kk * 0.85, kk * 1.1, tint);
  }
  return { wood: [], leaf: leaf.geo(), sh: { tr: 0.3, top: 1.0, can: null } };
}
function bakeGrass(seed) {
  const r = mulberry32(seed), leaf = new SB(true), w = [1, 1, 1];
  for (let k = 0; k < 2; k++) { const a = k * Math.PI / 2 + 0.4 + r() * 0.5, s = 1.1 + r() * 0.4, h = 0.75 + r() * 0.3; leaf.card(FT.grass, [0, h / 2 - 0.02, 0], [Math.cos(a) * s, 0, Math.sin(a) * s], [0, h, 0], null, 0, 0.62, 1.12, w); }
  return { wood: [], leaf: leaf.geo() };
}

/* ---- rocks: displaced low-poly icospheres, faceted, with baked strata/moss/ambient-occlusion colour ---- */
function h3(x, y, z) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vn3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const a = (i, j, k) => h3(xi + i, yi + j, zi + k), l = (p, q, t) => p + (q - p) * t;
  return l(l(l(a(0, 0, 0), a(1, 0, 0), u), l(a(0, 1, 0), a(1, 1, 0), u), v), l(l(a(0, 0, 1), a(1, 0, 1), u), l(a(0, 1, 1), a(1, 1, 1), u), v), w);
}
function bakeRock(seed, detail, kind, palHex, capHex) {
  const T = THREE, g = ni(new T.IcosahedronGeometry(1, detail)), pos = g.attributes.position, n = pos.count, ox = seed * 7.13, oy = seed * 3.71, oz = seed * 5.37;
  const sx = kind === 'slab' ? 1.35 : 1, sy = kind === 'slab' ? 0.42 : kind === 'tall' ? 1.35 : 0.78, sz = kind === 'slab' ? 0.95 : 1;
  for (let i = 0; i < n; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
    const nA = vn3(x * 1.7 + ox, y * 1.7 + oy, z * 1.7 + oz), nB = vn3(x * 3.9 + oy, y * 3.9 + oz, z * 3.9 + ox), rid = 1 - Math.abs(vn3(x * 2.6 + oz, y * 2.6 + ox, z * 2.6 + oy) * 2 - 1);
    let rr = 0.82 + nA * 0.5 + (nB - 0.5) * 0.2 + rid * 0.18;
    if (kind === 'slab' || kind === 'tall') rr = Math.min(rr, 1.05) * (1 + 0.06 * Math.round(y * 3));
    pos.setXYZ(i, x * rr * sx, y * rr * sy, z * rr * sz);
  }
  g.computeVertexNormals();
  const pal = palHex ? _col3(palHex) : { granite: _col3(0x55514b), sand: _col3(0x786649), basalt: _col3(0x38393d), moss: _col3(0x504e43) }[kind === 'slab' ? 'sand' : kind === 'basalt' ? 'basalt' : kind === 'moss' ? 'moss' : 'granite'], mossC = _col3(capHex || 0x4f6234);
  const col = new Float32Array(n * 3), nor = g.attributes.normal;
  g.computeBoundingBox(); const y0 = g.boundingBox.min.y, yh = g.boundingBox.max.y - y0;
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ny = nor.getY(i), t = (y - y0) / yh;
    let k = 0.72 + 0.5 * vn3(x * 5 + ox, y * 9 + oy, z * 5 + oz) + 0.16 * Math.sin(y * 14 + vn3(x * 3, 0, z * 3) * 4);
    k *= 0.78 + 0.34 * t; let r = pal[0] * k, gg = pal[1] * k, b = pal[2] * k;
    if (capHex ? ny > 0.25 : (kind === 'moss' || (kind !== 'basalt' && ny > 0.62 && vn3(x * 3 + ox, 0, z * 3 + oz) > 0.45))) { const m = capHex ? Math.min(1, Math.max(0, (ny - 0.2) * 2.4)) * 0.95 : Math.min(1, Math.max(0, (ny - 0.5) * 2.0)) * 0.65; r += (mossC[0] * k - r) * m; gg += (mossC[1] * k - gg) * m; b += (mossC[2] * k - b) * m; }
    col[i * 3] = r; col[i * 3 + 1] = gg; col[i * 3 + 2] = b;
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
  return { g, c: { r: 1, g: 1, b: 1 }, s: 0 };
}

function initTreeSources() {
  const qt = Q.tree || 1;
  TREE.oak = [[11, 0x5a9438], [23, 0x4b8a33], [37, 0x649c3d], [41, 0x567f30], [59, 0x6f9c3a]].map(([s, h]) => bakeOak(s, h, Math.round(22 * (0.6 + 0.4 * qt))));
  TREE.pine = [[5, 0x2f6d38, 1, 1], [19, 0x346f3a, 0.9, 0.8], [27, 0x2b6535, 1.15, 1], [43, 0x3a7a3f, 0.95, 0.9]].map(([s, h, sc, d]) => bakePine(s, h, sc, d * (0.6 + 0.4 * qt)));
  TREE.palm = [[3, 0x3f8030, 11], [17, 0x4a8a33, 12], [29, 0x38752b, 10]].map(([s, h, n]) => bakePalm(s, h, n));
  TREE.bush = [[7, 0x5f9d3a, 7], [13, 0x4a8630, 6], [21, 0x7a9a36, 7], [33, 0x6a7f2c, 6]].map(([s, h, n]) => bakeBush(s, h, n));
  TREE.birch = [[61, 0x9bbf4a], [67, 0x8cb340], [73, 0xa8c552]].map(([s, h]) => bakeOak(s, h, Math.round(18 * (0.6 + 0.4 * qt)), 0xe3e0d6));
  TREE.autumn = [[79, 0xd9852a], [83, 0xc9591f], [89, 0xe0a33a], [97, 0xb8451c]].map(([s, h]) => bakeOak(s, h, Math.round(22 * (0.6 + 0.4 * qt))));
  TREE.snowpine = [[5, 0xd6e4e2, 1, 1], [19, 0xcbdcda, 0.9, 0.8], [27, 0xdfeceb, 1.15, 1]].map(([s, h, sc, d]) => bakePine(s, h, sc, d * (0.6 + 0.4 * qt), true));
  TREE.cactus = [bakeCactus(5), bakeCactus(12), bakeCactus(21), bakeCactus(34)];
  TREE.scrub = [[7, 0x9a9050, 6], [13, 0x8a8a48, 5], [21, 0xa89a58, 6]].map(([s, h, n]) => bakeBush(s, h, n));
  TREE.grass = [bakeGrass(2), bakeGrass(9), bakeGrass(14)];
  TREE.rock = [bakeRock(1, 1, 'granite'), bakeRock(2, 1, 'sand'), bakeRock(3, 2, 'granite'), bakeRock(4, 2, 'basalt'), bakeRock(5, 2, 'moss'), bakeRock(6, 1, 'slab'), bakeRock(7, 2, 'tall'), bakeRock(8, 1, 'moss'), bakeRock(9, 2, 'granite', 0x8a4a32), bakeRock(10, 1, 'slab', 0x9a5a3a), bakeRock(11, 2, 'tall', 0x7a3f2c), bakeRock(12, 2, 'granite', 0x5a5e66, 0xf0f5f8)];
  for (const k in TREE) for (const p of TREE[k]) { if (p.g) p.g.computeBoundingBox(); else { for (const w of p.wood) w.g.computeBoundingBox(); p.leaf.computeBoundingBox(); } }
}

const _tcol = new THREE.Color(), Y_AXIS = new THREE.Vector3(0, 1, 0);
/* place one tree / bush / grass tuft: trunk + core into the prop mesh, leaf cards into the foliage mesh */
function addTree(gbW, gbF, kind, vi, x, y, z, sc, rot, tint, sy, hue, ch) {
  const v = TREE[kind][vi % TREE[kind].length];
  _q.setFromAxisAngle(Y_AXIS, rot); _p3.set(x, y, z); _s3.set(sc, sc * (sy || 1), sc); _m4.compose(_p3, _q, _s3);
  const k = 0.82 + tint * 0.36, h = hue == null ? 0.5 : hue;
  for (let i = 0; i < v.wood.length; i++) { const p = v.wood[i]; _tcol.setRGB(p.c.r * k, p.c.g * k, p.c.b * k); gbW.geo(p.g, _m4, _tcol, p.s); }
  _tcol.setRGB(k * (1 + (h - 0.5) * 0.35), k, k * (1 - (h - 0.5) * 0.45)); gbF.geo(v.leaf, _m4, _tcol, 0);
  if (ch) treeSolid(ch, kind, vi, x, y, z, sc, sy);
}
function addGrass(gbF, vi, x, y, z, sc, rot, r, g, b) {
  const v = TREE.grass[vi % TREE.grass.length];
  _q.setFromAxisAngle(Y_AXIS, rot); _p3.set(x, y, z); _s3.set(sc, sc * (0.8 + 0.4 * ((vi * 7) % 3) / 2), sc); _m4.compose(_p3, _q, _s3);
  _tcol.setRGB(r, g, b); gbF.geo(v.leaf, _m4, _tcol, 0);
}
