/* Rally stage drive test: boots the game, starts Hollow Pines, then drives the whole stage with a simple autopilot (analog steering through a faked gamepad)
   using the real car physics and the real Rally hooks. No rendering is waited on: physics steps run synchronously in the page.
   usage: node tests/rally3.js [car-speed-scale] ; env: TOD=0..3, MAXT=seconds, SHOTS=s1,s2,.. (screenshots at those stage distances, slow in software GL) */
const { chromium } = require('playwright');
const path = require('path');
const G = path.resolve(__dirname, '../dist/test.html');
const TOD = +(process.env.TOD || 2), MAXT = +(process.env.MAXT || 260), SHOTS = (process.env.SHOTS || '').split(',').filter(Boolean).map(Number);
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + G);
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  console.log('boot err', await page.evaluate(() => window.__bootError || null));
  const res = await page.evaluate(async ([tod, maxT, shots]) => {
    const g = window.__game, R = g.Rally, RY = g.RY, car = g.car, out = { log: [], marks: [], events: [] };
    g.App.mode = 'rlobby'; g.save.rally.tod = tod; R.tod = tod; await R.start();
    /* fake analog gamepad: axes[0] = -steer, buttons 7 = throttle, 6 = brake */
    const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) };
    navigator.getGamepads = () => [pad];
    const set = (st, th, br) => { pad.axes[0] = -st; pad.buttons[7].value = th; pad.buttons[6].value = br; };
    const tmp = {}, dt = 1 / 60; let t = 0, n = 0, wall = 0, maxLat = 0, lastLog = -9, offRoad = 0, airT = 0, stuckReset = 0, minHp = 100, topSpd = 0;
    const AY = window.__AY || 0.8, WB = 2.47;
    /* speed profile: curvature-limited speed with a backward braking pass */
    const DS = 3, S0 = RY.startS - 10, S1 = RY.finishS + 60, N = Math.ceil((S1 - S0) / DS) + 1, vlim = new Float32Array(N), yawAt = [], muAt = [];
    for (let i = 0; i < N; i++) { const q = RY.at(S0 + i * DS, 0, {}); yawAt.push(q.yaw); const o = {}; RY.ground(q.x, q.z, o); muAt.push(o.mu || 0.8); }
    for (let i = 0; i < N; i++) { const i0 = Math.max(0, i - 2), i1 = Math.min(N - 1, i + 2); let dy = yawAt[i1] - yawAt[i0]; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); const k = Math.abs(dy) / ((i1 - i0) * DS || 1); vlim[i] = Math.min(62, Math.sqrt(AY * 9.81 * Math.min(1.1, muAt[i]) / Math.max(k, 1e-4))); }
    for (let i = N - 2; i >= 0; i--) vlim[i] = Math.min(vlim[i], Math.sqrt(vlim[i + 1] * vlim[i + 1] + 2 * 6.5 * DS));
    out.vmin = Math.min(...vlim); out.vavg = +(vlim.reduce((x, y) => x + y, 0) / N).toFixed(1);
    const vAt = (s) => vlim[Math.max(0, Math.min(N - 1, Math.round((s - S0) / DS)))];
    const t0 = performance.now();
    /* countdown */
    set(0, 0, 1); while (R.phase === 'grid' && n < 2000) { g.stepSim(dt); n++; }
    out.startPhase = R.phase;
    let prevPhase = R.phase, prevJump = 0, prevBroken = 0;
    while (R.phase === 'run' && t < maxT) {
      const spd = Math.abs(car.speed), Ld = Math.max(8, Math.min(34, spd * 0.5 + 6));
      const q = RY.at(Math.min(R.s + Ld, RY.finishS + 30), 0, tmp);
      const want = Math.atan2(q.x - car.x, q.z - car.z); let al = want - car.yaw; al = Math.atan2(Math.sin(al), Math.cos(al));
      const kd = 2 * Math.sin(al) / Ld, dd = Math.atan(WB * kd), mu = car.surf.mu || 0.8;
      const maxS = Math.max(0.07, Math.min(0.56, 1.5 * mu * 9.81 * WB / Math.max(spd * spd, 1) + 0.05));
      const st = Math.max(-1, Math.min(1, dd / maxS * 1.15));
      const vt = vAt(R.s + spd * 0.35), th = Math.max(0, Math.min(1, (vt - spd) * 0.6 + 0.3)), br = spd > vt + 1.5 ? Math.min(1, (spd - vt - 1.5) * 0.3) : 0;
      set(st, br > 0 ? 0 : th, br);
      g.stepSim(dt); t += dt; n++;
      if (car.air) airT += dt;
      if (R.dist > RY.hw[R.hint] + 1.5) offRoad += dt;
      maxLat = Math.max(maxLat, Math.abs(R.lat)); minHp = Math.min(minHp, car.health); topSpd = Math.max(topSpd, spd);
      if (R.stuck > 2.6) { R.reset(); stuckReset++; out.events.push('stuck-reset at s=' + R.s.toFixed(0) + ' t=' + t.toFixed(1)); }
      if (R.jumpBest > prevJump + 0.5) { out.events.push('jump ' + (R.jumpBest).toFixed(0) + ' m at s=' + R.s.toFixed(0) + ' t=' + t.toFixed(1)); prevJump = R.jumpBest; }
      if (R.sim.broken > prevBroken && R.sim.broken - prevBroken >= 1) { /* count bursts */ if (!out.lastBurst || t - out.lastBurst > 1) out.events.push('walls ' + R.sim.broken + '/' + R.sim.total + ' at s=' + R.s.toFixed(0) + ' t=' + t.toFixed(1) + ' v=' + spd.toFixed(1)); out.lastBurst = t; prevBroken = R.sim.broken; }
      if (t - lastLog >= 5) { lastLog = t; out.log.push({ t: +t.toFixed(0), s: +R.s.toFixed(0), v: +(spd * 3.6).toFixed(0), lat: +R.lat.toFixed(1), y: +car.y.toFixed(1), hp: +car.health.toFixed(0), sec: R.sec }); }
      if (shots.length && R.s >= shots[0]) { out.marks.push({ s: shots.shift(), x: car.x, z: car.z, yaw: car.yaw }); }
    }
    out.phase = R.phase; out.time = +R.clock.toFixed(2); out.pen = R.penalty; out.sim = { broken: R.sim.broken, total: R.sim.total }; out.maxLat = +maxLat.toFixed(1); out.offRoad = +offRoad.toFixed(1); out.air = +airT.toFixed(1);
    out.jumpBest = +R.jumpBest.toFixed(1); out.stuckReset = stuckReset; out.minHp = +minHp.toFixed(0); out.topKmh = +(topSpd * 3.6).toFixed(0); out.splits = R.splits.map((x) => +x.toFixed(2)); out.cpsS = RY.cps; out.par = RY.par; out.ms = Math.round(performance.now() - t0); out.steps = n;
    out.msPerStep = +((performance.now() - t0) / n).toFixed(3);
    return out;
  }, [TOD, MAXT, SHOTS.slice()]);
  console.log(JSON.stringify(res, null, 1));
  console.log(logs.join('\n'));
  await browser.close();
})();
