/* ================= more hand-built cars: a muscle fastback, a mid-engined hypercar, a classic open roadster and an expedition 4x4 =================
   All original designs (no real make's shapes, names or badges). Like the cars in 06_carmodel.js they are built from the car kit; the bodies here are lofted
   from side-view tables (top line, bottom line, half width, squareness) with the wheel arches cut out of the bottom line. */

/* piecewise-linear lookup in a table of [z, v] rows, z descending */
const tabZ = (T, z) => { if (z >= T[0][0]) return T[0][1]; for (let i = 0; i < T.length - 1; i++) { const A = T[i], B = T[i + 1]; if (z >= B[0]) return A[1] + (B[1] - A[1]) * (z - A[0]) / (B[0] - A[0]); } return T[T.length - 1][1]; };
/* the body's bottom line, lifted round each wheel into an arch of radius r + pad */
function archLo(z, base, AX, pad) { let y = base; for (const w of AX) { const R = w.r + pad, d = z - w.z; if (Math.abs(d) < R) y = Math.max(y, w.r + Math.sqrt(R * R - d * d)); } return y; }
/* a section function z -> loft ring from tables { top, bot, wid, exp }; k > 1 gives a slightly larger copy for glass, stripes and other overlays */
function bodySec(P, AX, pad) {
  return (z, k) => { k = k || 1; const lo = archLo(z, tabZ(P.bot, z), AX, pad), hi = Math.max(tabZ(P.top, z), lo + 0.06), yc = (lo + hi) / 2; return { z, x: 0, y: yc, a: tabZ(P.wid, z) * k, b: (hi - lo) / 2 * k, e: tabZ(P.exp, z) }; };
}
/* a greenhouse / canopy section from rows [z, roof, half width, squareness] standing on a fixed belt height (the loft is drawn over the upper half only) */
function cabSec(T, belt) { const col = (j) => T.map((r) => [r[0], r[j]]); const R = col(1), A = col(2), E = col(3); return (z, k) => { k = k || 1; return { z, x: 0, y: belt, a: tabZ(A, z) * k, b: (tabZ(R, z) - belt) * k, e: tabZ(E, z) }; }; }
/* stations from z0 down to z1, with extra stations round each wheel arch so the arches come out round */
function bodyZs(z0, z1, step, AX, pad) {
  const s = [], n = Math.ceil((z0 - z1) / step); for (let i = 0; i <= n; i++) s.push(z0 + (z1 - z0) * i / n);
  for (const w of AX) { const R = w.r + pad; for (let i = 0; i <= 16; i++) s.push(w.z + R * Math.cos(Math.PI * i / 16)); s.push(w.z + R + 0.012, w.z - R - 0.012); }
  s.sort((a, b) => b - a); const out = []; for (const z of s) if (z <= z0 + 1e-6 && z >= z1 - 1e-6 && (!out.length || out[out.length - 1] - z > 0.006)) out.push(z); return out;
}
const zRange = (z0, z1, n) => Array.from({ length: n + 1 }, (_, i) => z0 + (z1 - z0) * i / n);
/* height of a ring's top surface at x */
function secTopY(r, x) { const u = Math.abs(x - (r.x || 0)) / r.a, y = u >= 1 ? -1e9 : r.y + r.b * Math.pow(1 - Math.pow(u, r.e), 1 / r.e); return r.under ? Math.max(y, secTopY(r.under, x)) : (u >= 1 ? r.y : y); }
/* a flat strip between two rows of points (stripes, decals), lit with per-segment normals that face 'up' */
function ribbonStrip(gb, L, R, c, up) {
  up = up || [0, 1, 0]; _tcol.setRGB(c[0], c[1], c[2]); const cr = _tcol.r, cg = _tcol.g, cb = _tcol.b;
  const tri = (A, B, C, n) => { const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2], f = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2];
    for (const W of (f < 0 ? [A, C, B] : [A, B, C])) gb.vtx(W[0], W[1], W[2], n[0], n[1], n[2], cr, cg, cb); };
  for (let i = 0; i < L.length - 1; i++) {
    const A = L[i], B = R[i], C = L[i + 1], D = R[i + 1], ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; if (nx * up[0] + ny * up[1] + nz * up[2] < 0) { nx = -nx; ny = -ny; nz = -nz; } const l = Math.hypot(nx, ny, nz) || 1, n = [nx / l, ny / l, nz / l];
    tri(A, B, D, n); tri(A, D, C, n);
  }
}
/* stripes along a body's top: pairs of x offsets, following the section function's surface */
function topStripes(gb, sec, z0, z1, n, xs, lift, c) { for (const [xa, xb] of xs) { const L = [], R = []; for (const z of zRange(z0, z1, n)) { const r = sec(z); L.push([xa, secTopY(r, xa) + lift, z]); R.push([xb, secTopY(r, xb) + lift, z]); } ribbonStrip(gb, L, R, c); } }
/* dark wheel-well liners round each wheel and a dark block filling the space between the wheels of each axle, so nobody sees through the arches */
function wheelWells(K, gb, S, pad, base, aw) {
  const BK = [0.012, 0.012, 0.014];
  for (const w of S.wheels) { const R = w.r + pad, xi = Math.abs(w.x) - w.w / 2 - 0.03, xo = Math.max(xi + 0.1, aw(w.z) - 0.008); K.arc(gb, w.side * (xi + xo) / 2, w.r, w.z, R - 0.014, xo - xi, 0.02, Math.PI - 0.02, BK); }
  for (const w of S.wheels) if (w.side > 0) { const R = w.r + pad, xi = Math.abs(w.x) - w.w / 2 - 0.04, top = w.r + R - 0.02; K.blk(gb, 0, (base + top) / 2, w.z, 2 * xi, top - base, 2 * R - 0.04, BK); }
}
const torusAt = (gb, x, y, z, R, r, rx, ry, c, lod) => { const g = ni(new THREE.TorusGeometry(R, r, lod ? 5 : 8, lod ? 14 : 24)); _q.setFromEuler(new THREE.Euler(rx, ry || 0, 0, 'YXZ')); _m4.compose(_p3.set(x, y, z), _q, _s3.set(1, 1, 1)); gb.geo(g, _m4, _tcol.setRGB(c[0], c[1], c[2]), 0); g.dispose(); };

/* a muscle car: a long-bonnet fastback with a power bulge and a shaker scoop through it, a recessed grille with four round lamps, a ducktail, a full-width
   tail panel, chrome blade bumpers, side scoops ahead of the rear wheels, twin stripes over the top and big tyres at the back */
function muscleCar(S, gP, gG, gT, gD, gLt, tl, lod) {
  const K = carKit(lod), BLK = [0.012, 0.012, 0.014], DK = [0.03, 0.03, 0.034], CHR = [0.82, 0.83, 0.85], GL = [1, 1, 1], STR = [0.86, 0.86, 0.84], sg = lod ? 16 : 32, P = Math.PI;
  const wf = S.wheels.find((w) => w.front), wr = S.wheels.find((w) => !w.front), AX = [wf, wr], pad = 0.07;
  const B = { top: [[2.42, 0.7], [2.37, 0.83], [2.2, 0.9], [1.6, 0.935], [0.62, 0.975], [-1.7, 0.99], [-2.2, 1.0], [-2.4, 1.045]],
    bot: [[2.42, 0.44], [2.3, 0.27], [-2.28, 0.29], [-2.4, 0.46]],
    wid: [[2.42, 0.8], [2.33, 0.9], [1.8, 0.94], [0.9, 0.95], [0.2, 0.93], [-0.7, 0.95], [-1.3, 0.97], [-2.1, 0.95], [-2.4, 0.88]],
    exp: [[2.42, 3.6], [2.2, 5], [-2.2, 5.4], [-2.4, 4.4]] };
  const body = bodySec(B, AX, pad), aw = (z) => tabZ(B.wid, z);
  K.loft(gP, bodyZs(2.42, -2.4, 0.06, AX, pad).map((z) => body(z)), K.WH, { seg: sg, cap: [1, 1] });
  wheelWells(K, gD, S, pad, 0.3, aw);
  /* fastback greenhouse: windscreen, roof, and one long slope to the ducktail */
  const cab = cabSec([[0.66, 0.99, 0.79, 3], [0.6, 1.04, 0.79, 3], [0.3, 1.22, 0.76, 2.8], [0.02, 1.35, 0.72, 2.6], [-0.3, 1.38, 0.71, 2.6], [-0.62, 1.36, 0.72, 2.6], [-1.0, 1.27, 0.75, 2.7], [-1.4, 1.16, 0.78, 2.8], [-1.8, 1.06, 0.8, 3], [-1.95, 1.0, 0.8, 3]], 0.965);
  K.loft(gP, zRange(0.66, -1.95, 26).map((z) => cab(z)), K.WH, { seg: sg, tA: -0.08, tB: P + 0.08 });
  const gk = 1.012, glass = (z0, z1, n, a0, a1) => K.loft(gG, zRange(z0, z1, n).map((z) => cab(z, gk)), GL, { seg: 12, tA: a0, tB: a1 });
  glass(0.6, 0.04, 8, P * 0.17, P * 0.83);                                                                               /* windscreen */
  for (const [a0, a1] of [[P * 0.03, P * 0.36], [P * 0.64, P * 0.97]]) glass(0.02, -0.66, 8, a0, a1);                   /* side windows */
  glass(-0.74, -1.62, 10, P * 0.3, P * 0.7);                                                                             /* fastback rear glass */
  for (const [a0, a1] of [[P * 0.16, P * 0.19], [P * 0.81, P * 0.84]]) K.loft(gT, zRange(0.6, 0.04, 6).map((z) => cab(z, 1.016)), CHR, { seg: 2, tA: a0, tB: a1 });   /* chrome along the A pillars */
  /* power bulge with a shaker scoop standing through it, hood pins */
  const bulge = (z) => ({ z, y: tabZ(B.top, z) - 0.04, a: 0.31, b: 0.042 + 0.05 * (2.12 - z) / 1.46, e: 3 });
  K.loft(gP, zRange(2.12, 0.66, 10).map(bulge), K.WH, { seg: sg, cap: [1, 0] });
  K.blk(gD, 0, 1.04, 1.12, 0.42, 0.11, 0.46, BLK); K.blk(gD, 0, 1.04, 1.352, 0.36, 0.07, 0.01, [0.002, 0.002, 0.002]); K.blk(gT, 0, 1.098, 1.12, 0.44, 0.014, 0.48, CHR);
  for (const sx of [-1, 1]) { K.drum(gT, sx * 0.55, secTopY(body(2.12), 0.55) + 0.005, 2.12, 0.025, 0.012, CHR, 'y'); K.tube(gT, [sx * 0.55, secTopY(body(2.12), 0.55) + 0.012, 2.1], [sx * 0.55, secTopY(body(2.0), 0.55) + 0.012, 2.0], 0.006, CHR); }
  /* stripes over bonnet, roof and tail */
  const XS = [[-0.25, -0.11], [0.11, 0.25]];
  topStripes(gD, (z) => { const r = body(z); if (z > 2.12 || z < 0.66) return r; const q = bulge(z); return { z, x: 0, y: q.y, a: q.a, b: q.b, e: q.e, under: r }; }, 2.36, 0.68, 30, XS, 0.006, STR); topStripes(gD, (z) => cab(z), 0.03, -0.72, 8, XS, 0.008, STR); topStripes(gD, (z) => cab(z), -1.64, -1.94, 4, XS, 0.008, STR); topStripes(gD, (z) => body(z), -1.96, -2.39, 5, XS, 0.006, STR);
  /* front: a recessed grille with four round lamps, a chrome blade bumper wrapping the corners, a dark valance */
  K.blk(gD, 0, 0.6, 2.418, 1.36, 0.2, 0.02, BLK); for (let k = 0; k < 4; k++) K.blk(gT, 0, 0.53 + k * 0.045, 2.426, 1.3, 0.008, 0.01, [0.4, 0.4, 0.42]);
  for (const sx of [-1, 1]) for (const xl of [0.38, 0.58]) { K.drum(gT, sx * xl, 0.6, 2.43, 0.082, 0.02, CHR, 'z'); K.drum(gLt, sx * xl, 0.6, 2.442, 0.066, 0.01, GL, 'z'); }
  K.blk(gT, 0, 0.4, 2.46, 1.56, 0.09, 0.08, CHR); for (const sx of [-1, 1]) K.blk(gT, sx * 0.82, 0.4, 2.38, 0.2, 0.09, 0.08, CHR, 0, sx * 0.6);
  K.blk(gD, 0, 0.28, 2.38, 1.5, 0.08, 0.06, DK); for (const sx of [-1, 1]) K.blk(gLt, sx * 0.62, 0.3, 2.415, 0.18, 0.04, 0.01, [1, 0.7, 0.3]);
  /* tail: a dark full-width panel with three lamps a side, a chrome bumper, the filler cap, quad tailpipes */
  K.blk(gD, 0, 0.82, -2.412, 1.6, 0.26, 0.02, BLK); for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) K.blk(tl, sx * (0.26 + k * 0.2), 0.82, -2.425, 0.17, 0.18, 0.01, GL);
  K.drum(gT, 0, 0.82, -2.43, 0.07, 0.02, CHR, 'z'); K.blk(gT, 0, 0.52, -2.46, 1.62, 0.09, 0.08, CHR); for (const sx of [-1, 1]) K.blk(gT, sx * 0.84, 0.52, -2.38, 0.2, 0.09, 0.08, CHR, 0, -sx * 0.6);
  for (const sx of [-1, 1]) for (const dx of [0.42, 0.56]) K.drum(gT, sx * dx, 0.33, -2.4, 0.045, 0.16, CHR, 'z');
  /* sides: scoops ahead of the rear wheels, a rocker strip, door shut lines and handles, mirrors */
  for (const sx of [-1, 1]) {
    const zs0 = wr.z + wr.r + pad + 0.06, xs = sx * (tabZ(B.wid, zs0 + 0.15) + 0.004);
    K.blk(gD, xs, 0.7, zs0 + 0.16, 0.02, 0.13, 0.3, BLK, 0, 0, 0); K.blk(gT, xs + sx * 0.008, 0.77, zs0 + 0.16, 0.012, 0.012, 0.32, CHR);
    K.blk(gT, sx * (aw(0) + 0.006), 0.35, (wf.z - wf.r - pad + wr.z + wr.r + pad) / 2, 0.012, 0.03, (wf.z - wf.r - pad) - (wr.z + wr.r + pad) - 0.1, CHR);
    for (const z of [0.6, -0.68]) K.blk(gD, sx * (aw(z) + 0.004), 0.66, z, 0.008, 0.6, 0.01, BLK);
    K.blk(gT, sx * (aw(-0.5) + 0.01), 0.88, -0.5, 0.02, 0.025, 0.14, CHR);
    K.tube(gT, [sx * 0.78, 1.0, 0.5], [sx * 0.92, 1.05, 0.48], 0.012, CHR); K.ball(gT, sx * 0.95, 1.07, 0.47, 0.06, 0.045, 0.05, CHR);
  }
  /* inside, seen through the glass: buckets, a wheel, a dash */
  for (const sx of [-1, 1]) { K.blk(gD, sx * 0.32, 1.0, -0.42, 0.42, 0.42, 0.1, DK, 0.2); K.blk(gD, sx * 0.32, 0.72, -0.2, 0.42, 0.1, 0.42, DK); }
  K.blk(gD, 0, 0.92, 0.5, 1.4, 0.12, 0.2, DK); torusAt(gD, -0.32, 0.98, 0.32, 0.16, 0.015, -1.0, 0, BLK, lod);
  K.done();
}

/* a hypercar: mid-engined and very low, a teardrop canopy set well forward, sculpted fender crowns, a waist cut deep into the body for the side intakes,
   a glass engine cover with louvres either side, a splitter and diffuser, slim lamps, a full-width light bar and a big wing on swan-neck mounts */
function hyperCar(S, gP, gG, gT, gD, gLt, tl, lod) {
  const K = carKit(lod), BLK = [0.012, 0.012, 0.014], CF = [0.025, 0.025, 0.03], TI = [0.42, 0.43, 0.45], CHR = [0.8, 0.8, 0.82], GL = [1, 1, 1], sg = lod ? 16 : 32, P = Math.PI;
  const wf = S.wheels.find((w) => w.front), wr = S.wheels.find((w) => !w.front), AX = [wf, wr], pad = 0.05;
  const B = { top: [[2.36, 0.4], [2.3, 0.48], [2.05, 0.6], [1.8, 0.72], [1.5, 0.78], [1.0, 0.77], [0.6, 0.76], [-0.2, 0.8], [-1.0, 0.88], [-1.8, 0.93], [-2.25, 0.95], [-2.36, 0.93]],
    bot: [[2.36, 0.22], [2.26, 0.12], [-1.7, 0.13], [-2.2, 0.3], [-2.36, 0.36]],
    wid: [[2.36, 0.84], [2.27, 0.95], [1.9, 1.0], [1.4, 1.02], [0.8, 0.98], [0.1, 0.9], [-0.6, 0.93], [-1.1, 1.01], [-1.6, 1.03], [-2.1, 1.0], [-2.36, 0.92]],
    exp: [[2.36, 2.8], [1.8, 3.2], [-2.36, 3.6]] };
  const body = bodySec(B, AX, pad), aw = (z) => tabZ(B.wid, z);
  K.loft(gP, bodyZs(2.36, -2.36, 0.06, AX, pad).map((z) => body(z)), K.WH, { seg: sg, cap: [1, 1] });
  wheelWells(K, gD, S, pad, 0.14, aw);
  /* fender crowns over each wheel */
  for (const sx of [-1, 1]) for (const [w, f0, f1, h] of [[wf, 0.62, 0.7, 0.05], [wr, 0.8, 0.95, 0.06]]) {
    const R = []; for (let k = 0; k <= 12; k++) { const t = 1 - 2 * k / 12, z = w.z + (t > 0 ? t * f0 : t * f1), sq = Math.sqrt(Math.max(0, 1 - t * t)); R.push({ z, x: sx * (Math.abs(w.x) - 0.06), y: tabZ(B.top, z) - 0.06, a: 0.06 + 0.18 * sq, b: 0.03 + h * sq + 0.03 * sq, e: 2.4 }); }
    K.loft(gP, R, K.WH, { seg: lod ? 10 : 18, tA: 0, tB: P });
  }
  /* canopy: a teardrop from the nose of the cockpit to a spine over the engine */
  const cab = cabSec([[1.32, 0.76, 0.5, 2.4], [1.15, 0.84, 0.6, 2.4], [0.8, 0.98, 0.66, 2.4], [0.35, 1.09, 0.67, 2.4], [-0.1, 1.12, 0.66, 2.4], [-0.5, 1.09, 0.62, 2.4], [-0.95, 1.02, 0.54, 2.4], [-1.45, 0.97, 0.42, 2.4], [-1.9, 0.955, 0.26, 2.4], [-2.08, 0.945, 0.1, 2.4]], 0.7);
  K.loft(gP, zRange(1.32, -2.08, 30).map((z) => cab(z)), K.WH, { seg: sg, tA: -0.1, tB: P + 0.1, cap: [0, 1] });
  const gk = 1.012, glass = (z0, z1, n, a0, a1) => K.loft(gG, zRange(z0, z1, n).map((z) => cab(z, gk)), GL, { seg: 12, tA: a0, tB: a1 });
  glass(1.2, 0.26, 10, P * 0.12, P * 0.88);                                                                              /* wraparound windscreen */
  for (const [a0, a1] of [[P * 0.05, P * 0.4], [P * 0.6, P * 0.95]]) glass(0.22, -0.5, 8, a0, a1);                        /* side glass */
  glass(-0.72, -1.55, 10, P * 0.3, P * 0.7);                                                                             /* glass engine cover */
  K.blk(gD, 0, 0.84, -1.1, 0.42, 0.18, 0.62, [0.08, 0.08, 0.09]); for (let k = 0; k < 4; k++) K.blk(gT, (k - 1.5) * 0.09, 0.95, -1.1, 0.06, 0.02, 0.55, [0.6, 0.06, 0.04]);   /* the engine under the glass */
  K.loft(gD, zRange(-0.05, -0.55, 4).map((z) => ({ z, y: tabZ([[-0.05, 1.125], [-0.55, 1.1]], z), a: 0.13, b: 0.05 + 0.03 * (-0.05 - z) / 0.5, e: 3 })), CF, { seg: 12, tA: 0, tB: P, cap: [1, 0] });   /* roof scoop */
  /* the waist: deep side intakes behind the doors, with vanes */
  for (const sx of [-1, 1]) { const a0 = sx > 0 ? -P * 0.14 : P * 0.78, a1 = sx > 0 ? P * 0.22 : P * 1.14; K.loft(gD, zRange(-0.08, -1.02, 10).map((z) => body(z, 1.01)), BLK, { seg: 8, tA: a0, tB: a1 });
    for (let k = 0; k < 3; k++) { const z = -0.3 - k * 0.24; K.blk(gD, sx * (aw(z) - 0.02), 0.46, z, 0.1, 0.36, 0.015, CF, 0, sx * 0.35); } }
  /* doors and mirrors on stalks */
  for (const sx of [-1, 1]) { for (const z of [1.18, -0.06]) K.blk(gD, sx * (aw(z) + 0.004), 0.48, z, 0.006, 0.5, 0.008, BLK);
    K.tube(gD, [sx * 0.66, 0.84, 0.95], [sx * 0.9, 0.86, 0.9], 0.012, CF); K.loft(gP, [{ z: 0.98, x: sx * 0.95, y: 0.86, a: 0.01, b: 0.01, e: 2 }, { z: 0.93, x: sx * 0.95, y: 0.86, a: 0.09, b: 0.045, e: 2.4 }, { z: 0.86, x: sx * 0.95, y: 0.86, a: 0.09, b: 0.045, e: 2.4 }], K.WH, { seg: 12, cap: [0, 1] }); }
  /* front: splitter, intakes, slim lamps, a short bonnet vent */
  K.blk(gD, 0, 0.1, 2.2, 1.8, 0.02, 0.3, CF); for (const sx of [-1, 1]) K.blk(gD, sx * 0.9, 0.16, 2.2, 0.02, 0.12, 0.4, CF);
  for (const sx of [-1, 1]) { K.blk(gD, sx * 0.48, 0.27, 2.33, 0.5, 0.15, 0.04, BLK, 0, -sx * 0.18); K.blk(gD, sx * 0.48, 0.27, 2.35, 0.48, 0.008, 0.01, CF, 0, -sx * 0.18); }
  K.blk(gD, 0, 0.27, 2.36, 0.3, 0.1, 0.02, BLK);
  for (const sx of [-1, 1]) { topStripes(gD, (z) => body(z), 2.2, 1.94, 6, [[sx > 0 ? 0.44 : -0.86, sx > 0 ? 0.86 : -0.44]], 0.004, BLK); topStripes(gLt, (z) => body(z), 2.17, 2.08, 3, [[sx > 0 ? 0.5 : -0.82, sx > 0 ? 0.82 : -0.5]], 0.008, GL); topStripes(gLt, (z) => body(z), 2.02, 1.98, 1, [[sx > 0 ? 0.56 : -0.8, sx > 0 ? 0.8 : -0.56]], 0.008, [1, 0.6, 0.2]); }
  for (let k = 0; k < 3; k++) K.blk(gD, 0, tabZ(B.top, 1.85 - k * 0.09) + 0.004, 1.85 - k * 0.09, 0.5, 0.008, 0.04, BLK, -0.3);
  /* engine-cover louvres either side of the glass */
  for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) { const z = -1.5 - k * 0.09, x = sx * 0.6; K.blk(gD, x, secTopY(body(z), 0.6) + 0.005, z, 0.38, 0.01, 0.045, BLK, -0.15); }
  /* tail: a dark mesh panel, a full-width light bar, two big centre exits, the diffuser with fins */
  K.blk(gD, 0, 0.62, -2.362, 1.7, 0.36, 0.02, BLK); for (let k = 0; k < 5; k++) K.blk(gD, 0, 0.48 + k * 0.07, -2.372, 1.66, 0.008, 0.01, CF);
  K.blk(tl, 0, 0.89, -2.37, 1.8, 0.03, 0.012, GL); for (const sx of [-1, 1]) K.blk(tl, sx * 0.88, 0.8, -2.36, 0.06, 0.16, 0.012, GL);
  for (const sx of [-1, 1]) { K.drum(gT, sx * 0.13, 0.66, -2.36, 0.075, 0.08, TI, 'z'); K.drum(gD, sx * 0.13, 0.66, -2.402, 0.058, 0.01, BLK, 'z'); }
  K.blk(gD, 0, 0.2, -2.04, 1.6, 0.02, 0.5, CF, -0.3); for (const fx of [-0.6, -0.3, 0, 0.3, 0.6]) K.blk(gD, fx, 0.17, -2.06, 0.012, 0.12, 0.44, CF, -0.3);
  /* the wing on swan necks */
  for (const sx of [-1, 1]) K.path(gD, [[sx * 0.42, secTopY(body(-1.78), 0.42) - 0.01, -1.78], [sx * 0.42, 1.18, -1.95], [sx * 0.42, 1.34, -2.1], [sx * 0.42, 1.31, -2.2]], 0.02, CF);
  K.blk(gD, 0, 1.3, -2.18, 1.84, 0.03, 0.4, CF, 0.1); K.blk(gP, 0, 1.34, -2.38, 1.84, 0.012, 0.08, K.WH, 0.6); for (const sx of [-1, 1]) K.blk(gD, sx * 0.93, 1.27, -2.2, 0.02, 0.24, 0.5, CF);
  /* cabin: two carbon buckets and a wheel */
  for (const sx of [-1, 1]) K.blk(gD, sx * 0.3, 0.72, -0.2, 0.4, 0.4, 0.1, CF, 0.35); K.blk(gD, 0, 0.74, 0.62, 1.1, 0.1, 0.24, CF); torusAt(gD, -0.3, 0.8, 0.4, 0.14, 0.014, -1.1, 0, BLK, lod);
  K.done();
}

/* a classic open roadster: a long rounded bonnet between raised front wings with the lamps faired into them, an oval grille in a chrome surround, a low
   framed windscreen, an open cockpit with tan leather, fairings behind the seats, slim chrome bumpers with overriders and wire wheels */
function roadster(S, gP, gG, gT, gD, gLt, tl, lod) {
  const K = carKit(lod), BLK = [0.012, 0.012, 0.014], DK = [0.03, 0.03, 0.034], CHR = [0.84, 0.85, 0.87], TAN = [0.32, 0.12, 0.04], WD = [0.22, 0.09, 0.03], GL = [1, 1, 1], sg = lod ? 16 : 30, P = Math.PI;
  const wf = S.wheels.find((w) => w.front), wr = S.wheels.find((w) => !w.front), AX = [wf, wr], pad = 0.06;
  const B = { top: [[2.12, 0.58], [2.05, 0.68], [1.7, 0.78], [1.0, 0.85], [0.45, 0.87], [-0.9, 0.86], [-1.6, 0.82], [-2.0, 0.72], [-2.12, 0.6]],
    bot: [[2.12, 0.42], [2.0, 0.27], [-1.95, 0.29], [-2.12, 0.44]],
    wid: [[2.12, 0.42], [2.0, 0.6], [1.6, 0.76], [1.1, 0.82], [0.6, 0.8], [-0.2, 0.78], [-0.8, 0.81], [-1.25, 0.83], [-1.8, 0.79], [-2.12, 0.6]],
    exp: [[2.12, 2.4], [1.6, 3.0], [0, 3.4], [-2.12, 2.6]] };
  const body = bodySec(B, AX, pad), aw = (z) => tabZ(B.wid, z);
  K.loft(gP, bodyZs(2.12, -2.12, 0.06, AX, pad).map((z) => body(z)), K.WH, { seg: sg, cap: [1, 1] });
  wheelWells(K, gD, S, pad, 0.3, aw);
  /* raised wings over all four wheels; the front ones run forward to carry the lamps */
  for (const sx of [-1, 1]) for (const [w, f0, f1, h] of [[wf, 0.84, 0.66, 0.07], [wr, 0.62, 0.78, 0.05]]) {
    const R = []; for (let k = 0; k <= 14; k++) { const t = 1 - 2 * k / 14, z = w.z + (t > 0 ? t * f0 : t * f1), sq = Math.sqrt(Math.max(0, 1 - t * t)); R.push({ z, x: sx * (Math.abs(w.x) - 0.06), y: tabZ(B.top, z) - 0.07, a: 0.04 + 0.14 * sq, b: 0.04 + (h + 0.04) * sq, e: 2.3 }); }
    K.loft(gP, R, K.WH, { seg: lod ? 12 : 20, tA: -0.1, tB: P + 0.1 });
  }
  /* faired headlamps with glass covers, small side lamps, three vents on each wing */
  for (const sx of [-1, 1]) { const x = sx * (Math.abs(wf.x) - 0.04), z = wf.z + 0.6, y = tabZ(B.top, z) + 0.0;
    K.drum(gT, x, y, z, 0.1, 0.07, CHR, 'z'); K.drum(gLt, x, y, z + 0.037, 0.085, 0.01, GL, 'z'); K.ball(gG, x, y, z + 0.03, 0.095, 0.095, 0.05, GL);
    K.drum(gT, sx * 0.42, 0.52, 2.04, 0.035, 0.03, CHR, 'z'); K.drum(gLt, sx * 0.42, 0.52, 2.057, 0.028, 0.006, [1, 0.7, 0.3], 'z');
    for (let k = 0; k < 3; k++) K.blk(gD, sx * (aw(0.85) + 0.004), 0.66 - k * 0.05, 0.85, 0.01, 0.018, 0.22, BLK, 0, 0, sx * 0.1); }
  /* oval grille: a dark mouth, bars, a chrome surround */
  { const gy = 0.5, ga = 0.27, gb = 0.085, pts = []; K.loft(gD, [{ z: 2.11, y: gy, a: ga, b: gb, e: 2.2 }, { z: 2.135, y: gy, a: ga, b: gb, e: 2.2 }], BLK, { seg: 24, cap: [0, 1] });
    for (let k = 0; k < 3; k++) K.blk(gT, 0, gy - 0.04 + k * 0.04, 2.14, ga * 1.8, 0.008, 0.01, CHR);
    for (let i = 0; i <= 20; i++) { const t = i / 20 * TAU; pts.push([Math.cos(t) * (ga + 0.015), gy + Math.sin(t) * (gb + 0.015), 2.138]); } K.path(gT, pts, 0.014, CHR); }
  /* bumpers: slim blades with overriders */
  for (const [z, s] of [[2.13, 1], [-2.13, -1]]) { K.blk(gT, 0, 0.47, z, 1.2, 0.05, 0.04, CHR); for (const sx of [-1, 1]) { K.blk(gT, sx * 0.3, 0.5, z + s * 0.01, 0.05, 0.14, 0.05, CHR); K.blk(gT, sx * 0.62, 0.47, z - s * 0.08, 0.05, 0.05, 0.18, CHR, 0, sx * s * 0.5); } }
  /* the cockpit: a dark opening with a padded rim, two tan buckets, a wooden wheel, a dash with dials */
  K.loft(gD, zRange(0.36, -0.86, 10).map((z) => body(z, 1.006)), BLK, { seg: 10, tA: P * 0.27, tB: P * 0.73 });
  K.loft(gD, zRange(0.38, -0.88, 12).map((z) => body(z, 1.01)), TAN, { seg: 2, tA: P * 0.25, tB: P * 0.27 }); K.loft(gD, zRange(0.38, -0.88, 12).map((z) => body(z, 1.01)), TAN, { seg: 2, tA: P * 0.73, tB: P * 0.75 });
  for (const sx of [-1, 1]) { K.blk(gD, sx * 0.3, 0.96, -0.62, 0.42, 0.3, 0.1, TAN, 0.22); K.ball(gD, sx * 0.3, 1.12, -0.66, 0.15, 0.06, 0.05, TAN); K.blk(gD, sx * 0.3, 0.86, -0.38, 0.42, 0.04, 0.4, TAN); }
  K.blk(gD, 0, 0.9, 0.3, 1.3, 0.08, 0.04, WD, -0.2); for (const dx of [-0.42, -0.2, 0.02]) { K.drum(gT, dx, 0.92, 0.28, 0.045, 0.01, CHR, 'z'); K.drum(gD, dx, 0.92, 0.274, 0.037, 0.006, [0.85, 0.83, 0.75], 'z'); }
  torusAt(gD, -0.3, 1.0, 0.12, 0.17, 0.014, -1.05, 0, WD, lod); for (let k = 0; k < 3; k++) { const a = -P / 2 + k * 2 * P / 3; K.tube(gT, [-0.3, 1.0, 0.12], [-0.3 + Math.cos(a) * 0.16, 1.0 + Math.sin(a) * 0.16 * 0.5, 0.12 + Math.sin(a) * 0.16 * 0.86], 0.006, CHR); }
  /* a low windscreen in a chrome frame */
  { const zw = 0.42, yb = tabZ(B.top, zw) - 0.01, h = 0.27, rx = -0.42, ty = yb + h * Math.cos(-rx), tzz = zw - h * Math.sin(-rx);
    K.blk(gG, 0, (yb + ty) / 2, (zw + tzz) / 2, 1.2, h, 0.012, GL, rx); K.path(gT, [[-0.62, yb, zw], [-0.62, ty, tzz], [0.62, ty, tzz], [0.62, yb, zw]], 0.014, CHR); K.tube(gT, [0, yb, zw], [0, ty, tzz], 0.008, CHR); }
  /* fairings behind the seats */
  for (const sx of [-1, 1]) K.loft(gP, zRange(-0.86, -1.7, 8).map((z, i) => { const u = i / 8, sq = Math.sqrt(Math.max(0, 1 - u * u)); return { z, x: sx * 0.3, y: tabZ(B.top, z) - 0.02, a: 0.06 + 0.13 * sq, b: 0.02 + 0.13 * sq, e: 2.4 }; }), K.WH, { seg: lod ? 10 : 18, tA: 0, tB: P, cap: [1, 0] });
  /* tail: round lamps on the rear wings, a chrome luggage rack on the boot, a filler cap, twin pipes */
  for (const sx of [-1, 1]) { const x = sx * (Math.abs(wr.x) - 0.04), z = wr.z - 0.66, y = tabZ(B.top, z) + 0.01; K.drum(gT, x, y, z, 0.062, 0.05, CHR, 'z'); K.drum(tl, x, y, z - 0.027, 0.05, 0.01, GL, 'z'); }
  { const yb = (z) => tabZ(B.top, z) + 0.03; for (const sx of [-1, 1]) K.path(gT, [[sx * 0.36, yb(-1.75) - 0.03, -1.75], [sx * 0.36, yb(-1.78), -1.78], [sx * 0.36, yb(-2.0), -2.0], [sx * 0.36, yb(-2.02) - 0.03, -2.02]], 0.01, CHR); for (const z of [-1.82, -1.9, -1.98]) K.tube(gT, [-0.36, yb(z), z], [0.36, yb(z), z], 0.008, CHR); }
  K.drum(gT, -0.5, secTopY(body(-1.5), 0.5) + 0.01, -1.5, 0.06, 0.02, CHR, 'y');
  for (const sx of [-1, 1]) K.drum(gT, sx * 0.3, 0.33, -2.08, 0.032, 0.16, CHR, 'z');
  for (const sx of [-1, 1]) { K.blk(gT, sx * (aw(-0.2) + 0.006), 0.62, -0.25, 0.01, 0.02, 1.1, CHR); K.tube(gT, [sx * 0.74, 0.86, 0.36], [sx * 0.84, 0.92, 0.36], 0.008, CHR); K.ball(gT, sx * 0.86, 0.93, 0.36, 0.055, 0.04, 0.03, CHR); }
  K.done();
}

/* an expedition 4x4: a square body on big knobby tyres, a steel bumper with a winch and a bull bar, a snorkel up the pillar, a roof rack carrying a tent
   box, jerry cans and a light bar, rock sliders, black flares and mud flaps, a ladder and a spare wheel on the back door */
function expedition4x4(S, gP, gG, gT, gD, gLt, tl, lod) {
  const K = carKit(lod), BLK = [0.012, 0.012, 0.014], DK = [0.035, 0.035, 0.038], STL = [0.08, 0.08, 0.085], CHR = [0.7, 0.71, 0.73], OL = [0.07, 0.1, 0.035], GL = [1, 1, 1], sg = lod ? 16 : 28, P = Math.PI;
  const wf = S.wheels.find((w) => w.front), wr = S.wheels.find((w) => !w.front), AX = [wf, wr], pad = 0.08;
  const B = { top: [[2.32, 1.08], [2.27, 1.26], [2.1, 1.33], [0.75, 1.37], [-2.25, 1.38], [-2.32, 1.3]],
    bot: [[2.32, 0.74], [2.25, 0.64], [-2.25, 0.64], [-2.32, 0.72]],
    wid: [[2.32, 0.92], [2.26, 0.98], [-2.26, 0.98], [-2.32, 0.94]], exp: [[2.32, 6], [2.2, 7], [-2.32, 7]] };
  const body = bodySec(B, AX, pad), aw = (z) => tabZ(B.wid, z);
  K.loft(gP, bodyZs(2.32, -2.32, 0.07, AX, pad).map((z) => body(z)), K.WH, { seg: sg, cap: [1, 1] });
  wheelWells(K, gD, S, pad, 0.62, aw);
  /* the cabin: an upright box with a raked screen */
  const cab = cabSec([[0.8, 1.39, 0.94, 6], [0.66, 1.6, 0.94, 6], [0.36, 2.0, 0.93, 6], [0.28, 2.06, 0.93, 6], [-2.12, 2.08, 0.95, 6], [-2.24, 2.04, 0.95, 6], [-2.3, 1.9, 0.95, 6], [-2.31, 1.4, 0.95, 6]], 1.36);
  K.loft(gP, [0.8, 0.73, 0.66, 0.56, 0.46, 0.36, 0.32, 0.28, ...zRange(0.2, -2.12, 12), -2.18, -2.24, -2.28, -2.3, -2.31].map((z) => cab(z)), K.WH, { seg: sg, tA: -0.06, tB: P + 0.06 });
  const gk = 1.008, glass = (z0, z1, n, a0, a1) => K.loft(gG, zRange(z0, z1, n).map((z) => cab(z, gk)), GL, { seg: 10, tA: a0, tB: a1 });
  glass(0.64, 0.33, 6, P * 0.2, P * 0.8);
  for (const [z0, z1] of [[0.2, -0.6], [-0.72, -1.45], [-1.57, -2.1]]) for (const [a0, a1] of [[P * 0.012, P * 0.16], [P * 0.84, P * 0.988]]) glass(z0, z1, 3, a0, a1);
  K.blk(gG, 0, 1.76, -2.318, 1.3, 0.34, 0.01, GL);
  for (const sx of [-1, 1]) for (const z of [0.25, -0.66, -1.5]) K.blk(gD, sx * (aw(z) + 0.004), 1.02, z, 0.008, 0.66, 0.01, BLK);   /* door shuts */
  for (const sx of [-1, 1]) for (const z of [-0.45, -1.3]) K.blk(gT, sx * (aw(z) + 0.012), 1.24, z, 0.02, 0.03, 0.14, CHR);
  /* front: grille slots, round lamps, a steel bumper with a winch, a bull bar, a skid plate */
  K.blk(gD, 0, 1.12, 2.322, 1.0, 0.28, 0.01, BLK); for (let k = 0; k < 7; k++) K.blk(gP, -0.42 + k * 0.14, 1.12, 2.326, 0.07, 0.26, 0.012, K.WH);
  for (const sx of [-1, 1]) { K.drum(gT, sx * 0.68, 1.12, 2.32, 0.13, 0.03, CHR, 'z'); K.drum(gLt, sx * 0.68, 1.12, 2.338, 0.11, 0.01, GL, 'z'); K.blk(gLt, sx * 0.88, 0.98, 2.322, 0.1, 0.05, 0.01, [1, 0.7, 0.3]); }
  K.blk(gD, 0, 0.74, 2.43, 2.06, 0.22, 0.24, STL); K.drum(gT, 0, 0.74, 2.56, 0.075, 0.52, DK, 'x'); K.blk(gD, 0, 0.74, 2.6, 0.24, 0.08, 0.04, CHR); K.ball(gT, 0, 0.66, 2.64, 0.035, 0.05, 0.03, [0.6, 0.06, 0.04]);
  for (const sx of [-1, 1]) { K.drum(gT, sx * 0.62, 0.66, 2.56, 0.04, 0.03, [0.6, 0.06, 0.04], 'x'); K.path(gD, [[sx * 0.56, 0.85, 2.52], [sx * 0.54, 1.3, 2.45], [sx * 0.2, 1.34, 2.44]], 0.035, STL); }
  K.tube(gD, [-0.2, 1.34, 2.44], [0.2, 1.34, 2.44], 0.035, STL); K.blk(gD, 0, 0.55, 2.0, 1.1, 0.03, 0.8, STL, 0.12);
  /* snorkel up the right pillar */
  K.path(gD, [[0.96, 1.2, 1.25], [1.0, 1.36, 1.0], [1.0, 1.62, 0.68], [0.98, 2.08, 0.34]], 0.05, BLK); K.blk(gD, 0.98, 2.16, 0.32, 0.14, 0.14, 0.22, BLK); K.blk(gD, 0.98, 2.16, 0.43, 0.12, 0.1, 0.01, DK);
  /* roof rack: rails, crossbars, legs; a tent box, two jerry cans, a light bar */
  const yr = 2.17; for (const sx of [-1, 1]) { K.tube(gD, [sx * 0.86, yr, 0.26], [sx * 0.86, yr, -2.12], 0.025, STL); for (const z of [0.2, -0.9, -2.06]) K.tube(gD, [sx * 0.86, yr, z], [sx * 0.88, 2.07, z], 0.02, STL); }
  for (const z of zRange(0.26, -2.12, 6)) K.tube(gD, [-0.86, yr, z], [0.86, yr, z], 0.018, STL);
  K.blk(gD, 0, yr + 0.15, -1.4, 1.5, 0.24, 1.3, [0.08, 0.08, 0.085]); K.blk(gD, 0, yr + 0.27, -1.4, 1.4, 0.02, 1.2, [0.12, 0.12, 0.13]); K.blk(gT, 0, yr + 0.15, -0.74, 1.2, 0.04, 0.02, [0.55, 0.3, 0.05]);
  for (const x of [-0.55, -0.3]) { K.blk(gD, x, yr + 0.1, -0.4, 0.17, 0.16, 0.42, OL); K.blk(gD, x, yr + 0.19, -0.24, 0.06, 0.04, 0.08, OL); }
  K.blk(gD, 0.45, yr + 0.07, -0.3, 0.36, 0.1, 0.5, [0.25, 0.04, 0.03]);   /* a red recovery bag */
  K.blk(gD, 0, yr + 0.06, 0.3, 1.4, 0.1, 0.07, BLK); for (let k = 0; k < 8; k++) K.blk(gLt, -0.6 + k * 0.1714, yr + 0.06, 0.336, 0.13, 0.06, 0.01, GL);
  /* sides: rock sliders, black flares, mud flaps, mirrors */
  for (const sx of [-1, 1]) {
    K.tube(gD, [sx * 1.0, 0.6, wf.z - wf.r - pad - 0.06], [sx * 1.0, 0.6, wr.z + wr.r + pad + 0.06], 0.045, STL); for (const z of [0.4, -0.5]) K.tube(gD, [sx * 1.0, 0.6, z], [sx * 0.8, 0.66, z], 0.03, STL);
    for (const w of [wf, wr]) { K.arc(gD, sx * (aw(w.z) + 0.04), w.r, w.z, w.r + pad + 0.03, 0.16, 0.08, P - 0.08, BLK); K.blk(gD, sx * Math.abs(w.x), 0.48, w.z - w.r - pad - 0.06, 0.32, 0.34, 0.015, BLK); }
    K.tube(gD, [sx * 0.94, 1.5, 0.66], [sx * 1.1, 1.62, 0.62], 0.015, BLK); K.blk(gD, sx * 1.14, 1.64, 0.6, 0.06, 0.2, 0.14, BLK); K.blk(gG, sx * 1.14, 1.64, 0.53, 0.05, 0.17, 0.005, GL);
  }
  /* back: steel bumper, tail lamps, a ladder, the spare wheel on its carrier */
  K.blk(gD, 0, 0.72, -2.4, 2.0, 0.2, 0.18, STL); for (const sx of [-1, 1]) { K.blk(tl, sx * 0.88, 1.2, -2.322, 0.12, 0.3, 0.01, GL); K.blk(gLt, sx * 0.88, 1.03, -2.322, 0.12, 0.05, 0.01, [1, 0.7, 0.3]); }
  K.path(gD, [[-0.72, 0.84, -2.36], [-0.72, 2.17, -2.36]], 0.02, STL); K.path(gD, [[-0.48, 0.84, -2.36], [-0.48, 2.17, -2.36]], 0.02, STL); for (let k = 0; k < 6; k++) K.tube(gD, [-0.72, 0.98 + k * 0.2, -2.36], [-0.48, 0.98 + k * 0.2, -2.36], 0.014, STL);
  K.blk(gD, 0.3, 1.25, -2.36, 0.08, 0.6, 0.06, STL); K.drum(gD, 0.3, 1.25, -2.52, 0.42, 0.28, BLK, 'z'); K.drum(gT, 0.3, 1.25, -2.52, 0.25, 0.29, [0.12, 0.12, 0.13], 'z'); K.drum(gT, 0.3, 1.25, -2.52, 0.08, 0.3, CHR, 'z');
  for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; K.blk(gD, 0.3 + Math.cos(a) * 0.42, 1.25 + Math.sin(a) * 0.42, -2.52 + (i % 2 ? 0.06 : -0.06), 0.04, 0.07, 0.12, BLK, 0, 0, a); }   /* tread blocks */
  K.done();
}
/* a trail 4x4 (an original design in the spirit of the classic open-top off-roader): a short boxy tub with deep wheel cut-outs, a flat bonnet between flat
   front wings standing clear over the wheels, an upright windscreen in a painted frame, an open top under a black roll cage, round lamps either side of a
   horizontal-bar grille, steel bumpers with red tow hooks, black flares, rock sliders and the spare wheel on the tailgate */
function trail4x4(S, gP, gG, gT, gD, gLt, tl, lod) {
  const K = carKit(lod), BLK = [0.012, 0.012, 0.014], DK = [0.03, 0.03, 0.034], STL = [0.06, 0.06, 0.065], CHR = [0.72, 0.73, 0.75], RED = [0.6, 0.05, 0.03], SEAT = [0.05, 0.05, 0.055], GL = [1, 1, 1], sg = lod ? 16 : 28, P = Math.PI;
  const wf = S.wheels.find((w) => w.front), wr = S.wheels.find((w) => !w.front), AX = [wf, wr], pad = 0.08, zC = 0.56;
  /* the tub, from the cowl back, and the bonnet in front of it */
  const T = { top: [[zC, 1.16], [-1.96, 1.16], [-2.0, 1.12]], bot: [[zC, 0.62], [-2.0, 0.66]], wid: [[zC, 0.84], [-2.0, 0.84]], exp: [[zC, 9], [-2.0, 9]] };
  const Hd = { top: [[1.98, 1.13], [1.92, 1.18], [zC, 1.24]], bot: [[1.98, 0.76], [zC, 0.74]], wid: [[1.98, 0.6], [zC, 0.62]], exp: [[1.98, 7], [zC, 8]] };
  const tub = bodySec(T, AX, pad), hood = bodySec(Hd, AX, pad), aw = (z) => (z > zC ? 0.62 : 0.84);
  K.loft(gP, bodyZs(zC, -2.0, 0.06, AX, pad).map((z) => tub(z)), K.WH, { seg: sg, cap: [1, 1] });
  K.loft(gP, bodyZs(1.98, zC - 0.04, 0.06, AX, pad).map((z) => hood(z)), K.WH, { seg: sg, cap: [1, 0] });
  wheelWells(K, gD, S, pad, 0.62, aw);
  /* open top: a dark floor inside the tub, with the tub's rolled top edge left in paint */
  K.loft(gD, zRange(zC - 0.06, -1.9, 10).map((z) => tub(z, 1.004)), SEAT, { seg: 8, tA: P * 0.16, tB: P * 0.84 });
  /* flat front wings standing out over the wheels, sloping down at the front, with black flares under their edges; a kick panel behind each */
  for (const sx of [-1, 1]) {
    const xm = sx * 0.81;
    K.blk(gP, xm, 1.03, (1.55 + zC) / 2, 0.42, 0.04, 1.55 - zC, K.WH);
    K.blk(gP, xm, 0.96, 1.77, 0.42, 0.04, 0.46, K.WH, -0.32);
    K.blk(gP, xm, 0.84, zC + 0.02, 0.42, 0.42, 0.04, K.WH);
    K.arc(gD, xm, wf.r, wf.z, wf.r + pad + 0.02, 0.44, 0.12, P - 0.2, BLK);
    K.blk(gD, sx * 1.025, 1.0, 1.2, 0.03, 0.06, 1.0, BLK);
    K.arc(gD, sx * 0.88, wr.r, wr.z, wr.r + pad + 0.03, 0.12, 0.08, P - 0.08, BLK);
    for (let k = 0; k < 3; k++) K.blk(gD, sx * 0.81, 1.056, 0.9 + k * 0.08, 0.3, 0.008, 0.03, BLK);   /* vents on the wing */
  }
  /* the front: a grille panel with horizontal bars between two round lamps, indicators, bonnet latches */
  K.blk(gP, 0, 0.95, 1.99, 1.16, 0.4, 0.03, K.WH);
  for (let k = 0; k < 5; k++) K.blk(gD, 0, 0.84 + k * 0.055, 2.006, 0.54, 0.03, 0.01, BLK);
  for (const sx of [-1, 1]) { K.drum(gT, sx * 0.44, 0.98, 2.0, 0.115, 0.04, CHR, 'z'); K.drum(gLt, sx * 0.44, 0.98, 2.022, 0.095, 0.01, GL, 'z'); K.blk(gLt, sx * 0.44, 0.82, 2.008, 0.12, 0.04, 0.01, [1, 0.7, 0.3]);
    K.blk(gD, sx * 0.61, 1.15, 1.72, 0.03, 0.08, 0.05, BLK); K.blk(gD, sx * 0.5, 1.205, 0.62, 0.06, 0.012, 0.08, BLK); }
  /* steel bumpers with red tow hooks; the tailgate's spare wheel */
  K.blk(gD, 0, 0.66, 2.1, 1.86, 0.16, 0.18, STL); for (const sx of [-1, 1]) { K.drum(gT, sx * 0.6, 0.6, 2.2, 0.035, 0.05, RED, 'x'); K.tube(gD, [sx * 0.62, 0.66, 2.0], [sx * 0.5, 0.74, 1.6], 0.03, STL); }
  K.blk(gD, 0, 0.66, -2.1, 1.82, 0.14, 0.16, STL); for (const sx of [-1, 1]) K.drum(gT, sx * 0.64, 0.6, -2.2, 0.035, 0.05, RED, 'x');
  K.blk(gD, 0, 1.0, -2.04, 0.1, 0.3, 0.1, STL); K.drum(gD, 0, 1.0, -2.22, 0.4, 0.26, BLK, 'z'); K.drum(gT, 0, 1.0, -2.23, 0.24, 0.27, [0.1, 0.1, 0.11], 'z'); K.drum(gT, 0, 1.0, -2.24, 0.07, 0.28, CHR, 'z');
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; K.blk(gD, Math.cos(a) * 0.4, 1.0 + Math.sin(a) * 0.4, -2.22 + (i % 2 ? 0.05 : -0.05), 0.04, 0.07, 0.12, BLK, 0, 0, a); }
  for (const sx of [-1, 1]) { K.blk(tl, sx * 0.7, 0.95, -2.006, 0.1, 0.16, 0.01, GL); K.blk(gLt, sx * 0.7, 0.83, -2.006, 0.1, 0.05, 0.01, [1, 0.7, 0.3]); }
  /* an upright windscreen in a painted frame, hinged at the cowl, mirrors on its posts */
  { const rx = -0.22, h = 0.56, yb = 1.18, zb = zC, yt = yb + h * Math.cos(rx), zt = zb + h * Math.sin(rx), ym = (yb + yt) / 2, zm = (zb + zt) / 2;
    K.blk(gG, 0, ym, zm, 1.5, h - 0.06, 0.012, GL, rx);
    for (const sx of [-1, 1]) { K.blk(gP, sx * 0.78, ym, zm, 0.06, h, 0.05, K.WH, rx); K.blk(gD, sx * 0.6, yb + 0.02, zb + 0.03, 0.08, 0.04, 0.06, BLK);
      K.tube(gD, [sx * 0.8, yb + 0.16, zb - 0.02], [sx * 1.0, yb + 0.2, zb + 0.02], 0.012, BLK); K.blk(gD, sx * 1.02, yb + 0.24, zb + 0.02, 0.07, 0.16, 0.03, BLK); }
    K.blk(gP, 0, yt, zt, 1.62, 0.06, 0.06, K.WH, rx); K.blk(gP, 0, yb + 0.03, zb, 1.62, 0.06, 0.06, K.WH, rx);
    /* the roll cage: from the screen header back over the seats to a rear hoop */
    for (const sx of [-1, 1]) K.path(gD, [[sx * 0.76, yt - 0.02, zt], [sx * 0.76, 1.74, -0.62], [sx * 0.76, 1.74, -1.88], [sx * 0.76, 1.16, -1.88]], 0.035, BLK);
    for (const sx of [-1, 1]) K.tube(gD, [sx * 0.76, 1.74, -0.62], [sx * 0.76, 1.16, -0.62], 0.035, BLK);
    for (const z of [-0.62, -1.88]) K.tube(gD, [-0.76, 1.74, z], [0.76, 1.74, z], 0.035, BLK); K.tube(gD, [-0.76, 1.74, -0.62], [0.76, 1.16, -1.88], 0.025, BLK); }
  /* inside: two buckets, a rear bench, a dash, a wheel and a gear lever */
  for (const sx of [-1, 1]) { K.blk(gD, sx * 0.38, 1.38, -0.42, 0.46, 0.5, 0.12, SEAT, 0.12); K.blk(gD, sx * 0.38, 1.18, -0.2, 0.46, 0.1, 0.44, SEAT); }
  K.blk(gD, 0, 1.33, -1.62, 1.4, 0.4, 0.12, SEAT, 0.1); K.blk(gD, 0, 1.17, -1.4, 1.4, 0.1, 0.4, SEAT);
  K.blk(gD, 0, 1.28, 0.4, 1.52, 0.14, 0.18, DK); torusAt(gD, -0.38, 1.42, 0.2, 0.17, 0.016, -1.15, 0, BLK, lod); K.tube(gD, [0, 1.17, 0.05], [0, 1.4, -0.02], 0.012, BLK);
  /* sides: rock sliders, door hinges and shut lines, a filler cap */
  for (const sx of [-1, 1]) { K.tube(gD, [sx * 0.9, 0.62, wf.z - wf.r - pad - 0.04], [sx * 0.9, 0.62, wr.z + wr.r + pad + 0.04], 0.04, STL); for (const z of [0.3, -0.4]) K.tube(gD, [sx * 0.9, 0.62, z], [sx * 0.78, 0.66, z], 0.03, STL);
    for (const y of [0.8, 1.04]) K.blk(gD, sx * 0.85, y, 0.48, 0.03, 0.06, 0.1, BLK); for (const z of [0.54, -0.62]) K.blk(gD, sx * 0.843, 0.9, z, 0.006, 0.5, 0.01, BLK); K.blk(gD, sx * 0.845, 1.05, -0.5, 0.012, 0.03, 0.1, BLK); }
  K.drum(gT, -0.845, 1.0, -1.5, 0.06, 0.02, [0.3, 0.3, 0.32], 'x');
  K.done();
}
/* a rally-raid truck (an original design in the spirit of the desert-rally trucks): a cab-over cab perched over the front axle, an engine and service
   module behind it with snorkels and a stack, two spare wheels upright on a rack, a box body at the back with sand ladders, fuel tanks between the axles,
   and the running gear in full view: two solid axles that tilt with the ground, two long-travel dampers a corner (a coilover and a bypass damper with
   its tubes), four trailing links an axle. The cab sits on its own springs and rocks on the chassis; a whip antenna and the mud flaps swing.
   Everything that moves is a part (S.part) posed by the rig this builder returns: it runs every frame from the wheels' travel and the truck's motion. */
function rallyTruck(S, gP, gG, gT, gD, gLt, tl, lod) {
  const K = carKit(lod), BLK = [0.012, 0.012, 0.014], DK = [0.03, 0.03, 0.034], STL = [0.07, 0.07, 0.075], CHR = [0.8, 0.81, 0.83], AL = [0.5, 0.51, 0.53], RED = [0.62, 0.05, 0.03], GOLD = [0.72, 0.46, 0.08], ORG = [0.8, 0.34, 0.04], WHT = [0.88, 0.88, 0.86], GL = [1, 1, 1], PI = Math.PI, sg = lod ? 14 : 24;
  const wf = S.wheels.find((w) => w.front), wb = S.wheels.find((w) => !w.front), xW = Math.abs(wf.x), r = wf.r, zF = wf.z, zR = wb.z;
  const ring = (z, lo, hi, a, e) => ({ z, x: 0, y: (lo + hi) / 2, a, b: (hi - lo) / 2, e });
  const coil = (gb, c) => { for (let k = 0; k < 8; k++) { const g = ni(new THREE.TorusGeometry(0.105, 0.018, 4, lod ? 8 : 12)); _q.setFromEuler(new THREE.Euler(PI / 2, 0, 0)); _m4.compose(_p3.set(0, (k + 0.5) / 8, 0), _q, _s3.set(1, 1, 1)); gb.geo(g, _m4, _tcol.setRGB(c[0], c[1], c[2]), 0); g.dispose(); } };
  /* ---- chassis: ladder frame, bumpers, steps, fenders, fuel tanks ---- */
  for (const sx of [-1, 1]) K.blk(gD, sx * 0.5, 1.12, -0.15, 0.13, 0.26, 6.7, STL);
  for (const z of [3.1, zF + 0.6, zF - 0.6, 0.6, -0.6, zR + 0.6, zR - 0.6, -3.35]) K.blk(gD, 0, 1.12, z, 1.0, 0.16, 0.12, STL);
  K.blk(gD, 0, 1.02, 3.6, 2.3, 0.3, 0.24, STL); K.blk(gD, 0, 0.8, 3.3, 1.3, 0.04, 0.8, STL, -0.45);   /* front bumper and skid plate */
  for (const sx of [-1, 1]) { K.drum(gT, sx * 0.72, 0.96, 3.74, 0.05, 0.08, RED, 'z'); K.blk(gD, sx * 0.9, 1.3, 3.55, 0.12, 0.34, 0.06, STL); }
  for (const sx of [-1, 1]) for (const y of [1.28, 1.56]) K.blk(gD, sx * 1.06, y, 1.18, 0.3, 0.035, 0.36, STL);   /* steps up to the door */
  for (const sx of [-1, 1]) for (const z of [zF, zR]) K.arc(gD, sx * xW, r, z, r + 0.47, 0.5, PI * 0.3, PI * 0.7, BLK);   /* black fenders over the top of each wheel, clear of it at full bump */
  for (const sx of [-1, 1]) { K.blk(gD, sx * 0.5, 1.43, 0.53, 0.16, 0.36, 1.62, STL); K.blk(gD, sx * 0.5, 1.45, -2.56, 0.16, 0.4, 1.94, STL); K.blk(gD, sx * 0.5, 1.4, -0.9, 0.16, 0.3, 1.2, STL); }   /* subframes under the module, the rack and the box */
  for (const sx of [-1, 1]) for (const z of [3.15, 1.6]) { K.blk(gD, sx * 0.5, 1.5, z, 0.14, 0.5, 0.14, STL); K.drum(gD, sx * 0.5, 1.72, z, 0.09, 0.1, BLK, 'y'); }   /* cab mounts: posts and rubber bushes */
  for (const sx of [-1, 1]) { K.drum(gT, sx * 0.95, 1.3, -0.05, 0.28, 1.7, AL, 'z'); for (const z of [-0.7, 0.6]) K.drum(gD, sx * 0.95, 1.3, z, 0.29, 0.05, BLK, 'z'); K.drum(gT, sx * 0.95, 1.6, 0.4, 0.05, 0.05, CHR, 'y'); }
  /* shock towers and link brackets on the frame */
  for (const z of [zF, zR]) for (const sx of [-1, 1]) for (const dz of [-0.2, 0.2]) { K.blk(gD, sx * 0.62, 1.52, z + dz, 0.2, 0.36, 0.08, STL); K.blk(gD, sx * 0.7, 1.7, z + dz, 0.14, 0.06, 0.12, STL); }
  /* ---- the engine and service module behind the cab: louvres, two snorkels, the stack ---- */
  K.loft(gP, [ring(1.32, 1.62, 2.9, 1.04, 8), ring(1.28, 1.6, 2.98, 1.08, 9), ring(-0.22, 1.6, 2.98, 1.08, 9), ring(-0.26, 1.62, 2.9, 1.04, 8)], K.WH, { seg: sg, cap: [1, 1] });
  for (const sx of [-1, 1]) { for (let k = 0; k < 5; k++) K.blk(gD, sx * 1.085, 2.0 + k * 0.12, 0.55, 0.012, 0.035, 0.95, BLK); K.path(gD, [[sx * 0.72, 2.95, 0.55], [sx * 0.72, 3.5, 0.55], [sx * 0.72, 3.62, 0.72]], 0.09, BLK); K.drum(gD, sx * 0.72, 3.62, 0.78, 0.11, 0.12, DK, 'z'); }
  K.path(gT, [[0.9, 1.45, 0.25], [1.14, 1.7, 0.1], [1.14, 3.55, 0.1]], 0.075, CHR); K.blk(gD, 1.23, 2.5, 0.1, 0.02, 1.0, 0.22, BLK);
  /* two spare wheels standing on a rack */
  K.blk(gD, 0, 1.66, -0.9, 2.1, 0.06, 1.25, STL);
  for (const x of [-0.3, 0.3]) { K.drum(gD, x, 2.3, -0.9, 0.6, 0.38, BLK, 'x'); K.drum(gT, x, 2.3, -0.9, 0.36, 0.39, DK, 'x'); K.drum(gT, x, 2.3, -0.9, 0.1, 0.4, CHR, 'x');
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; K.blk(gD, x + (i % 2 ? 0.09 : -0.09), 2.3 + Math.sin(a) * 0.6, -0.9 + Math.cos(a) * 0.6, 0.12, 0.07, 0.05, BLK, a); } }
  for (const sx of [-1, 1]) K.path(gD, [[sx * 0.62, 1.7, -0.3], [sx * 0.62, 2.95, -0.45], [sx * 0.62, 2.95, -1.4], [sx * 0.62, 1.7, -1.5]], 0.03, STL);
  K.tube(gD, [-0.62, 2.95, -0.45], [0.62, 2.95, -0.45], 0.03, STL); K.tube(gD, [-0.62, 2.95, -1.4], [0.62, 2.95, -1.4], 0.03, STL);
  /* ---- the box body at the back: roller door, ladder, sand ladders, lamps, bumper ---- */
  K.loft(gP, [ring(-1.58, 1.74, 2.92, 1.16, 8), ring(-1.62, 1.72, 3.0, 1.2, 9), ring(-3.5, 1.72, 3.0, 1.2, 9), ring(-3.55, 1.74, 2.92, 1.16, 8)], K.WH, { seg: sg, cap: [1, 1] });
  for (let k = 0; k < 9; k++) K.blk(gD, 0, 1.85 + k * 0.12, -3.556, 1.9, 0.012, 0.01, DK);
  K.path(gD, [[-0.95, 1.75, -3.6], [-0.95, 3.0, -3.6]], 0.02, STL); K.path(gD, [[-0.72, 1.75, -3.6], [-0.72, 3.0, -3.6]], 0.02, STL); for (let k = 0; k < 6; k++) K.tube(gD, [-0.95, 1.9 + k * 0.2, -3.6], [-0.72, 1.9 + k * 0.2, -3.6], 0.014, STL);
  for (const sx of [-1, 1]) { K.blk(gD, sx * 1.215, 2.36, -2.55, 0.03, 0.36, 1.6, ORG); for (let k = 0; k < 7; k++) K.blk(gD, sx * 1.235, 2.36, -3.25 + k * 0.23, 0.01, 0.3, 0.05, BLK);
    K.blk(tl, sx * 1.0, 1.9, -3.556, 0.16, 0.2, 0.01, GL); K.blk(gLt, sx * 1.0, 2.06, -3.556, 0.16, 0.06, 0.01, [1, 0.7, 0.3]); K.blk(gLt, sx * 0.72, 1.86, -3.556, 0.1, 0.08, 0.01, GL); }
  K.blk(gD, 0, 1.2, -3.6, 2.2, 0.22, 0.2, STL); K.drum(gD, 0, 1.12, -3.74, 0.06, 0.12, STL, 'z');
  /* ---- the cab: a part on its own springs ---- */
  const cab = S.part('cab', [0, 1.78, 2.4]);
  K.loft(cab.P, [ring(3.5, 1.82, 3.0, 1.1, 6), ring(3.45, 1.78, 3.14, 1.2, 8), ring(3.25, 1.78, 3.36, 1.22, 8), ring(1.42, 1.78, 3.38, 1.22, 8), ring(1.36, 1.82, 3.3, 1.16, 7)], K.WH, { seg: sg, cap: [1, 1] });
  K.blk(cab.G, 0, 2.68, 3.506, 1.96, 0.56, 0.015, GL); K.blk(cab.P, 0, 2.68, 3.514, 0.06, 0.56, 0.012, K.WH);
  K.blk(cab.D, 0, 3.08, 3.6, 2.1, 0.03, 0.26, BLK, -0.12);   /* sun visor */
  K.blk(cab.D, 0, 2.08, 3.506, 1.5, 0.42, 0.012, BLK); for (let k = 0; k < 5; k++) K.blk(cab.T, 0, 1.93 + k * 0.075, 3.512, 1.42, 0.022, 0.012, AL);
  for (const sx of [-1, 1]) { K.drum(cab.T, sx * 0.97, 2.12, 3.5, 0.11, 0.04, CHR, 'z'); K.drum(cab.L, sx * 0.97, 2.12, 3.522, 0.09, 0.01, GL, 'z'); K.blk(cab.L, sx * 0.97, 1.92, 3.508, 0.16, 0.06, 0.01, [1, 0.7, 0.3]); }
  K.blk(cab.D, 0, 3.48, 3.18, 1.9, 0.16, 0.22, BLK); for (let i = 0; i < 6; i++) { const x = -0.8 + i * 0.32; K.drum(cab.T, x, 3.48, 3.29, 0.068, 0.02, CHR, 'z'); K.drum(cab.L, x, 3.48, 3.302, 0.056, 0.006, GL, 'z'); }   /* roof light pod */
  K.blk(cab.P, 0, 3.47, 2.0, 0.9, 0.18, 1.0, K.WH); K.blk(cab.D, 0, 3.47, 2.505, 0.8, 0.13, 0.012, BLK);   /* roof scoop */
  for (const sx of [-1, 1]) {
    K.blk(cab.G, sx * 1.222, 2.76, 2.75, 0.012, 0.5, 1.0, GL); K.blk(cab.D, sx * 1.224, 2.42, 2.2, 0.006, 1.15, 0.012, BLK); K.blk(cab.D, sx * 1.224, 2.42, 3.28, 0.006, 1.15, 0.012, BLK); K.blk(cab.T, sx * 1.23, 2.36, 2.35, 0.02, 0.03, 0.14, CHR);
    K.drum(cab.D, sx * 1.224, 2.12, 2.74, 0.27, 0.004, BLK, 'x'); K.drum(cab.D, sx * 1.228, 2.12, 2.74, 0.24, 0.004, WHT, 'x');   /* number roundel */
    K.tube(cab.D, [sx * 1.2, 2.62, 3.2], [sx * 1.5, 2.76, 3.32], 0.02, BLK); K.blk(cab.D, sx * 1.52, 2.74, 3.32, 0.07, 0.34, 0.2, BLK); K.blk(cab.G, sx * 1.52, 2.74, 3.218, 0.06, 0.3, 0.005, GL);
  }
  for (const sx of [-1, 1]) K.blk(cab.D, sx * 0.5, 2.6, 3.0, 0.5, 0.5, 0.12, DK, 0.15);   /* seats seen through the screen */
  /* the whip antenna and its flag, on the cab's rear corner */
  const whip = S.part('whip', [-1.05, 3.4, 1.5], 'cab'); K.tube(whip.D, [-1.05, 3.4, 1.5], [-1.05, 5.1, 1.5], 0.008, BLK); K.drum(whip.D, -1.05, 3.42, 1.5, 0.03, 0.05, BLK, 'y'); K.blk(whip.P, -1.05, 4.98, 1.4, 0.01, 0.16, 0.2, K.WH);
  /* ---- running gear: axles, dampers, links, mud flaps (all parts) ---- */
  const AX = {};
  for (const [nm, z, front] of [['axF', zF, true], ['axR', zR, false]]) {
    const a = S.part(nm, [0, r, z]); AX[nm] = z;
    K.drum(a.D, 0, r, z, 0.09, 2 * xW - 0.3, DK, 'x'); K.ball(a.D, 0.12, r, z, 0.25, 0.23, 0.23, DK); K.drum(a.T, 0.12, r, z + (front ? -0.24 : 0.24), 0.1, 0.12, AL, 'z');
    for (const sx of [-1, 1]) { K.drum(a.D, sx * (xW - 0.24), r, z, 0.17, 0.16, STL, 'x'); for (const dz of [-0.2, 0.2]) K.blk(a.D, sx * 0.7, r + 0.1, z + dz, 0.16, 0.05, 0.14, STL); }
    if (front) K.tube(a.D, [-(xW - 0.3), r - 0.06, z + 0.26], [xW - 0.3, r - 0.06, z + 0.26], 0.026, STL);
  }
  const shocks = [], links = [];
  for (const [ax, z, sgn] of [['axF', zF, -1], ['axR', zR, 1]]) for (const sx of [-1, 1]) {
    for (const [dz, coilover] of [[-0.2, true], [0.2, false]]) {
      const id = ax + sx + dz, bo = S.part('sb' + id), sh = S.part('ss' + id);
      K.drum(bo.T, 0, 0.27, 0, coilover ? 0.065 : 0.058, 0.54, coilover ? GOLD : BLK, 'y'); K.drum(bo.T, 0, 0.03, 0, 0.075, 0.06, AL, 'y');
      if (coilover) K.drum(bo.T, 0.1, 0.2, 0, 0.04, 0.28, GOLD, 'y'); else for (const ox of [-0.075, 0.075]) K.tube(bo.T, [ox, 0.06, 0], [ox, 0.48, 0], 0.014, AL);   /* piggyback reservoir, or bypass tubes */
      K.drum(sh.T, 0, 0.32, 0, 0.026, 0.64, CHR, 'y'); K.drum(sh.T, 0, 0.03, 0, 0.05, 0.06, STL, 'y');
      const q = { ax, sx, z: z + dz, body: 'sb' + id, shaft: 'ss' + id, coil: null };
      if (coilover) { const c = S.part('sc' + id); coil(c.P, K.WH); q.coil = 'sc' + id; }
      shocks.push(q);
    }
    for (const [lo, A, x, dy] of [[true, [sx * 0.55, 0.92, z + sgn * 1.05], sx * 0.62, -0.12], [false, [sx * 0.3, 1.1, z + sgn * 0.8], sx * 0.3, 0.17]]) {
      const id = 'ln' + ax + sx + (lo ? 'l' : 'u'), l = S.part(id); K.tube(l.D, [0, 0, 0], [0, 1, 0], lo ? 0.042 : 0.034, STL); K.ball(l.D, 0, 0, 0, 0.06, 0.06, 0.06, DK); K.ball(l.D, 0, 1, 0, 0.06, 0.06, 0.06, DK);
      links.push({ ax, A, x, dy, z, part: id });
    }
  }
  const flaps = []; for (const sx of [-1, 1]) for (const [z, y] of [[zF - r - 0.5, 1.5], [zR - r - 0.5, 1.3]]) { const id = 'fl' + sx + z.toFixed(1), f = S.part(id, [sx * xW, y, z]); K.blk(f.D, sx * xW, y - 0.36, z, 0.44, 0.72, 0.02, BLK); K.blk(f.D, sx * xW, y - 0.62, z - 0.012, 0.36, 0.08, 0.005, WHT); flaps.push({ part: id, rear: z < 0 }); }
  K.done();
  /* ---- the rig ---- */
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), st = { cp: 0, cpv: 0, cr: 0, crv: 0, wx: 0, wxv: 0, wz: 0, wzv: 0, f: flaps.map(() => 0), fv: flaps.map(() => 0), pF: 0, pR: 0, pT: 0 };
  const place = (o, A, B, stretch) => { d.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]); const L = d.length(); if (L < 1e-4) return; o.position.set(A[0], A[1], A[2]); o.quaternion.setFromUnitVectors(up, d.multiplyScalar(1 / L)); o.scale.set(1, stretch ? L : 1, 1); };
  const pt = (s, x, dy, z) => { const c = Math.cos(s.th), sn = Math.sin(s.th); return [x * c - dy * sn, r + s.m + dy * c + x * sn, z]; };
  const spring = (x, v, want, w, zt, h) => v + (w * w * (want - x) - 2 * zt * w * v) * h;
  return (g, sus, cs, dt) => {
    const Pt = g.userData.parts; if (!Pt) return;
    const SA = { axF: { m: (sus[0] + sus[1]) / 2, th: Math.atan2(sus[1] - sus[0], 2 * xW) }, axR: { m: (sus[2] + sus[3]) / 2, th: Math.atan2(sus[3] - sus[2], 2 * xW) } };
    Pt.axF.position.y = r + SA.axF.m; Pt.axF.rotation.z = SA.axF.th; Pt.axR.position.y = r + SA.axR.m; Pt.axR.rotation.z = SA.axR.th;
    /* dampers: the body hangs from the frame and points at the axle, the shaft stands on the axle and points at the frame, the coil spans the two seats */
    for (const q of shocks) { const s = SA[q.ax], A = [q.sx * 0.7, 1.68, q.z], B = pt(s, q.sx * 0.7, 0.13, q.z); place(Pt[q.body], A, B, false); place(Pt[q.shaft], B, A, false);
      if (q.coil) { d.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]).normalize(); place(Pt[q.coil], [A[0] + d.x * 0.12, A[1] + d.y * 0.12, A[2] + d.z * 0.12], [B[0] - d.x * 0.1, B[1] - d.y * 0.1, B[2] - d.z * 0.1], true); } }
    for (const l of links) place(Pt[l.part], l.A, pt(SA[l.ax], l.x, l.dy, l.z), true);
    /* the cab on its mounts, the whip and the flaps: springs driven by the truck's acceleration and by how fast the axles are moving */
    if (cs && dt > 0) {
      const h = Math.min(dt, 0.05), vF = clamp((SA.axF.m - st.pF) / h, -6, 6), vR = clamp((SA.axR.m - st.pR) / h, -6, 6), vT = clamp((SA.axF.th + SA.axR.th - st.pT) / h, -5, 5);
      st.pF = SA.axF.m; st.pR = SA.axR.m; st.pT = SA.axF.th + SA.axR.th;
      const ax = clamp(cs.axL || 0, -25, 25), ay = clamp(cs.ayL || 0, -25, 25), sp = Math.abs(cs.speed || 0);
      st.cpv = spring(st.cp, st.cpv, -ax * 0.0032, 7.5, 0.2, h) + (vF - vR) * 0.045; st.cp += st.cpv * h; if (Math.abs(st.cp) > 0.07) { st.cp = Math.sign(st.cp) * 0.07; st.cpv *= -0.35; }   /* the rubber bump stops: it bounces off them */
      st.crv = spring(st.cr, st.crv, ay * 0.0045, 7.0, 0.2, h) + vT * 0.08; st.cr += st.crv * h; if (Math.abs(st.cr) > 0.06) { st.cr = Math.sign(st.cr) * 0.06; st.crv *= -0.35; }
      st.wxv = spring(st.wx, st.wxv, -Math.min(0.6, sp * 0.007) - ax * 0.008, 10, 0.06, h) + vF * 0.05 - st.cpv * 0.3 * h * 10; st.wx = clamp(st.wx + st.wxv * h, -0.9, 0.6);
      st.wzv = spring(st.wz, st.wzv, ay * 0.012, 10, 0.06, h) + vT * 0.12; st.wz = clamp(st.wz + st.wzv * h, -0.7, 0.7);
      for (let i = 0; i < flaps.length; i++) { st.fv[i] = spring(st.f[i], st.fv[i], Math.min(0.75, sp * 0.02), 9, 0.14, h) + (flaps[i].rear ? vR : vF) * 0.09; st.f[i] = clamp(st.f[i] + st.fv[i] * h, -0.3, 1.0); }
    }
    Pt.cab.rotation.set(st.cp, 0, st.cr); Pt.whip.rotation.set(st.wx, 0, st.wz);
    for (let i = 0; i < flaps.length; i++) Pt[flaps[i].part].rotation.x = st.f[i];
  };
}
CUSTOM_CARS.muscle = muscleCar; CUSTOM_CARS.hyper = hyperCar; CUSTOM_CARS.roadster = roadster; CUSTOM_CARS.overland = expedition4x4; CUSTOM_CARS.trail = trail4x4; CUSTOM_CARS.rtruck = rallyTruck;
