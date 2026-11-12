/* rally stage model checks: geometry, height profile, ground queries, forest, walls */
const load = require('./ryt.js');
const { RY, RY_ELEMS, RY_SURF } = load();
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const t0 = Date.now(); RY.build(1); console.log('built in', Date.now() - t0, 'ms');
console.log('length', RY.L.toFixed(0), 'm, samples', RY.N, ', grid', RY.gw + 'x' + RY.gh, ', trees', RY.trees.length, ', understory', RY.under.length, ', rocks', RY.rocks.length);
console.log('max slope', RY.maxSlope.toFixed(3), 'max vertical curvature', RY.maxCurv.toFixed(3));
ok(RY.L > 3800 && RY.L < 5600, 'stage length is ' + RY.L.toFixed(0) + ' m');
ok(RY.maxSlope < 0.4, 'road gradient stays sane (max ' + RY.maxSlope.toFixed(3) + ')');
/* path never runs close to an earlier stretch of itself */
{ let mn = 1e9, at = null; for (let i = 0; i < RY.N; i += 2) for (let j = i + 90; j < RY.N; j += 2) { const d = Math.hypot(RY.px[i] - RY.px[j], RY.pz[i] - RY.pz[j]); if (d < mn) { mn = d; at = [i * 2, j * 2]; } }
  console.log('closest approach of two far-apart stretches', mn.toFixed(1), 'm at s=', at); ok(mn > 52, 'no stretch comes within 52 m of another'); }
/* bounding box */
{ let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < RY.N; i++) { x0 = Math.min(x0, RY.px[i]); x1 = Math.max(x1, RY.px[i]); z0 = Math.min(z0, RY.pz[i]); z1 = Math.max(z1, RY.pz[i]); } console.log('extent', (x1 - x0).toFixed(0), 'x', (z1 - z0).toFixed(0), 'm'); }
/* ground() on the centreline matches the profile; ruts and berm are looser than the middle */
{ const o = {}; let maxErr = 0; for (let s = 20; s < RY.L - 20; s += 7) { const q = RY.at(s, 0, {}); RY.ground(q.x, q.z, o); const f = s / RY.DS, i = Math.floor(f), t = f - i, py = RY.py[i] * (1 - t) + RY.py[i + 1] * t; maxErr = Math.max(maxErr, Math.abs(o.h - py)); }
  ok(maxErr < 0.35, 'baked ground follows the road profile on the centreline (max err ' + maxErr.toFixed(3) + ' m)'); }
{ const o1 = {}, o2 = {}, o3 = {}; const q0 = RY.at(100, 0, {}), q1 = RY.at(100, 3.4, {}), q2 = RY.at(100, 30, {}); RY.ground(q0.x, q0.z, o1); RY.ground(q1.x, q1.z, o2); RY.ground(q2.x, q2.z, o3);
  ok(o1.mu > o2.mu && o2.mu > o3.mu, 'grip falls from the middle (' + o1.mu.toFixed(2) + ') to the berm (' + o2.mu.toFixed(2) + ') to the forest floor (' + o3.mu.toFixed(2) + ')'); }
/* the ground never has a cliff: neighbouring grid nodes inside the stage differ by a walkable amount */
{ let worst = 0, wi = 0, wj = 0; for (let j = 0; j < RY.gh - 1; j++) for (let i = 0; i < RY.gw - 1; i++) { const k = j * RY.gw + i; if (RY.D[k] > 90 || RY.D[k + 1] > 90 || RY.D[k + RY.gw] > 90) continue; const w = Math.max(Math.abs(RY.H[k] - RY.H[k + 1]), Math.abs(RY.H[k] - RY.H[k + RY.gw])); if (w > worst) { worst = w; wi = i; wj = j; } }
  console.log('steepest step between neighbouring nodes', worst.toFixed(2), 'm per', RY.GS, 'm', 'at', wi, wj); ok(worst < 3.2, 'no cliffs in the baked ground (worst ' + worst.toFixed(2) + ' m step)'); }
/* forest: nothing on the road, plenty beside it */
{ let onRoad = 0, near = 0; for (const t of RY.trees) { const d = RY.distAt(t.x, t.z); if (d < RY.hw[Math.round(RY.nearest(t.x, t.z, -1, 0, {}).i)] + 2) onRoad++; if (t.e < 15) near++; }
  ok(onRoad === 0, 'no trunk within 2 m of the road edge (' + onRoad + ' found)'); ok(RY.trees.length > 12000, 'a heavily wooded stage: ' + RY.trees.length + ' trees (' + near + ' within 15 m of the road)'); }
/* collision query finds a trunk */
{ const t = RY.trees.find((tr) => tr.e < 20), out = []; RY.hits(t.x + 0.1, t.z, 0.9, out); ok(out.length > 0, 'trunk collision hit found'); RY.hits(RY.at(300, 0, {}).x, RY.at(300, 0, {}).z, 1, out); ok(out.length === 0, 'road centre is clear'); }
/* every feature: the kicker really is a kicker. Simulate a car holding speed v over the profile with the game's take-off rule and report the longest flight */
{ const g = 9.81; const prof = (s) => { const f = s / RY.DS, i = Math.floor(f), t = f - i; return RY.py[i] * (1 - t) + RY.py[Math.min(RY.N - 1, i + 1)] * t; };
  const fly = (v, sa, sb) => {
    const dt = 1 / 120; let s = sa, y = prof(s), vy = 0, air = false, vyPrev = (prof(s + 0.5) - prof(s)) / (0.5 / v), t = 0, s0 = 0, best = null;
    while (s < sb) {
      s += v * dt; const gy = prof(s);
      if (air) { vy -= g * dt; y += vy * dt; t += dt; if (y <= gy) { air = false; if (!best || t > best.t) best = { t, d: s - s0, vy: -vy, s0 }; y = gy; vy = 0; } }
      else { const need = (gy - y) / dt; if (need < vyPrev - g * dt - 0.2 && v > 8) { air = true; vy = vyPrev; y += vy * dt; t = 0; s0 = s; } else { vy = Math.max(-30, Math.min(30, need)); y = gy; } vyPrev = vy; }
    }
    return best;
  };
  for (const f of RY.feats.filter((f) => f.k === 'jump')) {
    const res = [];
    for (const v of [25, 33, 42]) { const b = fly(v, f.s0 - f.up - 30, f.s0 + 120); res.push(v + ' m/s: ' + (b && b.t > 0.12 ? b.d.toFixed(0) + ' m, ' + b.t.toFixed(2) + ' s, land ' + b.vy.toFixed(1) : 'no air')); }
    console.log('jump @' + f.s0.toFixed(0), (f.name + '          ').slice(0, 11), '|', res.join(' | '));
  }
  /* a whole run at a steady speed shouldn't throw the car into the air anywhere there is no feature (apart from whoops, which are meant to) */
  for (const v of [30]) { let sA = 40, bad = []; while (sA < RY.L - 60) { const b = fly(v, sA, sA + 160); if (b && b.t > 0.25) { const near = RY.feats.some((f) => b.s0 > f.s0 - 60 && b.s0 < f.s0 + (f.len || (f.n ? f.n * f.lam : 40)) + 40); if (!near) bad.push(b.s0.toFixed(0)); sA = b.s0 + 160; } else sA += 160; }
    ok(bad.length === 0, 'no unintended air at ' + v + ' m/s' + (bad.length ? ' (at s=' + bad.join(',') + ')' : '')); }
}
console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
