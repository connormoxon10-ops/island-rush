const L = require('./wkt.js')(); const { WK, WKSim } = L; const spec = JSON.parse(JSON.stringify(WK.PRESETS[2])); const C = WK.compile(spec);
for (const [id, alt, vy] of [['jove', 60e3, -50], ['sun', 5e6, 0], ['rust', 40e3, -150]]) {
  const B = WK.BY[id]; const sim = new WKSim(C, { body: B, ut: 0, activate: false, envFor: (T) => (T.crush || T === WK.SUN ? { ground: (x, z, o) => { o.h = -1e9; o.water = false; o.mu = 0.3; o.rr = 0.05; return o; } } : { ground: (x, z, o) => { o.h = 0; o.water = false; o.mu = 0.85; o.rr = 0.03; return o; } }) });
  sim.env = sim.envFor(B); sim.setState([0, B.R + alt, 0], [0, vy, 0], [0, 0, 0, 1], [0, 0, 0]); sim.ctl.sas = 'stab'; sim.derive(); let t = 0; const ev = [];
  while (!sim.dead && t < 3000) { for (let i = 0; i < 60; i++) { sim.step(1 / 60); t += 1 / 60; while (sim.ev.length) ev.push(sim.ev.shift()); if (sim.dead) break; } }
  console.log(id, 'alt0', alt, 'dead', sim.dead, sim.deadWhy, 't', t.toFixed(0), 'alt', Math.round(sim.info.alt), 'ev', ev.slice(0, 4).join(','));
}
