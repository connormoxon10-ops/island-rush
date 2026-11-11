/* ================= ROTORCRAFT AND AIRSHIP =================
   Kestrel (light helicopter) and Zephyr (blimp). They sit in the same fleet as the planes (Planes.build, boarding, stands, camera, HUD,
   crashes) but fly with their own simple models in Fly.subRot (07_fly.js): the helicopter climbs and sinks at a commanded rate, tilts to
   move and turns on the pedals; the airship is buoyant, slow and sluggish. */
Object.assign(PSPEC, {
  kestrel: { id: 'kestrel', name: 'Kestrel', role: 'Helicopter', blurb: 'Lifts straight up, hovers and lands anywhere. Shift climbs, Z sinks, WASD tilts, Q E turns.', cost: 12000, cgY: 1.5, eye: [0.3, 2.2, 0.95], chase: [14, 4.2], far: [30, 9], gear: { nz: 1.2, mz: -0.7, mx: 0.95 }, len: 9.4, span: 2.6, rotR: 5.2, prop: false, jet: false, heli: true,
    Vs: 1, Vr: 1, Vmax: 40, Vprop: 80, thrust: 1, drag: 1, pr: 1, rr: 1, yr: 1.4, stab: 1, aStall: 0.3, gmax: 3, crash: 5.2, mass: 1.2, rollT: 0.3, idle: 0.3, payK: 1.4, tagY: 3.8 },
  zephyr: { id: 'zephyr', name: 'Zephyr', role: 'Airship', blurb: 'A blimp. Slow and gentle, and the best view on the island. W S climb and sink, A D turn.', cost: 7000, cgY: 4.5, eye: [0.4, 1.85, 2.4], chase: [34, 9], far: [64, 18], gear: { nz: 2.6, mz: -1.6, mx: 1.15 }, len: 31, span: 9, prop: true, jet: false, blimp: true,
    Vs: 1, Vr: 1, Vmax: 18, Vprop: 40, thrust: 1, drag: 1, pr: 1, rr: 1, yr: 1, stab: 1, aStall: 0.3, gmax: 2, crash: 4.5, mass: 6, rollT: 1, idle: 0.2, payK: 1.6, tagY: 9 }
});

/* ================= KESTREL (helicopter) ================= */
function buildKestrel(liv) {
  planeInit(); const root = new THREE.Group(), P = planeParts(), A = _plgc(liv.a), B = _plgc(liv.b), DK = [0.13, 0.14, 0.16];
  const gbP = new GB(0, 0, false), gbPD = new GB(0, 0, false), gbD = new GB(0, 0, false), glass = [];
  const rings = [{ z: 2.35, w: 0.3, h: 0.32, y: 1.4, n: 2 }, { z: 2.0, w: 0.62, h: 0.66, y: 1.48, n: 2.1 }, { z: 1.2, w: 0.98, h: 1.05, y: 1.6, n: 2.2 }, { z: 0.0, w: 1.06, h: 1.15, y: 1.68, n: 2.3 }, { z: -1.1, w: 0.92, h: 1.0, y: 1.78, n: 2.3 },
    { z: -2.0, w: 0.5, h: 0.55, y: 2.05, n: 2.2 }, { z: -2.8, w: 0.24, h: 0.3, y: 2.3, n: 2.1 }, { z: -6.4, w: 0.11, h: 0.17, y: 2.62, n: 2.1 }, { z: -7.1, w: 0.08, h: 0.12, y: 2.7, n: 2 }];
  pgeo(gbP, loftPlane(rings, 26, (x, y, z, r) => { if (z < -2.2) return A; if (y < r.y - r.h * 0.5) return DK; if (Math.abs(y - (r.y - r.h * 0.12)) < r.h * 0.1 && z > -1.9) return A; return B; }));
  /* engine cowl, mast and the main rotor with its blur disc */
  pbox(gbP, -0.42, 2.62, -1.3, 0.42, 3.0, 0.15, B[0] * 0.9, B[1] * 0.9, B[2] * 0.9); pbox(gbD, -0.2, 2.75, -1.55, 0.2, 2.95, -1.3, 0.2, 0.2, 0.22);
  { const [g, m] = cylBetween([0, 2.9, -0.45], [0, 3.55, -0.45], 0.11, 8); pgeo(gbD, g, m, new THREE.Color(0.25, 0.26, 0.28)); }
  const hub = new THREE.Group(); hub.position.set(0, 3.55, -0.45); P.hspin = hub;
  { const rb = new GB(0, 0, false); pbox(rb, -0.12, -0.05, -0.12, 0.12, 0.1, 0.12, 0.2, 0.2, 0.22); pbox(rb, -5.2, -0.02, -0.17, -0.12, 0.03, 0.17, 0.09, 0.09, 0.1); pbox(rb, 0.12, -0.02, -0.17, 5.2, 0.03, 0.17, 0.09, 0.09, 0.1); pbox(rb, 4.4, -0.021, -0.171, 5.2, 0.031, 0.171, 0.85, 0.7, 0.1); pbox(rb, -5.2, -0.021, -0.171, -4.4, 0.031, 0.171, 0.85, 0.7, 0.1);
    hub.add(rb.mesh(PL.dark, true, false)); const disc = new THREE.Mesh(new THREE.CircleGeometry(5.2, 30), PL.disc.clone()); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.01; hub.add(disc); P.hdisc = disc; }
  root.add(hub);
  /* tail: fin, tailplane and the tail rotor */
  { const fin = { x0: 0, z0: -5.9, y0: 2.5, span: 1.55, rc: 1.3, tc: 0.6, sweep: 0.75, dih: 0, th: 0.05, top: A, bot: A, side: 1, up: true }; pgeo(gbPD, wingGeo(fin, 0, 1, 0, 1)); }
  for (const s of [1, -1]) pgeo(gbPD, wingGeo({ x0: 0.1, z0: -5.3, y0: 2.55, span: 1.0, rc: 0.75, tc: 0.45, sweep: 0.2, dih: 0, th: 0.05, top: B, bot: B, side: s }, 0, 1, 0, 1));
  const tr = new THREE.Group(); tr.position.set(0.2, 3.35, -6.75); P.tspin = tr; { const tb = new GB(0, 0, false); pbox(tb, -0.02, -0.6, -0.06, 0.02, 0.6, 0.06, 0.1, 0.1, 0.11); pbox(tb, -0.04, -0.07, -0.07, 0.04, 0.07, 0.07, 0.25, 0.25, 0.27); tr.add(tb.mesh(PL.dark, true, false)); } root.add(tr);
  /* skids */
  for (const s of [1, -1]) {
    const [t, tm] = cylBetween([s * 0.95, 0.13, -1.25], [s * 0.95, 0.13, 1.5], 0.045, 6); pgeo(gbD, t, tm, new THREE.Color(0.2, 0.2, 0.22));
    const [u, um] = cylBetween([s * 0.95, 0.15, 1.45], [s * 0.95, 0.32, 1.7], 0.045, 6); pgeo(gbD, u, um, new THREE.Color(0.2, 0.2, 0.22));
    for (const z of [0.9, -0.7]) { const [g, m] = cylBetween([s * 0.62, 0.92, z], [s * 0.95, 0.15, z], 0.05, 6); pgeo(gbD, g, m, new THREE.Color(0.25, 0.26, 0.28)); }
  }
  pbox(gbD, 0.9 - 0.04, 1.2, 1.4, 1.0, 1.28, 1.5, 0.9, 0.05, 0.05); pbox(gbD, -1.0, 1.2, 1.4, -0.9 + 0.04, 1.28, 1.5, 0.05, 0.7, 0.1);
  /* canopy glass over the cabin, door windows */
  glassBand(glass, rings, 0.1, 2.15, 0.25, Math.PI - 0.25, 4, 9, 1.03);
  mkCockpit(P, root, { hw: 0.5, fy: 0.78, sy: 2.0, zb: -0.55, zf: 1.8, dy: 1.55, ex: 0.3, pw: 0.8, seat: true, stick: true });
  const gm = mergeGlass(glass); if (gm) { gm.renderOrder = 2; root.add(gm); }
  finishPlane(root, [[gbP, PL.paint], [gbPD, PL.paintD], [gbD, PL.dark]]);
  return { root, parts: P, spec: PSPEC.kestrel };
}

/* ================= ZEPHYR (blimp) ================= */
function buildZephyr(liv) {
  planeInit(); const root = new THREE.Group(), P = planeParts(), A = _plgc(liv.a), S0 = [0.86, 0.87, 0.89];
  const gbP = new GB(0, 0, false), gbPD = new GB(0, 0, false), gbD = new GB(0, 0, false), glass = [];
  const rings = [[15.4, 0.3], [14.6, 1.6], [12.5, 3.2], [9, 4.0], [4, 4.3], [0, 4.4], [-4, 4.3], [-9, 3.8], [-12.5, 2.8], [-14.8, 1.2], [-15.6, 0.25]].map(([z, r]) => ({ z, w: r, h: r, y: 7.0, n: 2 }));
  pgeo(gbP, loftPlane(rings, 32, (x, y, z, r) => { if (Math.abs(y - r.y) < r.h * 0.2 && z < 10 && z > -9) return A; if (z > 13.5) return A; return y < r.y - r.h * 0.5 ? [S0[0] * 0.82, S0[1] * 0.82, S0[2] * 0.82] : S0; }));
  /* tail: cross fins and the surfaces that move */
  const fin = { x0: 0, z0: -9.2, y0: 7.0, span: 4.4, rc: 5.2, tc: 2.6, sweep: 2.8, dih: 0, th: 0.05, top: A, bot: A, side: 1, up: true };
  pgeo(gbPD, wingGeo(fin, 0, 1, 0, 0.6)); { const pv = wpv(fin, 0.5, 0.6), rd = new THREE.Group(); rd.position.set(pv[0], pv[1], pv[2]); const rg = new GB(0, 0, false); pgeo(rg, wingGeo(fin, 0, 1, 0.6, 1, pv)); rd.add(rg.mesh(PL.paintD, true, true)); root.add(rd); P.rud = rd; }
  { const g = wingGeo(Object.assign({}, fin, { span: 3.2 }), 0, 1, 0, 1); g.applyMatrix4(new THREE.Matrix4().makeScale(1, -1, 1)); g.translate(0, 14.0, 0); pgeo(gbPD, g); }
  for (const s of [1, -1]) {
    const st = { x0: 0.3, z0: -9.2, y0: 7.0, span: 3.7, rc: 5.0, tc: 2.4, sweep: 2.9, dih: 0, th: 0.05, top: A, bot: A, side: s }; const el = wingWithCtl(root, gbPD, st, 0, 1, 0.58); if (s > 0) P.elevL = el; else P.elevR = el;
  }
  /* gondola */
  const gr = [{ z: 3.9, w: 0.3, h: 0.35, y: 1.3, n: 2 }, { z: 3.3, w: 0.85, h: 0.9, y: 1.34, n: 2.6 }, { z: 2.0, w: 1.02, h: 0.95, y: 1.36, n: 3 }, { z: -2.8, w: 1.02, h: 0.95, y: 1.36, n: 3 }, { z: -3.8, w: 0.5, h: 0.5, y: 1.38, n: 2.4 }, { z: -4.1, w: 0.12, h: 0.2, y: 1.4, n: 2 }];
  pgeo(gbPD, loftPlane(gr, 22, (x, y, z, r) => (y < r.y - r.h * 0.4 ? [0.3, 0.3, 0.33] : Math.abs(y - r.y) < r.h * 0.15 && z < 3 ? A : [0.9, 0.9, 0.88])));
  glassBand(glass, gr, 2.0, 3.55, 0.5, Math.PI - 0.5, 3, 7, 1.03);
  for (const [sx, z] of [[1, 1.5], [-1, 1.5], [1, -1.6], [-1, -1.6]]) { const [g, m] = cylBetween([sx * 0.7, 2.25, z], [sx * 2.4, 4.5, z * 1.8], 0.05, 5); pgeo(gbD, g, m, new THREE.Color(0.35, 0.35, 0.38)); }
  for (const z of [1.2, -1.2]) { const [g, m] = cylBetween([0, 2.3, z], [0, 2.65, z], 0.35, 8); pgeo(gbD, g, m, new THREE.Color(0.3, 0.3, 0.33)); }
  /* engines and pusher props */
  const props = [];
  for (const s of [1, -1]) {
    const [pg, pm] = cylBetween([s * 1.75, 1.5, -1.6], [s * 1.75, 1.5, -0.1], 0.3, 10); pgeo(gbPD, pg, pm, new THREE.Color(0.7, 0.72, 0.75)); const [ar, am] = cylBetween([s * 1.05, 1.4, -0.9], [s * 1.7, 1.45, -0.9], 0.07, 6); pgeo(gbD, ar, am, new THREE.Color(0.4, 0.4, 0.42));
    const grp = new THREE.Group(); grp.position.set(s * 1.75, 1.5, -1.72); const pr = new GB(0, 0, false); pbox(pr, -0.07, 0, -0.03, 0.07, 1.0, 0.03, 0.08, 0.08, 0.09); pbox(pr, -0.07, -1.0, -0.03, 0.07, 0, 0.03, 0.08, 0.08, 0.09); pbox(pr, -0.12, -0.12, -0.08, 0.12, 0.12, 0.08, 0.5, 0.5, 0.52);
    const spin = new THREE.Group(); spin.add(pr.mesh(PL.dark, true, false)); grp.add(spin); const disc = new THREE.Mesh(new THREE.CircleGeometry(1.02, 22), PL.disc.clone()); disc.rotation.y = Math.PI; grp.add(disc); root.add(grp); props.push([spin, disc]);
  }
  P.spin = props[0][0]; P.disc = props[0][1]; P.spin2 = props[1][0]; P.disc2 = props[1][1];
  /* landing wheels */
  wheelAt(gbD, 0, 0.35, 2.6, 0.35, 0.22); { const [g, m] = cylBetween([0, 1.0, 2.6], [0, 0.4, 2.6], 0.06, 6); pgeo(gbD, g, m, new THREE.Color(0.55, 0.56, 0.58)); }
  for (const s of [1, -1]) { wheelAt(gbD, s * 1.15, 0.35, -1.6, 0.35, 0.22); const [g, m] = cylBetween([s * 0.8, 1.0, -1.6], [s * 1.15, 0.4, -1.6], 0.06, 6); pgeo(gbD, g, m, new THREE.Color(0.55, 0.56, 0.58)); }
  pbox(gbD, 4.4 - 0.1, 6.9, -8.9, 4.5, 7.0, -8.7, 0.9, 0.05, 0.05); pbox(gbD, -4.5, 6.9, -8.9, -4.4 + 0.1, 7.0, -8.7, 0.05, 0.7, 0.1);
  mkCockpit(P, root, { hw: 0.8, fy: 0.55, sy: 2.0, zb: 0.2, zf: 3.2, dy: 1.6, ex: 0.4, pw: 1.1, seat: true });
  const gm = mergeGlass(glass); if (gm) { gm.renderOrder = 2; root.add(gm); }
  finishPlane(root, [[gbP, PL.paint], [gbPD, PL.paintD], [gbD, PL.dark]]);
  return { root, parts: P, spec: PSPEC.zephyr };
}

Planes.liv.kestrel = [{ a: 0xd23b2a, b: 0xf2f2ee }];
Planes.liv.zephyr = [{ a: 0x2b6cb0, b: 0xe8edf2 }];
Planes.build.kestrel = buildKestrel; Planes.build.zephyr = buildZephyr;
