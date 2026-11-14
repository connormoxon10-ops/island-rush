/* ================= four more hand-built cars: a low sand rail, a box-flared rally hatch, a woodie surf wagon and a lowrider on air =================
   Original designs. They reuse the body-section helpers of 06_carmodel_more.js and the moving-parts system (S.part + a returned rig) of buildCarModel. */

/* rig helpers: point a part's +y axis from A at B (and stretch it to reach B), a damped spring step, and a telescoping damper made of three parts */
const _rgUp = new THREE.Vector3(0, 1, 0), _rgD = new THREE.Vector3();
function rigPlace(o, A, B, stretch) { _rgD.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]); const L = _rgD.length(); if (L < 1e-4) return; o.position.set(A[0], A[1], A[2]); o.quaternion.setFromUnitVectors(_rgUp, _rgD.multiplyScalar(1 / L)); o.scale.set(1, stretch ? L : 1, 1); }
const rigSpring = (x, v, want, w, z, h) => v + (w * w * (want - x) - 2 * z * w * v) * h;
const rigLerp = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
function rigDamper(S, K, id, o) {   /* o: { lb body length, ls shaft length, rb body radius, body colour, coil colour or null } */
  const bo = S.part('db' + id), sh = S.part('ds' + id), q = { body: 'db' + id, shaft: 'ds' + id, coil: null };
  K.drum(bo.T, 0, o.lb / 2, 0, o.rb, o.lb, o.col, 'y'); K.drum(bo.T, 0, 0.02, 0, o.rb * 1.2, 0.04, [0.5, 0.51, 0.53], 'y');
  K.drum(sh.T, 0, o.ls / 2, 0, o.rb * 0.42, o.ls, [0.8, 0.81, 0.83], 'y'); K.drum(sh.T, 0, 0.02, 0, o.rb * 0.8, 0.04, [0.07, 0.07, 0.075], 'y');
  if (o.coil) { const c = S.part('dc' + id); q.coil = 'dc' + id; for (let k = 0; k < 7; k++) { const g = ni(new THREE.TorusGeometry(o.rb * 1.6, o.rb * 0.28, 4, 10)); _q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); _m4.compose(_p3.set(0, (k + 0.5) / 7, 0), _q, _s3.set(1, 1, 1)); c.P.geo(g, _m4, _tcol.setRGB(o.coil[0], o.coil[1], o.coil[2]), 0); g.dispose(); } }
  return q;
}
function rigPoseDamper(Pt, q, A, B) {   /* A = top mount, B = bottom mount */
  rigPlace(Pt[q.body], A, B, false); rigPlace(Pt[q.shaft], B, A, false);
  if (q.coil) { _rgD.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]); const L = _rgD.length() || 1; rigPlace(Pt[q.coil], rigLerp(A, B, 0.1 / L), rigLerp(A, B, 1 - 0.08 / L), true); }
}

/* a low sand rail: a long, low space frame of painted pipe, skinny front tyres on a twin-tube beam with trailing arms, paddle-wide rears on long trailing
   arms with coilovers, an air-cooled flat-four hanging out the back with its fan shroud, twin carbs and a chrome muffler with upswept tips, two low
   buckets, a whip with a flag. The arms, dampers, coils and drive shafts move with the wheels (rig) */
function sandRail(S, gP, gG, gT, gD, gLt, tl, lod) {
  const K = carKit(lod), BLK = [0.012, 0.012, 0.014], DK = [0.03, 0.03, 0.034], STL = [0.07, 0.07, 0.075], CHR = [0.82, 0.83, 0.85], AL = [0.55, 0.56, 0.58], RED = [0.6, 0.05, 0.03], GL = [1, 1, 1], R1 = 0.026, R2 = 0.032;
  const wf = S.wheels.find((w) => w.front), wr = S.wheels.find((w) => !w.front), xF = Math.abs(wf.x), xR = Math.abs(wr.x), rF = wf.r, rR = wr.r, zF = wf.z, zR = wr.z;
  /* the frame */
  for (const sx of [-1, 1]) {
    K.path(gP, [[sx * 0.42, 0.34, -0.95], [sx * 0.45, 0.32, -0.3], [sx * 0.45, 0.32, 0.55], [sx * 0.3, 0.36, 1.25], [sx * 0.18, 0.42, 1.9]], R2);              /* floor rail into the nose */
    K.path(gP, [[sx * 0.47, 0.62, -0.3], [sx * 0.46, 0.66, 0.55], [sx * 0.3, 0.62, 1.25], [sx * 0.18, 0.56, 1.9]], R1);                                       /* cockpit side rail */
    for (const [z, x0, x1, y1] of [[-0.3, 0.45, 0.47, 0.62], [0.55, 0.45, 0.46, 0.66], [1.25, 0.3, 0.3, 0.62]]) K.tube(gP, [sx * x0, 0.32, z], [sx * x1, y1, z], R1);
    K.tube(gP, [sx * 0.45, 0.32, -0.3], [sx * 0.46, 0.66, 0.55], R1);                                                                                         /* side diagonal */
    K.path(gP, [[sx * 0.47, 0.32, -0.34], [sx * 0.47, 1.18, -0.38], [sx * 0.32, 1.32, -0.4]], R2);                                                            /* main hoop */
    K.path(gP, [[sx * 0.46, 0.66, 0.55], [sx * 0.33, 0.96, 0.52]], R2); K.tube(gP, [sx * 0.33, 0.96, 0.52], [sx * 0.32, 1.32, -0.4], R1);                      /* dash hoop and the rails back to the main hoop */
    K.path(gP, [[sx * 0.32, 1.32, -0.4], [sx * 0.38, 0.86, -1.55], [sx * 0.38, 0.5, -1.78]], R2); K.tube(gP, [sx * 0.42, 0.34, -0.95], [sx * 0.38, 0.44, -1.78], R1);   /* engine cradle */
    K.tube(gP, [sx * 0.47, 0.9, -0.38], [sx * 0.42, 1.02, zR + 0.18], R1); K.tube(gP, [sx * 0.42, 1.02, zR + 0.18], [sx * 0.38, 0.62, -1.68], R1);              /* rear shock towers */
    K.tube(gP, [sx * 0.3, 0.62, 1.25], [sx * 0.38, 0.86, zF + 0.08], R1); K.tube(gP, [sx * 0.38, 0.86, zF + 0.08], [sx * 0.24, 0.56, 1.75], R1);                  /* front shock towers */
    K.tube(gP, [sx * 0.18, 0.42, 1.9], [sx * 0.28, 0.46, 2.06], R1); K.tube(gP, [sx * 0.18, 0.56, 1.9], [sx * 0.28, 0.46, 2.06], R1);                              /* nose horns */
  }
  for (const [y, z, w, rr] of [[0.33, -0.95, 0.42, R1], [0.32, -0.3, 0.45, R1], [0.32, 0.55, 0.45, R1], [0.36, 1.25, 0.3, R1], [0.42, 1.9, 0.18, R1], [0.56, 1.9, 0.18, R1], [1.32, -0.4, 0.32, R2], [1.18, -0.38, 0.47, R1], [0.96, 0.52, 0.33, R1], [0.86, -1.55, 0.38, R1], [0.5, -1.78, 0.38, R1], [0.44, -1.78, 0.38, R1], [0.46, 2.06, 0.28, R2]]) K.tube(gP, [-w, y, z], [w, y, z], rr);
  K.tube(gP, [-0.32, 1.32, -0.4], [0.47, 0.62, -0.36], R1);                                                                                                  /* harness diagonal */
  K.path(gP, [[-0.55, 0.46, -1.98], [0.55, 0.46, -1.98]], R2); for (const sx of [-1, 1]) K.tube(gP, [sx * 0.38, 0.47, -1.78], [sx * 0.5, 0.46, -1.98], R1);   /* rear bumper */
  /* panels: a small nose cone and bonnet, floor pan, side number boards, the dash */
  K.loft(gP, [{ z: 2.0, y: 0.5, a: 0.16, b: 0.05, e: 2.6 }, { z: 1.9, y: 0.52, a: 0.22, b: 0.08, e: 3 }, { z: 1.3, y: 0.56, a: 0.34, b: 0.1, e: 3.4 }, { z: 0.6, y: 0.62, a: 0.42, b: 0.1, e: 3.6 }], K.WH, { seg: lod ? 12 : 20, tA: 0, tB: Math.PI, cap: [1, 1] });
  K.blk(gD, 0, 0.31, 0.15, 0.9, 0.02, 1.6, DK);
  for (const sx of [-1, 1]) { K.blk(gD, sx * 0.47, 0.47, 0.12, 0.012, 0.26, 0.6, [0.9, 0.9, 0.88]); K.blk(gD, sx * 0.476, 0.47, 0.12, 0.006, 0.18, 0.3, BLK); }
  K.blk(gD, 0, 0.82, 0.5, 0.62, 0.14, 0.05, DK, -0.3); for (const dx of [-0.28, -0.16]) K.drum(gT, dx, 0.84, 0.48, 0.035, 0.01, CHR, 'z');
  /* two low buckets with red harnesses, a wheel, the gear lever */
  for (const sx of [-1, 1]) { const x = sx * 0.24; K.blk(gD, x, 0.42, -0.05, 0.4, 0.08, 0.44, BLK); K.blk(gD, x, 0.74, -0.3, 0.4, 0.62, 0.08, BLK, -0.35); for (const bx of [-1, 1]) K.blk(gD, x + bx * 0.1, 0.72, -0.22, 0.04, 0.5, 0.012, RED, -0.35); }
  torusAt(gD, -0.24, 0.84, 0.36, 0.15, 0.014, -1.25, 0, BLK, lod); K.tube(gD, [-0.24, 0.6, 0.62], [-0.24, 0.82, 0.38], 0.014, BLK); K.tube(gT, [0.02, 0.32, 0.1], [0.02, 0.6, 0.02], 0.01, CHR); K.ball(gD, 0.02, 0.6, 0.02, 0.03, 0.03, 0.03, BLK);
  /* the flat-four out the back: crankcase, two finned banks, fan shroud, pulley, twin carbs and filters, a chrome muffler with two upswept tips */
  const zE = -1.52; K.blk(gT, 0, 0.6, zE, 0.42, 0.3, 0.46, AL); K.drum(gD, 0, 0.42, -1.06, 0.14, 0.4, DK, 'x'); K.blk(gD, 0, 0.44, -1.15, 0.36, 0.2, 0.28, DK);   /* crankcase; transaxle */
  for (const sx of [-1, 1]) { K.blk(gD, sx * 0.3, 0.6, zE, 0.2, 0.22, 0.42, DK); for (let k = 0; k < 6; k++) K.blk(gT, sx * 0.3, 0.6, zE - 0.18 + k * 0.072, 0.22, 0.24, 0.012, AL); K.blk(gT, sx * 0.42, 0.6, zE, 0.05, 0.2, 0.4, AL); }
  K.loft(gT, [{ z: -1.3, y: 0.86, a: 0.36, b: 0.14, e: 2.6 }, { z: -1.38, y: 0.9, a: 0.4, b: 0.16, e: 2.6 }, { z: -1.66, y: 0.9, a: 0.4, b: 0.16, e: 2.6 }, { z: -1.72, y: 0.86, a: 0.36, b: 0.14, e: 2.6 }], [0.07, 0.07, 0.08], { seg: 16, cap: [1, 1] });   /* fan shroud */
  K.drum(gT, 0, 0.7, -1.78, 0.11, 0.03, CHR, 'z'); K.drum(gT, 0, 0.94, -1.74, 0.06, 0.03, CHR, 'z');
  for (const sx of [-1, 1]) { K.drum(gT, sx * 0.17, 1.02, -1.42, 0.04, 0.14, AL, 'y'); K.drum(gT, sx * 0.17, 1.14, -1.42, 0.1, 0.07, CHR, 'y'); }
  for (const sx of [-1, 1]) K.path(gT, [[sx * 0.32, 0.48, zE + 0.1], [sx * 0.3, 0.38, -1.72], [sx * 0.2, 0.42, -1.86]], 0.025, CHR);
  K.drum(gT, 0, 0.44, -1.88, 0.1, 0.5, CHR, 'x'); for (const sx of [-1, 1]) K.path(gT, [[sx * 0.22, 0.46, -1.9], [sx * 0.3, 0.62, -2.0], [sx * 0.33, 0.86, -2.02]], 0.03, CHR);
  /* lamps on the dash hoop, tail lamps, the front beam */
  for (const sx of [-1, 1]) { K.drum(gT, sx * 0.3, 1.02, 0.58, 0.075, 0.08, CHR, 'z'); K.drum(gLt, sx * 0.3, 1.02, 0.622, 0.064, 0.008, GL, 'z'); K.blk(tl, sx * 0.34, 0.52, -1.995, 0.08, 0.05, 0.01, GL); }
  for (const y of [0.38, 0.5]) K.drum(gD, 0, y, zF + 0.36, 0.045, 0.62, STL, 'x');
  /* moving parts: front trailing arms and dampers, rear trailing arms, drive shafts and coilovers, the whip */
  const arms = [], dmp = [];
  for (const sx of [-1, 1]) {
    for (const [lo, y0] of [[true, 0.38], [false, 0.5]]) { const id = 'fa' + sx + (lo ? 'l' : 'u'), p = S.part(id); K.tube(p.D, [0, 0, 0], [0, 1, 0], 0.022, STL); K.ball(p.D, 0, 1, 0, 0.04, 0.04, 0.04, DK); arms.push({ id, k: sx < 0 ? 0 : 1, A: [sx * 0.3, y0, zF + 0.36], x: sx * (xF - 0.13), dy: lo ? -0.06 : 0.07, z: zF }); }
    const kn = S.part('kn' + sx); K.blk(kn.D, 0, 0, 0, 0.06, 0.2, 0.08, STL); arms.push({ id: 'kn' + sx, k: sx < 0 ? 0 : 1, knuckle: true, x: sx * (xF - 0.12), z: zF });
    dmp.push({ q: rigDamper(S, K, 'f' + sx, { lb: 0.26, ls: 0.3, rb: 0.03, col: [0.72, 0.46, 0.08], coil: RED }), k: sx < 0 ? 0 : 1, A: [sx * 0.38, 0.84, zF + 0.08], arm: 'fa' + sx + 'l', t: 0.78 });
    const ta = S.part('ra' + sx); K.tube(ta.D, [0, 0, 0], [0, 1, 0], 0.035, STL); K.ball(ta.D, 0, 0, 0, 0.055, 0.055, 0.055, DK); K.drum(ta.D, 0, 1, 0, 0.09, 0.12, STL, 'x');
    arms.push({ id: 'ra' + sx, k: sx < 0 ? 2 : 3, A: [sx * 0.45, 0.4, -0.45], x: sx * (xR - 0.17), dy: 0, z: zR });
    const ds = S.part('rs' + sx); K.tube(ds.D, [0, 0, 0], [0, 1, 0], 0.024, DK); K.ball(ds.D, 0, 0, 0, 0.045, 0.045, 0.045, BLK); K.ball(ds.D, 0, 1, 0, 0.045, 0.045, 0.045, BLK);
    arms.push({ id: 'rs' + sx, k: sx < 0 ? 2 : 3, A: [sx * 0.16, rR + 0.05, zR + 0.02], x: sx * (xR - 0.2), dy: 0, z: zR + 0.02 });
    dmp.push({ q: rigDamper(S, K, 'r' + sx, { lb: 0.34, ls: 0.4, rb: 0.035, col: [0.72, 0.46, 0.08], coil: RED }), k: sx < 0 ? 2 : 3, A: [sx * 0.42, 1.0, zR + 0.18], arm: 'ra' + sx, t: 0.86 });
  }
  const whip = S.part('whip', [-0.32, 1.32, -0.4]); K.tube(whip.D, [-0.32, 1.32, -0.4], [-0.32, 2.55, -0.4], 0.007, BLK); K.blk(whip.P, -0.32, 2.45, -0.5, 0.01, 0.14, 0.18, K.WH);
  K.done();
  const st = { wx: 0, wxv: 0, wz: 0, wzv: 0, pv: [0, 0, 0, 0], ps: [0, 0, 0, 0] }, hub = (a, sus) => { const w = a.k < 2 ? rF : rR; return [a.x, w + sus[a.k] + (a.dy || 0), a.z]; }, ends = {};
  return (g, sus, cs, dt) => {
    const Pt = g.userData.parts; if (!Pt) return;
    for (const a of arms) { if (a.knuckle) { Pt[a.id].position.set(a.x, rF + sus[a.k], a.z); continue; } const B = hub(a, sus); rigPlace(Pt[a.id], a.A, B, true); ends[a.id] = [a.A, B]; }
    for (const d of dmp) { const e = ends[d.arm]; rigPoseDamper(Pt, d.q, d.A, rigLerp(e[0], e[1], d.t)); }
    if (cs && dt > 0) {
      const h = Math.min(dt, 0.05), sp = Math.abs(cs.speed || 0), ax = clamp(cs.axL || 0, -25, 25), ay = clamp(cs.ayL || 0, -25, 25); let kick = 0, side = 0;
      for (let k = 0; k < 4; k++) { const v = clamp((sus[k] - st.ps[k]) / h, -5, 5); st.ps[k] = sus[k]; kick += v * 0.25; if (k === 0 || k === 2) side += v; else side -= v; }
      st.wxv = rigSpring(st.wx, st.wxv, -Math.min(0.7, sp * 0.009) - ax * 0.01, 9, 0.05, h) + kick * 0.12; st.wx = clamp(st.wx + st.wxv * h, -1.0, 0.6);
      st.wzv = rigSpring(st.wz, st.wzv, ay * 0.014, 9, 0.05, h) + side * 0.06; st.wz = clamp(st.wz + st.wzv * h, -0.8, 0.8);
    }
    Pt.whip.rotation.set(st.wx, 0, st.wz);
  };
}

/* a rally hatch in the spirit of the wild short-wheelbase rally cars of the eighties: a stubby two-box body with box flares bolted over every wheel, a light
   pod of four lamps on the nose, a roof vent, a wing on the hatch, side intakes ahead of the rear wheels, quick-fill caps, mud flaps that swing */
function rallyHatch(S, gP, gG, gT, gD, gLt, tl, lod) {
  const K = carKit(lod), BLK = [0.012, 0.012, 0.014], DK = [0.03, 0.03, 0.034], CHR = [0.8, 0.81, 0.83], RED = [0.6, 0.05, 0.03], WHT = [0.9, 0.9, 0.88], GL = [1, 1, 1], AMB = [1, 0.7, 0.3], sg = lod ? 16 : 30, P = Math.PI;
  const wf = S.wheels.find((w) => w.front), wr = S.wheels.find((w) => !w.front), AX = [wf, wr], pad = 0.07;
  const B = { top: [[2.0, 0.62], [1.94, 0.74], [1.6, 0.82], [0.9, 0.88], [-1.6, 0.92], [-1.92, 0.9], [-2.0, 0.82]], bot: [[2.0, 0.36], [1.9, 0.24], [-1.9, 0.26], [-2.0, 0.38]],
    wid: [[2.0, 0.74], [1.9, 0.82], [1.4, 0.84], [-1.9, 0.84], [-2.0, 0.78]], exp: [[2.0, 4], [1.8, 5.5], [-2.0, 5.5]] };
  const body = bodySec(B, AX, pad), aw = (z) => tabZ(B.wid, z) + (Math.abs(z - wf.z) < 0.55 || Math.abs(z - wr.z) < 0.55 ? 0.1 : 0);
  K.loft(gP, bodyZs(2.0, -2.0, 0.06, AX, pad).map((z) => body(z)), K.WH, { seg: sg, cap: [1, 1] });
  wheelWells(K, gD, S, pad, 0.26, aw);
  const cab = cabSec([[0.95, 0.92, 0.74, 3], [0.9, 0.98, 0.74, 3], [0.45, 1.36, 0.7, 3.4], [0.2, 1.42, 0.68, 3.6], [-1.2, 1.42, 0.68, 3.6], [-1.5, 1.36, 0.7, 3.4], [-1.82, 1.12, 0.74, 3.2], [-1.92, 0.95, 0.74, 3]], 0.9);
  K.loft(gP, zRange(0.95, -1.92, 24).map((z) => cab(z)), K.WH, { seg: sg, tA: -0.08, tB: P + 0.08 });
  const glass = (z0, z1, n, a0, a1) => K.loft(gG, zRange(z0, z1, n).map((z) => cab(z, 1.012)), GL, { seg: 12, tA: a0, tB: a1 });
  glass(0.9, 0.46, 8, P * 0.15, P * 0.85); for (const [a0, a1] of [[P * 0.03, P * 0.38], [P * 0.62, P * 0.97]]) { glass(0.38, -0.42, 6, a0, a1); glass(-0.52, -1.38, 6, a0, a1); } glass(-1.55, -1.86, 5, P * 0.25, P * 0.75);
  /* box flares over every wheel: a squared hump standing proud of the body, with its edge trim */
  for (const sx of [-1, 1]) for (const w of AX) { const R = []; for (let k = 0; k <= 10; k++) { const t = 1 - 2 * k / 10, z = w.z + t * 0.6, sq = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 4)), 0.5); R.push({ z, x: sx * 0.86, y: w.r + 0.3, a: 0.04 + 0.12 * sq, b: 0.06 + 0.12 * sq, e: 5 }); } K.loft(gP, R, K.WH, { seg: 14, tA: sx > 0 ? -0.6 : P * 0.5, tB: sx > 0 ? P * 0.5 : P + 0.6 }); K.arc(gD, sx * 0.9, w.r, w.z, w.r + 0.1, 0.14, 0.1, P - 0.1, BLK); }
  /* nose: a black grille slot, rectangular lamps, a light pod of four on the bonnet's leading edge, a deep bumper with a red tow hook */
  K.blk(gD, 0, 0.56, 2.0, 0.9, 0.12, 0.02, BLK); for (const sx of [-1, 1]) { K.blk(gLt, sx * 0.55, 0.6, 1.98, 0.26, 0.1, 0.02, GL); K.blk(gLt, sx * 0.72, 0.6, 1.94, 0.06, 0.08, 0.02, AMB); }
  K.blk(gD, 0, 0.74, 1.96, 1.2, 0.18, 0.06, BLK); for (const x of [-0.45, -0.15, 0.15, 0.45]) { K.drum(gT, x, 0.76, 2.0, 0.085, 0.06, CHR, 'z'); K.drum(gLt, x, 0.76, 2.032, 0.072, 0.008, GL, 'z'); }
  K.blk(gD, 0, 0.32, 1.98, 1.6, 0.14, 0.12, DK); K.drum(gT, 0.5, 0.3, 2.06, 0.03, 0.06, RED, 'z');
  /* stripes over the top, number boards on the doors, a roof vent, mirrors, side intakes, quick-fill caps */
  const XS = [[-0.3, -0.18], [0.18, 0.3]]; topStripes(gD, (z) => body(z), 1.93, 0.92, 16, XS, 0.006, WHT); topStripes(gD, (z) => cab(z), 0.42, -1.45, 14, XS, 0.008, WHT);
  for (const sx of [-1, 1]) { K.blk(gD, sx * 0.847, 0.62, -0.05, 0.006, 0.26, 0.5, WHT); K.blk(gD, sx * 0.85, 0.62, -0.05, 0.004, 0.16, 0.22, BLK);
    K.blk(gD, sx * 0.85, 0.52, wr.z + 0.72, 0.03, 0.16, 0.28, BLK); K.drum(gT, sx * 0.72, 1.12, -1.6, 0.05, 0.02, CHR, 'x');
    K.tube(gD, [sx * 0.66, 1.02, 0.78], [sx * 0.84, 1.06, 0.74], 0.012, BLK); K.blk(gP, sx * 0.86, 1.08, 0.74, 0.08, 0.1, 0.14, K.WH); K.blk(gG, sx * 0.86, 1.08, 0.668, 0.07, 0.08, 0.005, GL); }
  K.blk(gD, 0, 1.44, -0.3, 0.42, 0.06, 0.5, BLK); K.blk(gD, 0, 1.46, -0.05, 0.36, 0.06, 0.01, DK);
  /* the hatch wing, tail lamps, twin pipes, a rear bumper */
  for (const sx of [-1, 1]) K.blk(gD, sx * 0.62, 1.36, -1.62, 0.02, 0.16, 0.3, BLK);
  K.blk(gD, 0, 1.46, -1.68, 1.34, 0.025, 0.32, BLK, -0.12); K.blk(gP, 0, 1.49, -1.84, 1.34, 0.012, 0.06, K.WH, -0.55);
  for (const sx of [-1, 1]) { K.blk(tl, sx * 0.6, 0.78, -2.0, 0.3, 0.12, 0.02, GL); K.drum(gT, sx * 0.3, 0.3, -2.02, 0.04, 0.12, CHR, 'z'); }
  K.blk(gD, 0, 0.42, -2.0, 1.56, 0.12, 0.1, DK);
  const flaps = []; for (const sx of [-1, 1]) for (const [w, y] of [[wf, 0.6], [wr, 0.6]]) { const z = w.z - w.r - 0.12, id = 'mf' + sx + (w.front ? 'f' : 'r'), f = S.part(id, [sx * Math.abs(w.x), y, z]); K.blk(f.D, sx * Math.abs(w.x), y - 0.2, z, 0.3, 0.4, 0.015, RED); K.blk(f.D, sx * Math.abs(w.x), y - 0.32, z - 0.01, 0.24, 0.05, 0.005, WHT); flaps.push({ id, k: (w.front ? 0 : 2) + (sx > 0 ? 1 : 0) }); }
  K.done();
  const st = { f: flaps.map(() => 0), fv: flaps.map(() => 0), ps: [0, 0, 0, 0] };
  return (g, sus, cs, dt) => {
    const Pt = g.userData.parts; if (!Pt) return;
    if (cs && dt > 0) { const h = Math.min(dt, 0.05), sp = Math.abs(cs.speed || 0); for (let i = 0; i < flaps.length; i++) { const k = flaps[i].k, v = clamp((sus[k] - st.ps[k]) / h, -5, 5); st.fv[i] = rigSpring(st.f[i], st.fv[i], Math.min(0.8, sp * 0.022), 10, 0.12, h) + v * 0.12; st.f[i] = clamp(st.f[i] + st.fv[i] * h, -0.3, 1.1); } for (let k = 0; k < 4; k++) st.ps[k] = sus[k]; }
    for (let i = 0; i < flaps.length; i++) Pt[flaps[i].id].rotation.x = st.f[i];
  };
}

/* a woodie surf wagon: a long fifties wagon with timber side panels framed in pale wood, a cream roof, a toothy chrome grille, round lamps, heavy bumpers
   with guards, three windows a side, and two surfboards on a roof rack */
function woodieWagon(S, gP, gG, gT, gD, gLt, tl, lod) {
  const K = carKit(lod), DK = [0.03, 0.03, 0.034], CHR = [0.85, 0.86, 0.88], WOOD = [0.36, 0.17, 0.06], MAPLE = [0.62, 0.42, 0.2], CREAM = [0.9, 0.86, 0.74], GL = [1, 1, 1], sg = lod ? 16 : 28, P = Math.PI;
  const wf = S.wheels.find((w) => w.front), wr = S.wheels.find((w) => !w.front), AX = [wf, wr], pad = 0.07;
  const B = { top: [[2.55, 0.72], [2.48, 0.88], [2.2, 0.95], [1.0, 1.0], [-2.4, 1.02], [-2.55, 0.95]], bot: [[2.55, 0.42], [2.45, 0.3], [-2.45, 0.32], [-2.55, 0.44]],
    wid: [[2.55, 0.78], [2.45, 0.88], [1.8, 0.93], [-2.4, 0.93], [-2.55, 0.88]], exp: [[2.55, 3.5], [2.3, 5], [-2.55, 5]] };
  const body = bodySec(B, AX, pad), aw = (z) => tabZ(B.wid, z);
  K.loft(gP, bodyZs(2.55, -2.55, 0.06, AX, pad).map((z) => body(z)), K.WH, { seg: sg, cap: [1, 1] });
  wheelWells(K, gD, S, pad, 0.32, aw);
  const cab = cabSec([[1.02, 1.02, 0.82, 4], [0.95, 1.1, 0.82, 4], [0.55, 1.52, 0.78, 4.5], [0.3, 1.6, 0.76, 5], [-2.3, 1.62, 0.78, 5], [-2.46, 1.55, 0.8, 4.5], [-2.52, 1.05, 0.82, 4]], 1.0);
  K.loft(gP, zRange(1.02, -2.52, 30).map((z) => cab(z)), K.WH, { seg: sg, tA: -0.06, tB: P + 0.06 });
  K.loft(gD, zRange(0.32, -2.32, 16).map((z) => cab(z, 1.006)), CREAM, { seg: 10, tA: P * 0.3, tB: P * 0.7 });   /* cream roof */
  const glass = (z0, z1, n, a0, a1) => K.loft(gG, zRange(z0, z1, n).map((z) => cab(z, 1.012)), GL, { seg: 12, tA: a0, tB: a1 });
  glass(0.94, 0.56, 8, P * 0.18, P * 0.82); for (const [z0, z1] of [[0.3, -0.52], [-0.64, -1.48], [-1.6, -2.3]]) for (const [a0, a1] of [[P * 0.04, P * 0.32], [P * 0.68, P * 0.96]]) glass(z0, z1, 4, a0, a1);
  K.blk(gG, 0, 1.32, -2.535, 1.2, 0.4, 0.01, GL);
  /* timber sides: dark panels framed in maple, one frame per door */
  for (const sx of [-1, 1]) { const x = sx * (aw(-0.9) + 0.006);
    for (const [z0, z1] of [[0.55, -0.6], [-0.6, -1.55], [-1.55, -2.4]]) { K.blk(gT, x, 0.68, (z0 + z1) / 2, 0.012, 0.32, z0 - z1 - 0.12, WOOD); }
    K.blk(gT, x + sx * 0.004, 0.86, -0.92, 0.014, 0.045, 2.96, MAPLE); K.blk(gT, x + sx * 0.004, 0.5, -0.92, 0.014, 0.045, 2.96, MAPLE); for (const z of [0.55, -0.6, -1.55, -2.4]) K.blk(gT, x + sx * 0.004, 0.68, z, 0.014, 0.4, 0.06, MAPLE);   /* kept low on the side, where it is upright */
    K.blk(gT, x + sx * 0.008, 0.76, -0.6 + 0.45, 0.01, 0.03, 0.1, CHR); K.blk(gT, x + sx * 0.008, 0.76, -1.55 + 0.45, 0.01, 0.03, 0.1, CHR); }
  K.blk(gT, 0, 0.7, -2.555, 1.5, 0.36, 0.012, WOOD); for (const y of [0.52, 0.88]) K.blk(gT, 0, y, -2.56, 1.52, 0.045, 0.014, MAPLE);   /* wooden tailgate */
  /* nose: a toothy chrome grille, round lamps in the wings, a hood ornament, heavy bumpers with guards */
  K.blk(gD, 0, 0.6, 2.55, 1.1, 0.26, 0.02, DK); K.blk(gT, 0, 0.6, 2.565, 1.14, 0.04, 0.02, CHR); for (let k = 0; k < 11; k++) K.blk(gT, -0.45 + k * 0.09, 0.58, 2.565, 0.04, 0.18, 0.03, CHR);
  for (const sx of [-1, 1]) { K.drum(gT, sx * 0.68, 0.82, 2.5, 0.1, 0.08, CHR, 'z'); K.drum(gLt, sx * 0.68, 0.82, 2.545, 0.085, 0.01, GL, 'z'); K.drum(gLt, sx * 0.5, 0.46, 2.6, 0.04, 0.02, [1, 0.7, 0.3], 'z'); }
  K.ball(gT, 0, 0.96, 2.38, 0.03, 0.04, 0.12, CHR);
  for (const [z, s] of [[2.64, 1], [-2.64, -1]]) { K.blk(gT, 0, 0.4, z, 1.8, 0.12, 0.08, CHR); for (const sx of [-1, 1]) { K.blk(gT, sx * 0.86, 0.4, z - s * 0.12, 0.08, 0.12, 0.26, CHR, 0, sx * s * 0.5); K.blk(gT, sx * 0.34, 0.48, z + s * 0.02, 0.07, 0.24, 0.08, CHR); } }
  for (const sx of [-1, 1]) { K.blk(gT, sx * (aw(1.0) + 0.006), 0.8, 1.4, 0.012, 0.025, 1.4, CHR); K.drum(tl, sx * 0.72, 0.9, -2.56, 0.07, 0.03, GL, 'z'); K.tube(gD, [sx * 0.8, 1.04, 0.95], [sx * 0.94, 1.1, 0.95], 0.012, CHR); K.ball(gT, sx * 0.96, 1.12, 0.95, 0.06, 0.045, 0.03, CHR); }
  /* the roof rack and two boards */
  for (const z of [0.15, -2.0]) { K.tube(gT, [-0.72, 1.7, z], [0.72, 1.7, z], 0.018, CHR); for (const sx of [-1, 1]) K.tube(gT, [sx * 0.72, 1.62, z], [sx * 0.72, 1.7, z], 0.016, CHR); }
  for (const [x, c] of [[-0.3, [0.95, 0.72, 0.18]], [0.3, [0.08, 0.55, 0.6]]]) {
    const R = []; for (let k = 0; k <= 12; k++) { const t = k / 12, z = 0.75 - t * 3.05, w = Math.sin(Math.min(1, t * 1.25 + 0.04) * P * 0.5) * (t > 0.82 ? 1 - (t - 0.82) * 2.4 : 1); R.push({ z, x, y: 1.76 + 0.06 * Math.pow(1 - t, 3), a: 0.03 + 0.25 * w, b: 0.012 + 0.025 * w, e: 2.2 }); }
    K.loft(gD, R, c, { seg: 16, cap: [0, 0] }); K.blk(gD, x, 1.79, -0.8, 0.012, 0.012, 2.6, [0.92, 0.9, 0.85]); K.blk(gD, x, 1.72, -2.1, 0.01, 0.12, 0.14, DK);   /* stringer, fin */
  }
  K.done();
}

/* a lowrider on air: a long, low sixties hardtop with skirts over the rear wheels, a long chrome spear, quad lamps and a wide grille, gold wire wheels,
   red tuck-and-roll inside. The body rides on air bags (rig): it lays down on the ground when parked, lifts to drive, wallows and bounces on its soft
   bags, and when it has stood still a while it hops its nose */
function lowRider(S, gP, gG, gT, gD, gLt, tl, lod) {
  const K = carKit(lod), BLK = [0.012, 0.012, 0.014], DK = [0.03, 0.03, 0.034], CHR = [0.88, 0.89, 0.9], GOLD = [0.85, 0.62, 0.22], RED = [0.45, 0.02, 0.03], GL = [1, 1, 1], sg = lod ? 16 : 30, P = Math.PI;
  const wf = S.wheels.find((w) => w.front), wr = S.wheels.find((w) => !w.front), pad = 0.05;
  const B = { top: [[2.7, 0.6], [2.62, 0.76], [2.3, 0.82], [0.85, 0.86], [-1.9, 0.86], [-2.5, 0.84], [-2.7, 0.76]], bot: [[2.7, 0.34], [2.55, 0.24], [-2.55, 0.24], [-2.7, 0.34]],
    wid: [[2.7, 0.86], [2.6, 0.94], [1.8, 0.98], [-2.2, 0.99], [-2.7, 0.9]], exp: [[2.7, 4], [2.4, 6], [-2.4, 6], [-2.7, 5]] };
  const body = bodySec(B, [wf], pad), aw = (z) => tabZ(B.wid, z);   /* arches only at the front: skirts cover the rear wheels */
  K.loft(gP, bodyZs(2.7, -2.7, 0.06, [wf], pad).map((z) => body(z)), K.WH, { seg: sg, cap: [1, 1] });
  wheelWells(K, gD, { wheels: S.wheels.filter((w) => w.front), hw: S.hw }, pad, 0.24, aw);
  const cab = cabSec([[0.85, 0.88, 0.82, 3.5], [0.75, 0.95, 0.82, 3.5], [0.35, 1.25, 0.78, 4], [0.1, 1.3, 0.76, 4.5], [-0.95, 1.3, 0.76, 4.5], [-1.2, 1.24, 0.78, 4], [-1.75, 0.92, 0.82, 3.5], [-1.85, 0.88, 0.82, 3.5]], 0.86);
  K.loft(gP, zRange(0.85, -1.85, 24).map((z) => cab(z)), K.WH, { seg: sg, tA: -0.06, tB: P + 0.06 });
  const glass = (z0, z1, n, a0, a1) => K.loft(gG, zRange(z0, z1, n).map((z) => cab(z, 1.012)), GL, { seg: 12, tA: a0, tB: a1 });
  glass(0.74, 0.38, 8, P * 0.16, P * 0.84); for (const [a0, a1] of [[P * 0.03, P * 0.36], [P * 0.64, P * 0.97]]) glass(0.3, -1.05, 8, a0, a1); glass(-1.22, -1.72, 8, P * 0.2, P * 0.8);
  /* pinstripes on the bonnet and boot, a long chrome spear, the belt moulding, fender skirts' trim */
  topStripes(gD, (z) => body(z), 2.55, 0.95, 16, [[-0.32, -0.3], [0.3, 0.32]], 0.006, GOLD); topStripes(gD, (z) => body(z), -1.95, -2.62, 6, [[-0.32, -0.3], [0.3, 0.32]], 0.006, GOLD);
  for (const sx of [-1, 1]) { K.blk(gT, sx * (aw(0) + 0.008), 0.62, 0.0, 0.014, 0.03, 4.6, CHR); K.blk(gT, sx * (aw(0) + 0.006), 0.77, -0.5, 0.01, 0.02, 3.6, CHR); K.blk(gT, sx * (aw(wr.z) + 0.008), 0.37, wr.z, 0.012, 0.025, 1.1, CHR); }
  /* nose: a wide grille with bars, quad lamps, a hood ornament, slim chrome bumpers */
  K.blk(gD, 0, 0.54, 2.7, 1.3, 0.2, 0.02, BLK); for (let k = 0; k < 4; k++) K.blk(gT, 0, 0.47 + k * 0.05, 2.712, 1.26, 0.012, 0.012, CHR);
  for (const sx of [-1, 1]) for (const xl of [0.62, 0.78]) { K.drum(gT, sx * xl, 0.58, 2.69, 0.075, 0.04, CHR, 'z'); K.drum(gLt, sx * xl, 0.58, 2.712, 0.064, 0.008, GL, 'z'); }
  K.ball(gT, 0, 0.84, 2.45, 0.03, 0.035, 0.14, CHR);
  for (const [z, s] of [[2.74, 1], [-2.74, -1]]) { K.blk(gT, 0, 0.36, z, 1.84, 0.07, 0.06, CHR); for (const sx of [-1, 1]) K.blk(gT, sx * 0.9, 0.36, z - s * 0.12, 0.08, 0.07, 0.26, CHR, 0, sx * s * 0.5); }
  for (const sx of [-1, 1]) { K.blk(tl, sx * 0.62, 0.64, -2.71, 0.34, 0.08, 0.02, GL); K.drum(gT, sx * 0.4, 0.26, -2.72, 0.035, 0.12, CHR, 'z'); K.tube(gD, [sx * 0.78, 0.9, 0.8], [sx * 0.94, 0.95, 0.8], 0.012, CHR); K.ball(gT, sx * 0.96, 0.97, 0.8, 0.055, 0.04, 0.03, CHR); }
  /* inside: red tuck-and-roll benches, a chain steering wheel */
  for (const z of [-0.15, -0.9]) { K.blk(gD, 0, 0.6, z, 1.4, 0.1, 0.46, RED); K.blk(gD, 0, 0.84, z - 0.23, 1.4, 0.4, 0.1, RED, -0.15); for (let k = 0; k < 6; k++) K.blk(gD, -0.6 + k * 0.24, 0.84, z - 0.28, 0.02, 0.36, 0.02, [0.3, 0.01, 0.02], -0.15); }
  torusAt(gT, -0.38, 0.92, 0.35, 0.14, 0.018, -1.1, 0, CHR, lod);
  /* the parts that do not ride on the air bags: the frame rails, the axles, the bags themselves */
  const ch = S.part('chassis');
  for (const sx of [-1, 1]) K.blk(ch.D, sx * 0.5, 0.2, 0, 0.1, 0.1, 4.6, DK);
  for (const w of [wf, wr]) { K.drum(ch.D, 0, w.r, w.z, 0.06, 2 * Math.abs(w.x) - 0.25, DK, 'x'); for (const sx of [-1, 1]) K.drum(ch.D, sx * 0.55, w.r + 0.08, w.z, 0.09, 0.08, BLK, 'y'); }
  K.done();
  const st = { y: -0.1, yv: 0, p: 0, pv: 0, r: 0, rv: 0, still: 0, ps: [0, 0, 0, 0] }, M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), C = new THREE.Vector3(0, 0.5, 0), V = new THREE.Vector3();
  return (g, sus, cs, dt) => {
    const dm = g.userData.dm; if (!dm) return;
    if (cs && dt > 0) {
      const h = Math.min(dt, 0.05), sp = Math.abs(cs.speed || 0), ax = clamp(cs.axL || 0, -25, 25), ay = clamp(cs.ayL || 0, -25, 25);
      st.still = sp < 0.4 ? st.still + h : 0;
      const hopOn = st.still > 4 && (st.still % 14) < 6, hop = hopOn ? Math.max(0, Math.sin((st.still % 14) * 3.2)) : 0;   /* after four seconds parked: six seconds of nose hops, then a rest */
      let kick = 0, side = 0; for (let k = 0; k < 4; k++) { const v = clamp((sus[k] - st.ps[k]) / h, -5, 5); st.ps[k] = sus[k]; kick += (k < 2 ? 1 : -1) * v; side += (k % 2 ? -1 : 1) * v; }
      st.yv = rigSpring(st.y, st.yv, sp < 1.5 && !hopOn ? -0.1 : 0.0, 3.6, 0.45, h); st.y += st.yv * h;   /* the bags let down when parked and pump up to drive */
      st.pv = rigSpring(st.p, st.pv, -ax * 0.006 - hop * 0.16, hopOn ? 9 : 5, hopOn ? 0.15 : 0.22, h) + kick * 0.04; st.p = clamp(st.p + st.pv * h, -0.2, 0.08);
      st.rv = rigSpring(st.r, st.rv, ay * 0.009, 5, 0.2, h) + side * 0.04; st.r = clamp(st.r + st.rv * h, -0.08, 0.08);
    }
    /* move every body mesh about the body's middle: up/down on the bags, nose up/down, side to side (the wheels and the chassis part stay put) */
    E.set(st.p, 0, st.r); Q.setFromEuler(E); V.copy(C).applyQuaternion(Q);
    for (const k in dm) { const m = dm[k]; m.quaternion.copy(Q); m.position.set(C.x - V.x, C.y - V.y + st.y, C.z - V.z); }
    if (g.userData.glowM) { g.userData.glowM.quaternion.copy(Q); g.userData.glowM.position.set(C.x - V.x, C.y - V.y + st.y, C.z - V.z); }
  };
}
CUSTOM_CARS.sandrail = sandRail; CUSTOM_CARS.rallyhatch = rallyHatch; CUSTOM_CARS.woodie = woodieWagon; CUSTOM_CARS.lowrider = lowRider;
