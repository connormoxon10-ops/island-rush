/* ================= WORKSHOP MODELS: three.js meshes for every part, built from the same descriptors the physics uses =================
   Part-local axes match the physics: +Z forward, +Y up, +X to port. A craft group is built in craft axes (origin = the root part's origin) so the
   simulator's attitude quaternion can be applied to it directly. Moving bits (control surfaces, gear, spinning props, flames, chutes) are kept in
   userData so the flight code can animate them each frame. */
const WKG = { pal: [0xf1f3f6, 0xd8352f, 0xf08a24, 0xf2cd3a, 0x3f9d52, 0x2f6fd6, 0x8d98a6, 0x1b1f26], cache: {} };
const WKG_NAMES = ['White', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Steel', 'Black'];
WKG.mat = function (key, mk) { return WKG.cache[key] || (WKG.cache[key] = mk()); };
WKG.std = function (hex, rough, metal, extra) { return new THREE.MeshStandardMaterial(Object.assign({ color: lc(hex), roughness: rough == null ? 0.55 : rough, metalness: metal == null ? 0.1 : metal }, extra || {})); };
WKG.paint = function (i) { return WKG.mat('p' + i, () => WKG.std(WKG.pal[i | 0] != null ? WKG.pal[i | 0] : WKG.pal[0], 0.42, 0.12)); };
WKG.dark = () => WKG.mat('dark', () => WKG.std(0x242932, 0.6, 0.45));
WKG.steel = () => WKG.mat('steel', () => WKG.std(0x9aa3ad, 0.38, 0.7));
WKG.glass = () => WKG.mat('glass', () => WKG.std(0x182a3c, 0.12, 0.6, { transparent: true, opacity: 0.88 }));
WKG.tyre = () => WKG.mat('tyre', () => WKG.std(0x121316, 0.9, 0));
WKG.shield = () => WKG.mat('shield', () => WKG.std(0x3a2d24, 0.85, 0.1));
WKG.flameMat = (hot) => WKG.mat('flame' + hot, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(hot ? 1.0 : 0.55, hot ? 0.85 : 0.65, hot ? 0.55 : 1.0).multiplyScalar(1.7), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
WKG.fuelCol = { none: 0xf1f3f6, jet: 0xe9e1c9, rocket: 0xf1f3f6, hydro: 0xf0d9b8 };

/* surface of revolution about +Z. rings: [[z, r], ...] from the front (high z) to the back */
WKG.rev = function (rings, N, capB, capF) {
  N = N || 28; const pos = [], idx = [], nr = rings.length;
  for (let i = 0; i < nr; i++) for (let j = 0; j <= N; j++) { const a = j / N * TAU; pos.push(Math.cos(a) * rings[i][1], Math.sin(a) * rings[i][1], rings[i][0]); }
  for (let i = 0; i < nr - 1; i++) for (let j = 0; j < N; j++) { const a = i * (N + 1) + j, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const cap = (ring, r0, flip) => { const z = rings[ring][0], rr = rings[ring][1]; if (rr < 0.01) return; const c0 = pos.length / 3; pos.push(0, 0, z); for (let j = 0; j <= N; j++) { const a = j / N * TAU; pos.push(Math.cos(a) * rr, Math.sin(a) * rr, z); } for (let j = 0; j < N; j++) idx.push(c0, c0 + 1 + j + (flip ? 1 : 0), c0 + 1 + j + (flip ? 0 : 1)); };
  if (capB) cap(nr - 1, 0, true); if (capF) cap(0, 0, false);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
};
WKG.frustum = function (r1, r2, L, N) { return WKG.rev([[L / 2, r1], [-L / 2, r2]], N, true, true); };
/* ogive / cone profile for nose cones */
WKG.noseRings = function (r, L, shp) {
  const rings = [], n = 10; for (let i = 0; i <= n; i++) { const t = i / n, z = L / 2 - t * L; let rr; if (shp) { const rho = (r * r + L * L) / (2 * r); rr = Math.sqrt(Math.max(0, rho * rho - Math.pow(L * (1 - t), 2))) - (rho - r); } else rr = r * t; rings.push([z, Math.max(rr, r * 0.04 * (1 - t) + 0.001)]); }
  return rings;
};
WKG.box = function (x, y, z) { return new THREE.BoxGeometry(x, y, z); };
WKG.merge = function (parts) {   /* [{g, m:[matrix]}] -> one BufferGeometry (positions + normals only) */
  const pos = [], nor = [], idx = []; let off = 0;
  for (const p of parts) { const g = p.g.index ? p.g : p.g; const m = p.m; if (m) g.applyMatrix4(m); const pa = g.attributes.position, na = g.attributes.normal; for (let i = 0; i < pa.count; i++) { pos.push(pa.getX(i), pa.getY(i), pa.getZ(i)); nor.push(na.getX(i), na.getY(i), na.getZ(i)); }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off); else for (let i = 0; i < pa.count; i++) idx.push(i + off); off += pa.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g;
};

/* wing panel: lens-section planform in the wing's own frame; optional hinge-line flap overlay */
WKG.wingGeo = function (d, s0, s1, f0, f1, lift) {
  const w = d.wing, b = w.b, N = 6, M = 8, sA = w.sA, nA = w.nA, fA = w.fA, pos = [], idx = [];
  const prof = (f) => (f < 0.3 ? Math.sin(Math.max(0, f / 0.3) * Math.PI / 2) * 0.92 + 0.08 * f / 0.3 : 1 - 0.95 * Math.pow((f - 0.3) / 0.7, 1.6)) * 0.5;
  const P = (s, f, side) => { const c = w.cr + (w.ct - w.cr) * s, le = w.cr / 2 - s * b * w.tanL, x = s * b, z = le - f * c, y = side * prof(f) * c * w.tc * (1 - 0.25 * s) + (side > 0 ? lift : -lift); return [sA[0] * x + nA[0] * y + fA[0] * z, sA[1] * x + nA[1] * y + fA[1] * z, sA[2] * x + nA[2] * y + fA[2] * z]; };
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= N; i++) for (let j = 0; j <= M; j++) { const p = P(s0 + (s1 - s0) * i / N, f0 + (f1 - f0) * j / M, side); pos.push(p[0], p[1], p[2]); }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = base + i * (M + 1) + j, bb = a + 1, c = a + M + 1, dd = c + 1; if (side > 0) idx.push(a, bb, c, bb, dd, c); else idx.push(a, c, bb, bb, c, dd); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
};

/* ---------- the parts ---------- */
WKG.build = function (cp, opt) {
  opt = opt || {}; const d = cp.d, P = cp.P.par || {}, col = WK.P[cp.t].par.col != null ? (P.col != null ? P.col : WK.P[cp.t].par.col) : 0, grp = new THREE.Group(), U = grp.userData = { id: cp.id, cp, moving: {} };
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); if (x != null) m.position.set(x, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; m.userData.pid = cp.id; grp.add(m); return m; };
  const paint = WKG.paint(col);
  switch (cp.t) {
    case 'cockpit': {
      const B = d.body, s = P.sz || 1; add(WKG.frustum(B.r1, B.r2, B.L), paint);
      const can = add(new THREE.SphereGeometry(1, 20, 12), WKG.glass(), 0, B.r2 * 0.52, 0.18 * s); can.scale.set(0.46 * s, 0.4 * s, 0.82 * s);
      add(WKG.rev([[0.12, 0.0], [0.06, 0.1], [-0.02, 0.13]], 12, false, false), WKG.dark(), 0, 0, B.L / 2); break;
    }
    case 'capsule': {
      const B = d.body; add(WKG.frustum(B.r1, B.r2, B.L), paint); add(WKG.rev([[-B.L / 2, B.r2 * 1.0], [-B.L / 2 - 0.1, B.r2 * 0.94], [-B.L / 2 - 0.16, B.r2 * 0.7]], 30, true, false), WKG.shield());
      const wn = add(new THREE.SphereGeometry(1, 14, 8), WKG.glass(), 0, B.r2 * 0.3, 0.2); wn.scale.set(0.24, 0.12, 0.2); break;
    }
    case 'body': {
      const B = d.body, fm = WKG.fuelCol[P.fuel || 'none']; add(WKG.frustum(B.r1, B.r2, B.L), WKG.mat('tk' + col + P.fuel, () => WKG.std(P.fuel && P.fuel !== 'none' && col === 0 ? fm : WKG.pal[col | 0], 0.45, 0.12)));
      if (B.L > 1.2) for (const t of [0.28, 0.72]) { const z = B.L / 2 - t * B.L, r = B.r2 + (B.r1 - B.r2) * (z + B.L / 2) / B.L; add(WKG.rev([[0.02, r * 1.008], [-0.02, r * 1.008]], 28, false, false), WKG.dark(), 0, 0, z); } break;
    }
    case 'nose': { const B = d.body; add(WKG.rev(WKG.noseRings(P.r, P.len, P.shp), 28, true, false), paint); break; }
    case 'wing': {
      const w = d.wing, hasCs = w.cs > 0, s0 = hasCs ? 1 - w.csp : 1, f1 = hasCs ? 1 - w.cs : 1;
      if (hasCs) {
        add(WKG.wingGeo(d, 0, 1 - w.csp, 0, 1, 0), paint); add(WKG.wingGeo(d, 1 - w.csp, 1, 0, 1 - w.cs, 0), paint);
        const hin = new THREE.Group(), c = w.cr + (w.ct - w.cr) * (1 - w.csp / 2), le = w.cr / 2 - (1 - w.csp / 2) * w.b * w.tanL, xm = (1 - w.csp / 2) * w.b, zh = le - (1 - w.cs) * c;
        hin.position.set(w.sA[0] * xm + w.fA[0] * zh, w.sA[1] * xm + w.fA[1] * zh, w.sA[2] * xm + w.fA[2] * zh);
        const fg = WKG.wingGeo(d, 1 - w.csp, 1, 1 - w.cs, 1, 0); fg.translate(-hin.position.x, -hin.position.y, -hin.position.z); const fm = new THREE.Mesh(fg, WKG.mat('flap' + col, () => WKG.std(WKG.pal[col | 0], 0.42, 0.12))); fm.castShadow = true; fm.userData.pid = cp.id; hin.add(fm); grp.add(hin);
        U.moving.flap = hin; U.moving.axis = new THREE.Vector3(w.sA[0], w.sA[1], w.sA[2]);
      } else add(WKG.wingGeo(d, 0, 1, 0, 1, 0), paint);
      break;
    }
    case 'jet': {
      const E = d.eng, B = d.body, r = E.r, tf = E.jt === 'tf';
      add(WKG.rev([[B.L / 2, r * 0.98], [B.L / 2 - 0.12, r * 1.04], [B.L * 0.1, r * 1.0], [-B.L / 2 + 0.5, r * 0.84], [-B.L / 2, r * 0.74]], 28, false, false), tf ? WKG.mat('tf', () => WKG.std(0xcfd5dc, 0.35, 0.6)) : WKG.steel());
      add(WKG.rev([[B.L / 2 + 0.001, r * 0.9], [B.L / 2 - 0.05, 0.05]], 28, false, true), WKG.dark()); add(WKG.rev([[-B.L / 2, r * 0.74], [-B.L / 2 - 0.35 * r, r * 0.62]], 24, false, false), WKG.dark(), 0, 0, 0);
      const fl = add(WKG.rev([[0, r * 0.58], [-r * 3.4, 0.01]], 16, false, false), WKG.flameMat(1), 0, 0, -B.L / 2 - 0.3 * r); fl.visible = false; fl.castShadow = false; U.moving.flame = fl; U.moving.flameR = r; break;
    }
    case 'prop': {
      const E = d.eng, B = d.body, r = E.r; add(WKG.frustum(B.r1, B.r2, B.L), WKG.dark()); add(WKG.rev([[B.L / 2 + 0.28, 0.0], [B.L / 2 + 0.1, B.r1 * 0.75], [B.L / 2, B.r1 * 0.95]], 20, false, false), WKG.steel());
      const hub = new THREE.Group(); hub.position.z = B.L / 2 + 0.06; const D = E.D; for (let k = 0; k < 3; k++) { const bl = new THREE.Mesh(WKG.box(0.07 * D * 0.5, D * 0.5, 0.012), WKG.dark()); bl.position.y = D * 0.25; const pv = new THREE.Group(); pv.rotation.z = k * TAU / 3; bl.rotation.z = 0; pv.add(bl); hub.add(pv); }
      const disc = new THREE.Mesh(new THREE.CircleGeometry(D / 2, 32), new THREE.MeshBasicMaterial({ color: 0xdfe6ee, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide })); disc.position.z = 0.0; hub.add(disc); grp.add(hub); U.moving.prop = hub; U.moving.disc = disc; break;
    }
    case 'rocket': {
      const E = d.eng, B = d.body, r = E.r, L = B.L;
      add(WKG.rev([[L / 2, r * 0.45], [L * 0.28, r * 0.5], [-L * 0.1, r * 0.34], [-L / 2 + 0.1, r * 0.64], [-L / 2, r * 1.0]], 28, false, false), WKG.mat('bell', () => WKG.std(0x4a4f57, 0.4, 0.75)), 0, 0, 0);
      add(WKG.rev([[L / 2, r * 0.46], [L / 2 - 0.02, r * 0.46]], 20, true, true), WKG.dark());
      const fl = add(WKG.rev([[0, r * 0.9], [-r * 5.5, 0.01]], 16, false, false), WKG.flameMat(E.fuel === 'hydro' ? 0 : 1), 0, 0, -L / 2); fl.visible = false; fl.castShadow = false; U.moving.flame = fl; U.moving.flameR = r; break;
    }
    case 'solid': {
      const B = d.body, r = P.r, L = P.len; add(WKG.rev([[L / 2, r * 0.0], [L / 2 - r * 0.3, r * 0.82], [L / 2 - r * 0.8, r], [-L / 2, r * 0.97]], 24, true, false), paint);
      add(WKG.rev([[-L / 2, r * 0.38], [-L / 2 - r * 0.6, r * 0.55]], 20, false, false), WKG.dark());
      const fl = add(WKG.rev([[0, r * 0.5], [-r * 7, 0.01]], 16, false, false), WKG.flameMat(1), 0, 0, -L / 2 - r * 0.5); fl.visible = false; fl.castShadow = false; U.moving.flame = fl; U.moving.flameR = r; break;
    }
    case 'gear': {
      const G = d.gear, Ls = G.Ls, rw = G.rw, strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035 + 0.05 * rw, 0.05 + 0.05 * rw, 1, 8), WKG.steel()); strut.geometry.rotateZ(Math.PI / 2); strut.geometry.translate(0.5, 0, 0); strut.scale.x = Ls; strut.castShadow = true; strut.userData.pid = cp.id;
      const st = new THREE.Group(); st.add(strut); grp.add(st); U.moving.strut = strut; U.moving.steer = st;
      if (G.leg) { const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.06, 14), WKG.steel()); foot.geometry.rotateZ(Math.PI / 2); foot.position.x = Ls; foot.castShadow = true; foot.userData.pid = cp.id; st.add(foot); U.moving.wheel = foot; }
      else {
        const wh = new THREE.Group(), tyre = new THREE.Mesh(new THREE.CylinderGeometry(rw, rw, rw * 0.62, 18), WKG.tyre()); tyre.rotation.z = 0; tyre.castShadow = true; tyre.userData.pid = cp.id; const hub = new THREE.Mesh(new THREE.CylinderGeometry(rw * 0.55, rw * 0.55, rw * 0.66, 12), WKG.steel()); hub.userData.pid = cp.id; wh.add(tyre, hub); wh.position.x = Ls + rw * 0.0; st.add(wh); U.moving.wheel = wh;
      }
      break;
    }
    case 'decoupler': { const B = d.body; add(WKG.frustum(B.r1 * 1.04, B.r2 * 1.04, B.L), WKG.mat('dec', () => WKG.std(0x2b2f36, 0.5, 0.4))); add(WKG.rev([[0.03, B.r1 * 1.06], [-0.03, B.r1 * 1.06]], 28, false, false), new THREE.MeshStandardMaterial({ color: lc(0xffb02e), roughness: 0.5 })); break; }
    case 'chute': { const B = d.body; add(WKG.frustum(B.r1, B.r2, B.L), WKG.mat('chp', () => WKG.std(0xd8c9a0, 0.8, 0))); break; }
    case 'rwheel': { const B = d.body; add(WKG.frustum(B.r1, B.r2, B.L), WKG.mat('rw', () => WKG.std(0x5b6573, 0.4, 0.7))); add(WKG.box(0.1, 0.1, 0.1), WKG.dark(), 0, B.r1, 0); break; }
    default: add(WKG.box(0.5, 0.5, 0.5), paint);
  }
  return grp;
};

/* the whole craft: one group per part, placed by its layout transform. Returns {root, parts:{id:group}, set(selId), dispose()} */
WKG.craft = function (C, opt) {
  opt = opt || {}; const root = new THREE.Group(), parts = {};
  for (const cp of C.parts) {
    if (cp.alive === false) continue; const g = WKG.build(cp, opt), T = cp.T; g.position.set(T.p[0], T.p[1], T.p[2]); g.quaternion.set(T.q[0], T.q[1], T.q[2], T.q[3]); g.scale.set(T.sx, 1, 1);
    root.add(g); parts[cp.id] = g;
  }
  return { root, parts, C };
};
WKG.highlight = function (cr, ids, hex, k) {
  const on = new Set(ids || []);
  for (const id in cr.parts) { const sel = on.has(+id); cr.parts[id].traverse((o) => { if (!o.isMesh || !o.material || o.material.isMeshBasicMaterial) return; if (sel) { if (!o.userData.hl) { o.userData.hl = o.material; o.material = o.material.clone(); } o.material.emissive = new THREE.Color(hex || 0xffb02e).convertSRGBToLinear(); o.material.emissiveIntensity = k == null ? 0.55 : k; } else if (o.userData.hl) { o.material.dispose(); o.material = o.userData.hl; o.userData.hl = null; } }); }
};
WKG.dispose = function (cr) { if (!cr) return; cr.root.traverse((o) => { if (o.isMesh) { if (o.geometry) o.geometry.dispose(); if (o.userData.hl && o.material) o.material.dispose(); } }); if (cr.root.parent) cr.root.parent.remove(cr.root); };
