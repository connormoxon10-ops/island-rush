/* helpers for node flight tests */
module.exports = function (L) {
  const { WK, WKSim, WKV, qrot, qrotInv, qaxis, qmul, qfromAxes } = L; const H = {};
  H.flatEnv = (h) => ({ ground: (x, z, o) => { o.h = h || 0; o.water = false; o.mu = 0.8; o.rr = 0.02; return o; } });
  /* attitude for a craft whose nose points east, up is up */
  H.qEast = () => qfromAxes([0, 0, -1], [0, 1, 0], [1, 0, 0], [0, 0, 0, 1]);
  H.spawnAir = (C, alt, V, pitchDeg, env) => {
    const sim = new WKSim(C, { env: env || H.flatEnv(0) }); const q = qmul(H.qEast(), qaxis(1, 0, 0, -(pitchDeg || 0) * Math.PI / 180, [0, 0, 0, 1]), [0, 0, 0, 1]);
    const fw = qrot(q, [0, 0, 1], [0, 0, 0]); sim.setState([0, WK.R + alt, 0], [fw[0] * V, fw[1] * V, fw[2] * V], q, [0, 0, 0]); sim.ctl.sas = 'stab'; sim.ctl.gear = 0; return sim;
  };
  /* sit on the ground: lowest hull/gear point just touching */
  H.spawnGround = (C, env, hdg) => {
    const sim = new WKSim(C, { env: env || H.flatEnv(0) }); const q = H.qEast(); const low = sim.lowest(q, [0, 1, 0]);
    sim.setState([0, WK.R - low + 0.0, 0], [0, 0, 0], q, [0, 0, 0]); sim.ctl.sas = 'stab'; sim.ctl.gear = 1; for (const g of sim.gear) g.ext = 1; return sim;
  };
  H.run = (sim, T, ctrl, dt, every) => { dt = dt || 1 / 60; const log = []; let k = 0; for (let t = 0; t < T; t += dt) { if (ctrl) ctrl(sim, t); sim.step(dt); if (sim.dead) break; if (every && (k++ % every === 0)) log.push(H.snap(sim)); } return log; };
  H.snap = (sim) => { const I = sim.info; return { t: +sim.t.toFixed(2), alt: +I.alt.toFixed(1), spd: +I.speed.toFixed(1), vs: +I.vs.toFixed(2), pitch: +(I.pitch * 180 / Math.PI).toFixed(1), aoa: +(I.aoa * 180 / Math.PI).toFixed(1), g: +I.g.toFixed(2), thr: +sim.ctl.thr.toFixed(2), x: +I.x.toFixed(0), hdg: +(I.hdg * 180 / Math.PI).toFixed(0), roll: +(I.roll * 180 / Math.PI).toFixed(0) }; };
  return H;
};
module.exports.rocketHelpers = function (L, H) {
  const { WK, WKSim, qfromAxes } = L;
  /* attitude with nose (body +Z) along elevation theta (deg) above the horizon toward east */
  H.qPitch = (th) => { const t = th * Math.PI / 180, c = Math.cos(t), s = Math.sin(t); return qfromAxes([0, 0, -1], [-s, c, 0], [c, s, 0], [0, 0, 0, 1]); };
  H.spawnPad = (C, env) => {
    const sim = new WKSim(C, { env: env || H.flatEnv(0) }); const q = H.qPitch(90); const low = sim.lowest(q, [0, 1, 0]);
    sim.setState([0, WK.R - low, 0], [0, 0, 0], q, [0, 0, 0]); sim.ctl.sas = 'stab'; return sim;
  };
  return H;
};
