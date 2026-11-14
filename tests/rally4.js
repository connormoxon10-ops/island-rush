/* Rally stage screenshot tour: starts the stage, teleports the car to given stage distances, drives a moment with the autopilot so dust, wreckage and
   camera are live, then takes a real screenshot (software GL: ~1-2 min each).
   usage: node tests/rally4.js '[{"name":"jump","tod":2,"s":715,"v":33,"until":"air"}, ...]'   OUT=dir for the pngs
   shot fields: name, tod (0..3), s, off (lateral metres), v (m/s), until: 'air' | 'wall' | 'time', t (seconds of driving first, default 1.5), straight (no steering: for walls and jumps on straights), view (Cam.view), vw/vh (viewport) */
const { chromium } = require('playwright');
const path = require('path');
const G = path.resolve(__dirname, '../dist/test.html');
const SHOTS = JSON.parse(process.argv[2] || '[]'), OUT = process.env.OUT || __dirname, Q = process.env.QUALITY || 'low';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: +(process.env.VW || 1280), height: +(process.env.VH || 720) } }); const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript((q) => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: q } })); } catch (e) { /* ignore */ } }, Q);
  await page.goto('file://' + G);
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  console.log('boot err', await page.evaluate(() => window.__bootError || null));
  await page.evaluate(async (tod) => {
    const g = window.__game; g.App.mode = 'rlobby'; g.save.rally.tod = tod; g.Rally.tod = tod; await g.Rally.start();
    const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad]; window.__pad = pad;
    const RY = g.RY, R = g.Rally, car = g.car, tmp = {};
    window.__ap = (v, dt) => {
      const spd = Math.abs(car.speed), Ld = Math.max(8, Math.min(34, spd * 0.5 + 6)), q = RY.at(Math.min(R.s + Ld, RY.finishS + 30), 0, tmp);
      let al = Math.atan2(q.x - car.x, q.z - car.z) - car.yaw; al = Math.atan2(Math.sin(al), Math.cos(al));
      const mu = car.surf.mu || 0.8, maxS = Math.max(0.07, Math.min(0.56, 1.5 * mu * 9.81 * 2.47 / Math.max(spd * spd, 1) + 0.05)), st = Math.max(-1, Math.min(1, Math.atan(2.47 * 2 * Math.sin(al) / Ld) / maxS * 1.15));
      window.__pad.axes[0] = window.__straight ? 0 : -st; window.__pad.buttons[7].value = spd < v ? 1 : 0.3; window.__pad.buttons[6].value = 0; g.stepSim(dt);
    };
  }, SHOTS.length ? SHOTS[0].tod : 2);
  let curTod = SHOTS.length ? SHOTS[0].tod : 2;
  for (const sh of SHOTS) {
    if (sh.tod !== undefined && sh.tod !== curTod) { await page.evaluate((t) => { window.__game.Rally.tod = t; window.__game.App.tod = [6.9, 12.3, 17.0, 18.95][t]; }, sh.tod); curTod = sh.tod; }
    if (sh.vw) await page.setViewportSize({ width: sh.vw, height: sh.vh });
    const info = await page.evaluate(([s, off, v, until, tsec, view, straight]) => {
      const g = window.__game, R = g.Rally, car = g.car, dt = 1 / 60; R.phase = 'run'; R.clock = 0; g.RW.reset(R.sim); g.App.dmg = 0; R.stuck = 0; R.wrong = 0; window.__straight = !!straight; if (view !== undefined) g.Cam.view = view;
      R.placeAt(s, off || 0); const y = car.yaw; car.vx = Math.sin(y) * v; car.vz = Math.cos(y) * v; car.speed = v; car.thr = 1;
      let n = 0, hit = 0;
      for (; n < 60 * 14; n++) { window.__ap(v, dt); if (until === 'air' && car.air && n > 20) { hit++; if (hit > 22) break; } else if (until === 'wall' && R.sim.broken >= 8) { hit++; if (hit > 4) break; } else if ((!until || until === 'time') && n > tsec * 60) break; }
      return { n, s: +R.s.toFixed(0), v: +car.speed.toFixed(1), air: car.air, broken: R.sim.broken, y: +car.y.toFixed(1), live: R.sim.live.length };
    }, [sh.s, sh.off, sh.v || 30, sh.until, sh.t || 1.5, sh.view, sh.straight]);
    console.log(sh.name, JSON.stringify(info));
    /* let a frame or two render with the paused physics state, then capture */
    await page.waitForTimeout(sh.wait || 1500);
    await page.screenshot({ path: path.join(OUT, 'rt_' + sh.name + '.png'), timeout: 240000 });
    const st = await page.evaluate(() => { const r = window.__game.renderer.info; return { calls: r.render.calls, tris: r.render.triangles, geos: r.memory.geometries, tex: r.memory.textures, fps: window.__fps || null }; });
    console.log(sh.name, 'render', JSON.stringify(st));
  }
  console.log(logs.join('\n'));
  await browser.close();
})();
