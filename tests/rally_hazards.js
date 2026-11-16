/* The smaller rally hazards on every stage: mud pits (slippery, draggy road), hay-bale slaloms (three loose round bales staggered across the road) and fallen logs
   (a sharp bump across the road). Each stage carries some; mud really cuts the grip and slows a car down, a log really is a bump, the bales stand on
   the road leaving a lane round each one, and none of them sits on top of a jump, a ravine, a stream or a plank wall.
   usage: node tests/rally_hazards.js   (pure: no browser) */
const { RY, RY_STAGES } = require('./ryt.js')();
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
let total = { mud: 0, bales: 0, log: 0 };
for (let si = 0; si < RY_STAGES.length; si++) {
  const st = RY.use(si); RY.build(1); const q = {}, g = {}, n = { mud: 0, bales: 0, log: 0 };
  for (const f of RY.feats) if (n[f.k] != null) n[f.k]++; for (const k in n) total[k] += n[k];
  ok(n.mud + n.bales + n.log >= 3, st.name + ': carries ' + n.mud + ' mud pit(s), ' + n.bales + ' bale slalom(s), ' + n.log + ' log(s)');
  for (const f of RY.feats) {
    const big = RY.feats.filter((o) => o !== f && ['jump', 'ravine', 'ford'].includes(o.k)), end = (o) => o.s0 + (o.span || o.len || 0) + (o.land || 0) + (o.down || 0);
    if (f.k === 'mud') {
      const a = RY.at(f.s0 + f.len / 2, 0, q); RY.ground(a.x, a.z, g); const mud = g.mu, rr = g.rr, keep = RY.mud; RY.mud = null; RY.ground(a.x, a.z, g); RY.mud = keep;
      ok(mud < g.mu * 0.72 && rr > g.rr + 0.06, st.name + ': mud pit at ' + f.s0.toFixed(0) + ' m cuts the grip (' + g.mu.toFixed(2) + ' -> ' + mud.toFixed(2) + ') and drags (' + g.rr.toFixed(3) + ' -> ' + rr.toFixed(3) + ')');
    }
    if (f.k === 'log') {
      const c = RY.at(f.s0 + f.len / 2, 0, q), y0 = RY.heightAt(c.x, c.z), p = RY.at(f.s0 - 3, 0, {}), r = RY.at(f.s0 + f.len + 3, 0, {}), base = (RY.heightAt(p.x, p.z) + RY.heightAt(r.x, r.z)) / 2;
      ok(y0 - base > 0.15, st.name + ': log at ' + f.s0.toFixed(0) + ' m is a bump (' + (y0 - base).toFixed(2) + ' m)');
    }
    if (n[f.k] != null) ok(!big.some((o) => o.s0 - (o.up || 0) - 40 < f.s0 + f.len && end(o) + 40 > f.s0), st.name + ': ' + f.k + ' at ' + f.s0.toFixed(0) + ' m keeps clear of jumps, ravines and streams');
  }
  const bl = RY.bales || [];
  ok(bl.length === n.bales * 3, st.name + ': ' + bl.length + ' bales stand in the slaloms');
  for (const b of bl) { const a = RY.at(b.s, 0, q), lane = a.hw + Math.abs(b.lat) - 0.78; ok(Math.abs(b.lat) < a.hw && lane > 3 && Math.abs(b.lat) - 0.78 > 0, st.name + ': bale at ' + b.s.toFixed(0) + ' m is on the road (' + b.lat.toFixed(2) + ' m off centre) with a ' + (a.hw + Math.abs(b.lat) - 0.78).toFixed(1) + ' m lane on its far side'); }
  for (const lg of RY.logs) { let mx = 0; for (let k = -6; k <= 6; k++) { const a = RY.at(lg.s, k * 0.5, q); for (let u = -2; u <= 2; u += 0.1) mx = Math.max(mx, RY.heightAt(a.x + lg.tx * u, a.z + lg.tz * u) - (RY.heightAt(a.x - lg.tx * 2.5, a.z - lg.tz * 2.5) + RY.heightAt(a.x + lg.tx * 2.5, a.z + lg.tz * 2.5)) / 2); } ok(mx > 0.2 && mx < 0.45, st.name + ': the log reaches right across the road (peak ' + mx.toFixed(2) + ' m)'); }
}
ok(total.mud > 0 && total.bales > 0 && total.log > 0, 'across the stages: ' + total.mud + ' mud pits, ' + total.bales + ' bale slaloms, ' + total.log + ' logs');
console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
