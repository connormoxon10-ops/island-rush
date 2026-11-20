/* ================= THE MOTORCYCLE =================
   An original sport-naked bike (the Viper 600) built with the car kit: a twin-spar frame, an inline four with a belly exhaust, a teardrop tank,
   a split seat and a short tail, an upside-down fork with the headlamp, bars and front mudguard on it (the 'fork' part steers with the front wheel),
   a swingarm with a monoshock, and a rider in a helmet and leathers (the 'rider' part: hidden from the first-person view and while you are off it).
   The physics is the car's, on a narrow track with the two wheels of each axle drawn as one; Moto.lean banks the bike into corners as a real one
   leans (atan of the sideways acceleration over g). */
const Moto = { lean: 0, fallen: 0 };
const isBike = (d) => !!(d && d.body && d.body.custom === 'moto');
function motoBike(S, gP, gG, gT, gD, gLt, tl, lod) {
  for (const w of S.wheels) w.x = w.side * 0.004;   /* the two wheels of each axle sit together: one tyre */
  const K = carKit(lod), wf = S.wheels.find((w) => w.front), wr = S.wheels.find((w) => !w.front), zF = wf.z, zR = wr.z, yA = S.wr;
  const DK = [0.03, 0.03, 0.035], BLK = [0.012, 0.012, 0.015], MET = [0.42, 0.43, 0.46], CHR = [0.78, 0.79, 0.82], GLD = [0.8, 0.58, 0.12], GL = [1, 1, 1];
  const head = [0, 1.0, zF - 0.24], piv = [0, 0.52, -0.2];
  /* frame: two spars from the steering head round the engine to the swingarm pivot, a subframe under the seat */
  for (const sx of [-1, 1]) {
    K.path(gT, [[sx * 0.05, head[1], head[2]], [sx * 0.15, 0.9, 0.22], [sx * 0.16, 0.74, -0.08], [sx * 0.12, piv[1], piv[2]]], 0.035, MET);
    K.path(gT, [[sx * 0.1, 0.8, -0.12], [sx * 0.09, 0.86, -0.52], [sx * 0.06, 0.9, zR - 0.02]], 0.016, DK);
    K.path(gD, [[sx * 0.11, piv[1], piv[2]], [sx * 0.1, yA + 0.02, zR]], 0.03, BLK);            /* swingarm */
    K.blk(gT, sx * 0.16, 0.36, -0.12, 0.03, 0.03, 0.26, CHR);                                    /* footpegs */
  }
  K.tube(gT, [0, 0.58, -0.24], [0, 0.84, -0.42], 0.04, MET); K.tube(gT, [0, 0.62, -0.28], [0, 0.78, -0.39], 0.055, GLD);   /* monoshock */
  /* engine: crankcase, a row of four cylinders leaning forward with fins, the radiator in front, the belly pipe to a short silencer */
  K.blk(gT, 0, 0.44, 0.12, 0.34, 0.24, 0.42, DK); K.blk(gT, 0, 0.66, 0.2, 0.3, 0.26, 0.24, MET, 0.25);
  for (let k = 0; k < 4; k++) K.blk(gT, 0, 0.6 + k * 0.05, 0.22 + k * 0.012, 0.34, 0.012, 0.27, [0.6, 0.61, 0.64], 0.25);
  K.blk(gD, 0, 0.72, 0.42, 0.38, 0.3, 0.05, BLK, 0.15);
  K.path(gT, [[0.06, 0.52, 0.34], [0.06, 0.3, 0.3], [0.04, 0.26, -0.05], [0.14, 0.34, -0.3]], 0.035, [0.55, 0.5, 0.45]);
  K.drum(gT, 0.17, 0.42, -0.46, 0.07, 0.36, [0.25, 0.25, 0.27], 'z'); K.drum(gD, 0.17, 0.42, -0.65, 0.05, 0.03, BLK, 'z'); carExh(0.17, 0.42, -0.66);
  /* bodywork: tank, seat, tail, belly pan */
  K.loft(gP, [{ z: 0.42, y: 0.98, a: 0.12, b: 0.07, e: 2.4 }, { z: 0.3, y: 1.02, a: 0.19, b: 0.12, e: 2.6 }, { z: 0.08, y: 1.0, a: 0.2, b: 0.12, e: 2.6 }, { z: -0.08, y: 0.94, a: 0.15, b: 0.08, e: 2.4 }], K.WH, { cap: [1, 1] });
  K.loft(gD, [{ z: -0.06, y: 0.9, a: 0.14, b: 0.04, e: 3 }, { z: -0.35, y: 0.92, a: 0.15, b: 0.045, e: 3 }, { z: -0.5, y: 0.97, a: 0.1, b: 0.04, e: 3 }], BLK, { cap: [1, 1] });
  K.loft(gP, [{ z: -0.42, y: 0.92, a: 0.12, b: 0.05, e: 2.4 }, { z: -0.62, y: 0.99, a: 0.09, b: 0.05, e: 2.4 }, { z: zR - 0.1, y: 1.03, a: 0.04, b: 0.025, e: 2.2 }], K.WH, { cap: [1, 1] });
  K.blk(tl, 0, 1.0, zR - 0.13, 0.08, 0.025, 0.01, GL, 0.3); K.blk(gT, 0, 0.82, zR - 0.08, 0.16, 0.12, 0.01, [0.9, 0.9, 0.86], -0.5);   /* tail lamp, number plate */
  K.arc(gD, 0, yA, zR, yA + 0.06, 0.12, -0.2 * Math.PI, 0.45 * Math.PI, BLK);                  /* hugger over the rear wheel */
  for (const sx of [-1, 1]) K.loft(gP, [{ z: 0.36, x: sx * 0.19, y: 0.7, a: 0.03, b: 0.12, e: 2.2 }, { z: 0.15, x: sx * 0.2, y: 0.74, a: 0.035, b: 0.13, e: 2.2 }, { z: 0.02, x: sx * 0.18, y: 0.8, a: 0.02, b: 0.07, e: 2.2 }], K.WH, { cap: [1, 1] });   /* radiator shrouds */
  /* the front end: it steers about the head */
  const F = S.part('fork', head);
  for (const sx of [-1, 1]) { K.tube(F.T, [sx * 0.085, head[1] + 0.04, head[2] + 0.02], [sx * 0.085, 0.62, zF - 0.08], 0.034, GLD); K.tube(F.T, [sx * 0.085, 0.62, zF - 0.08], [sx * 0.085, yA, zF], 0.026, BLK); }
  K.blk(F.T, 0, head[1] + 0.05, head[2], 0.26, 0.04, 0.1, MET); K.blk(F.T, 0, 0.84, head[2] + 0.06, 0.24, 0.04, 0.09, MET);
  K.tube(F.D, [-0.34, 1.08, head[2] - 0.06], [0.34, 1.08, head[2] - 0.06], 0.014, BLK); K.tube(F.T, [0, head[1] + 0.06, head[2]], [0, 1.08, head[2] - 0.06], 0.02, MET);
  for (const sx of [-1, 1]) { K.drum(F.D, sx * 0.3, 1.08, head[2] - 0.06, 0.024, 0.11, BLK, 'x'); K.tube(F.D, [sx * 0.2, 1.1, head[2] - 0.04], [sx * 0.26, 1.24, head[2] - 0.08], 0.008, BLK); K.blk(F.D, sx * 0.28, 1.25, head[2] - 0.09, 0.09, 0.05, 0.012, BLK); }
  K.loft(F.P, [{ z: head[2] + 0.02, y: 0.98, a: 0.13, b: 0.13, e: 2.2 }, { z: head[2] + 0.16, y: 0.96, a: 0.12, b: 0.12, e: 2.2 }, { z: head[2] + 0.22, y: 0.95, a: 0.09, b: 0.09, e: 2.2 }], K.WH, { cap: [0, 1] });   /* headlamp cowl */
  K.ball(F.L, 0, 0.95, head[2] + 0.225, 0.075, 0.075, 0.02, GL); K.blk(F.D, 0, 1.11, head[2] + 0.08, 0.16, 0.06, 0.02, BLK, -0.6);   /* lamp; little flyscreen */
  K.arc(F.P, 0, yA, zF, yA + 0.05, 0.13, 0.15 * Math.PI, 0.62 * Math.PI, K.WH);                 /* front mudguard */
  K.drum(F.T, 0, yA, zF, 0.15, 0.1, [0.6, 0.6, 0.62], 'x');                                    /* brake discs */
  /* the rider: helmet, leathers, jeans, boots, gloves on the bars */
  const R = S.part('rider', [0, 0, 0]), LTH = [0.06, 0.06, 0.07], JN = [0.12, 0.18, 0.32], SK = [0.75, 0.55, 0.42];
  K.loft(R.D, [{ z: -0.34, y: 1.0, a: 0.17, b: 0.1, e: 2.4 }, { z: -0.22, y: 1.18, a: 0.19, b: 0.12, e: 2.4 }, { z: -0.08, y: 1.36, a: 0.2, b: 0.11, e: 2.4 }, { z: 0.0, y: 1.44, a: 0.16, b: 0.08, e: 2.4 }], LTH, { cap: [1, 1] });   /* torso, leaning on the bars */
  K.ball(R.D, 0, 1.46, 0.0, 0.07, 0.06, 0.06, SK);
  K.ball(R.P, 0, 1.6, 0.04, 0.15, 0.15, 0.16, K.WH); K.ball(R.G, 0, 1.6, 0.11, 0.12, 0.08, 0.1, [0.15, 0.15, 0.18]);   /* helmet in the bike's colour, visor */
  for (const sx of [-1, 1]) {
    K.path(R.D, [[sx * 0.18, 1.4, -0.04], [sx * 0.24, 1.22, 0.14], [sx * 0.3, 1.1, head[2] - 0.06]], 0.045, LTH); K.ball(R.D, sx * 0.31, 1.09, head[2] - 0.06, 0.05, 0.045, 0.06, BLK);
    K.path(R.D, [[sx * 0.11, 0.98, -0.32], [sx * 0.19, 0.92, 0.06], [sx * 0.17, 0.42, -0.06]], 0.065, JN);
    K.blk(R.D, sx * 0.17, 0.4, -0.04, 0.09, 0.1, 0.24, BLK);
  }
  K.done();
  return function (o, sus, cs) {
    const P = o.userData.parts; if (!P) return;
    if (P.fork) P.fork.rotation.y = cs ? clamp(cs.delta || 0, -0.6, 0.6) * 0.9 : 0;
    if (P.rider) P.rider.visible = !(o.userData.wrec && o.userData.wrec.player && (Foot.on || (Cam.view === 0 && App.mode === 'play')));
  };
}
CUSTOM_CARS.moto = motoBike;
/* banking into corners (called from updateCamera once the body is placed); the car's own outward body roll is taken back out */
Moto.pose = function (dt, leanR) {
  if (!car.ext) return;
  if (!isBike(CUR)) { if (car.ext.rotation.z) car.ext.rotation.z = 0; Moto.lean = 0; return; }
  const want = Foot.on ? (Moto.fallen ? Moto.fallen * 1.36 : 0.1) : clamp(-Math.atan((car.ayL || 0) / 9.81), -0.8, 0.8) * clamp(Math.abs(car.speed) / 4, 0, 1);
  Moto.lean += (want - Moto.lean) * Math.min(1, dt * 7); car.ext.rotation.z = Moto.lean - leanR;
};
