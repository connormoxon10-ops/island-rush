/* Every rally stage, checked as a model (no browser): it builds, the road never comes near itself except where a hairpin means it to, the grade and the bumps stay
   drivable, the land beside the road meets it without a step, plank gates stand on straights, and the surfaces are what the theme says (ice is slippery, sand drags).
   usage: node tests/rally_stages.js */
const { RY, RY_STAGES, RY_ELEMS, RY_WALLS, RY_SURF, RY_RAILS } = require('./ryt.js')();
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
for (let si = 0; si < RY_STAGES.length; si++) {
  const st = RY.use(si), t0 = Date.now(); RY.build(1); const ms = Date.now() - t0, N = RY.N, ds = RY.DS;
  /* closest approach of two stretches more than 120 m apart along the road */
  let near = 1e9; for (let i = 0; i < N; i += 3) for (let j = i + 60; j < N; j += 3) { const d = Math.hypot(RY.px[i] - RY.px[j], RY.pz[i] - RY.pz[j]); if (d < near) near = d; }
  let lo = 1e9, hi = -1e9, grade = 0; for (let i = 0; i < N; i++) { if (!RY.cutMask[i]) lo = Math.min(lo, RY.base[i]); hi = Math.max(hi, RY.base[i]); if (i && !RY.cutMask[i] && !RY.cutMask[i - 1]) grade = Math.max(grade, Math.abs(RY.base[i] - RY.base[i - 1]) / ds); }
  /* step between the road edge and the ground 1.5 m outside it, and the steepest ground within 30 m of the road */
  let step = 0, steep = 0; const q = {}, g = {};
  for (let s = 20; s < RY.L - 20; s += 14) for (const sd of [-1, 1]) { if (RY.cutMask[Math.round(s / ds)]) continue; const a = RY.at(s, 0, q), hw = a.hw; const e0 = RY.at(s, sd * hw, {}), e1 = RY.at(s, sd * (hw + 1.5), {}), e2 = RY.at(s, sd * (hw + 16), {}), e3 = RY.at(s, sd * (hw + 20), {});
    step = Math.max(step, Math.abs(RY.heightAt(e0.x, e0.z) - RY.heightAt(e1.x, e1.z))); steep = Math.max(steep, Math.abs(RY.heightAt(e2.x, e2.z) - RY.heightAt(e3.x, e3.z)) / 4); }
  const mus = [0, 1, 2, 3].map((k) => RY_SURF[RY.T.surf[k]].mu);
  console.log(`\n${st.name} (${st.theme}): ${Math.round(RY.L)} m, par ${RY.par.toFixed(1)} s, built in ${ms} ms, grid ${RY.gw}x${RY.gh}, ${RY.trees.length} trees, height ${lo.toFixed(0)}..${hi.toFixed(0)} m, grade ${(grade * 100).toFixed(1)} %, nearest approach ${near.toFixed(0)} m, edge step ${step.toFixed(2)} m, verge slope ${steep.toFixed(2)}, mu ${mus.join('/')}`);
  ok(RY.L > 2400 && RY.L < 4800, st.name + ': a full-length stage');
  ok(near > 34, st.name + ': the road never comes within a car-length-and-a-verge of itself (' + near.toFixed(0) + ' m)');
  ok(grade < 0.18, st.name + ': no grade over 18 % (' + (grade * 100).toFixed(1) + ' %)');
  ok(RY.maxCurv < 0.13, st.name + ': the profile has no kink (' + RY.maxCurv.toFixed(3) + ' 1/m)');
  ok(step < 0.9, st.name + ': the verge meets the road (' + step.toFixed(2) + ' m)');
  for (const w of RY_WALLS) ok(RY_ELEMS[w.e][0] === 'S' && w.at > 30 && w.at <= RY_ELEMS[w.e][1] - 20, st.name + ': gate in element ' + w.e + ' stands on a straight');
  for (let s = 0; s < RY.L; s += 9) { const a = RY.at(s, 0, q); RY.ground(a.x, a.z, g); if (!(g.h === g.h) || !(g.mu > 0.2 && g.mu < 1)) { ok(false, st.name + ': bad ground at s=' + s); break; } }
  /* the obstacles: a ravine you clear from the lip to the deck (and fall a long way into), a stream that is wet but not deep, nets that catch, tyre walls at hairpins */
  for (const rv of RY.ravines) {
    const mid = RY.at(rv.s0 + rv.span / 2, 0, {}), floor = RY.heightAt(mid.x, mid.z), lip = RY.at(rv.s0 - 0.6, 0, {}), deck = RY.at(rv.s0 + rv.span + 0.4, 0, {}), side = RY.at(rv.s0 + rv.span / 2, mid.hw + 14, {});
    ok(rv.lipY - floor > 6 && RY.heightAt(side.x, side.z) < rv.lipY - 4, st.name + ': ' + rv.f.name + ' is a real ravine (' + (rv.lipY - floor).toFixed(1) + ' m deep, runs on beside the road)');
    ok(Math.abs(RY.heightAt(lip.x, lip.z) - rv.lipY) < 0.25 && RY.heightAt(deck.x, deck.z) > rv.deckY - 0.6, st.name + ': its lip and landing deck are sharp (lip ' + (RY.heightAt(lip.x, lip.z) - rv.lipY).toFixed(2) + ' m off)');
    ok(RY_ELEMS[rv.f.e][0] === 'S' && rv.f.at - rv.f.up > 25 && rv.f.at + rv.f.span + rv.f.land <= RY_ELEMS[rv.f.e][1] + 30 && RY.walls.every((w) => w.s < rv.s0 - rv.f.up - 40 || w.s > rv.s0 + rv.span + rv.f.land + 20), st.name + ': ' + rv.f.name + ' sits on a straight with a run-up, clear of plank gates');
  }
  for (const f of RY.fords) { const a = RY.at(f.s0 + f.len / 2, 0, {}); RY.ground(a.x, a.z, g); ok(g.wade > 0.25 && g.wade < 0.8 && g.rr > 0.1, st.name + ': ' + f.name + ' is a wading-depth stream (' + g.wade.toFixed(2) + ' m, drag ' + g.rr.toFixed(2) + ')'); }
  { const nets = RY_RAILS.filter((r) => r.k === 'net'); let caught = 0; for (const r of nets) { const sM = RY.starts[r.e] + r.at + r.len / 2, a = RY.at(sM, 0, {}), p = RY.at(sM, r.side * (a.hw + r.gap + 0.2), {}); if (RY.hits(p.x, p.z, 0.8, []).some((h) => h.net)) caught++; }
    ok(nets.length >= 2 && caught === nets.length, st.name + ': ' + nets.length + ' crash nets, all of them catch'); }
  ok(RY_ELEMS.every((el, e) => el[0] !== 'C' || Math.abs(el[2]) < 85) || RY.tyres.length >= 4, st.name + ': ' + RY.tyres.length + ' tyre stacks round the hairpins');
  if (st.theme === 'snow') ok(mus[1] < 0.4 && mus[0] < 0.6, 'snow: ice and packed snow are slippery');
  if (st.theme === 'beach') ok(RY.sea != null && lo > RY.sea + 0.5, 'beach: the road stays above the tide (' + (lo - RY.sea).toFixed(1) + ' m)');
  if (st.theme === 'mountain') ok(hi - lo > 60, 'mountain: the road climbs (' + (hi - lo).toFixed(0) + ' m)');
}
RY.use(0);
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL OK'); process.exit(fails ? 1 : 0);
