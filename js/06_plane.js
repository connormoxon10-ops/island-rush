/* ================= AIRCRAFT MODELS =================
   Sparrow (high-wing trainer), Vixen (aerobatic bubble-canopy), Talon (swept-wing jet) and a static airliner for the gate.
   Fuselages are lofted superellipse rings, wings are real airfoil sections extruded root to tip, and everything is merged
   per material. Models face +Z with +Y up and sit with their wheels on y = 0; the left wing is at +X. Movable parts (propeller,
   ailerons, elevators, rudder, afterburner) are separate meshes on pivots. */
const PSPEC = {
  sparrow: { id: 'sparrow', name: 'Sparrow', role: 'Trainer', blurb: 'Gentle, forgiving, slow to stall.', cost: 0, cgY: 1.35, eye: [0.3, 2.14, 0.5], chase: [9.5, 2.6], far: [20, 6.5], gear: { nz: 2.5, mz: 0.3, mx: 1.12 }, len: 8.4, span: 11.4, prop: true, jet: false,
    Vs: 21, Vr: 26, Vmax: 62, Vprop: 80, thrust: 3.6, drag: 1.0, pr: 0.9, rr: 2.0, yr: 0.55, stab: 1.5, aStall: 0.30, gmax: 5, crash: 6.2, mass: 1, rollT: 0.35, idle: 0.08 },
  vixen: { id: 'vixen', name: 'Vixen', role: 'Aerobatic', blurb: 'Snappy and light. Loops, rolls, hammerheads.', cost: 2500, cgY: 1.18, eye: [0, 1.78, 0.35], chase: [8.2, 2.1], far: [18, 5.5], gear: { nz: 2.0, mz: 0.15, mx: 1.0 }, len: 6.9, span: 8.2, prop: true, jet: false,
    Vs: 24, Vr: 30, Vmax: 88, Vprop: 112, thrust: 6.5, drag: 0.8, pr: 1.7, rr: 3.7, yr: 0.9, stab: 1.2, aStall: 0.34, gmax: 8, crash: 6.8, mass: 0.8, rollT: 0.18, idle: 0.1 },
  talon: { id: 'talon', name: 'Talon', role: 'Jet', brakeA: 1, blurb: 'Fast, loud and unforgiving. Watch your speed.', cost: 6000, cgY: 1.5, eye: [0, 2.16, 2.3], chase: [14, 3.6], far: [30, 9], gear: { nz: 3.4, mz: -0.5, mx: 1.3 }, len: 11.8, span: 9.4, prop: false, jet: true,
    Vs: 38, Vr: 52, Vmax: 165, Vprop: 200, thrust: 7.6, drag: 0.55, pr: 1.25, rr: 3.0, yr: 0.6, stab: 1.0, aStall: 0.3, gmax: 9, crash: 7.4, mass: 1.6, rollT: 0.22, idle: 0.12, cannon: true }
};
const PL = { ready: false };
function planeInit() {
  if (PL.ready) return; PL.ready = true;
  PL.paint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, metalness: 0.14 });
  PL.paintD = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide });
  PL.dark = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.2 });
  PL.glass = new THREE.MeshStandardMaterial({ color: lc(0x20384f), roughness: 0.08, metalness: 0.65, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
  PL.inner = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide });
  PL.flame = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.8, 0.3), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  PL.disc = new THREE.MeshBasicMaterial({ color: 0x1a1d22, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  PL.panelTex = (function () {
    const c = mkCanvas(512, 192), g = c.getContext('2d'); g.fillStyle = '#16191d'; g.fillRect(0, 0, 512, 192);
    const dial = (x, y, r, f) => { g.fillStyle = '#0a0b0d'; g.beginPath(); g.arc(x, y, r + 5, 0, TAU); g.fill(); g.fillStyle = '#e9e6dc'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82); g.lineTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95); g.stroke(); } g.strokeStyle = '#111'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(f) * r * 0.7, y + Math.sin(f) * r * 0.7); g.stroke(); };
    dial(100, 70, 46, 2.2); dial(256, 70, 46, 0.4); dial(412, 70, 46, -1.1); dial(100, 150, 32, 1.0); dial(256, 150, 32, 3.8); dial(412, 150, 32, 5.2);
    g.fillStyle = '#2e3239'; g.fillRect(170, 128, 70, 46); g.fillRect(272, 128, 70, 46); return canvasTex(c);
  })();
  PL.panel = new THREE.MeshStandardMaterial({ map: PL.panelTex, roughness: 0.6 });
}

/* ---- geometry builders ---- */
function loftPlane(rings, seg, cf) {
  const R = rings.length, pos = [], col = [], idx = [];
  for (let i = 0; i < R; i++) {
    const r = rings[i];
    for (let k = 0; k < seg; k++) {
      const a = TAU * k / seg, ca = Math.cos(a), sa = Math.sin(a), e = 2 / (r.n || 2.5);
      let x = r.w * Math.sign(ca) * Math.pow(Math.abs(ca), e), y = r.y + r.h * Math.sign(sa) * Math.pow(Math.abs(sa), e);
      if (r.flat && sa < 0) y = r.y + r.h * Math.sign(sa) * Math.pow(Math.abs(sa), e) * r.flat;
      pos.push(x, y, r.z); const c = cf(x, y, r.z, r, k); col.push(c[0], c[1], c[2]);
    }
  }
  for (let i = 0; i < R - 1; i++) for (let k = 0; k < seg; k++) {
    const k2 = (k + 1) % seg, p0 = i * seg + k, p1 = i * seg + k2, p2 = (i + 1) * seg + k, p3 = (i + 1) * seg + k2; idx.push(p0, p2, p3, p0, p3, p1);
  }
  const c0 = pos.length / 3; pos.push(0, rings[0].y, rings[0].z); col.push(0.8, 0.8, 0.8); pos.push(0, rings[R - 1].y, rings[R - 1].z); col.push(0.3, 0.3, 0.3);
  for (let k = 0; k < seg; k++) { const k2 = (k + 1) % seg; idx.push(c0, k, k2); idx.push(c0 + 1, (R - 1) * seg + k2, (R - 1) * seg + k); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g.toNonIndexed();
}
function _thick(x, t) { return 5 * t * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x); }
/* trapezoid wing: o = { x0, z0, y0, span, rc, tc, sweep, dih, th, side, up, top:[r,g,b], bot:[r,g,b] }; builds the part between span fractions t0..t1 and chord fractions c0..c1, shifted by org */
function wingGeo(o, t0, t1, c0, c1, org) {
  org = org || [0, 0, 0]; const N = 10, side = o.side || 1, pts = [];
  const prof = []; for (let i = 0; i <= N; i++) { const s = (1 - Math.cos(Math.PI * i / N)) / 2; prof.push(c0 + (c1 - c0) * s); }
  const loop = []; for (let i = 0; i <= N; i++) loop.push([prof[i], 1]); for (let i = N; i >= 0; i--) loop.push([prof[i], -1]);
  const L = loop.length, pos = [], col = [], idx = [];
  const st = (t) => ({ le: o.z0 - o.sweep * t, ch: lerp(o.rc, o.tc, t), y: o.y0 + o.dih * t, sx: o.x0 + o.span * t });
  for (const t of [t0, t1]) { const s = st(t); for (const [x, sg] of loop) {
    const yt = sg * _thick(x, o.th) * s.ch * (sg > 0 ? 1 : 0.82), z = s.le - x * s.ch, sp = side * s.sx, vy = s.y + yt;
    let X = sp, Y = vy; if (o.up) { X = yt * side; Y = o.y0 + s.sx + o.dih * t * 0; }
    pos.push(X - org[0], Y - org[1], z - org[2]); const c = sg > 0 ? o.top : o.bot; col.push(c[0], c[1], c[2]); } }
  for (let k = 0; k < L; k++) { const k2 = (k + 1) % L; idx.push(k, k2, L + k, k2, L + k2, L + k); }
  for (let t = 0; t < 2; t++) { const base = pos.length / 3, cc = [0, 0, 0]; for (let k = 0; k < L; k++) { cc[0] += pos[(t * L + k) * 3]; cc[1] += pos[(t * L + k) * 3 + 1]; cc[2] += pos[(t * L + k) * 3 + 2]; } pos.push(cc[0] / L, cc[1] / L, cc[2] / L); col.push(o.top[0], o.top[1], o.top[2]); for (let k = 0; k < L; k++) { const k2 = (k + 1) % L; if (t) idx.push(base, t * L + k, t * L + k2); else idx.push(base, t * L + k2, t * L + k); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g.toNonIndexed();
}
function cylBetween(a, b, r, seg) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(), g = ni(new THREE.CylinderGeometry(r, r, len, seg || 6));
  const m = new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)); return [g, m];
}
const _plw = new THREE.Color(1, 1, 1), _pI = new THREE.Matrix4();
function pgeo(gb, g, m, c) { gb.geo(g, m || _pI, c || _plw, 0); }
function pbox(gb, x0, y0, z0, x1, y1, z1, r, g, b) { gb.box(x0, y0, z0, x1, y1, z1, r, g, b); gb.quadA([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], 0, -1, 0, r * 0.55, g * 0.55, b * 0.55); }
function wheelAt(gb, x, y, z, r, w) { const g = ni(new THREE.CylinderGeometry(r, r, w, 14)); pgeo(gb, g, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(1, 1, 1)), new THREE.Color(0.05, 0.05, 0.055)); const h = ni(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 10)); pgeo(gb, h, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(1, 1, 1)), new THREE.Color(0.5, 0.5, 0.52)); }
function glassQuad(gb, p0, p1, p2, p3) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...p0, ...p1, ...p2, ...p0, ...p2, ...p3], 3)); g.computeVertexNormals(); gb.push(g); }
const _plgc = (c) => { const k = new THREE.Color(c); k.convertSRGBToLinear(); return [k.r, k.g, k.b]; };
function mergeGlass(list) {
  if (!list.length) return null; let n = 0; for (const g of list) n += g.attributes.position.count; const p = new Float32Array(n * 3), nn = new Float32Array(n * 3); let o = 0;
  for (const g of list) { p.set(g.attributes.position.array, o * 3); nn.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nn, 3)); return new THREE.Mesh(g, PL.glass);
}

/* ---- common assembly ---- */
function planeParts(spec) { return { prop: null, disc: null, aileL: null, aileR: null, elev: null, elevL: null, elevR: null, rud: null, flame: null, cockpit: null, spin: 0 }; }
function finishPlane(root, gbs, extra) {
  for (const [gb, mat] of gbs) if (gb.count) { const m = gb.mesh(mat, true, true); m.frustumCulled = true; root.add(m); }
  for (const m of extra || []) root.add(m);
}

/* ================= SPARROW ================= */
function buildSparrow(liv) {
  planeInit(); const root = new THREE.Group(), P = planeParts(), A = _plgc(liv.a), B = _plgc(liv.b), W = [0.85, 0.86, 0.86], D = [0.12, 0.13, 0.14];
  const gbP = new GB(0, 0, false), gbPD = new GB(0, 0, false), gbD = new GB(0, 0, false), glass = [];
  const rings = [
    { z: 3.5, w: 0.3, h: 0.28, y: 1.12, n: 2.2 }, { z: 3.3, w: 0.5, h: 0.46, y: 1.14, n: 2.3 }, { z: 2.7, w: 0.58, h: 0.56, y: 1.2, n: 2.5 }, { z: 2.1, w: 0.66, h: 0.74, y: 1.36, n: 2.7 }, { z: 1.2, w: 0.7, h: 0.82, y: 1.46, n: 2.8 },
    { z: 0.1, w: 0.68, h: 0.8, y: 1.5, n: 2.8 }, { z: -1.2, w: 0.6, h: 0.72, y: 1.52, n: 2.8 }, { z: -2.4, w: 0.44, h: 0.54, y: 1.57, n: 2.6 }, { z: -3.6, w: 0.27, h: 0.35, y: 1.66, n: 2.4 }, { z: -4.6, w: 0.13, h: 0.22, y: 1.78, n: 2.2 }, { z: -4.75, w: 0.05, h: 0.1, y: 1.8, n: 2 }];
  pgeo(gbP, loftPlane(rings, 28, (x, y, z, r) => { if (z > 2.25) return A; const bel = y < r.y - r.h * 0.55; if (bel) return W.map((v) => v * 0.8); if (z < -3.2) return y > r.y + r.h * 0.1 ? A : W; if (Math.abs(y - (r.y - 0.02)) < r.h * 0.17 && z < 2.3) return A; return W; }));
  const wing = { x0: 0.5, z0: 1.4, y0: 2.28, span: 5.6, rc: 1.7, tc: 1.15, sweep: 0.1, dih: 0.14, th: 0.075, top: W, bot: [0.7, 0.72, 0.74] };
  for (const s of [1, -1]) { const w = Object.assign({ side: s }, wing); pgeo(gbPD, wingGeo(w, 0, 0.98, 0, 0.74));
    const pv = [s * (0.5 + 5.6 * 0.58), 2.28 + 0.14 * 0.58, 1.4 - 0.1 * 0.58 - 0.74 * lerp(1.7, 1.15, 0.58)], ail = new THREE.Group(); ail.position.set(pv[0], pv[1], pv[2]);
    const ag = new GB(0, 0, false); pgeo(ag, wingGeo(w, 0.58, 0.98, 0.74, 1, pv)); const am = ag.mesh(PL.paintD, true, true); ail.add(am); root.add(ail); if (s > 0) P.aileL = ail; else P.aileR = ail;
    pgeo(gbPD, wingGeo(Object.assign({}, w), 0, 0.58, 0.74, 1));
    pgeo(gbPD, wingGeo({ x0: 0.5, z0: 1.4, y0: 2.28, span: 5.6, rc: 1.7, tc: 1.15, sweep: 0.1, dih: 0.14, th: 0.075, top: A, bot: A, side: s }, 0.97, 1, 0, 1));
    const [sg, sm] = cylBetween([s * 0.55, 0.95, 0.5], [s * 2.5, 2.3, 0.62], 0.04, 6); pgeo(gbD, sg, sm, new THREE.Color(0.7, 0.7, 0.72)); }
  /* tail */
  for (const s of [1, -1]) { const st = { x0: 0.1, z0: -3.7, y0: 1.7, span: 1.85, rc: 1.1, tc: 0.7, sweep: 0.25, dih: 0.03, th: 0.06, top: W, bot: W, side: s };
    pgeo(gbPD, wingGeo(st, 0, 1, 0, 0.62)); const pv = [s * 0.1, 1.7, -3.7 - 0.62 * 1.1], el = new THREE.Group(); el.position.set(pv[0], pv[1], pv[2]); const eg = new GB(0, 0, false); pgeo(eg, wingGeo(st, 0, 1, 0.62, 1, pv)); el.add(eg.mesh(PL.paintD, true, true)); root.add(el); if (s > 0) P.elevL = el; else P.elevR = el; }
  { const fin = { x0: 0, z0: -3.45, y0: 1.82, span: 1.5, rc: 1.5, tc: 0.85, sweep: 0.7, dih: 0, th: 0.06, top: A, bot: A, side: 1, up: true };
    pgeo(gbPD, wingGeo(fin, 0, 1, 0, 0.6)); const pv = [0, 1.82, -3.45 - 0.6 * 1.5], rd = new THREE.Group(); rd.position.set(pv[0], pv[1], pv[2]); const rg = new GB(0, 0, false); pgeo(rg, wingGeo(fin, 0, 1, 0.6, 1, pv)); rd.add(rg.mesh(PL.paintD, true, true)); root.add(rd); P.rud = rd; }
  /* gear */
  wheelAt(gbD, 1.12, 0.3, 0.3, 0.3, 0.17); wheelAt(gbD, -1.12, 0.3, 0.3, 0.3, 0.17); wheelAt(gbD, 0, 0.26, 2.5, 0.26, 0.15);
  for (const s of [1, -1]) { const [g, m] = cylBetween([s * 0.45, 0.95, 0.3], [s * 1.1, 0.34, 0.3], 0.05, 6); pgeo(gbD, g, m, new THREE.Color(0.55, 0.56, 0.58)); }
  { const [g, m] = cylBetween([0, 1.0, 2.5], [0, 0.3, 2.5], 0.045, 6); pgeo(gbD, g, m, new THREE.Color(0.55, 0.56, 0.58)); }
  /* cowl intake, exhaust, nav lights */
  pbox(gbD, -0.2, 1.0, 3.28, 0.2, 1.22, 3.36, 0.03, 0.03, 0.035);
  pbox(gbD, 5.6 + 0.4, 2.3, 0.15, 6.15, 2.38, 0.25, 0.9, 0.05, 0.05); pbox(gbD, -6.15, 2.3, 0.15, -5.6 - 0.4, 2.38, 0.25, 0.05, 0.7, 0.1);
  /* glass: windscreen + side windows */
  glassQuad(glass, [-0.5, 1.98, 2.05], [0.5, 1.98, 2.05], [0.46, 2.26, 1.3], [-0.46, 2.26, 1.3]);
  for (const s of [1, -1]) { glassQuad(glass, [s * 0.65, 1.78, 1.9], [s * 0.65, 1.78, -0.95], [s * 0.6, 2.2, -0.8], [s * 0.57, 2.2, 1.35]); }
  glassQuad(glass, [-0.36, 2.1, -1.25], [0.36, 2.1, -1.25], [0.3, 2.22, -1.6], [-0.3, 2.22, -1.6]);
  /* propeller */
  const prop = new THREE.Group(); prop.position.set(0, 1.12, 3.55); P.prop = prop;
  { const pg = new GB(0, 0, false); const sp = ni(new THREE.ConeGeometry(0.24, 0.5, 14)); pgeo(pg, sp, new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0.2), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1)), new THREE.Color(A[0], A[1], A[2]));
    for (const a of [0, Math.PI]) pbox(pg, -0.07, 0.0, -0.03, 0.07, 1.0, 0.03, 0.05, 0.05, 0.06); const spin = new THREE.Group(); const blade = pg.mesh(PL.dark, true, false); spin.add(blade); prop.add(spin); P.spin = spin;
    const bl2 = new GB(0, 0, false); pbox(bl2, -0.07, -1.0, -0.03, 0.07, 0.0, 0.03, 0.05, 0.05, 0.06); spin.add(bl2.mesh(PL.dark, true, false));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.02, 24), PL.disc.clone()); disc.position.z = 0.0; prop.add(disc); P.disc = disc; }
  root.add(prop);
  /* cockpit interior */
  const ck = new THREE.Group(), gi = new GB(0, 0, false), I1 = [0.27, 0.27, 0.28], I2 = [0.5, 0.46, 0.4];
  pbox(gi, -0.62, 0.78, -0.95, 0.62, 0.82, 1.9, ...I1); pbox(gi, -0.66, 0.8, -0.95, -0.6, 1.72, 1.9, ...I1); pbox(gi, 0.6, 0.8, -0.95, 0.66, 1.72, 1.9, ...I1);
  pbox(gi, -0.66, 0.8, -0.98, 0.66, 2.24, -0.9, ...I2); pbox(gi, -0.6, 2.22, -0.95, 0.6, 2.28, 0.25, ...I1);
  pbox(gi, -0.62, 1.3, 1.8, 0.62, 1.74, 2.08, 0.1, 0.1, 0.11); pbox(gi, -0.62, 1.7, 1.55, 0.62, 1.76, 2.1, 0.07, 0.07, 0.08);
  pbox(gi, -0.12, 1.3, 1.2, 0.12, 1.37, 1.75, 0.2, 0.2, 0.22);
  for (const s of [1, -1]) { pbox(gi, s * 0.5, 1.0, 0.3, s * 0.62, 2.0, 0.45, 0.14, 0.14, 0.15); pbox(gi, s * 0.5 - 0.025, 1.98, 1.95, s * 0.5 + 0.025, 2.26, 2.02, 0.1, 0.1, 0.11); }
  pbox(gi, 0.12, 0.85, 0.5, 0.55, 1.2, 0.95, ...I2); pbox(gi, -0.55, 0.85, 0.5, -0.12, 1.2, 0.95, ...I2);
  ck.add(gi.mesh(PL.inner, false, false));
  { const pn = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.42), PL.panel); pn.position.set(0, 1.56, 1.79); pn.rotation.x = -0.28; pn.rotation.y = Math.PI; ck.add(pn); }
  const yoke = new THREE.Group(); yoke.position.set(0.3, 1.5, 1.28); { const yg = new GB(0, 0, false); pbox(yg, -0.02, -0.05, -0.4, 0.02, 0.05, 0.0, 0.08, 0.08, 0.09); pbox(yg, -0.17, 0.03, -0.0, 0.17, 0.09, 0.04, 0.06, 0.06, 0.07); pbox(yg, -0.19, -0.1, 0.0, -0.15, 0.1, 0.04, 0.06, 0.06, 0.07); pbox(yg, 0.15, -0.1, 0.0, 0.19, 0.1, 0.04, 0.06, 0.06, 0.07); yoke.add(yg.mesh(PL.dark, false, false)); } ck.add(yoke); P.yoke = yoke;
  root.add(ck); P.cockpit = ck;
  const gm = mergeGlass(glass); if (gm) { gm.renderOrder = 2; root.add(gm); }
  finishPlane(root, [[gbP, PL.paint], [gbPD, PL.paintD], [gbD, PL.dark]]);
  return { root, parts: P, spec: PSPEC.sparrow };
}

/* ================= VIXEN ================= */
function buildVixen(liv) {
  planeInit(); const root = new THREE.Group(), P = planeParts(), A = _plgc(liv.a), B = _plgc(liv.b), W = [0.9, 0.9, 0.88];
  const gbP = new GB(0, 0, false), gbPD = new GB(0, 0, false), gbD = new GB(0, 0, false), glass = [];
  const rings = [{ z: 3.0, w: 0.3, h: 0.3, y: 1.1, n: 2.2 }, { z: 2.6, w: 0.5, h: 0.5, y: 1.14, n: 2.3 }, { z: 1.7, w: 0.56, h: 0.6, y: 1.24, n: 2.5 }, { z: 0.6, w: 0.5, h: 0.62, y: 1.3, n: 2.5 }, { z: -0.7, w: 0.42, h: 0.5, y: 1.32, n: 2.5 }, { z: -2.1, w: 0.3, h: 0.38, y: 1.36, n: 2.4 }, { z: -3.3, w: 0.17, h: 0.25, y: 1.43, n: 2.2 }, { z: -3.6, w: 0.07, h: 0.14, y: 1.46, n: 2 }];
  pgeo(gbP, loftPlane(rings, 26, (x, y, z, r) => { if (z > 2.2) return B; if (z < -2.4) return A; const top = y > r.y + r.h * 0.2; if (z > 0.3 && z < 2.2 && Math.abs(x) > r.w * 0.82) return B; return top ? A : [0.15, 0.15, 0.16]; }));
  const wing = { x0: 0.38, z0: 1.15, y0: 1.28, span: 3.85, rc: 1.55, tc: 0.95, sweep: 0.05, dih: 0.0, th: 0.062, top: A, bot: B };
  for (const s of [1, -1]) { const w = Object.assign({ side: s }, wing); pgeo(gbPD, wingGeo(w, 0, 0.98, 0, 0.72));
    const pv = [s * (0.38 + 3.85 * 0.5), 1.28, 1.15 - 0.05 * 0.5 - 0.72 * lerp(1.55, 0.95, 0.5)], ail = new THREE.Group(); ail.position.set(pv[0], pv[1], pv[2]);
    const ag = new GB(0, 0, false); pgeo(ag, wingGeo(w, 0.5, 0.98, 0.72, 1, pv)); ail.add(ag.mesh(PL.paintD, true, true)); root.add(ail); if (s > 0) P.aileL = ail; else P.aileR = ail;
    pgeo(gbPD, wingGeo(w, 0, 0.5, 0.72, 1)); pgeo(gbPD, wingGeo(Object.assign({}, w, { top: B, bot: B }), 0.97, 1, 0, 1));
    const st = { x0: 0.05, z0: -3.05, y0: 1.4, span: 1.55, rc: 0.9, tc: 0.55, sweep: 0.2, dih: 0, th: 0.06, top: A, bot: B, side: s };
    pgeo(gbPD, wingGeo(st, 0, 1, 0, 0.6)); const pv2 = [s * 0.05, 1.4, -3.05 - 0.6 * 0.9], el = new THREE.Group(); el.position.set(pv2[0], pv2[1], pv2[2]); const eg = new GB(0, 0, false); pgeo(eg, wingGeo(st, 0, 1, 0.6, 1, pv2)); el.add(eg.mesh(PL.paintD, true, true)); root.add(el); if (s > 0) P.elevL = el; else P.elevR = el; }
  { const fin = { x0: 0, z0: -2.85, y0: 1.5, span: 1.25, rc: 1.2, tc: 0.65, sweep: 0.55, dih: 0, th: 0.055, top: B, bot: B, side: 1, up: true };
    pgeo(gbPD, wingGeo(fin, 0, 1, 0, 0.58)); const pv = [0, 1.5, -2.85 - 0.58 * 1.2], rd = new THREE.Group(); rd.position.set(pv[0], pv[1], pv[2]); const rg = new GB(0, 0, false); pgeo(rg, wingGeo(fin, 0, 1, 0.58, 1, pv)); rd.add(rg.mesh(PL.paintD, true, true)); root.add(rd); P.rud = rd; }
  wheelAt(gbD, 1.0, 0.26, 0.15, 0.26, 0.15); wheelAt(gbD, -1.0, 0.26, 0.15, 0.26, 0.15); wheelAt(gbD, 0, 0.22, 2.0, 0.22, 0.13);
  for (const s of [1, -1]) { const [g, m] = cylBetween([s * 0.4, 0.9, 0.15], [s * 1.0, 0.3, 0.15], 0.05, 6); pgeo(gbD, g, m, new THREE.Color(0.55, 0.56, 0.58)); }
  { const [g, m] = cylBetween([0, 0.9, 2.0], [0, 0.26, 2.0], 0.04, 6); pgeo(gbD, g, m, new THREE.Color(0.55, 0.56, 0.58)); }
  pbox(gbD, 3.85 + 0.38 - 0.1, 1.27, 0.55, 4.3, 1.34, 0.65, 0.9, 0.05, 0.05); pbox(gbD, -4.3, 1.27, 0.55, -3.85 - 0.28, 1.34, 0.65, 0.05, 0.7, 0.1);
  /* bubble canopy */
  { const cg = new THREE.SphereGeometry(1, 18, 12, 0, TAU, 0, Math.PI / 2); cg.scale(0.46, 0.5, 1.15); cg.translate(0, 1.5, 0.4); cg.computeVertexNormals(); const gm = new THREE.Mesh(cg, PL.glass); gm.renderOrder = 2; root.add(gm);
    const [fa, fm] = cylBetween([-0.46, 1.5, 0.4], [0.46, 1.5, 0.4], 0.025, 6); pgeo(gbD, fa, fm, new THREE.Color(0.1, 0.1, 0.11)); }
  const prop = new THREE.Group(); prop.position.set(0, 1.1, 3.02); P.prop = prop;
  { const pg = new GB(0, 0, false); const sp = ni(new THREE.ConeGeometry(0.22, 0.46, 14)); pgeo(pg, sp, new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0.18), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1)), new THREE.Color(B[0], B[1], B[2]));
    pbox(pg, -0.08, 0.0, -0.03, 0.08, 1.05, 0.03, 0.05, 0.05, 0.06); pbox(pg, -0.08, -1.05, -0.03, 0.08, 0.0, 0.03, 0.05, 0.05, 0.06); const spin = new THREE.Group(); spin.add(pg.mesh(PL.dark, true, false)); prop.add(spin); P.spin = spin;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.05, 24), PL.disc.clone()); prop.add(disc); P.disc = disc; }
  root.add(prop);
  const ck = new THREE.Group(), gi = new GB(0, 0, false), I1 = [0.22, 0.22, 0.23];
  pbox(gi, -0.44, 0.72, -0.4, 0.44, 0.78, 1.4, ...I1); pbox(gi, -0.46, 0.76, -0.4, -0.4, 1.38, 1.4, ...I1); pbox(gi, 0.4, 0.76, -0.4, 0.46, 1.38, 1.4, ...I1); pbox(gi, -0.46, 0.76, -0.5, 0.46, 1.5, -0.4, ...I1);
  pbox(gi, -0.46, 1.1, 1.18, 0.46, 1.42, 1.5, 0.08, 0.08, 0.09); pbox(gi, -0.05, 0.95, 0.48, 0.05, 1.3, 0.55, 0.3, 0.3, 0.32);
  pbox(gi, -0.46, 1.38, 1.3, 0.46, 1.44, 1.52, 0.06, 0.06, 0.07);
  ck.add(gi.mesh(PL.inner, false, false)); { const pn = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.3), PL.panel); pn.position.set(0, 1.3, 1.17); pn.rotation.x = -0.3; pn.rotation.y = Math.PI; ck.add(pn); }
  const yoke = new THREE.Group(); yoke.position.set(0, 0.95, 0.5); { const yg = new GB(0, 0, false); pbox(yg, -0.02, 0, -0.02, 0.02, 0.55, 0.02, 0.06, 0.06, 0.07); pbox(yg, -0.04, 0.55, -0.04, 0.04, 0.65, 0.04, 0.04, 0.04, 0.04); yoke.add(yg.mesh(PL.dark, false, false)); } ck.add(yoke); P.yoke = yoke; P.stick = true;
  root.add(ck); P.cockpit = ck;
  finishPlane(root, [[gbP, PL.paint], [gbPD, PL.paintD], [gbD, PL.dark]]);
  return { root, parts: P, spec: PSPEC.vixen };
}

/* ================= TALON ================= */
function buildTalon(liv) {
  planeInit(); const root = new THREE.Group(), P = planeParts(), A = _plgc(liv.a), B = _plgc(liv.b), G2 = [0.3, 0.33, 0.37];
  const gbP = new GB(0, 0, false), gbPD = new GB(0, 0, false), gbD = new GB(0, 0, false);
  const rings = [{ z: 5.9, w: 0.05, h: 0.05, y: 1.5, n: 2 }, { z: 5.5, w: 0.26, h: 0.26, y: 1.52, n: 2.2 }, { z: 4.6, w: 0.46, h: 0.46, y: 1.6, n: 2.4 }, { z: 3.4, w: 0.58, h: 0.66, y: 1.72, n: 2.6 }, { z: 1.8, w: 0.68, h: 0.78, y: 1.82, n: 2.7 }, { z: -0.2, w: 0.72, h: 0.8, y: 1.82, n: 2.7 }, { z: -2.0, w: 0.66, h: 0.72, y: 1.76, n: 2.6 }, { z: -3.8, w: 0.54, h: 0.6, y: 1.7, n: 2.5 }, { z: -5.2, w: 0.42, h: 0.46, y: 1.68, n: 2.4 }, { z: -5.9, w: 0.4, h: 0.4, y: 1.67, n: 2.3 }];
  pgeo(gbP, loftPlane(rings, 28, (x, y, z, r) => { if (z > 4.9) return [0.12, 0.13, 0.15]; if (z < -4.9) return [0.18, 0.18, 0.19]; if (y < r.y - r.h * 0.3) return [G2[0] * 0.8, G2[1] * 0.8, G2[2] * 0.8]; return G2; }));
  for (const s of [1, -1]) { pbox(gbP, s * 0.7 - 0.12, 1.2, -0.7, s * 0.7 + 0.12, 2.0, 2.2, ...G2); pbox(gbD, s * 0.7 - 0.1, 1.3, 2.18, s * 0.7 + 0.1, 1.95, 2.24, 0.02, 0.02, 0.02); }
  const wing = { x0: 0.55, z0: 0.9, y0: 1.5, span: 4.35, rc: 3.1, tc: 1.2, sweep: 2.2, dih: 0.12, th: 0.06, top: G2, bot: [0.45, 0.48, 0.52] };
  for (const s of [1, -1]) { const w = Object.assign({ side: s }, wing); pgeo(gbPD, wingGeo(w, 0, 0.99, 0, 0.78));
    const pv = [s * (0.55 + 4.35 * 0.55), 1.5 + 0.12 * 0.55, 0.9 - 2.2 * 0.55 - 0.78 * lerp(3.1, 1.2, 0.55)], ail = new THREE.Group(); ail.position.set(pv[0], pv[1], pv[2]);
    const ag = new GB(0, 0, false); pgeo(ag, wingGeo(w, 0.55, 0.99, 0.78, 1, pv)); ail.add(ag.mesh(PL.paintD, true, true)); root.add(ail); if (s > 0) P.aileL = ail; else P.aileR = ail;
    pgeo(gbPD, wingGeo(w, 0, 0.55, 0.78, 1)); pgeo(gbPD, wingGeo(Object.assign({}, w, { top: A, bot: A }), 0.97, 1, 0, 1));
    const st = { x0: 0.4, z0: -4.2, y0: 1.62, span: 2.3, rc: 1.8, tc: 0.8, sweep: 1.2, dih: -0.15, th: 0.05, top: G2, bot: G2, side: s };
    const pv2 = [s * 0.4, 1.62, -4.2 - 0.45 * 1.8], el = new THREE.Group(); el.position.set(pv2[0], pv2[1], pv2[2]); const eg = new GB(0, 0, false); pgeo(eg, wingGeo(st, 0, 1, 0, 1, pv2)); el.add(eg.mesh(PL.paintD, true, true)); root.add(el); if (s > 0) P.elevL = el; else P.elevR = el; }
  { const fin = { x0: 0, z0: -3.4, y0: 1.8, span: 2.3, rc: 2.5, tc: 1.2, sweep: 1.5, dih: 0, th: 0.05, top: A, bot: A, side: 1, up: true };
    pgeo(gbPD, wingGeo(fin, 0, 1, 0, 0.66)); const pv = [0, 1.8, -3.4 - 0.66 * 2.5], rd = new THREE.Group(); rd.position.set(pv[0], pv[1], pv[2]); const rg = new GB(0, 0, false); pgeo(rg, wingGeo(fin, 0, 1, 0.66, 1, pv)); rd.add(rg.mesh(PL.paintD, true, true)); root.add(rd); P.rud = rd; }
  wheelAt(gbD, 1.3, 0.28, -0.5, 0.28, 0.18); wheelAt(gbD, -1.3, 0.28, -0.5, 0.28, 0.18); wheelAt(gbD, 0, 0.22, 3.4, 0.22, 0.14);
  for (const s of [1, -1]) { const [g, m] = cylBetween([s * 0.55, 1.2, -0.5], [s * 1.3, 0.3, -0.5], 0.06, 6); pgeo(gbD, g, m, new THREE.Color(0.55, 0.56, 0.58)); }
  { const [g, m] = cylBetween([0, 1.15, 3.4], [0, 0.22, 3.4], 0.05, 6); pgeo(gbD, g, m, new THREE.Color(0.55, 0.56, 0.58)); }
  pbox(gbD, 4.9 - 0.02, 1.58, 0.2, 5.0, 1.64, 0.3, 0.9, 0.05, 0.05); pbox(gbD, -5.0, 1.58, 0.2, -4.9, 1.64, 0.3, 0.05, 0.7, 0.1);
  { const nz = ni(new THREE.CylinderGeometry(0.4, 0.34, 0.5, 18, 1, true)); pgeo(gbD, nz, new THREE.Matrix4().compose(new THREE.Vector3(0, 1.67, -5.95), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1)), new THREE.Color(0.12, 0.11, 0.1)); }
  { const fg = new THREE.ConeGeometry(0.34, 1, 14, 1, true); fg.translate(0, 0.5, 0); fg.rotateX(-Math.PI / 2); const fl = new THREE.Mesh(fg, PL.flame); fl.material = PL.flame.clone(); fl.position.set(0, 1.67, -6.1); fl.scale.set(1, 1, 0.01); root.add(fl); P.flame = fl; }
  { const cg = new THREE.SphereGeometry(1, 20, 12, 0, TAU, 0, Math.PI / 2); cg.scale(0.5, 0.5, 1.9); cg.translate(0, 2.0, 2.2); cg.computeVertexNormals(); const gm = new THREE.Mesh(cg, PL.glass); gm.renderOrder = 2; root.add(gm);
    const [fa, fm] = cylBetween([-0.5, 2.02, 2.2], [0.5, 2.02, 2.2], 0.03, 6); pgeo(gbD, fa, fm, new THREE.Color(0.1, 0.1, 0.11)); const [fb, fm2] = cylBetween([-0.5, 2.02, 1.0], [0.5, 2.02, 1.0], 0.03, 6); pgeo(gbD, fb, fm2, new THREE.Color(0.1, 0.1, 0.11)); }
  const ck = new THREE.Group(), gi = new GB(0, 0, false), I1 = [0.2, 0.2, 0.21];
  pbox(gi, -0.5, 1.0, 0.4, 0.5, 1.06, 3.3, ...I1); pbox(gi, -0.54, 1.04, 0.4, -0.46, 1.9, 3.3, ...I1); pbox(gi, 0.46, 1.04, 0.4, 0.54, 1.9, 3.3, ...I1); pbox(gi, -0.54, 1.04, 0.3, 0.54, 1.98, 0.4, ...I1);
  pbox(gi, -0.5, 1.3, 3.2, 0.5, 1.7, 3.55, 0.07, 0.07, 0.08); pbox(gi, -0.5, 1.66, 2.95, 0.5, 1.72, 3.5, 0.05, 0.05, 0.06); pbox(gi, -0.45, 1.3, 1.1, -0.25, 1.9, 1.3, ...I1);
  ck.add(gi.mesh(PL.inner, false, false)); { const pn = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), PL.panel); pn.position.set(0, 1.5, 3.0); pn.rotation.x = -0.3; pn.rotation.y = Math.PI; ck.add(pn); }
  const yoke = new THREE.Group(); yoke.position.set(0, 1.1, 2.6); { const yg = new GB(0, 0, false); pbox(yg, -0.02, 0, -0.02, 0.02, 0.6, 0.02, 0.06, 0.06, 0.07); pbox(yg, -0.05, 0.6, -0.04, 0.05, 0.7, 0.04, 0.04, 0.04, 0.04); yoke.add(yg.mesh(PL.dark, false, false)); } ck.add(yoke); P.yoke = yoke; P.stick = true;
  root.add(ck); P.cockpit = ck;
  /* single nose cannon: one barrel out of the radome with a muzzle brake, and a flash that shows while it fires */
  { const GM = new THREE.Color(0.17, 0.17, 0.19), [bg, bm] = cylBetween([0, 1.42, 5.3], [0, 1.42, 7.05], 0.075, 8); pgeo(gbD, bg, bm, GM);
    const [mg, mm] = cylBetween([0, 1.42, 6.85], [0, 1.42, 7.12], 0.125, 8); pgeo(gbD, mg, mm, new THREE.Color(0.1, 0.1, 0.11));
    const [sg, sm] = cylBetween([0, 1.42, 5.35], [0, 1.42, 5.95], 0.15, 8); pgeo(gbD, sg, sm, GM);
    const fl = new THREE.Group(); fl.position.set(0, 1.42, 7.2); fl.visible = false;
    const fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.5, 0.5), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    for (const a of [0, Math.PI / 2]) { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), fm); q.rotation.z = a + Math.PI / 4; fl.add(q); }
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9, 8, 1, true), fm); cone.rotation.x = Math.PI / 2; cone.position.z = 0.4; fl.add(cone);
    root.add(fl); P.muzzle = fl; }
  /* airbrakes on the nose: two hinged side panels and one under the chin, flush when stowed and swung open by the brake key */
  const mkBrake = (x0, x1, y0, y1, z0, z1, px, py, pz) => { const g = new THREE.Group(); g.position.set(px, py, pz); const b = new GB(0, 0, false); pbox(b, x0, y0, z0, x1, y1, z1, A[0], A[1], A[2]); g.add(b.mesh(PL.paintD, true, true)); root.add(g); return g; };
  P.brakeL = mkBrake(0, 0.045, -0.2, 0.2, -0.95, 0, 0.53, 1.64, 4.5); P.brakeR = mkBrake(-0.045, 0, -0.2, 0.2, -0.95, 0, -0.53, 1.64, 4.5); P.brakeV = mkBrake(-0.2, 0.2, -0.045, 0, -0.9, 0, 0, 1.14, 4.4);
  finishPlane(root, [[gbP, PL.paint], [gbPD, PL.paintD], [gbD, PL.dark]]);
  return { root, parts: P, spec: PSPEC.talon };
}

/* ================= AIRLINER (static scenery) ================= */
function buildAirliner() {
  planeInit(); const root = new THREE.Group(), W = [0.9, 0.9, 0.9], BL = _plgc(0x1c4f9a), RED = _plgc(0xd94a2b);
  const gbP = new GB(0, 0, false), gbPD = new GB(0, 0, false), gbD = new GB(0, 0, false);
  const rings = [{ z: 18, w: 0.3, h: 0.3, y: 3.1, n: 2 }, { z: 17.2, w: 1.0, h: 1.1, y: 3.2, n: 2.2 }, { z: 15.5, w: 1.6, h: 1.8, y: 3.4, n: 2.1 }, { z: 12, w: 1.9, h: 2.05, y: 3.5, n: 2.05 }, { z: -8, w: 1.9, h: 2.05, y: 3.5, n: 2.05 }, { z: -14, w: 1.5, h: 1.7, y: 3.8, n: 2.1 }, { z: -17.2, w: 0.7, h: 0.9, y: 4.3, n: 2.2 }, { z: -18.2, w: 0.2, h: 0.4, y: 4.6, n: 2 }];
  pgeo(gbP, loftPlane(rings, 30, (x, y, z, r) => { if (y < r.y - r.h * 0.45) return [0.55, 0.57, 0.6]; if (Math.abs(y - (r.y + r.h * 0.05)) < r.h * 0.1 && z < 14 && z > -12) return BL; return W; }));
  const wing = { x0: 1.5, z0: 3, y0: 2.4, span: 15, rc: 6.5, tc: 1.7, sweep: 7, dih: 0.9, th: 0.07, top: W, bot: [0.7, 0.72, 0.75] };
  for (const s of [1, -1]) { pgeo(gbPD, wingGeo(Object.assign({ side: s }, wing), 0, 1, 0, 1));
    const st = { x0: 0.5, z0: -14.2, y0: 4.0, span: 5.6, rc: 3.4, tc: 1.3, sweep: 2.8, dih: 0.5, th: 0.06, top: W, bot: W, side: s }; pgeo(gbPD, wingGeo(st, 0, 1, 0, 1));
    const ex = s * 5.4, ey = 1.45, ez = 1.5; const eg = ni(new THREE.CylinderGeometry(1.15, 1.0, 4, 18)); pgeo(gbD, eg, new THREE.Matrix4().compose(new THREE.Vector3(ex, ey, ez + 1.5), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1)), new THREE.Color(0.7, 0.72, 0.75));
    const ec = ni(new THREE.CylinderGeometry(0.8, 0.8, 0.2, 14)); pgeo(gbD, ec, new THREE.Matrix4().compose(new THREE.Vector3(ex, ey, ez + 3.6), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1)), new THREE.Color(0.05, 0.05, 0.06));
    const [g, m] = cylBetween([s * 5.4, 2.4, 2], [s * 5.4, 1.9, 2], 0.2, 6); pgeo(gbD, g, m, new THREE.Color(0.7, 0.72, 0.75)); }
  { const fin = { x0: 0, z0: -11.2, y0: 5.4, span: 7.4, rc: 6.5, tc: 2.6, sweep: 4.4, dih: 0, th: 0.07, top: RED, bot: RED, side: 1, up: true }; pgeo(gbPD, wingGeo(fin, 0, 1, 0, 1)); }
  for (const z of [11.5, -1.5]) for (const x of z > 5 ? [0] : [-1.9, 1.9]) { wheelAt(gbD, x, 0.55, z, 0.55, 0.4); const [g, m] = cylBetween([x, 1.8, z], [x, 0.6, z], 0.1, 6); pgeo(gbD, g, m, new THREE.Color(0.6, 0.6, 0.62)); }
  for (let z = 14; z > -12; z -= 1.15) for (const s of [1, -1]) pbox(gbD, s * 1.88 - 0.02, 3.65, z, s * 1.9 + 0.04, 3.95, z + 0.5, 0.05, 0.08, 0.12);
  for (const s of [1, -1]) pbox(gbD, s * 0.9 - 0.45, 3.65, 15.5, s * 0.9 + 0.45, 3.9, 16.4, 0.05, 0.08, 0.12);
  finishPlane(root, [[gbP, PL.paint], [gbPD, PL.paintD], [gbD, PL.dark]]);
  return { root, spec: { name: 'Airliner', len: 36, span: 33 } };
}

const Planes = {
  liv: { sparrow: [{ a: 0xcf3a30, b: 0xf4f4f2 }, { a: 0x2a66c9, b: 0xf4f4f2 }], vixen: [{ a: 0xf2c21a, b: 0x16181c }], talon: [{ a: 0xc23a2c, b: 0x8a919b }] },
  /* builders by id (06_plane2.js adds the rest of the fleet) */
  build: { sparrow: (L) => buildSparrow(L), vixen: (L) => buildVixen(L), talon: (L) => buildTalon(L) },
  create(id, hue) {
    const L = this.liv[id][hue || 0] || this.liv[id][0]; const o = this.build[id](L);
    const holder = new THREE.Group(), cgY = o.spec.cgY; o.root.position.y = -cgY; holder.add(o.root);
    o.root.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
    return { holder, model: o.root, parts: o.parts, spec: o.spec, id, hue: hue || 0 };
  },
  /* animate control surfaces from the pilot's inputs */
  pose(P, st, dt) {
    const p = P.parts; if (!p) return;
    if (p.spin) { p.spin.rotation.z += dt * (st.rpm > 0.03 ? 6 + 120 * st.rpm : 0); p.disc.material.opacity = clamp(st.rpm * 0.7 - 0.12, 0, 0.4); }
    if (p.spin2) { p.spin2.rotation.z = -p.spin.rotation.z; p.disc2.material.opacity = p.disc.material.opacity; }
    if (p.hspin) { p.hspin.rotation.y -= dt * (st.rpm > 0.12 ? 3 + 30 * st.rpm : 0); if (p.hdisc) p.hdisc.material.opacity = clamp(st.rpm * 0.5 - 0.1, 0, 0.3); }
    if (p.tspin) p.tspin.rotation.x += dt * (st.rpm > 0.12 ? 8 + 60 * st.rpm : 0);
    if (p.aileL) { p.aileL.rotation.x = clamp(-st.roll * 0.45, -0.5, 0.5); p.aileR.rotation.x = clamp(st.roll * 0.45, -0.5, 0.5); }
    if (p.elevL) { const e = clamp(st.pitch * 0.4, -0.45, 0.45); p.elevL.rotation.x = -e; p.elevR.rotation.x = -e; }
    if (p.rud) p.rud.rotation.y = clamp(st.yaw * 0.4, -0.45, 0.45);
    if (p.brakeL) { const b = st.brake || 0; p.brakeL.rotation.y = -b * 1.1; p.brakeR.rotation.y = b * 1.1; p.brakeV.rotation.x = -b * 0.95; }
    if (p.spoilL) { const b = st.brake || 0; p.spoilL.rotation.x = b * 0.7; p.spoilR.rotation.x = b * 0.7; }
    if (p.muzzle) { const on = P.fireT > 0; p.muzzle.visible = on; if (on) { p.muzzle.scale.setScalar(0.7 + Math.random() * 0.7); p.muzzle.rotation.z = Math.random() * 3; P.fireT -= dt; } }
    if (p.flame) { const f = st.ab > 0.02 ? 0.3 + st.ab * 3.2 : st.rpm * 0.7; p.flame.scale.z = Math.max(0.01, f * (0.9 + 0.2 * Math.random())); p.flame.material.opacity = clamp(st.rpm * 0.4 + st.ab * 0.7, 0, 0.9) * (st.rpm > 0.05 ? 1 : 0); }
    if (p.yoke) { if (p.stick) { p.yoke.rotation.z = -st.roll * 0.35; p.yoke.rotation.x = -st.pitch * 0.3; } else { p.yoke.rotation.z = -st.roll * 0.9; p.yoke.position.z = (P.yz0 == null ? (P.yz0 = p.yoke.position.z) : P.yz0) - st.pitch * 0.07; } }
  }
};
