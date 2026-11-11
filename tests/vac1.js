const L = require('./wkt.js')(); const { WK, WKSim } = L; const spec = JSON.parse(JSON.stringify(WK.PRESETS[2])); const C = WK.compile(spec);
for (const id of ['luna', 'ember', 'pebble', 'cinder', 'rust']) {
  const B = WK.BY[id]; WK.use(B);
  const alt = id === 'rust' ? 110e3 : 30e3; const o = WK.orbitState(B, alt, 0);
  const sim = new WKSim(C, { body: B, ut: 0, activate: false, envFor: (T) => ({ ground: (x, z, q) => { q.h = 0; q.water = false; q.mu = 0.85; q.rr = 0.03; return q; } }) });
  sim.env = sim.envFor(B); const rv = o.r ? o : null;
  sim.setState(o.r, o.v, [0, 0, 0, 1], [0, 0, 0]); sim.ctl.sas = 'stab'; sim.derive();
  const a0 = sim.air.rho; let t = 0, mn = 1e12, mx = 0;
  for (let i = 0; i < 20 * 60 && !sim.dead; i++) { sim.step(1 / 60); t += 1 / 60; const al = Math.hypot(sim.S[0], sim.S[1], sim.S[2]) - B.R; mn = Math.min(mn, al); mx = Math.max(mx, al); }
  console.log(id, 'rho', a0, 'alt range', mn.toFixed(2), mx.toFixed(2), "rho_end", sim.air.rho, "t", t.toFixed(0), 'dead', sim.dead);
}
