/* ================= INTERIORS: the room kit =================
   Everything an interior is made of, as one merged mesh of boxes and cylinders (vertex coloured), one of glowing parts (screens, signs, lamps, windows),
   one of glass, a few point lights, canvas signs, the walls and furniture you bump into (2D boxes), the things you can use and the people.
   Room frame: x across, z along, y up; the room is centred on (0, 0); the street door is on the +z wall at x = K.dx. */
const _ikC = new THREE.Color();
function ikCol(c) { if (c && c.isColor) return c; if (Array.isArray(c)) return _ikC.setRGB(c[0], c[1], c[2]).clone(); return lc(c == null ? 0x888888 : c); }
const IK_TEX = new Map();
function ikText(txt, o) {
  o = o || {}; const key = txt + '|' + (o.fg || '') + '|' + (o.bg || '') + '|' + (o.font || '') + '|' + (o.w || 512) + 'x' + (o.h || 128); if (IK_TEX.has(key)) return IK_TEX.get(key);
  const W = o.w || 512, H = o.h || 128, cv = mkCanvas(W, H), g = cv.getContext('2d');
  if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, W, H); }
  if (o.bar) { g.fillStyle = o.bar; g.fillRect(0, 0, W, Math.round(H * 0.06)); g.fillRect(0, H - Math.round(H * 0.06), W, Math.round(H * 0.06)); }
  g.fillStyle = o.fg || '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = String(txt).split('\n'); let fs = o.size || Math.round(H * (lines.length > 1 ? 0.36 : 0.62));
  const font = (n) => (o.font || '700 ') + n + 'px "Chakra Petch", Rajdhani, "Arial Black", sans-serif';
  g.font = font(fs); while (fs > 10 && Math.max(...lines.map((l) => g.measureText(l).width)) > W * 0.92) { fs -= 2; g.font = font(fs); }
  lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * fs * 1.1 + 2));
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; t.__keep = true; IK_TEX.set(key, t); return t;
}
class IntKit {
  constructor(rec, room) {
    this.rec = rec; this.room = room; this.sc = new THREE.Scene(); this.sc.background = lc(0x0c0e12);
    this.gb = new GB(0, 0, false); this.gl = new GB(0, 0, false); this.gs = new GB(0, 0, false); this.gw = null;
    this.cols = []; this.acts = []; this.npcs = []; this.ticks = []; this.spawns = {}; this.bounds = null; this.swim = null; this.lights = 0; this.expo = 1.12; this.dx = 0;
    this.night = env.lampOn > 0.5;
  }
  /* ---- primitives ---- */
  box(x0, y0, z0, x1, y1, z1, c, solid, k) { const C = ikCol(c), q = k == null ? 1 : k, a = Math.min(x0, x1), b = Math.min(y0, y1), d = Math.min(z0, z1), e = Math.max(x0, x1), f = Math.max(y0, y1), g = Math.max(z0, z1); this.gb.box(a, b, d, e, f, g, C.r * q, C.g * q, C.b * q); if (b > 0.01) this.gb.quadA([a, b, d, 0, 0], [e, b, d, 0, 0], [e, b, g, 0, 0], [a, b, g, 0, 0], 0, -1, 0, C.r * q * 0.8, C.g * q * 0.8, C.b * q * 0.8); if (solid && Math.min(y0, y1) < 1.6 && Math.max(y0, y1) > 0.25) this.col(x0, z0, x1, z1); return this; }
  glow(x0, y0, z0, x1, y1, z1, c, k) { const C = ikCol(c), q = k == null ? 1 : k; this.gl.box(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1), C.r * q, C.g * q, C.b * q); return this; }
  glass(x0, y0, z0, x1, y1, z1, c) { const C = ikCol(c == null ? 0x9ec8dc : c); this.gs.box(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1), C.r, C.g, C.b); return this; }
  water(x0, z0, x1, z1, y, c) { const C = ikCol(c == null ? 0x2a8fc0 : c); (this.gw || (this.gw = new GB(0, 0, false))).box(x0, y - 0.04, z0, x1, y, z1, C.r, C.g, C.b); return this; }
  cyl(x, y, z, r, h, c, solid, rz) { const C = ikCol(c); cylAt(this.gb, x, y, z, r, h, rz == null ? r : rz, C.r, C.g, C.b); if (solid && y < 1.6 && y + h > 0.25) this.col(x - r * 0.8, z - r * 0.8, x + r * 0.8, z + r * 0.8); return this; }
  col(x0, z0, x1, z1) { const c = [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]; this.cols.push(c); return c; }
  /* a box given in a local frame turned by a quarter-turn yaw (0, PI/2, PI, -PI/2) about (x, z) */
  rb(x, z, yaw, a, c, solid, k) {
    const q = Math.round(yaw / (Math.PI / 2)) & 3, T = (u, v) => (q === 0 ? [x + u, z + v] : q === 1 ? [x + v, z - u] : q === 2 ? [x - u, z - v] : [x - v, z + u]);
    const p = T(a[0], a[2]), r = T(a[3], a[5]); return this.box(p[0], a[1], p[1], r[0], a[4], r[1], c, solid, k);
  }
  rg(x, z, yaw, a, c, k) { const q = Math.round(yaw / (Math.PI / 2)) & 3, T = (u, v) => (q === 0 ? [x + u, z + v] : q === 1 ? [x + v, z - u] : q === 2 ? [x - u, z - v] : [x - v, z + u]); const p = T(a[0], a[2]), r = T(a[3], a[5]); return this.glow(p[0], a[1], p[1], r[0], a[4], r[1], c, k); }
  light(x, y, z, c, I, d) { if (this.lights >= 6) return this; this.lights++; const L = new THREE.PointLight(ikCol(c == null ? 0xfff0dc : c), I == null ? 0.9 : I, d || 16, 1.4); L.position.set(x, y, z); this.sc.add(L); return this; }
  sign(txt, x, y, z, w, h, ry, o) {
    o = o || {}; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: ikText(txt, Object.assign({ w: Math.round(256 * w / h) > 1024 ? 1024 : Math.round(256 * w / h), h: 256 }, o)), transparent: !o.bg, toneMapped: false, color: new THREE.Color(o.k || 1.1, o.k || 1.1, o.k || 1.1) }));
    m.material.__own = true; m.position.set(x, y, z); m.rotation.y = ry || 0; this.sc.add(m); return m;
  }
  act(x, z, r, label, fn, o) { const a = Object.assign({ x, z, r: r || 1.6, label, fn }, o || {}); this.acts.push(a); return a; }
  spawn(name, x, z, yaw) { this.spawns[name] = [x, z, yaw]; return this; }
  tick(f) { this.ticks.push(f); return this; }
  /* ---- the room ---- */
  /* o = { W, D, H, floor, wall, ceil, trim, door (x of the street door, or false), win (windows), lightsN, base, exit: label } */
  shell(o) {
    const W = o.W, D = o.D, H = o.H || 3.6, x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2, T = 0.25; this.W = W; this.D = D; this.H = H; this.x0 = x0; this.x1 = x1; this.z0 = z0; this.z1 = z1;
    const fl = o.floor == null ? 0x8a7a68 : o.floor, wa = o.wall == null ? 0xd8d2c6 : o.wall, ce = o.ceil == null ? 0xe8e6e0 : o.ceil, tr = o.trim == null ? 0x3a3530 : o.trim;
    this.box(x0, -0.2, z0, x1, 0, z1, fl);
    if (o.tiles) { const tc = ikCol(o.tiles); for (let x = Math.ceil(x0); x < x1; x += 2) this.box(x - 0.01, 0, z0, x + 0.01, 0.003, z1, tc); for (let z = Math.ceil(z0); z < z1; z += 2) this.box(x0, 0, z - 0.01, x1, 0.003, z + 0.01, tc); }
    this.box(x0, H, z0, x1, H + 0.2, z1, ce);
    const dx = this.dx = o.door == null ? 0 : o.door === false ? null : o.door, dw = o.dw || 2.2;
    this.box(x0 - T, 0, z0 - T, x1 + T, H, z0, wa); this.box(x0 - T, 0, z0, x0, H, z1 + T, wa, false, 0.92); this.box(x1, 0, z0, x1 + T, H, z1 + T, wa, false, 0.92);
    if (dx == null) this.box(x0 - T, 0, z1, x1 + T, H, z1 + T, wa, false, 0.96);
    else {
      this.box(x0 - T, 0, z1, dx - dw / 2, H, z1 + T, wa, false, 0.96); this.box(dx + dw / 2, 0, z1, x1 + T, H, z1 + T, wa, false, 0.96); this.box(dx - dw / 2, 2.6, z1, dx + dw / 2, H, z1 + T, wa, false, 0.96);
      /* the street door: frame, glass, daylight beyond, a mat */
      this.box(dx - dw / 2 - 0.12, 0, z1 - 0.06, dx - dw / 2, 2.72, z1 + 0.02, tr); this.box(dx + dw / 2, 0, z1 - 0.06, dx + dw / 2 + 0.12, 2.72, z1 + 0.02, tr); this.box(dx - dw / 2 - 0.12, 2.6, z1 - 0.06, dx + dw / 2 + 0.12, 2.72, z1 + 0.02, tr);
      this.glow(dx - dw / 2, 0, z1 + 0.2, dx + dw / 2, 2.6, z1 + 0.24, this.night ? 0x1a2433 : 0xcfe2f2, this.night ? 1 : 1.25);
      this.glass(dx - dw / 2, 0.02, z1 + 0.08, dx + dw / 2, 2.58, z1 + 0.12); this.box(dx - 0.02, 0.02, z1 + 0.06, dx + 0.02, 2.58, z1 + 0.14, tr);
      this.box(dx - 1, 0, z1 - 1.6, dx + 1, 0.012, z1 - 0.2, 0x3a2a24);
      this.spawn('door', dx, z1 - 1.3, Math.PI);
      this.act(dx, z1 - 0.6, 1.5, o.exit || 'Leave', () => Int.leave(), { wide: true });
      this.tick(() => { if (Math.abs(Int.x - dx) < dw / 2 - 0.1 && Int.z > z1 - 0.34 && Int.vz > 0.4 && Int.t > 0.8) Int.leave(); });
    }
    /* skirting, cornice */
    const tc = ikCol(tr); for (const [a, b, c, d] of [[x0, z0, x1, z0 + 0.03], [x0, z0, x0 + 0.03, z1], [x1 - 0.03, z0, x1, z1], [x0, z1 - 0.03, x1, z1]]) { this.box(a, 0, b, c, 0.12, d, tc); this.box(a, H - 0.08, b, c, H, d, tc, false, 1.1); }
    /* windows on the side and back walls */
    if (o.win !== false) {
      const sky = this.night ? 0x18243a : 0xbcd8ee, k = this.night ? 1 : 1.2, wh = o.winH || [1.0, 2.6];
      for (let z = z0 + 2.5; z < z1 - 2.5; z += 4) for (const sx of [-1, 1]) { const x = sx < 0 ? x0 + 0.02 : x1 - 0.02; this.glow(x - sx * 0.0, wh[0], z - 1.1, x - sx * 0.01, wh[1], z + 1.1, sky, k); this.box(x - sx * 0.06, wh[0] - 0.08, z - 1.2, x, wh[0], z + 1.2, 0xe8e4dc); this.box(x - sx * 0.05, (wh[0] + wh[1]) / 2 - 0.03, z - 1.1, x, (wh[0] + wh[1]) / 2 + 0.03, z + 1.1, 0xe8e4dc); }
      if (!o.noBackWin) for (let x = x0 + 2.5; x < x1 - 2.5; x += 4) { this.glow(x - 1.1, wh[0], z0 + 0.01, x + 1.1, wh[1], z0 + 0.02, sky, k); this.box(x - 1.2, wh[0] - 0.08, z0, x + 1.2, wh[0], z0 + 0.06, 0xe8e4dc); }
    }
    /* ceiling lights in a grid */
    if (o.lights !== false) {
      const lc0 = o.lamp || 0xfff4e0; let n = 0;
      for (let x = x0 + 3; x < x1 - 1; x += 6) for (let z = z0 + 3; z < z1 - 1; z += 6) { this.glow(x - 0.6, H - 0.03, z - 0.25, x + 0.6, H - 0.01, z + 0.25, lc0, 1.6); n++; }
      const step = Math.max(6, Math.ceil(Math.max(W, D) / 2.2));
      for (let x = x0 + W / 4; x < x1; x += W / 2) for (let z = z0 + D / 4; z < z1; z += D / 2) this.light(x, H - 0.4, z, lc0, o.lightI == null ? 0.75 : o.lightI, step * 1.6);
    }
    this.bounds = [x0, z0, x1, dx == null ? z1 : z1 + 0.05];
    const hemi = new THREE.HemisphereLight(lc(o.sky || 0xfff6ea), lc(o.gnd || 0x4a4038), o.hemi == null ? 0.75 : o.hemi); this.sc.add(hemi);
    return this;
  }
  /* a partition wall along x (at z) or along z (at x), with door gaps [[a, b], ...] */
  wallX(z, xa, xb, gaps, c, h, t) { const H = h || this.H, T = (t || 0.14) / 2; let a = xa; for (const g of (gaps || []).slice().sort((p, q) => p[0] - q[0])) { if (g[0] > a) this.box(a, 0, z - T, g[0], H, z + T, c, true); this.box(g[0], 2.3, z - T, g[1], H, z + T, c); a = g[1]; } if (xb > a) this.box(a, 0, z - T, xb, H, z + T, c, true); return this; }
  wallZ(x, za, zb, gaps, c, h, t) { const H = h || this.H, T = (t || 0.14) / 2; let a = za; for (const g of (gaps || []).slice().sort((p, q) => p[0] - q[0])) { if (g[0] > a) this.box(x - T, 0, a, x + T, H, g[0], c, true); this.box(x - T, 2.3, g[0], x + T, H, g[1], c); a = g[1]; } if (zb > a) this.box(x - T, 0, a, x + T, H, zb, c, true); return this; }
  /* ---- furniture ---- */
  counter(x0, z0, x1, z1, c, top, h) { const H = h || 1.02; this.box(x0, 0, z0, x1, H - 0.05, z1, c, true); this.box(x0 - 0.04, H - 0.05, z0 - 0.04, x1 + 0.04, H, z1 + 0.04, top == null ? 0xe8e4dc : top); return this; }
  table(x, z, w, d, c, h, round) {
    const H = h || 0.76, C = c == null ? 0x6a4a32 : c;
    if (round) { this.cyl(x, H - 0.04, z, w / 2, 0.04, C); this.cyl(x, 0, z, 0.05, H - 0.04, 0x2a2a2a); this.cyl(x, 0, z, 0.3, 0.03, 0x2a2a2a); }
    else { this.box(x - w / 2, H - 0.05, z - d / 2, x + w / 2, H, z + d / 2, C); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.box(x + a * (w / 2 - 0.08) - 0.03, 0, z + b * (d / 2 - 0.08) - 0.03, x + a * (w / 2 - 0.08) + 0.03, H - 0.05, z + b * (d / 2 - 0.08) + 0.03, C, false, 0.7); }
    this.col(x - w / 2 + 0.05, z - d / 2 + 0.05, x + w / 2 - 0.05, z + d / 2 - 0.05); return this;
  }
  chair(x, z, yaw, c, stool) {
    const C = c == null ? 0x3a2a20 : c;
    if (stool) { this.cyl(x, 0, z, 0.04, 0.72, 0x3a3a3a); this.cyl(x, 0.72, z, 0.2, 0.06, C); return this; }
    this.rb(x, z, yaw, [-0.22, 0.42, -0.22, 0.22, 0.47, 0.22], C); this.rb(x, z, yaw, [-0.22, 0.47, -0.24, 0.22, 0.95, -0.2], C, false, 0.9);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.rb(x, z, yaw, [a * 0.19 - 0.02, 0, b * 0.19 - 0.02, a * 0.19 + 0.02, 0.42, b * 0.19 + 0.02], 0x2a2a2a);
    return this;
  }
  shelf(x0, z0, x1, z1, h, rows, r, pal, c) {
    const C = c == null ? 0xb8b2a6 : c, H = h || 2, n = rows || 4, along = x1 - x0 > z1 - z0; this.box(x0, 0, z0, x1, 0.1, z1, C, true);
    for (const e of along ? [x0, x1 - 0.04] : [z0, z1 - 0.04]) along ? this.box(e, 0, z0, e + 0.04, H, z1, C) : this.box(x0, 0, e, x1, H, e + 0.04, C);
    for (let i = 1; i <= n; i++) {
      const y = 0.1 + (H - 0.15) * i / n; this.box(x0, y - 0.03, z0, x1, y, z1, C);
      if (r && pal) { const L = along ? x1 - x0 : z1 - z0, dd = along ? z1 - z0 : x1 - x0; let u = 0.06; while (u < L - 0.1) { const w = 0.08 + r() * 0.22, hh = Math.min(0.08 + r() * 0.26, (H - 0.15) / n - 0.06), col = pal[(r() * pal.length) | 0]; if (r() < 0.88) { if (along) this.box(x0 + u, y - 0.03 - (H - 0.15) / n + 0.03 + 0.03, z0 + dd * 0.12, x0 + u + w, y - 0.03 - (H - 0.15) / n + 0.06 + hh, z1 - dd * 0.12, col); else this.box(x0 + dd * 0.12, y - 0.03 - (H - 0.15) / n + 0.06, z0 + u, x1 - dd * 0.12, y - 0.03 - (H - 0.15) / n + 0.06 + hh, z0 + u + w, col); } u += w + 0.02; } }
    }
    this.col(x0, z0, x1, z1); return this;
  }
  rack(x0, z, x1, r, pal) {   /* a clothes rail: garments on hangers */
    this.cyl(x0, 0, z, 0.03, 1.6, 0x9a9aa0); this.cyl(x1, 0, z, 0.03, 1.6, 0x9a9aa0); this.box(x0, 1.56, z - 0.02, x1, 1.6, z + 0.02, 0xb0b0b8);
    for (let x = x0 + 0.12; x < x1 - 0.08; x += 0.09 + r() * 0.05) { const c = pal[(r() * pal.length) | 0], L = 0.6 + r() * 0.45; this.box(x - 0.012, 1.56 - L, z - 0.24, x + 0.012, 1.5, z + 0.24, c); }
    this.col(x0 - 0.05, z - 0.28, x1 + 0.05, z + 0.28); return this;
  }
  sofa(x, z, yaw, w, c) { const C = c == null ? 0x5a6a7a : c, W = (w || 2.2) / 2; this.rb(x, z, yaw, [-W, 0, -0.45, W, 0.45, 0.45], C, true); this.rb(x, z, yaw, [-W, 0.45, -0.45, W, 0.95, -0.22], C, false, 0.9); this.rb(x, z, yaw, [-W, 0.45, -0.45, -W + 0.2, 0.68, 0.45], C, false, 0.85); this.rb(x, z, yaw, [W - 0.2, 0.45, -0.45, W, 0.68, 0.45], C, false, 0.85); for (let i = 0; i < Math.max(1, Math.round(W)); i++) { const u = -W + 0.22 + (2 * W - 0.44) * (i + 0.5) / Math.max(1, Math.round(W)); this.rb(x, z, yaw, [u - (W - 0.22) / Math.max(1, Math.round(W)) + 0.03, 0.45, -0.2, u + (W - 0.22) / Math.max(1, Math.round(W)) - 0.03, 0.56, 0.42], C, false, 1.08); } return this; }
  bed(x, z, yaw, c, dbl) { const W = dbl ? 0.85 : 0.5; this.rb(x, z, yaw, [-W, 0, -1.05, W, 0.42, 1.05], 0x5a4030, true); this.rb(x, z, yaw, [-W + 0.03, 0.42, -1.0, W - 0.03, 0.58, 1.0], 0xf2f0ea); this.rb(x, z, yaw, [-W + 0.02, 0.58, -0.35, W - 0.02, 0.62, 1.0], c == null ? 0x4a6aa0 : c); this.rb(x, z, yaw, [-W, 0, -1.12, W, 1.05, -1.04], 0x5a4030); for (const s of dbl ? [-0.42, 0.42] : [0]) this.rb(x, z, yaw, [s - 0.3, 0.58, -0.95, s + 0.3, 0.72, -0.6], 0xffffff); return this; }
  plant(x, z, s, pot) { const S = s || 1; this.cyl(x, 0, z, 0.22 * S, 0.42 * S, pot == null ? 0xb06a4a : pot, true); for (let i = 0; i < 5; i++) { const a = i * 1.26, rr = 0.12 * S; this.cyl(x + Math.sin(a) * rr, 0.42 * S, z + Math.cos(a) * rr, 0.16 * S, (0.6 + (i % 3) * 0.25) * S, i % 2 ? 0x3f7a3a : 0x2f6a30, false, 0.1 * S); } this.cyl(x, 0.42 * S, z, 0.24 * S, 0.9 * S, 0x356f34); return this; }
  rug(x0, z0, x1, z1, c, c2) { this.box(x0, 0, z0, x1, 0.012, z1, c); if (c2 != null) this.box(x0 + 0.15, 0.012, z0 + 0.15, x1 - 0.15, 0.016, z1 - 0.15, c2); return this; }
  tv(x, y, z, yaw, w, img) { const W = (w || 1.4) / 2, H = W * 0.58; this.rb(x, z, yaw, [-W, y - H, -0.04, W, y + H, 0.03], 0x0a0a0c); this.rg(x, z, yaw, [-W + 0.04, y - H + 0.04, 0.03, W - 0.04, y + H - 0.04, 0.035], img == null ? 0x3a7ac0 : img, 1.1); return this; }
  desk(x, z, yaw, c) { const C = c == null ? 0xd8d2c4 : c; this.rb(x, z, yaw, [-0.75, 0.72, -0.4, 0.75, 0.76, 0.4], C, true); this.rb(x, z, yaw, [-0.75, 0, -0.4, -0.7, 0.72, 0.4], 0x5a5a60); this.rb(x, z, yaw, [0.7, 0, -0.4, 0.75, 0.72, 0.4], 0x5a5a60); this.rb(x, z, yaw, [-0.3, 0.76, -0.3, 0.3, 1.12, -0.26], 0x16181c); this.rg(x, z, yaw, [-0.27, 0.79, -0.26, 0.27, 1.09, -0.255], 0x4a7ab8, 1.1); this.rb(x, z, yaw, [-0.25, 0.76, -0.05, 0.25, 0.78, 0.12], 0x2a2a30); return this; }
  lamp(x, z, c) { this.cyl(x, 0, z, 0.15, 0.03, 0x2a2a2a); this.cyl(x, 0, z, 0.02, 1.5, 0x2a2a2a); this.cyl(x, 1.42, z, 0.22, 0.3, c == null ? 0xf2e6c8 : c, false, 0.16); this.glow(x - 0.1, 1.5, z - 0.1, x + 0.1, 1.6, z + 0.1, 0xffe8b8, 1.6); return this; }
  crate(x, z, s, c, y) { const S = (s || 1) / 2, Y = y || 0; this.box(x - S, Y, z - S, x + S, Y + S * 2, z + S, c == null ? 0xa07a4a : c, true); this.box(x - S - 0.01, Y + S * 0.9, z - S - 0.01, x + S + 0.01, Y + S * 1.1, z + S + 0.01, 0x7a5a34); return this; }
  pic(x, y, z, yaw, w, h, c) { this.rb(x, z, yaw, [-w / 2 - 0.05, y - h / 2 - 0.05, 0, w / 2 + 0.05, y + h / 2 + 0.05, 0.03], 0x2a2018); this.rb(x, z, yaw, [-w / 2, y - h / 2, 0.03, w / 2, y + h / 2, 0.035], c == null ? 0x6a8aa8 : c); return this; }
  fridge(x, z, yaw, glassFront) { this.rb(x, z, yaw, [-0.45, 0, -0.35, 0.45, 2.0, 0.35], 0xe8eaec, true); if (glassFront) { this.rg(x, z, yaw, [-0.4, 0.15, 0.35, 0.4, 1.9, 0.36], 0xd8f0ff, 0.9); for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) this.rb(x, z, yaw, [-0.36 + j * 0.15, 0.25 + i * 0.42, 0.1, -0.26 + j * 0.15, 0.5 + i * 0.42, 0.3], [0xd82a2a, 0x2a8ad8, 0xf2c81e, 0x3ab04a, 0xf28a1e][(i + j) % 5]); } else this.rb(x, z, yaw, [-0.43, 1.2, 0.35, 0.43, 1.22, 0.37], 0xb0b4b8); return this; }
  stove(x, z, yaw) { this.rb(x, z, yaw, [-0.45, 0, -0.3, 0.45, 0.9, 0.3], 0x3a3c40, true); for (const [a, b] of [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.14], [0.2, 0.14]]) this.rb(x, z, yaw, [a - 0.09, 0.9, b - 0.09, a + 0.09, 0.92, b + 0.09], 0x15161a); return this; }
  person(o) {
    if (this.npcs.length >= INT.NPC_CAP) return null;
    const r = mulberry32((ihash((this.rec.seed | 0) + this.npcs.length * 17, this.room.length, (o.seed || 0) | 0) * 4294967296) >>> 0), R0 = Math.random; let a; Math.random = r; try { a = pedRandomLook(); } finally { Math.random = R0; }
    if (o.fem != null && a.fem !== o.fem) { Math.random = r; try { for (let k = 0; k < 8 && a.fem !== o.fem; k++) a = pedRandomLook(); } finally { Math.random = R0; } }
    a.kid = !!o.kid && a.kid; if (!o.kid) { if (a.kid) { a.kid = false; a.s = 0.95 + r() * 0.1; a.hs = 1; } }
    if (o.shirt != null) { a.shirt = lc(o.shirt); a.sleeve = o.sleeve != null ? o.sleeve : true; a.coat = false; a.skirt = 0; a.bag = false; }
    if (o.pants != null) { a.pants = lc(o.pants); a.shorts = !!o.shorts; a.skirt = 0; }
    if (o.suit) { a.coat = false; a.skirt = 0; a.bag = false; a.sleeve = true; }
    if (o.hat !== undefined) a.hat = o.hat; if (o.swim) { a.swim = true; a.shorts = true; a.sleeve = false; a.coat = false; a.skirt = 0; a.bag = false; a.hat = null; a.shoe = a.skin; if (a.fem) { a.shirt = lc(o.swimC || 0x2a6ad8); a.pants = a.shirt; } else { a.shirt = a.skin; a.pants = lc(o.swimC || 0x2a6ad8); } }
    if (o.sport) { a.coat = false; a.skirt = 0; a.bag = false; a.sleeve = false; a.shorts = true; a.shirt = lc(o.sport); a.pants = lc(0x1a1c22); a.shoe = lc(0xf2f2f2); a.hat = null; }
    if (o.app) Object.assign(a, o.app);
    const n = { app: a, x: o.x, z: o.z, y: o.y || 0, yaw: o.yaw || 0, v: 0, vt: o.vt || 1.1 + r() * 0.3, ph: r() * TAU, seed: r() * 20, state: 'stand', kind: o.kind || 'stand', path: o.path || null, pi: 0, wait: r() * 2, face: !!o.face, talk: !!o.talk, eat: !!o.eat, type: !!o.type, move: o.move, sy: o.sy, sy0: o.sy0, after: o.after, role: o.role, tilt: 0, t: 0, vx: 0, vz: 0, vy: 0, wave: 0, pn: 0, jump: false, phone: !!o.phone, pw: false };
    const h = n.hu = Human.make(pedSpec(a, n.seed)); h.sig = Human.sig(a); h.app = a; h.chk = 0; h.gy = n.y; h.ps = null; this.sc.add(h.root);
    this.npcs.push(n); return n;
  }
  /* ---- build the meshes ---- */
  done() {
    const sc = this.sc, mk = (gb, mat) => { if (!gb.count) return; const m = gb.mesh(mat, false, false); mat.__own = true; sc.add(m); };
    mk(this.gb, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.04 }));
    mk(this.gl, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
    mk(this.gs, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.28, depthWrite: false }));
    if (this.gw) mk(this.gw, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.72, depthWrite: false }));
    sc.add(new THREE.AmbientLight(0xffffff, 0.12));
  }
}
