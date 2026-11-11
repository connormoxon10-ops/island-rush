const L = require('./wkt.js')(); const { WK, WKSim } = L; const wf = require('./wkfly.js'); const H = wf(L);
const spec = JSON.parse(JSON.stringify(WK.PRESETS[2])); const C = WK.compile(spec);
const HM = WK.HOME, SUN = WK.SUN; const TB = WK.BY[process.argv[2] || 'rust']; const dvp = +(process.argv[3] || 1087);
const o = WK.orbitState(HM, 100e3);
function cand(ut, a, dv) {
  const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180), r = [o.r[0] * c - o.r[1] * s, o.r[0] * s + o.r[1] * c, 0], v0 = [o.v[0] * c - o.v[1] * s, o.v[0] * s + o.v[1] * c, 0], vl = Math.hypot(...v0), v = [v0[0] / vl * (vl + dv), v0[1] / vl * (vl + dv), 0];
  return { r, v };
}
function miss(ut, a, dv) {
  const { r, v } = cand(ut, a, dv); const ex = WK.predict(HM, r, v, ut, 4e6); if (!ex || ex.kind !== 'exit') return { d: 1e15 }; const st = { r: [0, 0, 0], v: [0, 0, 0] }, tp = [0, 0, 0]; let best = 1e15, bt = 0;
  for (let t = 0; t < 4.5e7; t += 2e5) { WK.kepler(ex.r, ex.v, SUN.mu, t, st); WK.absPos(TB, ex.ut + t, tp); const d = Math.hypot(st.r[0] - tp[0], st.r[1] - tp[1]); if (d < best) { best = d; bt = t; } }
  let lo = Math.max(0, bt - 2e5), hi = bt + 2e5; const f = (t) => { WK.kepler(ex.r, ex.v, SUN.mu, t, st); WK.absPos(TB, ex.ut + t, tp); return Math.hypot(st.r[0] - tp[0], st.r[1] - tp[1]); };
  for (let k = 0; k < 60; k++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (f(m1) < f(m2)) hi = m2; else lo = m1; } return { d: f((lo + hi) / 2), t: (lo + hi) / 2, ex };
}
let best = { d: 1e15 };
for (let a = 0; a < 360; a += 0.5) { const m = miss(0, a, dvp); if (m.d < best.d) best = { a, ...m }; }
console.log('coarse', best.a, (best.d / 1e6).toFixed(0), 'Mm');
let a0 = best.a, step = 0.5, dv = dvp, ut = 0;
for (let it = 0; it < 60; it++) { let imp = false; for (const [da, ddv] of [[step, 0], [-step, 0], [0, 4], [0, -4]]) { const m = miss(ut, a0 + da, dv + ddv); if (m.d < best.d) { best = { a: a0 + da, ...m, dv: dv + ddv }; a0 += da; dv += ddv; imp = true; break; } } if (!imp) step /= 2; if (step < 1e-4) break; }
console.log('refined a', a0.toFixed(4), 'dv', dv.toFixed(1), 'miss Mm', (best.d / 1e6).toFixed(2), 'SOI Mm', (TB.soi / 1e6).toFixed(1));
const { r, v } = cand(ut, a0, dv); const sim = new WKSim(C, { body: HM, ut, activate: false }); sim.setState(r, v, [0, 0, 0, 1], [0, 0, 0]); sim.derive(); const ev = []; let n = 0;
while (sim.B !== TB && n++ < 4e6) { sim.warp(1 / 60, sim.B === SUN ? 100000 : 3000); if (sim.warpStop) { console.log('warp stop in', sim.B.id, 'alt', sim.info.alt); break; } while (sim.ev.length) ev.push(sim.ev.shift() + '@' + ((sim.ut - ut) / 86400).toFixed(1) + 'd'); if (sim.ut - ut > 9e7) break; }
console.log('events', ev.join(' '), '| now in', sim.B.id, 'pe', sim.B === TB ? (sim.info.orb.pe / 1000).toFixed(0) + ' km' : '-');
// --- cross-check
{
  const sim2 = new WKSim(C, { body: HM, ut, activate: false }); sim2.setState(r, v, [0, 0, 0, 1], [0, 0, 0]); sim2.derive();
  let n2 = 0; while (sim2.B === HM && n2++ < 1e5) sim2.warp(1 / 60, 3000);
  const S2 = sim2.S; console.log('sim2 now in', sim2.B.id, 'ut d', (sim2.ut / 86400).toFixed(3));
  const p = WK.predict(sim2.B, [S2[0], S2[1], S2[2]], [S2[3], S2[4], S2[5]], sim2.ut, 2e8);
  console.log('predict', p && { kind: p.kind, body: p.body && p.body.id, d: ((p.ut - ut) / 86400).toFixed(2), r: Math.hypot(...p.r).toFixed(0), pe_km: (p.orb.pe / 1000).toFixed(0), e: p.orb.e });
  const S = sim.S; const q = WK.orbitIn(TB, [S[0], S[1], S[2]], [S[3], S[4], S[5]], {}); console.log('sim at entry: |r|', Math.hypot(S[0], S[1], S[2]).toFixed(0), 'SOI', TB.soi.toFixed(0), '|v|', Math.hypot(S[3], S[4], S[5]).toFixed(1), 'orbitIn pe km', (q.pe / 1000).toFixed(0), 'e', q.e, 'ut d', ((sim.ut - ut) / 86400).toFixed(3));
}
{
  const m = miss(ut, a0, dv); const st = { r: [0, 0, 0], v: [0, 0, 0] }, tp = [0, 0, 0];
  const tE = sim.ut - m.ex.ut; WK.kepler(m.ex.r, m.ex.v, SUN.mu, tE, st); WK.absPos(TB, sim.ut, tp);
  console.log('miss fn at sim entry ut: dist', Math.hypot(st.r[0] - tp[0], st.r[1] - tp[1], st.r[2] - tp[2]).toFixed(0), 'sim |r|', Math.hypot(sim.S[0], sim.S[1], sim.S[2]).toFixed(0), 'ex.ut d', (m.ex.ut / 86400).toFixed(3), 'miss t d', (m.t / 86400).toFixed(3), 'tE d', (tE / 86400).toFixed(3), 'miss d km', (m.d / 1000).toFixed(0));
  // rel velocity
  const S = sim.S, b = WK.vcross ? 0 : 0; const rx = S[0], ry = S[1], rz = S[2], vx = S[3], vy = S[4], vz = S[5];
  const cx = ry * vz - rz * vy, cy = rz * vx - rx * vz, cz = rx * vy - ry * vx; console.log('impact b km', (Math.hypot(cx, cy, cz) / Math.hypot(vx, vy, vz) / 1000).toFixed(0));
  const pv = [0, 0, 0]; const ps = WK.relState ? 'relState' : ''; console.log(ps);
}
{
  const m = miss(ut, a0, dv); const ex = m.ex; const st = { r: [0, 0, 0], v: [0, 0, 0] };
  const s3 = new WKSim(C, { body: HM, ut, activate: false }); s3.setState(r, v, [0, 0, 0, 1], [0, 0, 0]); s3.derive();
  let n3 = 0; while (s3.B === HM && n3++ < 1e5) s3.warp(1 / 60, 3000);
  console.log('exit sim ut', s3.ut.toFixed(1), 'pred ut', ex.ut.toFixed(1), 'r diff', Math.hypot(s3.S[0] - ex.r[0], s3.S[1] - ex.r[1], s3.S[2] - ex.r[2]).toFixed(0), 'v diff', Math.hypot(s3.S[3] - ex.v[0], s3.S[4] - ex.v[1]).toFixed(3));
  for (const d of [10, 30, 50, 60]) {
    const target = ex.ut + d * 86400; let g = 0; while (s3.ut < target - 1e-6 && g++ < 1e6) s3.warp(Math.min(1, (target - s3.ut) / 100000), 100000);
    WK.kepler(ex.r, ex.v, SUN.mu, s3.ut - ex.ut, st); console.log('d', d, 'sim ut', ((s3.ut - ex.ut) / 86400).toFixed(4), 'body', s3.B.id, 'pos diff km', (Math.hypot(s3.S[0] - st.r[0], s3.S[1] - st.r[1], s3.S[2] - st.r[2]) / 1000).toFixed(1), 'r', Math.hypot(...st.r).toExponential(3));
  }
}
