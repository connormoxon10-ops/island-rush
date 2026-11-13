/* rally stage model checks: geometry, height profile, ground queries, forest, walls */
const load = require('./ryt.js');
const { RY, RY_ELEMS, RY_SURF, RY_CAMB, RY_RAILS, RY_WALLS } = load();
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
{ const o = {}; let maxErr = 0; for (let s = 20; s < RY.L - 20; s += 7) { if (RY.cutMask[Math.round(s / RY.DS)]) continue; const q = RY.at(s, 0, {});   /* (a ravine's walls are cliffs on purpose: skipped here, checked in rally_stages.js) */ RY.ground(q.x, q.z, o); const f = s / RY.DS, i = Math.floor(f), t = f - i, py = RY.py[i] * (1 - t) + RY.py[i + 1] * t; maxErr = Math.max(maxErr, Math.abs(o.h - py)); }
  ok(maxErr < 0.35, 'baked ground follows the road profile on the centreline (max err ' + maxErr.toFixed(3) + ' m)'); }
{ const o1 = {}, o2 = {}, o3 = {}; const q0 = RY.at(100, 0, {}), q1 = RY.at(100, 3.4, {}), q2 = RY.at(100, 30, {}); RY.ground(q0.x, q0.z, o1); RY.ground(q1.x, q1.z, o2); RY.ground(q2.x, q2.z, o3);
  ok(o1.mu > o2.mu && o2.mu > o3.mu, 'grip falls from the middle (' + o1.mu.toFixed(2) + ') to the berm (' + o2.mu.toFixed(2) + ') to the forest floor (' + o3.mu.toFixed(2) + ')'); }
/* the ground never has a cliff: neighbouring grid nodes inside the stage differ by a walkable amount */
{ let worst = 0, wi = 0, wj = 0; for (let j = 0; j < RY.gh - 1; j++) for (let i = 0; i < RY.gw - 1; i++) { const k = j * RY.gw + i; if (RY.D[k] > 90 || RY.D[k + 1] > 90 || RY.D[k + RY.gw] > 90) continue; if ([k, k + 1, k + RY.gw].some((q) => RY.I[q] >= 0 && RY.cutMask[RY.I[q]])) continue; const w = Math.max(Math.abs(RY.H[k] - RY.H[k + 1]), Math.abs(RY.H[k] - RY.H[k + RY.gw])); if (w > worst) { worst = w; wi = i; wj = j; } }
  console.log('steepest step between neighbouring nodes', worst.toFixed(2), 'm per', RY.GS, 'm', 'at', wi, wj); ok(worst < 3.2, 'no cliffs in the baked ground (worst ' + worst.toFixed(2) + ' m step)'); }
/* forest: nothing on the road, plenty beside it */
{ let onRoad = 0, near = 0; for (const t of RY.trees) { const d = RY.distAt(t.x, t.z); if (d < RY.hw[Math.round(RY.nearest(t.x, t.z, -1, 0, {}).i)] + 2) onRoad++; if (t.e < 15) near++; }
  ok(onRoad === 0, 'no trunk within 2 m of the road edge (' + onRoad + ' found)'); ok(RY.trees.length > 12000, 'a heavily wooded stage: ' + RY.trees.length + ' trees (' + near + ' within 15 m of the road)'); }
/* collision query finds a trunk */
{ const t = RY.trees.find((tr) => tr.e < 20), out = []; RY.hits(t.x + 0.1, t.z, 0.9, out); ok(out.length > 0, 'trunk collision hit found'); RY.hits(RY.at(300, 0, {}).x, RY.at(300, 0, {}).z, 1, out); ok(out.length === 0, 'road centre is clear'); }
/* every feature: the kicker really is a kicker. Simulate a car holding speed v over the ground grid with the game's take-off rule (06_car.js: vyPrev every step,
   a landing cooldown and a speed-scaled margin on the stage) and report the longest flight */
{ const g = 9.81, tmp = {}; const prof = (s) => { const q = RY.at(s, 0, tmp); return RY.heightAt(q.x, q.z); };
  const fly = (v, sa, sb, stats) => {
    const dt = 1 / 120; let s = sa, y = prof(s), vy = 0, air = false, vyPrev = (prof(s + 0.5) - prof(s)) / (0.5 / v), t = 0, s0 = 0, best = null, cd = 0;
    while (s < sb) {
      s += v * dt; const gy = prof(s);
      if (air) { vy -= g * dt; y += vy * dt; t += dt; if (stats) stats.air++; if (y <= gy) { air = false; if (!best || t > best.t) best = { t, d: s - s0, vy: -vy, s0 }; y = gy; vy = 0; cd = 0.12; } }
      else { const need = (gy - y) / dt; const wait = cd > 0; if (wait) cd -= dt; if (!wait && need < vyPrev - g * dt - (0.2 + 0.03 * v) && v > 8) { air = true; vy = vyPrev; y += vy * dt; t = 0; s0 = s; } else { vy = Math.max(-30, Math.min(30, need)); y = gy; } }
      vyPrev = vy; if (stats) stats.n++;
    }
    return best;
  };
  for (const f of RY.feats.filter((f) => f.k === 'jump')) {
    const res = [];
    for (const v of [25, 33, 42]) { const b = fly(v, f.s0 - f.up - 30, f.s0 + 120); res.push(v + ' m/s: ' + (b && b.t > 0.12 ? b.d.toFixed(0) + ' m, ' + b.t.toFixed(2) + ' s, land ' + b.vy.toFixed(1) : 'no air')); }
    console.log('jump @' + f.s0.toFixed(0), (f.name + '          ').slice(0, 11), '|', res.join(' | '));
  }
  /* a whole run at a steady speed shouldn't throw the car into the air anywhere there is no feature (apart from whoops, which are meant to): measured as the share of time spent airborne away from features */
  for (const v of [22, 30, 40]) {
    const st = { air: 0, n: 0 }, ranges = []; let sA = RY.startS; const featEnd = (f) => f.s0 + (f.up || 0) + (f.down || 0) + (f.land || 0) + (f.n ? f.n * f.lam : 0) + (f.len || 0) + 30;
    const stOut = { air: 0, n: 0 };
    for (let k = 0; k < 24; k++) { const a = RY.startS + k * 150, b = Math.min(RY.finishS, a + 150); if (a >= RY.finishS) break; if (RY.feats.some((f) => b > f.s0 - 60 && a < featEnd(f))) continue; fly(v, a, b, stOut); }
    ok(stOut.n > 3000 && stOut.air / stOut.n < 0.01, 'only ' + (100 * stOut.air / stOut.n).toFixed(2) + '% of the time in the air away from features at ' + v + ' m/s (over ' + stOut.n + ' steps)');
  }
}
/* ---- camber: bends are banked or off-camber, straights crowned/dished/cross-falling, all flat at the jumps and gates ---- */
{
  let bmin = 9, bmax = -9, cmin = 9, cmax = -9, rate = 0; for (let i = 0; i < RY.N; i++) { bmin = Math.min(bmin, RY.bank[i]); bmax = Math.max(bmax, RY.bank[i]); cmin = Math.min(cmin, RY.crown[i]); cmax = Math.max(cmax, RY.crown[i]); if (i) rate = Math.max(rate, Math.abs(RY.bank[i] - RY.bank[i - 1]) / RY.DS); }
  console.log('cross-fall', bmin.toFixed(2), '..', bmax.toFixed(2), ', crown', cmin.toFixed(2), '..', cmax.toFixed(2), ', fastest change', rate.toFixed(3), '/m');
  ok(bmax > 0.3 && bmin < -0.3, 'banks reach 17 degrees both ways (' + bmin.toFixed(2) + ' .. ' + bmax.toFixed(2) + ')');
  ok(Math.max(Math.abs(bmin), bmax) <= 0.4, 'no bank steeper than 0.4');
  ok(cmin < -0.03 && cmax > 0.25, 'the crown varies from dished (' + cmin.toFixed(2) + ') to heavily crowned (' + cmax.toFixed(2) + ')');
  ok(rate < 0.04, 'the camber never changes faster than 0.04 per metre (' + rate.toFixed(3) + ')');
  /* every banked bend leans into the turn, every off-camber bend away from it, measured at the apex */
  for (const e of Object.keys(RY_CAMB)) {
    const el = RY_ELEMS[e], i = Math.round((RY.starts[e] + el[1] / 2) / RY.DS), left = el[2] > 0, b = RY_CAMB[e].b;
    const q = RY.at(RY.starts[e] + el[1] / 2, 0, {}), a = RY.at(q.s, RY.hw[i] - 0.3, {}), c = RY.at(q.s, -(RY.hw[i] - 0.3), {}), ha = RY.heightAt(a.x, a.z), hc = RY.heightAt(c.x, c.z);
    const outsideHigher = left ? hc > ha : ha > hc;   /* left bend: the outside is the right-hand edge */
    ok(outsideHigher === (b > 0), 'bend ' + e + ' (' + (left ? 'left' : 'right') + ') is ' + (b > 0 ? 'banked into the turn' : 'off-camber') + ' (' + (ha - hc).toFixed(2) + ' m left edge over right)');
  }
  /* flat where the car leaves the ground straight: 16 m before a jump's kicker to its landing, 8 m either side of every plank gate */
  let worst = 0;
  for (const f of RY.feats) if (f.k === 'jump') for (let s = f.s0 - f.up; s < f.s0 + f.down + 6; s += 2) { const i = Math.round(s / RY.DS); worst = Math.max(worst, Math.abs(RY.bank[i]), Math.abs(RY.crown[i]) * 3, Math.abs(RY.lip[i])); }
  for (const w of RY.walls) for (let s = w.s - 8; s < w.s + 8; s += 2) { const i = Math.round(s / RY.DS); worst = Math.max(worst, Math.abs(RY.bank[i]), Math.abs(RY.crown[i]) * 3, Math.abs(RY.lip[i])); }
  ok(worst < 0.012, 'jumps and plank gates are on flat, uncrowned road (worst ' + worst.toFixed(4) + ')');
  /* the baked ground follows the cross-section across the whole width, lip included */
  let me = 0, at = 0; const g = {};
  for (let s = 90; s < RY.L - 90; s += 9) { const i = Math.round(s / RY.DS); if (RY.cutMask[i]) continue; for (let l = -RY.hw[i] + 0.4; l <= RY.hw[i] - 0.4; l += 1.3) { const q = RY.at(s, l, {}); RY.ground(q.x, q.z, g); const j = Math.min(RY.N - 2, Math.floor(s / RY.DS)), fr = s / RY.DS - j; const py = RY.py[j] * (1 - fr) + RY.py[j + 1] * fr, hw = RY.hw[j] * (1 - fr) + RY.hw[j + 1] * fr, bk = RY.bank[j] * (1 - fr) + RY.bank[j + 1] * fr, cr = RY.crown[j] * (1 - fr) + RY.crown[j + 1] * fr, lp = RY.lip[j] * (1 - fr) + RY.lip[j + 1] * fr; const want = py + RY.cross(l, hw, bk, cr, lp); if (Math.abs(g.h - want) > me) { me = Math.abs(g.h - want); at = s; } } }
  ok(me < 0.3, 'baked ground matches the road cross-section across the full width, berm lips included (worst ' + me.toFixed(3) + ' m at s=' + at.toFixed(0) + ')');
  /* no steep step across the drivable width (road plus shoulder up to a wall face): steepest slope between points 0.5 m apart */
  let steep = 0, sat = 0; for (let s = 90; s < RY.L - 90; s += 5) { const i = Math.round(s / RY.DS), lim = RY.hw[i] + 1.2; let prev = null; for (let l = -lim; l <= lim; l += 0.5) { const q = RY.at(s, l, {}); const h = RY.heightAt(q.x, q.z); if (prev !== null && Math.abs(h - prev) / 0.5 > steep) { steep = Math.abs(h - prev) / 0.5; sat = s; } prev = h; } }
  ok(steep < 1.35, 'steepest cross slope on the road and shoulder is ' + steep.toFixed(2) + ' (s=' + sat.toFixed(0) + ')');
}
/* ---- rock faces and stone walls ---- */
{
  const out = []; let bad = 0;
  for (const rl of RY_RAILS) {
    const sM = RY.starts[rl.e] + rl.at + rl.len / 2, i = Math.round(sM / RY.DS);
    for (const side of rl.side === 0 ? [1, -1] : [rl.side]) {
      const gap = rl.gap, hw = RY.hw[i], q = RY.at(sM, side * (hw + gap + 0.2), {});
      RY.hits(q.x, q.z, 0.8, out); const hit = out.find((h) => h.rail);
      const q2 = RY.at(sM, side * (hw + gap - 1.4), {}); RY.hits(q2.x, q2.z, 0.8, out); const miss = out.find((h) => h.rail);
      /* the push-back points across the road, toward the centre line */
      const lx = hit ? hit.nx * RY.cz[i] - hit.nz * RY.cx[i] : 0;
      if (!hit || miss || lx * side > -0.9) { bad++; console.log('  wall e' + rl.e + ' side ' + side + ': hit ' + !!hit + ' miss-clear ' + !miss + ' normal-across ' + lx.toFixed(2)); }
    }
    /* nothing grows inside the wall's footprint and the jumps and gates are far away */
    for (const f of RY.feats) if (f.k === 'jump' && f.s0 + f.down + f.land > RY.starts[rl.e] + rl.at - 20 && f.s0 - f.up < RY.starts[rl.e] + rl.at + rl.len + 20) { bad++; console.log('  wall at e' + rl.e + ' is within 20 m of a jump'); }
    for (const w of RY.walls) if (w.s > RY.starts[rl.e] + rl.at - 30 && w.s < RY.starts[rl.e] + rl.at + rl.len + 20) { bad++; console.log('  wall at e' + rl.e + ' is within 30 m of a plank gate'); }
  }
  ok(bad === 0, 'every rock face and stone wall is solid at its face, open on the road side, pushes across the road and keeps clear of the jumps and gates');
  let inside = 0; for (const t of RY.trees) { const o = RY.nearest(t.x, t.z, -1, 0, {}); const side = o.l > 0 ? RY.rails.L : RY.rails.R; if (o.d - RY.hw[o.i] < side.band[o.i]) inside++; }
  ok(inside === 0, 'no tree stands in a wall footprint (' + inside + ' found)');
  /* behind a rock face the hillside climbs above its top; behind a stone wall it does not change */
  for (const rl of RY_RAILS) {
    const sM = RY.starts[rl.e] + rl.at + rl.len / 2, i = Math.round(sM / RY.DS), side = rl.side === 0 ? 1 : rl.side, hw = RY.hw[i], face = RY.at(sM, side * (hw + rl.gap - 0.3), {}), back = RY.at(sM, side * (hw + rl.gap + 9), {});
    const rise = RY.heightAt(back.x, back.z) - RY.heightAt(face.x, face.z);
    if (rl.k === 'rock') ok(rise > rl.h * 0.85, 'e' + rl.e + ' rock cutting: the hillside 9 m behind the face stands ' + rise.toFixed(1) + ' m above the verge (face ' + rl.h + ' m)'); }
}
/* plank walls are for speed: each one sits on a straight with a clear run-up (no bend in the 70 m before it or the 20 m after) and clear of jumps */
for (const w of RY.walls) {
  const a = RY.at(w.s - 70, 0, {}), b = RY.at(w.s + 20, 0, {}); let dy = b.yaw - a.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  ok(Math.abs(dy) < 0.04, 'wall at s=' + w.s.toFixed(0) + ' has a straight run-up (heading change ' + dy.toFixed(3) + ' rad)');
  ok(RY.feats.every((f) => w.s < f.s0 - 30 || w.s > f.s0 + 70), 'wall at s=' + w.s.toFixed(0) + ' is clear of jumps and dips');
}
console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
