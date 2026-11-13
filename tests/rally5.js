/* Rally race screenshot tour (with rivals): starts the stage, lets the autopilot drive the player from the grid and takes screenshots at given moments.
   usage: OUT=dir node tests/rally5.js '[{"name":"grid","at":"grid"},{"name":"pack","at":"time","t":6},{"name":"wall","at":"s","s":930}]'   env: RIV=0..3, TOD=0..3, VW/VH, QUALITY
   shot fields: name, at: 'grid' (before GO) | 'time' (seconds after GO) | 's' (player stage distance), wait (ms before capture) */
const { chromium } = require('playwright');
const path = require('path');
const G = path.resolve(__dirname, '../dist/test.html');
const SHOTS = JSON.parse(process.argv[2] || '[]'), OUT = process.env.OUT || __dirname, TOD = +(process.env.TOD || 2), RIV = +(process.env.RIV == null ? 2 : process.env.RIV);
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: +(process.env.VW || 1024), height: +(process.env.VH || 576) } })).newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript((q) => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: q } })); } catch (e) { /* ignore */ } }, process.env.QUALITY || 'low');
  await page.goto('file://' + G);
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  console.log('boot err', await page.evaluate(() => window.__bootError || null));
  await page.evaluate(async ([tod, riv]) => {
    const g = window.__game; g.App.mode = 'rlobby'; g.save.rally.tod = tod; g.save.rally.rivals = riv; g.Rally.tod = tod; await g.Rally.start();
    const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad]; window.__pad = pad;
    const RY = g.RY, R = g.Rally, car = g.car, tmp = {};
    window.__ap = (v, dt) => {
      const spd = Math.abs(car.speed), Ld = Math.max(8, Math.min(34, spd * 0.5 + 6)), q = RY.at(Math.min(R.s + Ld, RY.finishS + 30), 0, tmp);
      let al = Math.atan2(q.x - car.x, q.z - car.z) - car.yaw; al = Math.atan2(Math.sin(al), Math.cos(al));
      const mu = car.surf.mu || 0.8, maxS = Math.max(0.07, Math.min(0.56, 1.5 * mu * 9.81 * 2.47 / Math.max(spd * spd, 1) + 0.05)), st = Math.max(-1, Math.min(1, Math.atan(2.47 * 2 * Math.sin(al) / Ld) / maxS * 1.15));
      pad.axes[0] = -st; pad.buttons[7].value = spd < v ? 1 : 0.3; pad.buttons[6].value = 0; g.stepSim(dt);
    };
  }, [TOD, RIV]);
  for (const sh of SHOTS) {
    const info = await page.evaluate(([at, t, s]) => {
      const g = window.__game, R = g.Rally, car = g.car, dt = 1 / 60; let n = 0;
      if (at === 'grid') { for (; n < 60 * 2 && R.phase === 'grid'; n++) g.stepSim(dt); }
      else { for (; R.phase === 'grid' && n < 60 * 8; n++) g.stepSim(dt); const t0 = R.clock; for (; n < 60 * 60; n++) { window.__ap(33, dt); if (at === 'time' && R.clock - t0 >= t) break; if (at === 's' && R.s >= s) break; } }
      return { n, phase: R.phase, clock: +R.clock.toFixed(2), s: +R.s.toFixed(0), v: +car.speed.toFixed(1), order: g.RR.on ? g.RR.order().map((o) => (o.me ? 'YOU' : o.name) + ' @' + o.s.toFixed(0)) : null, riv: g.RR.list.map((b) => [b.name, +b.s.toFixed(0), +(b.c.speed * 3.6).toFixed(0), +b.off.toFixed(1)]) };
    }, [sh.at, sh.t || 0, sh.s || 0]);
    console.log(sh.name, JSON.stringify(info));
    await page.waitForTimeout(sh.wait || 1200);
    await page.screenshot({ path: path.join(OUT, 'rr_' + sh.name + '.png'), timeout: 240000 });
    console.log(sh.name, 'render', JSON.stringify(await page.evaluate(() => { const r = window.__game.renderer.info; return { calls: r.render.calls, tris: r.render.triangles }; })));
  }
  console.log(logs.join('\n'));
  await browser.close();
})();
