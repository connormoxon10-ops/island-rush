/* ================= FLEET EXTRAS =================
   Wren (open-cockpit biplane), Gull (business jet) and Meridian (regional airliner). They share the builders in 06_plane.js and
   register themselves in Planes.build / Planes.liv, so Planes.create, boarding and the flight model treat them like any other plane. */
Object.assign(PSPEC, {
  wren: { id: 'wren', name: 'Wren', role: 'Biplane', blurb: 'Open cockpit and a lot of wing. Draggy, twitchy and a joy to loop.', cost: 900, cgY: 1.22, eye: [0, 2.0, -0.7], chase: [8.4, 2.4], far: [17, 5.6], gear: { nz: 2.1, mz: 0.35, mx: 0.95 }, len: 6.6, span: 8.4, prop: true, jet: false,
    Vs: 20, Vr: 25, Vmax: 64, Vprop: 84, thrust: 4.4, drag: 1.1, pr: 1.5, rr: 3.2, yr: 0.8, stab: 1.4, aStall: 0.36, gmax: 6, crash: 6.4, mass: 0.85, rollT: 0.2, idle: 0.09, payK: 1 },
  gull: { id: 'gull', name: 'Gull', role: 'Business jet', blurb: 'Smooth and quick. Steady at speed, long on the runway.', cost: 9000, cgY: 1.9, eye: [0.35, 2.4, 5.0], chase: [15.5, 3.9], far: [32, 9.5], gear: { nz: 5.3, mz: -0.3, mx: 1.35 }, len: 17, span: 15.6, prop: false, jet: true, noAB: true,
    Vs: 34, Vr: 44, Vmax: 150, Vprop: 190, thrust: 5.0, drag: 0.6, pr: 0.8, rr: 1.7, yr: 0.4, stab: 1.1, aStall: 0.3, gmax: 5.5, crash: 7.2, mass: 2.2, rollT: 0.3, idle: 0.12, tailY: 0.9, payK: 1.5 },
  meridian: { id: 'meridian', name: 'Meridian', role: 'Airliner', blurb: 'Heavy, calm and a handful on the ground. Plan your descent.', cost: 16000, cgY: 2.9, eye: [0.55, 3.8, 11.0], chase: [27, 6.8], far: [54, 15], gear: { nz: 10.2, mz: -1.2, mx: 2.7 }, len: 30, span: 29.4, prop: false, jet: true, noAB: true,
    Vs: 36, Vr: 46, Vmax: 135, Vprop: 175, thrust: 3.4, drag: 0.9, pr: 0.45, rr: 0.75, yr: 0.25, stab: 1.6, aStall: 0.28, gmax: 3, crash: 7.6, mass: 5, rollT: 0.8, idle: 0.12, tailY: 1.5, payK: 2.2 }
});

/* a point on the lofted body (rings run nose to tail, angle 0 = right, pi/2 = top), pushed out by k so glass sits just proud of the skin */
function hullPt(rings, z, a, k) {
  let i = 0; while (i < rings.length - 2 && rings[i + 1].z > z) i++;
  const r0 = rings[i], r1 = rings[i + 1], t = clamp((r0.z - z) / (r0.z - r1.z), 0, 1), w = lerp(r0.w, r1.w, t), h = lerp(r0.h, r1.h, t), y = lerp(r0.y, r1.y, t), e = 2 / lerp(r0.n || 2.5, r1.n || 2.5, t), ca = Math.cos(a), sa = Math.sin(a);
  return [k * w * Math.sign(ca) * Math.pow(Math.abs(ca), e), y + k * h * Math.sign(sa) * Math.pow(Math.abs(sa), e), z];
}
function glassBand(glass, rings, z0, z1, a0, a1, nz, na, k) {
  for (let i = 0; i < nz; i++) for (let j = 0; j < na; j++) {
    const za = lerp(z0, z1, i / nz), zb = lerp(z0, z1, (i + 1) / nz), aa = lerp(a0, a1, j / na), ab = lerp(a0, a1, (j + 1) / na);
    glassQuad(glass, hullPt(rings, za, aa, k), hullPt(rings, za, ab, k), hullPt(rings, zb, ab, k), hullPt(rings, zb, aa, k));
  }
}
/* hinge point on a wingGeo wing at span fraction tm and chord fraction c (from the leading edge) */
function wpv(w, tm, c) { const s = w.side || 1; return [w.up ? 0 : s * (w.x0 + w.span * tm), w.up ? w.y0 : w.y0 + w.dih * tm, w.z0 - w.sweep * tm - c * lerp(w.rc, w.tc, tm)]; }
/* the rear part of a wing between span fractions t0..t1 and chord c0..1, on its own pivot so it can swing */
function ctlSurf(root, w, t0, t1, c0) {
  const pv = wpv(w, (t0 + t1) / 2, c0), g = new THREE.Group(); g.position.set(pv[0], pv[1], pv[2]);
  const b = new GB(0, 0, false); pgeo(b, wingGeo(w, t0, t1, c0, 1, pv)); g.add(b.mesh(PL.paintD, true, true)); root.add(g); return g;
}
/* a wing with a control surface cut into the trailing edge; returns the surface's pivot group */
function wingWithCtl(root, gb, w, t0, t1, c0) {
  if (t0 > 0) pgeo(gb, wingGeo(w, 0, t0, 0, 1)); pgeo(gb, wingGeo(w, t0, t1, 0, c0)); if (t1 < 1) pgeo(gb, wingGeo(w, t1, 1, 0, 1));
  return ctlSurf(root, w, t0, t1, c0);
}
/* simple flight deck: floor, side walls, back wall, dash with the shared instrument texture, and a yoke (or stick) that Planes.pose moves */
function mkCockpit(P, root, o) {
  const ck = new THREE.Group(), gi = new GB(0, 0, false), I1 = [0.22, 0.22, 0.23], I2 = [0.46, 0.43, 0.38], hw = o.hw;
  pbox(gi, -hw, o.fy, o.zb, hw, o.fy + 0.05, o.zf, ...I1);
  pbox(gi, -hw - 0.05, o.fy, o.zb, -hw, o.sy, o.zf, ...I1); pbox(gi, hw, o.fy, o.zb, hw + 0.05, o.sy, o.zf, ...I1);
  pbox(gi, -hw, o.fy, o.zb - 0.05, hw, o.sy + (o.bk || 0.3), o.zb, ...I2);
  pbox(gi, -hw - 0.05, o.dy - 0.45, o.zf - 0.45, hw + 0.05, o.dy, o.zf, 0.08, 0.08, 0.09); pbox(gi, -hw - 0.05, o.dy, o.zf - 0.55, hw + 0.05, o.dy + 0.05, o.zf, 0.05, 0.05, 0.06);
  if (o.seat) pbox(gi, o.ex - 0.26, o.fy + 0.05, o.zb + 0.15, o.ex + 0.26, o.fy + 0.4, o.zb + 0.65, 0.3, 0.12, 0.1);
  ck.add(gi.mesh(PL.inner, false, false));
  const pw = o.pw, pn = new THREE.Mesh(new THREE.PlaneGeometry(pw, pw * 0.36), PL.panel); pn.position.set(o.px == null ? o.ex : o.px, o.py == null ? o.dy - 0.2 : o.py, o.pz == null ? o.zf - 0.46 : o.pz); pn.rotation.x = -0.28; pn.rotation.y = Math.PI; ck.add(pn);
  const yoke = new THREE.Group(), yg = new GB(0, 0, false);
  if (o.stick) { yoke.position.set(o.ex, o.fy + 0.02, o.zf - 0.85); pbox(yg, -0.02, 0, -0.02, 0.02, 0.5, 0.02, 0.06, 0.06, 0.07); pbox(yg, -0.04, 0.5, -0.04, 0.04, 0.6, 0.04, 0.04, 0.04, 0.04); P.stick = true; }
  else { yoke.position.set(o.ex, o.dy - 0.3, o.zf - 0.95); pbox(yg, -0.02, -0.05, 0, 0.02, 0.05, 0.5, 0.08, 0.08, 0.09); pbox(yg, -0.17, 0.03, -0.04, 0.17, 0.09, 0, 0.06, 0.06, 0.07); pbox(yg, -0.19, -0.1, -0.04, -0.15, 0.1, 0, 0.06, 0.06, 0.07); pbox(yg, 0.15, -0.1, -0.04, 0.19, 0.1, 0, 0.06, 0.06, 0.07); }
  yoke.add(yg.mesh(PL.dark, false, false)); ck.add(yoke); P.yoke = yoke; root.add(ck); P.cockpit = ck;
}
/* turbofan pod: cowl, dark intake face and an exhaust cone */
function engPod(gb, x, y, z0, z1, r) {
  const L = z1 - z0, mid = new THREE.Vector3(x, y, (z0 + z1) / 2), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), one = new THREE.Vector3(1, 1, 1);
  pgeo(gb, ni(new THREE.CylinderGeometry(r, r * 0.86, L, 18)), new THREE.Matrix4().compose(mid, q, one), new THREE.Color(0.74, 0.76, 0.79));
  pgeo(gb, ni(new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.1, 14)), new THREE.Matrix4().compose(new THREE.Vector3(x, y, z1 - 0.04), q, one), new THREE.Color(0.05, 0.05, 0.06));
  pgeo(gb, ni(new THREE.ConeGeometry(r * 0.55, L * 0.32, 12)), new THREE.Matrix4().compose(new THREE.Vector3(x, y, z0 - L * 0.12), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), one), new THREE.Color(0.22, 0.22, 0.24));
}

/* ================= MERIDIAN (regional airliner) ================= */
function buildMeridian(liv) {
  planeInit(); const root = new THREE.Group(), P = planeParts(), A = _plgc(liv.a), W = _plgc(liv.b), BL = [0.64, 0.66, 0.7], DK = [0.05, 0.08, 0.12];
  const gbP = new GB(0, 0, false), gbPD = new GB(0, 0, false), gbD = new GB(0, 0, false), glass = [];
  const rings = [{ z: 14.4, w: 0.25, h: 0.25, y: 2.55, n: 2 }, { z: 13.9, w: 0.8, h: 0.82, y: 2.62, n: 2.1 }, { z: 12.6, w: 1.28, h: 1.34, y: 2.75, n: 2.1 }, { z: 10.8, w: 1.52, h: 1.6, y: 2.88, n: 2.05 }, { z: 8.0, w: 1.6, h: 1.68, y: 2.92, n: 2.05 },
    { z: -7.0, w: 1.6, h: 1.68, y: 2.92, n: 2.05 }, { z: -11.0, w: 1.3, h: 1.4, y: 3.25, n: 2.1 }, { z: -14.2, w: 0.7, h: 0.85, y: 3.75, n: 2.2 }, { z: -15.6, w: 0.25, h: 0.4, y: 4.05, n: 2 }];
  pgeo(gbP, loftPlane(rings, 30, (x, y, z, r) => { if (z < -12.8) return A; if (y < r.y - r.h * 0.4) return BL; if (z < 12.4 && z > -12 && Math.abs(y - (r.y - r.h * 0.3)) < r.h * 0.085) return A; return W; }));
  const wing = { x0: 1.3, z0: 2.6, y0: 1.85, span: 13.4, rc: 5.4, tc: 1.6, sweep: 5.2, dih: 0.95, th: 0.075, top: W, bot: [0.68, 0.7, 0.74] };
  for (const s of [1, -1]) {
    const w = Object.assign({ side: s }, wing), ail = wingWithCtl(root, gbPD, w, 0.58, 0.97, 0.72); if (s > 0) P.aileL = ail; else P.aileR = ail;
    /* ground spoilers: flat plates on the upper skin that lift with the brake key */
    const sp = wpv(w, 0.42, 0.5), sg = new THREE.Group(); sg.position.set(sp[0], sp[1] + 0.1, sp[2]); const sb = new GB(0, 0, false); pbox(sb, -0.9, 0, -1.1, 0.9, 0.05, 0, A[0], A[1], A[2]); sg.add(sb.mesh(PL.paintD, true, true)); root.add(sg); if (s > 0) P.spoilL = sg; else P.spoilR = sg;
    /* winglet */
    pgeo(gbPD, wingGeo({ x0: 0, z0: -2.6, y0: 2.8, span: 1.3, rc: 1.4, tc: 0.6, sweep: 0.9, dih: 0, th: 0.05, top: A, bot: A, side: s, up: true }, 0, 1, 0, 1, [-s * 14.7, 0, 0]));
    /* tailplane and elevator */
    const st = { x0: 0.5, z0: -12.0, y0: 3.7, span: 5.0, rc: 3.1, tc: 1.2, sweep: 2.5, dih: 0.35, th: 0.06, top: W, bot: W, side: s }; const el = wingWithCtl(root, gbPD, st, 0, 1, 0.62); if (s > 0) P.elevL = el; else P.elevR = el;
    /* engine, pylon, main gear */
    engPod(gbD, s * 5.2, 1.38, -0.2, 3.4, 0.86); pbox(gbD, s * 5.2 - 0.14, 1.9, 0.5, s * 5.2 + 0.14, 2.3, 2.6, 0.7, 0.72, 0.75);
    for (const dx of [-0.3, 0.3]) wheelAt(gbD, s * 2.7 + dx, 0.55, -1.2, 0.55, 0.38);
    { const [g, m] = cylBetween([s * 2.7, 2.0, -1.2], [s * 2.7, 0.6, -1.2], 0.11, 6); pgeo(gbD, g, m, new THREE.Color(0.6, 0.6, 0.62)); }
    /* cabin windows */
    for (let z = 9; z > -9.5; z -= 1.1) pbox(gbD, s > 0 ? 1.5 : -1.62, 3.15, z, s > 0 ? 1.62 : -1.5, 3.5, z + 0.5, ...DK);
  }
  pbox(gbD, 14.7 - 0.05, 2.95, -2.7, 14.78, 3.15, -2.5, 0.9, 0.05, 0.05); pbox(gbD, -14.78, 2.95, -2.7, -14.65, 3.15, -2.5, 0.05, 0.7, 0.1);   /* wing-tip lights */
  { const fin = { x0: 0, z0: -8.6, y0: 4.2, span: 5.3, rc: 5.4, tc: 2.1, sweep: 4.0, dih: 0, th: 0.07, top: A, bot: A, side: 1, up: true }; pgeo(gbPD, wingGeo(fin, 0, 1, 0, 0.64)); const pv = wpv(fin, 0.5, 0.64), rd = new THREE.Group(); rd.position.set(pv[0], pv[1], pv[2]); const rg = new GB(0, 0, false); pgeo(rg, wingGeo(fin, 0, 1, 0.64, 1, pv)); rd.add(rg.mesh(PL.paintD, true, true)); root.add(rd); P.rud = rd; }
  /* nose gear */
  wheelAt(gbD, -0.2, 0.4, 10.2, 0.4, 0.22); wheelAt(gbD, 0.2, 0.4, 10.2, 0.4, 0.22); { const [g, m] = cylBetween([0, 1.4, 10.2], [0, 0.45, 10.2], 0.09, 6); pgeo(gbD, g, m, new THREE.Color(0.6, 0.6, 0.62)); }
  /* flight deck glass: windscreen and side windows follow the nose skin */
  glassBand(glass, rings, 11.4, 12.9, 1.0, 2.14, 3, 6, 1.025); glassBand(glass, rings, 10.9, 12.0, 0.3, 0.85, 2, 2, 1.025); glassBand(glass, rings, 10.9, 12.0, Math.PI - 0.85, Math.PI - 0.3, 2, 2, 1.025);
  mkCockpit(P, root, { hw: 1.05, fy: 2.3, sy: 3.95, zb: 8.9, zf: 12.6, dy: 3.5, ex: 0.55, pw: 1.4, seat: true, bk: 0.4 });
  const gm = mergeGlass(glass); if (gm) { gm.renderOrder = 2; root.add(gm); }
  finishPlane(root, [[gbP, PL.paint], [gbPD, PL.paintD], [gbD, PL.dark]]);
  return { root, parts: P, spec: PSPEC.meridian };
}

/* ================= GULL (business jet) ================= */
function buildGull(liv) {
  planeInit(); const root = new THREE.Group(), P = planeParts(), A = _plgc(liv.a), W = _plgc(liv.b), BL = [0.62, 0.64, 0.68], DK = [0.05, 0.08, 0.12];
  const gbP = new GB(0, 0, false), gbPD = new GB(0, 0, false), gbD = new GB(0, 0, false), glass = [];
  const rings = [{ z: 8.6, w: 0.12, h: 0.12, y: 1.75, n: 2 }, { z: 8.2, w: 0.45, h: 0.45, y: 1.72, n: 2.2 }, { z: 6.8, w: 0.85, h: 0.9, y: 1.8, n: 2.3 }, { z: 5.0, w: 1.02, h: 1.1, y: 1.88, n: 2.2 }, { z: 3.0, w: 1.1, h: 1.18, y: 1.9, n: 2.1 },
    { z: -3.5, w: 1.1, h: 1.18, y: 1.9, n: 2.1 }, { z: -6.0, w: 0.75, h: 0.8, y: 2.15, n: 2.2 }, { z: -8.0, w: 0.3, h: 0.4, y: 2.3, n: 2 }, { z: -8.4, w: 0.1, h: 0.2, y: 2.3, n: 2 }];
  pgeo(gbP, loftPlane(rings, 28, (x, y, z, r) => { if (z > 8.0) return [0.2, 0.21, 0.23]; if (y < r.y - r.h * 0.42) return BL; if (z < 5.8 && z > -5.5 && Math.abs(y - (r.y - r.h * 0.18)) < r.h * 0.1) return A; if (z < -6.6) return A; return W; }));
  const wing = { x0: 0.9, z0: 1.9, y0: 1.1, span: 6.9, rc: 3.4, tc: 1.1, sweep: 3.3, dih: 0.55, th: 0.065, top: W, bot: [0.7, 0.72, 0.75] };
  for (const s of [1, -1]) {
    const w = Object.assign({ side: s }, wing), ail = wingWithCtl(root, gbPD, w, 0.55, 0.96, 0.72); if (s > 0) P.aileL = ail; else P.aileR = ail;
    pgeo(gbPD, wingGeo(Object.assign({}, w, { top: A, bot: A }), 0.965, 1, 0, 1));
    const st = { x0: 0.12, z0: -6.6, y0: 5.35, span: 2.3, rc: 1.6, tc: 0.8, sweep: 0.9, dih: 0, th: 0.055, top: W, bot: W, side: s }; const el = wingWithCtl(root, gbPD, st, 0, 1, 0.62); if (s > 0) P.elevL = el; else P.elevR = el;
    engPod(gbD, s * 1.42, 2.45, -6.2, -3.0, 0.42); pbox(gbD, s > 0 ? 0.85 : -1.2, 2.25, -5.4, s > 0 ? 1.2 : -0.85, 2.65, -3.6, 0.68, 0.7, 0.73);
    wheelAt(gbD, s * 1.35, 0.36, -0.3, 0.36, 0.2); { const [g, m] = cylBetween([s * 1.2, 1.05, -0.3], [s * 1.35, 0.4, -0.3], 0.08, 6); pgeo(gbD, g, m, new THREE.Color(0.6, 0.6, 0.62)); }
    for (let z = 4.2; z > -3.4; z -= 0.85) pbox(gbD, s > 0 ? 1.04 : -1.12, 2.05, z, s > 0 ? 1.12 : -1.04, 2.3, z + 0.4, ...DK);
  }
  pbox(gbD, 7.8 - 0.05, 1.62, 0.1, 7.86, 1.7, 0.2, 0.9, 0.05, 0.05); pbox(gbD, -7.86, 1.62, 0.1, -7.78, 1.7, 0.2, 0.05, 0.7, 0.1);
  { const fin = { x0: 0, z0: -4.9, y0: 2.4, span: 3.0, rc: 3.0, tc: 1.3, sweep: 2.0, dih: 0, th: 0.06, top: A, bot: A, side: 1, up: true }; pgeo(gbPD, wingGeo(fin, 0, 1, 0, 0.62)); const pv = wpv(fin, 0.5, 0.62), rd = new THREE.Group(); rd.position.set(pv[0], pv[1], pv[2]); const rg = new GB(0, 0, false); pgeo(rg, wingGeo(fin, 0, 1, 0.62, 1, pv)); rd.add(rg.mesh(PL.paintD, true, true)); root.add(rd); P.rud = rd; }
  wheelAt(gbD, 0, 0.3, 5.3, 0.3, 0.16); { const [g, m] = cylBetween([0, 0.95, 5.3], [0, 0.32, 5.3], 0.06, 6); pgeo(gbD, g, m, new THREE.Color(0.6, 0.6, 0.62)); }
  glassBand(glass, rings, 6.1, 7.4, 0.95, 2.19, 3, 6, 1.025); glassBand(glass, rings, 5.8, 6.6, 0.3, 0.8, 2, 2, 1.025); glassBand(glass, rings, 5.8, 6.6, Math.PI - 0.8, Math.PI - 0.3, 2, 2, 1.025);
  mkCockpit(P, root, { hw: 0.7, fy: 1.45, sy: 2.6, zb: 4.3, zf: 6.5, dy: 2.15, ex: 0.35, pw: 1.0, seat: true });
  const gm = mergeGlass(glass); if (gm) { gm.renderOrder = 2; root.add(gm); }
  finishPlane(root, [[gbP, PL.paint], [gbPD, PL.paintD], [gbD, PL.dark]]);
  return { root, parts: P, spec: PSPEC.gull };
}

/* ================= WREN (biplane) ================= */
function buildWren(liv) {
  planeInit(); const root = new THREE.Group(), P = planeParts(), A = _plgc(liv.a), B = _plgc(liv.b);
  const gbP = new GB(0, 0, false), gbPD = new GB(0, 0, false), gbD = new GB(0, 0, false), glass = [];
  const rings = [{ z: 3.2, w: 0.22, h: 0.22, y: 1.06, n: 2 }, { z: 3.05, w: 0.56, h: 0.56, y: 1.08, n: 2 }, { z: 2.3, w: 0.6, h: 0.6, y: 1.1, n: 2.1 }, { z: 1.5, w: 0.5, h: 0.62, y: 1.2, n: 2.4 }, { z: 0.0, w: 0.43, h: 0.6, y: 1.3, n: 2.5 },
    { z: -1.5, w: 0.32, h: 0.46, y: 1.37, n: 2.4 }, { z: -3.0, w: 0.16, h: 0.28, y: 1.43, n: 2.2 }, { z: -3.45, w: 0.05, h: 0.12, y: 1.45, n: 2 }];
  pgeo(gbP, loftPlane(rings, 26, (x, y, z, r) => { if (z > 2.2) return B; return y > r.y - r.h * 0.1 ? A : B; }));
  const up = { x0: 0.35, z0: 1.2, y0: 2.25, span: 3.9, rc: 1.25, tc: 1.05, sweep: 0.1, dih: 0, th: 0.085, top: A, bot: B };
  const lo = { x0: 0.35, z0: 0.95, y0: 1.0, span: 3.2, rc: 1.15, tc: 1.0, sweep: 0.08, dih: 0.1, th: 0.085, top: A, bot: B };
  for (const s of [1, -1]) {
    const wu = Object.assign({ side: s }, up), wl = Object.assign({ side: s }, lo);
    const au = wingWithCtl(root, gbPD, wu, 0.5, 0.97, 0.7), al = wingWithCtl(root, gbPD, wl, 0.5, 0.97, 0.7);
    const pu = wpv(wu, 0.735, 0.7), pl = wpv(wl, 0.735, 0.7); al.position.set(pl[0] - pu[0], pl[1] - pu[1], pl[2] - pu[2]); root.remove(al); au.add(al);   /* lower aileron rides on the upper one so one pivot moves both */
    if (s > 0) P.aileL = au; else P.aileR = au;
    pgeo(gbPD, wingGeo(Object.assign({}, wu, { top: B, bot: B }), 0.97, 1, 0, 1)); pgeo(gbPD, wingGeo(Object.assign({}, wl, { top: B, bot: B }), 0.97, 1, 0, 1));
    /* struts and wires between the planes, and the cabane over the fuselage */
    const mk = (a, b, r, c) => { const [g, m] = cylBetween(a, b, r, 5); pgeo(gbD, g, m, c || new THREE.Color(0.32, 0.26, 0.2)); };
    for (const [zl, zu] of [[0.75, 0.98], [0.05, 0.28]]) mk([s * 1.9, 1.04, zl], [s * 1.9, 2.25, zu], 0.04);
    mk([s * 1.9, 1.05, 0.75], [s * 3.1, 2.25, 0.98], 0.012, new THREE.Color(0.55, 0.55, 0.58)); mk([s * 3.1, 1.1, 0.7], [s * 1.9, 2.25, 0.98], 0.012, new THREE.Color(0.55, 0.55, 0.58));
    mk([s * 0.3, 1.8, 0.9], [s * 0.4, 2.25, 1.02], 0.04); mk([s * 0.3, 1.75, 0.2], [s * 0.4, 2.25, 0.3], 0.04);
    /* tail */
    const st = { x0: 0.1, z0: -2.6, y0: 1.42, span: 1.5, rc: 1.0, tc: 0.6, sweep: 0.2, dih: 0, th: 0.06, top: A, bot: B, side: s }; const el = wingWithCtl(root, gbPD, st, 0, 1, 0.55); if (s > 0) P.elevL = el; else P.elevR = el;
    /* undercarriage */
    wheelAt(gbD, s * 0.95, 0.27, 0.35, 0.27, 0.14); mk([s * 0.32, 0.85, 0.35], [s * 0.95, 0.3, 0.35], 0.045, new THREE.Color(0.55, 0.56, 0.58));
  }
  { const fin = { x0: 0, z0: -2.6, y0: 1.45, span: 1.25, rc: 1.15, tc: 0.55, sweep: 0.55, dih: 0, th: 0.055, top: A, bot: A, side: 1, up: true }; pgeo(gbPD, wingGeo(fin, 0, 1, 0, 0.55)); const pv = wpv(fin, 0.5, 0.55), rd = new THREE.Group(); rd.position.set(pv[0], pv[1], pv[2]); const rg = new GB(0, 0, false); pgeo(rg, wingGeo(fin, 0, 1, 0.55, 1, pv)); rd.add(rg.mesh(PL.paintD, true, true)); root.add(rd); P.rud = rd; }
  wheelAt(gbD, 0, 0.22, 2.1, 0.22, 0.12); { const [g, m] = cylBetween([0, 0.7, 2.1], [0, 0.25, 2.1], 0.04, 6); pgeo(gbD, g, m, new THREE.Color(0.55, 0.56, 0.58)); }
  pbox(gbD, 4.15 - 0.05, 2.2, 0.4, 4.25, 2.3, 0.5, 0.9, 0.05, 0.05); pbox(gbD, -4.25, 2.2, 0.4, -4.15 + 0.05, 2.3, 0.5, 0.05, 0.7, 0.1);
  pbox(gbD, -0.04, 1.9, 0.55, 0.04, 1.96, 0.95, 0.1, 0.1, 0.11);
  /* cowl ring, windscreen, open cockpit */
  { const ring = ni(new THREE.CylinderGeometry(0.6, 0.6, 0.14, 18, 1, true)); pgeo(gbD, ring, new THREE.Matrix4().compose(new THREE.Vector3(0, 1.09, 2.95), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1)), new THREE.Color(0.15, 0.15, 0.16)); }
  glassQuad(glass, [-0.3, 1.98, 0.5], [0.3, 1.98, 0.5], [0.27, 2.18, 0.36], [-0.27, 2.18, 0.36]);
  const prop = new THREE.Group(); prop.position.set(0, 1.08, 3.24); P.prop = prop;
  { const pg = new GB(0, 0, false); pgeo(pg, ni(new THREE.ConeGeometry(0.2, 0.42, 14)), new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0.16), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1)), new THREE.Color(B[0], B[1], B[2]));
    pbox(pg, -0.08, 0.0, -0.03, 0.08, 1.0, 0.03, 0.34, 0.2, 0.1); pbox(pg, -0.08, -1.0, -0.03, 0.08, 0.0, 0.03, 0.34, 0.2, 0.1); const spin = new THREE.Group(); spin.add(pg.mesh(PL.dark, true, false)); prop.add(spin); P.spin = spin;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.02, 24), PL.disc.clone()); prop.add(disc); P.disc = disc; }
  root.add(prop);
  mkCockpit(P, root, { hw: 0.3, fy: 1.89, sy: 2.05, zb: -0.95, zf: 0.45, dy: 2.1, ex: 0, pw: 0.5, py: 2.02, pz: -0.01, stick: true, bk: 0.12 });
  const gm = mergeGlass(glass); if (gm) { gm.renderOrder = 2; root.add(gm); }
  finishPlane(root, [[gbP, PL.paint], [gbPD, PL.paintD], [gbD, PL.dark]]);
  return { root, parts: P, spec: PSPEC.wren };
}

Planes.liv.wren = [{ a: 0xd8392c, b: 0xf2e6c4 }];
Planes.liv.gull = [{ a: 0x1d3f6e, b: 0xf0f0ee }];
Planes.liv.meridian = [{ a: 0x1f6fb5, b: 0xf1f1ee }];
Planes.build.wren = buildWren; Planes.build.gull = buildGull; Planes.build.meridian = buildMeridian;
