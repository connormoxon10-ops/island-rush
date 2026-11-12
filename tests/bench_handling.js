/* Rally handling bench (physics only, fast): a step-steer test on the straight at 30 m/s and again at 45 m/s on hard-packed dirt and on gravel,
   reporting peak sideslip, how long the car takes to settle after the wheel is released, and whether it spun. Lower is calmer.
   usage: node tests/bench_handling.js */
const { chromium } = require('playwright');
const path = require('path');
const G = path.resolve(__dirname, '../dist/test.html');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 320, height: 180 } })).newPage();
  const logs = []; page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + G);
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const res = await page.evaluate(async () => {
    const g = window.__game, R = g.Rally, RY = g.RY, car = g.car, out = [];
    g.App.mode = 'rlobby'; await R.start();
    const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad];
    const dt = 1 / 60; RY.hits = (x, z, r, o) => { o.length = 0; };   /* pure dynamics: no trunks to crash into, so a spin shows up as a spin */
    const trial = (name, s0, v, steer, hold, hand) => {
      R.phase = 'run'; R.clock = 0; g.RW.reset(R.sim); R.stuck = 0; R.wrong = 0; g.App.dmg = 0; car.health = 100; car.wrecked = 0; R.placeAt(s0, 0);
      const y = car.yaw; car.vx = Math.sin(y) * v; car.vz = Math.cos(y) * v; car.speed = v; car.w = 0;
      let peakSlip = 0, peakYaw = 0, settle = null, t = 0, spun = false, peakLat = 0, vEnd = 0; const y0 = car.yaw;
      pad.axes[0] = 0; pad.buttons[7].value = 0.6; pad.buttons[0].value = 0;
      for (let i = 0; i < 60 * 4; i++) {
        t = i * dt; pad.axes[0] = t < hold ? -steer : 0; pad.buttons[0].value = hand && t >= 0.2 && t < 0.2 + hand ? 1 : 0; pad.buttons[7].value = v > car.speed ? 1 : 0.35;
        g.stepSim(dt);
        let dy = car.yaw - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        if (Math.abs(car.speed) > 8) peakSlip = Math.max(peakSlip, car.slip); peakLat = Math.max(peakLat, Math.abs(R.lat)); peakYaw = Math.max(peakYaw, Math.abs(dy)); if (Math.abs(dy) > 1.6) spun = true;
        if (t > hold && settle === null && car.slip < 0.06 && Math.abs(car.w) < 0.08) settle = +(t - hold).toFixed(2);
      }
      vEnd = car.speed;
      out.push({ name, v, steer, hold, hand: hand || 0, peakSlip: +peakSlip.toFixed(2), yawTurned: +(peakYaw * 57.3).toFixed(0) + 'deg', settle: settle === null ? '>' + (4 - hold).toFixed(1) : settle, spun, peakLat: +peakLat.toFixed(1), vEnd: +vEnd.toFixed(1) });
    };
    const secs = []; for (let s = 80; s < RY.L - 100; s += 5) { const o = {}, q = RY.at(s, 0, {}); RY.ground(q.x, q.z, o); secs.push([s, o.sec]); }
    /* straight stretches: s=100 (start straight); use the same place for all trials, whatever the surface there */
    for (const v of [25, 35, 45]) {
      trial('flick steer 0.5 for 0.5 s', 1915, v, 0.5, 0.5);
      trial('flick steer 1.0 for 0.4 s', 1915, v, 1.0, 0.4);
      trial('hold steer 0.35 for 2 s', 1915, v, 0.35, 2.0);
      trial('handbrake 0.5 s + steer 0.6', 1915, v, 0.6, 0.8, 0.5);
    }
    return out;
  });
  for (const r of res) console.log(JSON.stringify(r));
  console.log(logs.join('\n')); await browser.close();
})();
